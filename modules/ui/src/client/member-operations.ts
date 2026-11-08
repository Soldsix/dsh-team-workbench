/** Browser member lifecycle and private-workspace operations. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-experimental-agent-team/remote'
import type { TeamMemberView, TeamMemberWorkspace } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { ConfigureTeamMemberModelRequest, ConfigureTeamMemberRoleRequest } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { ModelCatalog } from '@deepseek-ai/dsh-api-session-controller/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Member actions resolve through the selected Team Lead on each call. */
export interface TeamMemberOperations {
  readonly models: () => Promise<ModelCatalog>
  readonly configureRole: (sessionId: SessionId, request: ConfigureTeamMemberRoleRequest, signal: AbortSignal) => Promise<TeamMemberView>
  readonly configureModel: (sessionId: SessionId, request: ConfigureTeamMemberModelRequest, signal: AbortSignal) => Promise<TeamMemberView>
  readonly retire: (sessionId: SessionId, target: string, signal: AbortSignal) => Promise<TeamMemberView>
  readonly reactivate: (sessionId: SessionId, target: string, signal: AbortSignal) => Promise<TeamMemberView>
  readonly workspace: (sessionId: SessionId, target: string) => Promise<TeamMemberWorkspace | null>
  readonly integrate: (sessionId: SessionId, target: string, signal: AbortSignal) => Promise<{ paths: string[] }>
}

/**
 * Create Remote-backed member actions for the native Team view.
 * @param ctx - Browser context with the Agent Teams Remote.
 * @param leadSessionId - Resolve the exact Lead for a selected conversation.
 * @returns lifecycle and workspace operations.
 */
export function createTeamMemberOperations(ctx: Context, leadSessionId: (id: SessionId) => SessionId): TeamMemberOperations {
  return {
    async models() {
      const result = await ctx.remote.session.modelCatalog()
      if (!result.ok) throw result.error
      return result.value
    },
    async configureRole(sessionId, request, signal) {
      const result = await ctx.remote.agentTeams.configureMemberRole(leadSessionId(sessionId), request, signal)
      if (!result.ok) throw result.error
      return result.value
    },
    async configureModel(sessionId, request, signal) {
      const result = await ctx.remote.agentTeams.configureMemberModel(leadSessionId(sessionId), request, signal)
      if (!result.ok) throw result.error
      return result.value
    },
    async retire(sessionId, target, signal) {
      const result = await ctx.remote.agentTeams.retireMember(leadSessionId(sessionId), target, signal)
      if (!result.ok) throw result.error
      return result.value
    },
    async reactivate(sessionId, target, signal) {
      const result = await ctx.remote.agentTeams.reactivateMember(leadSessionId(sessionId), target, signal)
      if (!result.ok) throw result.error
      return result.value
    },
    async workspace(sessionId, target) {
      const result = await ctx.remote.agentTeams.getWorkspace(leadSessionId(sessionId), target)
      if (!result.ok) throw result.error
      return result.value
    },
    async integrate(sessionId, target, signal) {
      const result = await ctx.remote.agentTeams.integrateWorkspace(leadSessionId(sessionId), target, signal)
      if (!result.ok) throw result.error
      return result.value
    },
  }
}
