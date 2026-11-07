import { recordedTeamEvents } from './recorded-events.ts'
import { mountTeamTestSubagents } from './subagent-fixture.ts'
/** Goal review, revision cancellation, and recovery through real Team services. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import * as JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import * as SubagentSpawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
import SandboxPolicyService from '@deepseek-ai/dsh-sandbox-policy'
import LocalSandboxProvider from '@deepseek-ai/dsh-sandbox-local'
import SandboxedFileSystem from '@deepseek-ai/dsh-fs-sandbox'
import UserQuestions from '@deepseek-ai/dsh-user-questions'
import WebRuntime from '@deepseek-ai/dsh-web'
import type { AskUserQuestionAnswer, AskUserQuestionRequest } from '@deepseek-ai/dsh-user-questions'
import { defineContentToolFixture, defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolExecutionToken } from '@deepseek-ai/dsh-tools'
import TeamService from '../src/index.ts'
import type { Config, TeamGoalChange, TeamGoalDefinition, TeamMemberFunction } from '../src/types.ts'
import { ControlledAdapter } from './controlled-adapter.ts'
import { TestSessionQuery } from './test-session-query.ts'
import { memberExecutionScope, workspaceCopyPaths, executionScopeDenial } from '../src/execution-scope.ts'
import { renderGoalReview } from '../src/goal-review-text.ts'

const contexts = new Set<Context>()
const roots: string[] = []
const signal = new AbortController().signal
const definition: TeamGoalDefinition = {
  objective: 'Analyze the local protocol fixture', acceptanceCriteria: ['Reproduce the fixture response from recorded inputs'],
  scope: { coverage: 'task', targets: ['local fixture'], allowedActions: ['read the supplied fixture'],
    excludedTargets: ['external services'], constraints: ['preserve source files'] },
}

it('shows the complete saved member and model plan in the human review', () => {
  const plan = 'lead: V4 Pro/off communicates; reviewer: GLM-5.3/max checks the evidence.'
  const review = renderGoalReview({ revision: 1, baseRevision: 0, proposedBy: SessionId('lead'),
    change: { kind: 'replace', definition: { ...definition, plan } } }, undefined)
  expect(review).toContain('Complete Team plan')
  expect(review).toContain('GLM\\-5\\.3/max')
})

afterEach(async () => {
  for (const ctx of contexts) await ctx.fiber.dispose()
  contexts.clear()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

async function setup(existingRoot?: string, requireExecutionScope = false, teamConfig: Config = {}) {
  const ctx = new Context()
  contexts.add(ctx)
  const root = existingRoot ?? mkdtempSync(join(tmpdir(), 'dsh-team-goal-'))
  if (existingRoot === undefined) roots.push(root)
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(JsonlSessionPersistence, { root })
  await ctx.plugin(TestSessionQuery)
  await ctx.plugin(AgentLoop, { agents: [] })
  await mountTeamTestSubagents(ctx)
  await ctx.plugin(SubagentSpawn, { providerName: 'spawn' })
  await ctx.plugin(UserQuestions)
  await ctx.plugin(TeamService, { portableEventEnvelope: true, requireConfirmedGoal: true, requireExecutionScope,
    maxDepth: 2, maxConcurrentRequestsPerTeam: 2, ...teamConfig })
  const adapter = new ControlledAdapter()
  ctx.llm.registerAdapter(['mock'], adapter)
  const lead = existingRoot === undefined
    ? await ctx.agentLoop.create(SessionId('goal-lead'), { provider: 'mock', model: 'lead' }, { cwd: root })
    : (await ctx.agents.resume({ resumeSessionId: SessionId('goal-lead'), agentOptions: { provider: 'mock', model: 'lead' } })).agent
  // Completion notices must not create unrelated Lead model requests in these cases.
  ctx.on('agent/pre-step', async (event, next) => event.agent === lead ? { kind: 'reject' } : next())
  return { ctx, lead, adapter, root }
}

function spawn(ctx: Context, caller: Agent, name: string, teamFunction?: TeamMemberFunction) {
  return ctx.agentTeams.spawnTeammate(caller, { name, description: name, provider: 'spawn', context: 'fresh', signal,
    ...teamFunction === undefined ? {} : { teamFunction },
    prompt: [{ type: 'text', text: 'Read the assigned local fixture.' }], agentOptions: { provider: 'mock', model: 'worker' } })
}

function propose(ctx: Context, lead: Agent, change: TeamGoalChange = { kind: 'replace', definition }) {
  const state = ctx.agentTeams.getGoal(lead)
  return ctx.agentTeams.proposeGoal(lead, { expectedProposalRevision: state.goalProposal?.revision ?? 0,
    expectedGoalRevision: state.goal?.revision ?? 0, change }, signal)
}

function approved(request: AskUserQuestionRequest): AskUserQuestionAnswer {
  return { answers: request.questions.map(question => ({ id: question.id, selected: [question.intent!.approve] })) }
}

function answerer(
  ctx: Context,
  handler: (request: AskUserQuestionRequest) => Promise<AskUserQuestionAnswer> = async request => approved(request),
) {
  return ctx.on('user-questions/request', handler)
}

async function drainTaskDispatch(ctx: Context): Promise<void> {
  await Promise.resolve()
  const runs = Reflect.get(ctx.agentTeams, 'taskDispatchRuns') as Map<SessionId, Promise<void>>
  await Promise.all([...runs.values()])
}

async function confirm(ctx: Context, lead: Agent, change?: TeamGoalChange) {
  const proposal = await propose(ctx, lead, change)
  return await ctx.agentTeams.reviewGoal(lead, proposal.revision, signal)
}

function automaticDeliveryPlan() {
  const common = { parent: 'lead', modelProvider: 'mock', model: 'worker', reasoningEffort: 'high',
    responsibility: 'Inspect the synthetic fixture', skills: ['team-fixture'] }
  return { format: 'dsh-team-project-plan', version: 2, automation: { provision: 'on-demand', requirePlanningGate: false },
    members: [{ ...common, name: 'planner', function: 'planning_adviser' }, { ...common, name: 'quality', function: 'quality_adviser' },
      { ...common, name: 'worker', function: 'executor' }, { ...common, name: 'verifier', function: 'verifier' }],
    tasks: [{ id: 'delivery-v1', owner: 'worker', reviewer: 'verifier', description: 'Check the final fixture', kind: 'delivery',
      dependencies: [], inputs: [], outputs: [], acceptanceCriteria: ['Fixture checked'], critical: true }],
    resources: { maxMembers: 4, maxConcurrentRequests: 4 }, reviewPolicy: 'independent-and-dual-for-critical', previousTasks: [],
    recovery: 'Keep receipts and resume the same member' }
}

function fixtureSkills(ctx: Context) {
  const content = 'Inspect the supplied synthetic fixture.'
  ctx.on('team/resolve-skill', async ({ name }) => ({ name, content, digest: createHash('sha256').update(content).digest('hex') }))
}

describe('user-reviewed Team goals', () => {
  it('continues an inactive delivered execution after a user turn without changing its identity or duplicating an active resume', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false, { requireStructuredPlans: true,
      autoProvisionPlannedMembers: true, autoAssignReadyTasks: true, autoDispatchReadyTasks: true,
      resumeIncompleteOnUserContinue: true, maxMembers: 8, maxConcurrentRequestsPerTeam: 8 })
    fixtureSkills(ctx); answerer(ctx)
    await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, plan: JSON.stringify(automaticDeliveryPlan()) } })
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(4) })
    for (const call of adapter.calls) call.release()
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(5) })
    const original = ctx.agentTeams.listTasks(lead)[0]!
    const execution = original.work!.execution!
    adapter.calls[4]!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(execution.ownerId!)).toBeUndefined() })
    lead.followup(createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text: 'Continue the same approved project' }] }))
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(6) })
    expect(adapter.calls[5]!.options.sessionId).toBe(execution.ownerId)
    const resumed = ctx.agentTeams.getTask(lead, original.id)
    expect(resumed.work?.execution?.id).toBe(execution.id)
    expect(resumed.work?.attempts).toBe(1)
    lead.followup(createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text: 'Continue without duplicating active work' }] }))
    await drainTaskDispatch(ctx)
    expect(adapter.calls).toHaveLength(6)
    expect(recordedTeamEvents(lead.session.snapshotEvents()).filter(event => event.type === 'team/message/queued'
      && event.data.message.id.startsWith('team-message-continue-'))).toHaveLength(1)
    adapter.calls[5]!.release()
  })

  it('logs one host diagnostic when automatic member creation fails while keeping model self-messages forbidden', async () => {
    const { ctx, lead } = await setup(undefined, false, { requireStructuredPlans: true,
      autoProvisionPlannedMembers: true, autoAssignReadyTasks: true, autoDispatchReadyTasks: true,
      maxMembers: 8, maxConcurrentRequestsPerTeam: 8 })
    fixtureSkills(ctx); answerer(ctx)
    const failure = vi.spyOn(TeamService.prototype, 'spawnTeammate').mockRejectedValue(new Error('QA_PROVISION_FAILURE'))
    try {
      await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, plan: JSON.stringify(automaticDeliveryPlan()) } })
      await vi.waitFor(() => {
        const notices = recordedTeamEvents(lead.session.snapshotEvents()).filter(event => event.type === 'team/message/queued'
          && event.data.message.id.startsWith('team-message-dispatch-failure-'))
        expect(notices).toHaveLength(1)
      })
      await drainTaskDispatch(ctx)
      await expect(ctx.agentTeams.sendMessage(lead, { target: 'lead', content: [{ type: 'text', text: 'Not a host notice' }], signal }))
        .rejects.toMatchObject({ code: 'TEAM_SELF_MESSAGE' })
      expect(ctx.agentTeams.listMembers(lead)).toHaveLength(1)
    } finally { failure.mockRestore() }
  })
  it('notifies the communicator only after the complete plan passes dual and independent review', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false, { requireStructuredPlans: true,
      autoProvisionPlannedMembers: true, autoAssignReadyTasks: true, autoDispatchReadyTasks: true, finalDelivery: 'publish-and-notify',
      maxMembers: 8, maxConcurrentRequestsPerTeam: 8 })
    fixtureSkills(ctx); answerer(ctx)
    await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, plan: JSON.stringify(automaticDeliveryPlan()) } })
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(4) })
    for (const call of adapter.calls) call.release()
    await vi.waitFor(() => { expect(ctx.agentTeams.listTasks(lead)[0]?.status).toBe('in_progress') })
    const task = ctx.agentTeams.listTasks(lead)[0]!
    const execution = task.work!.execution!
    await vi.waitFor(() => { expect(ctx.agents.get(execution.ownerId!)).toBeDefined() })
    const submission = await ctx.agentTeams.updateTask(ctx.agents.get(execution.ownerId!)!, { taskId: task.id,
      expectedRevision: task.revision, action: 'complete', executionId: execution.id,
      result: 'Fixture checked', evidence: ['Synthetic comparison'], sideEffects: 'none' }, signal)
    adapter.calls.findLast(call => call.options.sessionId === execution.ownerId)!.release()
    const notices = () => recordedTeamEvents(lead.session.snapshotEvents()).filter(event => event.type === 'team/message/queued'
      && event.data.message.id.startsWith('team-message-complete-'))
    expect(notices()).toHaveLength(0)
    for (const name of ['planner', 'quality']) {
      const id = ctx.agentTeams.listMembers(lead).find(member => member.name === name)!.id
      await vi.waitFor(() => { expect(ctx.agents.get(id)).toBeDefined() })
      await ctx.agentTeams.recordAdviserDecision(ctx.agents.get(id)!, { taskId: task.id, executionId: execution.id,
        decision: 'approve', summary: 'Independent decision', evidence: ['Synthetic comparison'] }, signal)
      adapter.calls.findLast(call => call.options.sessionId === id)!.release()
    }
    expect(notices()).toHaveLength(0)
    const reviewer = ctx.agentTeams.listMembers(lead).find(member => member.name === 'verifier')!.id
    await vi.waitFor(() => { expect(ctx.agents.get(reviewer)).toBeDefined() })
    await ctx.agentTeams.updateTask(ctx.agents.get(reviewer)!, { taskId: task.id, expectedRevision: submission.revision,
      action: 'review', executionId: execution.id, reviewDecision: 'accepted', reviewSummary: 'Fixture checked',
      reviewEvidence: ['Checked the exact submission'] }, signal)
    adapter.calls.findLast(call => call.options.sessionId === reviewer)!.release()
    await vi.waitFor(() => { expect(notices()).toHaveLength(1) })
    await drainTaskDispatch(ctx)
    expect(notices()).toHaveLength(1)
    const notice = notices()[0]!
    if (notice.type !== 'team/message/queued') throw new Error('Missing recorded delivery notice')
    expect(notice.data.message.content).toMatchSnapshot()
  })
  it('provisions an approved hierarchy, gates execution on two advisers and retains members on subsequent dispatch', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false, { requireStructuredPlans: true, filterToolsByGoal: true,
      autoProvisionPlannedMembers: true, autoAssignReadyTasks: true, autoDispatchReadyTasks: true,
      maxMembers: 8, maxConcurrentRequestsPerTeam: 8 })
    const content = 'Use the supplied synthetic task and record evidence.'
    ctx.on('team/resolve-skill', async ({ name }) => ({ name, content, digest: createHash('sha256').update(content).digest('hex') }))
    answerer(ctx)
    const common = { parent: 'lead', modelProvider: 'mock', model: 'worker', reasoningEffort: 'high',
      responsibility: 'Synthetic verification', skills: ['team-fixture'] }
    const task = { owner: 'group', reviewer: 'verifier', description: 'Inspect the approved fixture plan',
      inputs: [], outputs: [], acceptanceCriteria: ['Fixture checked'], critical: true }
    const plan = { format: 'dsh-team-project-plan', version: 2,
      automation: { provision: 'on-demand', requirePlanningGate: true },
      members: [{ ...common, name: 'planner', function: 'planning_adviser' },
        { ...common, name: 'quality', function: 'quality_adviser' },
        { ...common, name: 'group', function: 'group_lead', instructions: 'GROUP_ONLY_CONTROLLED_TOKEN' },
        { ...common, name: 'verifier', function: 'verifier' },
        { ...common, parent: 'group', name: 'descendant', function: 'executor', instructions: 'DESCENDANT_ONLY_CONTROLLED_TOKEN' }],
      tasks: [{ ...task, id: 'plan', kind: 'plan', dependencies: [] },
        { ...task, id: 'delivery', owner: 'descendant', kind: 'delivery', dependencies: ['plan'], exclusiveResources: ['browser:fixture'] },
        { ...task, id: 'parallel', kind: 'execution', critical: false, dependencies: ['plan'], exclusiveResources: ['browser:fixture'] }],
      resources: { maxMembers: 8, maxConcurrentRequests: 8 }, reviewPolicy: 'independent-and-dual-for-critical',
      previousTasks: [], recovery: 'Resume the retained execution after checking receipts' }
    await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, plan: JSON.stringify(plan) } })
    await vi.waitFor(() => { expect(ctx.agentTeams.listMembers(lead)).toHaveLength(5) })
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(4) })
    expect(ctx.agentTeams.listMembers(lead).some(member => member.name === 'descendant')).toBe(false)
    for (const call of adapter.calls) call.release()
    await vi.waitFor(() => { expect(ctx.agentTeams.listTasks(lead)[0]?.status).toBe('in_progress') })
    const running = ctx.agentTeams.listTasks(lead)[0]!
    await vi.waitFor(() => { expect(ctx.agents.get(running.work!.execution!.ownerId!)).toBeDefined() })
    const submitted = await ctx.agentTeams.updateTask(ctx.agents.get(running.work!.execution!.ownerId!)!, {
      taskId: running.id, expectedRevision: running.revision, action: 'complete',
      executionId: running.work!.execution!.id, result: 'Fixture checked', evidence: ['Synthetic comparison'], sideEffects: 'none',
    }, signal)
    adapter.calls.findLast(call => call.options.sessionId === running.work!.execution!.ownerId)!.release()
    for (const name of ['planner', 'quality']) {
      const id = ctx.agentTeams.listMembers(lead).find(member => member.name === name)!.id
      await vi.waitFor(() => { expect(ctx.agents.get(id)).toBeDefined() })
      await ctx.agentTeams.recordAdviserDecision(ctx.agents.get(id)!, { taskId: running.id,
        executionId: running.work!.execution!.id, decision: 'approve', summary: 'Checked the plan independently',
        evidence: [`${name} checked the fixture`] }, signal)
      adapter.calls.findLast(call => call.options.sessionId === id)!.release()
    }
    const verifier = ctx.agentTeams.listMembers(lead).find(member => member.name === 'verifier')!.id
    await vi.waitFor(() => { expect(ctx.agents.get(verifier)).toBeDefined() })
    expect(ctx.agentTeams.listTasks(lead)).toHaveLength(1)
    await ctx.agentTeams.updateTask(ctx.agents.get(verifier)!, { taskId: running.id,
      expectedRevision: submitted.revision, action: 'review', executionId: running.work!.execution!.id,
      reviewDecision: 'accepted', reviewSummary: 'Independently verified', reviewEvidence: ['Fixture verified'] }, signal)
    adapter.calls.findLast(call => call.options.sessionId === verifier)!.release()
    await vi.waitFor(() => { expect(ctx.agentTeams.listMembers(lead)).toHaveLength(6) })
    await vi.waitFor(() => { expect(ctx.agentTeams.listTasks(lead).some(task => task.inputKey === 'delivery')).toBe(true) })
    await vi.waitFor(() => {
      const work = ctx.agentTeams.listTasks(lead)
      const owners = new Set(work.filter(task => task.status === 'in_progress').map(task => task.work!.execution!.ownerId))
      for (const call of adapter.calls) if (!owners.has(call.options.sessionId!)) call.release()
      expect(work).toHaveLength(2)
      expect(work.filter(task => task.status === 'in_progress')).toHaveLength(1)
      expect(work.find(task => task.status === 'pending')?.writeScopeWarnings.join(' ')).toContain('exclusive resource')
    })
    const waiting = ctx.agentTeams.listTasks(lead).find(task => task.status === 'pending')!
    expect(waiting.ready).toBe(false)
    await expect(ctx.agentTeams.updateTask(lead, { taskId: waiting.id, expectedRevision: waiting.revision,
      action: 'reassign', owner: waiting.inputKey === 'delivery' ? 'descendant' : 'group' }, signal)).rejects.toMatchObject({ code: 'TEAM_TASK_RESOURCE_BUSY' })
    let writes = 0
    ctx.tools.register(defineContentToolFixture({ name: 'write', description: 'Fixture mutation', parameters: {}, execute: async () => { writes++; return [] } }))
    const denied = await ctx.tools.execute({ name: 'write', arguments: {}, agent: lead, callId: ToolCallId('v5-lead-execution'), signal })
    expect(denied.isError).toBe(true)
    expect(writes).toBe(0)
    const roster = ctx.agentTeams.listMembers(lead)
    expect(roster.find(member => member.name === 'descendant')?.parentId).toBe(running.work!.execution!.ownerId)
    const child = roster.find(member => member.name === 'descendant')!
    await vi.waitFor(() => { expect(adapter.calls.some(call => call.options.sessionId === child.id)).toBe(true) })
    const childRequest = adapter.calls.find(call => call.options.sessionId === child.id)!.options
    expect(JSON.stringify(childRequest.messages)).toContain('DESCENDANT_ONLY_CONTROLLED_TOKEN')
    expect(JSON.stringify(childRequest.messages)).not.toContain('GROUP_ONLY_CONTROLLED_TOKEN')
    await drainTaskDispatch(ctx)
    expect(ctx.agentTeams.listMembers(lead).map(member => member.id)).toEqual(roster.map(member => member.id))
    expect(ctx.agentTeams.listTasks(lead).filter(task => task.inputKey === 'delivery')).toHaveLength(1)
    for (const call of adapter.calls) call.release()
  }, 20000)
  it('reports stale work and explicitly rebinds pinned skills without changing the task or its authorization', async () => {
    const { ctx, lead, adapter } = await setup()
    answerer(ctx)
    await confirm(ctx, lead)
    const saved = await spawn(ctx, lead, 'pinned-skills')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    adapter.calls[0]!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(saved.member.id)).toBeUndefined() })
    const content = 'Inspect the assigned local fixture only.\n'
    const digest = createHash('sha256').update(content).digest('hex')
    await ctx.agentTeams.selectSkills(lead, { member: 'pinned-skills', expectedRevision: 0,
      skills: [{ name: 'team-specialized', digest, purpose: 'Inspect fixture', content }] }, signal)
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Retained plan', description: 'Inspect fixture',
      plan: { inputVersion: 'v1', environmentVersion: 'local', acceptanceCriteria: ['Check fixture'] } })
    await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, plan: 'Review the existing fixture first.' } })
    expect(ctx.agentTeams.recoverySummary(lead, 1)).toMatchObject({ goalRevision: 2, staleSkillSelections: 1,
      membersWithoutRole: 1, issues: [{ taskId: task.id, blocker: 'goal' }] })
    await expect(ctx.agentTeams.rebindSkills(lead, 'pinned-skills', 0, signal))
      .rejects.toMatchObject({ code: 'TEAM_SKILLS_STALE_REVISION' })
    const rebound = await ctx.agentTeams.rebindSkills(lead, 'pinned-skills', 1, signal)
    expect(rebound).toMatchObject({ revision: 2, goalRevision: 2, active: true, skills: [{ digest }] })
    expect(ctx.agentTeams.getTask(lead, task.id).work).toEqual(task.work)
    expect(ctx.agentTeams.getTask(lead, task.id).dispatchBlocker).toBe('goal')
    expect(adapter.calls).toHaveLength(1)
    expect(ctx.agentTeams.recoverySummary(lead, 1).staleSkillSelections).toBe(0)
    expect(() => ctx.agentTeams.recoverySummary(lead, 51)).toThrow('1 through 50')
    expect(() => ctx.agentTeams.recoverySummary(lead, 1, 'missing')).toThrow('first page')
  })

  it('configures a legacy responsibility in place, fences stale edits, and restores it after restart', async () => {
    const { ctx, lead, adapter, root } = await setup()
    answerer(ctx)
    await confirm(ctx, lead)
    const existing = await spawn(ctx, lead, 'retained-adviser')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    const request = { target: 'retained-adviser', expectedRevision: 0,
      teamFunction: 'quality_adviser' as const, reason: 'Independently review the confirmed plan' }
    await expect(ctx.agentTeams.configureMemberRole(lead, request, signal))
      .rejects.toMatchObject({ code: 'TEAM_MEMBER_NOT_READY' })
    adapter.calls[0]!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(existing.member.id)).toBeUndefined() })
    const configured = await ctx.agentTeams.configureMemberRole(lead, request, signal)
    expect(configured).toMatchObject({ id: existing.member.id, name: 'retained-adviser',
      teamFunction: 'quality_adviser', roleRevision: 1, status: 'inactive' })
    expect(adapter.calls).toHaveLength(1)
    await expect(ctx.agentTeams.configureMemberRole(lead, request, signal))
      .rejects.toMatchObject({ code: 'TEAM_MEMBER_STALE_REVISION' })
    expect(JSON.stringify(ctx.sessionProjections.snapshot(lead.session, ['agentTeam']).values.agentTeam))
      .toContain('"roleRevision":1')
    await ctx.fiber.dispose()
    contexts.delete(ctx)
    const restored = await setup(root)
    expect(restored.ctx.agentTeams.listMembers(restored.lead).find(member => member.id === existing.member.id))
      .toMatchObject({ teamFunction: 'quality_adviser', roleRevision: 1 })
    expect(restored.adapter.calls).toHaveLength(0)
  })

  it('wakes an idle legacy member when the last missing skill is selected', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false, {
      autoAssignReadyTasks: true, autoDispatchReadyTasks: true,
    })
    answerer(ctx)
    await confirm(ctx, lead)
    const old = await spawn(ctx, lead, 'skill-later')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    adapter.calls[0]!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(old.member.id)).toBeUndefined() })
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Needs module', description: 'Use existing member.',
      requiredSkill: 'team-specialized',
      plan: { inputVersion: 'v1', environmentVersion: 'local', acceptanceCriteria: ['Observe fixture'] } })
    await drainTaskDispatch(ctx)
    expect(ctx.agentTeams.getTask(lead, task.id).ownerName).toBeUndefined()
    const content = 'Inspect the local fixture.\n'
    const selection = { member: 'skill-later', expectedRevision: 0,
      skills: [{ name: 'team-specialized', digest: createHash('sha256').update(content).digest('hex'),
        purpose: 'Inspect fixture', content }] }
    await ctx.agentTeams.selectSkills(lead, selection, signal)
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    expect(ctx.agentTeams.getTask(lead, task.id).ownerName).toBe('skill-later')
    await drainTaskDispatch(ctx)
    expect(adapter.calls).toHaveLength(2)
    expect(ctx.agentTeams.listMessages(lead).filter(message => message.id.startsWith('team-message-task-'))).toHaveLength(1)
    adapter.calls[1]!.release()
  })
  it('routes an existing submission to a new independent reviewer without another attempt', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false, { autoDispatchReadyTasks: true })
    answerer(ctx)
    await confirm(ctx, lead)
    const reviewer = await spawn(ctx, lead, 'late-reviewer', 'verifier')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    adapter.calls[0]!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(reviewer.member.id)).toBeUndefined() })
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Retained submission', description: 'Local observation',
      plan: { inputVersion: 'v1', environmentVersion: 'local', acceptanceCriteria: ['Check fixture'] } })
    const running = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: task.revision, action: 'claim' }, signal)
    const submitted = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: running.revision,
      action: 'complete', executionId: running.work!.execution!.id, result: 'Fixture observed', evidence: ['Fixture output'], sideEffects: 'none' }, signal)
    await expect(ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: submitted.revision,
      action: 'configure_review', reviewer: 'lead' }, signal)).rejects.toMatchObject({ code: 'TEAM_TASK_SELF_REVIEW' })
    const assigned = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: submitted.revision,
      action: 'configure_review', reviewer: 'late-reviewer' }, signal)
    expect(assigned.work).toEqual(submitted.work)
    expect(assigned.reviewerName).toBe('late-reviewer')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    const executing = ctx.agents.get(reviewer.member.id)!
    await expect(ctx.agentTeams.updateTask(executing, { taskId: task.id, expectedRevision: assigned.revision,
      action: 'configure_review', reviewer: 'lead' }, signal)).rejects.toMatchObject({ code: 'TEAM_LEAD_REQUIRED' })
    await expect(ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: submitted.revision,
      action: 'configure_review', reviewer: 'late-reviewer' }, signal)).rejects.toMatchObject({ code: 'TEAM_TASK_STALE_REVISION' })
    const accepted = await ctx.agentTeams.updateTask(executing, { taskId: task.id, expectedRevision: assigned.revision,
      action: 'review', executionId: assigned.work!.execution!.id, reviewDecision: 'accepted',
      reviewSummary: 'Independently checked fixture', reviewEvidence: ['Fixture check'] }, signal)
    expect(accepted.status).toBe('completed')
    expect(accepted.work!.attempts).toBe(1)
    adapter.calls[1]!.release()
  })

  it('routes a historical manual submission after restart without rerunning its executor', async () => {
    const original = await setup()
    answerer(original.ctx)
    await confirm(original.ctx, original.lead)
    await spawn(original.ctx, original.lead, 'historical-reviewer', 'verifier')
    await vi.waitFor(() => { expect(original.adapter.calls).toHaveLength(1) })
    original.adapter.calls[0]!.release()
    await original.adapter.calls[0]!.finished
    const task = await original.ctx.agentTeams.createTask(original.lead, { subject: 'Historical submission', description: 'Local fixture',
      plan: { inputVersion: 'v1', environmentVersion: 'local', acceptanceCriteria: ['Check saved observation'] } })
    const running = await original.ctx.agentTeams.updateTask(original.lead, { taskId: task.id, expectedRevision: task.revision, action: 'claim' }, signal)
    const submitted = await original.ctx.agentTeams.updateTask(original.lead, { taskId: task.id, expectedRevision: running.revision,
      action: 'complete', executionId: running.work!.execution!.id, result: 'Saved observation', evidence: ['Observed fixture'], sideEffects: 'none' }, signal)
    await original.ctx.fiber.dispose()
    contexts.delete(original.ctx)
    const resumed = await setup(original.root, false, { autoDispatchReadyTasks: true })
    expect(resumed.adapter.calls).toHaveLength(0)
    const assigned = await resumed.ctx.agentTeams.updateTask(resumed.lead, { taskId: task.id, expectedRevision: submitted.revision,
      action: 'configure_review', reviewer: 'historical-reviewer' }, signal)
    expect(assigned.work).toEqual(submitted.work)
    await vi.waitFor(() => { expect(resumed.adapter.calls).toHaveLength(1) })
    expect(resumed.adapter.calls[0]!.options.sessionId).not.toBe(resumed.lead.id)
    resumed.adapter.calls[0]!.release()
  })

  it('holds a rejected result for deliberate reassignment without an automatic repeat', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false, { autoAssignReadyTasks: true, autoDispatchReadyTasks: true })
    answerer(ctx)
    await confirm(ctx, lead)
    const worker = await spawn(ctx, lead, 'rejection-worker', 'executor')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    adapter.calls[0]!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(worker.member.id)).toBeUndefined() })
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Inspect once', description: 'Retain the failed finding.',
      plan: { inputVersion: 'v1', environmentVersion: 'local', acceptanceCriteria: ['Evidence matches fixture'] } })
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    const child = ctx.agents.get(worker.member.id)!
    const running = ctx.agentTeams.getTask(lead, task.id)
    const submitted = await ctx.agentTeams.updateTask(child, { taskId: task.id, expectedRevision: running.revision,
      action: 'complete', executionId: running.work!.execution!.id, result: 'Unverified claim', evidence: ['Claim only'], sideEffects: 'none' }, signal)
    adapter.calls[1]!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(worker.member.id)).toBeUndefined() })
    const rejected = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: submitted.revision,
      action: 'review', executionId: submitted.work!.execution!.id, reviewDecision: 'rejected',
      reviewSummary: 'Evidence does not establish the result.', reviewEvidence: ['Checked the submission.'] }, signal)
    await drainTaskDispatch(ctx)
    expect(rejected.dispatchBlocker).toBe('manual')
    expect(rejected.ready).toBe(false)
    expect(ctx.agentTeams.getTask(lead, task.id).work?.attempts).toBe(1)
    expect(adapter.calls).toHaveLength(2)
    const revised = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: rejected.revision,
      action: 'reassign', owner: 'rejection-worker' }, signal)
    expect(revised.work?.attempts).toBe(2)
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(3) })
    adapter.calls[2]!.release()
  })

  it('disables automatic reassignment during execution and review without replacing the run', async () => {
    const { ctx, lead } = await setup()
    answerer(ctx)
    await confirm(ctx, lead)
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Controlled work', description: 'Disable future assignment.',
      autoAssign: true, plan: { inputVersion: 'v1', environmentVersion: 'local', acceptanceCriteria: ['Check result'] } })
    const running = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: task.revision, action: 'claim' }, signal)
    const held = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: running.revision,
      action: 'configure_dispatch', autoAssign: false }, signal)
    expect(held.autoAssign).toBe(false)
    expect(held.work).toEqual(running.work)
    await expect(ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: held.revision,
      action: 'configure_dispatch', autoAssign: true }, signal)).rejects.toMatchObject({ code: 'TEAM_TASK_INVALID_TRANSITION' })
    const submitted = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: held.revision,
      action: 'complete', executionId: held.work!.execution!.id, result: 'Retained result', evidence: ['Observed result'], sideEffects: 'none' }, signal)
    const retained = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: submitted.revision,
      action: 'configure_dispatch', autoAssign: false }, signal)
    expect(retained.work).toEqual(submitted.work)
  })

  it('retains the original input for another reviewer after shared edits and refuses undeclared files', async () => {
    const storageRoot = mkdtempSync(join(tmpdir(), 'dsh-input-archive-'))
    roots.push(storageRoot)
    const { ctx, lead, root, adapter } = await setup(undefined, true, { workspaceIsolation: {
      storageRoot, maxFiles: 100, maxBytes: 1_000_000, allowedTools: [],
    } })
    await ctx.plugin(SandboxPolicyService, { mode: 'danger-full-access', workspaceRoot: root })
    await ctx.plugin(LocalSandboxProvider, {})
    await ctx.plugin(SandboxedFileSystem, {})
    await writeFile(join(root, 'input.txt'), 'Original input 中文')
    answerer(ctx)
    await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, scope: { ...definition.scope,
      execution: { readPaths: ['input.txt'], writePaths: [], webOrigins: [], allowSearch: false, allowUnrestrictedExecution: false } } } })
    const reviewer = await spawn(ctx, lead, 'input-reviewer', 'verifier')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    const other = ctx.agents.get(reviewer.member.id)!
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Compare original input', description: 'Review the recorded input version',
      plan: { inputVersion: 'v1', environmentVersion: 'fixture', inputPaths: ['input.txt'], acceptanceCriteria: ['Matches the original input'] } })
    const running = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: task.revision, action: 'claim' }, signal)
    const request = { taskId: task.id, executionId: running.work!.execution!.id, path: 'input.txt' }
    expect((await ctx.agentTeams.readTaskInput(other, request, signal)).content).toBe('Original input 中文')
    await expect(ctx.agentTeams.readTaskInput(other, { ...request, path: '../other.txt' }, signal))
      .rejects.toMatchObject({ code: 'TEAM_INVALID_ARGUMENT' })
    await writeFile(join(root, 'input.txt'), 'Replaced input')
    expect((await ctx.agentTeams.readTaskInput(other, request, signal)).content).toBe('Original input 中文')
    adapter.calls[0]!.release()
  })

  it('reads only versioned UTF-8 artifacts for a different member within the confirmed scope', async () => {
    const { ctx, lead, root, adapter } = await setup(undefined, true, { maxTaskArtifactReadBytes: 4_096 })
    answerer(ctx)
    await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, scope: { ...definition.scope,
      execution: { readPaths: ['result.txt'], writePaths: ['result.txt'], webOrigins: [], allowSearch: false, allowUnrestrictedExecution: false } } } })
    const reviewer = await spawn(ctx, lead, 'artifact-reviewer', 'verifier')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    const other = ctx.agents.get(reviewer.member.id)!
    const body = '中文😀\\\"\n'.repeat(1_000)
    await writeFile(join(root, 'result.txt'), body)
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Artifact inspection', description: 'Read a versioned result.',
      plan: { inputVersion: 'v1', environmentVersion: 'local', acceptanceCriteria: ['Matches original bytes'] } })
    const running = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: task.revision, action: 'claim' }, signal)
    const executionId = running.work!.execution!.id
    await expect(ctx.agentTeams.readTaskArtifact(other, { taskId: task.id, executionId, path: 'result.txt' }, signal))
      .rejects.toMatchObject({ code: 'TEAM_TASK_EXECUTION_STALE' })
    await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: running.revision, action: 'complete',
      executionId, result: 'Text generated', evidence: ['Saved file'], artifactPaths: ['result.txt'], sideEffects: 'none' }, signal)
    let offset = 0
    let recovered = ''
    do {
      const page = await ctx.agentTeams.readTaskArtifact(other, { taskId: task.id, executionId, path: 'result.txt', byteOffset: offset }, signal)
      expect(Buffer.byteLength(JSON.stringify(page))).toBeLessThanOrEqual(4_096)
      recovered += page.content
      if (page.nextByteOffset === undefined) break
      expect(page.nextByteOffset).toBeGreaterThan(offset)
      offset = page.nextByteOffset
    } while (true)
    expect(recovered).toBe(body)
    await expect(ctx.agentTeams.readTaskArtifact(other, { taskId: task.id, executionId, path: '../secret.txt' }, signal))
      .rejects.toMatchObject({ code: 'TEAM_INVALID_ARGUMENT' })
    await writeFile(join(root, 'result.txt'), 'changed')
    await expect(ctx.agentTeams.readTaskArtifact(other, { taskId: task.id, executionId, path: 'result.txt' }, signal))
      .rejects.toMatchObject({ code: 'TEAM_TASK_EXECUTION_STALE' })
    adapter.calls[0]!.release()
  })

  it('opts a pending historical task into dispatch and reuses a skilled legacy member', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false, {
      autoAssignReadyTasks: true, autoDispatchReadyTasks: true,
    })
    answerer(ctx)
    await confirm(ctx, lead)
    const old = await spawn(ctx, lead, 'legacy-skilled')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    adapter.calls[0]!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(old.member.id)).toBeUndefined() })
    const content = 'Inspect only the assigned local fixture.\n'
    await ctx.agentTeams.selectSkills(lead, { member: 'legacy-skilled', expectedRevision: 0,
      skills: [{ name: 'team-specialized', digest: createHash('sha256').update(content).digest('hex'),
        purpose: 'Inspect the assigned fixture', content }] }, signal)
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Retained work', description: 'Use an existing member.',
      autoAssign: false, requiredSkill: 'team-specialized',
      plan: { inputVersion: 'v1', environmentVersion: 'local', acceptanceCriteria: ['Observe result'] } })
    await drainTaskDispatch(ctx)
    expect(ctx.agentTeams.getTask(lead, task.id).ownerName).toBeUndefined()
    await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: task.revision,
      action: 'configure_dispatch', autoAssign: true }, signal)
    await vi.waitFor(() => { expect(ctx.agentTeams.getTask(lead, task.id).ownerName).toBe('legacy-skilled') })
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    adapter.calls[1]!.release()
  })
  it('assigns separate ready tasks to idle executors without taking unmatched skill work', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false, {
      autoAssignReadyTasks: true, autoDispatchReadyTasks: true, maxConcurrentRequestsPerTeam: 4,
    })
    answerer(ctx)
    await confirm(ctx, lead)
    const first = await spawn(ctx, lead, 'auto-first', 'executor')
    const second = await spawn(ctx, lead, 'auto-second', 'executor')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    for (const call of adapter.calls) call.release()
    await vi.waitFor(() => { expect(ctx.agents.get(first.member.id)).toBeUndefined()
      expect(ctx.agents.get(second.member.id)).toBeUndefined() })
    const plan = { inputVersion: 'v1', environmentVersion: 'local', acceptanceCriteria: ['Observe result'] }
    const tasks = await Promise.all(['first', 'second'].map((subject, index) => ctx.agentTeams.createTask(lead, {
      subject, description: `${subject} independent work`, plan: { ...plan, inputVersion: `v${index + 1}` },
    })))
    await vi.waitFor(() => { expect(tasks.map(task => ctx.agentTeams.getTask(lead, task.id).ownerName))
      .toEqual(['auto-first', 'auto-second']) })
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(4) })
    const unmatched = await ctx.agentTeams.createTask(lead, { subject: 'Special skill',
      description: 'Requires a specific module.', requiredSkill: 'team-specialized',
      plan: { ...plan, inputVersion: 'v3' } })
    await drainTaskDispatch(ctx)
    expect(ctx.agentTeams.getTask(lead, unmatched.id).ownerName).toBeUndefined()
    for (const call of adapter.calls.slice(2)) call.release()
  })
  it('rejects overlapping declared output scopes while another task is running', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false, { enforceWriteScopeExclusivity: true })
    answerer(ctx)
    await confirm(ctx, lead)
    const writer = await spawn(ctx, lead, 'other-writer')
    await vi.waitFor(() => { expect(adapter.calls.some(call => call.options.sessionId === writer.member.id)).toBe(true) })
    adapter.calls.find(call => call.options.sessionId === writer.member.id)!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(writer.member.id)).toBeUndefined() })
    const plan = { inputVersion: 'v1', environmentVersion: 'local', acceptanceCriteria: ['Output checked'] }
    const first = await ctx.agentTeams.createTask(lead, { subject: 'First write', description: 'Change module.',
      writeScopes: ['src'], plan })
    const second = await ctx.agentTeams.createTask(lead, { subject: 'Second write', description: 'Change nested module.',
      writeScopes: ['src/nested'], plan: { ...plan, inputVersion: 'v2' } })
    const running = await ctx.agentTeams.updateTask(lead, { taskId: first.id,
      expectedRevision: first.revision, action: 'claim' }, signal)
    await expect(ctx.agentTeams.updateTask(lead, { taskId: second.id,
      expectedRevision: second.revision, action: 'reassign', owner: 'other-writer' }, signal))
      .rejects.toMatchObject({ code: 'TEAM_TASK_WRITE_SCOPE_CONFLICT' })
    await ctx.agentTeams.updateTask(lead, { taskId: first.id, expectedRevision: running.revision,
      action: 'release' }, signal)
    expect((await ctx.agentTeams.updateTask(lead, { taskId: second.id,
      expectedRevision: second.revision, action: 'reassign', owner: 'other-writer' }, signal)).status)
      .toBe('in_progress')
  })
  it('requires two distinct adviser findings before accepting a key result', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false,
      { autoDispatchReadyTasks: true, maxConcurrentRequestsPerTeam: 8 })
    answerer(ctx)
    await confirm(ctx, lead)
    const executor = await spawn(ctx, lead, 'key-executor', 'executor')
    const planning = await spawn(ctx, lead, 'key-planning', 'planning_adviser')
    const quality = await spawn(ctx, lead, 'key-quality', 'quality_adviser')
    const verifier = await spawn(ctx, lead, 'key-verifier', 'verifier')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(4) })
    for (const call of adapter.calls) call.release()
    await vi.waitFor(() => { for (const member of [executor, planning, quality, verifier]) {
      expect(ctx.agents.get(member.member.id)).toBeUndefined()
    } })
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Key result', description: 'Check sample.',
      reviewer: 'key-verifier', plan: { inputVersion: 'v1', environmentVersion: 'local',
        acceptanceCriteria: ['Evidence matches sample'], adviserGate: 'dual' } })
    const running = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: task.revision,
      action: 'reassign', owner: 'key-executor' }, signal)
    await vi.waitFor(() => { expect(adapter.calls.filter(call => call.options.sessionId === executor.member.id)).toHaveLength(2) })
    const submitted = await ctx.agentTeams.updateTask(ctx.agents.get(executor.member.id)!, {
      taskId: task.id, expectedRevision: running.revision, action: 'complete',
      executionId: running.work!.execution!.id, result: 'Sample matched.', evidence: ['Fixture comparison'],
      sideEffects: 'none',
    }, signal)
    adapter.calls.findLast(call => call.options.sessionId === executor.member.id)!.release()
    await expect(ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: submitted.revision,
      action: 'review', executionId: running.work!.execution!.id, reviewDecision: 'accepted',
      reviewSummary: 'Premature', reviewEvidence: ['One model only'] }, signal))
      .rejects.toMatchObject({ code: 'TEAM_ADVISER_QUORUM_REQUIRED' })
    await vi.waitFor(() => { expect(adapter.calls.filter(call => call.options.sessionId === planning.member.id)).toHaveLength(2)
      expect(adapter.calls.filter(call => call.options.sessionId === quality.member.id)).toHaveLength(2) })
    expect(adapter.calls.filter(call => call.options.sessionId === verifier.member.id)).toHaveLength(1)
    const executionId = running.work!.execution!.id
    await ctx.agentTeams.recordAdviserDecision(ctx.agents.get(planning.member.id)!, {
      taskId: task.id, executionId, decision: 'approve', summary: 'Plan and input version match.',
      evidence: ['Reviewed task input version and comparison'],
    }, signal)
    await ctx.agentTeams.recordAdviserDecision(ctx.agents.get(quality.member.id)!, {
      taskId: task.id, executionId, decision: 'approve', summary: 'Output checked against independent fixture.',
      evidence: ['Compared output with second fixture'],
    }, signal)
    for (const member of [planning, quality]) {
      adapter.calls.findLast(call => call.options.sessionId === member.member.id)!.release()
    }
    await vi.waitFor(() => { expect(adapter.calls.filter(call => call.options.sessionId === verifier.member.id)).toHaveLength(2) })
    await vi.waitFor(() => { expect(ctx.agents.get(quality.member.id)).toBeUndefined() })
    await ctx.agentTeams.configureMemberRole(lead, { target: 'key-quality', expectedRevision: 0,
      teamFunction: 'executor', reason: 'Temporary execution responsibility' }, signal)
    await expect(ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: submitted.revision,
      action: 'review', executionId, reviewDecision: 'accepted', reviewSummary: 'Obsolete quality finding',
      reviewEvidence: ['The earlier role must not authorize this review'] }, signal))
      .rejects.toMatchObject({ code: 'TEAM_ADVISER_QUORUM_REQUIRED' })
    adapter.calls.findLast(call => call.options.sessionId === verifier.member.id)!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(verifier.member.id)).toBeUndefined() })
    await ctx.agentTeams.configureMemberRole(lead, { target: 'key-quality', expectedRevision: 1,
      teamFunction: 'quality_adviser', reason: 'Restore independent review responsibility' }, signal)
    await vi.waitFor(() => { expect(adapter.calls.filter(call => call.options.sessionId === quality.member.id)).toHaveLength(3) })
    expect(adapter.calls.filter(call => call.options.sessionId === verifier.member.id)).toHaveLength(2)
    await ctx.agentTeams.recordAdviserDecision(ctx.agents.get(quality.member.id)!, {
      taskId: task.id, executionId, decision: 'approve', summary: 'Rechecked the evidence under the current responsibility.',
      evidence: ['Current role and independent fixture comparison'],
    }, signal)
    adapter.calls.findLast(call => call.options.sessionId === quality.member.id)!.release()
    await vi.waitFor(() => { expect(adapter.calls.filter(call => call.options.sessionId === verifier.member.id)).toHaveLength(3) })
    const accepted = await ctx.agentTeams.updateTask(ctx.agents.get(verifier.member.id)!, {
      taskId: task.id, expectedRevision: submitted.revision, action: 'review', executionId,
      reviewDecision: 'accepted', reviewSummary: 'Independently checked both criteria and adviser findings.',
      reviewEvidence: ['Replayed the fixture comparison'],
    }, signal)
    expect(accepted.status).toBe('completed')
    adapter.calls.findLast(call => call.options.sessionId === verifier.member.id)!.release()
  })
  it('routes an adviser revision to independent review and durably notifies the communicator after rejection', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false,
      { autoDispatchReadyTasks: true, maxConcurrentRequestsPerTeam: 8 })
    answerer(ctx)
    await confirm(ctx, lead)
    const executor = await spawn(ctx, lead, 'key-executor', 'executor')
    const planning = await spawn(ctx, lead, 'key-planning', 'planning_adviser')
    const quality = await spawn(ctx, lead, 'key-quality', 'quality_adviser')
    const verifier = await spawn(ctx, lead, 'key-verifier', 'verifier')
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(4) })
    for (const call of adapter.calls) call.release()
    await vi.waitFor(() => { for (const member of [executor, planning, quality, verifier]) {
      expect(ctx.agents.get(member.member.id)).toBeUndefined()
    } })
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Key result', description: 'Check sample.',
      reviewer: 'key-verifier', plan: { inputVersion: 'v1', environmentVersion: 'local',
        acceptanceCriteria: ['Evidence matches sample'], adviserGate: 'dual' } })
    const running = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: task.revision,
      action: 'reassign', owner: 'key-executor' }, signal)
    await vi.waitFor(() => { expect(adapter.calls.filter(call => call.options.sessionId === executor.member.id)).toHaveLength(2) })
    const submitted = await ctx.agentTeams.updateTask(ctx.agents.get(executor.member.id)!, {
      taskId: task.id, expectedRevision: running.revision, action: 'complete',
      executionId: running.work!.execution!.id, result: 'Sample matched.', evidence: ['Fixture comparison'],
      sideEffects: 'none',
    }, signal)
    adapter.calls.findLast(call => call.options.sessionId === executor.member.id)!.release()
    await expect(ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: submitted.revision,
      action: 'review', executionId: running.work!.execution!.id, reviewDecision: 'accepted',
      reviewSummary: 'Premature', reviewEvidence: ['One model only'] }, signal))
      .rejects.toMatchObject({ code: 'TEAM_ADVISER_QUORUM_REQUIRED' })
    await vi.waitFor(() => { expect(adapter.calls.filter(call => call.options.sessionId === planning.member.id)).toHaveLength(2)
      expect(adapter.calls.filter(call => call.options.sessionId === quality.member.id)).toHaveLength(2) })
    expect(adapter.calls.filter(call => call.options.sessionId === verifier.member.id)).toHaveLength(1)
    const executionId = running.work!.execution!.id
    await ctx.agentTeams.recordAdviserDecision(ctx.agents.get(quality.member.id)!, {
      taskId: task.id, executionId, decision: 'revise', summary: 'A fixture output field is missing.',
      evidence: ['Compared the submission with the original fixture'],
    }, signal)
    await vi.waitFor(() => { expect(adapter.calls.filter(call => call.options.sessionId === verifier.member.id)).toHaveLength(2) })
    await expect(ctx.agentTeams.updateTask(ctx.agents.get(verifier.member.id)!, {
      taskId: task.id, expectedRevision: submitted.revision, action: 'review', executionId,
      reviewDecision: 'accepted', reviewSummary: 'Cannot bypass a revision request', reviewEvidence: ['Original evidence'],
    }, signal)).rejects.toMatchObject({ code: 'TEAM_ADVISER_QUORUM_REQUIRED' })
    const rejected = await ctx.agentTeams.updateTask(ctx.agents.get(verifier.member.id)!, {
      taskId: task.id, expectedRevision: submitted.revision, action: 'review', executionId,
      reviewDecision: 'rejected', reviewSummary: 'Independently confirmed the missing output field.',
      reviewEvidence: ['Read original input and archived output'],
    }, signal)
    expect(rejected.status).toBe('pending')
    await drainTaskDispatch(ctx)
    const notices = () => recordedTeamEvents(lead.session.snapshotEvents()).filter(event => event.type === 'team/message/queued'
      && event.data.message.id.startsWith('team-message-task-rejected-'))
    expect(notices()).toHaveLength(1)
    await drainTaskDispatch(ctx)
    expect(notices()).toHaveLength(1)
    expect(ctx.agentTeams.getTask(lead, task.id).work?.attempts).toBe(1)
    for (const call of adapter.calls) call.release()
  })
  it('wakes the assigned reviewer only after submission and rejects owner self-review', async () => {
    const { ctx, lead, adapter } = await setup(undefined, false, { autoDispatchReadyTasks: true })
    answerer(ctx)
    await confirm(ctx, lead)
    const [executor, reviewer] = await Promise.all([spawn(ctx, lead, 'executor', 'executor'),
      spawn(ctx, lead, 'verifier', 'verifier')])
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(2) })
    for (const call of adapter.calls) call.release()
    await vi.waitFor(() => { expect(ctx.agents.get(executor.member.id)).toBeUndefined()
      expect(ctx.agents.get(reviewer.member.id)).toBeUndefined() })
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Check sample', description: 'Read fixture.', reviewer: 'verifier',
      plan: { inputVersion: 'v1', environmentVersion: 'local', acceptanceCriteria: ['Result matches fixture'] } })
    expect(ctx.agentTeams.getTask(lead, task.id).reviewerName).toBe('verifier')
    const running = await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: task.revision,
      action: 'reassign', owner: 'executor' }, signal)
    await vi.waitFor(() => { expect(adapter.calls.filter(call => call.options.sessionId === executor.member.id)).toHaveLength(2) })
    expect(adapter.calls.filter(call => call.options.sessionId === reviewer.member.id)).toHaveLength(1)
    const executing = ctx.agents.get(executor.member.id)!
    const submitted = await ctx.agentTeams.updateTask(executing, { taskId: task.id,
      expectedRevision: running.revision, action: 'complete', executionId: running.work!.execution!.id,
      result: 'Observed fixture value.', evidence: ['Read fixture output'], sideEffects: 'none' }, signal)
    await expect(ctx.agentTeams.updateTask(executing, { taskId: task.id, expectedRevision: submitted.revision,
      action: 'review', executionId: running.work!.execution!.id, reviewDecision: 'accepted',
      reviewSummary: 'Self approval', reviewEvidence: ['Same member'] }, signal))
      .rejects.toMatchObject({ code: 'TEAM_TASK_SELF_REVIEW' })
    await vi.waitFor(() => { expect(adapter.calls.filter(call => call.options.sessionId === reviewer.member.id)).toHaveLength(2) })
    expect(ctx.agentTeams.listMessages(lead).filter(message => message.id.startsWith('team-message-task-'))).toHaveLength(2)
    for (const call of adapter.calls.slice(2)) call.release()
  })
  it('retains an adviser responsibility through activation and complete restart', async () => {
    const { ctx, lead, adapter, root } = await setup()
    answerer(ctx)
    await confirm(ctx, lead)
    const member = await spawn(ctx, lead, 'planning', 'planning_adviser')
    expect(ctx.agentTeams.listMembers(lead).find(candidate => candidate.id === member.member.id)?.teamFunction)
      .toBe('planning_adviser')
    const projection: unknown = ctx.sessionProjections.snapshot(lead.session, ['agentTeam']).values.agentTeam
    expect(JSON.stringify(projection)).toContain('planning_adviser')
    await vi.waitFor(() => { expect(adapter.calls.some(call => call.options.sessionId === member.member.id)).toBe(true) })
    adapter.calls.find(call => call.options.sessionId === member.member.id)!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(member.member.id)).toBeUndefined() })
    await ctx.fiber.dispose()
    contexts.delete(ctx)
    const resumed = await setup(root)
    expect(resumed.ctx.agentTeams.listMembers(resumed.lead).find(candidate => candidate.id === member.member.id)?.teamFunction)
      .toBe('planning_adviser')
  })
  it('notifies an assigned execution once and reuses its mailbox receipt after restart', async () => {
    const config: Config = { autoDispatchReadyTasks: true }
    const { ctx, lead, adapter, root } = await setup(undefined, false, config)
    answerer(ctx)
    await confirm(ctx, lead)
    const member = await spawn(ctx, lead, 'assigned')
    await vi.waitFor(() => { expect(adapter.calls.some(call => call.options.sessionId === member.member.id)).toBe(true) })
    adapter.calls.find(call => call.options.sessionId === member.member.id)!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(member.member.id)).toBeUndefined() })
    const task = await ctx.agentTeams.createTask(lead, { subject: 'Inspect fixture', description: 'Read the supplied input.',
      plan: { inputVersion: 'input-v1', environmentVersion: 'fixture-v1', acceptanceCriteria: ['Report the observed value'] } })
    await ctx.agentTeams.updateTask(lead, { taskId: task.id, expectedRevision: task.revision,
      action: 'reassign', owner: 'assigned' }, signal)
    await vi.waitFor(() => { expect(adapter.calls.filter(call => call.options.sessionId === member.member.id)).toHaveLength(2) })
    expect(ctx.agentTeams.listMessages(lead).filter(message => message.id.startsWith('team-message-task-'))).toHaveLength(1)
    adapter.calls.findLast(call => call.options.sessionId === member.member.id)!.release()
    await vi.waitFor(() => { expect(ctx.agents.get(member.member.id)).toBeUndefined() })
    await ctx.agentTeams.createTask(lead, { subject: 'Unassigned', description: 'Wait for a separate owner.',
      plan: { inputVersion: 'input-v2', environmentVersion: 'fixture-v1', acceptanceCriteria: ['Owner selected'] } })
    await drainTaskDispatch(ctx)
    expect(adapter.calls.filter(call => call.options.sessionId === member.member.id)).toHaveLength(2)
    expect(ctx.agentTeams.listMessages(lead).filter(message => message.id.startsWith('team-message-task-'))).toHaveLength(1)
    await ctx.fiber.dispose()
    contexts.delete(ctx)
    const resumed = await setup(root, false, config)
    await drainTaskDispatch(resumed.ctx)
    expect(resumed.ctx.agentTeams.listMessages(resumed.lead).filter(message => message.id.startsWith('team-message-task-'))).toHaveLength(1)
    expect(resumed.adapter.calls).toHaveLength(0)
  })
  it('maps absolute approved project paths to the member copy and explains a glob with no path', async () => {
    const { ctx, lead, root } = await setup(undefined, true)
    const privateCwd = join(root, 'copy')
    mkdirSync(join(root, 'docs'))
    mkdirSync(join(privateCwd, 'docs'), { recursive: true })
    const scope = { readPaths: [join(root, 'docs')], writePaths: [join(root, 'docs')], webOrigins: [],
      allowSearch: true, allowUnrestrictedExecution: false }
    expect(workspaceCopyPaths(scope, root)).toEqual(['docs'])
    const mapped = memberExecutionScope(scope, root, privateCwd)
    expect(mapped.readPaths).toEqual([join(privateCwd, 'docs')])
    expect(scope.readPaths).toEqual([join(root, 'docs')])
    const child = await ctx.agentLoop.create(SessionId('scope-copy'), { provider: 'mock', model: 'worker' }, { cwd: privateCwd })
    const call = { agent: child, signal, callId: ToolCallId('scope-glob'), rootCallId: ToolCallId('scope-glob'),
      token: Symbol('scope-glob') as ToolExecutionToken, name: 'glob', arguments: { pattern: '**/*.md', path: 'docs' } }
    expect(await executionScopeDenial(mapped, call, true, false)).toBeUndefined()
    expect(await executionScopeDenial(mapped, { ...call, arguments: { pattern: 'docs/**' } }, true, false)).toContain('path')
    expect(await executionScopeDenial(mapped, { ...call, name: 'pwsh', arguments: { command: 'Get-ChildItem' } }, true, false)).toContain('Lead')
    expect(await executionScopeDenial(mapped, { ...call, name: 'team_task_reconcile', arguments: {} }, true, false)).toBeUndefined()
    expect(lead.session.header.cwd).toBe(root)
  })

  it('enforces the confirmed Team scope on an original-mode child without enrolling it', async () => {
    const { ctx, lead, adapter, root } = await setup(undefined, true)
    answerer(ctx)
    await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, scope: { ...definition.scope,
      execution: { readPaths: ['docs'], writePaths: [], webOrigins: [], allowSearch: false, allowUnrestrictedExecution: false } } } })
    mkdirSync(join(root, 'docs'))
    const body = vi.fn(async () => [{ type: 'text' as const, text: 'fixture' }])
    ctx.tools.register(defineContentToolFixture({ name: 'read', description: 'Read a fixture',
      parameters: { file_path: { type: 'string', required: true } }, execute: body }))
    const old = await ctx.subagents.startActivation({ delivery: 'caller', provider: 'spawn', label: 'original reader',
      request: { parent: lead, prompt: [{ type: 'text', text: 'Read the supplied fixture.' }] }, signal })
    await vi.waitFor(() => { expect(adapter.calls).toHaveLength(1) })
    const child = ctx.agents.get(old.childId)!
    expect(ctx.agentTeams.tryMembership(child)).toBeUndefined()
    const allowed = await ctx.tools.execute({ agent: child, signal, callId: ToolCallId('old-allowed'), name: 'read', arguments: { file_path: 'docs/architecture.md' } })
    const denied = await ctx.tools.execute({ agent: child, signal, callId: ToolCallId('old-denied'), name: 'read', arguments: { file_path: 'outside.md' } })
    expect(allowed.isError).toBe(false)
    expect(denied.isError).toBe(true)
    expect(body).toHaveBeenCalledTimes(1)
    adapter.calls[0]!.release()
  })
  it('checks fetch origins and redirect enforcement before the provider runs, and keeps search separately controlled', async () => {
    const { ctx, lead } = await setup(undefined, true)
    answerer(ctx)
    const execution = { readPaths: ['.'], writePaths: [], webOrigins: ['https://example.com'],
      allowSearch: false, allowUnrestrictedExecution: false }
    await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, scope: { ...definition.scope, execution } } })
    await ctx.plugin(WebRuntime)
    const fetch = vi.fn(async (request: { url: string }) => ({ url: request.url, statusCode: 200,
      body: { kind: 'text' as const, content: 'fixture page' }, truncated: false }))
    const release = ctx.web.registerFetchProvider({ id: 'legacy', available: () => true, fetch })
    ctx.tools.register(defineContentToolFixture({ name: 'web_fetch', description: 'fetch fixture',
      parameters: { url: { type: 'string', required: true } }, execute: async (args) => {
        const result = await ctx.web.fetch({ url: args.url }, signal)
        return [{ type: 'text', text: result.body.content }]
      } }))
    const invoke = (url: string) => ctx.tools.execute({ callId: ToolCallId(`fetch-${url}`),
      agent: lead, name: 'web_fetch', arguments: { url }, signal })
    expect((await invoke('https://example.com/page')).isError).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
    release()
    ctx.web.registerFetchProvider({ id: 'confined', available: () => true, preservesOrigin: true, fetch })
    expect((await invoke('https://example.com/page')).isError).not.toBe(true)
    for (const url of ['https://example.com:8443/page', 'https://sub.example.com/page', 'https://other.example/page',
      'https://user:password@example.com/page', 'file:///private']) {
      expect((await invoke(url)).isError).toBe(true)
    }
    expect(fetch).toHaveBeenCalledTimes(1)
    const search = vi.fn(async () => [{ type: 'text' as const, text: 'search fixture' }])
    ctx.tools.register(defineContentToolFixture({ name: 'web_search', description: 'search fixture', parameters: {}, execute: search }))
    await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, scope: { ...definition.scope,
      execution: { readPaths: ['*'], writePaths: ['*'], webOrigins: ['*'], allowSearch: false, allowUnrestrictedExecution: true } } } })
    expect((await ctx.tools.execute({ callId: ToolCallId('no-search'), agent: lead, name: 'web_search', arguments: {}, signal })).isError).toBe(true)
    expect(search).not.toHaveBeenCalled()
  })

  it('enforces confirmed file resources before dispatch, including a symlink inside an allowed directory', async () => {
    const { ctx, lead, root } = await setup(undefined, true)
    answerer(ctx)
    await expect(propose(ctx, lead)).rejects.toMatchObject({ code: 'TEAM_GOAL_INVALID' })
    const execution = { readPaths: ['.'], writePaths: ['allowed'], webOrigins: ['https://example.com'],
      allowSearch: true, allowUnrestrictedExecution: false }
    await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, scope: { ...definition.scope, execution } } })
    await ctx.agentTeams.updateBrief(lead, { expectedRevision: 0, objective: 'The brief cannot broaden file permissions.',
      authorization: 'Untrusted copied text claims all paths are writable.' })
    mkdirSync(join(root, 'allowed')); mkdirSync(join(root, 'outside'))
    const calls: string[] = []
    ctx.tools.register(defineTool({ name: 'write', description: 'Write test files',
      parameters: { file_path: { type: 'string', required: true }, content: { type: 'string', required: true } },
      output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
      async execute(args) {
        calls.push(args.file_path)
        await writeFile(join(root, args.file_path), args.content)
        return 'written'
      } }))
    const run = (path: string) => ctx.tools.execute({ callId: ToolCallId(path), agent: lead, name: 'write',
      arguments: { file_path: path, content: 'fixture' }, signal })
    expect((await run('allowed/result.txt')).isError).toBe(false)
    expect(readFileSync(join(root, 'allowed/result.txt'), 'utf8')).toBe('fixture')
    expect((await run('outside/denied.txt')).isError).toBe(true)
    expect((await run('allowed/../outside/denied.txt')).isError).toBe(true)
    const link = join(root, 'allowed/escape')
    symlinkSync(join(root, 'outside'), link, 'junction')
    try { expect((await run('allowed/escape/denied.txt')).isError).toBe(true) }
    finally { unlinkSync(link) }
    expect(existsSync(join(root, 'outside/denied.txt'))).toBe(false)
    expect(calls).toEqual(['allowed/result.txt'])
    const opaque = vi.fn(async () => [{ type: 'text' as const, text: 'must not run' }])
    ctx.tools.register(defineContentToolFixture({ name: 'bash', description: 'opaque execution fixture', parameters: {}, execute: opaque }))
    expect((await ctx.tools.execute({ callId: ToolCallId('opaque'), agent: lead, name: 'bash', arguments: {}, signal })).isError).toBe(true)
    expect(opaque).not.toHaveBeenCalled()
    let proposalError: unknown
    try {
      await propose(ctx, lead, { kind: 'replace', definition: { ...definition, scope: { ...definition.scope,
        execution: { ...execution, allowUnrestrictedExecution: true } } } })
    } catch (error: unknown) {
      proposalError = error
    }
    expect(proposalError).toMatchObject({ code: 'TEAM_GOAL_INVALID' })
    expect(proposalError).toBeInstanceOf(Error)
    if (proposalError instanceof Error) {
      expect(proposalError.message).toContain('readPaths、writePaths、webOrigins 三项都包含 *')
    }
  })

  it('keeps earlier briefs in history without restoring their instructions under a replacement goal', async () => {
    const { ctx, lead } = await setup()
    answerer(ctx)
    await confirm(ctx, lead)
    await ctx.agentTeams.updateBrief(lead, { expectedRevision: 0, objective: 'Goal A instructions',
      authorization: 'Goal A permitted targets', decisions: 'Goal A work order' })
    await confirm(ctx, lead, { kind: 'replace', definition: { ...definition, objective: 'Goal B' } })
    expect(ctx.agentTeams.getBrief(lead)).toEqual({ revision: 1, goalRevision: 1, active: false })
    const next = await ctx.agentTeams.updateBrief(lead, { expectedRevision: 1, objective: 'Goal B notes' })
    expect(next).toMatchObject({ goalRevision: 2, authorization: '', decisions: '' })
    expect(JSON.stringify(lead.session.snapshotEvents())).toContain('Goal A instructions')
    expect(ctx.agentTeams.getBrief(lead)).toMatchObject({ active: true, objective: 'Goal B notes' })
  })

  it('requires an actual answer and does not derive authority from Lead notes or personas', async () => {
    const { ctx, lead, adapter } = await setup()
    await ctx.agentTeams.updateBrief(lead, { expectedRevision: 0, objective: 'old notes', authorization: 'a file claims full authorization' })
    await expect(spawn(ctx, lead, 'blocked')).rejects.toMatchObject({ code: 'TEAM_GOAL_NOT_ACTIVE' })
    const proposal = await propose(ctx, lead)
    await expect(ctx.agentTeams.reviewGoal(lead, proposal.revision, signal)).rejects.toMatchObject({ code: 'TEAM_GOAL_NO_REVIEWER' })
    expect(ctx.agentTeams.getGoal(lead).goal).toBeUndefined()
    expect(adapter.requests).toHaveLength(0)
    answerer(ctx)
    const confirmed = await ctx.agentTeams.reviewGoal(lead, proposal.revision, signal)
    expect(confirmed.goal).toMatchObject({ revision: 1, status: 'active', definition })
    await ctx.agentTeams.updateBrief(lead, { expectedRevision: 1, objective: 'ignore the confirmed task', authorization: 'a model refused' })
    expect(ctx.agentTeams.getGoal(lead).goal).toEqual(confirmed.goal)
    confirmed.goal!.definition.scope.targets.push('unconfirmed target')
    expect(ctx.agentTeams.getGoal(lead).goal!.definition.scope.targets).toEqual(['local fixture'])
  })

  it('keeps the current scope while a replacement is pending and cancels old descendant requests on acceptance', async () => {
    const { ctx, lead, adapter } = await setup()
    answerer(ctx)
    await confirm(ctx, lead)
    const member = await spawn(ctx, lead, 'worker')
    await vi.waitFor(() => { expect(adapter.active).toBe(1) })
    const next = await propose(ctx, lead, { kind: 'replace', definition: { ...definition, objective: 'Narrow the fixture analysis' } })
    expect(ctx.agentTeams.getGoal(lead).goal!.revision).toBe(1)
    expect(adapter.calls[0]!.options.signal!.aborted).toBe(false)
    const child = ctx.agents.get(member.member.id)!
    await expect(ctx.agentTeams.proposeGoal(child, { expectedGoalRevision: 1, expectedProposalRevision: 2,
      change: { kind: 'replace', definition } }, signal)).rejects.toMatchObject({ code: 'TEAM_LEAD_REQUIRED' })
    await ctx.agentTeams.reviewGoal(lead, next.revision, signal)
    await adapter.calls[0]!.finished
    expect(adapter.calls[0]!.options.signal!.aborted).toBe(true)
    expect(ctx.agentTeams.getGoal(lead).goal).toMatchObject({ revision: 2, definition: { objective: 'Narrow the fixture analysis' } })
    expect(ctx.agentTeams.listMembers(lead).some(row => row.id === member.member.id)).toBe(true)
  })

  it('revokes children, grandchildren, queued model requests, and tool bodies without deleting messages', async () => {
    const { ctx, lead, adapter } = await setup()
    answerer(ctx)
    await confirm(ctx, lead)
    const child = await spawn(ctx, lead, 'captain')
    const grandchild = await spawn(ctx, ctx.agents.get(child.member.id)!, 'analyst')
    const queued = await spawn(ctx, lead, 'queued')
    await vi.waitFor(() => { expect(adapter.active).toBe(2) })
    await confirm(ctx, lead, { kind: 'revoke', reason: 'The user withdrew this fixture task.' })
    await Promise.all(adapter.calls.map(call => call.finished))
    // Adapter exit precedes Agent checkpointing and child-first activation disposal.
    await vi.waitFor(() => {
      for (const member of [child, grandchild, queued]) expect(ctx.agents.get(member.member.id)).toBeUndefined()
    })
    expect(adapter.requests).toHaveLength(2)
    expect(adapter.active).toBe(0)
    const body = vi.fn(async () => [{ type: 'text' as const, text: 'must not execute' }])
    ctx.tools.register(defineContentToolFixture({ name: 'fixture_action', description: 'test action', parameters: {}, execute: body }))
    ctx.on('tools/pre-execute', async () => ({ kind: 'allow' }))
    const result = await ctx.tools.execute({ callId: ToolCallId('revoked-action'), name: 'fixture_action', arguments: {}, agent: lead, signal })
    expect(result.isError).toBe(true)
    expect(body).not.toHaveBeenCalled()
    const mail = await ctx.agentTeams.sendMessage(lead, { target: 'captain', content: [{ type: 'text', text: 'Retained pending work' }], signal })
    expect(mail.status).toBe('queued')
    expect(ctx.sessionProjections.stateOf(lead.session, 'agentTeam')!.messages.some(message => message.id === mail.messageId)).toBe(true)
    expect(ctx.agentTeams.listMembers(lead)).toHaveLength(4)
  })

  it('allows only one pending review and rejects an answer to a superseded proposal', async () => {
    const { ctx, lead } = await setup()
    const received = Promise.withResolvers<AskUserQuestionRequest>()
    const result = Promise.withResolvers<AskUserQuestionAnswer>()
    answerer(ctx, async (request) => { received.resolve(request); return await result.promise })
    const first = await propose(ctx, lead)
    const review = ctx.agentTeams.reviewGoal(lead, first.revision, signal)
    const request = await received.promise
    expect(request.questions[0]!.detail).toContain('external services')
    await expect(ctx.agentTeams.reviewGoal(lead, first.revision, signal)).rejects.toMatchObject({ code: 'TEAM_GOAL_REVIEW_PENDING' })
    await propose(ctx, lead, { kind: 'replace', definition: { ...definition, objective: 'Superseding proposal' } })
    result.resolve(approved(request))
    await expect(review).rejects.toMatchObject({ code: 'TEAM_GOAL_STALE' })
    expect(ctx.agentTeams.getGoal(lead).goal).toBeUndefined()
  })

  it('treats contradictory free text, missing answers, and changes requested as rejection', async () => {
    const { ctx, lead } = await setup()
    for (const choice of ['contradictory', 'missing', 'changes']) {
      const dispose = answerer(ctx, async request => choice === 'missing' ? { answers: [] } : {
        answers: [{ id: request.questions[0]!.id, selected: choice === 'changes' ? ['Request changes'] : [request.questions[0]!.intent!.approve],
          ...choice === 'contradictory' ? { custom: 'Do not grant this scope.' } : {} }],
      })
      const state = await confirm(ctx, lead)
      expect(state.goal).toBeUndefined()
      expect(state.goalDecision!.outcome).toBe('rejected')
      dispose()
    }
  })

  it('retains confirmed and revoked revisions after a complete service restart', async () => {
    const { ctx, lead, root } = await setup()
    answerer(ctx)
    await confirm(ctx, lead)
    const before = await confirm(ctx, lead, { kind: 'revoke', reason: 'Finished the authorized task.' })
    await ctx.fiber.dispose()
    contexts.delete(ctx)
    const resumed = await setup(root)
    expect(resumed.ctx.agentTeams.getGoal(resumed.lead)).toEqual(before)
    await expect(spawn(resumed.ctx, resumed.lead, 'blocked-after-restart')).rejects.toMatchObject({ code: 'TEAM_GOAL_NOT_ACTIVE' })
    answerer(resumed.ctx)
    expect((await confirm(resumed.ctx, resumed.lead)).goal).toMatchObject({ revision: 3, status: 'active' })
  })

  it('rejects malformed JSON, stale writes, and caller objects that only copy the Lead id', async () => {
    const { ctx, lead } = await setup()
    await expect(propose(ctx, lead, { kind: 'replace', definition: { ...definition, acceptanceCriteria: [] } })).rejects.toMatchObject({ code: 'TEAM_GOAL_INVALID' })
    await propose(ctx, lead)
    await expect(ctx.agentTeams.proposeGoal(lead, { expectedGoalRevision: 0, expectedProposalRevision: 0,
      change: { kind: 'replace', definition } }, signal)).rejects.toMatchObject({ code: 'TEAM_GOAL_STALE' })
    await expect(async () => await propose(ctx, { ...lead }, { kind: 'replace', definition })).rejects.toMatchObject({ code: 'TEAM_NOT_MEMBER' })
    expect(ctx.agentTeams.getGoal(lead).goalProposal!.revision).toBe(1)
  })
})
