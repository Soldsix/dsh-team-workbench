/** Persisted task-work transitions checked against the already accepted Team prefix. */
import type { TeamState } from './projection.ts';
import type { TeamTaskSnapshot } from './types.ts';
/**
 * Reject a task record that would reuse an execution or rewrite accepted inputs or evidence.
 * @param state - Accepted Team state before the candidate event.
 * @param previous - Earlier task revision, if one exists.
 * @param task - Parsed candidate task record.
 */
export declare function assertTaskWorkEvent(state: TeamState, previous: TeamTaskSnapshot | undefined, task: TeamTaskSnapshot): void;
