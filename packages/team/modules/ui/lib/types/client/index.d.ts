/** Browser entry registering the Agent Teams conversation-header action. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** The optional Team plugin mounts its own Remote contribution. */
export declare const inject: string[];
export type { TeamActionInjected, TeamActionProps } from './TeamAction.tsx';
export type {} from './mount.ts';
export type { TeamKey } from './locales.ts';
/**
 * Mount Team remotes before the native views and release both with this plugin.
 * @param ctx - Client context with the Remote carrier available.
 */
export declare function apply(ctx: ClientContext): Promise<void>;
