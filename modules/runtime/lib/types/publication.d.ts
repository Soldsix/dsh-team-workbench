/** Selects artifact revisions only when their task dependencies declare an ordering. */
import type { TeamTaskId } from './types.ts';
import type { TeamFileReceipt } from './task-work-types.ts';
/** Dependency node with already authorized accepted artifacts, or none for intermediate tasks. */
export interface PublicationTask {
    readonly id: TeamTaskId;
    readonly dependencies: readonly TeamTaskId[];
    readonly artifacts: readonly TeamFileReceipt[];
}
/**
 * Select the descendant's file revision while rejecting conflicting independent results.
 * @param tasks - Full dependency graph with accepted artifacts for the publishing member only.
 * @returns one exact receipt per logical output path.
 */
export declare function selectPublicationArtifacts(tasks: readonly PublicationTask[]): TeamFileReceipt[];
