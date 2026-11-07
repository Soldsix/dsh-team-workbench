/** Provider failure classification without changing a model route or task identity. */
import type { LlmFailure } from '@deepseek-ai/dsh-llm'

/**
 * Resolve a bounded provider cooldown; policy and authorization failures never auto-retry.
 * @param failure - Recorded provider failure.
 * @param rateDelay - Configured frequency/concurrency delay.
 * @param quotaDelay - Configured exhausted-quota delay.
 * @returns wait duration, or undefined for failures needing a person or a technical diagnosis.
 */
export function failureCooldownMs(failure: LlmFailure, rateDelay: number, quotaDelay: number): number | undefined {
  if (failure.status === 401 || failure.status === 403) return undefined
  const text = `${failure.code} ${failure.message}`
  const quota = failure.status === 402 || /quota|balance|credit|额度|余额/iu.test(text)
  const rate = failure.status === 429 || /rate.?limit|concurren|TooManyRequests|\b429\b|\bisQueued\b|\bqueued\b|频率|并发|排队/iu.test(text)
  if (!quota && !rate) return undefined
  const seconds = /["']?retryAfterSeconds["']?\s*[:=]\s*(\d+(?:\.\d+)?)/u.exec(failure.message)?.[1]
  const messageDelay = seconds === undefined ? 0 : Number(seconds) * 1000
  return Math.min(2_147_483_647, Math.max(quota ? quotaDelay : rateDelay, failure.providerRetryAfterMs ?? messageDelay))
}
