/** Atomic admission for Team model requests sharing Team, provider, and model capacity. */

import { addAbortListener } from 'node:events'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { TeamError } from './error.ts'
import type { TeamId, TeamRequestLimits } from './types.ts'
import { failureCooldownMs } from './cooldown.ts'

/** One capacity counter shared by every request that consumes this resource. */
interface Capacity {
  limit: number
  active: number
}

/** One queued request, owned until rejection or transfer of its release callback. */
interface Admission {
  readonly provider: string
  readonly teamId: TeamId
  readonly capacities: readonly Capacity[]
  readonly resolve: (release: () => void) => void
  readonly reject: (reason: unknown) => void
  disposeAbort: () => void
}

/**
 * Validate one positive safe-integer deployment limit.
 * @param name - configuration field used in failure messages.
 * @param value - supplied or explicitly defaulted limit.
 * @returns the validated limit.
 */
export function positiveLimit(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TeamError(`${name} must be a positive safe integer`, 'TEAM_INVALID_CONFIG')
  }
  return value
}

/**
 * Resolve request limits without changing model context, output, or reasoning settings.
 * @param config - Team deployment request limits.
 * @returns detached limits with defaults and unique route entries.
 */
export function resolveRequestLimits(config: TeamRequestLimits): Required<TeamRequestLimits> {
  const providers = new Set<string>()
  const providerConcurrency = (config.providerConcurrency ?? []).map((entry) => {
    const provider = routeName(entry.provider, 'providerConcurrency.provider')
    if (providers.has(provider)) throw new TeamError(`duplicate concurrency provider "${provider}"`, 'TEAM_INVALID_CONFIG')
    providers.add(provider)
    return { provider, maxConcurrentRequests: positiveLimit('providerConcurrency.maxConcurrentRequests', entry.maxConcurrentRequests) }
  })
  const models = new Set<string>()
  const modelConcurrency = (config.modelConcurrency ?? []).map((entry) => {
    const provider = routeName(entry.provider, 'modelConcurrency.provider')
    const model = routeName(entry.model, 'modelConcurrency.model')
    const key = modelKey(provider, model)
    if (models.has(key)) throw new TeamError(`duplicate concurrency model ${key}`, 'TEAM_INVALID_CONFIG')
    models.add(key)
    return { provider, model, maxConcurrentRequests: positiveLimit('modelConcurrency.maxConcurrentRequests', entry.maxConcurrentRequests) }
  })
  return {
    maxConcurrentRequestsPerTeam: positiveLimit('maxConcurrentRequestsPerTeam', config.maxConcurrentRequestsPerTeam ?? 8),
    providerConcurrency,
    modelConcurrency,
  }
}

/** Encode the complete route without conflating model ids containing separators. */
function modelKey(provider: string, model: string): string {
  return JSON.stringify([provider, model])
}

/** Require an exact non-empty route key in configuration. */
function routeName(value: string, field: string): string {
  if (value.length === 0 || value !== value.trim()) {
    throw new TeamError(`${field} must be non-empty without surrounding whitespace`, 'TEAM_INVALID_CONFIG')
  }
  return value
}

/** Own queued admissions; callers own active streams and release capacity after stream settlement. */
export class TeamRequestQueue {
  private readonly cooldowns = new Map<string, { until: number; timer: ReturnType<typeof setTimeout> }>()
  private readonly accounts = new Map<string, Capacity[]>()
  private readonly teams = new Map<TeamId, Capacity>()
  private readonly providers = new Map<string, Capacity>()
  private readonly models = new Map<string, Capacity>()
  private readonly waiting = new Set<Admission>()
  private closedReason: Error | undefined

  /**
   * @param limits - validated, fully resolved request limits.
   */
  constructor(private readonly limits: Required<TeamRequestLimits>,
    private readonly cooldown?: { rateMs: number; quotaMs: number },
    private readonly pools: readonly { id: string; providers: readonly string[]; maxConcurrentRequests: number }[] = []) {
    if (new Set(pools.map(pool => pool.id)).size !== pools.length) throw new TeamError('duplicate account pool', 'TEAM_INVALID_CONFIG')
    for (const pool of pools) {
      if (pool.id.trim() === '' || pool.providers.length === 0 || new Set(pool.providers).size !== pool.providers.length) {
        throw new TeamError('account pools need unique ids and distinct providers', 'TEAM_INVALID_CONFIG')
      }
      const capacity = { limit: positiveLimit('accountPools.maxConcurrentRequests', pool.maxConcurrentRequests), active: 0 }
      for (const provider of pool.providers) this.accounts.set(provider, [...this.accounts.get(provider) ?? [], capacity])
    }
    for (const entry of limits.providerConcurrency) {
      this.providers.set(entry.provider, { limit: entry.maxConcurrentRequests, active: 0 })
    }
    for (const entry of limits.modelConcurrency) {
      this.models.set(modelKey(entry.provider, entry.model), { limit: entry.maxConcurrentRequests, active: 0 })
    }
  }

  /**
   * Reject limits naming unavailable providers once the model registry is resolvable.
   * Model ids are exact routing values, independent of an adapter's advisory catalog.
   * @param available - currently registered provider route names.
   */
  validateProviders(available: readonly string[]): void {
    const registered = new Set(available)
    for (const { provider } of [...this.limits.providerConcurrency, ...this.limits.modelConcurrency,
      ...this.pools.flatMap(pool => pool.providers.map(provider => ({ provider })))]) {
      if (!registered.has(provider)) {
        throw new TeamError(`concurrency provider "${provider}" is not registered`, 'TEAM_INVALID_CONFIG')
      }
    }
  }

  /**
   * Wait for every applicable quota, then delegate the unchanged stream once.
   * Cancellation while queued never invokes the adapter. Capacity remains owned
   * until the delegated iterator settles, including cancellation and early return.
   * @param teamId - Team whose request consumes capacity.
   * @param options - original immutable model request.
   * @param next - remaining model stream middleware and adapter.
   * @param budget - Confirmed project request limit, additionally bounded by deployment limits.
   * @returns the original stream chunks after admission.
   */
  async * stream(teamId: TeamId, options: GenerateOptions, next: () => AsyncIterable<StreamChunk>,
    budget?: number): AsyncIterable<StreamChunk> {
    const release = await this.acquire(teamId, options, budget)
    try {
      if (this.closedReason !== undefined) throw this.closedReason
      options.signal?.throwIfAborted()
      for await (const chunk of next()) {
        if (chunk.type === 'finish' && chunk.reason.kind === 'error' && this.cooldown !== undefined) {
          const delay = failureCooldownMs(chunk.reason.failure, this.cooldown.rateMs, this.cooldown.quotaMs)
          if (delay !== undefined) this.pause(options.provider, Date.now() + delay)
        }
        yield chunk
      }
    } finally {
      release()
    }
  }

  /**
   * Reject queued and future requests. Active streams retain caller-owned cancellation.
   * @param reason - runtime disposal reason propagated to queued callers.
   */
  close(reason: Error): void {
    if (this.closedReason !== undefined) return
    this.closedReason = reason
    for (const cooldown of this.cooldowns.values()) clearTimeout(cooldown.timer)
    this.cooldowns.clear()
    for (const entry of this.waiting) this.reject(entry, reason)
  }

  /**
   * Hold a provider until its recorded cooldown ends without consuming partial capacity.
   * @param provider - Exact configured provider; no route is substituted.
   * @param until - Absolute cooldown deadline, reconstructed from durable failure and mailbox records.
   */
  pause(provider: string, until: number): void {
    for (const pool of this.pools) if (pool.providers.includes(provider)) {
      for (const sibling of pool.providers) this.pauseRoute(sibling, until)
    }
    this.pauseRoute(provider, until)
  }

  private pauseRoute(provider: string, until: number): void {
    if (this.closedReason !== undefined || until <= Date.now()) return
    const previous = this.cooldowns.get(provider)
    if (previous !== undefined && previous.until >= until) return
    if (previous !== undefined) clearTimeout(previous.timer)
    const timer = setTimeout(() => { this.cooldowns.delete(provider); this.drain() }, Math.min(2_147_483_647, until - Date.now()))
    timer.unref()
    this.cooldowns.set(provider, { until, timer })
  }

  /** Reserve all applicable counters together; queued requests own no partial quota. */
  private async acquire(teamId: TeamId, options: GenerateOptions, budget?: number): Promise<() => void> {
    if (this.closedReason !== undefined) throw this.closedReason
    options.signal?.throwIfAborted()
    let team = this.teams.get(teamId)
    if (team === undefined) {
      team = { limit: this.limits.maxConcurrentRequestsPerTeam, active: 0 }
      this.teams.set(teamId, team)
    }
    team.limit = Math.min(this.limits.maxConcurrentRequestsPerTeam,
      budget === undefined ? this.limits.maxConcurrentRequestsPerTeam : positiveLimit('confirmed request budget', budget))
    const capacities = [team, ...this.accounts.get(options.provider) ?? []]
    const provider = this.providers.get(options.provider)
    const model = this.models.get(modelKey(options.provider, options.model))
    if (provider !== undefined) capacities.push(provider)
    if (model !== undefined) capacities.push(model)
    const pending = Promise.withResolvers<() => void>()
    const entry: Admission = { teamId, provider: options.provider, capacities,
      resolve: pending.resolve, reject: pending.reject, disposeAbort: () => {} }
    this.waiting.add(entry)
    if (options.signal !== undefined) {
      const subscription = addAbortListener(options.signal, () => { this.reject(entry, options.signal?.reason) })
      entry.disposeAbort = () => { subscription[Symbol.dispose]() }
    }
    this.drain()
    return await pending.promise
  }

  /** Admit the oldest eligible requests while allowing independent routes to progress. */
  private drain(): void {
    if (this.closedReason !== undefined) return
    for (const entry of this.waiting) {
      if ((this.cooldowns.get(entry.provider)?.until ?? 0) > Date.now()) continue
      if (entry.capacities.some(capacity => capacity.active >= capacity.limit)) continue
      this.waiting.delete(entry)
      entry.disposeAbort()
      for (const capacity of entry.capacities) capacity.active += 1
      let released = false
      entry.resolve(() => {
        if (released) return
        released = true
        for (const capacity of entry.capacities) capacity.active -= 1
        this.drain()
        this.retireTeam(entry.teamId)
      })
    }
  }

  /** Detach a queued cancellation before reporting it to the stream's caller. */
  private reject(entry: Admission, reason: unknown): void {
    if (!this.waiting.delete(entry)) return
    entry.disposeAbort()
    this.retireTeam(entry.teamId)
    entry.reject(reason)
  }

  /** Finished Teams do not retain process-local scheduling state. */
  private retireTeam(teamId: TeamId): void {
    if (this.teams.get(teamId)?.active !== 0) return
    if ([...this.waiting].some(entry => entry.teamId === teamId)) return
    this.teams.delete(teamId)
  }
}
