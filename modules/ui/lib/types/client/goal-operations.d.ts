/** Goal proposals and native human reviews over the Team plugin's Remote namespace. */
import type { Context } from '@deepseek-ai/cordis';
import type { ProposeTeamGoalRequest, TeamGoalProposal, TeamGoalReview } from '@dsh-workbench/team-runtime/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Goal editing never starts a model turn or supplies the user's approval. */
export interface TeamGoalOperations {
    /** Persist a proposed change at the editor's observed revisions. */
    propose(sessionId: SessionId, request: ProposeTeamGoalRequest, signal: AbortSignal): Promise<TeamGoalProposal>;
    /** Await the native user answer; switching conversation views does not cancel this review. */
    review(sessionId: SessionId, proposalRevision: number): Promise<TeamGoalReview>;
}
/**
 * Bind Team goal editing to the owning Lead and the browser plugin lifetime.
 * @param ctx - Client context declaring remote.agentTeams.
 * @param leadSessionId - Resolve the current conversation to its Team Lead.
 * @returns proposal writes and native reviews that survive editor navigation.
 */
export declare function createTeamGoalOperations(ctx: Context, leadSessionId: (id: SessionId) => SessionId): TeamGoalOperations;
