import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { TeamActionInjected } from './TeamAction.tsx';
import { NS } from './locales.ts';
/** Session hooks, native view navigation, and Team operations. */
export type TeamViewProps = PropsRuntime<'conversation.view'> & PropsLocale<typeof NS> & TeamActionInjected;
/**
 * Show the persistent Team with native tabs and a compact, searchable roster.
 * @param props - Session state hooks, Team navigation, role settings, and localized copy.
 * @returns the Team page without starting model work.
 */
export declare function TeamView({ sessionId, useSession, useSessions, useSessionStatus, openTeammate, refreshTeam, roles, experts, goals, mailbox, members, taskArchive, openView, t, useRecoveredTeam, }: TeamViewProps): import("react").JSX.Element;
