/** Selects artifact revisions only when their task dependencies declare an ordering. */
import { TeamError } from "./error.js";
/**
 * Select the descendant's file revision while rejecting conflicting independent results.
 * @param tasks - Full dependency graph with accepted artifacts for the publishing member only.
 * @returns one exact receipt per logical output path.
 */
export function selectPublicationArtifacts(tasks) {
    const selected = new Map();
    const dependsOn = (id, ancestor, seen = new Set()) => {
        if (seen.has(id))
            return false;
        seen.add(id);
        return (tasks.find(task => task.id === id)?.dependencies ?? [])
            .some(parent => parent === ancestor || dependsOn(parent, ancestor, seen));
    };
    for (const task of tasks)
        for (const receipt of task.artifacts) {
            const prior = selected.get(receipt.path);
            if (prior !== undefined && prior.receipt.sha256 !== receipt.sha256) {
                if (dependsOn(prior.task, task.id))
                    continue;
                if (!dependsOn(task.id, prior.task)) {
                    throw new TeamError(`independent accepted artifact versions conflict: ${receipt.path}; reconcile their tasks before publishing`, 'TEAM_TASK_EXECUTION_STALE');
                }
            }
            selected.set(receipt.path, { receipt, task: task.id });
        }
    return [...selected.values()].map(value => value.receipt);
}
