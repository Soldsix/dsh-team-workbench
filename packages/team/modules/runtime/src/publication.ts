/** Selects artifact revisions only when their task dependencies declare an ordering. */

import { TeamError } from './error.ts'
import type { TeamTaskId } from './types.ts'
import type { TeamFileReceipt } from './task-work-types.ts'

/** Dependency node with already authorized accepted artifacts, or none for intermediate tasks. */
export interface PublicationTask {
  readonly id: TeamTaskId
  readonly dependencies: readonly TeamTaskId[]
  readonly artifacts: readonly TeamFileReceipt[]
}

/**
 * Select the descendant's file revision while rejecting conflicting independent results.
 * @param tasks - Full dependency graph with accepted artifacts for the publishing member only.
 * @returns one exact receipt per logical output path.
 */
export function selectPublicationArtifacts(tasks: readonly PublicationTask[]): TeamFileReceipt[] {
  const selected = new Map<string, { receipt: TeamFileReceipt; task: TeamTaskId }>()
  const dependsOn = (id: TeamTaskId, ancestor: TeamTaskId, seen = new Set<TeamTaskId>()): boolean => {
    if (seen.has(id)) return false
    seen.add(id)
    return (tasks.find(task => task.id === id)?.dependencies ?? [])
      .some(parent => parent === ancestor || dependsOn(parent, ancestor, seen))
  }
  for (const task of tasks) for (const receipt of task.artifacts) {
    const prior = selected.get(receipt.path)
    if (prior !== undefined && prior.receipt.sha256 !== receipt.sha256) {
      if (dependsOn(prior.task, task.id)) continue
      if (!dependsOn(task.id, prior.task)) {
        throw new TeamError(`independent accepted artifact versions conflict: ${receipt.path}; reconcile their tasks before publishing`, 'TEAM_TASK_EXECUTION_STALE')
      }
    }
    selected.set(receipt.path, { receipt, task: task.id })
  }
  return [...selected.values()].map(value => value.receipt)
}
