/** Private member copies and checked integration into one shared workspace. */
import type { TeamFileReceipt } from './task-work-types.ts';
/** Paths retained with a member record so cold activations use the same copy. */
export interface MemberWorkspace {
    readonly cwd: string;
    readonly baselineManifestPath: string;
}
/** Caller-configured bounds for a complete member snapshot and later integration. */
export interface WorkspaceLimits {
    /** Shared lock directory used by every cooperative publisher for this deployment. */
    readonly coordinationRoot?: string;
    /** Maximum queue duration before returning a retryable publication error. */
    readonly coordinationWaitMs?: number;
    /** Cancellation-aware lock polling interval. */
    readonly coordinationPollMs?: number;
    /** Exact independently accepted outputs; only these hashes may be published. */
    readonly publication?: readonly TeamFileReceipt[];
    /** Maximum regular files inspected while copying or integrating a member workspace. */
    readonly maxFiles: number;
    /** Maximum total regular-file bytes inspected while copying or integrating. */
    readonly maxBytes: number;
    /** Top-level cache directories that members do not need. */
    readonly omittedDirectories?: readonly string[];
    /** Top-level dependency directories linked back for reads; sandbox denies writes there. */
    readonly readOnlySharedDirectories?: readonly string[];
    /** Cancellation checked during workspace scans and before applying an integration. */
    readonly signal?: AbortSignal;
    /** Relative project paths copied for this goal; omission includes the complete project. */
    readonly includedPaths?: readonly string[];
    /** Explicit goal paths retained even when their top-level directory is normally omitted. */
    readonly includedOmittedPaths?: readonly string[];
}
/**
 * Count a broad automatic member copy without hashing file contents.
 * @param root - Lead project root to inspect.
 * @param limits - Automatic-copy count, byte, and directory filters.
 * @param signal - Cancellation from the requesting member creation.
 * @returns when the selected project fits the automatic-copy limits.
 */
export declare function checkAutomaticWorkspaceSize(root: string, limits: WorkspaceLimits, signal?: AbortSignal): Promise<void>;
/** One integration's applied file paths; an unchanged copy applies nothing. */
export interface WorkspaceIntegration {
    readonly paths: string[];
}
/**
 * Copy the selected project paths to a private member directory and retain their
 * independently checked baseline outside the member's writable `cwd`.
 * @param sharedPath - current workspace to copy.
 * @param storagePath - existing private storage directory, disjoint from the shared workspace.
 * @param limits - deployment file and byte bounds plus caller cancellation.
 * @returns paths to record durably with the member before it starts work.
 */
export declare function createMemberWorkspace(sharedPath: string, storagePath: string, limits: WorkspaceLimits): Promise<MemberWorkspace>;
/**
 * Integrate changed regular files after checking every shared file against the
 * member's baseline. Configured deployments serialize cooperative publishers across processes.
 * @param sharedPath - workspace captured by `createMemberWorkspace`.
 * @param workspace - durable member paths returned at creation.
 * @param limits - deployment bounds and caller cancellation.
 * @param admitPath - current goal's path admission, repeated before each publication.
 * @returns the relative regular-file paths applied to the shared workspace.
 */
export declare function integrateMemberWorkspace(sharedPath: string, workspace: MemberWorkspace, limits: WorkspaceLimits, admitPath?: (relativePath: string) => void | Promise<void>): Promise<WorkspaceIntegration>;
