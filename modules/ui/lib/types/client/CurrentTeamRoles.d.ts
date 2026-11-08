/** Current member routes shown beside reusable role templates. */
import type { PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { NS } from './locales.ts';
import type { DisplayMember } from './team-view-data.ts';
type UseSessions = PropsRuntime<'conversation.view'>['useSessions'];
/**
 * Display the actual Team before editable templates.
 * @param props - Current roster, pending plan, Session model choices, and localized labels.
 * @returns a read-only list of member routes.
 */
export declare function CurrentTeamRoles({ members, plannedTeam, useSessions, t }: {
    members: readonly DisplayMember[];
    plannedTeam?: string | undefined;
    useSessions: UseSessions;
    t: TranslateNS<typeof NS>;
}): import("react").JSX.Element;
export {};
