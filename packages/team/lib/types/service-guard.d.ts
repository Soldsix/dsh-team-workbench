/** Keep retained Team conversations from silently falling back to untracked delegation. */
import type { Context } from '@deepseek-ai/cordis';
/** Mount independent lifecycle and tool guards; unloading the runtime cannot remove this guard. */
export declare function installTeamServiceGuard(ctx: Context): void;
