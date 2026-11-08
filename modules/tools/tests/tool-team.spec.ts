import { mountTeamTestSubagents } from '../../agent-team/tests/subagent-fixture.ts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Group from '@deepseek-ai/cordis-plugin-group'
import AgentPresets from '@deepseek-ai/dsh-agent-preset-registry'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { ToolCallId, createUserMessage, ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { SessionId, SessionLogOffset } from '@deepseek-ai/dsh-session'
import * as JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import UserQuestions, { UserQuestionError } from '@deepseek-ai/dsh-user-questions'
import SessionQueryEngine from '@deepseek-ai/dsh-session-query'
import Storage from '@deepseek-ai/dsh-storage'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import * as StorageJson from '@deepseek-ai/dsh-storage-json'
import TeamExpertService from '@deepseek-ai/dsh-experimental-agent-team/experts'
import * as SubagentFork from '@deepseek-ai/dsh-subagent-fork-in-process'
import * as SubagentSpawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
import { renderPrompt, renderContextSnapshot } from '@deepseek-ai/dsh-system-prompt'
import * as ToolSubagentControl from '@deepseek-ai/dsh-tool-subagent-control'
import { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { resolveAdapterOptions } from '@deepseek-ai/dsh-llm-deepseek'
import { serialize } from '@deepseek-ai/dsh-llm-deepseek/src/serialize.ts'
import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import { MockAdapter, textResponse, toolCallResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'
import TeamService, { TeamId } from '../../agent-team/src/index.ts'
import type { TeamJournal } from '../../agent-team/src/journal.ts'
import * as toolTeam from '../src/index.ts'

function serializeRequest(request: GenerateOptions) {
  const connection = resolveAdapterOptions({ models: [{ id: request.model, systemPromptUpdate: 'in-history' }] })
  return serialize(request, connection, request.messages, new Map(), () => undefined)
}

const SIGNAL = new AbortController().signal

it('returns action-specific help and keeps review configuration separate from plan fields', async () => {
  const { ctx, lead } = await setup([])
  const created = await ctx.agentTeams.createTask(lead, { subject: 'Planned fixture', description: 'Review a fixed fixture',
    plan: { inputVersion: 'input-v1', environmentVersion: 'local-v1', acceptanceCriteria: ['Fixture is checked'] } })
  const configured = await execute(ctx, lead, 'team_task_update', {
    task_id: created.id, expected_revision: created.revision, action: 'configure_review', reviewer: 'lead',
  })
  expect(configured.isError).toBe(false)
  const wrongPlan = await execute(ctx, lead, 'team_task_update', {
    task_id: created.id, expected_revision: 2, action: 'configure_review', reviewer: 'lead', input_version: 'wrong',
  })
  expect(wrongPlan.isError).toBe(true)
  expect(text(wrongPlan)).toContain('action plan')
  const missingReview = await execute(ctx, lead, 'team_task_update', {
    task_id: created.id, expected_revision: 2, action: 'review', execution_id: 'task-1/run-1', review_decision: 'accepted',
    review_summary: 'Checked', evidence: ['wrong field'],
  })
  expect(missingReview.isError).toBe(true)
  expect(text(missingReview)).toContain('review_evidence')
  const help = await execute(ctx, lead, 'team_help', { topic: 'tasks', action: 'review' })
  expect(help.isError).toBe(false)
  expect(JSON.parse(text(help))).toMatchObject({ tool: 'team_task_update', action: 'review',
    required: expect.arrayContaining(['review_evidence', 'review_summary', 'execution_id']) })
  expect((await execute(ctx, lead, 'team_workspace', { action: 'prepare' })).isError).toBe(false)
  const missingTarget = await execute(ctx, lead, 'team_workspace', { action: 'get' })
  expect(missingTarget.isError).toBe(true)
  expect(text(missingTarget)).toContain('requires target')
  const missingArtifact = await execute(ctx, lead, 'team_workspace', { action: 'read_artifact', task_id: created.id })
  expect(missingArtifact.isError).toBe(true)
  expect(text(missingArtifact)).toContain('recorded relative file_path')
  const mixedArtifact = await execute(ctx, lead, 'team_workspace', { action: 'get', target: 'lead', file_path: 'result.txt' })
  expect(mixedArtifact.isError).toBe(true)
  expect(text(mixedArtifact)).toContain('only valid for read_artifact')
})

it('lists original-mode children alongside Team members and routes their id without changing their lifecycle', async () => {
  const { ctx, lead } = await setup(Array.from({ length: 6 }, () => textResponse('fixture reviewed')), true)
  ctx.on('agent/pre-step', async (event, next) => event.agent === lead ? { kind: 'reject' } : next())
  const old = await ctx.subagents.startActivation({ delivery: 'caller', provider: 'spawn', label: 'original reviewer',
    request: { parent: lead, prompt: [{ type: 'text', text: 'Read the supplied fixture.' }] }, signal: SIGNAL })
  await waitNoAgent(ctx, old.childId)
  const listed = await execute(ctx, lead, 'list_agents', {})
  expect(listed.isError).toBe(false)
  expect(JSON.parse(text(listed))).toEqual(expect.arrayContaining([
    expect.objectContaining({ agent_id: old.childId, legacy_mode: 'continuable', target: `session:${old.childId}` }),
  ]))
  expect(ctx.agentTeams.listMembers(lead)).toHaveLength(1)
  const sent = await execute(ctx, lead, 'send_message', { agent_id: old.childId, message: 'Review the same result.' })
  expect(sent.isError).toBe(false)
  expect(JSON.parse(text(sent))).toMatchObject({ status: 'accepted' })
  await waitNoAgent(ctx, old.childId)
  expect((await execute(ctx, lead, 'interrupt_agent', { target: `session:${old.childId}` })).isError).toBe(false)
  expect((await execute(ctx, lead, 'send_message', { target: 'lead', agent_id: old.childId, message: 'Ambiguous' })).isError).toBe(true)
  const unrelated = await ctx.agentLoop.create(SessionId('unrelated'), { provider: 'mock', model: 'mock' })
  expect((await execute(ctx, lead, 'send_message', { agent_id: unrelated.id, message: 'Must not deliver.' })).isError).toBe(true)
})

it.each(['team_task_create', 'team_task_update', 'team_context'])('cancels %s while its write is queued', async (name) => {
  const { ctx, lead } = await setup([])
  const task = await ctx.agentTeams.createTask(lead, { subject: 'Existing', description: 'Existing task' })
  const journal = Reflect.get(ctx.agentTeams, 'journal') as TeamJournal
  const held = Promise.withResolvers<undefined>()
  const release = Promise.withResolvers<undefined>()
  const blocking = journal.transact(lead.id, async () => {
    held.resolve(undefined)
    await release.promise
  })
  await held.promise
  const enqueued = Promise.withResolvers<undefined>()
  const transact = journal.transact.bind(journal)
  const spy = vi.spyOn(journal, 'transact').mockImplementationOnce(<T>(rootId: SessionId, operation: () => Promise<T>) => {
    const pending = transact(rootId, operation)
    enqueued.resolve(undefined)
    return pending
  })
  const controller = new AbortController()
  const args = name === 'team_task_create' ? { subject: 'Cancelled', description: 'Must not appear' }
    : name === 'team_task_update' ? { task_id: task.id, expected_revision: 1, action: 'claim' }
      : { expected_revision: 0, objective: 'Must not appear' }
  const before = lead.session.snapshotEvents().filter(event => event.type === 'team/task' || event.type === 'team/brief')
  const running = ctx.tools.execute({ callId: ToolCallId('cancel-queued-write'), name, arguments: args, agent: lead, signal: controller.signal })
  try {
    await enqueued.promise
    controller.abort(new Error('cancel queued write'))
    release.resolve(undefined)
    expect((await running).isError).toBe(true)
    await journal.drain()
    expect(lead.session.snapshotEvents().filter(event => event.type === 'team/task' || event.type === 'team/brief')).toEqual(before)
  } finally {
    release.resolve(undefined)
    await blocking
    await running
    spy.mockRestore()
  }
})

const TOOL_NAMES = [
  'spawn_teammate',
  'send_message',
  'team_mailbox',
  'team_workspace',
  'team_member',
  'team_task_archive',
  'list_agents',
  'list_team_models',
  'team_context',
  'team_goal',
  'team_help',
  'wait_agent',
  'interrupt_agent',
  'team_task_create',
  'team_task_list',
  'team_task_get',
  'team_task_update',
  'team_task_reconcile',
].sort()

const roots: string[] = []
const contexts = new Set<Context>()
let callNumber = 0

/** Session query implementation whose search faces are outside these tests. */
class TestSessionQuery extends SessionQueryEngine {
  override searchSessions(): Promise<never> {
    return Promise.reject(new Error('session search is not configured in this test'))
  }

  override searchEvents(): Promise<never> {
    return Promise.reject(new Error('event search is not configured in this test'))
  }
}

afterEach(async () => {
  for (const ctx of contexts) await ctx.fiber.dispose()
  contexts.clear()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

async function setup(
  script: ConstructorParameters<typeof MockAdapter>[0],
  legacyControl = false,
  config: toolTeam.Options = {},
  teamConfig: ConstructorParameters<typeof TeamService>[1] = {},
  withExperts = false,
) {
  const ctx = new Context()
  contexts.add(ctx)
  await mountAgentLoopTestDependencies(ctx)
  const storageRoot = mkdtempSync(join(tmpdir(), 'dsh-tool-team-'))
  roots.push(storageRoot)
  await ctx.plugin(JsonlSessionPersistence, { root: storageRoot })
  await ctx.plugin(TestSessionQuery)
  await ctx.plugin(AgentLoop, { agents: [] })
  await mountTeamTestSubagents(ctx)
  if (legacyControl) await ctx.plugin(ToolSubagentControl)
  await ctx.plugin(SubagentSpawn, { providerName: 'spawn' })
  await ctx.plugin(SubagentFork, { providerName: 'fork' })
  const teamFiber = await ctx.plugin(TeamService, teamConfig)
  if (withExperts) {
    await ctx.plugin(Storage)
    await ctx.plugin(StorageJson, { root: join(storageRoot, 'catalog') })
    await ctx.plugin(StorageDomain, { backend: 'json' })
    await ctx.plugin(TeamExpertService)
  }
  const fiber = await ctx.plugin(toolTeam, config)
  const adapter = new MockAdapter(script)
  ctx.llm.registerAdapter(['mock'], adapter)
  const leadHandle = await ctx.agents.create({ sessionId: SessionId('tool-team-lead'),
    agentOptions: { provider: 'mock', model: 'mock' }, meta: { cwd: storageRoot } })
  const lead = leadHandle.agent
  return { ctx, lead, leadHandle, fiber, teamFiber, adapter }
}

function execute(
  ctx: Context,
  agent: Agent | undefined,
  name: string,
  args: unknown,
  signal: AbortSignal = SIGNAL,
) {
  return ctx.tools.execute({
    callId: ToolCallId(`team-call-${++callNumber}`),
    name,
    arguments: args,
    signal,
    ...agent === undefined ? {} : { agent },
  })
}

function text(result: Awaited<ReturnType<typeof execute>>): string {
  return result.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')
}

function spawnedChildId(ctx: Context, lead: Agent, result: Awaited<ReturnType<typeof execute>>): SessionId {
  const parsed = JSON.parse(text(result)) as { member: { target: string } }
  const member = ctx.agentTeams.listMembers(lead).find(member => member.name === parsed.member.target)
  if (member === undefined) throw new Error('spawn_teammate target has no roster member')
  return member.id
}

async function assembly(ctx: Context, agent: Agent) {
  const scope = scopeOf(agent.ctx)
  if (scope === undefined) throw new Error('expected Agent scope')
  return ctx.systemPrompt.assemble({ scope })
}

async function runTurn(agent: Agent, text: string): Promise<void> {
  agent.followup(createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }))
  await agent.whenIdle()
}

async function waitRunning(ctx: Context, id: SessionId): Promise<Agent> {
  return vi.waitFor(() => {
    const child = ctx.agents.get(id)
    expect(child?.status).toBe('running')
    return child!
  }, { timeout: 5_000 })
}

async function waitNoAgent(ctx: Context, id: SessionId): Promise<void> {
  await vi.waitFor(() => { expect(ctx.agents.get(id)).toBeUndefined() }, { timeout: 5_000 })
}

describe('dsh-tool-team', () => {
  it('records a persistent current identity and the versioned help workflow without relying on an initial introduction', async () => {
    const { ctx, lead } = await setup([textResponse('Synthetic checkpoint observed.')])
    await runTurn(lead, 'Read the current Team identity.')
    const sections = lead.session.snapshotEvents().flatMap(event => {
      if (event.type !== 'user/message') return []
      const source = event.data.source
      return 'form' in source && source.form === 'snapshot'
        ? source.sections.filter(section => section.name.startsWith('team:')) : []
    })
    expect(sections.some(section => section.text.includes('Current Team identity: {"name":"lead","memberId":"tool-team-lead"'))).toBe(true)
    expect(sections).toMatchSnapshot()
    const help = await execute(ctx, lead, 'team_help', { topic: 'start' })
    expect(help.isError).not.toBe(true)
    expect(JSON.parse(text(help))).toMatchSnapshot()
  })
  it('lets the Lead reconfigure a retained member without a replacement Session', async () => {
    const { ctx, lead } = await setup([textResponse('Original member finished its first turn.')])
    const replacement = new MockAdapter([textResponse('Original member continued on the replacement model.')], {
      efforts: [{ id: ReasoningEffortId('max'), name: 'Max' }],
      defaultEffort: ReasoningEffortId('max'),
    }, 8_192)
    ctx.llm.registerAdapter(['replacement'], replacement)
    const started = await execute(ctx, lead, 'spawn_teammate', {
      name: 'retained-reviewer', description: 'Review the local fixture', prompt: 'Start reviewing.',
      persona: 'Keep the same review role across model changes.',
    })
    expect(started.isError).toBe(false)
    const memberId = spawnedChildId(ctx, lead, started)
    await waitNoAgent(ctx, memberId)

    const selected = await execute(ctx, lead, 'team_member', {
      action: 'configure_model', target: 'retained-reviewer',
      model_provider: 'replacement', model: 'review-model',
    })
    expect(selected.isError).toBe(false)
    expect(JSON.parse(text(selected))).toMatchObject({ effective: 'next_request', member: {
      id: memberId, name: 'retained-reviewer', modelProvider: 'replacement',
      model: 'review-model', reasoningEffort: 'max', modelRouteRevision: 1,
    } })
    expect(ctx.agentTeams.listMembers(lead)).toHaveLength(2)
    expect(ctx.agentTeams.listMembers(lead)[1]?.persona).toBe('Keep the same review role across model changes.')
    const roster = await execute(ctx, lead, 'list_agents', {})
    expect(roster.isError).toBe(false)
    expect(JSON.parse(text(roster))).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'retained-reviewer', modelRouteRevision: 1,
        modelProvider: 'replacement', model: 'review-model', reasoningEffort: 'max' }),
    ]))

    const continued = await execute(ctx, lead, 'send_message', {
      target: 'retained-reviewer', message: 'Continue the same review.',
    })
    expect(continued.isError).toBe(false)
    await waitNoAgent(ctx, memberId)
    expect(replacement.requests).toHaveLength(1)
    expect(replacement.requests[0]).toMatchObject({ sessionId: memberId, provider: 'replacement',
      model: 'review-model', reasoningEffort: 'max', maxTokens: 8_192 })
  })

  it('permits independent teammate creations in one model tool batch', async () => {
    const { ctx, lead } = await setup([])
    expect(ctx.tools.executionMode({ callId: ToolCallId('team-batch-spawn'), name: 'spawn_teammate',
      arguments: { name: 'reader', description: 'Read a fixture', prompt: 'Read it.' }, signal: SIGNAL, agent: lead }))
      .toEqual({ kind: 'parallel' })
  })
  it('creates a model-changed successor with a new Session and retains the previous member history', async () => {
    const { ctx, lead } = await setup([textResponse('Earlier evidence is complete.')])
    let skillContent = '# Original review method\nKeep verified evidence.\n'
    ctx.on('team/resolve-skill', () => Promise.resolve({ name: 'team-review-method', content: skillContent,
      digest: createHash('sha256').update(skillContent).digest('hex') }))
    const specialist = new MockAdapter([textResponse('Continued from recorded evidence.')], {
      efforts: [{ id: ReasoningEffortId('max'), name: 'Max' }],
      defaultEffort: ReasoningEffortId('max'),
    })
    ctx.llm.registerAdapter(['specialist'], specialist)
    const created = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reviewer', description: 'Review evidence', prompt: 'Review the first input',
      persona: 'You review evidence and preserve the verified result.',
      skills: [{ name: 'team-review-method', purpose: 'Review the current evidence' }],
    })
    expect(created.isError).toBe(false)
    const oldId = spawnedChildId(ctx, lead, created)
    await waitNoAgent(ctx, oldId)
    const originalSkills = ctx.agentTeams.getSkills(lead, 'reviewer').skills
    skillContent = '# Updated review method\nDifferent instructions.\n'
    const switched = await execute(ctx, lead, 'team_member', {
      action: 'successor', target: 'reviewer', new_name: 'reviewer-next',
      model_provider: 'specialist', model: 'review-model', reasoning_effort: 'max',
      prompt: 'Continue the next independent review.',
    })
    expect(switched.isError).toBe(false)
    const handoff: unknown = JSON.parse(text(switched))
    expect(handoff).toMatchObject({ predecessor: { name: 'reviewer', sessionId: oldId },
      member: { name: 'reviewer-next', modelProvider: 'specialist', model: 'review-model', reasoningEffort: 'max' } })
    const successor = ctx.agentTeams.listMembers(lead).find(member => member.name === 'reviewer-next')
    expect(successor?.id).not.toBe(oldId)
    if (successor === undefined) throw new Error('successor did not enter the Team')
    expect(ctx.agentTeams.getSkills(lead, 'reviewer-next').skills).toEqual(originalSkills)
    await waitNoAgent(ctx, successor.id)
    expect(ctx.agentTeams.listMembers(lead).find(member => member.id === oldId)?.name).toBe('reviewer')
    expect(JSON.stringify(specialist.requests[0]?.messages)).toContain('reviewer')
    expect(JSON.stringify(specialist.requests[0]?.messages)).toContain('team_task_archive')
    expect(JSON.stringify(specialist.requests[0]?.messages)).toContain('do not start project work')
    expect(JSON.stringify(specialist.requests[0]?.messages)).toContain('Handoff context: Continue the next independent review.')
  })
  it('pages retained completions without copying result bodies into the active board or archive index', async () => {
    const { ctx, lead } = await setup([])
    for (const subject of ['First receipt', 'Second receipt']) {
      const created = await execute(ctx, lead, 'team_task_create', { subject, description: 'Retain the completed evidence.' })
      const task = JSON.parse(text(created)) as { id: string; revision: number }
      await execute(ctx, lead, 'team_task_update', { task_id: task.id, expected_revision: task.revision, action: 'claim' })
      const complete = await execute(ctx, lead, 'team_task_update', { task_id: task.id, expected_revision: task.revision + 1,
        action: 'complete', result: 'Saved result body must only appear on detail reads.', evidence: ['fixture checked'] })
      expect(complete.isError).not.toBe(true)
    }
    expect(JSON.parse(text(await execute(ctx, lead, 'team_task_list', {})))).toMatchObject({ tasks: [] })
    const first = await execute(ctx, lead, 'team_task_archive', { action: 'list', limit: 1 })
    expect(first.isError).not.toBe(true)
    const page = JSON.parse(text(first)) as { tasks: { id: string; subject: string }[]; nextCursor: string }
    expect(page.tasks).toHaveLength(1)
    expect(page.tasks[0]?.subject).toBe('First receipt')
    expect(text(first)).not.toContain('Saved result body')
    const second = await execute(ctx, lead, 'team_task_archive', { action: 'list', limit: 1, after: page.nextCursor })
    expect(JSON.parse(text(second))).toMatchObject({ tasks: [{ subject: 'Second receipt' }] })
    expect(JSON.parse(text(second))).not.toHaveProperty('nextCursor')
    expect(text(await execute(ctx, lead, 'team_task_get', { task_id: page.tasks[0]!.id }))).toContain('Saved result body')
    expect((await execute(ctx, lead, 'team_task_archive', { action: 'list', limit: 0 })).isError).toBe(true)
  })

  it('forwards task-specific skills from spawn_teammate before the child starts', async () => {
    const { ctx, lead, adapter } = await setup([textResponse('Fixture reviewed.')])
    const content = '# Local Android fixture\nRead only the assigned sample.\n'
    ctx.on('team/resolve-skill', () => Promise.resolve({
      name: 'team-android-fingerprint', content, digest: createHash('sha256').update(content).digest('hex'),
    }))
    const result = await execute(ctx, lead, 'spawn_teammate', {
      name: 'android-worker', description: 'Review the local fixture', prompt: 'Review the sample.', context: 'fresh',
      skills: [{ name: 'team-android-fingerprint', purpose: 'Inspect this fixture only' }],
    })
    expect(result.isError).not.toBe(true)
    const childId = spawnedChildId(ctx, lead, result)
    expect(ctx.agentTeams.getSkills(lead, 'android-worker')).toMatchObject({
      memberId: childId, revision: 1, skills: [{ name: 'team-android-fingerprint', purpose: 'Inspect this fixture only' }],
    })
    await waitNoAgent(ctx, childId)
    expect(adapter.requests.filter(request => request.sessionId === childId)).toHaveLength(1)
  })

  it('requires a selected skill before a new Workbench member starts', async () => {
    const { ctx, lead } = await setup([textResponse('Reviewed.')], false, { requireMemberSkills: true })
    expect(renderPrompt(await assembly(ctx, lead))).toContain('Before spawn_teammate or a first team_expert_assign')
    const withoutSkills = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reader', description: 'Review the fixture', prompt: 'Review it.',
    })
    expect(withoutSkills.isError).toBe(true)
    expect(text(withoutSkills)).toContain('skills: [{ name, purpose }]')
    expect(ctx.agentTeams.listMembers(lead)).toHaveLength(1)
    const emptySkills = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reader', description: 'Review the fixture', prompt: 'Review it.', skills: [],
    })
    expect(emptySkills.isError).toBe(true)
    const catalogOnly = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reader', description: 'Review the fixture', prompt: 'Review it.',
      skills: [{ name: 'team-workbench', purpose: 'Find a suitable skill' }],
    })
    expect(catalogOnly.isError).toBe(true)
    expect(text(catalogOnly)).toContain('skill catalog, not a task-specific module')
    const mixedCatalog = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reader', description: 'Review the fixture', prompt: 'Review it.',
      skills: [{ name: 'team-workbench', purpose: 'Find a suitable skill' },
        { name: 'team-workflow', purpose: 'Track the fixture review' }],
    })
    expect(mixedCatalog.isError).toBe(true)
    expect(text(mixedCatalog)).toContain('skill catalog, not a task-specific module')
    const content = '# Evidence review\nCheck the fixture.\n'
    ctx.on('team/resolve-skill', () => Promise.resolve({
      name: 'team-workflow', content, digest: createHash('sha256').update(content).digest('hex'),
    }))
    const created = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reader', description: 'Review the fixture', prompt: 'Review it.',
      skills: [{ name: 'team-workflow', purpose: 'Track the fixture review' }],
    })
    expect(created.isError, text(created)).toBe(false)
    expect(ctx.agentTeams.getSkills(lead, 'reader').skills).toMatchObject([{ name: 'team-workflow' }])
  })

  it('requires skills on first expert assignment but preserves reuse without a new selection', async () => {
    const { ctx, lead } = await setup([textResponse('Reviewed.')], false, { requireMemberSkills: true }, {}, true)
    const saved = await execute(ctx, lead, 'team_expert_save', {
      name: 'Reviewer', description: 'Review evidence', persona: 'Read the fixture.', instructions: '', skills: [],
    })
    const profile = JSON.parse(text(saved)) as { id: string; revision: number }
    const args = { id: profile.id, expected_revision: profile.revision, name: 'reviewer', prompt: 'Review the fixture.' }
    expect((await execute(ctx, lead, 'team_expert_assign', args)).isError).toBe(true)
    expect(ctx.agentTeams.listMembers(lead)).toHaveLength(1)
    const content = '# Evidence review\nCheck the fixture.\n'
    ctx.on('team/resolve-skill', () => Promise.resolve({
      name: 'team-workflow', content, digest: createHash('sha256').update(content).digest('hex'),
    }))
    const created = await execute(ctx, lead, 'team_expert_assign', {
      ...args, skills: [{ name: 'team-workflow', purpose: 'Track the fixture review' }],
    })
    expect(created.isError, text(created)).toBe(false)
    expect(JSON.parse(text(created))).toMatchObject({ reused: false })
    const reused = await execute(ctx, lead, 'team_expert_assign', args)
    expect(reused.isError, text(reused)).toBe(false)
    expect(JSON.parse(text(reused))).toMatchObject({ reused: true })
    expect(ctx.agentTeams.getSkills(lead, 'reviewer').skills).toMatchObject([{ name: 'team-workflow' }])
  })

  it('requires a complete plan and exposes resumable submissions for another member to review', async () => {
    const { ctx, lead } = await setup(['hang'], false, {}, { requireTaskPlans: true })
    const partial = await execute(ctx, lead, 'team_task_create', { subject: 'Compare fixture', description: 'Read the local fixture', input_version: 'fixture-v1' })
    expect(partial.isError).toBe(true)
    expect(ctx.agentTeams.listTasks(lead)).toEqual([])
    const created = await execute(ctx, lead, 'team_task_create', {
      subject: 'Compare fixture', description: 'Read the local fixture',
      input_version: 'fixture-v1', environment_version: 'local-v1', acceptance_criteria: ['Compare the recorded fields'],
    })
    expect(created.isError, text(created)).not.toBe(true)
    const task = JSON.parse(text(created)) as { id: string }
    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'fixture-worker', description: 'Compare the fixture', prompt: 'Wait for the fixture task', context: 'fresh',
    })
    const childId = spawnedChildId(ctx, lead, spawned)
    const child = await waitRunning(ctx, childId)
    const claimed = await execute(ctx, child, 'team_task_update', { task_id: task.id, expected_revision: 1, action: 'claim' })
    const value = JSON.parse(text(claimed)) as { work: { execution: { id: string } } }
    const execution_id = value.work.execution.id
    expect(JSON.parse(text(await execute(ctx, child, 'team_task_update', {
      task_id: task.id, expected_revision: 2, action: 'resume', execution_id,
    })))).toMatchObject({ revision: 2, work: { execution: { id: execution_id, phase: 'running' } } })
    const missingEvidence = await execute(ctx, child, 'team_task_update', {
      task_id: task.id, expected_revision: 2, action: 'complete', execution_id, result: 'Compared',
    })
    expect(missingEvidence.isError).toBe(true)
    const submitted = await execute(ctx, child, 'team_task_update', {
      task_id: task.id, expected_revision: 2, action: 'complete', execution_id, result: 'Compared', evidence: ['report.json'],
    })
    expect(JSON.parse(text(submitted))).toMatchObject({ revision: 3, status: 'in_progress', validity: { reusable: false }, work: { execution: { phase: 'submitted' } } })
    const review = { task_id: task.id, expected_revision: 3, action: 'review', execution_id,
      review_decision: 'accepted', review_summary: 'Compared the fields independently', review_evidence: ['review.json'],
      review_checks: [{ criterion: 1, verified: true, evidence: 'review.json: every fixture field matched' }] }
    expect((await execute(ctx, child, 'team_task_update', review)).isError).toBe(true)
    const unchecked = await execute(ctx, lead, 'team_task_update', { ...review, review_checks: [] })
    expect(unchecked.isError).toBe(true)
    expect(text(unchecked)).toContain('every acceptance criterion')
    const unverified = await execute(ctx, lead, 'team_task_update', { ...review,
      review_checks: [{ criterion: 1, verified: false, evidence: 'fixture value was not available' }] })
    expect(unverified.isError).toBe(true)
    expect(ctx.agentTeams.listTasks(lead).find(entry => entry.id === task.id)?.work?.execution?.phase).toBe('submitted')
    const accepted = await execute(ctx, lead, 'team_task_update', review)
    expect(JSON.parse(text(accepted))).toMatchObject({ revision: 4, status: 'completed', result: 'Compared', validity: { reusable: false },
      work: { execution: { phase: 'accepted', review: { reviewerId: lead.id } } } })
    await execute(ctx, lead, 'interrupt_agent', { target: 'fixture-worker' })
    await waitNoAgent(ctx, childId)
  })

  it('rejects an owner on claim before creating an execution', async () => {
    const { ctx, lead } = await setup([], false, {}, { requireTaskPlans: true })
    const created = await execute(ctx, lead, 'team_task_create', {
      subject: 'Review fixture', description: 'Read the fixture',
      input_version: 'fixture-v1', environment_version: 'local-v1', acceptance_criteria: ['Check the fixture'],
    })
    const task = JSON.parse(text(created)) as { id: string; revision: number }
    const rejected = await execute(ctx, lead, 'team_task_update', {
      task_id: task.id, expected_revision: task.revision, action: 'claim', owner: 'fixture-worker',
    })
    expect(rejected.isError).toBe(true)
    expect(text(rejected)).toContain('reassign with owner')
    expect(ctx.agentTeams.listTasks(lead).find(entry => entry.id === task.id)).toMatchObject({ status: 'pending', revision: task.revision })
  })

  it('guides an effect hold through independent reconciliation before reassignment', async () => {
    const { ctx, lead } = await setup(['hang'], false, {}, { requireTaskPlans: true })
    const created = await execute(ctx, lead, 'team_task_create', {
      subject: 'Check an external operation', description: 'Inspect its recorded result',
      input_version: 'fixture-v1', environment_version: 'local-v1', acceptance_criteria: ['Verify the observed state'],
    })
    const task = JSON.parse(text(created)) as { id: string; revision: number }
    const claimed = await execute(ctx, lead, 'team_task_update', {
      task_id: task.id, expected_revision: task.revision, action: 'claim',
    })
    const running = JSON.parse(text(claimed)) as { revision: number; work: { execution: { id: string } } }
    lead.ctx.tools.register(defineContentToolFixture({
      name: 'external_probe', description: 'Recorded fixture operation', parameters: {},
      async execute() { return [{ type: 'text', text: 'fixture operation completed' }] },
    }))
    await execute(ctx, lead, 'external_probe', {})
    const released = await execute(ctx, lead, 'team_task_update', {
      task_id: task.id, expected_revision: running.revision, action: 'release',
    })
    const revision = (JSON.parse(text(released)) as { revision: number }).revision
    const blocked = await execute(ctx, lead, 'team_task_update', {
      task_id: task.id, expected_revision: revision, action: 'reassign', owner: 'lead',
    })
    expect(blocked.isError).toBe(true)
    expect(text(blocked)).toContain('team_task_reconcile')

    const wrongFields = await execute(ctx, lead, 'team_task_update', {
      task_id: task.id, expected_revision: revision, action: 'reconcile', execution_id: running.work.execution.id,
      side_effects: 'known', review_summary: 'Checked', evidence: ['operation receipt'],
    })
    expect(wrongFields.isError).toBe(true)
    expect(text(wrongFields)).toContain('review_evidence')
    const missingFields = await execute(ctx, lead, 'team_task_reconcile', {
      task_id: task.id, expected_revision: revision, execution_id: running.work.execution.id,
      side_effects: 'known', review_summary: 'Checked',
    })
    expect(missingFields.isError).toBe(true)
    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'effect-reviewer', description: 'Independently inspect the recorded operation', prompt: 'Wait for review',
    })
    const reviewer = await waitRunning(ctx, spawnedChildId(ctx, lead, spawned))
    const selfReview = await execute(ctx, lead, 'team_task_reconcile', {
      task_id: task.id, expected_revision: revision, execution_id: running.work.execution.id,
      side_effects: 'known', review_summary: 'I checked my own action', review_evidence: ['operation receipt'],
    })
    expect(selfReview.isError).toBe(true)
    const reconciled = await execute(ctx, reviewer, 'team_task_reconcile', {
      task_id: task.id, expected_revision: revision, execution_id: running.work.execution.id,
      side_effects: 'known', review_summary: 'Checked the logged receipt and resulting state',
      review_evidence: ['operation receipt', 'resulting state inspected'],
    })
    expect(reconciled.isError, text(reconciled)).toBe(false)
    const nextRevision = (JSON.parse(text(reconciled)) as { revision: number }).revision
    const assigned = await execute(ctx, lead, 'team_task_update', {
      task_id: task.id, expected_revision: nextRevision, action: 'reassign', owner: 'effect-reviewer',
    })
    expect(assigned.isError, text(assigned)).toBe(false)
    expect(JSON.parse(text(assigned))).toMatchObject({ work: { execution: { id: `${task.id}/run-2` } } })
    const help = await execute(ctx, lead, 'team_help', { topic: 'recovery', tool: 'team_task_reconcile' })
    expect(help.isError).toBe(false)
    expect(text(help)).toContain('review_evidence')
  })

  it('proposes through the tool and adopts only a native human answer in logged runtime context', async () => {
    const { ctx, lead } = await setup([], false, {}, { requireConfirmedGoal: true })
    await ctx.plugin(UserQuestions)
    const proposal = await execute(ctx, lead, 'team_goal', {
      action: 'propose', expected_proposal_revision: 0, expected_goal_revision: 0,
      objective: 'Review the local SDK fixture', acceptance_criteria: ['Report a reproducible call sequence'],
      plan: 'reader: mock/high reads the SDK fixture; reviewer: mock/high checks the call sequence; lead delivers the result.',
      coverage: 'task', targets: ['local SDK fixture'], allowed_actions: ['read and test fixture'], excluded_targets: [], constraints: ['Keep user files'],
    })
    expect(proposal.isError).not.toBe(true)
    expect(ctx.agentTeams.getGoal(lead).goal).toBeUndefined()
    ctx.on('user-questions/request', async request => ({
      answers: request.questions.map(question => ({ id: question.id, selected: [question.intent!.approve] })),
    }))
    const review = await execute(ctx, lead, 'team_goal', { action: 'review', proposal_revision: 1 })
    expect(review.isError).not.toBe(true)
    expect(text(review)).toContain('"status":"active"')
    expect(ctx.agentTeams.getGoal(lead).goal?.definition.plan).toContain('reviewer: mock/high')
    expect(renderContextSnapshot(await assembly(ctx, lead))).toContain('Review the local SDK fixture')
    expect((await execute(ctx, lead, 'team_goal', { action: 'review', proposal_revision: 1 })).isError).toBe(true)
  })

  it('distinguishes an accepted earlier proposal from a cancelled pending replacement', async () => {
    const { ctx, lead } = await setup([], false, {}, { requireConfirmedGoal: true, requireExecutionScope: true })
    await ctx.plugin(UserQuestions)
    let cancelReview = false
    ctx.on('user-questions/request', async (request) => {
      if (cancelReview) throw new UserQuestionError('the user cancelled ask_user_question', 'ASK_CANCELLED')
      return { answers: request.questions.map(question => ({ id: question.id, selected: [question.intent!.approve] })) }
    })
    const proposal = {
      action: 'submit', objective: 'Inspect the project', acceptance_criteria: ['Report findings'],
      plan: 'lead: inspect; reviewer: check findings independently.',
      coverage: 'task', targets: ['project'], allowed_actions: ['read project'], excluded_targets: [], constraints: [],
      execution_scope: { readPaths: ['.'], writePaths: [], webOrigins: [], allowSearch: false,
        allowUnrestrictedExecution: false },
    }
    const first = await execute(ctx, lead, 'team_goal', {
      ...proposal, expected_goal_revision: 0, expected_proposal_revision: 0,
    })
    expect(first.isError).toBe(false)
    cancelReview = true
    const cancelled = await execute(ctx, lead, 'team_goal', {
      ...proposal, objective: 'Run a local gateway', expected_goal_revision: 1, expected_proposal_revision: 1,
      execution_scope: { readPaths: ['*'], writePaths: ['*'], webOrigins: ['*'], allowSearch: false,
        allowUnrestrictedExecution: true },
    })
    expect(cancelled.isError).toBe(true)
    const pending: unknown = JSON.parse(text(await execute(ctx, lead, 'team_goal', { action: 'read' })))
    expect(pending).toMatchObject({ review_state: { confirmed_goal_revision: 1, confirmed_proposal_revision: 1,
      latest_proposal_revision: 2, latest_proposal_status: 'pending', last_decision_proposal_revision: 1 } })
    expect(JSON.stringify(pending)).toContain('其他提案的 accepted 决定不能批准本提案')
    cancelReview = false
    const accepted = await execute(ctx, lead, 'team_goal', {
      ...proposal, objective: 'Run a local gateway', expected_goal_revision: 1, expected_proposal_revision: 2,
      execution_scope: { readPaths: ['*'], writePaths: ['*'], webOrigins: ['*'], allowSearch: false,
        allowUnrestrictedExecution: true },
    })
    expect(accepted.isError).toBe(false)
    const acceptedView: unknown = JSON.parse(text(await execute(ctx, lead, 'team_goal', { action: 'read' })))
    expect(acceptedView).toMatchObject({ review_state: { confirmed_goal_revision: 2, confirmed_proposal_revision: 3,
      latest_proposal_revision: 3, latest_proposal_status: 'accepted' } })
  })

  it('requires a reviewable plan in the Team workbench composition', async () => {
    const { ctx, lead } = await setup([], false, { requireDetailedPlan: true })
    const missing = await execute(ctx, lead, 'team_goal', {
      action: 'propose', expected_proposal_revision: 0, expected_goal_revision: 0,
      objective: 'Review the local fixture', acceptance_criteria: ['Report observed results'],
      coverage: 'task', targets: ['fixture'], allowed_actions: ['read'], excluded_targets: [], constraints: [],
    })
    expect(missing.isError).toBe(true)
    expect(text(missing)).toContain('plan')
    expect(ctx.agentTeams.getGoal(lead).goalProposal).toBeUndefined()
  })

  it('names omitted proposal fields and submits the corrected proposal for human review', async () => {
    const { ctx, lead } = await setup([], false, {}, { requireConfirmedGoal: true, requireExecutionScope: true })
    await ctx.plugin(UserQuestions)
    const proposal = {
      action: 'submit', expected_proposal_revision: 0, expected_goal_revision: 0,
      objective: 'Review local documentation', acceptance_criteria: ['Report missing usage steps'],
      plan: 'lead: mock/high reads the documentation and reports missing usage steps.',
      coverage: 'task', targets: ['docs'], allowed_actions: ['read docs'], constraints: [],
      execution_scope: { readPaths: ['docs'], writePaths: [], webOrigins: [], allowSearch: true, allowUnrestrictedExecution: false },
    }
    const rejected = await execute(ctx, lead, 'team_goal', proposal)
    expect(rejected.isError).toBe(true)
    expect(text(rejected)).toContain('excluded_targets')
    expect(ctx.agentTeams.getGoal(lead).goalProposal).toBeUndefined()
    let reviewed = false
    ctx.on('user-questions/request', async (request) => {
      expect(ctx.agentTeams.getGoal(lead).goal).toBeUndefined()
      expect(ctx.agentTeams.getGoal(lead).goalProposal?.revision).toBe(1)
      reviewed = true
      return { answers: request.questions.map(question => ({ id: question.id, selected: [question.intent!.approve] })) }
    })
    const accepted = await execute(ctx, lead, 'team_goal', { ...proposal, excluded_targets: [] })
    expect(accepted.isError).not.toBe(true)
    expect(reviewed).toBe(true)
    expect(ctx.agentTeams.getGoal(lead).goal?.status).toBe('active')
    expect(ctx.agentTeams.getGoal(lead).goal?.definition.scope.execution?.allowSearch).toBe(true)
  })

  it('returns topic-specific examples and the exact visible tool schema on demand', async () => {
    const { ctx, lead } = await setup([])
    const help = await execute(ctx, lead, 'team_help', { topic: 'start' })
    const helpValue = JSON.parse(text(help)) as { examples: { arguments: { excluded_targets?: string[] } }[] }
    expect(helpValue.examples[1]?.arguments.excluded_targets).toEqual([])
    const schema = await execute(ctx, lead, 'team_help', { topic: 'start', tool: 'team_goal' })
    const schemaValue = JSON.parse(text(schema)) as { parameters: unknown }
    expect(schemaValue.parameters).toEqual(ctx.tools.get('team_goal', lead)?.parameters)
    expect((await execute(ctx, lead, 'team_help', { topic: 'start', tool: 'missing' })).isError).toBe(true)
  })

  it('creates and reuses a durable expert through the scoped model tools', async () => {
    const { ctx, lead } = await setup([textResponse('expert finished')], false, {}, {}, true)
    const created = await execute(ctx, lead, 'team_expert_save', {
      name: 'Reviewer', description: 'Review fixture evidence', persona: 'Verify each claim.',
      instructions: 'Preserve accepted scope.', skills: [],
    })
    expect(created.isError, text(created)).toBe(false)
    const profile = JSON.parse(text(created)) as { id: string; revision: number }
    const catalog = await execute(ctx, lead, 'team_expert_catalog', {})
    expect(text(catalog)).toContain(profile.id)
    const args = { id: profile.id, expected_revision: 1, name: 'reviewer', prompt: 'Review this fixture.' }
    const first = await execute(ctx, lead, 'team_expert_assign', args)
    expect(first.isError).toBe(false)
    expect(JSON.parse(text(first))).toMatchObject({ reused: false, member: { target: 'reviewer', expert: { id: profile.id } } })
    const second = await execute(ctx, lead, 'team_expert_assign', args)
    expect(second.isError).toBe(false)
    expect(JSON.parse(text(second))).toMatchObject({ reused: true, member: { target: 'reviewer' } })
    const changed = await execute(ctx, lead, 'team_expert_save', {
      id: profile.id, expected_revision: 1, name: 'Reviewer', description: 'Review fixture evidence',
      persona: 'Check citations too.', instructions: '', skills: [],
    })
    expect(changed.isError).toBe(false)
    expect(JSON.parse(text(changed))).toMatchObject({ revision: 2 })
    const stale = await execute(ctx, lead, 'team_expert_assign', args)
    expect(stale.isError).toBe(true)
    expect(text(stale)).toContain('revision changed')
  })

  it('pages expert summaries without persona content and bounds a selected profile', async () => {
    const { ctx, lead } = await setup([], false, {
      expertCatalogPageSize: 1, maxExpertCatalogBytes: 320, maxExpertProfileBytes: 1024,
    }, {}, true)
    const secretPersona = 'Private review instructions '.repeat(70)
    const first = await execute(ctx, lead, 'team_expert_save', {
      name: 'Evidence reviewer', description: 'Review evidence', persona: secretPersona, instructions: 'Check the record.', skills: [],
    })
    const second = await execute(ctx, lead, 'team_expert_save', {
      name: 'Fixture reader', description: 'Read fixture', persona: 'Read files.', instructions: '', skills: [],
    })
    expect(first.isError).toBe(false)
    expect(second.isError).toBe(false)
    const firstId = (JSON.parse(text(first)) as { id: string }).id
    const secondId = (JSON.parse(text(second)) as { id: string }).id
    const firstPage = await execute(ctx, lead, 'team_expert_catalog', {})
    expect(firstPage.isError).toBe(false)
    expect(Buffer.byteLength(text(firstPage), 'utf8')).toBeLessThanOrEqual(320)
    expect(text(firstPage)).not.toContain(secretPersona)
    const page = JSON.parse(text(firstPage)) as { items: Array<{ id: string }>; nextOffset: number }
    expect(page.items).toHaveLength(1)
    expect(page.nextOffset).toBe(1)
    const nextPage = await execute(ctx, lead, 'team_expert_catalog', { offset: page.nextOffset })
    const lastPage = JSON.parse(text(nextPage)) as { items: Array<{ id: string }>; nextOffset: number | null }
    expect(lastPage.nextOffset).toBeNull()
    expect([...page.items, ...lastPage.items].map(item => item.id).sort())
      .toEqual([firstId, secondId].sort())
    const oversized = await execute(ctx, lead, 'team_expert_catalog', { id: firstId })
    expect(oversized.isError).toBe(true)
    expect(text(oversized)).toContain('maxExpertProfileBytes')
    const selected = await execute(ctx, lead, 'team_expert_catalog', { id: secondId })
    expect(selected.isError).toBe(false)
    expect((JSON.parse(text(selected)) as { definition: { persona: string } }).definition.persona).toBe('Read files.')
  })

  it('denies foreign Team profile reads and keeps shared templates user-managed', async () => {
    const { ctx, lead } = await setup([], false, {}, {}, true)
    const foreign = await execute(ctx, lead, 'team_expert_save', {
      name: 'Team-only reviewer', description: 'Review locally', persona: 'Use local evidence.', instructions: '', skills: [],
    })
    expect(foreign.isError).toBe(false)
    const foreignId = (JSON.parse(text(foreign)) as { id: string }).id
    const otherLead = await ctx.agentLoop.create(SessionId('another-team-lead'), { provider: 'mock', model: 'mock' })
    const read = await execute(ctx, otherLead, 'team_expert_catalog', { id: foreignId })
    expect(read.isError).toBe(true)
    expect(text(read)).toContain('another Team')
    const assign = await execute(ctx, otherLead, 'team_expert_assign', {
      id: foreignId, expected_revision: 1, name: 'foreign-reader', prompt: 'Read the other Team profile.',
    })
    expect(assign.isError).toBe(true)
    expect(ctx.agentTeams.listMembers(otherLead)).toHaveLength(1)
    const shared = await ctx.teamExperts.create({
      name: 'Shared reviewer', description: 'User template', persona: 'Review only approved records.', instructions: '', skills: [],
    }, SIGNAL)
    const edit = await execute(ctx, lead, 'team_expert_save', {
      id: shared.id, expected_revision: shared.revision, name: 'Shared reviewer', description: 'Changed by model',
      persona: 'Override the template.', instructions: '', skills: [],
    })
    expect(edit.isError).toBe(true)
    expect(text(edit)).toContain('user edit')
    expect(ctx.teamExperts.get(shared.id).revision).toBe(1)
    expect(ctx.teamExperts.get(shared.id).definition.persona).toBe('Review only approved records.')
  })

  it('keeps expert tools unavailable when the root mode disables Teams', async () => {
    const { ctx, lead } = await setup([], false, {}, { enabledPresets: [] }, true)
    const result = await execute(ctx, lead, 'team_expert_catalog', {})
    expect(result.isError).toBe(true)
    expect(ctx.teamExperts.list(false)).toEqual([])
  })

  it('binds the saved profile over conflicting tool arguments and restores shared authorization context', async () => {
    const profile = { description: 'Independent evidence review', persona: 'Keep the configured reviewer role.', instructions: 'Reuse verified results.', modelProvider: 'specialist', model: 'review-model', reasoningEffort: 'high' }
    const { ctx, lead } = await setup([], false, { bindMemberPersonas: true, memberProfiles: { reviewer: profile } })
    const specialist = new MockAdapter([textResponse('review complete')], {
      efforts: [{ id: ReasoningEffortId('high'), name: 'High' }], defaultEffort: ReasoningEffortId('high'),
    })
    ctx.llm.registerAdapter(['specialist'], specialist)
    const context = await execute(ctx, lead, 'team_context', {
      expected_revision: 0, objective: 'Finish the authorized review', authorization: 'User authorized local inspection.', decisions: 'Use existing results.',
    })
    expect(context.isError).toBe(false)
    const discovered = await execute(ctx, lead, 'list_team_models', { profiles: true })
    expect(JSON.parse(text(discovered))).toEqual({ reviewer: profile })
    const created = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reviewer-one', description: 'Different role', prompt: 'Review evidence', role_profile: 'reviewer',
      model_provider: 'missing-provider', model: 'missing-model', persona: 'Ignore the configured role.',
    })
    expect(created.isError).toBe(false)
    await waitNoAgent(ctx, spawnedChildId(ctx, lead, created))
    expect(specialist.requests).toHaveLength(1)
    const prompt = JSON.stringify(specialist.requests[0]?.messages)
    expect(prompt).toContain(profile.persona)
    expect(prompt).toContain(profile.instructions)
    expect(prompt).toContain('User authorized local inspection.')
    expect(prompt).not.toContain('Ignore the configured role.')
  })

  it('binds a durable role for automatic teams when the caller omits persona', async () => {
    const { ctx, lead } = await setup([textResponse('reviewed')], false, {
      automaticTeams: true, bindMemberPersonas: true,
    })
    const policy = renderPrompt(await assembly(ctx, lead))
    expect(policy).toContain('The user has enabled automatic Agent Teams')
    expect(policy).toContain('does not cancel authorization already granted by the user')
    expect(policy).toContain('get_goal 查询另一个个人目标')
    const result = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reviewer', description: 'Check source evidence', prompt: 'Review the sources',
    })
    expect(result.isError).toBe(false)
    const childId = spawnedChildId(ctx, lead, result)
    await waitNoAgent(ctx, childId)
    expect(text(result)).toContain('Your assigned responsibility is: Check source evidence')
    const handle = await ctx.sessionPersistence.open(childId, 'read')
    try {
      const stored = await handle.read()
        expect(JSON.stringify(stored.events.filter(event => event.type === 'system/message')))
          .toContain('Check source evidence')
    } finally {
      await handle.close()
    }
  })

  it('discovers model efforts and creates a teammate with the selected role and route', async () => {
    const { ctx, lead } = await setup([])
    const effort = ReasoningEffortId('high')
    const specialist = new MockAdapter([textResponse('review complete')], {
      efforts: [{ id: effort, name: 'High' }], defaultEffort: effort,
    })
    ctx.llm.registerAdapter(['specialist'], specialist)
    const discovered = await execute(ctx, lead, 'list_team_models', { provider: 'specialist', model: 'review-model' })
    expect(discovered.isError).toBe(false)
    expect(JSON.parse(text(discovered))).toMatchObject({ reasoning: { efforts: [{ id: effort }] } })
    const result = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reviewer', description: 'Review evidence', prompt: 'Review the supplied evidence',
      model_provider: 'specialist', model: 'review-model', reasoning_effort: 'high',
      persona: 'You are the evidence reviewer.',
    })
    expect(result.isError).toBe(false)
    expect(JSON.parse(text(result))).toMatchObject({ member: {
      target: 'reviewer', modelProvider: 'specialist', model: 'review-model', reasoningEffort: 'high',
      persona: 'You are the evidence reviewer.',
    } })
    await waitNoAgent(ctx, spawnedChildId(ctx, lead, result))
    expect(specialist.requests).toHaveLength(1)
    expect(JSON.stringify(specialist.requests[0]?.messages)).toContain('You are the evidence reviewer.')
  })

  it.each([{ model: 'review-model' }, { model_provider: 'mock' }, { reasoning_effort: '' }])(
    'rejects incomplete member model selections before creating a child: %j', async (selection) => {
      const { ctx, lead } = await setup([])
      const result = await execute(ctx, lead, 'spawn_teammate', {
        name: 'reviewer', description: 'Review', prompt: 'Review', ...selection,
      })
      expect(result.isError).toBe(true)
      expect(ctx.agentTeams.listMembers(lead)).toHaveLength(1)
    },
  )

  it.each(['running', 'inactive', 'provisioning', 'failed'] as const)(
    'projects %s members consistently in creation, listing, and schemas', async (status) => {
      const { ctx, lead } = await setup([])
      const member = {
        id: SessionId('private-member-session'), name: 'reviewer', role: 'teammate' as const,
        status, description: 'review changes', diagnostics: [],
      }
      vi.spyOn(ctx.agentTeams, 'spawnTeammate').mockResolvedValue({ member })
      vi.spyOn(ctx.agentTeams, 'listMembers').mockReturnValue([member])
      const expected = {
        target: 'reviewer', role: 'teammate', status,
        description: 'review changes', diagnostics: [],
      }
      const spawned = await execute(ctx, lead, 'spawn_teammate', {
        name: 'reviewer', description: 'review changes', prompt: 'review',
      })
      const listed = await execute(ctx, lead, 'list_agents', {})
      expect(spawned.isError).toBe(false)
      expect(listed.isError).toBe(false)
      expect(JSON.parse(text(spawned))).toEqual({ member: expected })
      expect(JSON.parse(text(listed))).toEqual([expected])
      const scope = scopeOf(lead.ctx)
      const spawnSchema = ctx.tools.get('spawn_teammate', scope)?.output.schema.properties?.member
      const listSchema = ctx.tools.get('list_agents', scope)?.output.schema.items
      for (const schema of [spawnSchema, listSchema]) {
        expect(schema?.properties).toHaveProperty('target')
        expect(schema?.properties).not.toHaveProperty('id')
        expect(schema?.properties).not.toHaveProperty('name')
        expect(schema?.properties?.status?.enum).toEqual(['running', 'inactive', 'provisioning', 'failed', 'retired'])
      }
      expect(ctx.agentTeams.listMembers(lead)).toEqual([member])
    },
  )

  it.each(['running', 'inactive'] as const)('returns interrupted %s status', async (previousStatus) => {
    const { ctx, lead } = await setup([])
    const interrupt = vi.spyOn(ctx.agentTeams, 'interrupt').mockReturnValue({ previousStatus })
    const result = await execute(ctx, lead, 'interrupt_agent', { target: 'reviewer' })
    expect(JSON.parse(text(result))).toEqual({ previousStatus })
    expect(interrupt).toHaveBeenCalledWith(lead, 'reviewer')
  })

  it('uses returned targets for messages, interruption, and task assignment', async () => {
    const { ctx, lead } = await setup(['hang', 'hang'])
    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reviewer', description: 'review changes', prompt: 'wait for work',
    })
    const { member } = JSON.parse(text(spawned)) as { member: { target: string } }
    const childId = spawnedChildId(ctx, lead, spawned)
    const child = await waitRunning(ctx, childId)
    expect(member).not.toHaveProperty('id')
    expect(member).not.toHaveProperty('name')
    const listed = JSON.parse(text(await execute(ctx, lead, 'list_agents', {}))) as Array<{ target: string }>
    expect(listed.map(row => row.target)).toEqual(['lead', member.target])
    const created = await execute(ctx, lead, 'team_task_create', { subject: 'review', description: 'review changes' })
    const task = JSON.parse(text(created)) as { id: string; revision: number }
    const assigned = await execute(ctx, lead, 'team_task_update', {
      task_id: task.id, expected_revision: task.revision, action: 'reassign', owner: member.target,
    })
    expect(assigned.isError).toBe(false)
    expect(JSON.parse(text(assigned))).toMatchObject({ ownerName: member.target })
    const tasks = await execute(ctx, lead, 'team_task_list', { owner: listed[1]!.target })
    expect(JSON.parse(text(tasks))).toMatchObject({ tasks: [{ id: task.id, ownerName: member.target }] })
    const sent = await execute(ctx, lead, 'send_message', { target: member.target, message: 'review the diff' })
    expect(sent.isError).toBe(false)
    const interrupted = await execute(ctx, lead, 'interrupt_agent', { target: listed[1]!.target })
    expect(interrupted.isError).toBe(false)
    await child.whenIdle()
    expect(child.status).toBe('idle')
    expect(ctx.agentTeams.interrupt(lead, member.target)).toEqual({ previousStatus: 'inactive' })
    const stored = await execute(ctx, lead, 'list_agents', {})
    expect(JSON.parse(text(stored))).toContainEqual(expect.objectContaining({ target: member.target, status: 'inactive' }))
    expect(ctx.agentTeams.listMembers(lead)[1]).toMatchObject({ id: childId, name: member.target, status: 'inactive' })
  })

  it('installs the complete scoped schema and shared-checkout policy for roots and teammates', async () => {
    const { ctx, lead } = await setup(['hang'])
    const leadAssembly = await assembly(ctx, lead)
    expect(leadAssembly.tools.map(schema => schema.name).filter(name => TOOL_NAMES.includes(name)).sort())
      .toEqual(TOOL_NAMES)
    const leadPrompt = renderPrompt(leadAssembly)
    expect(leadPrompt).toContain('create teammates only when the user explicitly asks')
    expect(leadPrompt).toContain('FS_STALE_VERSION')
    expect(leadPrompt).toContain('Bash, formatters, code generators, and scripts are not fully protected')
    expect(leadPrompt).toContain('new ready tasks may be assigned to idle executor members')
    expect(leadPrompt).toContain('returns noProgress immediately')
    expect(leadPrompt).toContain('转述为可验证的技术问题')
    expect(leadPrompt).not.toContain('Your Team role')
    expect(renderContextSnapshot(leadAssembly)).toContain('Current Team goal from the user-review log.')

    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'tool-worker',
      description: 'exercise scoped tools',
      prompt: 'stay available',
    })
    expect(spawned.isError, text(spawned)).toBe(false)
    const childId = spawnedChildId(ctx, lead, spawned)
    const child = await waitRunning(ctx, childId)
    const childAssembly = await assembly(ctx, child)
    expect(childAssembly.tools.map(schema => schema.name).filter(name => TOOL_NAMES.includes(name)).sort())
      .toEqual(TOOL_NAMES)
    expect(renderPrompt(childAssembly)).toBe(leadPrompt)
    expect(renderContextSnapshot(childAssembly)).not.toContain('team:identity')
    expect(child.session.deriveMessages().some(message => message.content.some(block =>
      block.type === 'text' && block.text === '<system-reminder>\nYou are teammate "tool-worker".\nYour Team Lead is named "lead".\nUse list_agents({}) to find your teammates and their names.\nTo message your Team Lead, use send_message({ target: "lead", message: "..." }).\nTo message another teammate, use send_message({ target: "<teammate name>", message: "..." }).\n</system-reminder>\n\n'))).toBe(true)
    const initialPrompt = child.session.snapshotEvents().find(event => event.type === 'user/message'
      && event.data.source.kind === 'user')
    expect(initialPrompt?.type === 'user/message'
      ? initialPrompt.data.content.flatMap(block => block.type === 'text' ? [block.text] : [])
      : []).toEqual(['<system-reminder>\nYou are teammate "tool-worker".\nYour Team Lead is named "lead".\nUse list_agents({}) to find your teammates and their names.\nTo message your Team Lead, use send_message({ target: "lead", message: "..." }).\nTo message another teammate, use send_message({ target: "<teammate name>", message: "..." }).\n</system-reminder>\n\n', 'stay available'])

    const denied = await execute(ctx, child, 'spawn_teammate', {
      name: 'nested', description: 'not allowed', prompt: 'no',
    })
    expect(denied.isError).toBe(true)
    expect(text(denied)).toContain('depth cannot exceed 1')
    await execute(ctx, lead, 'interrupt_agent', { target: 'tool-worker' })
    await vi.waitFor(() => { expect(ctx.agents.get(childId)).toBeUndefined() }, { timeout: 5_000 })
  })

  it.each([
    ['fresh', undefined], ['fork', undefined], ['fork', 'in-history'],
  ] as const)('records %s teammate identity with update mode %s and keeps the wire prefix', async (mode, systemPromptUpdate) => {
    const { ctx, lead, adapter } = await setup([textResponse('parent answer'), textResponse('child answer')])
    if (systemPromptUpdate !== undefined) adapter.systemPromptUpdate = systemPromptUpdate
    await runTurn(lead, 'Parent task')
    const parentRequest = serializeRequest(adapter.requests[0]!)
    const parentHistory = structuredClone(lead.session.deriveMessages())
    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reviewer', description: 'review', prompt: 'Review the work', context: mode,
    })
    expect(spawned.isError, text(spawned)).toBe(false)
    const childId = spawnedChildId(ctx, lead, spawned)
    await waitNoAgent(ctx, childId)
    const childRequest = serializeRequest(adapter.requests[1]!)
    expect(childRequest.tools).toEqual(parentRequest.tools)
    expect(childRequest.system).toEqual(parentRequest.system)
    expect(childRequest.system).not.toContain('Your Team role')
    if (mode === 'fork') {
      expect(childRequest.messages.slice(0, parentRequest.messages.length)).toEqual(parentRequest.messages)
      expect(adapter.requests[1]!.messages.slice(0, parentHistory.length)).toEqual(parentHistory)
    } else {
      expect(JSON.stringify(childRequest.messages)).not.toContain('Parent task')
    }
    expect(childRequest.messages.at(-1)?.content.slice(0, 2)).toEqual([
      { type: 'text', text: '<system-reminder>\nYou are teammate "reviewer".\nYour Team Lead is named "lead".\nUse list_agents({}) to find your teammates and their names.\nTo message your Team Lead, use send_message({ target: "lead", message: "..." }).\nTo message another teammate, use send_message({ target: "<teammate name>", message: "..." }).\n</system-reminder>\n\n' },
      { type: 'text', text: 'Review the work' },
    ])
    await using persisted = await ctx.sessionPersistence.open(childId, 'read')
    const { events } = await persisted.read()
    const initial = events.findLast(event => event.type === 'user/message' && event.data.source.kind === 'user')
    expect(initial?.type === 'user/message' ? initial.data.content : []).toEqual([
      { type: 'text', text: '<system-reminder>\nYou are teammate "reviewer".\nYour Team Lead is named "lead".\nUse list_agents({}) to find your teammates and their names.\nTo message your Team Lead, use send_message({ target: "lead", message: "..." }).\nTo message another teammate, use send_message({ target: "<teammate name>", message: "..." }).\n</system-reminder>\n\n' },
      { type: 'text', text: 'Review the work' },
    ])
  })

  it('keeps an ordinary Lead fork free of identity reminders without replacing the inherited prefix', async () => {
    const { ctx, lead, adapter } = await setup([textResponse('parent answer'), textResponse('fork answer')])
    await runTurn(lead, 'Parent task')
    const seed = lead.session.snapshotEvents()
    const childId = SessionId('ordinary-team-fork')
    const handle = await ctx.agents.create({
      sessionId: childId,
      seed,
      inheritedEventCount: SessionLogOffset(seed.length),
      meta: { parentSession: lead.id, isSeeded: true },
      agentOptions: { provider: 'mock', model: 'mock' },
      signal: SIGNAL,
    })
    await runTurn(handle.agent, 'Continue independently')
    const parentRequest = serializeRequest(adapter.requests[0]!)
    const childRequest = serializeRequest(adapter.requests[1]!)
    expect(childRequest.tools).toEqual(parentRequest.tools)
    expect(childRequest.messages.slice(0, parentRequest.messages.length)).toEqual(parentRequest.messages)
    expect(childRequest.messages.at(-1)?.content).toContainEqual({ type: 'text', text: 'Continue independently' })
    expect(JSON.stringify(childRequest.messages)).not.toContain('system-reminder')
    expect(handle.agent.session.snapshotEvents().slice(0, seed.length)).toEqual(seed)
    expect(ctx.agentTeams.listMembers(handle.agent).map(member => member.name)).toEqual(['lead'])
    await handle.dispose()
  })

  it.each([undefined, 'in-history'] as const)('keeps a teammate fork prefix with update mode %s without a Lead correction', async (systemPromptUpdate) => {
    const { ctx, lead, adapter } = await setup([textResponse('review done'), textResponse('lead notified'), textResponse('fork answer')])
    if (systemPromptUpdate !== undefined) adapter.systemPromptUpdate = systemPromptUpdate
    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reviewer', description: 'review', prompt: 'Review the work',
    })
    const teammateId = spawnedChildId(ctx, lead, spawned)
    await waitNoAgent(ctx, teammateId)
    await using persisted = await ctx.sessionPersistence.open(teammateId, 'read')
    const { events: seed } = await persisted.read()
    const handle = await ctx.agents.create({
      sessionId: SessionId('fork-from-teammate'),
      seed,
      inheritedEventCount: SessionLogOffset(seed.length),
      meta: { parentSession: teammateId, isSeeded: true },
      agentOptions: { provider: 'mock', model: 'mock' },
      signal: SIGNAL,
    })
    try {
      const inheritedHistory = structuredClone(handle.agent.session.deriveMessages())
      await runTurn(handle.agent, 'Continue independently')
      const original = serializeRequest(adapter.requests.find(request => request.sessionId === teammateId)!)
      const forkRequest = adapter.requests.find(request => request.sessionId === handle.agent.id)!
      const fork = serializeRequest(forkRequest)
      expect(fork.tools).toEqual(original.tools)
      expect(fork.messages.slice(0, original.messages.length)).toEqual(original.messages)
      expect(forkRequest.messages.slice(0, inheritedHistory.length)).toEqual(inheritedHistory)
      expect(fork.messages.at(-1)?.content).toContainEqual({ type: 'text', text: 'Continue independently' })
      expect(JSON.stringify(fork.messages)).not.toContain('You are the Team Lead')
      expect(handle.agent.session.snapshotEvents().slice(0, seed.length)).toEqual(seed)
    } finally {
      await handle.dispose()
    }
  })

  it('leaves initial identity to ordinary history compaction without reinserting it', async () => {
    const { ctx, lead, adapter } = await setup([
      toolCallResponse('first-list', 'list_agents', {}),
      toolCallResponse('second-list', 'list_agents', {}),
      textResponse('done'),
    ])
    ctx.on('agent/pre-step', async ({ agent, step }, next) => {
      if (step === 3) {
        const identity = agent.session.snapshotEvents().find(event => event.type === 'user/message'
          && event.data.source.kind === 'user')
        if (identity === undefined) throw new Error('expected initial teammate reminder')
        agent.session.append('user/message', createUserMessage({
          content: [{ type: 'text', text: 'Compacted earlier context.' }],
          source: { kind: 'test-compaction' },
        }), {
          surfaceOp: { op: 'replace', startSeq: identity.seq, endSeq: identity.seq },
          sourceEventSeqs: [identity.seq],
        })
      }
      return next()
    })
    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reviewer', description: 'review', prompt: 'Review the work',
    })
    const childId = spawnedChildId(ctx, lead, spawned)
    await waitNoAgent(ctx, childId)
    const reminder = '<system-reminder>\nYou are teammate "reviewer".\nYour Team Lead is named "lead".\nUse list_agents({}) to find your teammates and their names.\nTo message your Team Lead, use send_message({ target: "lead", message: "..." }).\nTo message another teammate, use send_message({ target: "<teammate name>", message: "..." }).\n</system-reminder>\n\n'
    const first = serializeRequest(adapter.requests[0]!).messages
    expect(first.at(-1)?.content.slice(0, 2)).toEqual([{ type: 'text', text: reminder }, { type: 'text', text: 'Review the work' }])
    expect(adapter.requests[1]!.messages.filter(message => message.content.some(block =>
      block.type === 'text' && block.text === reminder))).toHaveLength(1)
    expect(JSON.stringify(serializeRequest(adapter.requests[2]!).messages)).not.toContain('You are teammate')
    await using persisted = await ctx.sessionPersistence.open(childId, 'read')
    const { events } = await persisted.read()
    expect(events.filter(event => event.type === 'user/message'
      && (event.data.source as { readonly kind?: unknown }).kind === toolTeam.name)).toHaveLength(0)
  })

  it.each(['reject', 'empty', 'abort'] as const)('does not revive a teammate step after %s', async (mode) => {
    const { ctx, lead, adapter } = await setup([])
    ctx.on('agent/pre-step', async ({ agent }, next) => {
      const decision = await next()
      if (agent === lead) return decision
      if (mode === 'reject') return { kind: 'reject' }
      if (mode === 'abort') agent.cancel({ kind: 'user' })
      return { kind: 'enter', messages: [] }
    })
    await execute(ctx, lead, 'spawn_teammate', {
      name: 'reviewer', description: 'review', prompt: 'Review the work',
    })
    const childId = SessionId(ctx.agentTeams.listMembers(lead).find(member => member.name === 'reviewer')!.id)
    await waitNoAgent(ctx, childId)
    expect(adapter.requests.filter(request => request.sessionId === childId)).toEqual([])
    await using persisted = await ctx.sessionPersistence.open(childId, 'read')
    const { events } = await persisted.read()
    expect(events.filter(event => event.type === 'user/message'
      && event.data.source.kind === 'user')).toEqual([])
  })

  it('keeps teammate reminders when runtime context is suppressed', async () => {
    const { ctx, lead, adapter } = await setup([textResponse('worker done')])
    ctx.systemPrompt.suppressRuntimeContext()
    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'reviewer', description: 'review', prompt: 'Review the work',
    })
    expect(spawned.isError, text(spawned)).toBe(false)
    await waitNoAgent(ctx, spawnedChildId(ctx, lead, spawned))
    expect(serializeRequest(adapter.requests[0]!).messages.at(-1)?.content).toEqual([
      { type: 'text', text: '<system-reminder>\nYou are teammate "reviewer".\nYour Team Lead is named "lead".\nUse list_agents({}) to find your teammates and their names.\nTo message your Team Lead, use send_message({ target: "lead", message: "..." }).\nTo message another teammate, use send_message({ target: "<teammate name>", message: "..." }).\n</system-reminder>\n\n' },
      { type: 'text', text: 'Review the work' },
    ])
  })

  it('returns actionable no-progress output and renders structured wait cancellation', async () => {
    const inactiveSetup = await setup([textResponse('worker done')])
    const inactiveSpawn = await execute(inactiveSetup.ctx, inactiveSetup.lead, 'spawn_teammate', {
      name: 'inactive-worker', description: 'finish immediately', prompt: 'finish',
    })
    const inactiveId = spawnedChildId(inactiveSetup.ctx, inactiveSetup.lead, inactiveSpawn)
    await waitNoAgent(inactiveSetup.ctx, inactiveId)
    const noProgress = await execute(inactiveSetup.ctx, inactiveSetup.lead, 'wait_agent', { timeout_ms: 3_600_000 })
    expect(noProgress.isError).toBe(false)
    expect(JSON.parse(text(noProgress))).toEqual({
      timedOut: false,
      noProgress: {
        reason: 'no-active-peer',
        message: 'No other Team member is running or provisioning. wait_agent cannot make progress or wake inactive teammates. Re-list with list_agents and team_task_list, then use send_message to wake each required inactive teammate before waiting again.',
      },
    })
    for (const timeout_ms of [9_999, 3_600_001, Number.MAX_SAFE_INTEGER + 1]) {
      const invalid = await execute(inactiveSetup.ctx, inactiveSetup.lead, 'wait_agent', { timeout_ms })
      expect(invalid.isError).toBe(true)
      expect(text(invalid)).toContain('timeoutMs must be an integer from 10000 through 3600000')
    }

    const activeSetup = await setup(['hang'])
    const activeSpawn = await execute(activeSetup.ctx, activeSetup.lead, 'spawn_teammate', {
      name: 'active-worker', description: 'stay active', prompt: 'wait',
    })
    const activeId = spawnedChildId(activeSetup.ctx, activeSetup.lead, activeSpawn)
    await waitRunning(activeSetup.ctx, activeId)
    const controller = new AbortController()
    const waiting = execute(activeSetup.ctx, activeSetup.lead, 'wait_agent', { timeout_ms: 10_000 }, controller.signal)
    await new Promise(resolve => setTimeout(resolve, 0))
    controller.abort({ kind: 'user' })
    const aborted = await waiting
    expect(aborted.isError).toBe(true)
    expect(text(aborted)).toBe("Error: wait_agent aborted: { kind: 'user' }")
    await execute(activeSetup.ctx, activeSetup.lead, 'interrupt_agent', { target: 'active-worker' })
    await waitNoAgent(activeSetup.ctx, activeId)
  })

  it('reports reciprocal waits while a separate working grandchild remains runnable', async () => {
    const { ctx, lead } = await setup(['hang', 'hang', 'hang'], false, {}, { maxDepth: 2 })
    const parentSpawn = await execute(ctx, lead, 'spawn_teammate', {
      name: 'waiting-parent', description: 'wait for review', prompt: 'work',
    })
    const parentId = spawnedChildId(ctx, lead, parentSpawn)
    const parent = await waitRunning(ctx, parentId)
    const grandchildSpawn = await execute(ctx, parent, 'spawn_teammate', {
      name: 'working-grandchild', description: 'external work', prompt: 'work',
    })
    const grandchildId = spawnedChildId(ctx, lead, grandchildSpawn)
    await waitRunning(ctx, grandchildId)
    const controller = new AbortController()
    const parentWait = execute(ctx, parent, 'wait_agent', { timeout_ms: 10_000 }, controller.signal)
    const activity = Reflect.get(ctx.agentTeams, 'activity') as {
      isWaiting(teamId: string, memberId: SessionId): boolean
    }
    await vi.waitFor(() => {
      expect(activity.isWaiting(String(lead.id), parentId)).toBe(true)
    })
    expect(ctx.agentTeams.waitReadiness(lead)).toBeUndefined()
    controller.abort(new Error('return parent to work'))
    expect((await parentWait).isError).toBe(true)
    ctx.agentTeams.interrupt(lead, 'working-grandchild')
    ctx.agentTeams.interrupt(lead, 'waiting-parent')

    const { ctx: mutualCtx, lead: mutualLead } = await setup(['hang', 'hang'])
    const spawned = await execute(mutualCtx, mutualLead, 'spawn_teammate', {
      name: 'mutual-worker', description: 'wait for lead', prompt: 'work',
    })
    const workerId = spawnedChildId(mutualCtx, mutualLead, spawned)
    const worker = await waitRunning(mutualCtx, workerId)
    mutualLead.followup(createUserMessage({ content: [{ type: 'text', text: 'lead work' }], source: { kind: 'user' } }))
    await waitRunning(mutualCtx, mutualLead.id)
    const mutualAbort = new AbortController()
    const workerWait = execute(mutualCtx, worker, 'wait_agent', { timeout_ms: 10_000 }, mutualAbort.signal)
    const mutualActivity = Reflect.get(mutualCtx.agentTeams, 'activity') as {
      isWaiting(teamId: string, memberId: SessionId): boolean
    }
    await vi.waitFor(() => {
      expect(mutualActivity.isWaiting(String(mutualLead.id), workerId)).toBe(true)
      expect(mutualCtx.agentTeams.waitReadiness(mutualLead)?.reason).toBe('all-peers-waiting')
    })
    const leadWait = await execute(mutualCtx, mutualLead, 'wait_agent', { timeout_ms: 10_000 })
    expect(JSON.parse(text(leadWait))).toMatchObject({ timedOut: false, noProgress: { reason: 'all-peers-waiting' } })
    mutualAbort.abort(new Error('return worker to work'))
    expect((await workerWait).isError).toBe(true)
    await execute(mutualCtx, mutualLead, 'interrupt_agent', { target: 'mutual-worker' })
    await waitNoAgent(mutualCtx, workerId)
    mutualLead.cancel({ kind: 'parent' })
    await mutualLead.whenIdle()
  })

  it('adapts roster, mailbox, wait, and task CAS operations to canonical JSON', async () => {
    const { ctx, lead } = await setup(['hang', textResponse('lead received wakeup')])
    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'json-worker', description: 'json worker', prompt: 'wait', context: 'fresh',
    })
    const childId = spawnedChildId(ctx, lead, spawned)
    const child = await waitRunning(ctx, childId)

    const roster = await execute(ctx, child, 'list_agents', {})
    expect(JSON.parse(text(roster))).toMatchObject([
      { target: 'lead', role: 'lead' },
      { target: 'json-worker', role: 'teammate' },
    ])
    // Every Team result reaches the model as compact JSON: indentation would
    // spend tokens on every roster, task, and receipt without adding meaning.
    expect(text(roster)).toBe(JSON.stringify(JSON.parse(text(roster))))
    const peer = await execute(ctx, child, 'send_message', { target: 'lead', message: 'progress report' })
    expect(peer.isError).toBe(false)
    expect(JSON.parse(text(peer))).toMatchObject({ status: 'accepted' })
    const followup = await execute(ctx, child, 'send_message', { target: 'lead', message: 'review the report' })
    expect(followup.isError).toBe(false)
    expect(JSON.parse(text(followup))).toMatchObject({ status: 'accepted' })
    await lead.whenIdle()

    const created = await execute(ctx, lead, 'team_task_create', {
      subject: 'tool task',
      description: 'created through tool',
      blocked_by: [],
      write_scopes: ['src/team'],
    })
    const task = JSON.parse(text(created)) as { id: string; revision: number }
    const listed = await execute(ctx, child, 'team_task_list', { ready: true, limit: 1 })
    expect(JSON.parse(text(listed))).toMatchObject({ tasks: [{ id: task.id, ready: true }] })
    const read = await execute(ctx, child, 'team_task_get', { task_id: task.id })
    expect(JSON.parse(text(read))).toMatchObject({ id: task.id, revision: 1 })
    const claimed = await execute(ctx, child, 'team_task_update', {
      task_id: task.id,
      expected_revision: task.revision,
      action: 'claim',
    })
    expect(JSON.parse(text(claimed))).toMatchObject({ status: 'in_progress', ownerName: 'json-worker' })
    const stale = await execute(ctx, lead, 'team_task_update', {
      task_id: task.id,
      expected_revision: task.revision,
      action: 'delete',
    })
    expect(stale.isError).toBe(true)
    expect(text(stale)).toContain('stale team task')

    const wait = execute(ctx, lead, 'wait_agent', { timeout_ms: 10_000 })
    const completedCall = new Promise<Awaited<ReturnType<typeof execute>>>((resolve, reject) => {
      setTimeout(() => {
        void execute(ctx, child, 'team_task_update', {
          task_id: task.id,
          expected_revision: 2,
          action: 'complete',
        }).then(resolve, reject)
      }, 0)
    })
    await expect(wait).resolves.toMatchObject({ isError: false })
    expect((await completedCall).isError).toBe(false)

    const childInterrupt = await execute(ctx, child, 'interrupt_agent', { target: 'json-worker' })
    expect(childInterrupt.isError).toBe(true)
    await execute(ctx, lead, 'interrupt_agent', { target: 'json-worker' })
    await vi.waitFor(() => { expect(ctx.agents.get(childId)).toBeUndefined() }, { timeout: 5_000 })
  })

  it('adapts optional task filters, mutations, pagination, and default waiting', async () => {
    const { ctx, lead } = await setup(['hang'])
    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'fork-worker', description: 'fork worker', prompt: 'stay active', context: 'fork',
    })
    const childId = spawnedChildId(ctx, lead, spawned)
    await waitRunning(ctx, childId)

    const firstResult = await execute(ctx, lead, 'team_task_create', {
      subject: 'first', description: 'first task',
    })
    const secondResult = await execute(ctx, lead, 'team_task_create', {
      subject: 'second', description: 'second task',
    })
    const first = JSON.parse(text(firstResult)) as { id: string; revision: number }
    const second = JSON.parse(text(secondResult)) as { id: string; revision: number }
    const claimed = await execute(ctx, lead, 'team_task_update', {
      task_id: first.id, expected_revision: first.revision, action: 'claim',
    })
    const claim = JSON.parse(text(claimed)) as { revision: number }

    expect(JSON.parse(text(await execute(ctx, lead, 'team_task_list', {
      status: 'in_progress', owner: 'lead', cursor: 0, limit: 1,
    })))).toMatchObject({ tasks: [{ id: first.id }] })
    expect(JSON.parse(text(await execute(ctx, lead, 'team_task_list', {
      owner: 'unowned', limit: 1,
    })))).toMatchObject({ tasks: [{ id: second.id }] })
    expect(JSON.parse(text(await execute(ctx, lead, 'team_task_list', {
      cursor: 0, limit: 1,
    })))).toMatchObject({ nextCursor: 1 })
    expect(JSON.parse(text(await execute(ctx, lead, 'team_task_list', {
      cursor: 1,
    })))).not.toHaveProperty('nextCursor')
    expect((await execute(ctx, lead, 'team_task_list', { cursor: -1 })).isError).toBe(true)
    expect((await execute(ctx, lead, 'team_task_list', { limit: 101 })).isError).toBe(true)

    const edited = await execute(ctx, lead, 'team_task_update', {
      task_id: first.id,
      expected_revision: claim.revision,
      action: 'edit',
      subject: 'edited',
      description: 'edited description',
      write_scopes: ['src/team'],
    })
    const edit = JSON.parse(text(edited)) as { revision: number }
    const dependencies = await execute(ctx, lead, 'team_task_update', {
      task_id: first.id,
      expected_revision: edit.revision,
      action: 'set_dependencies',
      blocked_by: [second.id],
    })
    expect(dependencies.isError).toBe(false)
    const dependency = JSON.parse(text(dependencies)) as { revision: number }
    expect((await execute(ctx, lead, 'team_task_update', {
      task_id: first.id,
      expected_revision: dependency.revision,
      action: 'reassign',
      owner: 'fork-worker',
    })).isError).toBe(true)

    const wait = execute(ctx, lead, 'wait_agent', {})
    const wake = new Promise<Awaited<ReturnType<typeof execute>>>((resolve, reject) => {
      setTimeout(() => {
        void execute(ctx, lead, 'team_task_create', {
          subject: 'wake', description: 'wake default wait',
        }).then(resolve, reject)
      }, 0)
    })
    expect((await wait).isError).toBe(false)
    expect((await wake).isError).toBe(false)

    await execute(ctx, lead, 'interrupt_agent', { target: 'fork-worker' })
    await vi.waitFor(() => { expect(ctx.agents.get(childId)).toBeUndefined() }, { timeout: 5_000 })
  })

  it('removes and reinstalls every scoped registration across plugin HMR without stopping the child', async () => {
    const { ctx, lead, fiber } = await setup(['hang'])
    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'hmr-worker', description: 'hmr worker', prompt: 'wait',
    })
    const childId = spawnedChildId(ctx, lead, spawned)
    const child = await waitRunning(ctx, childId)

    await fiber.dispose()
    expect((await assembly(ctx, lead)).tools.map(schema => schema.name).some(name => TOOL_NAMES.includes(name))).toBe(false)
    expect((await assembly(ctx, child)).tools.map(schema => schema.name).some(name => TOOL_NAMES.includes(name))).toBe(false)
    expect(ctx.agents.get(childId)).toBe(child)

    const replacement = await ctx.plugin(toolTeam)
    expect((await assembly(ctx, lead)).tools.map(schema => schema.name).filter(name => TOOL_NAMES.includes(name)).sort())
      .toEqual(TOOL_NAMES)
    expect((await assembly(ctx, child)).tools.map(schema => schema.name).filter(name => TOOL_NAMES.includes(name)).sort())
      .toEqual(TOOL_NAMES)
    await execute(ctx, lead, 'interrupt_agent', { target: 'hmr-worker' })
    await vi.waitFor(() => { expect(ctx.agents.get(childId)).toBeUndefined() }, { timeout: 5_000 })
    await replacement.dispose()
  })

  it('restores scoped tools for a live Lead after the Team service reloads', async () => {
    const { ctx, lead, teamFiber } = await setup([], false, {}, {}, true)
    expect((await assembly(ctx, lead)).tools.map(schema => schema.name).filter(name => TOOL_NAMES.includes(name)).sort())
      .toEqual(TOOL_NAMES)

    await teamFiber.dispose()
    expect((await assembly(ctx, lead)).tools.map(schema => schema.name).filter(name => TOOL_NAMES.includes(name)))
      .toEqual([])

    await ctx.plugin(TeamService)
    expect(ctx.agentTeams.tryMembership(lead)?.role).toBe('lead')
    expect((await assembly(ctx, lead)).tools.map(schema => schema.name).filter(name => TOOL_NAMES.includes(name)).sort())
      .toEqual(TOOL_NAMES)
  })

  it('keeps Team tools on an independent seeded fork after its parent Team state fails', async () => {
    const { ctx, lead } = await setup([])
    const member = {
      id: SessionId('identity-member'), parentId: lead.id, name: 'identity-member',
      description: 'review', provider: 'spawn', context: 'fresh' as const, phase: 'provisioning' as const,
    }
    lead.session.append('team/member', { version: 2, teamId: TeamId(lead.id), member })
    lead.session.append('team/member', { version: 2, teamId: TeamId(lead.id),
      member: { ...member, model: 'changed' } })
    await ctx.sessions.flush(lead.session)
    const fork = await ctx.agents.create({
      sessionId: SessionId('independent-seeded-fork'),
      seed: lead.session.snapshotEvents(),
      inheritedEventCount: SessionLogOffset(lead.session.seq),
      meta: { parentSession: lead.id, isSeeded: true, delegationDepth: 0 },
      agentOptions: { provider: 'mock', model: 'mock' },
    })
    await fork.dispose()

    const resumed = (await ctx.agents.resume({ resumeSessionId: SessionId('independent-seeded-fork') })).agent
    expect(resumed.session.snapshotEvents().at(-1)?.type).toBe('session/end-seed')
    expect(ctx.agentTeams.tryMembership(resumed)?.role).toBe('lead')
    expect((await assembly(ctx, resumed)).tools.map(schema => schema.name).filter(name => TOOL_NAMES.includes(name)).sort())
      .toEqual(TOOL_NAMES)
  })

  it('does not lose scoped tools when only a seeded Lead has invalid Team history', async () => {
    const { ctx } = await setup([])
    const parent = await ctx.agents.create({ sessionId: SessionId('beluga-parent'),
      meta: { agentPreset: 'beluga' }, agentOptions: { provider: 'mock', model: 'mock' } })
    const child = await ctx.agents.create({
      sessionId: SessionId('whale-cordis-child'),
      seed: parent.agent.session.snapshotEvents(),
      inheritedEventCount: SessionLogOffset(parent.agent.session.seq),
      meta: { parentSession: parent.agent.id, isSeeded: true, delegationDepth: 0, agentPreset: 'whale-cordis' },
      agentOptions: { provider: 'mock', model: 'mock' },
    })
    const member = { id: SessionId('own-identity-member'), parentId: child.agent.id,
      name: 'own-identity-member', description: 'review', provider: 'spawn',
      context: 'fresh' as const, phase: 'provisioning' as const }
    child.agent.session.append('team/member', { version: 2, teamId: TeamId(child.agent.id), member })
    child.agent.session.append('team/member', { version: 2, teamId: TeamId(child.agent.id),
      member: { ...member, model: 'changed' } })
    await ctx.sessions.flush(child.agent.session)
    await child.dispose()

    const resumed = (await ctx.agents.resume({ resumeSessionId: SessionId('whale-cordis-child') })).agent
    expect(resumed.session.snapshotEvents().at(-1)?.type).toBe('session/end-seed')
    expect(ctx.agentTeams.tryMembership(resumed)?.role).toBe('lead')
    expect(ctx.tools.get('spawn_teammate', resumed)).toBeDefined()
    await expect(assembly(ctx, resumed)).rejects.toThrow('changed immutable identity fields')
  })

  it('shadows legacy global control names only inside Team member scopes', async () => {
    const { ctx, lead, fiber } = await setup([], true)
    const teamSchema = (await assembly(ctx, lead)).tools.find(schema => schema.name === 'send_message')
    expect(JSON.stringify(teamSchema)).toContain('target')
    expect(JSON.stringify(teamSchema)).not.toContain('subagent_id')

    await fiber.dispose()
    const legacySchema = (await assembly(ctx, lead)).tools.find(schema => schema.name === 'send_message')
    expect(JSON.stringify(legacySchema)).toContain('agent_id')
  })

  it('keeps ordinary mode controls while an enabled mode uses Team controls', async () => {
    const { ctx, lead, fiber } = await setup([], true, {}, { enabledPresets: ['ol'] })
    const ordinary = await assembly(ctx, lead)
    expect(ordinary.tools.some(schema => schema.name === 'spawn_teammate')).toBe(false)
    expect(JSON.stringify(ordinary.tools.find(schema => schema.name === 'send_message'))).toContain('agent_id')
    const selected = await ctx.agents.create({
      sessionId: SessionId('ol-tool-root'), meta: { agentPreset: 'ol' },
      agentOptions: { provider: 'mock', model: 'mock' },
    })
    const enabled = await assembly(ctx, selected.agent)
    expect(enabled.tools.some(schema => schema.name === 'spawn_teammate')).toBe(true)
    expect(JSON.stringify(enabled.tools.find(schema => schema.name === 'send_message'))).toContain('target')
    await fiber.dispose()
    for (const agent of [lead, selected.agent]) {
      const restored = await assembly(ctx, agent)
      expect(restored.tools.some(schema => schema.name === 'spawn_teammate')).toBe(false)
      expect(JSON.stringify(restored.tools.find(schema => schema.name === 'send_message'))).toContain('agent_id')
    }
  })

  it('follows a blank session mode change using its live preset binding', async () => {
    const { ctx, lead } = await setup([], true, {}, { enabledPresets: ['ol'] })
    ctx.baseUrl = new URL('./fixtures/', import.meta.url).href
    if (ctx.get('loader') === undefined) await ctx.plugin(Loader)
    ctx.loader.builtins.group = Group
    await ctx.plugin(AgentPresets, { default: 'ordinary' })
    for (const id of ['ordinary', 'ol']) {
      await ctx.plugin({
        inject: ['agentPresets'],
        async* apply(child: Context) { yield await child.agentPresets.register({ id, plugins: [] }) },
      })
    }
    await ctx.agentPresets.mount(lead.ctx, 'ordinary')
    expect((await assembly(ctx, lead)).tools.some(schema => schema.name === 'spawn_teammate')).toBe(false)
    await ctx.agentPresets.select(lead, 'ol')
    expect(ctx.agentTeams.membership(lead).role).toBe('lead')
    expect((await assembly(ctx, lead)).tools.some(schema => schema.name === 'spawn_teammate')).toBe(true)
    await ctx.agentPresets.select(lead, 'ordinary')
    expect(ctx.agentTeams.tryMembership(lead)).toBeUndefined()
    const ordinary = await assembly(ctx, lead)
    expect(ordinary.tools.some(schema => schema.name === 'spawn_teammate')).toBe(false)
    expect(JSON.stringify(ordinary.tools.find(schema => schema.name === 'send_message'))).toContain('agent_id')
  })

  it('rolls back partial scoped installation after a same-scope collision', async () => {
    const { ctx, lead, fiber } = await setup([])
    await fiber.dispose()
    lead.ctx.tools.register(defineContentToolFixture({
      name: 'spawn_teammate',
      description: 'intentional collision',
      parameters: {},
      async execute() { return [{ type: 'text', text: 'collision' }] },
    }))

    await expect(ctx.plugin(toolTeam)).rejects.toThrow(/already registered/u)
    const assembled = await assembly(ctx, lead)
    expect(assembled.tools.filter(schema => TOOL_NAMES.includes(schema.name)).map(schema => schema.name))
      .toEqual(['spawn_teammate'])
    expect(renderContextSnapshot(assembled)).not.toContain('Your Team role is lead')
  })

  it('resolves direct-apply defaults without Loader schema normalization', async () => {
    const { ctx, lead, fiber } = await setup([textResponse('ordinary child')])
    await fiber.dispose()
    toolTeam.apply(ctx, {})
    expect((await assembly(ctx, lead)).tools.map(schema => schema.name).filter(name => TOOL_NAMES.includes(name)).sort())
      .toEqual(TOOL_NAMES)
    const ordinary = await ctx.subagents.startActivation({ delivery: 'caller',
      provider: 'spawn',
      label: 'ordinary child',
      request: { prompt: [{ type: 'text', text: 'finish' }], parent: lead },
      signal: SIGNAL,
    })
    await vi.waitFor(() => { expect(ctx.agents.get(ordinary.childId)).toBeUndefined() }, { timeout: 5_000 })
  })

  it('reinstalls Team scope before a cold-resumed teammate request', async () => {
    const { ctx, lead, adapter } = await setup([textResponse('first'), 'hang'])
    const spawned = await execute(ctx, lead, 'spawn_teammate', {
      name: 'cold-worker', description: 'cold worker', prompt: 'finish once',
    })
    const childId = spawnedChildId(ctx, lead, spawned)
    await vi.waitFor(() => { expect(ctx.agents.get(childId)).toBeUndefined() }, { timeout: 5_000 })
    expect(await ctx.subagents.listChildren(lead.id)).toContainEqual(expect.objectContaining({
      id: childId,
      mode: 'continuable',
    }))
    expect(adapter.requests.filter(request => request.sessionId === lead.id)).toHaveLength(0)

    const receipt = await ctx.agentTeams.sendMessage(lead, {
      target: 'cold-worker',
      content: [{ type: 'text', text: 'resume with Team scope' }],
      signal: SIGNAL,
    })
    expect(receipt.status).toBe('accepted')
    const resumed = await waitRunning(ctx, childId)
    expect((await assembly(ctx, resumed)).tools.map(schema => schema.name)
      .filter(name => TOOL_NAMES.includes(name)).sort()).toEqual(TOOL_NAMES)
    expect(renderContextSnapshot(await assembly(ctx, resumed))).not.toContain('You are teammate')
    const childRequests = () => adapter.requests.filter(request => request.messages.some(message => message.role === 'user'
      && message.content.some(block => block.type === 'text' && block.text.includes('You are teammate "cold-worker".'))))
    await vi.waitFor(() => { expect(childRequests()).toHaveLength(2) })
    const firstMessages = childRequests()[0]!.messages
    expect(childRequests()[1]!.messages.slice(0, firstMessages.length)).toEqual(firstMessages)
    expect(resumed.session.snapshotEvents().filter(event => event.type === 'user/message'
      && event.data.source.kind === 'user')).toHaveLength(1)
    await execute(ctx, lead, 'interrupt_agent', { target: 'cold-worker' })
    await vi.waitFor(() => { expect(ctx.agents.get(childId)).toBeUndefined() }, { timeout: 5_000 })
  })

  it('fails safely without a calling Agent and has the function-plugin export shape', async () => {
    const { ctx } = await setup([])
    const result = await execute(ctx, undefined, 'list_agents', {})
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('unknown tool "list_agents"')
    expect('default' in toolTeam).toBe(false)
    expect(toolTeam.name).toBe('tool-agent-team')
    expect(toolTeam.inject).toEqual(['agents', 'agentTeams', 'tools', 'systemPrompt', 'llm', 'subagents'])
  })

  it('uses configured fresh and fork provider names', async () => {
    const { ctx, lead, fiber } = await setup([textResponse('custom')])
    await fiber.dispose()
    await ctx.plugin(SubagentSpawn, { providerName: 'team-fresh' })
    await ctx.plugin(toolTeam, { freshProvider: 'team-fresh', forkProvider: 'fork' })
    const result = await execute(ctx, lead, 'spawn_teammate', {
      name: 'custom-provider', description: 'custom provider', prompt: 'go',
    })
    expect(result.isError).toBe(false)
    const childId = spawnedChildId(ctx, lead, result)
    await vi.waitFor(() => { expect(ctx.agents.get(childId)).toBeUndefined() }, { timeout: 5_000 })
    expect(ctx.agentTeams.listMembers(lead)[1]).toMatchObject({ provider: 'team-fresh' })
  })
})
