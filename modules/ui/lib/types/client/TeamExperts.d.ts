import type { TeamMemberProjection } from '@dsh-workbench/team-runtime/client';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { TeamExpertOperations } from './expert-catalog.ts';
import type { NS } from './locales.ts';
/**
 * Edit reusable expert profiles while preserving unsaved drafts across selection and refresh.
 * @param props - Catalog operations, current Team members, navigation, and localized copy.
 * @returns a searchable catalog, profile editor, and existing conversation links.
 */
export declare function TeamExperts({ operations, members, openMember, t }: {
    operations: TeamExpertOperations;
    members: readonly TeamMemberProjection[];
    openMember: (id: SessionId) => void;
    t: TranslateNS<typeof NS>;
}): import("react").JSX.Element;
