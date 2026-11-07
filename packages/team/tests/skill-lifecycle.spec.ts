import { mountTeamTestSubagents } from '../../agent-team/tests/subagent-fixture.ts'
/** Retired Team skill bodies leave real model requests while the Session log retains them. */
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import * as JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as SubagentFork from '@deepseek-ai/dsh-subagent-fork-in-process'
import * as SubagentSpawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
import TeamService from '@deepseek-ai/dsh-experimental-agent-team'
import UserQuestions from '@deepseek-ai/dsh-user-questions'
import { MockAdapter, textResponse, toolCallResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'
import { TestSessionQuery } from '../../agent-team/tests/test-session-query.ts'
import * as WorkSkills from '../src/index.ts'
import { readBundledSkill } from '../src/reader.ts'
import { resolveTeamSkill } from '../src/reader.ts'

const contexts: Context[] = []
const roots: string[] = []
const signal = new AbortController().signal

it('pins portable mode resources and rejects missing or external resources before selection', async () => {
  const { ctx, agent } = await setup()
  const resourceRoot = mkdtempSync(join(tmpdir(), 'dsh-mode-resources-'))
  roots.push(resourceRoot)
  writeFileSync(join(resourceRoot, 'reference.md'), 'Portable reference evidence')
  agent.ctx.get('skills')!.register({ name: 'mode-resource', provider: 'fixture', description: 'Mode resource',
    source: 'preset', resourceBase: { kind: 'directory', path: resourceRoot }, content: 'Read [method](reference.md).' })
  const selected = await resolveTeamSkill(ctx, agent, 'mode-resource', signal, 4096)
  expect(selected.content).toContain('Portable reference evidence')
  expect(selected.content).not.toContain(resourceRoot)
  rmSync(join(resourceRoot, 'reference.md'))
  await expect(resolveTeamSkill(ctx, agent, 'mode-resource', signal, 4096)).rejects.toThrow('缺少资源')
  agent.ctx.get('skills')!.register({ name: 'mode-external', provider: 'fixture', description: 'External dependency',
    source: 'preset', resourceBase: { kind: 'directory', path: resourceRoot }, content: 'Read `../tool-index.md`.' })
  await expect(resolveTeamSkill(ctx, agent, 'mode-external', signal, 4096)).rejects.toThrow('依赖包外资源')
})

afterEach(async () => {
  for (const ctx of contexts.splice(0).reverse()) await ctx.fiber.dispose()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

async function setup(
  script: ConstructorParameters<typeof MockAdapter>[0] = Array.from({ length: 8 }, () => textResponse('done')),
  existingRoot?: string,
  config: WorkSkills.Config = {},
) {
  const ctx = new Context()
  contexts.push(ctx)
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(SkillRegistry)
  const storageRoot = existingRoot ?? mkdtempSync(join(tmpdir(), 'dsh-team-skills-'))
  if (existingRoot === undefined) roots.push(storageRoot)
  await ctx.plugin(JsonlSessionPersistence, { root: storageRoot })
  await ctx.plugin(TestSessionQuery)
  await ctx.plugin(AgentLoop, { agents: [] })
  await mountTeamTestSubagents(ctx)
  await ctx.plugin(SubagentSpawn, { providerName: 'spawn' })
  await ctx.plugin(SubagentFork, { providerName: 'fork' })
  const teamFiber = await ctx.plugin(TeamService, { portableEventEnvelope: true })
  await ctx.plugin(UserQuestions)
  await ctx.plugin(WorkSkills, config)
  const adapter = new MockAdapter(script)
  ctx.llm.registerAdapter(['mock'], adapter)
  const agent = existingRoot === undefined
    ? await ctx.agentLoop.create(SessionId('skill-lifecycle'), { provider: 'mock', model: 'mock' })
    : (await ctx.agents.resume({ resumeSessionId: SessionId('skill-lifecycle'),
      agentOptions: { provider: 'mock', model: 'mock' } })).agent
  ctx.systemPrompt.context({ name: 'unrelated', order: 1, text: 'Unrelated live context.' })
  return { ctx, agent, adapter, storageRoot, teamFiber }
}

async function send(ctx: Context, agent: Agent, text: string): Promise<void> {
  const idle = new Promise<void>((resolve) => {
    const dispose = ctx.on('agent/status', ({ agent: subject, status }) => {
      if (subject === agent && status === 'idle') { dispose(); resolve() }
    })
  })
  agent.followup(createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }))
  await idle
}

function requestText(adapter: MockAdapter, index: number): string {
  return adapter.requests[index]!.messages.flatMap(message => message.content)
    .flatMap(block => block.type === 'text' ? [block.text] : []).join('\n')
}

describe('Team skill execution context', () => {
  it('blocks a retained Team when its runtime unloads and continues after it is restored', async () => {
    const { ctx, agent, adapter, teamFiber } = await setup()
    const task = await ctx.agentTeams.createTask(agent, { subject: 'Retain fixture', description: 'Do not repeat work' })
    await teamFiber.dispose()
    await send(ctx, agent, 'Continue the retained fixture')
    expect(adapter.requests).toHaveLength(0)
    expect(JSON.stringify(agent.session.snapshotEvents())).toContain('Team runtime is unavailable')
    await ctx.plugin(TeamService, { portableEventEnvelope: true })
    expect(ctx.agentTeams.getTask(agent, task.id).subject).toBe('Retain fixture')
    await send(ctx, agent, 'Continue after restoring the runtime')
    expect(adapter.requests).toHaveLength(1)
  })
  it('uses a same-name mode override for direct reads, member preparation and saved selections', async () => {
    const { ctx, agent } = await setup()
    agent.ctx.get('skills')!.register({ name: 'team-fiction-craft', description: 'Mode-owned fiction method', source: 'preset',
      content: 'MODE_FICTION_OVERRIDE' })
    const resolved = await resolveTeamSkill(ctx, agent, 'team-fiction-craft', signal)
    expect(resolved.content).toContain('MODE_FICTION_OVERRIDE')
    const prepared = await ctx.waterfall('team/resolve-skill', { agent, name: 'team-fiction-craft', signal },
      () => Promise.reject(new Error('skill resolver was not called')))
    expect(prepared).toEqual(resolved)
    const read = await ctx.tools.execute({ name: 'team_skill', arguments: { name: 'team-fiction-craft' },
      callId: ToolCallId('mode-override-read'), agent, signal })
    expect(read.value).toEqual(resolved)
    const selection = await ctx.tools.execute({ name: 'team_skills', arguments: { expected_revision: 0,
      skills: [{ name: 'team-fiction-craft', purpose: 'Use the existing mode method' }] },
    callId: ToolCallId('mode-override-selection'), agent, signal })
    expect(selection.isError).toBe(false)
    expect(ctx.agentTeams.getSkillContent(agent, 'team-fiction-craft')?.content).toBe(resolved.content)
  })

  it('keeps disabled mode overrides out of the catalog and rejects their saved selection', async () => {
    const { ctx, agent } = await setup()
    agent.ctx.get('skills')!.register({ name: 'team-fiction-craft', description: 'User-only method', source: 'preset',
      content: 'HUMAN_ONLY', invocation: { modelInvocable: false, userInvocable: true } })
    const catalog = await ctx.tools.execute({ name: 'team_skill_catalog', arguments: { query: 'team-fiction-craft' },
      callId: ToolCallId('hidden-mode-override'), agent, signal })
    expect(catalog.value).not.toContain('team-fiction-craft')
    await expect(resolveTeamSkill(ctx, agent, 'team-fiction-craft', signal)).rejects.toThrow('当前模式没有')
  })

  it('applies the same bundled document limit to member preparation and later selection', async () => {
    const { ctx, agent } = await setup(undefined, undefined, { maxReferenceBytes: 100 })
    await expect(ctx.waterfall('team/resolve-skill', { agent, name: 'team-fiction-craft', signal },
      () => Promise.reject(new Error('skill resolver was not called')))).rejects.toThrow('超过 100 字节')
    const selection = await ctx.tools.execute({ name: 'team_skills', arguments: { expected_revision: 0,
      skills: [{ name: 'team-fiction-craft', purpose: 'Read a bounded document' }] },
    callId: ToolCallId('bounded-skill-selection'), agent, signal })
    expect(selection.isError).toBe(true)
    expect(JSON.stringify(selection.content)).toContain('超过 100 字节')
    expect(ctx.agentTeams.getSkills(agent).revision).toBe(0)
  })

  it('pins an existing mode skill by exact name without changing the mode registry', async () => {
    const { ctx, agent, adapter } = await setup()
    agent.ctx.get('skills')!.register({ name: 'mode-fixture', description: 'Existing mode method', source: 'preset',
      content: 'MODE_SKILL_UNIQUE_INSTRUCTIONS' })
    const resolved = await resolveTeamSkill(ctx, agent, 'mode-fixture', signal)
    const prepared = await ctx.waterfall('team/resolve-skill', { agent, name: 'mode-fixture', signal },
      () => Promise.reject(new Error('mode skill resolver was not called')))
    expect(prepared).toEqual(resolved)
    expect(resolved.content).toContain('MODE_SKILL_UNIQUE_INSTRUCTIONS')
    expect(resolved.content).toContain('skill_content name="mode-fixture"')
    const directRead = await ctx.tools.execute({ name: 'team_skill', arguments: { name: 'mode-fixture' },
      callId: ToolCallId('read-mode-fixture'), agent, signal })
    expect(directRead.isError).not.toBe(true)
    expect(JSON.stringify(directRead.content)).toContain('MODE_SKILL_UNIQUE_INSTRUCTIONS')
    const choice = await ctx.tools.execute({ name: 'team_skills', arguments: { expected_revision: 0,
      skills: [{ name: 'mode-fixture', purpose: 'Inspect the local fixture' }] },
    callId: ToolCallId('select-mode-fixture'), agent, signal })
    expect(choice.isError).not.toBe(true)
    expect(ctx.agentTeams.getSkills(agent).skills).toMatchObject([{ name: 'mode-fixture', digest: resolved.digest }])
    await send(ctx, agent, 'use mode fixture')
    expect(requestText(adapter, 0)).toContain('MODE_SKILL_UNIQUE_INSTRUCTIONS')
    expect((await ctx.skills.get('mode-fixture', { scope: agent }))?.content).toBe('MODE_SKILL_UNIQUE_INSTRUCTIONS')
    expect(await ctx.skills.get('mode-fixture')).toBeUndefined()
    expect(ctx.agentTeams.getSkillContent(agent, 'mode-fixture')?.content).toBe(resolved.content)
    await expect(resolveTeamSkill(ctx, agent, 'missing-mode-skill', signal)).rejects.toThrow('当前模式没有')
    agent.ctx.get('skills')!.register({ name: 'human-only-fixture', description: 'Human only', source: 'preset',
      content: 'Do not hand this to a model.', invocation: { modelInvocable: false, userInvocable: true } })
    await expect(resolveTeamSkill(ctx, agent, 'human-only-fixture', signal)).rejects.toThrow('当前模式没有')
  })
  it('removes A after replacing it with B and after clearing B, without removing unrelated context or original events', async () => {
    const { ctx, agent, adapter } = await setup()
    const a = { name: 'team-a', content: 'UNIQUE_SKILL_A_BODY', digest: createHash('sha256').update('UNIQUE_SKILL_A_BODY').digest('hex'), purpose: 'Use A' }
    const b = { name: 'team-b', content: 'UNIQUE_SKILL_B_BODY', digest: createHash('sha256').update('UNIQUE_SKILL_B_BODY').digest('hex'), purpose: 'Use B' }
    await ctx.agentTeams.selectSkills(agent, { expectedRevision: 0, skills: [a] }, signal)
    await send(ctx, agent, 'first')
    expect(requestText(adapter, 0)).toContain(a.content)
    await ctx.agentTeams.selectSkills(agent, { expectedRevision: 1, skills: [b] }, signal)
    await send(ctx, agent, 'second')
    expect(requestText(adapter, 1)).not.toContain(a.content)
    expect(requestText(adapter, 1)).toContain(b.content)
    expect(requestText(adapter, 1)).toContain('Unrelated live context.')
    await ctx.agentTeams.selectSkills(agent, { expectedRevision: 2, skills: [] }, signal)
    await send(ctx, agent, 'third')
    expect(requestText(adapter, 2)).not.toContain(a.content)
    expect(requestText(adapter, 2)).not.toContain(b.content)
    expect(requestText(adapter, 2)).toContain('Unrelated live context.')
    expect(JSON.stringify(agent.session.snapshotEvents())).toContain(a.content)
    expect(JSON.stringify(agent.session.snapshotEvents())).toContain(b.content)
  })

  it('shows a directly read body once after selecting the same saved module and preserves its call/result pair', async () => {
    const name = 'team-android-fingerprint'
    const skill = await readBundledSkill(name, signal)
    const { ctx, agent, adapter } = await setup([
      toolCallResponse('read-skill', 'team_skill', { name }), textResponse('read complete'), textResponse('selected'),
    ])
    await send(ctx, agent, 'read skill')
    expect(requestText(adapter, 1)).toContain(skill.content)
    await ctx.agentTeams.selectSkills(agent, { expectedRevision: 0, skills: [{ ...skill, purpose: 'Inspect fixture' }] }, signal)
    await send(ctx, agent, 'use the selected skill')
    expect(requestText(adapter, 2).split(skill.content)).toHaveLength(2)
    const events = agent.session.snapshotEvents()
    expect(events.filter(event => event.type === 'tool/call' && event.data.name === 'team_skill')).toHaveLength(1)
    expect(events.filter(event => event.type === 'tool/result')).toHaveLength(2)
    const original = events.find(event => event.type === 'tool/result')
    expect(original?.type === 'tool/result' ? original.data.message.content[1] : undefined)
      .toEqual({ type: 'text', text: skill.content })
    expect(JSON.stringify(ctx.sessionProjections.stateOf(agent.session, 'teamSkillReads'))).not.toContain(skill.content)
    const visibleResults = agent.session.deriveMessages().filter(message => message.role === 'tool')
    expect(visibleResults).toHaveLength(1)
    expect(visibleResults[0]).toMatchObject({ toolCallId: 'read-skill' })
  })

  it('retires a selected body when a newly confirmed goal makes the saved choice inactive', async () => {
    const { ctx, agent, adapter } = await setup()
    const body = 'UNIQUE_OLD_GOAL_SKILL_BODY'
    await ctx.agentTeams.selectSkills(agent, { expectedRevision: 0, skills: [{
      name: 'team-goal-fixture', content: body, digest: createHash('sha256').update(body).digest('hex'), purpose: 'Old goal',
    }] }, signal)
    await send(ctx, agent, 'before goal')
    expect(requestText(adapter, 0)).toContain(body)
    ctx.on('user-questions/request', async request => ({ answers: request.questions.map(question => ({
      id: question.id, selected: [question.intent!.approve],
    })) }))
    const proposal = await ctx.agentTeams.proposeGoal(agent, { expectedGoalRevision: 0, expectedProposalRevision: 0,
      change: { kind: 'replace', definition: { objective: 'Inspect the new local fixture',
        acceptanceCriteria: ['Record its input'], scope: { coverage: 'task', targets: ['new fixture'],
          allowedActions: ['read'], excludedTargets: [], constraints: [] },
      } },
    }, signal)
    await ctx.agentTeams.reviewGoal(agent, proposal.revision, signal)
    await send(ctx, agent, 'after goal')
    expect(requestText(adapter, 1)).not.toContain(body)
    expect(requestText(adapter, 1)).toContain('Unrelated live context.')
    expect(agent.session.snapshotEvents().some(event => event.type === 'user/message'
      && event.data.content.some(block => block.type === 'text' && block.text.includes(body)))).toBe(true)
  })

  it('keeps retired bodies out after Session resume and restores an active body after context replacement', async () => {
    const aBody = 'UNIQUE_RETIRED_ON_RESTART'
    const bBody = 'UNIQUE_ACTIVE_AFTER_COMPACTION'
    const a = { name: 'team-restart-a', content: aBody,
      digest: createHash('sha256').update(aBody).digest('hex'), purpose: 'Initial' }
    const b = { name: 'team-restart-b', content: bBody,
      digest: createHash('sha256').update(bBody).digest('hex'), purpose: 'Current' }
    const first = await setup()
    await first.ctx.agentTeams.selectSkills(first.agent, { expectedRevision: 0, skills: [a] }, signal)
    await send(first.ctx, first.agent, 'A')
    await first.ctx.agentTeams.selectSkills(first.agent, { expectedRevision: 1, skills: [b] }, signal)
    await send(first.ctx, first.agent, 'B')
    await first.ctx.sessions.flush(first.agent.session)
    await first.ctx.fiber.dispose()
    contexts.splice(contexts.indexOf(first.ctx), 1)

    const second = await setup([textResponse('resumed'), textResponse('restored')], first.storageRoot)
    await send(second.ctx, second.agent, 'resume')
    expect(requestText(second.adapter, 0)).not.toContain(aBody)
    expect(requestText(second.adapter, 0).split(bBody)).toHaveLength(2)
    const context = second.agent.session.snapshotEvents().findLast(event => event.type === 'user/message'
      && event.data.source.kind === 'runtime-context'
      && event.data.content.some(block => block.type === 'text' && block.text.includes(bBody)))
    if (context?.type !== 'user/message') throw new Error('active skill context missing')
    second.agent.session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'Compacted unrelated conversation.' }], source: { kind: 'user' },
    }), { surfaceOp: { op: 'replace', startSeq: context.seq, endSeq: context.seq }, sourceEventSeqs: [context.seq] })
    await send(second.ctx, second.agent, 'after context replacement')
    expect(requestText(second.adapter, 1)).not.toContain(aBody)
    expect(requestText(second.adapter, 1).split(bBody)).toHaveLength(2)
    expect(requestText(second.adapter, 1)).toContain('Compacted unrelated conversation.')
  })
})
