/**
 * Resolve browser mailbox actions through the selected Team's Lead.
 * @param ctx - Browser context with the Team Remote.
 * @param leadSessionId - Resolve the selected conversation to its Team Lead.
 * @returns bounded reads and explicit recovery operations.
 */
export function createTeamMailboxOperations(ctx, leadSessionId) {
    return {
        async list(sessionId, offset, limit) {
            const result = await ctx.remote.agentTeams.listMessagePage(leadSessionId(sessionId), offset, limit);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
        async get(sessionId, messageId) {
            const result = await ctx.remote.agentTeams.getMessage(leadSessionId(sessionId), messageId);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
        async retry(sessionId, messageId, signal) {
            const result = await ctx.remote.agentTeams.retryMessage(leadSessionId(sessionId), messageId, signal);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
        async adopt(sessionId, messageId, signal) {
            const result = await ctx.remote.agentTeams.adoptMessage(leadSessionId(sessionId), messageId, signal);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
    };
}
