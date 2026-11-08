import type { MemberWorkspace } from './workspaces.ts';
/**
 * Materialize explicit input files and advance only their baseline entries.
 * @param sharedPath - Owning Lead workspace.
 * @param workspace - Inactive member's durable workspace record.
 * @param paths - Explicit existing relative input files, excluding directories and links.
 * @param maxBytes - Combined input byte budget.
 * @param signal - Goal and caller cancellation.
 * @returns files refreshed; all inputs are checked before the first publication.
 */
export declare function refreshMemberInputs(sharedPath: string, workspace: MemberWorkspace, paths: readonly string[], maxBytes: number, signal: AbortSignal): Promise<string[]>;
