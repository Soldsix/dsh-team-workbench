import { mountTeamTestSubagents } from './subagent-fixture.ts'
/** Team scheduling through Agent loops, continuation capacity, and durable Sessions. */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import type { MessageId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import * as JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import { deliverSubagentPrompt, withHostSubagentAncestors } from '@deepseek-ai/dsh-subagent/internal'
import type { HostPromptDeliverer } from '@deepseek-ai/dsh-subagent/internal'
import * as SubagentSpawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
import { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { textResponse, toolCallResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'
import TeamService from '../src/index.ts'
import type { Config } from '../src/types.ts'
import { ControlledAdapter } from './controlled-adapter.ts'
import { TestSessionQuery } from './test-session-query.ts'

const signal = new AbortController().signal
const cleanups: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

async function setup(config: Config) {
  const ctx = new Context()
  const root = mkdtempSync(join(tmpdir(), 'dsh-team-scheduling-'))
  cleanups.push(async () => {
    await ctx.fiber.dispose()
    rmSync(root, { recursive: true, force: true })
  })
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(JsonlSessionPersistence, { root })
  await ctx.plugin(TestSessionQuery)
  await ctx.plugin(AgentLoop, { agents: [] })
  await mountTeamTestSubagents(ctx)
  await ctx.plugin(SubagentSpawn, { providerName: 'spawn' })
  const fiber = await ctx.plugin(TeamService, config)
  const adapter = new ControlledAdapter()
  ctx.llm.registerAdapter(['mock', 'other'], adapter)
  const lead = (await ctx.agents.create({
    sessionId: SessionId('lead'), meta: { agentPreset: 'team' },
    agentOptions: { provider: 'mock', model: 'lead', maxTokens: 512 },
  })).agent
  // Child settlement wakes its parent; these unit cases isolate delegated requests.
  ctx.on('agent/pre-step', async (event, next) => event.agent === lead ? { kind: 'reject' } : next())
  return { ctx, lead, adapter, fiber }
}

function spawn(ctx: Context, parent: Agent, name: string, provider = 'mock', model = 'worker', requestSignal = signal) {
  return ctx.agentTeams.spawnTeammate(parent, {
    name, description: `${name} responsibility`, persona: `${name}: retain the assigned responsibility.`,
    context: 'fresh', provider: 'spawn', signal: requestSignal,
    prompt: [{ type: 'text', text: `${name} initial task` }],
    agentOptions: { provider, model, reasoningEffort: ReasoningEffortId(name.endsWith('0') ? 'low' : 'high') },
  })
}

async function absent(ctx: Context, id: SessionId): Promise<void> {
  await vi.waitFor(() => { expect(ctx.agents.get(id)).toBeUndefined() }, { timeout: 10_000 })
}

/** Hold the creator's durability checkpoint while the fresh member enters a tool. */
function holdPublication(ctx: Context) {
  const gate = Promise.withResolvers<undefined>()
  const roster = Reflect.get(ctx.agentTeams, 'roster') as {
    checkpointInitialPrompt(childId: SessionId, messageId: MessageId, signal: AbortSignal): Promise<void>
  }
  const checkpoint = roster.checkpointInitialPrompt.bind(roster)
  vi.spyOn(roster, 'checkpointInitialPrompt').mockImplementationOnce(async (...args) => {
    await gate.promise
    await checkpoint(...args)
  })
  cleanups.push(async () => { gate.resolve(undefined) })
  return gate
}

describe('Team model scheduling', () => {
  it('restores a cold group while establishing its descendant without another parent model request', async () => {
    const { ctx, lead, adapter } = await setup({ maxDepth: 2, maxMembers: 8, maxResidentMembers: 8 })
    const group = await spawn(ctx, lead, 'cold-group')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    adapter.calls[0]!.release()
    await absent(ctx, group.member.id)
    const child = await withHostSubagentAncestors(ctx.subagents, lead, [group.member.id], signal,
      parent => spawn(ctx, parent, 'new-descendant'))
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    expect(adapter.calls[1]!.options.sessionId).toBe(child.member.id)
    expect(ctx.agents.get(group.member.id)).toBeDefined()
    expect(ctx.agentTeams.listMembers(lead).find(member => member.id === child.member.id)?.parentId).toBe(group.member.id)
    adapter.calls[1]!.release()
    await absent(ctx, child.member.id)
    await absent(ctx, group.member.id)
    await expect(withHostSubagentAncestors(ctx.subagents, lead, [group.member.id], signal, async () => undefined)).resolves.toBeUndefined()
    await absent(ctx, group.member.id)
    expect(adapter.calls).toHaveLength(2)
  })
  it('releases a restored group after a failed host callback and permits another restoration', async () => {
    const { ctx, lead, adapter } = await setup({ maxDepth: 2, maxResidentMembers: 2 })
    const group = await spawn(ctx, lead, 'callback-group')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    adapter.calls[0]!.release()
    await absent(ctx, group.member.id)
    await expect(withHostSubagentAncestors(ctx.subagents, lead, [group.member.id], signal,
      async () => { throw new Error('callback fixture failure') })).rejects.toThrow('callback fixture failure')
    await absent(ctx, group.member.id)
    expect(await withHostSubagentAncestors(ctx.subagents, lead, [group.member.id], signal, async parent => parent.id)).toBe(group.member.id)
    await absent(ctx, group.member.id)
    expect(adapter.calls).toHaveLength(1)
  })
  it('rejects conflicting simultaneous route changes without replacing the member', async () => {
    const { ctx, lead, adapter } = await setup({ maxResidentMembers: 2 })
    const created = await spawn(ctx, lead, 'route-race', 'mock', 'original')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    const barrier = Promise.withResolvers<undefined>()
    let entered = 0
    const resolve = ctx.llm.resolveCallConfig.bind(ctx.llm)
    const probe = vi.spyOn(ctx.llm, 'resolveCallConfig').mockImplementation(async (...args) => {
      if (++entered === 2) barrier.resolve(undefined)
      await barrier.promise
      return await resolve(...args)
    })
    try {
      const results = await Promise.allSettled(['first', 'second'].map(model => ctx.agentTeams.configureMemberModel(lead, {
        target: 'route-race', modelProvider: 'other', model, reasoningEffort: 'high', expectedRevision: 0,
      }, signal)))
      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
      const rejection: unknown = results.find(result => result.status === 'rejected')?.reason
      expect(rejection).toMatchObject({ code: 'TEAM_MEMBER_STALE_REVISION' })
      expect(ctx.agentTeams.listMembers(lead).find(member => member.id === created.member.id)?.modelRouteRevision).toBe(1)
      expect(adapter.calls[0]!.options.model).toBe('original')
    } finally {
      barrier.resolve(undefined)
      probe.mockRestore()
      adapter.calls[0]!.release()
    }
  })

  it('changes a running member on its next request and cold-resumes the same Session', async () => {
    const { ctx, lead, adapter } = await setup({ maxResidentMembers: 2 })
    const created = await spawn(ctx, lead, 'worker-0', 'mock', 'original')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    expect(adapter.calls[0]!.options).toMatchObject({ provider: 'mock', model: 'original', reasoningEffort: 'low' })

    const changed = await ctx.agentTeams.configureMemberModel(lead, {
      target: 'worker-0', modelProvider: 'other', model: 'replacement', reasoningEffort: 'high',
    }, signal)
    expect(changed).toMatchObject({ id: created.member.id, name: 'worker-0', modelProvider: 'other',
      model: 'replacement', reasoningEffort: 'high', modelRouteRevision: 1, status: 'running' })
    expect(ctx.agentTeams.listMembers(lead)).toHaveLength(2)
    expect(adapter.calls[0]!.options.model).toBe('original')
    adapter.calls[0]!.release()
    await absent(ctx, created.member.id)

    const delivered = await ctx.agentTeams.sendMessage(lead, {
      target: 'worker-0', content: [{ type: 'text', text: 'Continue the retained task.' }], signal,
    })
    expect(delivered.status).toBe('accepted')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    expect(adapter.calls[1]!.options).toMatchObject({ sessionId: created.member.id,
      provider: 'other', model: 'replacement', reasoningEffort: 'high', maxTokens: 4096 })
    expect(adapter.calls[1]!.options.messages.some(message => message.role === 'assistant')).toBe(true)
    adapter.calls[1]!.release()
    await absent(ctx, created.member.id)
  })

  it.each([8, 20, 32])('diagnoses %i resident members waiting on each other and releases them on cancellation', async (count) => {
    const { ctx, lead, adapter } = await setup({
      maxMembers: 32, maxResidentMembers: 32, maxConcurrentRequestsPerTeam: 32,
    })
    const members = await Promise.all(Array.from({ length: count }, (_, index) => spawn(ctx, lead, `waiter-${index}`)))
    await vi.waitFor(() => { expect(adapter.active).toBe(count) })
    const controllers = members.slice(0, -1).map(() => new AbortController())
    const waits = members.slice(0, -1).map((member, index) =>
      ctx.agentTeams.waitForChange(ctx.agents.get(member.member.id)!, 10_000, controllers[index]!.signal))
    const last = ctx.agents.get(members[count - 1]!.member.id)!
    await expect(ctx.agentTeams.waitForChange(last, 10_000, signal)).resolves.toMatchObject({
      timedOut: false, noProgress: { reason: 'all-peers-waiting' },
    })
    controllers[0]!.abort(new Error('first member resumes work'))
    await expect(waits[0]).rejects.toThrow('first member resumes work')
    expect(await Promise.all(waits.slice(1))).toEqual(
      Array.from({ length: count - 2 }, () => ({ timedOut: false })),
    )
    for (const call of adapter.calls) call.release()
    await Promise.all(members.map(member => absent(ctx, member.member.id)))
  }, 30_000)

  it('runs 32 distinct members concurrently, preserves model defaults, and resumes the same Session', async () => {
    const { ctx, lead, adapter } = await setup({
      enabledPresets: ['team'], maxMembers: 64, maxResidentMembers: 64, maxConcurrentRequestsPerTeam: 32,
    })
    const members = await Promise.all(Array.from({ length: 32 }, (_, index) =>
      spawn(ctx, lead, `worker-${index}`, index % 2 === 0 ? 'mock' : 'other', `model-${index % 3}`)))
    await vi.waitFor(() => { expect(adapter.active).toBe(32) }, { timeout: 15_000 })
    expect(new Set(adapter.requests.map(request => request.sessionId)).size).toBe(32)
    expect(adapter.peak).toBe(32)
    for (const [index, member] of members.entries()) {
      const request = adapter.requests.find(candidate => candidate.sessionId === member.member.id)
      expect(request).toMatchObject({
        provider: index % 2 === 0 ? 'mock' : 'other', model: `model-${index % 3}`, maxTokens: 4096,
        reasoningEffort: index % 10 === 0 ? 'low' : 'high',
      })
      expect(Object.isFrozen(request)).toBe(true)
    }
    for (const call of adapter.calls) call.release()
    await Promise.all(members.map(member => absent(ctx, member.member.id)))
    expect(adapter.active).toBe(0)
    expect(ctx.agentTeams.listMembers(lead)).toHaveLength(33)
    const resumed = await ctx.agentTeams.sendMessage(lead, {
      target: 'worker-0', content: [{ type: 'text', text: 'Continue from the retained result.' }], signal,
    })
    expect(resumed.status).toBe('accepted')
    await vi.waitFor(() => { expect(adapter.requests).toHaveLength(33) })
    const request = adapter.requests[32]!
    expect(request.sessionId).toBe(members[0]!.member.id)
    expect(request.messages.flatMap(message => message.content)
      .filter(block => block.type === 'text' && block.text === 'worker-0 initial task')).toHaveLength(1)
    expect(request.messages.some(message => message.role === 'assistant')).toBe(true)
    adapter.calls[32]!.release()
    await absent(ctx, members[0]!.member.id)
    const handle = await ctx.sessionPersistence.open(members[0]!.member.id, 'read')
    try {
      const events = (await handle.read()).events
      expect(events.filter(event => event.type === 'assistant/message')).toHaveLength(2)
    } finally {
      await handle.close()
    }
  }, 30_000)

  it('cancels a queued member and reuses its Session after capacity becomes free', async () => {
    const { ctx, lead, adapter } = await setup({ maxConcurrentRequestsPerTeam: 1 })
    const first = await spawn(ctx, lead, 'first')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    const queued = await spawn(ctx, lead, 'queued')
    await vi.waitFor(() => { expect(ctx.agents.get(queued.member.id)?.status).toBe('running') })
    ctx.agentTeams.interrupt(lead, 'queued')
    await absent(ctx, queued.member.id)
    expect(adapter.calls).toHaveLength(1)
    adapter.calls[0]!.release()
    await absent(ctx, first.member.id)
    await ctx.agentTeams.sendMessage(lead, {
      target: 'queued', content: [{ type: 'text', text: 'Resume the interrupted task.' }], signal,
    })
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    expect(adapter.calls[1]!.options.sessionId).toBe(queued.member.id)
    adapter.calls[1]!.release()
    await absent(ctx, queued.member.id)
  })

  it('resumes a stored member automatically when another member releases residence capacity', async () => {
    const { ctx, lead, adapter } = await setup({ maxResidentMembers: 1 })
    ctx.on('subagent/activation-released', () => { throw new Error('controlled observer failure') })
    const released: SessionId[] = []
    ctx.on('subagent/activation-released', (info) => { released.push(info.childId) })
    const stored = await spawn(ctx, lead, 'stored')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    adapter.calls[0]!.release()
    await absent(ctx, stored.member.id)
    const busy = await spawn(ctx, lead, 'busy')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    const queued = await ctx.agentTeams.sendMessage(lead, {
      target: 'stored', content: [{ type: 'text', text: 'Continue the retained investigation.' }], signal,
    })
    expect(queued.status).toBe('queued')
    expect(ctx.agents.get(stored.member.id)).toBeUndefined()
    const busyAgent = ctx.agents.get(busy.member.id)
    expect(busyAgent).toBeDefined()
    expect(ctx.agentTeams.waitReadiness(busyAgent!)?.reason).toBe('resident-capacity-blocked')
    await expect(ctx.agentTeams.waitForChange(busyAgent!, 10_000, signal)).resolves.toMatchObject({
      timedOut: false, noProgress: { reason: 'resident-capacity-blocked' },
    })
    expect(ctx.agentTeams.waitReadiness(lead)).toBeUndefined()
    adapter.calls[1]!.release()
    await absent(ctx, busy.member.id)
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(3) })
    expect(adapter.calls[2]!.options.sessionId).toBe(stored.member.id)
    expect(adapter.calls[2]!.options.messages.flatMap(message => message.content)
      .filter(block => block.type === 'text' && block.text === 'stored initial task')).toHaveLength(1)
    adapter.calls[2]!.release()
    await absent(ctx, stored.member.id)
    await vi.waitFor(() => { expect(released).toEqual([stored.member.id, busy.member.id, stored.member.id]) })
    const handle = await ctx.sessionPersistence.open(stored.member.id, 'read')
    try {
      const events = (await handle.read()).events
      expect(events.filter(event => event.type === 'user/message'
        && event.data.source.kind === 'team-message' && event.data.source.messageId === queued.messageId)).toHaveLength(1)
    } finally {
      await handle.close()
    }
  })

  it('retries a stored member after an unpublished creation returns its residence slot', async () => {
    const { ctx, lead, adapter } = await setup({ maxResidentMembers: 1 })
    const released: SessionId[] = []
    ctx.on('subagent/activation-released', (info) => { released.push(info.childId) })
    const stored = await spawn(ctx, lead, 'stored')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    adapter.calls[0]!.release()
    await absent(ctx, stored.member.id)
    const entered = Promise.withResolvers<undefined>()
    const release = Promise.withResolvers<undefined>()
    cleanups.push(async () => { release.resolve(undefined) })
    vi.spyOn(ctx.agents, 'create').mockImplementationOnce(async () => {
      entered.resolve(undefined)
      await release.promise
      throw new Error('controlled creation failure')
    })
    const failing = spawn(ctx, lead, 'failing')
    void failing.catch(() => {})
    await entered.promise
    const queued = await ctx.agentTeams.sendMessage(lead, {
      target: 'stored', content: [{ type: 'text', text: 'Resume after capacity returns.' }], signal,
    })
    expect(queued.status).toBe('queued')
    release.resolve(undefined)
    await expect(failing).rejects.toThrow('controlled creation failure')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    expect(adapter.calls[1]!.options.sessionId).toBe(stored.member.id)
    expect(ctx.agentTeams.listMembers(lead).find(member => member.name === 'failing')?.status).toBe('failed')
    expect(released.filter(id => id !== stored.member.id)).toHaveLength(1)
    adapter.calls[1]!.release()
    await absent(ctx, stored.member.id)
  })

  it('retains a capacity wakeup that arrives before the rejected delivery returns', async () => {
    const { ctx, lead, adapter } = await setup({ maxResidentMembers: 1 })
    const stored = await spawn(ctx, lead, 'stored')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    adapter.calls[0]!.release()
    await absent(ctx, stored.member.id)
    const busy = await spawn(ctx, lead, 'busy')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    const rejected = Promise.withResolvers<undefined>()
    const release = Promise.withResolvers<undefined>()
    cleanups.push(async () => { release.resolve(undefined) })
    const runtime = ctx.subagents
    const prototype = Object.getPrototypeOf(runtime) as HostPromptDeliverer
    const deliver = runtime[deliverSubagentPrompt].bind(runtime)
    vi.spyOn(prototype, deliverSubagentPrompt).mockImplementationOnce(async (...args) => {
      try {
        return await deliver(...args)
      } catch (error: unknown) {
        expect(error).toMatchObject({ code: 'ACTIVATION_LIMIT_REACHED' })
        rejected.resolve(undefined)
        await release.promise
        throw error
      }
    })
    const sending = ctx.agentTeams.sendMessage(lead, {
      target: 'stored', content: [{ type: 'text', text: 'Retain this queued request.' }], signal,
    })
    await rejected.promise
    adapter.calls[1]!.release()
    await absent(ctx, busy.member.id)
    release.resolve(undefined)
    expect((await sending).status).toBe('queued')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(3) })
    expect(adapter.calls[2]!.options.sessionId).toBe(stored.member.id)
    adapter.calls[2]!.release()
    await absent(ctx, stored.member.id)
  })

  it('waits for independent capacity before retrying a partially restored descendant chain', async () => {
    const { ctx, lead, adapter } = await setup({ maxResidentMembers: 2, maxDepth: 2 })
    const stream = adapter.stream.bind(adapter)
    let parentStarted = false
    adapter.stream = async function* (options) {
      if (options.model === 'parent') {
        if (parentStarted) {
          yield * textResponse('Parent retained the descendant result.')
          return
        }
        parentStarted = true
      }
      yield * stream(options)
    }
    const parent = await spawn(ctx, lead, 'parent', 'mock', 'parent')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    const child = await spawn(ctx, ctx.agents.get(parent.member.id)!, 'child')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    adapter.calls[1]!.release()
    await absent(ctx, child.member.id)
    adapter.calls[0]!.release()
    await absent(ctx, parent.member.id)
    const busy = await spawn(ctx, lead, 'busy')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(3) })
    const restored: SessionId[] = []
    ctx.on('agent/created', ({ agent }) => { restored.push(agent.id) })
    const ancestorReleased = Promise.withResolvers<undefined>()
    ctx.on('subagent/activation-released', (info) => {
      if (info.childId === parent.member.id) ancestorReleased.resolve(undefined)
    })
    const sending = await ctx.agentTeams.sendMessage(lead, {
      target: 'child', content: [{ type: 'text', text: 'Continue the retained descendant work.' }], signal,
    })
    expect(sending.status).toBe('queued')
    await ancestorReleased.promise
    expect(restored).toEqual([parent.member.id])
    adapter.calls[2]!.release()
    await absent(ctx, busy.member.id)
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(4) })
    expect(adapter.calls[3]!.options.sessionId).toBe(child.member.id)
    expect(restored).toEqual([parent.member.id, parent.member.id, child.member.id])
    adapter.calls[3]!.release()
    await absent(ctx, child.member.id)
    await absent(ctx, parent.member.id)
  })

  it('shares provider and model limits across Teams without blocking an independent provider', async () => {
    const { ctx, lead, adapter } = await setup({
      maxConcurrentRequestsPerTeam: 4,
      providerConcurrency: [{ provider: 'mock', maxConcurrentRequests: 2 }],
      modelConcurrency: [{ provider: 'mock', model: 'worker', maxConcurrentRequests: 1 }],
    })
    const secondLead = await ctx.agentLoop.create(SessionId('second-lead'), { provider: 'other', model: 'lead' })
    ctx.on('agent/pre-step', async (event, next) => event.agent === secondLead ? { kind: 'reject' } : next())
    const first = await spawn(ctx, lead, 'first')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    const queued = await spawn(ctx, secondLead, 'queued')
    const independentModel = await spawn(ctx, lead, 'second-model', 'mock', 'other-model')
    const independentProvider = await spawn(ctx, secondLead, 'second-provider', 'other')
    await vi.waitFor(() => { expect(adapter.active).toBe(3) })
    expect(adapter.requests.map(request => request.sessionId)).toEqual([
      first.member.id, independentModel.member.id, independentProvider.member.id,
    ])
    adapter.calls[0]!.release()
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(4) })
    expect(adapter.calls[3]!.options.sessionId).toBe(queued.member.id)
    for (const call of adapter.calls) call.release()
    await Promise.all([first, queued, independentModel, independentProvider].map(member => absent(ctx, member.member.id)))
  })

  it('allows a grandchild to use the request slot while its parent waits in a tool', async () => {
    const { ctx, lead, adapter } = await setup({ maxDepth: 2, maxResidentMembers: 2, maxConcurrentRequestsPerTeam: 1 })
    const publication = holdPublication(ctx)
    let toolEntered = false
    const toolWaiting = Promise.withResolvers<undefined>()
    const toolRelease = Promise.withResolvers<undefined>()
    cleanups.push(async () => { toolRelease.resolve(undefined) })
    const original = adapter.stream.bind(adapter)
    let parentDelegated = false
    adapter.stream = async function* (options) {
      if (options.model === 'parent' && !parentDelegated) {
        parentDelegated = true
        yield * toolCallResponse('delegate-child', 'delegate_child', {})
      } else {
        yield * original(options)
      }
    }
    ctx.tools.register(defineContentToolFixture({
      name: 'delegate_child', description: 'Wait for a delegated result.', parameters: {},
      async execute(_args, context) {
        if (context.agent === undefined) throw new Error('fixture tool requires an Agent')
        toolEntered = true
        const child = await spawn(ctx, context.agent, 'grandchild')
        toolWaiting.resolve(undefined)
        await toolRelease.promise
        return [{ type: 'text', text: `Delegated to ${child.member.id}` }]
      },
    }))
    const starting = spawn(ctx, lead, 'parent', 'mock', 'parent')
    void starting.catch(() => {})
    await vi.waitFor(() => { expect(toolEntered).toBe(true) })
    expect(ctx.agentTeams.listMembers(lead).map(member => [member.name, member.status]))
      .toEqual([['lead', 'inactive'], ['parent', 'provisioning']])
    publication.resolve(undefined)
    const parentMember = await starting
    await toolWaiting.promise
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    const child = ctx.agentTeams.listMembers(lead).find(member => member.name === 'grandchild')!
    expect(adapter.calls[0]!.options.sessionId).toBe(child.id)
    expect(ctx.agents.get(parentMember.member.id)).toBeDefined()
    expect(adapter.active).toBe(1)
    adapter.calls[0]!.release()
    await absent(ctx, child.id)
    toolRelease.resolve(undefined)
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    expect(adapter.calls[1]!.options.sessionId).toBe(parentMember.member.id)
    adapter.calls[1]!.release()
    await absent(ctx, parentMember.member.id)
  })

  it.each(['cancel-child', 'fail-parent'])('settles nested publication wait on %s without reserving a child name', async (failure) => {
    const { ctx, lead, adapter } = await setup({ maxDepth: 2 })
    const publication = holdPublication(ctx)
    const cancellation = new AbortController()
    let toolEntered = false
    let delegated = false
    const original = adapter.stream.bind(adapter)
    adapter.stream = async function* (options) {
      if (!delegated) {
        delegated = true
        yield * toolCallResponse('nested-once', 'delegate_child', {})
      } else yield * original(options)
    }
    ctx.tools.register(defineContentToolFixture({
      name: 'delegate_child', description: 'Delegate one fixture.', parameters: {},
      async execute(_args, context) {
        if (context.agent === undefined) throw new Error('fixture tool requires an Agent')
        toolEntered = true
        await spawn(ctx, context.agent, 'unpublished-child', 'mock', 'worker', cancellation.signal)
        return []
      },
    }))
    const starting = spawn(ctx, lead, 'parent')
    void starting.catch(() => {})
    await vi.waitFor(() => { expect(toolEntered).toBe(true) })
    if (failure === 'fail-parent') {
      publication.reject(new Error('parent checkpoint failed'))
      await expect(starting).rejects.toThrow('parent checkpoint failed')
      expect(ctx.agentTeams.listMembers(lead).find(member => member.name === 'parent')?.status).toBe('failed')
    } else {
      cancellation.abort(new Error('nested task cancelled'))
      await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
      publication.resolve(undefined)
      const parent = await starting
      adapter.calls[0]!.release()
      await absent(ctx, parent.member.id)
    }
    expect(ctx.agentTeams.listMembers(lead).map(member => member.name)).toEqual(['lead', 'parent'])
  })

  it.each(['ordinary', 'team'])('keeps the base capacity for unrostered children in %s mode', async (mode) => {
    const { ctx, adapter } = await setup({ enabledPresets: ['team'], maxResidentMembers: 64, maxConcurrentRequestsPerTeam: 32 })
    const parent = (await ctx.agents.create({
      sessionId: SessionId('ordinary-parent'), meta: { agentPreset: mode },
      agentOptions: { provider: 'mock', model: 'worker' },
    })).agent
    ctx.on('agent/pre-step', async (event, next) => event.agent === parent ? { kind: 'reject' } : next())
    const spec = {
      provider: 'spawn', label: 'ordinary child', delivery: 'parent' as const, signal,
      request: { parent, prompt: [{ type: 'text' as const, text: 'Ordinary delegated request.' }] },
    }
    const children = await Promise.all(Array.from({ length: 8 }, () => ctx.subagents.startActivation(spec)))
    await vi.waitFor(() => { expect(adapter.active).toBe(8) })
    await expect(ctx.subagents.startActivation(spec)).rejects.toMatchObject({ code: 'ACTIVATION_LIMIT_REACHED' })
    for (const call of adapter.calls) call.release()
    await Promise.all(children.map(child => absent(ctx, child.childId)))
  })

  it('unloads with an active request and a queued member and removes scoped capacity', async () => {
    const { ctx, lead, adapter, fiber } = await setup({ maxResidentMembers: 64, maxConcurrentRequestsPerTeam: 1 })
    const first = await spawn(ctx, lead, 'first')
    const queued = await spawn(ctx, lead, 'queued')
    await vi.waitFor(() => { expect(adapter.active).toBe(1) })
    await fiber.dispose()
    expect(adapter.active).toBe(0)
    expect(adapter.calls).toHaveLength(1)
    expect(ctx.agents.get(first.member.id)).toBeUndefined()
    expect(ctx.agents.get(queued.member.id)).toBeUndefined()
    expect(ctx.get('agentTeams')).toBeUndefined()
    const reloaded = await ctx.plugin(TeamService, { maxResidentMembers: 1, maxConcurrentRequestsPerTeam: 1 })
    await ctx.agentTeams.sendMessage(lead, {
      target: 'first', content: [{ type: 'text', text: 'Continue after plugin reload.' }], signal,
    })
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    expect(adapter.calls[1]!.options.sessionId).toBe(first.member.id)
    await expect(spawn(ctx, lead, 'over-reloaded-capacity')).rejects.toMatchObject({ code: 'ACTIVATION_LIMIT_REACHED' })
    adapter.calls[1]!.release()
    await absent(ctx, first.member.id)
    await reloaded.dispose()
  })
})
