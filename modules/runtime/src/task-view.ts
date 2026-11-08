/** Pure task-view derivation shared by the task board and the client projection. */

import { brandString } from '@deepseek-ai/dsh-brand'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { TeamState } from './projection.ts'
import type { TeamTaskSnapshot, TeamTaskView, TeamTaskDispatchBlocker } from './types.ts'
import { hasAdviserRevisionRequest, hasDualAdviserApproval } from './advisers.ts'
import { taskRecordValidity, taskValidity, taskWorkChanges } from './task-work.ts'
import { resourceConflicts } from './resource-scheduling.ts'

/**
 * Whether two normalized file or directory prefixes overlap on path components.
 * @param left - normalized write scope.
 * @param right - normalized write scope.
 * @returns whether either scope contains the other.
 */
export function scopesOverlap(left: string, right: string): boolean {
  if (process.platform === 'win32') { left = left.toLowerCase(); right = right.toLowerCase() }
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)
}

/**
 * Whether every current blocker of one task completed.
 * @param state - Team state supplying sibling tasks.
 * @param task - durable task snapshot to test.
 * @returns whether the task has no incomplete blockers.
 */
export function taskReady(state: TeamState, task: TeamTaskSnapshot): boolean {
  if (task.work !== undefined) return taskWorkChanges(state, task.status === 'pending'
    ? { ...task, work: { plan: task.work.plan, attempts: task.work.attempts } } : task).length === 0
    && task.blockedBy.every((id) => {
      const dependency = state.tasks.find(candidate => candidate.id === id)
      return dependency !== undefined && taskRecordValidity(state, dependency).reusable
    })
  return task.blockedBy.every(id => state.tasks.find(candidate => candidate.id === id)?.status === 'completed')
}

/**
 * Explain a retained task's first durable dispatch hold without claiming live worker availability.
 * @param state - Current Team state.
 * @param task - Pending or submitted task.
 * @returns blocking condition, or undefined when no durable condition blocks dispatch.
 */
export function taskDispatchBlocker(state: TeamState, task: TeamTaskSnapshot): TeamTaskDispatchBlocker | undefined {
  if (task.status === 'completed' || task.status === 'deleted') return undefined
  if (state.goal?.status === 'revoked' || task.work !== undefined
    && task.work.plan.goalRevision !== (state.goal?.revision ?? 0)) return 'goal'
  if (!taskReady(state, task)) return 'dependencies'
  if (task.work?.execution?.phase === 'submitted') {
    if (task.work.plan.adviserGate === 'dual' && !hasDualAdviserApproval(state, task) && !hasAdviserRevisionRequest(state, task)) return 'adviser_review'
    if (task.reviewerId === undefined || String(task.reviewerId) !== state.id
      && !state.members.some(member => member.id === task.reviewerId && member.phase === 'active')) return 'reviewer_missing'
  }
  if (task.status === 'pending') {
    if (task.work?.execution?.phase === 'rejected') return 'manual'
    if (task.autoAssign !== true) return 'manual'
    if (task.requiredSkill !== undefined && !state.skillSelections?.some(selection =>
      selection.goalRevision === (state.goal?.revision ?? 0)
      && state.members.some(member => member.id === selection.memberId && member.phase === 'active')
      && selection.skills.some(skill => skill.name === task.requiredSkill))) return 'skills'
  }
  return undefined
}

/**
 * Derive one task view with owner name, readiness, and advisory write overlaps.
 * A committing caller may pass its pre-append state because `task` supplies the
 * new value explicitly; owner names, blocker readiness, and other task scopes
 * do not change when that snapshot is appended.
 * @param state - Team state supplying members and sibling tasks.
 * @param task - durable task snapshot to view.
 * @returns a detached task view.
 */
export function projectTaskView(state: TeamState, task: TeamTaskSnapshot): TeamTaskView {
  const ownerName = task.ownerId === undefined
    ? undefined
    : task.ownerId === brandString<SessionId>(state.id)
      ? 'lead'
      : state.members.find(member => member.id === task.ownerId)?.name
  const reviewerName = task.reviewerId === undefined
    ? undefined : task.reviewerId === brandString<SessionId>(state.id)
      ? 'lead' : state.members.find(member => member.id === task.reviewerId)?.name
  const dispatchBlocker = taskDispatchBlocker(state, task)
  const warnings = new Set<string>()
  const resources = resourceConflicts(state, task)
  for (const owner of resources) warnings.add(`exclusive resource is owned by task ${owner}`)
  for (const other of state.tasks) {
    if (other.id === task.id || other.status !== 'in_progress') continue
    if (task.writeScopes.some(left => other.writeScopes.some(right => scopesOverlap(left, right)))) {
      warnings.add(`write scopes overlap with ${other.id}`)
    }
  }
  return {
    ...task.work === undefined ? {} : { work: structuredClone(task.work) },
    validity: taskValidity(state, task),
    ...dispatchBlocker === undefined ? {} : { dispatchBlocker },
    id: task.id,
    revision: task.revision,
    subject: task.subject,
    description: task.description,
    status: task.status,
    blockedBy: [...task.blockedBy],
    writeScopes: [...task.writeScopes],
    ...task.autoAssign === undefined ? {} : { autoAssign: task.autoAssign },
    ...task.requiredSkill === undefined ? {} : { requiredSkill: task.requiredSkill },
    ...task.inputKey === undefined ? {} : { inputKey: task.inputKey },
    ...task.result === undefined ? {} : { result: task.result },
    ...task.evidence === undefined ? {} : { evidence: [...task.evidence] },
    ...ownerName === undefined ? {} : { ownerName },
    ...reviewerName === undefined ? {} : { reviewerName },
    ready: resources.length === 0 && task.status === 'pending' && task.work?.execution?.phase !== 'rejected' && taskReady(state, task),
    writeScopeWarnings: [...warnings],
  }
}
