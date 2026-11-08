import { appendPortableTeamEvent, recordedTeamEvents } from './recorded-events.ts'
import { mountTeamTestSubagents } from './subagent-fixture.ts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { Agent, AgentHandle } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { createUserMessage, ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import * as JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import { snapshotSubagentDescriptor } from '@deepseek-ai/dsh-subagent'
import * as SubagentSpawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
import { MockAdapter, textResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'
import TeamService, { TeamId, TeamMessageId } from '../src/index.ts'
import type { TeamMailbox } from '../src/mailbox.ts'
import { teamProjectionDefinition } from '../src/projection.ts'
import type { Config, TeamMemberRegistration, TeamMemberSnapshot, TeamMessageSnapshot, TeamTaskSnapshot } from '../src/index.ts'
import { TestSessionQuery } from './test-session-query.ts'

const SIGNAL = new AbortController().signal
const PERSISTENCE_TEST_TIMEOUT_MS = 15_000
const roots: string[] = []
const contexts = new Set<Context>()

/** Detached durable Team read through the same projection definition as the service. */
function durable(agent: Agent): {
  members: readonly TeamMemberSnapshot[]
  tasks: readonly TeamTaskSnapshot[]
  pendingMessages: readonly TeamMessageSnapshot[]
} {
  let projected = teamProjectionDefinition.init(agent.session.header)
  for (const event of agent.session.snapshotEvents()) projected = teamProjectionDefinition.apply(projected, event)
  if (projected.failure !== undefined) throw new Error(projected.failure)
  const state = projected
  return {
    members: state.members,
    tasks: state.tasks,
    pendingMessages: state.messages.filter(message => !state.delivered.includes(message.id)),
  }
}

/** Read one stored session's full event log through a short-lived read handle. */
async function storedEvents(ctx: Context, id: SessionId): Promise<readonly SessionEvent[]> {
  const handle = await ctx.sessionPersistence.open(id, 'read')
  try {
    return recordedTeamEvents((await handle.read()).events)
  } finally {
    await handle.close()
  }
}

/** Await mailbox acknowledgements through their flush and dispatch completion. */
async function settleMailbox(ctx: Context): Promise<void> {
  const { mailbox } = ctx.agentTeams as unknown as { readonly mailbox: TeamMailbox }
  await Promise.all(mailbox.pendingDispatches())
}

async function disposeContext(ctx: Context): Promise<void> {
  try {
    await ctx.fiber.dispose()
  } finally {
    contexts.delete(ctx)
  }
}

afterEach(async () => {
  const failures: unknown[] = []
  for (const ctx of [...contexts].reverse()) {
    try {
      await disposeContext(ctx)
    } catch (error: unknown) {
      failures.push(error)
    }
  }
  for (const root of roots.splice(0)) {
    try {
      await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    } catch (error: unknown) {
      failures.push(error)
    }
  }
  if (failures.length > 0) throw new AggregateError(failures, 'Agent Teams persistence test cleanup failed')
})

interface PersistenceMount {
  readonly name: string
  mount(ctx: Context, root: string): Promise<{ dispose(): Promise<void> }>
}

const backends: PersistenceMount[] = [
  {
    name: 'JSONL',
    mount: async (ctx, root) => await ctx.plugin(JsonlSessionPersistence, {
      root: join(root, 'jsonl'),
      compression: 'none',
    }),
  },
]

async function stack(
  backend: PersistenceMount,
  root: string,
  script: ConstructorParameters<typeof MockAdapter>[0],
  teamConfig: Config = {},
) {
  const ctx = new Context()
  contexts.add(ctx)
  await mountAgentLoopTestDependencies(ctx)
  await backend.mount(ctx, root)
  await ctx.plugin(TestSessionQuery)
  await ctx.plugin(AgentLoop, { agents: [] })
  await mountTeamTestSubagents(ctx)
  await ctx.plugin(SubagentSpawn, { providerName: 'spawn' })
  await ctx.plugin(TeamService, { portableEventEnvelope: true, ...teamConfig })
  const adapter = new MockAdapter(script)
  ctx.llm.registerAdapter(['mock'], adapter)
  return {
    ctx,
    adapter,
    dispose: async () => { await disposeContext(ctx) },
  }
}

function provisioning(childId: SessionId, name: string): TeamMemberRegistration {
  return {
    id: childId,
    name,
    description: `${name} recovery`,
    provider: 'spawn',
    context: 'fresh',
    phase: 'provisioning',
  }
}

async function persistedChild(
  ctx: Context,
  rootId: SessionId,
  childId: SessionId,
  message: ReturnType<typeof createUserMessage>,
) {
  const descriptor = snapshotSubagentDescriptor({
    mode: 'continuable',
    provider: 'spawn',
    label: 'persisted child fixture',
    agentProvider: 'mock',
    agentModel: 'mock',
  })
  const child = ctx.sessions.create(childId, {
    meta: { parentSession: rootId, origin: 'subagent' },
  })
  child.append('subagent/descriptor', descriptor)
  child.append('agent/inbox/spliced', {
    target: 'next-turn',
    start: 0,
    inserted: [message],
  })
  // Live sessions persist only through an attached agent-loop writer; this
  // bare fixture session seeds its durable log directly for the cold restart.
  const handle = await ctx.sessionPersistence.create(child.header)
  await handle.append(child.snapshotEvents())
  await handle.close()
  return child
}

for (const backend of backends) {
  describe(`${backend.name} Agent Teams recovery`, () => {
    it('restores an existing member model choice after process restart', {
      timeout: PERSISTENCE_TEST_TIMEOUT_MS,
    }, async () => {
      const storageRoot = mkdtempSync(join(tmpdir(), `dsh-team-route-${backend.name.toLowerCase()}-`))
      roots.push(storageRoot)
      const rootId = SessionId(`${backend.name}-route-root`)
      const first = await stack(backend, storageRoot, [textResponse('First review completed.')])
      const lead = await first.ctx.agentLoop.create(rootId, { provider: 'mock', model: 'lead' })
      first.ctx.on('agent/pre-step', async (event, next) => event.agent === lead ? { kind: 'reject' } : next())
      const started = await first.ctx.agentTeams.spawnTeammate(lead, {
        name: 'reviewer', description: 'Retained reviewer', persona: 'Keep the review method.',
        prompt: [{ type: 'text', text: 'Review the fixture.' }], context: 'fresh', provider: 'spawn', signal: SIGNAL,
        agentOptions: { provider: 'mock', model: 'original' },
      })
      await vi.waitFor(() => { expect(first.ctx.agents.get(started.member.id)).toBeUndefined() })
      first.ctx.llm.registerAdapter(['alternate'], new MockAdapter([], {
        efforts: [{ id: ReasoningEffortId('high'), name: 'High' }],
        defaultEffort: ReasoningEffortId('high'),
      }))
      await first.ctx.agentTeams.configureMemberModel(lead, {
        target: 'reviewer', modelProvider: 'alternate', model: 'replacement', reasoningEffort: 'high',
      }, SIGNAL)
      expect((await storedEvents(first.ctx, rootId)).filter(event => event.type === 'team/member-model-route')).toHaveLength(1)
      await first.dispose()

      const second = await stack(backend, storageRoot, [])
      const alternate = new MockAdapter([textResponse('Second review completed.')], {
        efforts: [{ id: ReasoningEffortId('high'), name: 'High' }],
        defaultEffort: ReasoningEffortId('high'),
      })
      second.ctx.llm.registerAdapter(['alternate'], alternate)
      const resumed = await second.ctx.agents.resume({
        resumeSessionId: rootId, agentOptions: { provider: 'mock', model: 'lead' },
      })
      second.ctx.on('agent/pre-step', async (event, next) => event.agent === resumed.agent ? { kind: 'reject' } : next())
      expect(second.ctx.agentTeams.listMembers(resumed.agent)[1]).toMatchObject({
        id: started.member.id, modelProvider: 'alternate', model: 'replacement', modelRouteRevision: 1,
      })
      await second.ctx.agentTeams.sendMessage(resumed.agent, {
        target: 'reviewer', content: [{ type: 'text', text: 'Continue the same review.' }], signal: SIGNAL,
      })
      await vi.waitFor(() => { expect(alternate.requests).toHaveLength(1) })
      expect(alternate.requests[0]).toMatchObject({ sessionId: started.member.id,
        provider: 'alternate', model: 'replacement', reasoningEffort: 'high' })
      await vi.waitFor(() => { expect(second.ctx.agents.get(started.member.id)).toBeUndefined() })
      expect(second.ctx.agentTeams.listMembers(resumed.agent)).toHaveLength(2)
      await resumed.dispose()
      await second.dispose()
    })

    it('reconciles a persisted child to active and a missing child to durable failed', {
      timeout: PERSISTENCE_TEST_TIMEOUT_MS,
    }, async () => {
      const storageRoot = mkdtempSync(join(tmpdir(), `dsh-team-${backend.name.toLowerCase()}-`))
      roots.push(storageRoot)
      const first = await stack(backend, storageRoot, [textResponse('initial child answer')])
      const activeRootId = SessionId(`${backend.name.toLowerCase()}-active-root`)
      const failedRootId = SessionId(`${backend.name.toLowerCase()}-failed-root`)
      const childId = SessionId(`${backend.name.toLowerCase()}-child`)
      const activeRoot = await first.ctx.agentLoop.create(activeRootId, { provider: 'mock', model: 'mock' })
      const failedRoot = await first.ctx.agentLoop.create(failedRootId, { provider: 'mock', model: 'mock' })
      // Let each root's startup recovery observe the empty initial log before
      // simulating the crash-only provisioning prefix.
      await Promise.resolve()
      await Promise.resolve()

      activeRoot.session.append('team/member', {
        version: 2,
        teamId: TeamId(activeRoot.id),
        member: provisioning(childId, 'recoverable'),
      })
      failedRoot.session.append('team/member', {
        version: 2,
        teamId: TeamId(failedRoot.id),
        member: provisioning(SessionId(`${backend.name}-missing`), 'missing'),
      })
      await Promise.all([
        first.ctx.sessions.flush(activeRoot.session),
        first.ctx.sessions.flush(failedRoot.session),
      ])
      await first.ctx.subagents.startActivation({ delivery: 'caller',
        childId,
        provider: 'spawn',
        label: 'recoverable recovery',
        request: {
          prompt: [{ type: 'text', text: 'persist before active edge' }],
          parent: activeRoot,
        },
        signal: SIGNAL,
      })
      await vi.waitFor(() => { expect(first.ctx.agents.get(childId)).toBeUndefined() }, { timeout: 5_000 })
      expect((await storedEvents(first.ctx, childId))
        .some(event => event.type === 'user/message')).toBe(true)
      await first.dispose()

      const second = await stack(backend, storageRoot, [textResponse('cold resumed answer')])
      const activeHandle = await second.ctx.agents.resume({
        resumeSessionId: activeRootId,
        agentOptions: { provider: 'mock', model: 'mock' },
      })
      const failedHandle = await second.ctx.agents.resume({
        resumeSessionId: failedRootId,
        agentOptions: { provider: 'mock', model: 'mock' },
      })
      await vi.waitFor(() => {
        expect(durable(activeHandle.agent).members[0]?.phase).toBe('active')
        const failedMember = durable(failedHandle.agent).members[0]
        expect(failedMember?.phase).toBe('failed')
        expect(failedMember?.error).toContain('child Session recovery failed')
      }, { timeout: 5_000 })

      const receipt = await second.ctx.agentTeams.sendMessage(activeHandle.agent, {
        target: 'recoverable',
        content: [{ type: 'text', text: 'resume after reconciliation' }],
        signal: SIGNAL,
      })
      expect(receipt.status).toBe('accepted')
      await vi.waitFor(() => { expect(second.ctx.agents.get(childId)).toBeUndefined() }, { timeout: 5_000 })
      await vi.waitFor(() => { expect(durable(activeHandle.agent).pendingMessages).toEqual([]) })

      await activeHandle.dispose()
      await failedHandle.dispose()
      await second.dispose()
    })

    it('reconciles a provisioning child whose initial prompt is durably pending', {
      timeout: PERSISTENCE_TEST_TIMEOUT_MS,
    }, async () => {
      const storageRoot = mkdtempSync(join(tmpdir(), `dsh-team-pending-${backend.name.toLowerCase()}-`))
      roots.push(storageRoot)
      const rootId = SessionId(`${backend.name.toLowerCase()}-pending-root`)
      const childId = SessionId(`${backend.name.toLowerCase()}-pending-child`)
      const first = await stack(backend, storageRoot, [])
      const root = await first.ctx.agentLoop.create(rootId, { provider: 'mock', model: 'mock' })
      await Promise.resolve()
      await Promise.resolve()
      root.session.append('team/member', {
        version: 2,
        teamId: TeamId(root.id),
        member: provisioning(childId, 'pending-worker'),
      })
      const initial = createUserMessage({
        content: [{ type: 'text', text: 'durably pending initial task' }],
        source: { kind: 'user' },
      })
      await persistedChild(first.ctx, rootId, childId, initial)
      await first.ctx.sessions.flush(root.session)
      await first.dispose()

      const second = await stack(backend, storageRoot, [])
      const rootHandle = await second.ctx.agents.resume({
        resumeSessionId: rootId,
        agentOptions: { provider: 'mock', model: 'mock' },
      })
      await vi.waitFor(() => {
        expect(durable(rootHandle.agent).members[0]?.phase).toBe('active')
      })
      expect(second.adapter.requests).toEqual([])
      const stored = await storedEvents(second.ctx, childId)
      expect(stored.some(event => event.type === 'agent/inbox/spliced'
        && event.data.inserted.some(message => message.id === initial.id))).toBe(true)

      await rootHandle.dispose()
      await second.dispose()
    })

    it('retries queued mail through cold-resume Steer after restart', {
      timeout: PERSISTENCE_TEST_TIMEOUT_MS,
    }, async () => {
      const storageRoot = mkdtempSync(join(tmpdir(), `dsh-team-mail-${backend.name.toLowerCase()}-`))
      roots.push(storageRoot)
      const rootId = SessionId(`${backend.name.toLowerCase()}-mail-root`)

      const first = await stack(backend, storageRoot, [textResponse('initial teammate answer')])
      const firstLead = await first.ctx.agentLoop.create(rootId, { provider: 'mock', model: 'mock' })
      const started = await first.ctx.agentTeams.spawnTeammate(firstLead, {
        name: 'mail-worker',
        description: 'mail recovery worker',
        prompt: [{ type: 'text', text: 'finish before restart' }],
        context: 'fresh',
        provider: 'spawn',
        signal: SIGNAL,
      })
      await vi.waitFor(() => { expect(first.ctx.agents.get(started.member.id)).toBeUndefined() }, { timeout: 5_000 })
      vi.spyOn(first.ctx.sessionPersistence, 'open')
        .mockRejectedValueOnce(new Error('temporary target read failure'))
      const queued = await first.ctx.agentTeams.sendMessage(firstLead, {
        target: 'mail-worker',
        content: [{ type: 'text', text: 'durable retry context' }],
        signal: SIGNAL,
      })
      expect(queued.status).toBe('queued')
      expect(durable(firstLead).pendingMessages.map(message => message.id)).toEqual([queued.messageId])
      await first.dispose()

      const second = await stack(backend, storageRoot, [textResponse('resumed teammate answer')])
      const rootHandle = await second.ctx.agents.resume({
        resumeSessionId: rootId,
        agentOptions: { provider: 'mock', model: 'mock' },
      })
      await vi.waitFor(() => { expect(second.ctx.agents.get(started.member.id)).toBeUndefined() }, { timeout: 5_000 })
      await vi.waitFor(() => { expect(durable(rootHandle.agent).pendingMessages).toEqual([]) })

      const child = await storedEvents(second.ctx, started.member.id)
      const peerIds = child.flatMap(event => event.type === 'user/message'
        && event.data.source.kind === 'team-message'
        ? [event.data.source.messageId]
        : [])
      expect(peerIds).toEqual([queued.messageId])

      await rootHandle.dispose()
      await second.dispose()
    })

    it('retries a transient target read without another Team event', {
      timeout: PERSISTENCE_TEST_TIMEOUT_MS,
    }, async () => {
      const storageRoot = mkdtempSync(join(tmpdir(), `dsh-team-retry-${backend.name.toLowerCase()}-`))
      roots.push(storageRoot)
      const runtime = await stack(backend, storageRoot, [textResponse('initial teammate answer'), textResponse('retry answer')])
      const lead = await runtime.ctx.agentLoop.create(SessionId(`${backend.name}-retry-root`), { provider: 'mock', model: 'mock' })
      const started = await runtime.ctx.agentTeams.spawnTeammate(lead, {
        name: 'retry-worker', description: 'retry worker', prompt: [{ type: 'text', text: 'initial' }],
        context: 'fresh', provider: 'spawn', signal: SIGNAL,
      })
      await vi.waitFor(() => { expect(runtime.ctx.agents.get(started.member.id)).toBeUndefined() })
      const failedRead = vi.spyOn(runtime.ctx.sessionPersistence, 'open').mockImplementationOnce(async () => {
        throw new Error('one transient read failure')
      })
      const sent = await runtime.ctx.agentTeams.sendMessage(lead, {
        target: 'retry-worker', content: [{ type: 'text', text: 'retry autonomously' }], signal: SIGNAL,
      })
      expect(sent.status).toBe('queued')
      failedRead.mockRestore()
      await vi.waitFor(() => { expect(durable(lead).pendingMessages).toEqual([]) }, { timeout: 5_000 })
      const target = await storedEvents(runtime.ctx, started.member.id)
      expect(target.filter(event => event.type === 'user/message'
        && event.data.source.kind === 'team-message'
        && event.data.source.messageId === sent.messageId)).toHaveLength(1)
      await runtime.dispose()
    })

    it('reports exhausted automatic retries and allows an explicit retry', {
      timeout: PERSISTENCE_TEST_TIMEOUT_MS,
    }, async () => {
      const storageRoot = mkdtempSync(join(tmpdir(), `dsh-team-retry-limit-${backend.name.toLowerCase()}-`))
      roots.push(storageRoot)
      const runtime = await stack(backend, storageRoot, [textResponse('initial answer'), textResponse('manual retry answer')], {
        mailboxRetryMaxAttempts: 1,
      })
      const lead = await runtime.ctx.agentLoop.create(SessionId(`${backend.name}-retry-limit-root`), { provider: 'mock', model: 'mock' })
      const started = await runtime.ctx.agentTeams.spawnTeammate(lead, {
        name: 'retry-limit-worker', description: 'retry limit worker', prompt: [{ type: 'text', text: 'initial' }],
        context: 'fresh', provider: 'spawn', signal: SIGNAL,
      })
      await vi.waitFor(() => { expect(runtime.ctx.agents.get(started.member.id)).toBeUndefined() })
      const failedRead = vi.spyOn(runtime.ctx.sessionPersistence, 'open').mockRejectedValueOnce(new Error('one read outage'))
      const sent = await runtime.ctx.agentTeams.sendMessage(lead, {
        target: 'retry-limit-worker', content: [{ type: 'text', text: 'explicit retry' }], signal: SIGNAL,
      })
      failedRead.mockRestore()
      expect(sent.status).toBe('queued')
      await vi.waitFor(() => {
        expect(runtime.ctx.agentTeams.listMessages(lead).find(message => message.id === sent.messageId))
          .toMatchObject({ status: 'retry-exhausted', attempts: 1, error: 'one read outage' })
      })
      const retried = await runtime.ctx.agentTeams.retryMessage(lead, sent.messageId, SIGNAL)
      expect(retried.status).toBe('accepted')
      await vi.waitFor(() => { expect(durable(lead).pendingMessages).toEqual([]) })
      expect((await storedEvents(runtime.ctx, started.member.id)).filter(event => event.type === 'user/message'
        && event.data.source.kind === 'team-message'
        && event.data.source.messageId === sent.messageId)).toHaveLength(1)
      await runtime.dispose()
    })

    it('cancels a scheduled delivery retry when the Team runtime unloads', {
      timeout: PERSISTENCE_TEST_TIMEOUT_MS,
    }, async () => {
      const storageRoot = mkdtempSync(join(tmpdir(), `dsh-team-retry-dispose-${backend.name.toLowerCase()}-`))
      roots.push(storageRoot)
      const runtime = await stack(backend, storageRoot, [textResponse('initial answer')], {
        mailboxRetryInitialMs: 30_000, mailboxRetryMaxMs: 30_000,
      })
      const lead = await runtime.ctx.agentLoop.create(SessionId(`${backend.name}-retry-dispose-root`), { provider: 'mock', model: 'mock' })
      const started = await runtime.ctx.agentTeams.spawnTeammate(lead, {
        name: 'retry-dispose-worker', description: 'retry disposal worker', prompt: [{ type: 'text', text: 'initial' }],
        context: 'fresh', provider: 'spawn', signal: SIGNAL,
      })
      await vi.waitFor(() => { expect(runtime.ctx.agents.get(started.member.id)).toBeUndefined() })
      vi.spyOn(runtime.ctx.sessionPersistence, 'open').mockRejectedValueOnce(new Error('unavailable until unload'))
      const sent = await runtime.ctx.agentTeams.sendMessage(lead, {
        target: 'retry-dispose-worker', content: [{ type: 'text', text: 'remain durable' }], signal: SIGNAL,
      })
      expect(sent.status).toBe('queued')
      const mailbox = Reflect.get(runtime.ctx.agentTeams, 'mailbox') as TeamMailbox
      await vi.waitFor(() => { expect(mailbox.hasScheduledRetry(lead)).toBe(true) })
      await runtime.dispose()
      expect(mailbox.hasScheduledRetry(lead)).toBe(false)
    })

    it('keeps unversioned and earlier-goal mail visible without executing it after restart', {
      timeout: PERSISTENCE_TEST_TIMEOUT_MS,
    }, async () => {
      const storageRoot = mkdtempSync(join(tmpdir(), `dsh-team-goal-mail-${backend.name.toLowerCase()}-`))
      roots.push(storageRoot)
      const rootId = SessionId(`${backend.name}-goal-mail-root`)
      const first = await stack(backend, storageRoot, [textResponse('initial teammate answer')])
      const lead = await first.ctx.agentLoop.create(rootId, { provider: 'mock', model: 'mock' })
      const started = await first.ctx.agentTeams.spawnTeammate(lead, {
        name: 'goal-worker', description: 'goal worker', prompt: [{ type: 'text', text: 'initial' }],
        context: 'fresh', provider: 'spawn', signal: SIGNAL,
      })
      await vi.waitFor(() => { expect(first.ctx.agents.get(started.member.id)).toBeUndefined() })
      const historicalId = TeamMessageId(`${backend.name}-unversioned-mail`)
      lead.session.append('team/message/queued', {
        version: 2, teamId: TeamId(rootId), message: {
          id: historicalId, senderId: rootId, senderName: 'lead', targetId: started.member.id,
          content: [{ type: 'text', text: 'unversioned historical instruction' }],
        },
      })
      const versionedId = TeamMessageId(`${backend.name}-goal-a-mail`)
      lead.session.append('team/message/queued', {
        version: 2, teamId: TeamId(rootId), message: {
          id: versionedId, senderId: rootId, senderName: 'lead', targetId: started.member.id,
          content: [{ type: 'text', text: 'goal A instruction' }], goalRevision: 0,
        },
      })
      appendPortableTeamEvent(lead.session, 'team/goal-proposed', { version: 2, teamId: TeamId(rootId), proposal: {
        revision: 1, baseRevision: 0, proposedBy: rootId,
        change: { kind: 'replace', definition: {
          objective: 'Goal B', acceptanceCriteria: ['Inspect B'], scope: {
            coverage: 'task', targets: ['B'], allowedActions: ['read'], excludedTargets: [], constraints: [],
          },
        } },
      } })
      appendPortableTeamEvent(lead.session, 'team/goal-decided', { version: 2, teamId: TeamId(rootId), decision: {
        proposalRevision: 1, outcome: 'accepted', comment: '', decidedAt: 1, channel: 'user-question',
      } })
      await first.ctx.sessions.flush(lead.session)
      await first.dispose()

      const second = await stack(backend, storageRoot, [])
      const resumed = await second.ctx.agents.resume({
        resumeSessionId: rootId, agentOptions: { provider: 'mock', model: 'mock' },
      })
      await settleMailbox(second.ctx)
      const mailbox = Reflect.get(second.ctx.agentTeams, 'mailbox') as TeamMailbox
      expect(mailbox.list(resumed.agent).filter(message => message.status === 'quarantined').map(message => message.id))
        .toEqual([historicalId, versionedId])
      expect(mailbox.get(resumed.agent, historicalId).content).toEqual([
        { type: 'text', text: 'unversioned historical instruction' },
      ])
      expect(second.adapter.requests).toEqual([])
      expect((await storedEvents(second.ctx, started.member.id)).filter(event => event.type === 'user/message'
        && event.data.source.kind === 'team-message')).toEqual([])
      const [adopted, duplicateAdoption] = await Promise.all([
        mailbox.adopt(resumed.agent, versionedId, SIGNAL),
        mailbox.adopt(resumed.agent, versionedId, SIGNAL),
      ])
      expect(duplicateAdoption.messageId).toBe(adopted.messageId)
      expect(adopted.status).toBe('accepted')
      await vi.waitFor(() => {
        expect(durable(resumed.agent).pendingMessages.map(message => message.id)).toEqual([historicalId, versionedId])
      })
      expect(mailbox.list(resumed.agent).find(message => message.id === adopted.messageId))
        .toMatchObject({ adoptedFrom: versionedId, status: 'delivered', goalRevision: 1 })
      expect(mailbox.list(resumed.agent).filter(message => message.adoptedFrom === versionedId)).toHaveLength(1)
      expect((await storedEvents(second.ctx, started.member.id)).filter(event => event.type === 'user/message'
        && event.data.source.kind === 'team-message'
        && event.data.source.messageId === adopted.messageId)).toHaveLength(1)
      await resumed.dispose()
      await second.dispose()
    })

    it('delivers one queued message through a restored parent to its grandchild', {
      timeout: PERSISTENCE_TEST_TIMEOUT_MS,
    }, async () => {
      const storageRoot = mkdtempSync(join(tmpdir(), `dsh-team-grandchild-mail-${backend.name.toLowerCase()}-`))
      roots.push(storageRoot)
      const rootId = SessionId(`${backend.name}-grandchild-mail-root`)
      const parentId = SessionId(`${backend.name}-grandchild-mail-parent`)
      const childId = SessionId(`${backend.name}-grandchild-mail-target`)
      const messageId = TeamMessageId(`${backend.name}-grandchild-mail-message`)
      const first = await stack(backend, storageRoot, [])
      const root = await first.ctx.agentLoop.create(rootId, { provider: 'mock', model: 'mock' })
      await Promise.resolve()
      await Promise.resolve()
      for (const member of [
        { ...provisioning(parentId, 'parent'), parentId: rootId },
        { ...provisioning(childId, 'grandchild'), parentId },
      ]) {
        root.session.append('team/member', { version: 2, teamId: TeamId(rootId), member })
        root.session.append('team/member', { version: 2, teamId: TeamId(rootId), member: { ...member, phase: 'active' } })
      }
      await persistedChild(first.ctx, rootId, parentId, createUserMessage({
        content: [{ type: 'text', text: 'parent initial' }], source: { kind: 'user' },
      }))
      await persistedChild(first.ctx, parentId, childId, createUserMessage({
        content: [{ type: 'text', text: 'grandchild initial' }], source: { kind: 'user' },
      }))
      root.session.append('team/message/queued', { version: 2, teamId: TeamId(rootId), message: {
        id: messageId, senderId: rootId, senderName: 'lead', targetId: childId,
        content: [{ type: 'text', text: 'one restored instruction' }], goalRevision: 0,
      } })
      await first.ctx.sessions.flush(root.session)
      await first.dispose()

      const second = await stack(backend, storageRoot, [textResponse('restored grandchild answer')])
      const resumed = await second.ctx.agents.resume({
        resumeSessionId: rootId, agentOptions: { provider: 'mock', model: 'mock' },
      })
      await vi.waitFor(() => { expect(durable(resumed.agent).pendingMessages).toEqual([]) }, { timeout: 5_000 })
      const target = await storedEvents(second.ctx, childId)
      expect(target.filter(event => event.type === 'user/message'
        && event.data.source.kind === 'team-message'
        && event.data.source.messageId === messageId)).toHaveLength(1)
      await resumed.dispose()
      await second.dispose()
    })

    it('acknowledges target-recorded mail after restart without delivering it twice', {
      timeout: PERSISTENCE_TEST_TIMEOUT_MS,
    }, async () => {
      const storageRoot = mkdtempSync(join(tmpdir(), `dsh-team-dedup-${backend.name.toLowerCase()}-`))
      roots.push(storageRoot)
      const rootId = SessionId(`${backend.name.toLowerCase()}-dedup-root`)
      const messageId = TeamMessageId(`${backend.name.toLowerCase()}-recorded-message`)

      const first = await stack(backend, storageRoot, [textResponse('initial teammate answer')])
      const firstLead = await first.ctx.agentLoop.create(rootId, { provider: 'mock', model: 'mock' })
      const started = await first.ctx.agentTeams.spawnTeammate(firstLead, {
        name: 'dedup-worker',
        description: 'mail deduplication worker',
        prompt: [{ type: 'text', text: 'finish before the crash window' }],
        context: 'fresh',
        provider: 'spawn',
        signal: SIGNAL,
      })
      await vi.waitFor(() => { expect(first.ctx.agents.get(started.member.id)).toBeUndefined() }, { timeout: 5_000 })

      const targetHandle = await first.ctx.agents.resume({
        resumeSessionId: started.member.id,
        agentOptions: { provider: 'mock', model: 'mock' },
      })
      targetHandle.agent.session.append('user/message', createUserMessage({
        content: [
          { type: 'text', text: `Team message ${messageId} from lead:` },
          { type: 'text', text: 'already recorded before acknowledgement' },
        ],
        source: {
          kind: 'team-message',
          teamId: TeamId(rootId),
          messageId,
          senderId: rootId,
          senderName: 'lead',
        },
      }), { surfaceOp: 'append' })
      await first.ctx.sessions.flush(targetHandle.agent.session)
      // Finish the target observer before writing the crash-only queued prefix.
      await settleMailbox(first.ctx)
      await targetHandle.dispose()

      const queued: TeamMessageSnapshot = {
        id: messageId,
        senderId: rootId,
        senderName: 'lead',
        targetId: started.member.id,
        content: [{ type: 'text', text: 'already recorded before acknowledgement' }],
        goalRevision: 0,
      }
      firstLead.session.append('team/message/queued', {
        version: 2,
        teamId: TeamId(rootId),
        message: queued,
      })
      await first.ctx.sessions.flush(firstLead.session)
      expect(durable(firstLead).pendingMessages.map(message => message.id)).toEqual([messageId])
      await first.dispose()

      const second = await stack(backend, storageRoot, [])
      const { mailbox } = second.ctx.agentTeams as unknown as { readonly mailbox: TeamMailbox }
      const flush = second.ctx.sessions.flush.bind(second.ctx.sessions)
      const checkpointEntered = Promise.withResolvers<undefined>()
      const releaseCheckpoint = Promise.withResolvers<undefined>()
      const delayedCheckpoint = vi.spyOn(second.ctx.sessions, 'flush').mockImplementation(async (session) => {
        if (session.id === rootId && recordedTeamEvents(session.snapshotEvents()).some(event =>
          event.type === 'team/message/delivered' && event.data.messageId === messageId)) {
          checkpointEntered.resolve(undefined)
          await releaseCheckpoint.promise
        }
        return await flush(session)
      })
      let rootHandle: AgentHandle
      try {
        rootHandle = await second.ctx.agents.resume({
          resumeSessionId: rootId,
          agentOptions: { provider: 'mock', model: 'mock' },
        })
        await checkpointEntered.promise
        expect(durable(rootHandle.agent).pendingMessages).toEqual([])
        expect(mailbox.pendingDispatches().length).toBeGreaterThan(0)
        let settled = false
        const settlement = settleMailbox(second.ctx).then(() => { settled = true })
        await Promise.resolve()
        expect(settled).toBe(false)
        releaseCheckpoint.resolve(undefined)
        await settlement
      } finally {
        releaseCheckpoint.resolve(undefined)
        try {
          await settleMailbox(second.ctx)
        } finally {
          delayedCheckpoint.mockRestore()
        }
      }
      expect(second.ctx.agents.get(started.member.id)).toBeUndefined()
      expect(second.adapter.requests).toEqual([])

      const child = await storedEvents(second.ctx, started.member.id)
      const occurrences = child.filter(event => event.type === 'user/message'
        && event.data.source.kind === 'team-message'
        && event.data.source.messageId === messageId)
      expect(occurrences).toHaveLength(1)

      await rootHandle.dispose()
      await second.dispose()
    })

    it('acknowledges durably pending target mail without cold-resume duplication', {
      timeout: PERSISTENCE_TEST_TIMEOUT_MS,
    }, async () => {
      const storageRoot = mkdtempSync(join(tmpdir(), `dsh-team-inbox-${backend.name.toLowerCase()}-`))
      roots.push(storageRoot)
      const rootId = SessionId(`${backend.name.toLowerCase()}-inbox-root`)
      const childId = SessionId(`${backend.name.toLowerCase()}-inbox-child`)
      const messageId = TeamMessageId(`${backend.name.toLowerCase()}-pending-team-message`)
      const first = await stack(backend, storageRoot, [])
      const root = await first.ctx.agentLoop.create(rootId, { provider: 'mock', model: 'mock' })
      await Promise.resolve()
      await Promise.resolve()
      const provisioned = provisioning(childId, 'pending-mail-worker')
      const active: TeamMemberRegistration = {
        ...provisioned,
        phase: 'active',
      }
      const queued: TeamMessageSnapshot = {
        id: messageId,
        senderId: rootId,
        senderName: 'lead',
        targetId: childId,
        content: [{ type: 'text', text: 'already durable in target inbox' }],
        goalRevision: 0,
      }
      root.session.append('team/member', {
        version: 2,
        teamId: TeamId(root.id),
        member: provisioned,
      })
      root.session.append('team/member', {
        version: 2,
        teamId: TeamId(root.id),
        member: active,
      })
      root.session.append('team/message/queued', {
        version: 2,
        teamId: TeamId(root.id),
        message: queued,
      })
      const pending = createUserMessage({
        content: [{ type: 'text', text: 'already durable in target inbox' }],
        source: {
          kind: 'team-message',
          teamId: TeamId(rootId),
          messageId,
          senderId: rootId,
          senderName: 'lead',
        },
      })
      await persistedChild(first.ctx, rootId, childId, pending)
      await first.ctx.sessions.flush(root.session)
      await first.dispose()

      const second = await stack(backend, storageRoot, [])
      const rootHandle = await second.ctx.agents.resume({
        resumeSessionId: rootId,
        agentOptions: { provider: 'mock', model: 'mock' },
      })
      await vi.waitFor(() => {
        expect(durable(rootHandle.agent).pendingMessages).toEqual([])
      })
      await settleMailbox(second.ctx)
      expect(second.adapter.requests).toEqual([])
      expect(second.ctx.agents.get(childId)).toBeUndefined()
      const stored = await storedEvents(second.ctx, childId)
      const pendingCopies = stored.flatMap(event => event.type === 'agent/inbox/spliced'
        ? event.data.inserted.filter(message => message.source.kind === 'team-message'
          && message.source.messageId === messageId)
        : [])
      expect(pendingCopies).toHaveLength(1)

      await rootHandle.dispose()
      await second.dispose()
    })
  })
}
