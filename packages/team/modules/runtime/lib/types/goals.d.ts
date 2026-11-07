/** Durable Team goal proposals, human reviews, and cancellation on accepted changes. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { TeamJournal } from './journal.ts';
import type { TeamRoster } from './roster.ts';
import type { TeamRuntimeLifecycle } from './lifecycle.ts';
import type { ProposeTeamGoalRequest, TeamGoalProposal, TeamGoalReview } from './goal-types.ts';
/** User review is the only writer of confirmed goals; model services can only propose. */
export declare class TeamGoals {
    private readonly ctx;
    private readonly journal;
    private readonly roster;
    private readonly lifecycle;
    private readonly maxBytes;
    private readonly requireConfirmed;
    private readonly requireExecutionScope;
    private readonly requireStructuredPlans;
    private readonly planLimits?;
    private readonly reviewing;
    private readonly epochs;
    /**
     * @param ctx - Trusted Host context owning the human question provider.
     * @param journal - Serialized Team event writer.
     * @param roster - Exact live Team membership resolver.
     * @param lifecycle - Plugin disposal signal.
     * @param maxBytes - Maximum encoded goal proposal size.
     * @param requireConfirmed - Block delegation before the first user confirmation.
     * @param requireExecutionScope - Require structured resource rules for newly confirmed work.
     */
    constructor(ctx: Context, journal: TeamJournal, roster: TeamRoster, lifecycle: TeamRuntimeLifecycle, maxBytes: number, requireConfirmed: boolean, requireExecutionScope: boolean, requireStructuredPlans?: boolean, planLimits?: {
        members: number;
        requests: number;
        tasks: number;
        skills: number;
        skillBytes: number;
        depth: number;
        automatic: boolean;
        provider: string;
    } | undefined);
    /**
     * Read detached goal records visible to every member.
     * @param caller - Exact live Team member.
     * @returns confirmed goal, latest proposal, and its latest review outcome.
     */
    read(caller: Agent): TeamGoalReview;
    /**
     * Save a complete proposal without changing the current execution goal.
     * @param caller - Exact live Lead.
     * @param request - Both current revisions and the complete proposed change.
     * @param signal - Caller cancellation before the write is admitted.
     * @returns the committed pending proposal.
     */
    propose(caller: Agent, request: ProposeTeamGoalRequest, signal: AbortSignal): Promise<TeamGoalProposal>;
    /**
     * Ask the human to review one exact persisted proposal; missing answers never grant authority.
     * @param caller - Exact live Lead; children must relay questions to it.
     * @param proposalRevision - Proposal currently displayed for review.
     * @param signal - Caller cancellation, including cancellation while waiting for an answer.
     * @returns committed review state, or a stale-review error without changing the goal.
     */
    review(caller: Agent, proposalRevision: number, signal: AbortSignal): Promise<TeamGoalReview>;
    /**
     * Check current Team execution admission without interpreting target strings as a sandbox.
     * @param root - Exact live Team Lead.
     * @returns a denial reason, or undefined when execution can proceed.
     */
    denial(root: Agent): string | undefined;
    /**
     * Capture cancellation for operations admitted under the current goal revision.
     * @param root - Exact live Team Lead.
     * @param signal - Caller-owned cancellation signal.
     * @returns a signal aborted by caller, plugin disposal, or an accepted goal change.
     */
    admit(root: Agent, signal: AbortSignal): AbortSignal;
    /**
     * Bind cancellation to a revision without granting execution admission.
     * @param root - Exact live Team Lead.
     * @param signal - Caller-owned cancellation.
     * @returns cancellation for this revision, including Lead work before a first confirmation.
     */
    capture(root: Agent, signal: AbortSignal): AbortSignal;
    /** Exact Lead identity cannot be replaced with an object carrying the same id. */
    private requireLead;
    /** A response applies only to the proposal and goal the user actually saw. */
    private reviewable;
    /** Report the revisions the editor must show before requesting another review. */
    private stale;
    /** Rotate cancellation once per accepted revision while keeping durable inboxes. */
    private epoch;
}
