/** Provider failure classification without changing a model route or task identity. */
import type { LlmFailure } from '@deepseek-ai/dsh-llm';
/**
 * Resolve a bounded provider cooldown; policy and authorization failures never auto-retry.
 * @param failure - Recorded provider failure.
 * @param rateDelay - Configured frequency/concurrency delay.
 * @param quotaDelay - Configured exhausted-quota delay.
 * @returns wait duration, or undefined for failures needing a person or a technical diagnosis.
 */
export declare function failureCooldownMs(failure: LlmFailure, rateDelay: number, quotaDelay: number): number | undefined;
