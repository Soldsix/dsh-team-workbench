/** Team membership, continuable-child provisioning, and roster-owned teardown. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent, ModelSelection } from '@deepseek-ai/dsh-agent';
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { TeamJournal } from './journal.ts';
import type { TeamRuntimeLifecycle } from './lifecycle.ts';
import type { TeamState } from './projection.ts';
import { TeamId } from './types.ts';
import type { EnsureExpertMemberRequest, SpawnTeammateRequest } from './host-types.ts';
import type { SpawnTeammateResult, EnsureExpertMemberResult, TeamMemberView, ConfigureTeamMemberModelRequest, ConfigureTeamMemberRoleRequest } from './types.ts';
import type { TeamSkillChoice, TeamSkillSelection } from './skill-types.ts';
import type { TeamWorkspaceRuntime } from './workspace-runtime.ts';
import type { WorkspaceIntegration } from './workspaces.ts';
/** Caller identity inside one implicit Team. */
export interface TeamMembership {
    readonly root: Agent;
    readonly id: TeamId;
    readonly role: 'lead' | 'teammate';
    readonly name: string;
}
/**
 * Resolve one active Team member by model-facing name, including the Lead pseudo-row.
 * @param root - exact live Team Lead.
 * @param state - current Team state.
 * @param rawName - candidate member name.
 * @returns resolved durable id and normalized name.
 */
export declare function resolveActiveMember(root: Agent, state: TeamState, rawName: string): {
    id: SessionId;
    name: string;
};
/** Owns Team identities and the lifecycle of rostered continuable children. */
export declare class TeamRoster {
    private readonly ctx;
    private readonly journal;
    private readonly lifecycle;
    private readonly maxMembers;
    private readonly maxDepth;
    private readonly enabledPresets;
    private readonly prepareSkills;
    private readonly copySkills;
    private readonly workspaceRuntime?;
    private readonly defaultMemberReasoningEffort;
    private readonly resolveSpawn?;
    private readonly inFlightCreations;
    private readonly expertCreations;
    /** A fresh member can enter its first tool before its creator checkpoints the active roster edge. */
    private readonly memberPublications;
    private readonly retiring;
    private readonly integrations;
    /**
     * @param ctx - Team service context with Agent, Session, persistence, and subagent services.
     * @param journal - authoritative Lead-log transaction owner.
     * @param lifecycle - shared Team runtime admission cutoff.
     * @param maxMembers - maximum immutable roster entries per Team.
     * @param maxDepth - maximum delegation depth below the Team Lead.
     * @param enabledPresets - root preset ids allowed to use Teams, or '*' for every preset.
     * @param prepareSkills - Resolve and validate a new member's selected instruction versions.
     * @param copySkills - Reuse one predecessor's saved instruction bytes for a successor.
     */
    constructor(ctx: Context, journal: TeamJournal, lifecycle: TeamRuntimeLifecycle, maxMembers: number, maxDepth: number, enabledPresets: readonly string[], prepareSkills: (caller: Agent, memberId: SessionId, choices: readonly TeamSkillChoice[], signal: AbortSignal) => Promise<TeamSkillSelection>, copySkills: (caller: Agent, sourceId: SessionId, memberId: SessionId) => TeamSkillSelection | undefined, workspaceRuntime?: TeamWorkspaceRuntime | undefined, defaultMemberReasoningEffort?: 'inherit' | 'highest', resolveSpawn?: ((caller: Agent, request: SpawnTeammateRequest) => SpawnTeammateRequest) | undefined);
    /**
     * Reinstall a rostered member's process-local caps before a cold activation.
     * @param root - exact Team Lead whose log owns the member.
     * @param memberId - target or ancestor member to resume.
     */
    restoreWorkspaceCap(root: Agent, memberId: SessionId): void;
    /** Release execution caps after Team disposal has drained child activations. */
    releaseWorkspaceCaps(): void;
    /**
     * Hold a member's next step until its private-copy integration finishes.
     * @param agent - Member whose next step must wait.
     * @param signal - Cancellation while integration is pending.
     */
    waitForIntegration(agent: Agent, signal: AbortSignal): Promise<void>;
    /**
     * Integrate one inactive member while preventing its next step from entering.
     * @param root - Exact Team Lead owning the shared workspace.
     * @param memberId - Member whose private changes are published.
     * @param signal - Cancellation before or during publication.
     * @param admitPath - Optional check applied to each changed path.
     * @param publication - Exact independently accepted artifact receipts.
     * @returns the recorded integration receipt.
     */
    integrateWorkspace(root: Agent, memberId: SessionId, signal: AbortSignal, admitPath?: (relativePath: string) => void | Promise<void>, publication?: readonly import('./task-work-types.ts').TeamFileReceipt[]): Promise<WorkspaceIntegration>;
    /**
     * Refresh a retained member's inputs while its next model step is held.
     * @param root - Exact owning Lead.
     * @param memberId - Inactive target member.
     * @param paths - Explicit existing relative input files.
     * @param signal - Goal and caller cancellation.
     * @returns refreshed file paths.
     */
    refreshWorkspace(root: Agent, memberId: SessionId, paths: readonly string[], signal: AbortSignal): Promise<WorkspaceIntegration>;
    private withInactiveWorkspace;
    /**
     * Whether one roster child is retired or is crossing the retirement cutoff.
     * @param root - Exact Team Lead.
     * @param memberId - Member being checked.
     * @returns whether retirement blocks new work.
     */
    isRetiredOrRetiring(root: Agent, memberId: SessionId): boolean;
    /**
     * Deny direct Agent/LLM/tool entry for a retired Team child, including a cold-created Agent.
     * @param agent - Child attempting to run.
     * @returns denial reason, or undefined when the child may run.
     */
    retirementDenial(agent: Agent): string | undefined;
    /** Resolve enablement from the root's live composition, including a blank-session preset change. */
    private enabledMembership;
    /**
     * Resolve one exact live Agent's Team role.
     * @param agent - exact live Agent used as the authority credential.
     * @returns its root, Team identity, role, and model-facing name.
     */
    membership(agent: Agent): TeamMembership;
    /**
     * Resolve a caller without throwing for scoped installation and lifecycle observers.
     * @param agent - candidate exact live Agent.
     * @returns Team membership, or undefined for non-Team subagents and stale identities.
     */
    tryMembership(agent: Agent): TeamMembership | undefined;
    /**
     * Resolve the Team whose goal governs a member or an ordinary delegated descendant.
     * @param agent - Exact live caller, including legacy subagents.
     * @returns the ancestor membership without enrolling the descendant in its roster.
     */
    governingMembership(agent: Agent): TeamMembership | undefined;
    /**
     * List the runtime-enriched roster visible to one Team member.
     * @param membership - exact caller membership resolved by this roster.
     * @returns Lead and teammate rows in creation order.
     */
    list(membership: TeamMembership): TeamMemberView[];
    /**
     * Read an existing member's next-request override from the Lead log.
     * @param agent - Exact live Team member.
     * @returns selected route, or undefined when the creation profile remains in use.
     */
    modelRouteFor(agent: Agent): ModelSelection | undefined;
    /**
     * Change the next-request route without replacing an existing member Session.
     * @param caller - Exact live Lead or direct parent.
     * @param request - Existing teammate and registered model selection.
     * @param signal - Cancellation before the durable route is committed.
     * @returns the updated roster row.
     */
    configureModel(caller: Agent, request: ConfigureTeamMemberModelRequest, signal: AbortSignal): Promise<TeamMemberView>;
    /**
     * Assign an inactive retained member a responsibility without changing its Session or persona.
     * @param caller - Exact live Lead or direct parent.
     * @param request - Expected role revision, responsibility, and recorded reason.
     * @param signal - Cancellation before durable publication.
     * @returns updated retained member.
     */
    configureRole(caller: Agent, request: ConfigureTeamMemberRoleRequest, signal: AbortSignal): Promise<TeamMemberView>;
    /**
     * Create one named, continuable child of the calling Team member.
     * @param caller - exact live Team member.
     * @param request - name, responsibility, prompt, composition, model settings, and cancellation.
     * @returns the active roster row.
     */
    spawn(caller: Agent, request: SpawnTeammateRequest): Promise<SpawnTeammateResult>;
    /**
     * Locate the Team-local expert continuation, coalescing concurrent first assignments.
     * @param caller - Exact live Team member.
     * @param request - Expert reference and settings used only for first creation.
     * @returns the current member; an existing binding receives no new prompt.
     */
    ensureExpert(caller: Agent, request: EnsureExpertMemberRequest): Promise<EnsureExpertMemberResult>;
    /**
     * Return admitted creation operations captured for ordered disposal.
     * @returns detached snapshot ordered only by Set insertion.
     */
    pendingCreations(): readonly Promise<unknown>[];
    /**
     * Reconcile provisioning state when one Team member Session starts.
     * @param agent - newly started exact live Agent.
     * @param signal - shared runtime cancellation.
     */
    recoverFor(agent: Agent, signal: AbortSignal): Promise<void>;
    /**
     * Retire an idle member while retaining its Session, identity, and private workspace.
     * @param caller - Exact live parent or Team Lead.
     * @param targetName - Durable member name.
     * @param signal - Cancellation before retirement commits.
     * @returns the retired roster row.
     */
    retire(caller: Agent, targetName: string, signal: AbortSignal): Promise<TeamMemberView>;
    /**
     * Reactivate one saved member without creating another Session or repeating its first prompt.
     * @param caller - Exact live parent or Team Lead.
     * @param targetName - Retired member name.
     * @param signal - Cancellation before reactivation commits.
     * @returns the active roster row.
     */
    reactivate(caller: Agent, targetName: string, signal: AbortSignal): Promise<TeamMemberView>;
    /** Authorize the Lead or the member's direct delegator. */
    private assertMemberLifecycleAuthority;
    /** Check every durable and live obligation that prevents retirement. */
    private assertRetirable;
    /**
     * Interrupt one live teammate turn without clearing its pending inbox.
     * @param caller - exact live Lead Agent.
     * @param targetName - durable teammate name.
     * @returns the target status sampled before cancellation.
     */
    interrupt(caller: Agent, targetName: string): {
        previousStatus: 'running' | 'inactive';
    };
    /**
     * Group live roster children by direct parent, with descendants drained before ancestors.
     * @returns parents and their resident roster children in teardown order.
     */
    liveChildrenByRoot(): Map<Agent, SessionId[]>;
    /**
     * Release exact teammate Activations through the continuation lifecycle owner.
     * @param root - exact live direct parent authorizing release.
     * @param childIds - selected roster child ids.
     */
    stopTeammates(root: Agent, childIds: readonly SessionId[]): Promise<void>;
    /** Perform one creation admitted before the Team runtime disposal cutoff. */
    private spawnAdmitted;
    /** Persist the roster and initial choice before the continuation can accept work. */
    private reserveMember;
    /** A descendant requires its direct parent's committed active roster edge. */
    private awaitCallerPublication;
    /** Establish the child and publish its active edge before releasing nested creation. */
    private activateMember;
    /** Flush the accepted initial inbox item before the Lead can commit `active`. */
    private checkpointInitialPrompt;
    /** Settle provisioning-only members from their independently durable child Sessions. */
    private reconcileProvisioning;
    /** Build one runtime member row after successful creation. */
    private memberView;
    /** Validate explicit member settings before a durable roster name is reserved. */
    private resolveMemberOptions;
    /**
     * Read the ordered parent chain from the durable root roster.
     * @param root - exact live Team Lead.
     * @param targetId - rostered target whose parent chain is needed.
     * @returns intermediate member ids, excluding the Lead and target.
     */
    ancestorIds(root: Agent, targetId: SessionId): SessionId[];
    /** Validate a never-reused model-facing teammate name. */
    private memberName;
    /** Append one terminal provisioning edge unless recovery already settled it. */
    private settleProvisioning;
    /** Whether a Session's own suffix identifies a provider-owned subagent child. */
    private subagentDescriptor;
}
