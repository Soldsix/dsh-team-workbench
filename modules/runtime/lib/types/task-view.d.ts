/** Pure task-view derivation shared by the task board and the client projection. */
import type { TeamState } from './projection.ts';
import type { TeamTaskSnapshot, TeamTaskView, TeamTaskDispatchBlocker } from './types.ts';
/**
 * Whether two normalized file or directory prefixes overlap on path components.
 * @param left - normalized write scope.
 * @param right - normalized write scope.
 * @returns whether either scope contains the other.
 */
export declare function scopesOverlap(left: string, right: string): boolean;
/**
 * Whether every current blocker of one task completed.
 * @param state - Team state supplying sibling tasks.
 * @param task - durable task snapshot to test.
 * @returns whether the task has no incomplete blockers.
 */
export declare function taskReady(state: TeamState, task: TeamTaskSnapshot): boolean;
/**
 * Explain a retained task's first durable dispatch hold without claiming live worker availability.
 * @param state - Current Team state.
 * @param task - Pending or submitted task.
 * @returns blocking condition, or undefined when no durable condition blocks dispatch.
 */
export declare function taskDispatchBlocker(state: TeamState, task: TeamTaskSnapshot): TeamTaskDispatchBlocker | undefined;
/**
 * Derive one task view with owner name, readiness, and advisory write overlaps.
 * A committing caller may pass its pre-append state because `task` supplies the
 * new value explicitly; owner names, blocker readiness, and other task scopes
 * do not change when that snapshot is appended.
 * @param state - Team state supplying members and sibling tasks.
 * @param task - durable task snapshot to view.
 * @returns a detached task view.
 */
export declare function projectTaskView(state: TeamState, task: TeamTaskSnapshot): TeamTaskView;
