/** Exclusive browser/device/account ownership derived from durable active tasks. */
import type { TeamState } from './projection.ts'
import type { TeamTaskSnapshot } from './types.ts'
import { readProjectPlan } from './project-plan.ts'

const indexes = new WeakMap<TeamState, { keys: Map<string, readonly string[]>; owners: Map<string, TeamTaskSnapshot[]> }>()

/**
 * Find resource owners that conflict with a proposed task assignment.
 * @param state - Immutable projected state; its resource index is reused across all task views.
 * @param task - Current task or the next candidate revision.
 * @returns distinct active task identities retaining an exclusive resource through independent acceptance.
 */
export function resourceConflicts(state: TeamState, task: TeamTaskSnapshot): string[] {
  let index = indexes.get(state)
  if (index === undefined) {
    const plan = readProjectPlan(state.goal?.definition.plan)
    const keys = new Map(plan?.tasks.map(planned => [planned.id, planned.exclusiveResources ?? []]))
    const owners = new Map<string, TeamTaskSnapshot[]>()
    for (const candidate of state.tasks) if (candidate.status === 'in_progress') {
      for (const key of keys.get(candidate.inputKey ?? '') ?? []) {
        const holders = owners.get(key) ?? []
        holders.push(candidate)
        owners.set(key, holders)
      }
    }
    index = { keys, owners }
    indexes.set(state, index)
  }
  return [...new Set((index.keys.get(task.inputKey ?? '') ?? []).flatMap(key =>
    (index.owners.get(key) ?? []).filter(owner => owner.id !== task.id).map(owner => String(owner.id))))]
}
