import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { describe, expect, it, onTestFinished } from 'vitest'
import { portableTeamRecord } from '../src/portable-events.ts'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SESSION_FORMAT_VERSION, SessionId, SessionLogOffset, SessionSeq } from '@deepseek-ai/dsh-session'
import type { SessionEvent, SessionEventMap, SessionEventType } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { teamProjectionDefinition, teamProjectionView } from '../src/projection.ts'
import type { TeamProjectionState, TeamState } from '../src/projection.ts'
import { TeamId, TeamMessageId, TeamTaskId } from '../src/types.ts'
import { TeamExpertId } from '../src/expert-types.ts'
import { TeamTaskExecutionId } from '../src/task-work-types.ts'
import type { TeamMemberRegistration, TeamMessageSnapshot, TeamTaskSnapshot } from '../src/types.ts'

const ROOT = SessionId('team-root')
const TEAM = TeamId(ROOT)
const CHILD = SessionId('child-a')

function event<T extends SessionEventType>(type: T, data: SessionEventMap[T], seq: SessionSeq): SessionEvent<T> {
  return { type, data, seq, time: seq } as unknown as SessionEvent<T>
}

function project(rootId: SessionId, events: readonly SessionEvent[]): TeamProjectionState {
  let state = teamProjectionDefinition.init({
    version: SESSION_FORMAT_VERSION,
    id: rootId,
    createdAt: 0,
    isSeeded: false,
  })
  for (const event of events) state = teamProjectionDefinition.apply(state, event)
  return state
}

function teamState(projected: TeamProjectionState): TeamState {
  if (projected.failure !== undefined) throw new Error(projected.failure)
  return projected
}

function projectTeam(rootId: SessionId, events: readonly SessionEvent[]): TeamState {
  return teamState(project(rootId, events))
}

/** Queued-minus-delivered mail retained by the projection. */
function pending(state: TeamState): TeamMessageSnapshot[] {
  return state.messages.filter(message => !state.delivered.includes(message.id))
}

/** Whether one Team state contains no projected records. */
function isEmptyState(state: TeamState): boolean {
  return state.members.length === 0 && state.tasks.length === 0
    && state.messages.length === 0 && state.delivered.length === 0
}

function member(overrides: Partial<TeamMemberRegistration> = {}): TeamMemberRegistration {
  return {
    id: CHILD,
    name: 'worker-a',
    description: 'worker',
    provider: 'spawn',
    context: 'fresh',
    phase: 'provisioning',
    ...overrides,
  }
}

function task(overrides: Partial<TeamTaskSnapshot> = {}): TeamTaskSnapshot {
  return {
    id: TeamTaskId('task-1'),
    revision: 1,
    subject: 'subject',
    description: 'description',
    status: 'pending',
    blockedBy: [],
    writeScopes: [],
    ...overrides,
  }
}

function message(overrides: Partial<TeamMessageSnapshot> = {}): TeamMessageSnapshot {
  return {
    id: TeamMessageId('message-1'),
    senderId: ROOT,
    senderName: 'lead',
    targetId: CHILD,
    content: [{ type: 'text', text: 'hello' }],
    ...overrides,
  }
}

describe('Agent Teams projection events', () => {
  it('replays portable known-tag envelopes with the same Team state as native events', () => {
    const native = [
      event('team/member', { version: 2, teamId: TEAM, member: member() }, SessionSeq(0)),
      event('team/member', { version: 2, teamId: TEAM, member: member({ phase: 'active' }) }, SessionSeq(1)),
      event('team/task', { version: 2, teamId: TEAM, task: task() }, SessionSeq(2)),
      event('team/message/queued', { version: 2, teamId: TEAM, message: message({ notBefore: 500, cooldownProvider: 'mock' }) }, SessionSeq(3)),
    ]
    const portable = native.map(item => event('team/task', { version: 2, teamId: TEAM,
      task: portableTeamRecord(item.type, JSON.stringify(item.data)) }, item.seq))
    expect(projectTeam(ROOT, portable)).toEqual(projectTeam(ROOT, native))
    expect(projectTeam(ROOT, portable).messages[0]).toMatchObject({ notBefore: 500, cooldownProvider: 'mock' })
  })

  it('rejects mismatched and unknown portable payloads and ignores foreign Team envelopes', () => {
    const encoded = (type: string, payload: object, teamId = TEAM) => event('team/task', {
      version: 2, teamId, task: portableTeamRecord(type, JSON.stringify(payload)),
    }, SessionSeq(0))
    expect(project(ROOT, [encoded('team/unknown', { version: 2, teamId: TEAM })]).failure).toContain('unsupported portable')
    expect(project(ROOT, [encoded('team/task', { version: 2, teamId: TeamId('foreign'), task: task() })]).failure).toContain('selector differs')
    expect(project(ROOT, [encoded('team/task', { version: 2, teamId: TEAM,
      task: portableTeamRecord('team/task', '{}') })]).failure).toContain('nested portable Team event')
    expect(project(ROOT, [encoded('team/unknown', {}, TeamId('foreign'))]).failure).toBeUndefined()
  })

  it('replays in-place model choices without changing immutable member registration', () => {
    const initial = member({ phase: 'active', modelProvider: 'mock', model: 'first', reasoningEffort: 'low' })
    const records = [
      event('team/member', { version: 2, teamId: TEAM, member: member({
        modelProvider: 'mock', model: 'first', reasoningEffort: 'low',
      }) }, SessionSeq(0)),
      event('team/member', { version: 2, teamId: TEAM, member: initial }, SessionSeq(1)),
    ]
    const route = { memberId: CHILD, revision: 1, modelProvider: 'other', model: 'second', reasoningEffort: 'high' }
    const changed = event('team/member-model-route', { version: 2, teamId: TEAM, route }, SessionSeq(2))
    const state = projectTeam(ROOT, [...records, changed])
    expect(state.members).toEqual([initial])
    expect(teamProjectionView(state).members[1]).toMatchObject({ id: CHILD,
      modelProvider: 'other', model: 'second', reasoningEffort: 'high', modelRouteRevision: 1 })
    expect(project(ROOT, [...records, changed, changed]).failure).toContain('revision is not contiguous')
    expect(project(ROOT, [changed]).failure).toContain('existing active or retired teammate')
    expect(projectTeam(ROOT, [...records, changed,
      event('team/member-retirement', { version: 2, teamId: TEAM, memberId: CHILD, retired: true }, SessionSeq(3)),
      event('team/member-model-route', { version: 2, teamId: TEAM,
        route: { memberId: CHILD, revision: 2, modelProvider: 'mock', model: 'third' } }, SessionSeq(4)),
    ]).modelRoutes?.[0]).toMatchObject({ revision: 2, model: 'third' })
  })

  it('records retirement separately from released member registration and restores the same identity', () => {
    const registered = member({ phase: 'active' })
    const records = [
      event('team/member', { version: 2, teamId: TEAM, member: member() }, SessionSeq(0)),
      event('team/member', { version: 2, teamId: TEAM, member: registered }, SessionSeq(1)),
    ]
    const retirement = event('team/member-retirement', { version: 2, teamId: TEAM, memberId: CHILD, retired: true }, SessionSeq(2))
    expect(projectTeam(ROOT, [...records, retirement]).members[0]).toEqual({ ...registered, phase: 'retired' })
    expect(projectTeam(ROOT, [...records, retirement,
      event('team/member-retirement', { version: 2, teamId: TEAM, memberId: CHILD, retired: false }, SessionSeq(3)),
    ]).members[0]).toEqual(registered)
    expect(project(ROOT, [retirement]).failure).toContain('existing active member')
    expect(project(ROOT, [...records, retirement, retirement]).failure).toContain('existing active member')
    const invalid = JSON.parse(JSON.stringify(records[1])) as SessionEvent<'team/member'>
    Object.assign(invalid.data.member, { phase: 'retired' })
    expect(project(ROOT, [records[0]!, invalid]).failure).toContain('invalid')
  })

  it('accepts only a parent’s first skill selection while its child is provisioning', () => {
    const parentId = SessionId('skill-parent')
    const parent = member({ id: parentId, name: 'skill-parent' })
    const records = [
      event('team/member', { version: 2, teamId: TEAM, member: parent }, SessionSeq(0)),
      event('team/member', { version: 2, teamId: TEAM, member: { ...parent, phase: 'active' } }, SessionSeq(1)),
      event('team/member', { version: 2, teamId: TEAM, member: member({ parentId }) }, SessionSeq(2)),
    ]
    const selection = { memberId: CHILD, selectedBy: parentId, revision: 1, goalRevision: 0, skills: [] }
    const initial = event('team/skills-selected', { version: 2, teamId: TEAM, selection }, SessionSeq(3))
    expect(projectTeam(ROOT, [...records, initial]).skillSelections).toEqual([selection])
    const repeated = event('team/skills-selected', { version: 2, teamId: TEAM, selection: { ...selection, revision: 2 } }, SessionSeq(4))
    expect(project(ROOT, [...records, initial, repeated]).failure).toContain('initial provisioning choice')
    const own = event('team/skills-selected', { version: 2, teamId: TEAM, selection: { ...selection, selectedBy: CHILD } }, SessionSeq(3))
    expect(project(ROOT, [...records, own]).failure).toContain('skill selector is not an active Team member')
    const wrongParentRecords = records.slice(0, 2).concat(event('team/member', {
      version: 2, teamId: TEAM, member: member({ parentId: ROOT }),
    }, SessionSeq(2)))
    expect(project(ROOT, [...wrongParentRecords, initial]).failure).toContain('only the member, its direct parent, or Lead')
  })

  it('restores reviewed task work and rejects records that replace inputs, attempts, or evidence', () => {
    const planned = task({ inputKey: 'fixture-v1', work: {
      plan: { revision: 1, plannerId: ROOT, goalRevision: 0, inputVersion: 'fixture-v1', environmentVersion: 'local-v1', acceptanceCriteria: ['Compare the fixture'] },
      attempts: 0,
    } })
    const running = task({ ...planned, revision: 2, status: 'in_progress', ownerId: CHILD, work: {
      ...planned.work!, attempts: 1,
      execution: { id: TeamTaskExecutionId('task-1/run-1'), ownerId: CHILD, planRevision: 1, dependencies: [], phase: 'running', effectTracking: 'observed' },
    } })
    const submission = { result: 'Fixture compared', evidence: ['fixture/report.json'] }
    const submitted = task({ ...running, revision: 3, work: {
      ...running.work!, execution: { ...running.work!.execution!, phase: 'submitted', submission },
    } })
    const review = { reviewerId: ROOT, decision: 'accepted' as const, summary: 'Rechecked the fixture', evidence: ['review/check.json'] }
    const accepted = task({ ...submitted, revision: 4, result: submission.result, evidence: submission.evidence, status: 'completed', work: {
      ...submitted.work!, execution: { ...submitted.work!.execution!, phase: 'accepted', review },
    } })
    const taskEvent = (value: TeamTaskSnapshot) => event('team/task', { version: 2, teamId: TEAM, task: value }, SessionSeq(value.revision + 2))
    const prefix = [
      event('team/member', { version: 2, teamId: TEAM, member: member() }, SessionSeq(1)),
      event('team/member', { version: 2, teamId: TEAM, member: member({ phase: 'active' }) }, SessionSeq(2)),
    ]
    const replay = (values: TeamTaskSnapshot[]) => project(ROOT, [...prefix, ...values.map(taskEvent)])
    const restoredState = replay([planned, running, submitted, accepted])
    const restored = teamState(restoredState).tasks[0]!
    expect(restored).toMatchObject({ status: 'completed', result: submission.result })
    expect(teamProjectionView(restoredState)).toMatchObject({ tasks: [], completedTaskCount: 1 })
    expect(restored.work?.execution?.review).toEqual(review)

    const cases: { name: string; before: TeamTaskSnapshot[]; next: TeamTaskSnapshot; failure: RegExp }[] = [
      { name: 'skip an attempt', before: [planned], next: { ...running, work: { ...running.work!, attempts: 2,
        execution: { ...running.work!.execution!, id: TeamTaskExecutionId('task-1/run-2') } } }, failure: /advance the attempt/ },
      { name: 'replace the executor', before: [planned, running], next: { ...submitted, ownerId: ROOT,
        work: { ...submitted.work!, execution: { ...submitted.work!.execution!, ownerId: ROOT } } },
      failure: /identity and consumed versions/ },
      { name: 'skip submission', before: [planned, running], next: { ...accepted, revision: 3 }, failure: /running to accepted/ },
      { name: 'self review', before: [planned, running, submitted], next: { ...accepted,
        work: { ...accepted.work!, execution: { ...accepted.work!.execution!, review: { ...review, reviewerId: CHILD } } } },
      failure: /payload is invalid/ },
      { name: 'change submitted evidence', before: [planned, running, submitted], next: { ...accepted,
        work: { ...accepted.work!, execution: { ...accepted.work!.execution!, submission: { ...submission, evidence: ['replacement'] } } } },
      failure: /cannot be rewritten/ },
      { name: 'invent evidence while cancelling', before: [planned, running], next: { ...planned, revision: 3,
        work: { ...running.work!, execution: { ...running.work!.execution!, phase: 'cancelled', submission } } }, failure: /cancellation must retain/ },
      { name: 'replace input without a plan revision', before: [planned, running], next: { ...submitted, description: 'different fixture' }, failure: /inputs cannot change/ },
      { name: 'replace keyed inputs with another plan', before: [planned, running, submitted, accepted], next: { ...planned, revision: 5,
        work: { attempts: 1, plan: { ...planned.work!.plan, revision: 2, inputVersion: 'fixture-v2' } } }, failure: /keyed task plan/ },
      { name: 'restart an accepted execution directly', before: [planned, running, submitted, accepted], next: { ...running, revision: 5,
        work: { ...running.work!, attempts: 2, execution: { ...running.work!.execution!, id: TeamTaskExecutionId('task-1/run-2') } } }, failure: /release or reopen/ },
    ]
    for (const item of cases) expect(replay([...item.before, item.next]).failure, item.name).toMatch(item.failure)
    const reopened = task({ ...planned, revision: 5, work: { ...accepted.work!, execution: { ...accepted.work!.execution!, phase: 'cancelled' } } })
    const cancelled = teamProjectionView(replay([planned, running, submitted, accepted, reopened])).tasks[0]!
    expect(cancelled.result).toBeUndefined()
    expect(cancelled.work?.execution?.review).toEqual(review)
    expect(cancelled.validity.reusable).toBe(false)
  })

  it('refreshes task views when a running execution logs a tool effect', () => {
    const planned = task({ work: { plan: { revision: 1, plannerId: ROOT, goalRevision: 0,
      inputVersion: 'fixture-a', environmentVersion: 'local-v1', acceptanceCriteria: ['Inspect the fixture'] }, attempts: 0 } })
    const running = task({ ...planned, revision: 2, status: 'in_progress', ownerId: ROOT,
      work: { ...planned.work!, attempts: 1, execution: { id: TeamTaskExecutionId('task-1/run-1'), ownerId: ROOT,
        planRevision: 1, dependencies: [], phase: 'running', effectTracking: 'observed' } } })
    const state = project(ROOT, [
      event('team/task', { version: 2, teamId: TEAM, task: planned }, SessionSeq(1)),
      event('team/task', { version: 2, teamId: TEAM, task: running }, SessionSeq(2)),
    ])
    const endSeed = event('session/end-seed', {}, SessionSeq(3))
    expect(teamProjectionDefinition.apply(state, endSeed)).toBe(state)
    expect(project(ROOT, [
      event('team/task', { version: 2, teamId: TEAM, task: planned }, SessionSeq(1)),
      event('team/task', { version: 2, teamId: TEAM, task: running }, SessionSeq(2)), endSeed,
    ]).tasks[0]).toEqual(running)
    const before = teamProjectionView(state)
    expect(before.tasks[0]?.validity.reasons).not.toContain('Tool execution effects require independent review.')
    const afterState = teamProjectionDefinition.apply(state, event('team/task-effect', { version: 2, teamId: TEAM,
      taskId: running.id, executionId: running.work!.execution!.id, callId: ToolCallId('tool-1'),
      toolName: 'bash', phase: 'started' }, SessionSeq(4)))
    const after = teamProjectionView(afterState)
    expect(after).not.toBe(before)
    expect(after.tasks[0]?.validity.reasons).toContain('Tool execution effects require independent review.')
  })

  it('reconstructs confirmed goals and rejects absent, repeated, and forged reviews', () => {
    const proposal = {
      revision: 1, baseRevision: 0, proposedBy: ROOT,
      change: { kind: 'replace' as const, definition: { objective: 'Read local fixture', acceptanceCriteria: ['Report fixture findings'],
        scope: { coverage: 'task' as const, targets: ['fixture'], allowedActions: ['read'], excludedTargets: [], constraints: [] } } },
    }
    const proposed = event('team/goal-proposed', { version: 2, teamId: TEAM, proposal }, SessionSeq(1))
    const decided = event('team/goal-decided', { version: 2, teamId: TEAM,
      decision: { proposalRevision: 1, outcome: 'accepted', channel: 'user-question', comment: '', decidedAt: 1 } }, SessionSeq(2))
    const pending = project(ROOT, [proposed])
    const accepted = project(ROOT, [proposed, decided])
    expect(teamProjectionView(pending).goal).toBeUndefined()
    expect(teamProjectionView(accepted).goal).toMatchObject({ revision: 1, status: 'active', definition: proposal.change.definition })
    expect(teamProjectionView(accepted)).not.toBe(teamProjectionView(pending))
    expect(project(ROOT, [decided]).failure).toMatch(/absent proposal/)
    expect(project(ROOT, [proposed, decided, decided]).failure).toMatch(/already reviewed/)
    const forged = event('team/goal-proposed', { version: 2, teamId: TEAM, proposal: { ...proposal, proposedBy: CHILD } }, SessionSeq(1))
    expect(project(ROOT, [forged]).failure).toMatch(/only the Team Lead/)
    const invalid = event('team/goal-proposed', { version: 2, teamId: TEAM, proposal: {
      ...proposal, change: { ...proposal.change, definition: { ...proposal.change.definition, acceptanceCriteria: [] } },
    } }, SessionSeq(1))
    expect(project(ROOT, [invalid]).failure).toMatch(/payload is invalid/)
    const skipped = event('team/goal-proposed', { version: 2, teamId: TEAM, proposal: { ...proposal, revision: 3 } }, SessionSeq(1))
    expect(project(ROOT, [skipped]).failure).toMatch(/not contiguous/)
  })

  it('rejects duplicate expert bindings and changes to a bound profile revision', () => {
    const expert = { id: TeamExpertId('expert-a'), revision: 1, name: 'Expert A' }
    const initial = event('team/member', { version: 2, teamId: TEAM, member: member({ expert }) }, SessionSeq(1))
    const duplicate = event('team/member', {
      version: 2, teamId: TEAM, member: member({ id: SessionId('child-b'), name: 'worker-b', expert }),
    }, SessionSeq(2))
    expect(project(ROOT, [initial, duplicate]).failure).toMatch(/multiple members/)
    const changed = event('team/member', {
      version: 2, teamId: TEAM, member: member({ phase: 'active', expert: { ...expert, revision: 2 } }),
    }, SessionSeq(2))
    expect(project(ROOT, [initial, changed]).failure).toMatch(/immutable identity/)
    const active = event('team/member', {
      version: 2, teamId: TEAM, member: member({ phase: 'active', expert }),
    }, SessionSeq(2))
    expect(teamProjectionView(project(ROOT, [initial, active])).members[1]?.expert).toEqual(expert)
  })

  it('rejects retired tool-result content when restoring a native V4 Team checkpoint', async () => {
    const ctx = new Context()
    onTestFinished(() => ctx.fiber.dispose())
    await ctx.plugin(SessionStore)
    await ctx.plugin(SessionProjectionRegistry)
    ctx.effect(() => ctx.sessionProjections.register(teamProjectionDefinition))
    const session = ctx.sessions.create(ROOT)
    const restore = (val: unknown) => ctx.sessionProjections.restore({
      agentTeam: { ver: teamProjectionDefinition.stateVersion, seq: -1, val },
    }, [], SessionLogOffset(0), session.header, SessionLogOffset(0))
    const valid = { ...project(ROOT, []), messages: [message()] }
    expect(restore(JSON.parse(JSON.stringify(valid))).checkpoint['agentTeam']?.val).toEqual(valid)
    const retiredMessage = message({ content: [{
      type: 'tool-result', toolCallId: 'retired', content: [{ type: 'text', text: 'old result' }],
    }] as unknown as TeamMessageSnapshot['content'] })
    const retired = { ...valid, messages: [retiredMessage] }
    expect(() => restore(JSON.parse(JSON.stringify(retired)))).toThrow()
    expect(() => projectTeam(ROOT, [event('team/message/queued', {
      version: 2, teamId: TEAM, message: retiredMessage,
    }, SessionSeq(0))])).toThrow(/team\/message\/queued payload is invalid/)
  })

  it('projects current-team records independently from inherited records', () => {
    const records: SessionEvent[] = [
      event('team/member', { version: 2, teamId: TeamId('ancestor'), member: member() }, SessionSeq(0)),
      event('team/member', { version: 2, teamId: TEAM, member: member() }, SessionSeq(1)),
      event('team/member', {
        version: 2,
        teamId: TEAM,
        member: member({ phase: 'active' }),
      }, SessionSeq(2)),
      event('team/task', { version: 2, teamId: TEAM, task: task({ id: TeamTaskId('task-7') }) }, SessionSeq(3)),
      event('team/message/queued', { version: 2, teamId: TEAM, message: message() }, SessionSeq(4)),
    ]
    const projected = project(ROOT, records)
    const state = teamState(projected)

    expect(state).toMatchObject({ id: TEAM })
    expect(state.members).toHaveLength(1)
    expect(state.tasks).toHaveLength(1)
    expect(pending(state)).toHaveLength(1)
    expect(state.nextTaskNumber).toBe(8)
    expect(state.members.find(member => member.id === CHILD)?.name).toBe('worker-a')
    expect(teamProjectionDefinition.stateSchema.parse(JSON.parse(JSON.stringify(projected))))
      .toEqual(projected)
  })

  it('enforces teammate identity and lifecycle', () => {
    const base = event('team/member', { version: 2, teamId: TEAM, member: member() }, SessionSeq(0))
    expect(() => projectTeam(ROOT, [event('team/member', {
      version: 2,
      teamId: TEAM,
      member: member({ phase: 'active' }),
    }, SessionSeq(0))])).toThrow(/must begin provisioning/)
    expect(() => projectTeam(ROOT, [base, event('team/member', {
      version: 2,
      teamId: TEAM,
      member: member({ name: 'renamed', phase: 'active' }),
    }, SessionSeq(1))])).toThrow(/immutable identity/)
    expect(() => projectTeam(ROOT, [base, event('team/member', {
      version: 2,
      teamId: TEAM,
      member: member({ phase: 'active' }),
    }, SessionSeq(1)), event('team/member', {
      version: 2,
      teamId: TEAM,
      member: member({ phase: 'failed' }),
    }, SessionSeq(2))])).toThrow(/invalid active -> failed/)

    const duplicateName = member({ id: SessionId('child-b') })
    expect(() => projectTeam(ROOT, [base, event('team/member', {
      version: 2,
      teamId: TEAM,
      member: duplicateName,
    }, SessionSeq(1))])).toThrow(/name .* reused/)
  })

  it('reads a historical workspace-copy retry that changed its model route or creation context', () => {
    const initial = member({ modelProvider: 'first', model: 'first-model', reasoningEffort: 'max' })
    const failed = { ...initial, phase: 'failed' as const,
      error: 'Team workspace snapshot differs at 1 paths: logs/running.log. Wait for project writes to finish, then retry member creation.' }
    const retried = member({ ...initial, phase: 'provisioning', provider: 'fork', context: 'fork',
      modelProvider: 'second', model: 'second-model', reasoningEffort: 'high' })
    const records = [initial, failed, retried].map((value, index) =>
      event('team/member', { version: 2, teamId: TEAM, member: value }, SessionSeq(index)))
    expect(projectTeam(ROOT, records).members[0]).toMatchObject({
      phase: 'provisioning', provider: 'fork', modelProvider: 'second', model: 'second-model',
    })
    const active = event('team/member', { version: 2, teamId: TEAM,
      member: { ...retried, phase: 'active' } }, SessionSeq(3))
    expect(projectTeam(ROOT, [...records, active]).members[0]?.phase).toBe('active')
    const unrelatedFailure = event('team/member', { version: 2, teamId: TEAM,
      member: { ...failed, error: 'provider failed after child creation' } }, SessionSeq(1))
    expect(project(ROOT, [records[0]!, unrelatedFailure, records[2]!]).failure).toMatch(/immutable identity/)
  })

  it('enforces task revision continuity', () => {
    const first = event('team/task', { version: 2, teamId: TEAM, task: task() }, SessionSeq(0))
    expect(() => projectTeam(ROOT, [event('team/task', {
      version: 2,
      teamId: TEAM,
      task: task({ revision: 2 }),
    }, SessionSeq(0))])).toThrow(/begin at revision 1/)
    expect(() => projectTeam(ROOT, [first, event('team/task', {
      version: 2,
      teamId: TEAM,
      task: task({ revision: 3 }),
    }, SessionSeq(1))])).toThrow(/revision is not contiguous/)
  })

  it('rejects every invalid persisted task dependency relation', () => {
    const first = event('team/task', { version: 2, teamId: TEAM, task: task() }, SessionSeq(0))
    const second = event('team/task', {
      version: 2,
      teamId: TEAM,
      task: task({
        id: TeamTaskId('task-2'),
        blockedBy: [TeamTaskId('task-1')],
      }),
    }, SessionSeq(1))
    const invalid: Array<{ records: SessionEvent[]; message: RegExp }> = [
      {
        records: [event('team/task', {
          version: 2,
          teamId: TEAM,
          task: task({ blockedBy: [TeamTaskId('missing')] }),
        }, SessionSeq(0))],
        message: /blocker task "missing" .* is missing or deleted/,
      },
      {
        records: [event('team/task', {
          version: 2,
          teamId: TEAM,
          task: task({ blockedBy: [TeamTaskId('task-1')] }),
        }, SessionSeq(0))],
        message: /cannot block itself/,
      },
      {
        records: [first, event('team/task', {
          version: 2, teamId: TEAM,
          task: { ...task({ id: TeamTaskId('task-2') }), blockedBy: [TeamTaskId('task-1'), TeamTaskId('task-1')] },
        }, SessionSeq(1))],
        message: /repeats blocker/,
      },
      {
        records: [first, second, event('team/task', {
          version: 2,
          teamId: TEAM,
          task: task({ revision: 2, blockedBy: [TeamTaskId('task-2')] }),
        }, SessionSeq(2))],
        message: /dependency cycle/,
      },
      {
        records: [first, second, event('team/task', {
          version: 2,
          teamId: TEAM,
          task: task({ revision: 2, status: 'deleted' }),
        }, SessionSeq(2))],
        message: /blocker task "task-1" .* is missing or deleted/,
      },
    ]

    for (const { records, message: expected } of invalid) {
      expect(() => projectTeam(ROOT, records)).toThrow(expected)
    }
  })

  it('leaves numeric allocation unchanged for a branded nonstandard task id', () => {
    const state = projectTeam(ROOT, [event('team/task', {
      version: 2,
      teamId: TEAM,
      task: task({ id: TeamTaskId('external-task') }),
    }, SessionSeq(0))])
    expect(state.nextTaskNumber).toBe(1)
  })

  it('rejects a persisted numeric task id outside the safe integer range', () => {
    expect(() => projectTeam(ROOT, [event('team/task', {
      version: 2,
      teamId: TEAM,
      task: task({ id: TeamTaskId('task-9007199254740992') }),
    }, SessionSeq(0))])).toThrow(/persisted Agent Teams team\/task payload is invalid/)
  })

  it('enforces mailbox queue and acknowledgement relations', () => {
    const queued = event('team/message/queued', { version: 2, teamId: TEAM, message: message() }, SessionSeq(0))
    const delivered = event('team/message/delivered', {
      version: 2,
      teamId: TEAM,
      messageId: TeamMessageId('message-1'),
      targetId: CHILD,
    }, SessionSeq(1))
    expect(pending(projectTeam(ROOT, [queued, delivered]))).toEqual([])
    expect(() => projectTeam(ROOT, [queued, queued])).toThrow(/queued twice/)
    expect(() => projectTeam(ROOT, [delivered])).toThrow(/delivered before queueing/)
    expect(() => projectTeam(ROOT, [queued, event('team/message/delivered', {
      ...delivered.data,
      targetId: SessionId('other'),
    }, SessionSeq(1))])).toThrow(/target changed/)
    expect(() => projectTeam(ROOT, [queued, delivered, { ...delivered, seq: SessionSeq(2) }])).toThrow(/delivered twice/)
  })

  it('validates every current-version persisted payload before projecting it', () => {
    const malformed = [
      {
        ...event('team/member', { version: 2, teamId: TEAM, member: member() }, SessionSeq(0)),
        data: { version: 2, teamId: TEAM, member: { ...member(), name: 42 } },
      },
      {
        ...event('team/task', { version: 2, teamId: TEAM, task: task() }, SessionSeq(0)),
        data: { version: 2, teamId: TEAM, task: { ...task(), blockedBy: [42] } },
      },
      {
        ...event('team/message/queued', { version: 2, teamId: TEAM, message: message() }, SessionSeq(0)),
        data: {
          version: 2,
          teamId: TEAM,
          message: { ...message(), content: [{ type: 'text', text: 42 }] },
        },
      },
      {
        ...event('team/message/delivered', {
          version: 2,
          teamId: TEAM,
          messageId: TeamMessageId('message-1'),
          targetId: CHILD,
        }, SessionSeq(0)),
        data: {
          version: 2,
          teamId: TEAM,
          messageId: TeamMessageId('message-1'),
          targetId: 42,
        },
      },
      {
        ...event('team/member', { version: 2, teamId: TEAM, member: member() }, SessionSeq(0)),
        data: { version: 2, teamId: TEAM, member: member(), unexpected: true },
      },
      {
        ...event('team/task', { version: 2, teamId: TEAM, task: task() }, SessionSeq(0)),
        data: { version: 2, teamId: 42, task: task() },
      },
    ] as unknown as SessionEvent[]

    for (const candidate of malformed) {
      expect(() => projectTeam(ROOT, [candidate]))
        .toThrow(/persisted Agent Teams .* payload is invalid/)
    }
  })

  it('retains merge-extensible content blocks while rejecting malformed core variants', () => {
    const extension = { type: 'plugin/custom', payload: { value: 1 } } as never
    const state = projectTeam(ROOT, [event('team/message/queued', {
      version: 2,
      teamId: TEAM,
      message: message({ content: [extension] }),
    }, SessionSeq(0))])
    expect(pending(state)[0]?.content).toEqual([extension])
  })

  it('preserves opaque JSON through projection and checkpoints', () => {
    const extension = JSON.parse('{"type":"plugin/custom","__proto__":{"saved":true},"constructor":{"saved":false},"content":[{"__proto__":{"nested":true},"opaque":true}]}') as ContentBlock
    const content = [extension]
    const queued = event('team/message/queued', { version: 2, teamId: TEAM, message: message({ content }) }, SessionSeq(0))
    const before = JSON.stringify(queued)
    const projected = projectTeam(ROOT, [queued])
    expect(projected.messages[0]?.content).toEqual(content)
    const checkpoint = teamProjectionDefinition.stateSchema.parse(JSON.parse(JSON.stringify(projected)))
    expect(JSON.stringify(checkpoint)).toBe(JSON.stringify(projected))
    expect(JSON.stringify(queued)).toBe(before)
    const block = checkpoint.messages[0]!.content[0]!
    expect(Object.hasOwn(block, '__proto__')).toBe(true)
    expect(Object.getPrototypeOf(block)).toBe(Object.prototype)
  })

  it.each([
    null, [], 3,
    { type: '' },
    { type: null },
    { type: 'text', text: false },
  ])('rejects malformed content in events and checkpoints: %j', (block) => {
    const content: unknown = [block]
    const saved = message({ content: content as ContentBlock[] })
    const queued = event('team/message/queued', { version: 2, teamId: TEAM, message: saved }, SessionSeq(0))
    expect(() => projectTeam(ROOT, [queued])).toThrow(/team\/message\/queued payload is invalid/)
    expect(() => teamProjectionDefinition.stateSchema.parse({ ...project(ROOT, []), messages: [saved] })).toThrow()
  })

  it('rebuilds lossy version-3 Team checkpoints from the original log', async () => {
    const ctx = new Context()
    const registry = ctx.plugin(SessionProjectionRegistry)
    try {
      await registry
      ctx.sessionProjections.register(teamProjectionDefinition)
      const extension = JSON.parse('{"type":"plugin/custom","__proto__":{"saved":true}}') as ContentBlock
      const queued = event('team/message/queued', {
        version: 2, teamId: TEAM, message: message({ content: [extension] }),
      }, SessionSeq(0))
      const oldContent: unknown = [{ type: 'plugin/custom' }]
      const oldState = project(ROOT, [event('team/message/queued', {
        version: 2, teamId: TEAM, message: message({ content: oldContent as ContentBlock[] }),
      }, SessionSeq(0))])
      const restored = ctx.sessionProjections.restore(
        { agentTeam: { ver: 3, seq: SessionSeq(0), val: oldState } },
        [queued],
        SessionLogOffset(0),
        { version: SESSION_FORMAT_VERSION, id: ROOT, createdAt: 0, isSeeded: false },
        SessionLogOffset(0),
      )
      const state = teamProjectionDefinition.stateSchema.parse(restored.checkpoint['agentTeam']!.val)
      expect(state.messages[0]?.content).toEqual([extension])
    } finally {
      await registry.dispose()
    }
  })

  it('records unsupported event versions without applying them', () => {
    const invalid = event('team/task', {
      version: 1 as 2,
      teamId: TEAM,
      task: task(),
    }, SessionSeq(0))
    const later = event('team/task', {
      version: 2,
      teamId: TEAM,
      task: task(),
    }, SessionSeq(1))
    const state = project(ROOT, [invalid, later])
    expect(state.failure).toMatch(/unsupported Agent Teams event version 1/)
    expect(isEmptyState(state)).toBe(true)
  })

  it('isolates unsupported inherited Team records from the current Team', () => {
    const inherited = event('team/task', {
      version: 1 as 2,
      teamId: TeamId('ancestor'),
      task: task(),
    }, SessionSeq(0))
    const projected = project(ROOT, [inherited])
    expect(projected.failure).toBeUndefined()
    expect(isEmptyState(teamState(projected))).toBe(true)
  })

  it('ignores malformed current-version records inherited from another Team', () => {
    const inherited = {
      ...event('team/task', {
        version: 2,
        teamId: TeamId('ancestor'),
        task: task(),
      }, SessionSeq(0)),
      data: {
        version: 2,
        teamId: TeamId('ancestor'),
        task: { ...task(), subject: 42 },
      },
    } as unknown as SessionEvent
    expect(isEmptyState(projectTeam(ROOT, [inherited]))).toBe(true)
  })

  describe('copy-on-write state and client view', () => {
    const memberEvent = event('team/member', { version: 2, teamId: TEAM, member: member() }, SessionSeq(0))
    const taskEvent = event('team/task', { version: 2, teamId: TEAM, task: task() }, SessionSeq(1))
    const queuedEvent = event('team/message/queued', { version: 2, teamId: TEAM, message: message() }, SessionSeq(2))
    const deliveredEvent = event('team/message/delivered', {
      version: 2, teamId: TEAM, messageId: TeamMessageId('message-1'), targetId: CHILD,
    }, SessionSeq(3))

    it('returns the same state for unrelated events and a new state that replaces only the touched collection', () => {
      const initial = project(ROOT, [])
      expect(teamProjectionDefinition.apply(initial, { type: 'turn/start', data: { turn: 1 }, seq: 0, time: 0 } as SessionEvent)).toBe(initial)
      expect(teamProjectionDefinition.apply(initial, event('team/member', {
        version: 2, teamId: TeamId('ancestor'), member: member(),
      }, SessionSeq(0)))).toBe(initial)

      const withMember = teamProjectionDefinition.apply(initial, memberEvent)
      expect(withMember).not.toBe(initial)
      expect(initial.members).toEqual([])
      expect(withMember.members).toHaveLength(1)
      expect(withMember.tasks).toBe(initial.tasks)

      const withTask = teamProjectionDefinition.apply(withMember, taskEvent)
      expect(withTask.members).toBe(withMember.members)
      expect(withTask.tasks).not.toBe(withMember.tasks)
      expect(withMember.tasks).toEqual([])

      const withMail = teamProjectionDefinition.apply(withTask, queuedEvent)
      expect(withMail.members).toBe(withTask.members)
      expect(withMail.tasks).toBe(withTask.tasks)
      expect(withMail.messages).not.toBe(withTask.messages)
      expect(withTask.messages).toEqual([])

      const withReceipt = teamProjectionDefinition.apply(withMail, deliveredEvent)
      expect(withReceipt.delivered).not.toBe(withMail.delivered)
      expect(withMail.delivered).toEqual([])
      expect(teamProjectionDefinition.apply(withReceipt, { ...deliveredEvent, seq: SessionSeq(4) })).not.toBe(withReceipt)
    })

    it('enters failure through a new state that keeps the last valid collections', () => {
      const valid = project(ROOT, [memberEvent, taskEvent])
      const failed = teamProjectionDefinition.apply(valid, event('team/task', {
        version: 1 as 2, teamId: TEAM, task: task(),
      }, SessionSeq(2)))
      expect(failed).not.toBe(valid)
      expect(valid.failure).toBeUndefined()
      expect(failed.failure).toMatch(/unsupported Agent Teams event version 1/)
      expect(failed.members).toBe(valid.members)
      expect(failed.tasks).toBe(valid.tasks)
      expect(teamProjectionDefinition.apply(failed, queuedEvent)).toBe(failed)
    })

    it('views durable roster and non-deleted derived tasks and reuses the view across mailbox-only changes', () => {
      const activeMember = event('team/member', { version: 2, teamId: TEAM, member: member({ phase: 'active' }) }, SessionSeq(1))
      const claimed = event('team/task', {
        version: 2, teamId: TEAM, task: task({ revision: 2, status: 'in_progress', ownerId: CHILD, writeScopes: ['src'] }),
      }, SessionSeq(2))
      const blocked = event('team/task', {
        version: 2, teamId: TEAM, task: task({ id: TeamTaskId('task-2'), blockedBy: [TeamTaskId('task-1')], writeScopes: ['src/web'] }),
      }, SessionSeq(3))
      const leadOwned = event('team/task', {
        version: 2, teamId: TEAM, task: task({ id: TeamTaskId('task-3'), revision: 1, status: 'in_progress', ownerId: ROOT }),
      }, SessionSeq(4))
      const deleted = event('team/task', {
        version: 2, teamId: TEAM, task: task({ id: TeamTaskId('task-3'), revision: 2, status: 'deleted', ownerId: ROOT }),
      }, SessionSeq(5))
      const state = project(ROOT, [memberEvent, activeMember, taskEvent, claimed, blocked, leadOwned, deleted])
      const view = teamProjectionView(state)
      expect(teamProjectionDefinition.wire.viewSchema.parse(view)).toEqual(view)
      expect(view).toEqual({
        completedTaskCount: 0,
        members: [
          { id: ROOT, name: 'lead', role: 'lead', phase: 'active' },
          { id: CHILD, name: 'worker-a', role: 'teammate', phase: 'active', description: 'worker' },
        ],
        tasks: [
          {
            id: 'task-1', revision: 2, subject: 'subject', description: 'description', status: 'in_progress',
            validity: { reusable: false, reasons: ['This task has no versioned plan or independent review.',
              'This result has no host-observed input, environment, and artifact receipts.', 'This task is not completed.'] },
            blockedBy: [], writeScopes: ['src'], ownerName: 'worker-a', ready: false, writeScopeWarnings: [],
          },
          {
            id: 'task-2', revision: 1, subject: 'subject', description: 'description', status: 'pending',
            validity: { reusable: false, reasons: ['This task has no versioned plan or independent review.',
              'This result has no host-observed input, environment, and artifact receipts.', 'This task is not completed.'] },
            blockedBy: ['task-1'], writeScopes: ['src/web'], ready: false, dispatchBlocker: 'dependencies', writeScopeWarnings: ['write scopes overlap with task-1'],
          },
        ],
      })
      expect(view).not.toHaveProperty('failure')
      expect(teamProjectionView(state)).toBe(view)

      const withMail = teamProjectionDefinition.apply(state, { ...queuedEvent, seq: SessionSeq(6) })
      expect(teamProjectionView(withMail)).toBe(view)
      const withMember = teamProjectionDefinition.apply(withMail, event('team/member', {
        version: 2, teamId: TEAM, member: member({ id: SessionId('child-b'), name: 'worker-b' }),
      }, SessionSeq(7)))
      const memberView = teamProjectionView(withMember)
      expect(memberView).not.toBe(view)
      expect(memberView.members.at(-1)).toEqual({
        id: 'child-b', name: 'worker-b', role: 'teammate', phase: 'provisioning', description: 'worker',
      })

      const failedMember = event('team/member', {
        version: 2, teamId: TEAM, member: member({ id: SessionId('child-b'), name: 'worker-b', phase: 'failed', error: 'provider failed' }),
      }, SessionSeq(8))
      expect(teamProjectionView(teamProjectionDefinition.apply(withMember, failedMember)).members.at(-1))
        .toMatchObject({ phase: 'failed', error: 'provider failed' })
    })

    it('publishes the failure with the last valid roster and tasks', () => {
      const state = project(ROOT, [memberEvent, taskEvent, event('team/task', {
        version: 1 as 2, teamId: TEAM, task: task(),
      }, SessionSeq(2))])
      const view = teamProjectionView(state)
      expect(view.failure).toMatch(/unsupported Agent Teams event version 1/)
      expect(view.members).toHaveLength(2)
      expect(view.tasks).toHaveLength(1)
      expect(teamProjectionDefinition.wire.viewSchema.parse(view)).toEqual(view)
    })

    it('drives live agentTeam publications per Session through the projection registry', async () => {
      const ctx = new Context()
      onTestFinished(() => ctx.fiber.dispose())
      await ctx.plugin(SessionStore)
      await ctx.plugin(SessionProjectionRegistry)
      ctx.effect(() => ctx.sessionProjections.register(teamProjectionDefinition))
      const published: Array<{ session: SessionId; key: string; value: unknown }> = []
      ctx.sessionProjections.onChanged((session, key, value) => {
        published.push({ session: session.id, key, value })
      })
      const lead = ctx.sessions.create(ROOT)
      const other = ctx.sessions.create(SessionId('other-root'))
      expect(ctx.sessionProjections.snapshot(lead).values['agentTeam']).toEqual({
        completedTaskCount: 0,
        members: [{ id: ROOT, name: 'lead', role: 'lead', phase: 'active' }],
        tasks: [],
      })

      lead.append('team/task', taskEvent.data)
      expect(published).toHaveLength(1)
      expect(published[0]).toMatchObject({
        session: ROOT,
        key: 'agentTeam',
        value: { tasks: [{ id: 'task-1', ready: true }] },
      })

      lead.append('team/message/queued', queuedEvent.data)
      lead.append('turn/start', { turn: 1 })
      expect(published).toHaveLength(1)

      other.append('team/task', { version: 2, teamId: TeamId(other.id), task: task() })
      expect(published).toHaveLength(2)
      expect(published[1]).toMatchObject({
        session: other.id,
        value: { members: [{ id: other.id, name: 'lead', role: 'lead', phase: 'active' }] },
      })
      expect(ctx.sessionProjections.snapshot(lead).values['agentTeam']).toMatchObject({
        tasks: [{ id: 'task-1' }],
      })
    })
  })
})
