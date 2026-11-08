import { readProjectPlan } from "./project-plan.js";
const indexes = new WeakMap();
/**
 * Find resource owners that conflict with a proposed task assignment.
 * @param state - Immutable projected state; its resource index is reused across all task views.
 * @param task - Current task or the next candidate revision.
 * @returns distinct active task identities retaining an exclusive resource through independent acceptance.
 */
export function resourceConflicts(state, task) {
    let index = indexes.get(state);
    if (index === undefined) {
        const plan = readProjectPlan(state.goal?.definition.plan);
        const keys = new Map(plan?.tasks.map(planned => [planned.id, planned.exclusiveResources ?? []]));
        const owners = new Map();
        for (const candidate of state.tasks)
            if (candidate.status === 'in_progress') {
                for (const key of keys.get(candidate.inputKey ?? '') ?? []) {
                    const holders = owners.get(key) ?? [];
                    holders.push(candidate);
                    owners.set(key, holders);
                }
            }
        index = { keys, owners };
        indexes.set(state, index);
    }
    return [...new Set((index.keys.get(task.inputKey ?? '') ?? []).flatMap(key => (index.owners.get(key) ?? []).filter(owner => owner.id !== task.id).map(owner => String(owner.id))))];
}
