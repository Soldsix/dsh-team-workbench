import { mountTeamTestSubagents } from './subagent-fixture.ts'
/** Durable catalog and same-Team continuation reuse through real Session persistence. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { Context } from '@deepseek-ai/cordis'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import * as JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import Storage from '@deepseek-ai/dsh-storage'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import * as StorageJson from '@deepseek-ai/dsh-storage-json'
import * as SubagentSpawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
import { MockAdapter, textResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'
import TeamService from '../src/index.ts'
import TeamExpertService, { parseTeamExpertDefinition, TeamExpertId } from '../src/experts.ts'
import type { TeamExpertDefinition, TeamExpertView } from '../src/experts.ts'
import { TestSessionQuery } from './test-session-query.ts'
import { ControlledAdapter } from './controlled-adapter.ts'

const signal = new AbortController().signal
const contexts = new Set<Context>()
const roots: string[] = []
const definition: TeamExpertDefinition = {
  name: '协议专家', description: 'Analyze a supplied protocol fixture', persona: 'Record supported findings and unresolved questions.',
  instructions: 'Retain the confirmed task and its acceptance criteria.', skills: ['protocol-reverse'],
  modelProvider: 'mock', model: 'specialist', reasoningEffort: 'high',
}

afterEach(async () => {
  for (const ctx of contexts) await ctx.fiber.dispose()
  contexts.clear()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

async function setup(existingRoot?: string, adapterOverride?: MockAdapter) {
  const ctx = new Context()
  contexts.add(ctx)
  const root = existingRoot ?? mkdtempSync(join(tmpdir(), 'dsh-team-experts-'))
  if (existingRoot === undefined) roots.push(root)
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(Storage)
  await ctx.plugin(StorageJson, { root: join(root, 'storage') })
  await ctx.plugin(StorageDomain, { backend: 'json' })
  await ctx.plugin(JsonlSessionPersistence, { root: join(root, 'sessions') })
  await ctx.plugin(TestSessionQuery)
  await ctx.plugin(AgentLoop, { agents: [] })
  await mountTeamTestSubagents(ctx)
  await ctx.plugin(SubagentSpawn, { providerName: 'spawn' })
  await ctx.plugin(TeamService, { portableEventEnvelope: true, maxMembers: 8, maxDepth: 2 })
  const adapter = adapterOverride ?? new MockAdapter(Array.from({ length: 5 }, () => textResponse('fixture result')), {
    efforts: [{ id: ReasoningEffortId('high'), name: 'High' }],
  }, 4096)
  ctx.llm.registerAdapter(['mock'], adapter)
  const expertFiber = await ctx.plugin(TeamExpertService)
  const lead = existingRoot === undefined
    ? await ctx.agentLoop.create(SessionId('expert-lead'), { provider: 'mock', model: 'lead', maxTokens: 512 })
    : (await ctx.agents.resume({ resumeSessionId: SessionId('expert-lead'), agentOptions: { provider: 'mock', model: 'lead' } })).agent
  return { ctx, lead, adapter, expertFiber, root }
}

function assignment(profile: TeamExpertView, name = 'protocol-expert') {
  return {
    expertId: profile.id, expectedRevision: profile.revision, name,
    prompt: [{ type: 'text' as const, text: 'Analyze this local test fixture.' }],
    context: 'fresh' as const, provider: 'spawn', signal,
  }
}

describe('persistent Team experts', () => {
  it('keeps shared templates outside model mutation and limits private edits to their owning Team', async () => {
    const controlled = new ControlledAdapter()
    const { ctx, lead } = await setup(undefined, controlled)
    const template = await ctx.teamExperts.create(definition, signal)
    const member = await ctx.teamExperts.assign(lead, assignment(template))
    await vi.waitFor(() => { expect(controlled.calls).toHaveLength(1) })
    const child = ctx.agents.get(member.member.id)!
    await expect(ctx.agents.withInitiator(child, () => ctx.teamExperts.update(template.id, 1,
      { ...definition, persona: 'Unapproved shared replacement.' }, false, signal)))
      .rejects.toMatchObject({ code: 'team-expert/edit-denied' })
    expect(ctx.teamExperts.get(template.id).definition.persona).toBe(definition.persona)
    const local = await ctx.agents.withInitiator(lead, () => ctx.teamExperts.create(definition, signal))
    const other = await ctx.agentLoop.create(SessionId('other-owner'), { provider: 'mock', model: 'lead' })
    await expect(ctx.agents.withInitiator(other, () => ctx.teamExperts.update(local.id, 1,
      { ...definition, persona: 'Foreign Team replacement.' }, false, signal)))
      .rejects.toMatchObject({ code: 'team-expert/edit-denied' })
    const updated = await ctx.agents.withInitiator(lead, () => ctx.teamExperts.update(local.id, 1,
      { ...definition, persona: 'Owner-approved revision.' }, false, signal))
    expect(updated.revision).toBe(2)
    expect(ctx.agents.withInitiator(other, () => ctx.teamExperts.list(false)).map(value => value.id)).not.toContain(local.id)
    controlled.calls[0]!.release()
  })

  it('prepares skills once for concurrent assignments and retains them across restart without resolving replacements', async () => {
    const first = await setup()
    const body = 'Inspect the supplied Android fixture and retain its evidence.\n'
    const resolve = vi.fn(() => Promise.resolve({ name: 'team-android-fingerprint', content: body,
      digest: createHash('sha256').update(body).digest('hex') }))
    first.ctx.on('team/resolve-skill', resolve)
    const profile = await first.ctx.teamExperts.create(definition, signal)
    const request = { ...assignment(profile), skills: [{ name: 'team-android-fingerprint', purpose: 'Inspect this task’s Android input' }] }
    const [created, reused] = await Promise.all([
      first.ctx.teamExperts.assign(first.lead, request),
      first.ctx.teamExperts.assign(first.lead, { ...request, skills: [{ name: 'team-ios-fingerprint', purpose: 'Unused duplicate choice' }] }),
    ])
    expect(created.reused).toBe(false)
    expect(reused).toMatchObject({ reused: true, member: { id: created.member.id } })
    expect(resolve).toHaveBeenCalledTimes(1)
    const saved = first.ctx.agentTeams.getSkills(first.lead, created.member.name)
    expect(saved).toMatchObject({ revision: 1, skills: [{ name: 'team-android-fingerprint', purpose: request.skills[0]!.purpose }] })
    await vi.waitFor(() => { expect(first.ctx.agents.get(created.member.id)).toBeUndefined() })
    expect(first.adapter.requests.filter(request => request.model === 'specialist')).toHaveLength(1)
    await first.ctx.fiber.dispose()
    contexts.delete(first.ctx)

    const second = await setup(first.root)
    const restored = await second.ctx.teamExperts.assign(second.lead, {
      ...request, skills: [{ name: 'team-unavailable-after-upgrade', purpose: 'Ignored during reuse' }],
    })
    expect(restored).toMatchObject({ reused: true, member: { id: created.member.id } })
    expect(second.ctx.agentTeams.getSkills(second.lead, restored.member.name)).toEqual(saved)
    expect(second.adapter.requests).toHaveLength(0)
  })

  it('rejects invalid writes at the owner and reports catalog failures to Remote callers', async () => {
    const { ctx, adapter } = await setup()
    const invalid = await ctx.teamExperts.create({ ...definition, persona: ' ' }, signal).catch((error: unknown) => error)
    expect(remoteErrorOf(invalid)).toMatchObject({ code: 'team-expert/invalid-profile', details: { fields: ['persona'] } })
    const absent = TeamExpertId('absent')
    const missing = await ctx.teamExperts.update(absent, 1, definition, false, signal).catch((error: unknown) => error)
    expect(remoteErrorOf(missing)).toMatchObject({ code: 'team-expert/not-found', details: { expertId: absent } })
    const unavailable = await ctx.teamExperts.create({ ...definition, modelProvider: 'absent' }, signal).catch((error: unknown) => error)
    expect(remoteErrorOf(unavailable)).toMatchObject({ code: 'team-expert/model-unavailable', details: { provider: 'absent', model: 'specialist' } })
    expect(ctx.teamExperts.list(true)).toEqual([])
    expect(adapter.requests).toHaveLength(0)
  })

  it('saves detached profiles without generating text and rejects stale concurrent edits', async () => {
    const { ctx, adapter } = await setup()
    const profile = await ctx.teamExperts.create(definition, signal)
    expect(adapter.requests).toHaveLength(0)
    ;(profile.definition.skills as string[]).push('unpersisted')
    expect(ctx.teamExperts.get(profile.id).definition.skills).toEqual(['protocol-reverse'])
    const results = await Promise.allSettled([
      ctx.teamExperts.update(profile.id, 1, { ...definition, name: 'Revision A' }, false, signal),
      ctx.teamExperts.update(profile.id, 1, { ...definition, name: 'Revision B' }, false, signal),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(result => result.status === 'rejected')).toMatchObject({
      reason: { code: 'team-expert/stale-revision' },
    })
    expect(ctx.teamExperts.get(profile.id).revision).toBe(2)
    expect(adapter.requests).toHaveLength(0)
  })

  it('coalesces concurrent assignments and sends only the first prompt to the model', async () => {
    const { ctx, lead, adapter } = await setup()
    const specialistRequests = () => adapter.requests.filter(request => request.model === 'specialist')
    const profile = await ctx.teamExperts.create(definition, signal)
    const results = await Promise.all(Array.from({ length: 32 }, (_, index) =>
      ctx.teamExperts.assign(lead, assignment(profile, `worker-${index}`))))
    expect(new Set(results.map(result => result.member.id)).size).toBe(1)
    expect(results.filter(result => !result.reused)).toHaveLength(1)
    expect(ctx.agentTeams.listMembers(lead)).toHaveLength(2)
    const member = results[0]!.member
    await vi.waitFor(() => { expect(ctx.agents.get(member.id)).toBeUndefined() })
    expect(specialistRequests()).toHaveLength(1)
    expect(specialistRequests()[0]).toMatchObject({ model: 'specialist', reasoningEffort: 'high', maxTokens: 4096 })
    const reused = await ctx.teamExperts.assign(lead, assignment(profile, 'ignored-new-name'))
    expect(reused).toMatchObject({ reused: true, member: { id: member.id, expert: { id: profile.id, revision: 1 } } })
    expect(specialistRequests()).toHaveLength(1)
    await ctx.agentTeams.sendMessage(lead, {
      target: member.name, content: [{ type: 'text', text: 'Verify the previous result against a second fixture.' }], signal,
    })
    await vi.waitFor(() => { expect(specialistRequests()).toHaveLength(2) })
    expect(JSON.stringify(specialistRequests()[1])).toContain('fixture result')
    expect(JSON.stringify(specialistRequests()[1])).toContain(definition.instructions)
  })

  it('restores the same binding after a complete host restart without rerunning completed work', async () => {
    const first = await setup()
    const profile = await first.ctx.teamExperts.create(definition, signal)
    const original = await first.ctx.teamExperts.assign(first.lead, assignment(profile))
    await vi.waitFor(() => { expect(first.ctx.agents.get(original.member.id)).toBeUndefined() })
    await first.ctx.fiber.dispose()
    contexts.delete(first.ctx)
    const second = await setup(first.root)
    expect(second.ctx.teamExperts.get(profile.id).definition).toEqual(definition)
    const restored = await second.ctx.teamExperts.assign(second.lead, assignment(profile))
    expect(restored).toMatchObject({ reused: true, member: { id: original.member.id, expert: original.member.expert } })
    const memberRequests = () => second.adapter.requests.filter(request => request.sessionId === restored.member.id)
    expect(memberRequests()).toHaveLength(0)
    await second.ctx.agentTeams.sendMessage(second.lead, {
      target: restored.member.name, content: [{ type: 'text', text: 'Continue the recorded work.' }], signal,
    })
    await vi.waitFor(() => { expect(memberRequests()).toHaveLength(1) })
    expect(JSON.stringify(memberRequests()[0])).toContain('fixture result')
  })

  it('cancels a duplicate waiter without cancelling the admitted first assignment', async () => {
    const { ctx, lead, adapter } = await setup()
    const profile = await ctx.teamExperts.create(definition, signal)
    const metadata = await adapter.resolveModel('mock', 'specialist')
    const gate = Promise.withResolvers<typeof metadata>()
    const entered = Promise.withResolvers<undefined>()
    vi.spyOn(adapter, 'resolveModel').mockImplementationOnce(() => { entered.resolve(undefined); return gate.promise })
    const first = ctx.teamExperts.assign(lead, assignment(profile))
    await entered.promise
    try {
      const controller = new AbortController()
      const second = ctx.teamExperts.assign(lead, { ...assignment(profile), signal: controller.signal })
      controller.abort(new Error('cancel duplicate selection'))
      await expect(second).rejects.toThrow('cancel duplicate selection')
    } finally {
      gate.resolve(metadata)
      await first
    }
    expect(ctx.agentTeams.listMembers(lead)).toHaveLength(2)
  })

  it('keeps conversations separate between Teams and preserves the bound persona revision', async () => {
    const { ctx, lead } = await setup()
    const profile = await ctx.teamExperts.create(definition, signal)
    const first = await ctx.teamExperts.assign(lead, assignment(profile))
    const updated = await ctx.teamExperts.update(profile.id, 1, { ...definition, persona: 'Revised expert persona.' }, false, signal)
    const existing = await ctx.teamExperts.assign(lead, assignment(updated))
    expect(existing.member.expert?.revision).toBe(1)
    expect(existing.member.persona).toContain(definition.persona)
    const other = await ctx.agentLoop.create(SessionId('other-team'), { provider: 'mock', model: 'lead' })
    const second = await ctx.teamExperts.assign(other, assignment(updated))
    expect(second.member.id).not.toBe(first.member.id)
    expect(second.member.expert?.revision).toBe(2)
    expect(second.member.persona).toContain('Revised expert persona.')
    expect(ctx.agentTeams.listMembers(other)).toHaveLength(2)
  })

  it('rejects unavailable routes, unsupported effort, stale assignment, archived roles, and cancelled creation', async () => {
    const { ctx, lead, adapter } = await setup()
    await expect(ctx.teamExperts.create({ ...definition, modelProvider: 'missing' }, signal)).rejects.toThrow()
    await expect(ctx.teamExperts.create({ ...definition, reasoningEffort: 'unsupported' }, signal)).rejects.toThrow()
    await expect(ctx.teamExperts.create(definition, AbortSignal.abort())).rejects.toThrow()
    expect(ctx.teamExperts.list(false)).toEqual([])
    const profile = await ctx.teamExperts.create(definition, signal)
    await expect(ctx.teamExperts.assign(lead, { ...assignment(profile), expectedRevision: 0 }))
      .rejects.toMatchObject({ code: 'team-expert/stale-revision' })
    const archived = await ctx.teamExperts.update(profile.id, 1, definition, true, signal)
    expect(ctx.teamExperts.list(false)).toEqual([])
    expect(ctx.teamExperts.list(true)).toHaveLength(1)
    await expect(ctx.teamExperts.assign(lead, assignment(archived))).rejects.toMatchObject({ code: 'team-expert/archived' })
    expect(() => ctx.teamExperts.get(TeamExpertId('absent'))).toThrow()
    expect(adapter.requests).toHaveLength(0)
  })

  it('rejects malformed durable profiles without discarding the catalog', async () => {
    const { ctx, expertFiber, root } = await setup()
    const profile = await ctx.teamExperts.create(definition, signal)
    await expertFiber.dispose()
    const path = join(root, 'storage', 'team_experts.json')
    const record = JSON.parse(readFileSync(path, 'utf8')) as {
      tables: { experts: Record<string, { revision: number }> }
    }
    record.tables.experts[profile.id]!.revision = -1
    const corrupt = JSON.stringify(record)
    writeFileSync(path, corrupt)
    await expect(ctx.plugin(TeamExpertService)).rejects.toThrow()
    expect(readFileSync(path, 'utf8')).toBe(corrupt)
  })

  it('validates external profile fields before persistence', () => {
    expect(() => parseTeamExpertDefinition({ ...definition, model: undefined })).toThrow()
    expect(() => parseTeamExpertDefinition({ ...definition, maxTokens: 100 })).toThrow()
    expect(() => parseTeamExpertDefinition({ ...definition, skills: [' '] })).toThrow()
    expect(() => parseTeamExpertDefinition({ ...definition, persona: '' })).toThrow()
  })

  it('rejects revision exhaustion without writing an unreadable catalog value', async () => {
    const { ctx, expertFiber, root } = await setup()
    const profile = await ctx.teamExperts.create(definition, signal)
    await expertFiber.dispose()
    const path = join(root, 'storage', 'team_experts.json')
    const record = JSON.parse(readFileSync(path, 'utf8')) as {
      tables: { experts: Record<string, { revision: number }> }
    }
    record.tables.experts[profile.id]!.revision = Number.MAX_SAFE_INTEGER
    const original = JSON.stringify(record)
    writeFileSync(path, original)
    await ctx.plugin(TeamExpertService)
    await expect(ctx.teamExperts.update(profile.id, Number.MAX_SAFE_INTEGER, definition, false, signal))
      .rejects.toMatchObject({ code: 'team-expert/revision-limit' })
    expect(ctx.teamExperts.get(profile.id).revision).toBe(Number.MAX_SAFE_INTEGER)
    expect(readFileSync(path, 'utf8')).toBe(original)
  })
})
