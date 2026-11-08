import type { TeamMemberProjection } from '@dsh-workbench/team-runtime/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { TeamMemberOperations } from './member-operations.ts';
import { NS } from './locales.ts';
/**
 * Show lifecycle and integration controls only for a selected teammate.
 * @param props - Selected member, live activity, Remote actions, and locale.
 * @returns controls retaining the selected member's history.
 */
export declare function TeamMemberControls({ sessionId, member, inactive, operations, t }: PropsLocale<typeof NS> & {
    readonly sessionId: SessionId;
    readonly member: TeamMemberProjection;
    readonly inactive: boolean;
    readonly operations: TeamMemberOperations;
}): import("react").JSX.Element;
