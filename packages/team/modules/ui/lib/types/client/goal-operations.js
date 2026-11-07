/**
 * Bind Team goal editing to the owning Lead and the browser plugin lifetime.
 * @param ctx - Client context declaring remote.agentTeams.
 * @param leadSessionId - Resolve the current conversation to its Team Lead.
 * @returns proposal writes and native reviews that survive editor navigation.
 */
export function createTeamGoalOperations(ctx, leadSessionId) {
    const lifetime = new AbortController();
    ctx.effect(() => () => { lifetime.abort(); }, 'client-ui-agent-team: goal reviews');
    return {
        async propose(sessionId, request, signal) {
            const result = await ctx.remote.agentTeams.proposeGoal(leadSessionId(sessionId), request, AbortSignal.any([signal, lifetime.signal]));
            if (!result.ok)
                throw result.error;
            return result.value;
        },
        async review(sessionId, proposalRevision) {
            const result = await ctx.remote.agentTeams.reviewGoal(leadSessionId(sessionId), proposalRevision, lifetime.signal);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
    };
}
