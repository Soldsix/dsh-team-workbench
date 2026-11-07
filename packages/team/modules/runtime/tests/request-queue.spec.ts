/** Request admission under shared route capacity, cancellation, and stream settlement. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { TeamId } from '../src/types.ts'
import { resolveRequestLimits, TeamRequestQueue } from '../src/request-queue.ts'
import { failureCooldownMs } from '../src/cooldown.ts'

it('recognizes queued relay responses and their requested delay without retrying authentication failures', () => {
  expect(failureCooldownMs({ code: 'upstream_error', message: '{"isQueued":true,"retryAfterSeconds":90}' }, 60_000, 3_600_000))
    .toBe(90_000)
  expect(failureCooldownMs({ code: 'upstream_error', message: 'queued retryAfterSeconds=0.5' }, 60_000, 3_600_000))
    .toBe(60_000)
  expect(failureCooldownMs({ code: 'upstream_error', message: 'queued', status: 401 }, 60_000, 3_600_000)).toBeUndefined()
})

it('honors provider cooldowns and shared-account capacity without blocking an independent provider', async () => {
  vi.useFakeTimers()
  const queue = new TeamRequestQueue(resolveRequestLimits({ maxConcurrentRequestsPerTeam: 4 }),
    { rateMs: 1000, quotaMs: 10_000 }, [{ id: 'shared', providers: ['a', 'alias'], maxConcurrentRequests: 1 }])
  const finished: Promise<unknown>[] = []
  const controller = new AbortController()
  try {
    const stop = async function* (): AsyncIterable<StreamChunk> { yield { type: 'finish', reason: { kind: 'stop' } } }
    await collect(queue.stream(TeamId('team'), { provider: 'a', model: 'original', messages: [] }, async function* () {
      yield { type: 'finish', reason: { kind: 'error', failure: { code: 'RATE_LIMIT', message: 'rate limit', status: 429,
        providerRetryAfterMs: 2000 } } }
    }))
    let entered = false
    finished.push(collect(queue.stream(TeamId('team'), { provider: 'alias', model: 'original', messages: [], signal: controller.signal }, async function* () {
      entered = true; yield* stop()
    })))
    await collect(queue.stream(TeamId('team'), { provider: 'independent', model: 'original', messages: [] }, stop))
    expect(entered).toBe(false)
    await vi.advanceTimersByTimeAsync(1999)
    expect(entered).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await Promise.all(finished)
    expect(entered).toBe(true)
    expect(failureCooldownMs({ code: 'POLICY', message: 'requires manual review', status: 403 }, 10, 20)).toBeUndefined()
    expect(failureCooldownMs({ code: 'BALANCE', message: 'no credits', status: 402 }, 10, 20)).toBe(20)
  } finally { controller.abort(); queue.close(new Error('test ended')); await Promise.allSettled(finished); vi.useRealTimers() }
})

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

async function collect(stream: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

function fixture(limits: Parameters<typeof resolveRequestLimits>[0]) {
  const queue = new TeamRequestQueue(resolveRequestLimits(limits))
  const started: string[] = []
  const completed: Promise<unknown>[] = []
  const releases: (() => void)[] = []
  cleanups.push(async () => {
    queue.close(new Error('fixture disposed'))
    for (const release of releases) release()
    await Promise.allSettled(completed)
  })
  function run(name: string, team: string, provider: string, model: string, signal?: AbortSignal) {
    const gate = Promise.withResolvers<undefined>()
    const release = (): void => { gate.resolve(undefined) }
    releases.push(release)
    const options: GenerateOptions = Object.freeze({
      provider, model, messages: [], ...signal === undefined ? {} : { signal },
    })
    const finished = collect(queue.stream(TeamId(team), options, async function* () {
      started.push(name)
      await gate.promise
      yield { type: 'finish', reason: { kind: 'stop' } }
    }))
    // Every fixture owns rejection even if an assertion fails before awaiting this request.
    void finished.catch(() => {})
    completed.push(finished)
    return { finished, release }
  }
  return { queue, started, run }
}

describe('Team model request admission', () => {
  it('acquires Team, provider, and model quotas together and advances independent routes', async () => {
    const { run, started } = fixture({
      maxConcurrentRequestsPerTeam: 2,
      providerConcurrency: [{ provider: 'a', maxConcurrentRequests: 2 }],
      modelConcurrency: [{ provider: 'a', model: 'm', maxConcurrentRequests: 1 }],
    })
    const first = run('first', 'one', 'a', 'm')
    await vi.waitFor(() => { expect(started).toEqual(['first']) })
    const blockedModel = run('blocked-model', 'one', 'a', 'm')
    const independentModel = run('other-model', 'two', 'a', 'n')
    const blockedProvider = run('blocked-provider', 'three', 'a', 'n')
    const independentProvider = run('other-provider', 'one', 'b', 'm')
    await vi.waitFor(() => { expect(started).toEqual(['first', 'other-model', 'other-provider']) })
    first.release()
    await first.finished
    await vi.waitFor(() => { expect(started.at(-1)).toBe('blocked-model') })
    expect(started).not.toContain('blocked-provider')
    independentModel.release()
    await independentModel.finished
    await vi.waitFor(() => { expect(started.at(-1)).toBe('blocked-provider') })
    for (const request of [blockedModel, blockedProvider, independentProvider]) request.release()
    await Promise.all([blockedModel.finished, blockedProvider.finished, independentProvider.finished])
  })

  it('cancels a queued request without entering its provider or consuming the next slot', async () => {
    const { run, started } = fixture({ maxConcurrentRequestsPerTeam: 1 })
    const first = run('first', 'team', 'a', 'm')
    const controller = new AbortController()
    const cancelled = run('cancelled', 'team', 'a', 'm', controller.signal)
    const last = run('last', 'team', 'a', 'm')
    await vi.waitFor(() => { expect(started).toEqual(['first']) })
    const reason = new Error('user cancelled the queued request')
    controller.abort(reason)
    await expect(cancelled.finished).rejects.toBe(reason)
    first.release()
    await first.finished
    await vi.waitFor(() => { expect(started).toEqual(['first', 'last']) })
    last.release()
    await last.finished
  })

  it('rejects already-cancelled requests and cancellation between admission and stream entry', async () => {
    const { queue, run, started } = fixture({ maxConcurrentRequestsPerTeam: 1 })
    const controller = new AbortController()
    const cancelled = run('cancelled', 'team', 'a', 'm', controller.signal)
    controller.abort(new Error('cancel before iterator entry'))
    await expect(cancelled.finished).rejects.toThrow('cancel before iterator entry')
    const already = run('already', 'team', 'a', 'm', controller.signal)
    await expect(already.finished).rejects.toThrow('cancel before iterator entry')
    expect(started).toEqual([])
    const admitted = run('admitted', 'team', 'a', 'm')
    queue.close(new Error('unloaded before iterator entry'))
    await expect(admitted.finished).rejects.toThrow('unloaded before iterator entry')
    expect(started).toEqual([])
  })

  it('retains the slot until an aborted active stream finishes its cleanup', async () => {
    const { queue, run, started } = fixture({ maxConcurrentRequestsPerTeam: 1 })
    const controller = new AbortController()
    const first = run('first', 'team', 'a', 'm', controller.signal)
    const last = run('last', 'team', 'a', 'm')
    await vi.waitFor(() => { expect(started).toEqual(['first']) })
    controller.abort()
    // An independent Team can enter while the aborted stream still owns its slot.
    const independent = run('independent', 'other', 'a', 'm')
    await vi.waitFor(() => { expect(started).toEqual(['first', 'independent']) })
    first.release()
    await first.finished
    await vi.waitFor(() => { expect(started).toEqual(['first', 'independent', 'last']) })
    last.release()
    independent.release()
    await Promise.all([last.finished, independent.finished])
    queue.close(new Error('completed'))
  })

  it('releases after consumer return and provider failure without rewriting the request', async () => {
    const { queue, run, started } = fixture({ maxConcurrentRequestsPerTeam: 1 })
    const options: GenerateOptions = Object.freeze({
      provider: 'a', model: 'm', messages: [], maxTokens: 8192,
    })
    let finalized = false
    const iterator = queue.stream(TeamId('team'), options, async function* () {
      try {
        yield { type: 'finish', reason: { kind: 'stop' } }
      } finally {
        finalized = true
      }
    })[Symbol.asyncIterator]()
    await iterator.next()
    const waiting = run('waiting', 'team', 'a', 'm')
    await iterator.return?.()
    await vi.waitFor(() => { expect(started).toEqual(['waiting']) })
    expect(finalized).toBe(true)
    waiting.release()
    await waiting.finished
    const failure = new Error('provider failed')
    await expect(collect(queue.stream(TeamId('team'), options, () => { throw failure }))).rejects.toBe(failure)
    const replacement = run('replacement', 'team', 'a', 'm')
    await vi.waitFor(() => { expect(started.at(-1)).toBe('replacement') })
    replacement.release()
    await replacement.finished
    expect(options).toEqual({ provider: 'a', model: 'm', messages: [], maxTokens: 8192 })
  })

  it('rejects all queued and future work on close while active owners finish', async () => {
    const { queue, run, started } = fixture({ maxConcurrentRequestsPerTeam: 1 })
    const first = run('first', 'team', 'a', 'm')
    await vi.waitFor(() => { expect(started).toEqual(['first']) })
    const waiting = run('waiting', 'team', 'a', 'm')
    const last = run('last', 'team', 'a', 'm')
    const reason = new Error('plugin unloaded')
    queue.close(reason)
    queue.close(new Error('second close'))
    await expect(waiting.finished).rejects.toBe(reason)
    await expect(last.finished).rejects.toBe(reason)
    await expect(run('later', 'other', 'b', 'm').finished).rejects.toBe(reason)
    first.release()
    await first.finished
    expect(started).toEqual(['first'])
  })

  it.each([
    { maxConcurrentRequestsPerTeam: 0 },
    { maxConcurrentRequestsPerTeam: 1.5 },
    { maxConcurrentRequestsPerTeam: Number.MAX_SAFE_INTEGER + 1 },
    { providerConcurrency: [{ provider: 'a', maxConcurrentRequests: -1 }] },
    { providerConcurrency: [{ provider: ' a', maxConcurrentRequests: 1 }] },
    { providerConcurrency: [{ provider: 'a', maxConcurrentRequests: 1 }, { provider: 'a', maxConcurrentRequests: 2 }] },
    { modelConcurrency: [{ provider: 'a', model: '', maxConcurrentRequests: 1 }] },
    { modelConcurrency: [{ provider: 'a', model: 'm', maxConcurrentRequests: 1 }, { provider: 'a', model: 'm', maxConcurrentRequests: 2 }] },
  ])('rejects invalid or ambiguous request limits: %j', (config) => {
    expect(() => resolveRequestLimits(config)).toThrow()
  })

  it('validates referenced providers while preserving distinct exact model routes', () => {
    const { queue } = fixture({
      providerConcurrency: [{ provider: 'a', maxConcurrentRequests: 1 }],
      modelConcurrency: [
        { provider: 'a', model: 'b/c', maxConcurrentRequests: 1 },
        { provider: 'a/b', model: 'c', maxConcurrentRequests: 2 },
      ],
    })
    expect(() => { queue.validateProviders(['a']) }).toThrow('"a/b" is not registered')
    expect(() => { queue.validateProviders(['a', 'a/b']) }).not.toThrow()
  })
})
