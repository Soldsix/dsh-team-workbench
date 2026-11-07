/** Browser completed-task archive and reuse checks. */
import type { Context } from '@deepseek-ai/cordis';
import type { TeamTaskArchivePage, TeamTaskId, TeamTaskReuseCheck } from '@dsh-workbench/team-runtime/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Bounded history reads and explicit fresh validation. */
export interface TeamTaskOperations {
    readonly archive: (sessionId: SessionId, after: TeamTaskId | undefined, limit: number) => Promise<TeamTaskArchivePage>;
    readonly validateReuse: (sessionId: SessionId, id: TeamTaskId, signal: AbortSignal) => Promise<TeamTaskReuseCheck>;
}
/**
 * Create Remote-backed completed-task actions for the native Team view.
 * @param ctx - Browser context with the Agent Teams Remote.
 * @param leadSessionId - Resolve the exact Lead for a selected conversation.
 * @returns paged archive reads and fresh validation.
 */
export declare function createTeamTaskOperations(ctx: Context, leadSessionId: (id: SessionId) => SessionId): TeamTaskOperations;
