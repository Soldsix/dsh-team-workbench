import { withHostSubagentAncestors } from '@deepseek-ai/dsh-subagent/internal'
import { mountTeamTestSubagents } from './subagent-fixture.ts'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { expect, it, vi } from 'vitest'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import * as JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import * as SubagentSpawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { MockAdapter, textResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'
import TeamService from '../src/index.ts'
import { TestSessionQuery } from './test-session-query.ts'

const SIGNAL = new AbortController().signal

it('retains a failed identity and creates a separately named replacement', async ({ onTestFinished }) => {
  const { ctx, lead } = await setup(onTestFinished)
  ctx.on('agent/pre-step', async (event, next) => event.agent === lead ? { kind: 'reject' } : next())
  const request = { name: 'retry-worker', description: 'Read the supplied text', context: 'fresh' as const,
    provider: 'spawn', prompt: [{ type: 'text' as const, text: 'Read the fixture once.' }], signal: SIGNAL }
  const start = vi.spyOn(ctx.subagents, 'startActivation').mockRejectedValueOnce({ kind: 'user' })
  await expect(ctx.agentTeams.spawnTeammate(lead, request)).rejects.toThrow('Team member creation cancelled')
  const failed = ctx.agentTeams.listMembers(lead).find(member => member.name === request.name)!
  expect(failed.status).toBe('failed')
  expect(await ctx.sessionPersistence.stat(failed.id)).toBeUndefined()
  await expect(ctx.agentTeams.spawnTeammate(lead, request)).rejects.toMatchObject({
    code: 'TEAM_MEMBER_NAME_TAKEN', message: expect.stringMatching(/failed creation.*choose a new name/u),
  })
  const replacement = await ctx.agentTeams.spawnTeammate(lead, { ...request, name: 'retry-worker-next' })
  expect(start).toHaveBeenCalledTimes(2)
  expect(replacement.member.id).not.toBe(failed.id)
  expect(ctx.agentTeams.listMembers(lead).find(member => member.id === failed.id)?.status).toBe('failed')
  expect(['running', 'inactive']).toContain(ctx.agentTeams.listMembers(lead)
    .find(member => member.id === replacement.member.id)?.status)
  await vi.waitFor(() => { expect(ctx.agents.get(replacement.member.id)).toBeUndefined() })
})

async function setup(onTestFinished: (callback: () => Promise<void>) => void, config: { maxMembers?: number; maxDepth?: number } = {}) {
  const ctx = new Context()
  const storageRoot = mkdtempSync(join(tmpdir(), 'dsh-team-retire-'))
  onTestFinished(async () => {
    await ctx.fiber.dispose()
    rmSync(storageRoot, { recursive: true, force: true })
  })
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(JsonlSessionPersistence, { root: storageRoot })
  await ctx.plugin(TestSessionQuery)
  await ctx.plugin(AgentLoop, { agents: [] })
  await mountTeamTestSubagents(ctx)
  await ctx.plugin(SubagentSpawn, { providerName: 'spawn' })
  await ctx.plugin(TeamService, { maxMembers: 1, ...config })
  const adapter = new MockAdapter(Array.from({ length: 4 }, (_, index) => textResponse(`answer ${index}`)))
  ctx.llm.registerAdapter(['mock'], adapter)
  const lead = await ctx.agentLoop.create(SessionId('retire-lead'), { provider: 'mock', model: 'mock' })
  return { ctx, lead, adapter }
}

it('retains one member Session across retire and reactivate while denying direct work during retirement', async ({ onTestFinished }) => {
  const { ctx, lead, adapter } = await setup(onTestFinished)
  const initial = await ctx.agentTeams.spawnTeammate(lead, {
    name: 'worker', description: 'Review the assigned text', context: 'fresh', provider: 'spawn',
    prompt: [{ type: 'text', text: 'first prompt' }], signal: SIGNAL,
  })
  const id = initial.member.id
  await vi.waitFor(() => { expect(ctx.agents.get(id)).toBeUndefined() }, { timeout: 5_000 })
  const memberRequests = () => adapter.requests.filter(request => request.sessionId === id)
  const firstRequestCount = memberRequests().length
  expect(firstRequestCount).toBeGreaterThan(0)
  const retired = await ctx.agentTeams.retireMember(lead, 'worker', SIGNAL)
  expect(retired).toMatchObject({ id, status: 'retired' })
  await expect(ctx.agentTeams.spawnTeammate(lead, {
    name: 'worker', description: 'Do another task', context: 'fresh', provider: 'spawn',
    prompt: [{ type: 'text', text: 'duplicate' }], signal: SIGNAL,
  })).rejects.toMatchObject({ code: 'TEAM_MEMBER_NAME_TAKEN' })
  const direct = await ctx.agents.resume({
    resumeSessionId: id, parentAgent: lead, agentOptions: { provider: 'mock', model: 'mock' },
  })
  expect(ctx.agentTeams.tryMembership(direct.agent)).toBeUndefined()
  let called = false
  ctx.tools.register(defineTool({
    name: 'retired_probe', description: 'Probe retired member tool admission.', parameters: {},
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    execute: () => { called = true; return Promise.resolve('called') },
  }))
  const denied = await ctx.tools.execute({
    signal: SIGNAL, callId: ToolCallId('retired-probe'), name: 'retired_probe', arguments: {}, agent: direct.agent,
  })
  expect(denied.isError).toBe(true)
  expect(called).toBe(false)
  direct.agent.steer(createUserMessage({ content: [{ type: 'text', text: 'direct retired prompt' }], source: { kind: 'user' } }))
  await direct.agent.whenIdle()
  expect(memberRequests()).toHaveLength(firstRequestCount)
  await direct.dispose()
  const restored = await ctx.agentTeams.reactivateMember(lead, 'worker', SIGNAL)
  expect(restored).toMatchObject({ id, status: 'inactive' })
  expect(lead.session.snapshotEvents().filter(event => event.type === 'team/member-retirement').map(event => event.data)).toEqual([
    { version: 2, teamId: lead.id, memberId: id, retired: true },
    { version: 2, teamId: lead.id, memberId: id, retired: false },
  ])
  expect(memberRequests()).toHaveLength(firstRequestCount)
  await ctx.agentTeams.sendMessage(lead, {
    target: 'worker', content: [{ type: 'text', text: 'second prompt' }], signal: SIGNAL,
  })
  await vi.waitFor(() => { expect(memberRequests()).toHaveLength(firstRequestCount + 1) }, { timeout: 5_000 })
  expect(ctx.agentTeams.listMembers(lead).find(member => member.id === id)?.name).toBe('worker')
}, 20_000)

it('reactivates a retired grandchild from its saved active lineage without waking an idle parent', async ({ onTestFinished }) => {
  const { ctx, lead, adapter } = await setup(onTestFinished, { maxMembers: 3, maxDepth: 2 })
  const parent = await ctx.agentTeams.spawnTeammate(lead, {
    name: 'group', description: 'Retained group', context: 'fresh', provider: 'spawn',
    prompt: [{ type: 'text', text: 'Prepare the group' }], signal: SIGNAL,
  })
  await vi.waitFor(() => { expect(ctx.agents.get(parent.member.id)).toBeUndefined() })
  const child = await withHostSubagentAncestors(ctx.subagents, lead, [parent.member.id], SIGNAL,
    group => ctx.agentTeams.spawnTeammate(group, { name: 'grandchild', description: 'Retained descendant',
      context: 'fresh', provider: 'spawn', prompt: [{ type: 'text', text: 'Read the fixture' }], signal: SIGNAL }))
  await vi.waitFor(() => { expect(ctx.agents.get(child.member.id)).toBeUndefined(); expect(ctx.agents.get(parent.member.id)).toBeUndefined() })
  const count = adapter.requests.length
  await ctx.agentTeams.retireMember(lead, 'grandchild', SIGNAL)
  await ctx.agentTeams.retireMember(lead, 'group', SIGNAL)
  await expect(ctx.agentTeams.reactivateMember(lead, 'grandchild', SIGNAL)).rejects.toMatchObject({ code: 'TEAM_INVALID_LINEAGE' })
  await ctx.agentTeams.reactivateMember(lead, 'group', SIGNAL)
  const active = await ctx.agentTeams.reactivateMember(lead, 'grandchild', SIGNAL)
  expect(active).toMatchObject({ id: child.member.id, parentId: parent.member.id, status: 'inactive' })
  expect(ctx.agents.get(parent.member.id)).toBeUndefined()
  expect(adapter.requests).toHaveLength(count)
  await ctx.agentTeams.sendMessage(lead, { target: 'grandchild', signal: SIGNAL,
    content: [{ type: 'text', text: 'Continue the retained descendant without repeating earlier work' }] })
  await vi.waitFor(() => { expect(adapter.requests).toHaveLength(count + 1) })
  expect(adapter.requests.at(-1)?.sessionId).toBe(child.member.id)
  expect(adapter.requests.filter(request => request.sessionId === parent.member.id)).toHaveLength(1)
})
