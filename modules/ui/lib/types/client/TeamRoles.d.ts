import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { NS } from './locales.ts';
import type { TeamRoleOperations } from './role-settings.ts';
/**
 * Edit reusable roles; existing member descriptors remain tied to their creation snapshot.
 * @param props - model catalog/settings operations and localized copy.
 * @returns the role list, editor, and save feedback.
 */
export declare function TeamRoles({ operations, t }: {
    operations: TeamRoleOperations;
    t: TranslateNS<typeof NS>;
}): import("react").JSX.Element;
