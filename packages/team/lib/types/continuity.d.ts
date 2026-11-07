/** Keep the current turn open while its owned background work is still live. */
import type { Context } from '@deepseek-ai/cordis';
/** Install per-agent controls and a cancellable event-driven wait at turn end. */
export declare function installBackgroundContinuity(ctx: Context, excludedPresets: ReadonlySet<string>): void;
