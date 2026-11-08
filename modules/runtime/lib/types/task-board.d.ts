/** Shared Team task DAG commands and runtime-enriched views. */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ToolCallId } from '@deepseek-ai/dsh-llm';
import type { TeamMembership, TeamRoster } from './roster.ts';
import type { TeamGoals } from './goals.ts';
import type { TeamJournal } from './journal.ts';
import { TeamId, TeamTaskId } from './types.ts';
import type { CreateTeamTaskRequest, TeamTaskView, UpdateTeamTaskRequest } from './types.ts';
import type { TeamTaskReuseCheck } from './task-work-types.ts';
import type { TeamTaskExecutionId } from './task-work-types.ts';
import type { TeamArtifactStore } from './artifact-store.ts';
/** Fixed dispatch identity retained across cancellation and task replacement. */
export interface TeamTaskEffectToken {
    readonly root: Agent;
    readonly teamId: TeamId;
    readonly taskId: TeamTaskId;
    readonly executionId: TeamTaskExecutionId;
    readonly callId: ToolCallId;
    readonly toolName: string;
}
/** Owns Team task limits, authorization, transitions, and derived views. */
export declare class TeamTaskBoard {
    private readonly journal;
    private readonly roster;
    private readonly goals;
    private readonly maxTasks;
    private readonly deduplicateInputs;
    private readonly requireResults;
    private readonly requirePlans;
    private readonly maxWorkBytes;
    private readonly maxReceiptPaths;
    private readonly maxReceiptBytes;
    private readonly autoDispatchReadyTasks;
    private readonly enforceWriteScopeExclusivity;
    private readonly autoAssignReadyTasks;
    private readonly artifacts?;
    private readonly inFlightEffects;
    /**
     * @param journal - authoritative Lead-log transaction owner.
     * @param roster - exact live membership resolver.
     * @param goals - goal-revision and runtime cancellation owner.
     * @param maxTasks - maximum pending or in-progress tasks in one Team.
     * @param deduplicateInputs - reuse tasks with identical original inputs.
     * @param requireResults - require a reusable result on completion.
     * @param requirePlans - require a versioned plan before starting a task.
     * @param maxWorkBytes - maximum encoded plan, execution, and review size.
     * @param maxReceiptPaths - maximum input or artifact paths per observation.
     * @param maxReceiptBytes - maximum cumulative bytes hashed in one observation.
     * @param autoDispatchReadyTasks - mark new tasks for durable member notification after assignment.
     * @param enforceWriteScopeExclusivity - reject simultaneous assignments to overlapping declared outputs.
     * @param autoAssignReadyTasks - mark new tasks for idle matching executor assignment.
     * @param artifacts - Host-owned immutable copies of submitted file versions.
     */
    constructor(journal: TeamJournal, roster: TeamRoster, goals: TeamGoals, maxTasks: number, deduplicateInputs: boolean, requireResults: boolean, requirePlans: boolean, maxWorkBytes: number, maxReceiptPaths: number, maxReceiptBytes: number, autoDispatchReadyTasks?: boolean, enforceWriteScopeExclusivity?: boolean, autoAssignReadyTasks?: boolean, artifacts?: TeamArtifactStore | undefined);
    /**
     * Persist an opaque tool start before dispatch under its exact running attempt.
     * @param caller - member dispatching the tool.
     * @param callId - tool-call identity from the model step.
     * @param toolName - dispatched tool name.
     * @param signal - cancellation before dispatch starts.
     * @param args - Logged tool JSON for read-only workspace action classification.
     * @returns fixed identity for the matching settlement, or undefined outside task execution.
     */
    recordToolEffect(caller: Agent, callId: ToolCallId, toolName: string, signal: AbortSignal, args?: unknown): Promise<TeamTaskEffectToken | undefined>;
    /**
     * Persist tool settlement against the original attempt even if its task was replaced.
     * @param token - identity returned before dispatch.
     */
    settleToolEffect(token: TeamTaskEffectToken): Promise<void>;
    /** Observe declared inputs under the caller's current workspace. */
    private observePlan;
    /** Observe artifacts under the exact member workspace that produced them. */
    private observeSubmission;
    /** Bind the request before queueing and recheck its exact caller before any append. */
    private write;
    /**
     * Create one unowned pending task in the Team Lead log.
     * @param request - task text, blockers, and advisory write scopes.
     * @param caller - exact live member whose identity is retained as the planner.
     * @param signal - caller cancellation before append; an appended event finishes its checkpoint.
     * @returns the revision-one task view.
     */
    create(caller: Agent, request: CreateTeamTaskRequest, signal: AbortSignal): Promise<TeamTaskView>;
    /**
     * Return one task, including a deleted tombstone.
     * @param membership - exact caller membership resolved by the Team roster.
     * @param id - Team-local task identity.
     * @returns the latest task value and derived readiness diagnostics.
     */
    get(membership: TeamMembership, id: TeamTaskId): TeamTaskView;
    /**
     * List current pending and in-progress tasks in numeric creation order.
     * @param membership - exact caller membership resolved by the Team roster.
     * @returns detached current task views.
     */
    list(membership: TeamMembership): TeamTaskView[];
    /** Add current member activity without changing the durable task or its revision. */
    private withRecovery;
    /**
     * List completed tasks in stable creation order, one bounded page at a time.
     * @param membership - exact caller membership resolved by the Team roster.
     * @param request - exclusive creation cursor and requested page size, at most 50.
     * @returns completed task views and a cursor when another page exists.
     */
    listArchive(membership: TeamMembership, request: {
        after?: TeamTaskId;
        limit: number;
    }): {
        tasks: TeamTaskView[];
        nextCursor?: TeamTaskId;
    };
    /**
     * Re-observe a completed result's files and local runtime before a caller reuses it.
     * @param caller - current Team member requesting reuse.
     * @param id - completed task identity.
     * @param signal - cancellation for bounded file reads.
     * @returns current receipts and a validity decision scoped to the observed task revision.
     */
    validateReuse(caller: Agent, id: TeamTaskId, signal: AbortSignal): Promise<TeamTaskReuseCheck>;
    /**
     * Validate explicit accepted inputs for a downstream task, including their expected published updates.
     * @param caller - Exact live member requesting the handoff.
     * @param ids - Declared prerequisite task identities, or the final delivery task.
     * @param signal - Cancellation during file and dependency checks.
     * @returns one check per requested task; unrelated changes remain invalid.
     */
    validateHandoff(caller: Agent, ids: readonly TeamTaskId[], signal: AbortSignal): Promise<TeamTaskReuseCheck[]>;
    /** Recheck each accepted dependency once under the same cancellation signal. */
    private validateReuseWithDependencies;
    /**
     * Compare-and-set one authorized task transition.
     * @param caller - exact live Team member authorizing the mutation.
     * @param request - task identity, expected revision, action, and action fields.
     * @param signal - caller cancellation before append; an appended event finishes its checkpoint.
     * @returns the committed next task revision.
     */
    update(caller: Agent, request: UpdateTeamTaskRequest, signal: AbortSignal): Promise<TeamTaskView>;
    /** Validate the bounded durable work value before it enters the Session log. */
    private validateWork;
    /** Validate and de-duplicate dependency ids against the current task graph. */
    private dependencies;
    /** Normalize and de-duplicate task write scopes. */
    private writeScopes;
    /** Map shared task-graph validation onto stable command error codes. */
    private assertTaskGraph;
    /** Remove an optional owner field under exactOptionalPropertyTypes. */
    private withoutOwner;
}
