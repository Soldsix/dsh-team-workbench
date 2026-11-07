/**
 * Create Remote-backed member actions for the native Team view.
 * @param ctx - Browser context with the Agent Teams Remote.
 * @param leadSessionId - Resolve the exact Lead for a selected conversation.
 * @returns lifecycle and workspace operations.
 */
export function createTeamMemberOperations(ctx, leadSessionId) {
    return {
        async models() {
            const result = await ctx.remote.session.modelCatalog();
            if (!result.ok)
                throw result.error;
            return result.value;
        },
        async configureRole(sessionId, request, signal) {
            const result = await ctx.remote.agentTeams.configureMemberRole(leadSessionId(sessionId), request, signal);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
        async configureModel(sessionId, request, signal) {
            const result = await ctx.remote.agentTeams.configureMemberModel(leadSessionId(sessionId), request, signal);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
        async retire(sessionId, target, signal) {
            const result = await ctx.remote.agentTeams.retireMember(leadSessionId(sessionId), target, signal);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
        async reactivate(sessionId, target, signal) {
            const result = await ctx.remote.agentTeams.reactivateMember(leadSessionId(sessionId), target, signal);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
        async workspace(sessionId, target) {
            const result = await ctx.remote.agentTeams.getWorkspace(leadSessionId(sessionId), target);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
        async integrate(sessionId, target, signal) {
            const result = await ctx.remote.agentTeams.integrateWorkspace(leadSessionId(sessionId), target, signal);
            if (!result.ok)
                throw result.error;
            return result.value;
        },
    };
}
