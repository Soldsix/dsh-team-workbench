/** Host-owned Team member workspace and execution caps. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { MemberWorkspace, WorkspaceIntegration, WorkspaceLimits } from './workspaces.ts';
import type { TeamExecutionScope } from './goal-types.ts';
import type { TeamFileReceipt } from './task-work-types.ts';
/** Durable member data used to restore confinement before a cold activation. */
export interface TeamWorkspaceRecord extends MemberWorkspace {
    readonly maxMode: 'read-only' | 'workspace-write';
}
/** Profile-owned isolation settings; the storage root must be outside each shared workspace. */
export interface TeamWorkspaceConfig extends Omit<WorkspaceLimits, 'signal' | 'includedPaths' | 'omittedDirectories' | 'readOnlySharedDirectories'> {
    /** Storage directory for member copies and baseline manifests, outside shared workspaces. */
    readonly storageRoot: string;
    /** Fast preflight cap for an automatic complete-project copy. */
    readonly maxAutomaticFiles?: number;
    /** Fast preflight byte cap for an automatic complete-project copy. */
    readonly maxAutomaticBytes?: number;
    /** Exact audited native tool names allowed for isolated members. */
    readonly allowedTools: string[];
    /** Exact server-qualified MCP tool names added to the member cap. */
    readonly additionalMcpTools?: string[];
    /** Top-level cache directories omitted from member copies. */
    readonly omittedDirectories?: string[];
    /** Top-level dependency directories linked for reads; the sandbox denies writes. */
    readonly readOnlySharedDirectories?: string[];
}
/** Creates member copies and retains process-local execution caps until Team disposal. */
export declare class TeamWorkspaceRuntime {
    private readonly ctx;
    private readonly config;
    private readonly caps;
    /** @param ctx - host services that enforce file and tool execution. @param config - storage, limits, and audited tools. */
    constructor(ctx: Context, config: TeamWorkspaceConfig);
    /** Resolve enforcement services at use time so unloaded providers fail closed. */
    private requireEnforcement;
    /**
     * Check a proposed working set before a durable member name is reserved.
     * @param lead - Team Lead whose cwd owns isolated member copies.
     * @param execution - Confirmed file resources for this Team.
     * @param workingPaths - Optional project-relative member inputs.
     * @param signal - Caller cancellation during the metadata preflight.
     * @returns project-relative paths selected for a member copy.
     */
    validateSelection(lead: Agent, execution?: TeamExecutionScope, workingPaths?: readonly string[], signal?: AbortSignal): Promise<string[]>;
    /**
     * Capture the Lead workspace and install both caps before child materialization.
     * @param lead - Team Lead whose cwd is the shared integration root.
     * @param caller - direct delegator whose current read-only limit is inherited.
     * @param childId - reserved child Session id.
     * @param signal - caller cancellation during copying.
     * @param execution - Confirmed file roots used to select the project working set.
     * @param workingPaths - Optional project-relative paths selected for this member.
     * @param empty - Start without copying inputs when none are required by the approved task.
     * @returns durable member workspace record.
     */
    create(lead: Agent, caller: Agent, childId: SessionId, signal: AbortSignal, execution?: TeamExecutionScope, workingPaths?: readonly string[], empty?: boolean): Promise<TeamWorkspaceRecord>;
    /**
     * Restore process-local caps from the durable roster before a cold child activation.
     * @param childId - persisted child Session id.
     * @param record - persisted private cwd, baseline, and immutable mode maximum.
     */
    restore(childId: SessionId, record: TeamWorkspaceRecord): void;
    /**
     * Check and publish one member's changed regular files to the Lead workspace.
     * @param lead - Team Lead whose cwd was captured at member creation.
     * @param record - durable member workspace record.
     * @param signal - caller cancellation.
     * @param admitPath - current goal's relative-path write admission.
     * @param publication - Exact independently accepted artifact receipts required for publication.
     * @returns applied relative file paths.
     */
    integrate(lead: Agent, record: TeamWorkspaceRecord, signal: AbortSignal, admitPath?: (relativePath: string) => void | Promise<void>, publication?: readonly TeamFileReceipt[]): Promise<WorkspaceIntegration>;
    /**
     * Refresh explicit input files in a member workspace.
     * @param lead - Exact owning Lead.
     * @param record - Inactive member's recorded workspace.
     * @param paths - Existing project-relative input files.
     * @param signal - Goal and caller cancellation.
     * @returns refreshed relative paths.
     */
    refresh(lead: Agent, record: TeamWorkspaceRecord, paths: readonly string[], signal: AbortSignal): Promise<string[]>;
    /** Release process-local caps after every member activation has stopped. */
    dispose(): void;
}
