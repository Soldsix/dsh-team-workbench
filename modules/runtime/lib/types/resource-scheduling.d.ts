/** Exclusive browser/device/account ownership derived from durable active tasks. */
import type { TeamState } from './projection.ts';
import type { TeamTaskSnapshot } from './types.ts';
/**
 * Find resource owners that conflict with a proposed task assignment.
 * @param state - Immutable projected state; its resource index is reused across all task views.
 * @param task - Current task or the next candidate revision.
 * @returns distinct active task identities retaining an exclusive resource through independent acceptance.
 */
export declare function resourceConflicts(state: TeamState, task: TeamTaskSnapshot): string[];
