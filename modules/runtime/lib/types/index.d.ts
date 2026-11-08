/** Agent Teams service façade over roster, mailbox, task, and runtime lifecycle owners. */
import { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import z from '@deepseek-ai/schemastery';
import { type Agent } from '@deepseek-ai/dsh-agent';
import type { ProposeTeamGoalRequest, TeamGoalProposal, TeamGoalReview } from './goal-types.ts';
import type { TeamMembership } from './roster.ts';
import type { TeamTaskArtifactReadRequest, TeamTaskArtifactReadResult, TeamTaskExecutionId, TeamTaskReuseCheck } from './task-work-types.ts';
import type { SelectTeamSkillsRequest, TeamSelectedSkill, TeamSkillSelectionView } from './skill-types.ts';
import { TeamMessageId, TeamTaskId } from './types.ts';
import type { EnsureExpertMemberRequest, SpawnTeammateRequest } from './host-types.ts';
import type { Config, ConfigureTeamMemberModelRequest, ConfigureTeamMemberRoleRequest, CreateTeamTaskRequest, SendTeamMessageRequest, SendTeamMessageResult, SpawnTeammateResult, EnsureExpertMemberResult, TeamMemberView, TeamMemberWorkspace, TeamMailboxMessageView, TeamMailboxPage, TeamMessageSnapshot, TeamTaskView, TeamTaskDispatchBlocker, ListTeamTaskArchiveRequest, TeamTaskArchivePage, TeamWaitResult, TeamBriefSnapshot, TeamBriefView, UpdateTeamBriefRequest, UpdateTeamTaskRequest, RecordTeamAdviserDecisionRequest, TeamAdviserDecision } from './types.ts';
export type * from './types.ts';
export type { EnsureExpertMemberRequest, AssignTeamExpertRequest, SpawnTeammateRequest } from './host-types.ts';
export type { TeamMembership } from './roster.ts';
export { TeamId, TeamMessageId, TeamTaskId } from './types.ts';
export { TeamTaskExecutionId } from './task-work-types.ts';
export { readProjectPlan } from './project-plan.ts';
export { TeamError } from './error.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        agentTeams: TeamService;
    }
}
/** Agent Teams service backed by the exact live Lead Session log. */
export declare class TeamService extends TypertRemoteService {
    static inject: string[];
    private readonly coordination;
    private readonly selectedMembers;
    private readonly pendingTaskDispatches;
    private readonly taskDispatchRuns;
    private readonly memberToolMenus;
    private readonly continueRuns;
    static Config: z<Config>;
    /** Validated deployment limits used by every Team operation. */
    private readonly config;
    private readonly workspaces;
    private readonly artifacts;
    private readonly activity;
    private readonly lifecycle;
    private readonly journal;
    private readonly roster;
    private readonly mailbox;
    private readonly tasks;
    private readonly requests;
    private readonly goals;
    private readonly skillSelections;
    constructor(ctx: Context, config?: Config);
    /** Install a route selector whose value follows the Lead's durable member revision. */
    private installMemberModelSelection;
    /**
     * Resolve one exact live Agent's Team role.
     * @param agent - exact live Agent used as the authority credential.
     * @returns its root, Team identity, role, and model-facing name.
     */
    membership(agent: Agent): TeamMembership;
    /** Validated selection limits for tool admission before resolving instruction files. */
    get skillSelectionLimits(): {
        readonly maxSkills: number;
        readonly maxBytes: number;
    };
    /**
     * Read one member's saved skill names, purposes, versions, and goal applicability.
     * @param caller - Exact live Team member.
     * @param member - Durable target name; omitted means the caller.
     * @returns Compact metadata without loading instruction bodies.
     */
    getSkills(caller: Agent, member?: string): TeamSkillSelectionView;
    /**
     * Read an exact instruction version saved for the caller.
     * @param caller - Exact live Team member.
     * @param name - Selected module name.
     * @returns Detached selected content or undefined when not selected; stale goals and corrupt content throw.
     */
    getSkillContent(caller: Agent, name: string): TeamSelectedSkill | undefined;
    /**
     * Replace the skill choice for a member, its direct child, or any member when called by the Lead.
     * @param caller - Exact live selecting Agent.
     * @param request - Target, current selection revision, and resolved instruction snapshots.
     * @param signal - Cancellation before append; accepted goal changes and runtime disposal also cancel queued writes.
     * @returns Committed selection metadata.
     */
    selectSkills(caller: Agent, request: SelectTeamSkillsRequest, signal: AbortSignal): Promise<TeamSkillSelectionView>;
    /**
     * List the runtime-enriched roster visible to one Team member.
     * @param agent - exact live Team member.
     * @returns Lead and teammate rows in creation order.
     */
    listMembers(agent: Agent): TeamMemberView[];
    /**
     * Change an existing teammate's model for its next request while retaining its Session.
     * @param agent - Exact live Team Lead or the target's direct parent.
     * @param request - Configured provider, model, and optional supported effort.
     * @param signal - Cancellation before the durable route is committed.
     * @returns updated member row.
     */
    configureMemberModel(agent: Agent, request: ConfigureTeamMemberModelRequest, signal: AbortSignal): Promise<TeamMemberView>;
    /**
     * Configure an inactive retained member's responsibility without replacing its Session.
     * @param agent - Exact Lead or direct parent.
     * @param request - Responsibility and expected role revision from listMembers.
     * @param signal - Cancellation before the role is committed.
     * @returns updated member row.
     */
    configureMemberRole(agent: Agent, request: ConfigureTeamMemberRoleRequest, signal: AbortSignal): Promise<TeamMemberView>;
    /**
     * Read bounded current-goal recovery diagnostics without waking members or mutating their work.
     * @param caller - Exact Team member reading the shared board.
     * @param limit - Maximum tasks in this page, between one and fifty.
     * @param after - Exclusive task cursor from the previous page.
     * @returns current goal, aggregate role and skill gaps, and paged task recovery pointers.
     */
    recoverySummary(caller: Agent, limit: number, after?: string): {
        goalRevision: number;
        activeGoal: boolean;
        membersWithoutRole: number;
        staleSkillSelections: number;
        totalIssues: number;
        submitted: {
            currentGoal: number;
            historicalGoal: number;
        };
        advisers: {
            name: string;
            teamFunction: string;
        }[];
        issues: {
            taskId: TeamTaskId;
            revision: number;
            blocker?: TeamTaskDispatchBlocker;
            executionId?: TeamTaskExecutionId;
            goalRevision?: number;
            phase?: string;
            ownerName?: string;
            reviewerName?: string;
            nextStep: string;
            recovery?: TeamTaskView['recovery'];
        }[];
        nextCursor?: TeamTaskId;
    };
    /**
     * Retire an inactive direct child or any inactive member when called by its Lead.
     * @param agent - Exact live parent or Team Lead.
     * @param target - Durable member name whose history and identity remain retained.
     * @param signal - Cancellation before the lifecycle change commits.
     * @returns the retired member's current row.
     */
    retireMember(agent: Agent, target: string, signal: AbortSignal): Promise<TeamMemberView>;
    /**
     * Return a retired member to the active roster without submitting another prompt.
     * @param agent - Exact live parent or Team Lead.
     * @param target - Retained member name to reuse.
     * @param signal - Cancellation before the lifecycle change commits.
     * @returns the active member's current row; sending a message starts its next work.
     */
    reactivateMember(agent: Agent, target: string, signal: AbortSignal): Promise<TeamMemberView>;
    /**
     * Inspect a member's private working copy without reading project contents.
     * @param agent - Exact live Team member.
     * @param target - Durable member name.
     * @returns its saved isolation details, or null for a shared-workspace member.
     */
    getWorkspace(agent: Agent, target: string): TeamMemberWorkspace | null;
    /**
     * Check input paths and automatic-copy limits before reserving a member identity.
     * @param caller - Exact live Lead or delegating Team member.
     * @param workingPaths - Existing paths below the Lead project; omitted uses confirmed resources.
     * @param signal - Cancellation while checking metadata; goal changes also cancel this operation.
     * @returns selected inputs and copy limits; this does not create, copy, or publish files.
     */
    prepareWorkspace(caller: Agent, workingPaths: readonly string[] | undefined, signal: AbortSignal): Promise<{
        isolation: boolean;
        goalRevision: number;
        workingPaths: readonly string[];
        limits?: {
            maxFiles: number;
            maxBytes: number;
            maxAutomaticFiles?: number;
            maxAutomaticBytes?: number;
        };
        note: string;
    }>;
    /**
     * Publish an inactive member's changes after checking the captured shared-file versions.
     * @param agent - Exact live Team Lead owning integration.
     * @param target - Durable member name whose work is ready to integrate.
     * @param signal - Cancellation before and during file publication.
     * @returns the paths recorded by the resumable integration receipt.
     */
    integrateWorkspace(agent: Agent, target: string, signal: AbortSignal): Promise<{
        paths: string[];
    }>;
    /**
     * Refresh explicit inputs of an inactive retained teammate without replacing its identity.
     * @param caller - Exact Team Lead.
     * @param target - Member name from listMembers.
     * @param paths - Existing project-relative input files.
     * @param signal - Goal and caller cancellation.
     * @returns refreshed input paths.
     */
    refreshWorkspace(caller: Agent, target: string, paths: readonly string[], signal: AbortSignal): Promise<{
        paths: string[];
    }>;
    /**
     * Create one named, continuable child of the calling Team member.
     * @param caller - exact live Team member.
     * @param request - name, responsibility, prompt, composition, model settings, and cancellation.
     * @returns the active roster row.
     */
    private resolveSpawnPlan;
    /**
     * Create one continuable member after confirmed scope and roster admission.
     * @param caller - Exact Lead or delegating member.
     * @param request - Named member, role, model, skills, prompt and cancellation.
     * @returns retained member identity and current activity.
     */
    spawnTeammate(caller: Agent, request: SpawnTeammateRequest): Promise<SpawnTeammateResult>;
    /**
     * Reuse one expert's existing Team member or provision it once for concurrent callers.
     * @param caller - Exact live Team member.
     * @param request - Expert reference and creation settings used only when absent.
     * @returns the bound member; reuse never submits another prompt.
     */
    ensureExpertMember(caller: Agent, request: EnsureExpertMemberRequest): Promise<EnsureExpertMemberResult>;
    /**
     * Read the confirmed goal separately from Lead-authored notes.
     * @param agent - Exact live Team member.
     * @returns detached proposal, decision, and current goal records.
     */
    getGoal(agent: Agent): TeamGoalReview;
    /**
     * Describe deployment controls without exposing model connections, skills or user content.
     * @param agent - Exact live Team member reading the policy.
     * @returns current provisioning limits and the protection actually provided.
     */
    runtimePolicy(agent: Agent): {
        automaticProvisioning: boolean;
        maxProvisionPerPass: number;
        maxDepth: number;
        finalDelivery: 'manual' | 'notify' | 'publish-and-notify';
        crossProcessCoordination: boolean;
        fileProtection: 'private-workspaces-and-cooperative-publication' | 'shared-workspace';
        strictExternalConfinement: false;
    };
    /**
     * Propose a complete objective or withdrawal without changing execution authority.
     * @param agent - Exact live Lead.
     * @param request - Current revisions and the proposed change.
     * @param signal - Cancellation before the write.
     * @returns the pending proposal shown in the native user review.
     */
    proposeGoal(agent: Agent, request: ProposeTeamGoalRequest, signal: AbortSignal): Promise<TeamGoalProposal>;
    /**
     * Ask the user to accept or revise the current persisted proposal.
     * @param agent - Exact live Lead; descendants relay their questions to it.
     * @param proposalRevision - Exact proposal being reviewed.
     * @param signal - Cancellation while awaiting the human answer.
     * @returns committed goal review state; stale answers cannot apply.
     */
    reviewGoal(agent: Agent, proposalRevision: number, signal: AbortSignal): Promise<TeamGoalReview>;
    /**
     * Queue one durable peer message, then attempt immediate delivery.
     * @param caller - exact live sending Team member.
     * @param request - target name, content, and pre-queue cancellation.
     * @returns durable message identity and immediate-delivery observation.
     */
    sendMessage(caller: Agent, request: SendTeamMessageRequest): Promise<SendTeamMessageResult>;
    /**
     * Read delivery state without copying message bodies into the caller's context.
     * @param agent - Exact live member of this Team.
     * @returns ordered mailbox summaries, including quarantined history.
     */
    listMessages(agent: Agent): TeamMailboxMessageView[];
    /**
     * Read a bounded newest-first mailbox page.
     * @param agent - Exact live member of this Team.
     * @param offset - Number of newer records to skip.
     * @param limit - Page length from one through fifty.
     * @returns delivery summaries and the total available count.
     */
    listMessagePage(agent: Agent, offset: number, limit: number): TeamMailboxPage;
    /**
     * Read one message for inspection before recovery or historical adoption.
     * @param agent - Exact live member of this Team.
     * @param messageId - Durable message identity.
     * @returns a detached saved message including its full content.
     */
    getMessage(agent: Agent, messageId: TeamMessageId): TeamMessageSnapshot;
    /**
     * Retry delivery of a message belonging to the current confirmed goal.
     * @param agent - Exact live member authorized to recover this message.
     * @param messageId - Durable message identity.
     * @param signal - Cancellation while admitting or attempting delivery.
     * @returns its immediate delivery observation.
     */
    retryMessage(agent: Agent, messageId: TeamMessageId, signal: AbortSignal): Promise<SendTeamMessageResult>;
    /**
     * Requeue a historical message after the Lead explicitly adopts its contents.
     * @param agent - Exact live Team Lead.
     * @param messageId - Historical source message, retained unchanged.
     * @param signal - Cancellation before the new queued record is admitted.
     * @returns the new message's identity and immediate delivery observation.
     */
    adoptMessage(agent: Agent, messageId: TeamMessageId, signal: AbortSignal): Promise<SendTeamMessageResult>;
    /**
     * Create one unowned pending task in the Team Lead log.
     * @param caller - exact live Team member creating the task.
     * @param request - task text, blockers, and advisory write scopes.
     * @param signal - optional caller cancellation before append; goal changes and runtime disposal always cancel queued writes.
     * @returns the revision-one task view.
     */
    createTask(caller: Agent, request: CreateTeamTaskRequest, signal?: AbortSignal): Promise<TeamTaskView>;
    /**
     * Return one task, including a deleted tombstone.
     * @param caller - exact live Team member reading the task.
     * @param id - Team-local task identity.
     * @returns the latest task value and derived readiness diagnostics.
     */
    getTask(caller: Agent, id: TeamTaskId): TeamTaskView;
    /**
     * List pending and in-progress tasks in numeric creation order.
     * @param caller - exact live Team member reading the board.
     * @returns detached current task views.
     */
    listTasks(caller: Agent): TeamTaskView[];
    /**
     * Record one independently evidenced adviser finding on a submitted execution.
     * @param caller - Exact live adviser member.
     * @param request - Submitted execution, conclusion, and directly checked evidence.
     * @param signal - Cancellation before the durable decision is committed.
     * @returns the saved finding.
     */
    recordAdviserDecision(caller: Agent, request: RecordTeamAdviserDecisionRequest, signal: AbortSignal): Promise<TeamAdviserDecision>;
    /**
     * Reuse reviewed skill content under the current confirmed goal without upgrading its version.
     * @param caller - Exact Lead or direct parent.
     * @param member - Retained member name.
     * @param expectedRevision - Saved skill selection version.
     * @param signal - Cancellation before publication.
     * @returns metadata for the rebound selection.
     */
    rebindSkills(caller: Agent, member: string, expectedRevision: number, signal: AbortSignal): Promise<TeamSkillSelectionView>;
    /**
     * Current decisions for one exact execution, in saved order.
     * @param caller - Team member reading the findings.
     * @param taskId - Current task whose execution supplies the decision identity.
     * @returns detached findings for the current goal and execution.
     */
    listAdviserDecisions(caller: Agent, taskId: TeamTaskId): TeamAdviserDecision[];
    /**
     * Read a bounded page of completed tasks without consuming the active task quota.
     * @param agent - Exact live Team member.
     * @param request - Exclusive archive cursor and requested page length.
     * @returns retained task views and the next cursor when more completions exist.
     */
    listTaskArchive(agent: Agent, request: ListTeamTaskArchiveRequest): TeamTaskArchivePage;
    /**
     * Recheck observed files and environment before reusing a retained task result.
     * @param agent - Exact live Team member requesting verification.
     * @param id - Retained Team task identity.
     * @param signal - Cancellation while inspecting files.
     * @returns the current reuse decision and concrete observations.
     */
    validateTaskReuse(agent: Agent, id: TeamTaskId, signal: AbortSignal): Promise<TeamTaskReuseCheck>;
    /**
     * Check a trusted scheduler's explicit prerequisite set before publishing and preparing downstream inputs.
     * @param agent - Exact live Team member.
     * @param ids - Accepted prerequisites or the final delivery task.
     * @param signal - Cancellation while inspecting versions and files.
     * @returns checked receipts; expected accepted updates do not invalidate the handoff.
     */
    validateTaskHandoff(agent: Agent, ids: readonly TeamTaskId[], signal: AbortSignal): Promise<TeamTaskReuseCheck[]>;
    /**
     * Inspect a submitted artifact without exposing another member's private directory.
     * @param agent - Exact live Team member requesting evidence.
     * @param request - Task, execution, receipt path, and optional continuation offset.
     * @param signal - Cancellation during version checks and bounded reads.
     * @returns verified text and the next byte offset when more remains.
     */
    readTaskArtifact(agent: Agent, request: TeamTaskArtifactReadRequest, signal: AbortSignal): Promise<TeamTaskArtifactReadResult>;
    /**
     * Read a task's recorded input without depending on the reviewer's private working set.
     * @param agent - Exact Team member inspecting the current execution.
     * @param request - Task, execution, recorded input path and continuation offset.
     * @param signal - Cancellation during receipt verification and reading.
     * @returns verified UTF-8 input text and the next page offset.
     */
    readTaskInput(agent: Agent, request: TeamTaskArtifactReadRequest, signal: AbortSignal): Promise<TeamTaskArtifactReadResult>;
    private readTaskFile;
    /**
     * Read the shared brief without changing task or Agent state.
     * @param caller - exact live Team member.
     * @returns detached brief, or null before the Lead records one.
     */
    getBrief(caller: Agent): TeamBriefView | null;
    /**
     * Record the user's objective, existing authorization, and shared decisions.
     * This text supplies context and never changes runtime permission policy.
     * @param caller - exact live Team Lead.
     * @param request - observed revision and fields to replace.
     * @param signal - optional caller cancellation before append; goal changes and runtime disposal always cancel queued writes.
     * @returns the committed next brief revision.
     */
    updateBrief(caller: Agent, request: UpdateTeamBriefRequest, signal?: AbortSignal): Promise<TeamBriefSnapshot>;
    /**
     * Compare-and-set one authorized task transition.
     * @param caller - exact live Team member authorizing the mutation.
     * @param request - task identity, expected revision, action, and action fields.
     * @param signal - optional caller cancellation before append; goal changes and runtime disposal always cancel queued writes.
     * @returns the committed next task revision.
     */
    updateTask(caller: Agent, request: UpdateTeamTaskRequest, signal?: AbortSignal): Promise<TeamTaskView>;
    /**
     * Wait for the next Team-domain or member-status change.
     * @param caller - exact live Team member waiting for activity.
     * @param timeoutMs - bounded wait duration from ten seconds through one hour.
     * @param signal - caller cancellation for the wait only.
     * @returns one observed change or a timeout result.
     */
    waitForChange(caller: Agent, timeoutMs: number, signal: AbortSignal): Promise<TeamWaitResult>;
    /**
     * Diagnose whether another Team member can advance a model-owned wait.
     * @param caller - Exact live member considering a wait.
     * @returns a concrete no-progress reason, or undefined when a peer is runnable.
     */
    waitReadiness(caller: Agent): TeamWaitResult['noProgress'] | undefined;
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
     * Resolve a caller without throwing, used by scoped-tool installation and observers.
     * @param agent - candidate exact live Agent.
     * @returns Team membership, or undefined for non-Team subagents and stale identities.
     */
    tryMembership(agent: Agent): TeamMembership | undefined;
    /** Queue one contained recovery pass after publication has unwound. */
    private scheduleRecovery;
    /** Reconcile roster provisioning before retrying that member's pending mailbox. */
    private recoverFor;
    private scheduleCooldown;
    /** Resume delivered but unfinished work only after a new user turn, preserving its exact execution. */
    private resumeIncompleteTasks;
    /** Schedule one coalesced pass after the committing transaction releases the Lead log. */
    private scheduleTaskDispatch;
    /** Deliver each current assigned execution once through the durable mailbox. */
    private dispatchReadyTasks;
    /** Publish accepted final artifacts and notify the communicator once for the exact approved plan. */
    private completeProject;
    private applyProjectRoster;
    /** Give each ready task one idle executor with its selected current-goal skill. */
    private assignReadyTasks;
    /** Stop Team-owned live branches and release every waiter before service disposal completes. */
    private disposeRuntime;
}
export default TeamService;
