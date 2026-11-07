import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { TeamProjection } from '@dsh-workbench/team-runtime/client';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
import type { TeamRoleOperations } from './role-settings.ts';
import type { TeamExpertOperations } from './expert-catalog.ts';
import type { TeamGoalOperations } from './goal-operations.ts';
import type { TeamMailboxOperations } from './mailbox-operations.ts';
import type { TeamMemberOperations } from './member-operations.ts';
import type { TeamTaskOperations } from './task-operations.ts';
/** Business actions injected by the browser plugin. */
export interface TeamActionInjected {
    /** Open a roster Session from the current conversation. */
    openTeammate: (sessionId: SessionId, childSessionId: SessionId) => void;
    /** Restore a cold Team projection from the root Session log. */
    refreshTeam: (sessionId: SessionId, force?: boolean) => Promise<void>;
    /** Fresh plugin read used when the shared catalog lacks this Team. */
    useRecoveredTeam?: (sessionId: SessionId) => TeamProjection | undefined;
    /** Saved role configuration, available in the Web composition. */
    roles?: TeamRoleOperations;
    /** Durable expert profiles and their bound revisions. */
    experts?: TeamExpertOperations;
    /** Goal proposals and native user confirmation. */
    goals?: TeamGoalOperations;
    /** Bounded mailbox history and explicit recovery. */
    mailbox?: TeamMailboxOperations;
    /** Member retirement, reactivation, and private-workspace integration. */
    members?: TeamMemberOperations;
    /** Completed-task archive and fresh reuse validation. */
    taskArchive?: TeamTaskOperations;
}
/** Full props of the Team conversation-header action. */
export type TeamActionProps = PropsRuntime<'conversation.session.header.actions'> & TeamActionInjected & PropsLocale<typeof NS>;
/** Render the Team roster, role editor, shared context, and read-only task board. */
export declare function TeamAction({ sessionId, useSession, useSessions, useSessionStatus, openTeammate, refreshTeam, roles, t, useRecoveredTeam, }: TeamActionProps): import("react").JSX.Element;
