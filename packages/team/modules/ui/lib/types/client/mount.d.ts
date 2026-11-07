/** Source-safe Agent Teams browser registration. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
export type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
export type {} from '@deepseek-ai/dsh-client-locale/client';
export type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
export type {} from '@deepseek-ai/dsh-client-ui-workspace/client';
import { type TeamKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Agent Teams roster and task-board copy. */
        'agent-team': TeamKey;
    }
}
/** Required browser services for navigation, slots, and localized copy. */
export declare const inject: string[];
/**
 * Register Team dictionaries, the header action, and the conversation view.
 * Both views read the Lead Session's `agentTeam` projection from the shared
 * Session store and request a missing cold baseline when opened.
 * @param ctx - Client Context carrying the injected navigation, locale, slot, and Session services.
 */
export declare function registerAgentTeamUi(ctx: ClientContext): void;
