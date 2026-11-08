/**
 * Create Remote-backed completed-task actions for the native Team view.
 * @param ctx - Browser context with the Agent Teams Remote.
 * @param leadSessionId - Resolve the exact Lead for a selected conversation.
 * @returns paged archive reads and fresh validation.
 */
export function createTeamTaskOperations(ctx, leadSessionId) {
    return {
        async archive(sessionId, after, limit) {
            const result = await ctx.remote.agentTeams.listTaskArchive(leadSessionId(sessionId), {
                ...after === undefined ? {} : { after }, limit,
            });
            if (!result.ok)
                throw result.error;
            return result.value;
        },
        async validateReuse(sessionId, id, signal) {
            const result = await ctx.remote.agentTeams.validateTaskReuse(leadSessionId(sessionId), id, signal);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
    };
}
