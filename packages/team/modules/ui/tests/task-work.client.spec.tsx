// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamTaskExecutionId, TeamTaskId, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { TaskWorkDetails, duplicateTaskSubjects, taskOwnerSessionId, taskWorkStateKey } from '../src/client/TaskWork.tsx'
import { zh } from '../src/client/locales.ts'

const task: TeamTaskView = {
  id: 'task-1' as TeamTaskId, revision: 3, subject: 'Compare fixture', description: 'Compare the local fields',
  status: 'in_progress', ready: false, blockedBy: [], writeScopes: [], writeScopeWarnings: [],
  validity: { reusable: false, reasons: [] }, work: {
    plan: { revision: 1, plannerId: 'lead' as SessionId, goalRevision: 2, inputVersion: 'fixture-v1', environmentVersion: 'local-v1', acceptanceCriteria: ['Fields agree with the fixture'] },
    attempts: 1, execution: { id: 'task-1/run-1' as TeamTaskExecutionId, ownerId: 'worker' as SessionId, planRevision: 1, dependencies: [],
      phase: 'submitted', submission: { result: 'Compared all fields', evidence: ['report.json'] } },
  },
}

afterEach(cleanup)

describe('task execution details', () => {
  it('keeps submitted work awaiting review and shows the declared versions and evidence', () => {
    expect(taskWorkStateKey(task)).toBe('work.phase.submitted')
    expect(taskWorkStateKey({ ...task, recovery: { reason: 'owner_inactive', action: 'review' } }, false)).toBe('work.phase.submitted')
    render(<TaskWorkDetails task={task} t={makeTranslate(zh, commonZh)} />)
    fireEvent.click(screen.getByText(zh['work.details']))
    for (const text of ['fixture-v1', 'local-v1', 'Fields agree with the fixture', 'Compared all fields', 'report.json', zh['work.declaredVersions']]) {
      expect(screen.getByText(text)).toBeDefined()
    }
    expect(screen.queryByText(zh['work.review'])).toBeNull()
  })

  it('distinguishes an unstarted plan for an earlier goal from a current executable plan', () => {
    const { execution: _execution, ...unstarted } = task.work!
    const pending: TeamTaskView = { ...task, status: 'pending', work: unstarted }
    expect(taskWorkStateKey(pending, false, 3)).toBe('work.goalChanged')
    expect(taskWorkStateKey(pending, false, 2)).toBe('work.phase.pending')
    expect(taskWorkStateKey(task, false, 3)).toBe('work.goalChanged')
    expect(taskWorkStateKey(task, false, 2)).toBe('work.phase.submitted')
  })

  it('shows live execution only with activity evidence and keeps recovery advice visible', () => {
    const { submission: _submission, ...execution } = task.work!.execution!
    const running: TeamTaskView = { ...task, work: { ...task.work!, execution: {
      ...execution, phase: 'running',
    } } }
    expect(taskWorkStateKey(running, true)).toBe('work.phase.running')
    expect(taskWorkStateKey(running, false)).toBe('work.ownerInactive')
    expect(taskWorkStateKey(running)).toBe('work.ownerUnknown')
    const recoverable: TeamTaskView = { ...running, recovery: { reason: 'owner_inactive', action: 'reconcile' } }
    expect(taskWorkStateKey(recoverable, false)).toBe('work.recovery.reconcile')
    render(<TaskWorkDetails task={recoverable} t={makeTranslate(zh, commonZh)} />)
    fireEvent.click(screen.getByText(zh['work.details']))
    expect(screen.getByText(zh['work.recovery.reconcile'])).toBeDefined()
  })

  it('retains same-subject task IDs and does not guess an ambiguous owner', () => {
    const duplicate: TeamTaskView = { ...task, id: 'task-2' as TeamTaskId, subject: ' compare fixture ' }
    expect(duplicateTaskSubjects([task, duplicate])).toEqual(new Set([task.id, duplicate.id]))
    expect(taskOwnerSessionId(task, [])).toBe('worker')
    const { work: _work, ...withoutWork } = task
    const legacy: TeamTaskView = { ...withoutWork, ownerName: 'worker' }
    expect(taskOwnerSessionId(legacy, [
      { id: 'worker' as SessionId, name: 'worker', role: 'teammate', phase: 'active' },
      { id: 'other' as SessionId, name: 'worker', role: 'teammate', phase: 'active' },
    ])).toBeUndefined()
  })

  it('marks a previously accepted result for revalidation and retains the independent review', () => {
    const stale: TeamTaskView = { ...task, status: 'completed', validity: { reusable: false, reasons: ['Dependency changed'] }, work: {
      ...task.work!, execution: { ...task.work!.execution!, phase: 'accepted', review: {
        reviewerId: 'lead' as SessionId, decision: 'accepted', summary: 'Independently compared fields', evidence: ['review.json'],
      } },
    } }
    expect(taskWorkStateKey(stale)).toBe('work.stale')
    render(<TaskWorkDetails task={stale} t={makeTranslate(zh, commonZh)} />)
    fireEvent.click(screen.getByText(zh['work.details']))
    expect(screen.getByText('Independently compared fields')).toBeDefined()
    expect(screen.getByText('review.json')).toBeDefined()
    expect(screen.getByText('Dependency changed')).toBeDefined()
  })

  it('labels historical completion as unverified without inventing an execution', () => {
    const { work: _work, ...legacy } = task
    render(<TaskWorkDetails task={{ ...legacy, status: 'completed' }} t={makeTranslate(zh, commonZh)} />)
    expect(screen.getByText(zh['work.legacy'])).toBeDefined()
    expect(screen.queryByText(zh['work.details'])).toBeNull()
  })
})
