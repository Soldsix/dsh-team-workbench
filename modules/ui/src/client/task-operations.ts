/** Browser completed-task archive and reuse checks. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-experimental-agent-team/remote'
import type { TeamTaskArchivePage, TeamTaskId, TeamTaskReuseCheck } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Bounded history reads and explicit fresh validation. */
export interface TeamTaskOperations {
  readonly archive: (sessionId: SessionId, after: TeamTaskId | undefined, limit: number) => Promise<TeamTaskArchivePage>
  readonly validateReuse: (sessionId: SessionId, id: TeamTaskId, signal: AbortSignal) => Promise<TeamTaskReuseCheck>
}

/**
 * Create Remote-backed completed-task actions for the native Team view.
 * @param ctx - Browser context with the Agent Teams Remote.
 * @param leadSessionId - Resolve the exact Lead for a selected conversation.
 * @returns paged archive reads and fresh validation.
 */
export function createTeamTaskOperations(ctx: Context, leadSessionId: (id: SessionId) => SessionId): TeamTaskOperations {
  return {
    async archive(sessionId, after, limit) {
      const result = await ctx.remote.agentTeams.listTaskArchive(leadSessionId(sessionId), {
        ...after === undefined ? {} : { after }, limit,
      })
      if (!result.ok) throw result.error
      return result.value
    },
    async validateReuse(sessionId, id, signal) {
      const result = await ctx.remote.agentTeams.validateTaskReuse(leadSessionId(sessionId), id, signal)
      if (!result.ok) throw result.error
      return result.value
    },
  }
}
