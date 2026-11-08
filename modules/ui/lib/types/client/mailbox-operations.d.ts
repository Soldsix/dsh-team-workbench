/** Browser mailbox operations over the Team Lead's Remote service. */
import type { Context } from '@deepseek-ai/cordis';
import type { SendTeamMessageResult, TeamMailboxPage, TeamMessageId, TeamMessageSnapshot } from 'dsh-team-workbench/runtime/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Bounded mailbox reads and explicit recovery actions. */
export interface TeamMailboxOperations {
    /**
     * @param sessionId - Selected Team conversation.
     * @param offset - First history row.
     * @param limit - Maximum rows.
     * @returns a bounded mailbox page.
     */
    list(sessionId: SessionId, offset: number, limit: number): Promise<TeamMailboxPage>;
    /**
     * @param sessionId - Selected Team conversation.
     * @param messageId - Saved message identity.
     * @returns the full authorized message.
     */
    get(sessionId: SessionId, messageId: TeamMessageId): Promise<TeamMessageSnapshot>;
    /**
     * @param sessionId - Selected Team conversation.
     * @param messageId - Exhausted message identity.
     * @param signal - Caller cancellation.
     * @returns the recovery outcome.
     */
    retry(sessionId: SessionId, messageId: TeamMessageId, signal: AbortSignal): Promise<SendTeamMessageResult>;
    /**
     * @param sessionId - Selected Team conversation.
     * @param messageId - Historical message identity.
     * @param signal - Caller cancellation.
     * @returns the new delivery outcome.
     */
    adopt(sessionId: SessionId, messageId: TeamMessageId, signal: AbortSignal): Promise<SendTeamMessageResult>;
}
/**
 * Resolve browser mailbox actions through the selected Team's Lead.
 * @param ctx - Browser context with the Team Remote.
 * @param leadSessionId - Resolve the selected conversation to its Team Lead.
 * @returns bounded reads and explicit recovery operations.
 */
export declare function createTeamMailboxOperations(ctx: Context, leadSessionId: (id: SessionId) => SessionId): TeamMailboxOperations;
