/** File receipts come from workspace bytes and stay separate across member roots. */
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { TeamId, TeamTaskId } from '../src/types.ts'
import type { TeamTaskSnapshot } from '../src/types.ts'
import type { TeamState } from '../src/projection.ts'
import { TeamTaskExecutionId } from '../src/task-work-types.ts'
import { TeamTaskBoard } from '../src/task-board.ts'
import type { TeamJournal } from '../src/journal.ts'
import type { TeamRoster } from '../src/roster.ts'
import type { TeamGoals } from '../src/goals.ts'
import { assertTaskWorkEvent } from '../src/task-work-event.ts'
import { observeTaskEnvironment, observeTaskFiles, readTaskReceiptText } from '../src/task-receipts.ts'
import { TeamArtifactStore } from '../src/artifact-store.ts'
import { selectPublicationArtifacts } from '../src/publication.ts'

describe('task file receipts', () => {
  it('keeps accepted serial versions available after the same member edits or removes its working copy', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-serial-handoff-'))
    onTestFinished(() => rm(root, { recursive: true, force: true }))
    const shared = join(root, 'shared'), member = join(root, 'member'), archive = join(root, 'archive')
    await Promise.all([mkdir(shared), mkdir(member)])
    const signal = new AbortController().signal
    const environment = await observeTaskEnvironment(shared), executionEnvironment = await observeTaskEnvironment(member)
    const store = new TeamArtifactStore(archive)
    const leadId = SessionId('lead'), ownerId = SessionId('worker')
    const lead = { id: leadId } as Agent
    const make = async (name: string, output: string, dependencies: readonly TeamTaskSnapshot[]): Promise<TeamTaskSnapshot> => {
      const inputs = await observeTaskFiles(environment, ['input.txt'], 2, 100, signal)
      await writeFile(join(member, 'input.txt'), output)
      const artifacts = await observeTaskFiles(executionEnvironment, ['input.txt'], 2, 100, signal)
      await store.capture(executionEnvironment, artifacts, signal)
      return { id: TeamTaskId(name), revision: 4, subject: name, description: name, status: 'completed', ownerId,
        blockedBy: dependencies.map(task => task.id), writeScopes: ['input.txt'], result: 'done', evidence: ['checked'],
        work: { plan: { revision: 1, plannerId: leadId, goalRevision: 0, inputVersion: name,
          environmentVersion: 'local', acceptanceCriteria: ['verified'], inputPaths: ['input.txt'], inputs, environment }, attempts: 1,
          execution: { id: TeamTaskExecutionId(name + '/run-1'), ownerId, planRevision: 1,
            dependencies: dependencies.map(task => ({ taskId: task.id, revision: task.revision })), phase: 'accepted', effectTracking: 'observed',
            submission: { result: 'done', evidence: ['checked'], artifacts, environment: executionEnvironment, sideEffects: 'none' },
            review: { reviewerId: leadId, decision: 'accepted', summary: 'checked', evidence: ['compared'] } } } }
    }
    await writeFile(join(shared, 'input.txt'), 'original')
    const first = await make('first', 'version A', [])
    await writeFile(join(shared, 'input.txt'), 'version A')
    const second = await make('second', 'version B', [first])
    const state: TeamState = { id: TeamId(leadId), members: [], tasks: [first, second], messages: [], delivered: [], nextTaskNumber: 3 }
    const journal = Object.assign({} as TeamJournal, { state: () => state })
    const roster = Object.assign({} as TeamRoster, { membership: () => ({ root: lead }) })
    const board = new TeamTaskBoard(journal, roster, {} as TeamGoals, 4, false, true, true, 100_000, 4, 100, false, false, false, store)
    expect((await board.validateHandoff(lead, [second.id], signal))[0]?.validity.reusable).toBe(true)
    await writeFile(join(shared, 'input.txt'), 'version B')
    await rm(member, { recursive: true, force: true })
    expect((await board.validateHandoff(lead, [second.id], signal))[0]?.validity.reusable).toBe(true)
    await writeFile(join(shared, 'input.txt'), 'unapproved')
    expect((await board.validateHandoff(lead, [second.id], signal))[0]?.validity.reusable).toBe(false)
    await writeFile(join(shared, 'input.txt'), 'version B')
    await writeFile(join(archive, first.work!.execution!.submission!.artifacts![0]!.sha256), 'corrupted')
    expect((await board.validateHandoff(lead, [second.id], signal))[0]?.validity.reusable).toBe(false)
    await expect(store.verify(executionEnvironment, second.work!.execution!.submission!.artifacts!, 1, 1, signal))
      .rejects.toMatchObject({ code: 'TEAM_TASK_WORK_TOO_LARGE' })
  })

  it('hands off accepted parallel updates without accepting unrelated changes or weakening strict reuse', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-handoff-'))
    onTestFinished(() => rm(root, { recursive: true, force: true }))
    const signal = new AbortController().signal
    const environment = await observeTaskEnvironment(root)
    const leadId = SessionId('lead')
    const lead = { id: leadId } as Agent
    await writeFile(join(root, 'input.txt'), 'original')
    await writeFile(join(root, 'other.txt'), 'stable')
    const inputs = await observeTaskFiles(environment, ['input.txt', 'other.txt'], 4, 100, signal)
    const make = async (name: string, path: string, content: string): Promise<TeamTaskSnapshot> => {
      const workspaceRoot = join(root, name)
      await mkdir(workspaceRoot)
      await writeFile(join(workspaceRoot, path), content)
      const outputEnvironment = await observeTaskEnvironment(workspaceRoot)
      const artifacts = await observeTaskFiles(outputEnvironment, [path], 4, 100, signal)
      const id = TeamTaskId(name)
      return { id, revision: 4, subject: name, description: name, status: 'completed', ownerId: SessionId(name),
        blockedBy: [], writeScopes: [path], result: 'done', evidence: ['independent check'],
        work: { plan: { revision: 1, plannerId: leadId, goalRevision: 0, inputVersion: name,
          environmentVersion: 'local', acceptanceCriteria: ['verified'], inputPaths: ['input.txt', 'other.txt'], inputs, environment }, attempts: 1,
          execution: { id: TeamTaskExecutionId(name + '/run-1'), ownerId: SessionId(name), planRevision: 1,
            dependencies: [], phase: 'accepted', effectTracking: 'observed', submission: { result: 'done', evidence: ['checked'],
              artifacts, environment: outputEnvironment, sideEffects: 'none' },
            review: { reviewerId: leadId, decision: 'accepted', summary: 'checked', evidence: ['compared inputs and output'] } } } }
    }
    const transform = await make('transform', 'input.txt', 'approved update')
    const reader = await make('reader', 'result.txt', 'based on original')
    const unrelated = await make('unrelated', 'other.txt', 'independent update')
    const state: TeamState = { id: TeamId(leadId), members: [], tasks: [transform, reader, unrelated], messages: [], delivered: [], nextTaskNumber: 4 }
    const journal = Object.assign({} as TeamJournal, { state: () => state })
    const roster = Object.assign({} as TeamRoster, { membership: () => ({ root: lead }) })
    const board = new TeamTaskBoard(journal, roster, {} as TeamGoals, 4, false, true, true, 100_000, 4, 100)
    await writeFile(join(root, 'input.txt'), 'approved update')
    expect((await board.validateReuse(lead, reader.id, signal)).validity.reusable).toBe(false)
    expect((await board.validateHandoff(lead, [reader.id], signal))[0]?.validity.reusable).toBe(false)
    expect((await board.validateHandoff(lead, [transform.id, reader.id], signal)).every(check => check.validity.reusable)).toBe(true)
    await writeFile(join(root, 'other.txt'), 'independent update')
    expect((await board.validateHandoff(lead, [transform.id, reader.id], signal)).every(check => check.validity.reusable)).toBe(false)
    await writeFile(join(root, 'other.txt'), 'stable')
    await writeFile(join(root, 'input.txt'), 'unapproved update')
    expect((await board.validateHandoff(lead, [transform.id, reader.id], signal)).every(check => check.validity.reusable)).toBe(false)
    await writeFile(join(root, 'input.txt'), 'approved update')
    await writeFile(join(root, 'transform/input.txt'), 'tampered artifact')
    expect((await board.validateHandoff(lead, [transform.id, reader.id], signal))[0]?.validity.reasons).toContain('Task artifacts changed.')
  })

  it('retains submitted versions through edits and restart, and rejects changed sources or stored bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-artifact-store-'))
    onTestFinished(() => rm(root, { recursive: true, force: true }))
    const environment = await observeTaskEnvironment(root)
    const signal = new AbortController().signal
    const storeRoot = join(root, 'archive')
    const store = new TeamArtifactStore(storeRoot)
    await writeFile(join(root, 'result.txt'), 'revision one')
    const [first] = await observeTaskFiles(environment, ['result.txt'], 1, 100, signal)
    if (first === undefined) throw new Error('fixture receipt missing')
    // Legacy evidence is readable only while its original bytes match.
    expect(await store.read(environment, first, 0, 100, 100, signal)).toBe('revision one')
    await store.capture(environment, [first, first], signal)
    await writeFile(join(root, 'result.txt'), 'revision two')
    const [second] = await observeTaskFiles(environment, ['result.txt'], 1, 100, signal)
    if (second === undefined) throw new Error('fixture receipt missing')
    await store.capture(environment, [second], signal)
    const restored = new TeamArtifactStore(storeRoot)
    expect(await restored.read(environment, first, 0, 100, 100, signal)).toBe('revision one')
    expect(await restored.read(environment, second, 0, 100, 100, signal)).toBe('revision two')
    await expect(store.capture(environment, [first], signal)).rejects.toMatchObject({ code: 'TEAM_TASK_EXECUTION_STALE' })
    await writeFile(join(storeRoot, first.sha256), 'tampered')
    await expect(restored.read(environment, first, 0, 100, 100, signal)).rejects.toMatchObject({ code: 'TEAM_TASK_EXECUTION_STALE' })
  })

  it('publishes a dependent revision in either graph order and refuses independent conflicting artifacts', () => {
    const first = { path: 'result.txt', bytes: 1, sha256: 'a'.repeat(64) }
    const second = { path: 'result.txt', bytes: 1, sha256: 'b'.repeat(64) }
    const a = { id: TeamTaskId('a'), dependencies: [], artifacts: [first] }
    const bridge = { id: TeamTaskId('bridge'), dependencies: [a.id], artifacts: [] }
    const b = { id: TeamTaskId('b'), dependencies: [bridge.id], artifacts: [second] }
    expect(selectPublicationArtifacts([a, bridge, b])).toEqual([second])
    expect(selectPublicationArtifacts([b, bridge, a])).toEqual([second])
    expect(() => selectPublicationArtifacts([a, { ...b, dependencies: [] }]))
      .toThrow(/independent accepted artifact versions conflict/u)
  })

  it('rejects binary pages, invalid UTF-8 offsets, changed bytes, and cancellation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-artifact-text-'))
    onTestFinished(() => rm(root, { recursive: true, force: true }))
    const environment = await observeTaskEnvironment(root)
    const signal = new AbortController().signal
    await writeFile(join(root, 'text.txt'), '\uFEFF中文😀')
    const [receipt] = await observeTaskFiles(environment, ['text.txt'], 1, 100, signal)
    if (receipt === undefined) throw new Error('fixture receipt missing')
    expect(await readTaskReceiptText(environment, receipt, 0, 100, 100, signal)).toBe('\uFEFF中文😀')
    for (const offset of [-1, 1, receipt.bytes + 1, 1.5]) {
      await expect(readTaskReceiptText(environment, receipt, offset, 100, 100, signal))
        .rejects.toMatchObject({ code: 'TEAM_INVALID_ARGUMENT' })
    }
    const cancelled = new AbortController()
    cancelled.abort(new Error('cancel artifact read'))
    await expect(readTaskReceiptText(environment, receipt, 0, 100, 100, cancelled.signal))
      .rejects.toThrow('cancel artifact read')
    await writeFile(join(root, 'text.txt'), Buffer.from([0, 1, 2]))
    await expect(readTaskReceiptText(environment, receipt, 0, 100, 100, signal))
      .rejects.toMatchObject({ code: 'TEAM_TASK_EXECUTION_STALE' })
    const [binary] = await observeTaskFiles(environment, ['text.txt'], 1, 100, signal)
    if (binary === undefined) throw new Error('fixture binary receipt missing')
    await expect(readTaskReceiptText(environment, binary, 0, 100, 100, signal))
      .rejects.toMatchObject({ code: 'TEAM_INVALID_ARGUMENT' })
  })

  it('hashes actual bytes under each member workspace and enforces the configured byte limit', async () => {
    const leadRoot = await mkdtemp(join(tmpdir(), 'dsh-receipt-lead-'))
    const childRoot = await mkdtemp(join(tmpdir(), 'dsh-receipt-child-'))
    onTestFinished(async () => { await Promise.all([rm(leadRoot, { recursive: true, force: true }),
      rm(childRoot, { recursive: true, force: true })]) })
    await writeFile(join(leadRoot, 'input.txt'), 'lead input')
    await writeFile(join(childRoot, 'output.txt'), 'child output')
    const signal = new AbortController().signal
    const lead = await observeTaskEnvironment(leadRoot)
    const child = await observeTaskEnvironment(childRoot)
    expect(lead.workspaceRoot).not.toBe(child.workspaceRoot)
    expect(await observeTaskFiles(lead, ['input.txt'], 2, 100, signal)).toEqual([{
      path: 'input.txt', bytes: 10, sha256: createHash('sha256').update('lead input').digest('hex'),
    }])
    expect(await observeTaskFiles(child, ['output.txt'], 2, 100, signal)).toEqual([{
      path: 'output.txt', bytes: 12, sha256: createHash('sha256').update('child output').digest('hex'),
    }])
    await expect(observeTaskFiles(lead, ['input.txt'], 2, 9, signal)).rejects.toMatchObject({ code: 'TEAM_TASK_WORK_TOO_LARGE' })
    await expect(observeTaskFiles(lead, ['input.txt', 'input.txt'], 2, 100, signal))
      .rejects.toMatchObject({ code: 'TEAM_INVALID_ARGUMENT' })
  })

  it('rechecks Lead inputs and child artifacts in their recorded workspaces for a different caller', async () => {
    const leadRoot = await mkdtemp(join(tmpdir(), 'dsh-recheck-lead-'))
    const childRoot = await mkdtemp(join(tmpdir(), 'dsh-recheck-child-'))
    onTestFinished(async () => { await Promise.all([rm(leadRoot, { recursive: true, force: true }),
      rm(childRoot, { recursive: true, force: true })]) })
    await writeFile(join(leadRoot, 'input.txt'), 'original input')
    await writeFile(join(childRoot, 'output.txt'), 'child result')
    const signal = new AbortController().signal
    const inputEnvironment = await observeTaskEnvironment(leadRoot)
    const outputEnvironment = await observeTaskEnvironment(childRoot)
    const inputs = await observeTaskFiles(inputEnvironment, ['input.txt'], 4, 100, signal)
    const artifacts = await observeTaskFiles(outputEnvironment, ['output.txt'], 4, 100, signal)
    const id = TeamTaskId('task-1')
    const leadId = SessionId('lead')
    const childId = SessionId('child')
    const task: TeamTaskSnapshot = { id, revision: 4, subject: 'Build', description: 'Use input',
      status: 'completed', ownerId: childId, blockedBy: [], writeScopes: [], result: 'done', evidence: ['file checked'],
      work: { plan: { revision: 1, plannerId: leadId, goalRevision: 0, inputVersion: 'v1',
        environmentVersion: 'local', acceptanceCriteria: ['output exists'], inputPaths: ['input.txt'],
        inputs, environment: inputEnvironment }, attempts: 1,
      execution: { id: TeamTaskExecutionId('task-1/run-1'), ownerId: childId, planRevision: 1,
        dependencies: [], phase: 'accepted', effectTracking: 'observed',
        submission: { result: 'done', evidence: ['file checked'], artifacts, environment: outputEnvironment,
          sideEffects: 'none' },
        review: { reviewerId: leadId, decision: 'accepted', summary: 'verified', evidence: ['read output'] } } } }
    const state: TeamState = { id: TeamId(leadId), members: [], tasks: [task], messages: [], delivered: [], nextTaskNumber: 2 }
    const lead = { id: leadId } as Agent
    const other = { id: SessionId('other') } as Agent
    const journal = Object.assign({} as TeamJournal, { state: () => state })
    const roster = Object.assign({} as TeamRoster, { membership: () => ({ root: lead }) })
    const board = new TeamTaskBoard(journal, roster, {} as TeamGoals, 2, false, true, true, 100_000, 4, 100)
    const checked = await board.validateReuse(other, id, signal)
    expect(checked.validity).toEqual({ reusable: true, reasons: [] })
    expect(checked.environment?.workspaceRoot).toBe(inputEnvironment.workspaceRoot)
    expect(checked.artifactEnvironment?.workspaceRoot).toBe(outputEnvironment.workspaceRoot)
    const effect = { version: 2 as const, teamId: TeamId(leadId), taskId: id,
      executionId: TeamTaskExecutionId('task-1/run-1'), callId: ToolCallId('historical-call'),
      toolName: 'unknown_external_tool', phase: 'settled' as const }
    const effectState: TeamState = { ...state, taskEffects: [effect] }
    const forged: TeamTaskSnapshot = { ...task, revision: 5, work: { ...task.work!,
      execution: { ...task.work!.execution!, effectReview: { reviewerId: leadId, resolution: 'known',
        summary: 'claim all future calls', evidence: ['single earlier call'], observedCalls: 999 } } } }
    expect(() => { assertTaskWorkEvent(effectState, task, forged) }).toThrow('advance observed calls')
    await writeFile(join(childRoot, 'output.txt'), 'changed child result')
    const changed = await board.validateReuse(lead, id, signal)
    expect(changed.validity.reusable).toBe(false)
    expect(changed.validity.reasons).toContain('Task artifacts changed.')
  })
})
