/** Browser member lifecycle and private-workspace operations. */
import type { Context } from '@deepseek-ai/cordis';
import type { TeamMemberView, TeamMemberWorkspace } from '@dsh-workbench/team-runtime/client';
import type { ConfigureTeamMemberModelRequest, ConfigureTeamMemberRoleRequest } from '@dsh-workbench/team-runtime/client';
import type { ModelCatalog } from '@deepseek-ai/dsh-api-session-controller/types';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Member actions resolve through the selected Team Lead on each call. */
export interface TeamMemberOperations {
    readonly models: () => Promise<ModelCatalog>;
    readonly configureRole: (sessionId: SessionId, request: ConfigureTeamMemberRoleRequest, signal: AbortSignal) => Promise<TeamMemberView>;
    readonly configureModel: (sessionId: SessionId, request: ConfigureTeamMemberModelRequest, signal: AbortSignal) => Promise<TeamMemberView>;
    readonly retire: (sessionId: SessionId, target: string, signal: AbortSignal) => Promise<TeamMemberView>;
    readonly reactivate: (sessionId: SessionId, target: string, signal: AbortSignal) => Promise<TeamMemberView>;
    readonly workspace: (sessionId: SessionId, target: string) => Promise<TeamMemberWorkspace | null>;
    readonly integrate: (sessionId: SessionId, target: string, signal: AbortSignal) => Promise<{
        paths: string[];
    }>;
}
/**
 * Create Remote-backed member actions for the native Team view.
 * @param ctx - Browser context with the Agent Teams Remote.
 * @param leadSessionId - Resolve the exact Lead for a selected conversation.
 * @returns lifecycle and workspace operations.
 */
export declare function createTeamMemberOperations(ctx: Context, leadSessionId: (id: SessionId) => SessionId): TeamMemberOperations;
