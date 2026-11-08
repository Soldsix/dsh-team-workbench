/**
 * Service Definition for the web access capability seam (`ctx.web`): registries and provider-selecting execution for search and
 * fetch. Duplicate ids are rejected. At execution time, a configured provider must exist and
 * be usable; without one, exactly one usable provider is required, so selection never depends
 * on registration order.
 * @module @deepseek-ai/dsh-web
 */

import { Context, Service, type Volatile } from '@deepseek-ai/cordis'
import { AsyncLocalStorage } from 'node:async_hooks'
import z from '@deepseek-ai/schemastery'
import type {
  WebFetchProvider,
  WebFetchRequest,
  WebFetchResult,
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
} from './types.ts'
import { WebError } from './types.ts'

export {
  WebError,
} from './types.ts'
export type {
  WebFetchBody,
  WebFetchProvider,
  WebFetchRequest,
  WebFetchResult,
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    web: WebRuntime
  }
}

/** Selection inputs for execution-time provider resolution. */
interface Selection<P> {
  /** The configured provider id for this capability, if any. */
  readonly configuredId?: string
  /** Providers registered for this capability kind. */
  readonly providers: ReadonlyMap<string, P>
}

/**
 * Config for the web seam. `searchProvider` / `fetchProvider` pin which provider
 * wins for each capability; both are optional (a single registered usable
 * provider auto-selects). Operational overrides such as environment variables
 * must feed these same fields rather than introduce a hidden priority chain.
 */
export interface WebRuntimeConfig {
  /** Explicit search provider id. Omitted = auto-select when exactly one usable. */
  readonly searchProvider: Volatile<string | undefined>
  /** Explicit fetch provider id. Omitted = auto-select when exactly one usable. */
  readonly fetchProvider: Volatile<string | undefined>
  /** Ordered, explicitly approved backup search provider ids; requires searchProvider. Defaults to none. */
  readonly searchFallbackProviders?: string[]
  /** Cooldown after rate or transport errors; zero disables it. Credential repairs take effect immediately. Defaults to 30000 ms. */
  readonly searchFailureCooldownMs?: number
}

/**
 * The web access service. Registered as `ctx.web` (one instance per context).
 *
 * Selection semantics (resolved at execution time, never order-dependent):
 * - A configured id that is registered and `available()` → that provider.
 * - A configured id not registered → `WEB_PROVIDER_CONFIGURED_MISSING`.
 * - A configured id registered but unavailable →
 *   `WEB_PROVIDER_CONFIGURED_UNAVAILABLE`.
 * - No id configured, exactly one registered usable provider → that provider.
 * - No id configured, multiple usable providers → `WEB_PROVIDER_AMBIGUOUS`.
 * - No id configured, no usable provider → `WEB_PROVIDER_UNAVAILABLE`.
 */
export class WebRuntime extends Service {
  /**
   * Provider selection config. Operational env overrides feed the SAME fields:
   * `$DSH_WEB_SEARCH_PROVIDER` / `$DSH_WEB_FETCH_PROVIDER` are equivalent to
   * `searchProvider` / `fetchProvider` and are NOT a hidden priority chain.
   */
  static Config = z.object({
    searchProvider: z.string().volatile(),
    fetchProvider: z.string().volatile(),
    searchFallbackProviders: z.array(z.string()).default([]),
    searchFailureCooldownMs: z.number().step(1).min(0).default(30_000),
  })

  private searchProviders = new Map<string, WebSearchProvider>()
  private fetchProviders = new Map<string, WebFetchProvider>()
  private readonly searchProviderEnv: string | undefined
  private get searchProviderId(): string | undefined { return this.config.searchProvider.get() ?? this.searchProviderEnv }
  private readonly fetchProviderEnv: string | undefined
  private get fetchProviderId(): string | undefined { return this.config.fetchProvider.get() ?? this.fetchProviderEnv }
  private readonly fetchOrigins = new AsyncLocalStorage<readonly string[]>()
  private readonly searchFallbackProviderIds: readonly string[]
  private readonly searchFailureCooldownMs: number
  private readonly searchFailures = new Map<string, { code: string; retryAt: number }>()

  constructor(ctx: Context, private readonly config: WebRuntimeConfig) {
    super(ctx, 'web')
    this.searchProviderEnv = process.env.DSH_WEB_SEARCH_PROVIDER
    this.fetchProviderEnv = process.env.DSH_WEB_FETCH_PROVIDER
    this.searchFallbackProviderIds = [...config.searchFallbackProviders ?? []]
    this.searchFailureCooldownMs = config.searchFailureCooldownMs ?? 30_000
    if (!Number.isSafeInteger(this.searchFailureCooldownMs) || this.searchFailureCooldownMs < 0) {
      throw new Error('searchFailureCooldownMs must be a nonnegative safe integer')
    }
    if (this.searchFallbackProviderIds.length > 0 && this.searchProviderId === undefined
      || this.searchFallbackProviderIds.some(id => id.trim() === '' || id === this.searchProviderId)
      || new Set(this.searchFallbackProviderIds).size !== this.searchFallbackProviderIds.length) {
      throw new Error('searchFallbackProviders requires a pinned searchProvider and distinct nonempty backup ids')
    }
  }

  /**
   * Register a search provider. Throws {@link WebError} `WEB_DUPLICATE_PROVIDER`
   * if its id is already registered for search. Returns a disposer; disposed
   * with the calling fiber.
   * @param provider - the provider; its `id` is the registry key.
   * @returns the disposer that unregisters the provider.
   */
  registerSearchProvider(provider: WebSearchProvider): () => void {
    return this.registerProvider(this.searchProviders, provider, () => { this.searchFailures.delete(provider.id) })
  }

  /**
   * Register a fetch provider. Throws {@link WebError} `WEB_DUPLICATE_PROVIDER`
   * if its id is already registered for fetch. Returns a disposer; disposed
   * with the calling fiber.
   * @param provider - the provider; its `id` is the registry key.
   * @returns the disposer that unregisters the provider.
   */
  registerFetchProvider(provider: WebFetchProvider): () => void {
    return this.registerProvider(this.fetchProviders, provider)
  }

  private registerProvider<P extends { readonly id: string }>(store: Map<string, P>, provider: P, onDispose?: () => void): () => void {
    if (store.has(provider.id)) {
      throw new WebError(`a web provider with id "${provider.id}" is already registered`, 'WEB_DUPLICATE_PROVIDER')
    }
    const dispose = this.ctx.effect(function* () {
      store.set(provider.id, provider)
      yield () => {
        store.delete(provider.id)
        onDispose?.()
      }
    }, 'web.registerProvider()')
    // ctx.effect's disposer returns Promise<void>; our disposer API is
    // synchronous fire-and-forget — discard the (always-resolved) promise.
    return () => void dispose()
  }

  /**
   * Run one search through the selected provider. Resolves the provider at call
   * time with the selection rules above; throws {@link WebError} when the
   * capability cannot run. The seam enforces `request.maxResults` on the result:
   * if the provider over-returns, `sources[]` is truncated and `truncated` set.
   * @param request - the query and optional result limit.
   * @param signal - optional cancellation signal forwarded to the provider.
   * @returns the provider's results, capped to `request.maxResults`.
   */
  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    if (signal?.aborted) throw new WebError('web search aborted', 'WEB_ABORTED', { cause: signal.reason })
    const ids = this.searchProviderId === undefined ? [resolveProvider({ providers: this.searchProviders }).id]
      : [this.searchProviderId, ...this.searchFallbackProviderIds]
    const failures: string[] = []
    let lastError: WebError | undefined
    for (const id of ids) {
      if (signal?.aborted) throw new WebError('web search aborted', 'WEB_ABORTED', { cause: signal.reason })
      try {
        const provider = resolveProvider({ providers: this.searchProviders, configuredId: id })
        const held = this.searchFailures.get(id)
        if (held !== undefined && held.retryAt > Date.now()) {
          throw new WebError(`search provider "${id}" is cooling down after ${held.code} until ${new Date(held.retryAt).toISOString()}; use web_status to inspect configured alternatives`, 'WEB_SEARCH_COOLDOWN')
        }
        const result = await provider.search(request, signal)
        if (signal?.aborted) throw new WebError('web search aborted', 'WEB_ABORTED', { cause: signal.reason })
        this.searchFailures.delete(id)
        const notice = failures.length === 0 ? undefined
          : `Search used the configured backup provider "${id}" after ${failures.join(', ')}.`
        return capSources(notice === undefined ? result : {
          ...result, content: [notice, result.content].filter(value => value !== undefined && value.length > 0).join('\n\n'),
        }, request.maxResults)
      } catch (error: unknown) {
        if (signal?.aborted) throw new WebError('web search aborted', 'WEB_ABORTED', { cause: signal.reason })
        if (!(error instanceof WebError) || !searchCanUseBackup(error.code)) throw error
        if (error.code !== 'WEB_SEARCH_COOLDOWN' && this.searchProviders.has(id)) {
          const retryAt = error.code === 'WEB_SEARCH_RATE_LIMITED' || error.code === 'WEB_PROVIDER_ERROR'
            ? Date.now() + this.searchFailureCooldownMs : Date.now()
          this.searchFailures.set(id, { code: error.code, retryAt })
        }
        lastError = error
        failures.push(`${id} (${error.code})`)
      }
    }
    if (lastError === undefined) throw new WebError('no search provider was selected', 'WEB_PROVIDER_UNAVAILABLE')
    throw new WebError(`${lastError.message}\nSearch attempts: ${failures.join(', ')}. Inspect web_status before repeating; provider failures do not revoke user authorization.`, lastError.code, { cause: lastError })
  }

  /**
   * Read local provider registration, configuration, and recent search failures without network access.
   * @returns credential-free local observations; availability does not prove a remote request will succeed.
   */
  status(): {
    search: {
      configuredProvider?: string
      fallbackProviders: readonly string[]
      providers: { id: string; available: boolean; failure?: { code: string; retryAt: number } }[]
    }
    fetch: { configuredProvider?: string; providers: { id: string; available: boolean; preservesOrigin: boolean }[] }
  } {
    return {
      search: {
        ...this.searchProviderId === undefined ? {} : { configuredProvider: this.searchProviderId },
        fallbackProviders: [...this.searchFallbackProviderIds],
        providers: [...this.searchProviders.values()].map((provider) => {
          const failure = this.searchFailures.get(provider.id)
          return { id: provider.id, available: provider.available(), ...failure === undefined ? {} : { failure: { ...failure } } }
        }),
      },
      fetch: {
        ...this.fetchProviderId === undefined ? {} : { configuredProvider: this.fetchProviderId },
        providers: [...this.fetchProviders.values()].map(provider => ({
          id: provider.id, available: provider.available(), preservesOrigin: provider.preservesOrigin === true,
        })),
      },
    }
  }

  /** Resolve the fetch provider without changing search recovery state. */
  private selectedFetchProvider(): WebFetchProvider {
    return resolveProvider({
      providers: this.fetchProviders,
      ...this.fetchProviderId !== undefined ? { configuredId: this.fetchProviderId } : {},
    })
  }

  /**
   * Retrieve one URL through the selected provider. Resolves the provider at
   * call time with the selection rules above; throws {@link WebError} when the
   * capability cannot run. A non-2xx response is a result, not a throw.
   * @param request - the URL plus retrieval options.
   * @param signal - optional cancellation signal forwarded to the provider.
   * @returns the retrieval outcome; non-2xx responses resolve descriptively.
   */
  async fetch(request: WebFetchRequest, signal?: AbortSignal): Promise<WebFetchResult> {
    const provider = this.selectedFetchProvider()
    const requiredOrigins = this.fetchOrigins.getStore()
    if (requiredOrigins !== undefined) {
      const url = new URL(request.url)
      if (provider.preservesOrigin !== true || !['http:', 'https:'].includes(url.protocol)
        || url.username || url.password || requiredOrigins.some(origin => origin !== url.origin)) {
        throw new WebError('fetch provider or target cannot honor the required origin', 'WEB_ORIGIN_RESTRICTION')
      }
    }
    return provider.fetch(request, signal)
  }

  /**
   * Enforce one requested origin at actual provider dispatch throughout an asynchronous operation.
   * @param origin - Approved normalized HTTP(S) origin.
   * @param operation - Work whose fetch calls must use a provider preserving that origin.
   * @returns the operation result; nested requirements intersect and simultaneous calls remain isolated.
   */
  withFetchOrigin<T>(origin: string, operation: () => T): T {
    return this.fetchOrigins.run([...(this.fetchOrigins.getStore() ?? []), origin], operation)
  }

  /**
   * Check the selected fetch provider's redirect enforcement before a scoped request.
   * @returns true only for a usable provider that confines every redirect to the requested origin.
   */
  fetchPreservesOrigin(): boolean {
    const provider = this.selectedFetchProvider()
    return provider.preservesOrigin === true
  }
}

/** Only explicit provider failures permit another configured backend; policy denials and cancellation stop dispatch. */
function searchCanUseBackup(code: string): boolean {
  return ['WEB_PROVIDER_ERROR', 'WEB_PROVIDER_CONFIGURED_MISSING', 'WEB_PROVIDER_CONFIGURED_UNAVAILABLE',
    'WEB_PROVIDER_CREDENTIAL_MISSING', 'WEB_PROVIDER_RESPONSE_INVALID', 'WEB_SEARCH_NOT_PERFORMED',
    'WEB_SEARCH_RATE_LIMITED', 'WEB_SEARCH_TOOL_ERROR', 'WEB_SEARCH_COOLDOWN'].includes(code)
}

interface ResolvableProvider {
  readonly id: string
  available(): boolean
}

/** Resolve the selected provider or throw the matching {@link WebError}. */
function resolveProvider<P extends ResolvableProvider>(selection: Selection<P>): P {
  const { configuredId, providers } = selection
  if (configuredId !== undefined) {
    const provider = providers.get(configuredId)
    if (!provider) {
      throw new WebError(`configured web provider "${configuredId}" is not registered`, 'WEB_PROVIDER_CONFIGURED_MISSING')
    }
    if (!provider.available()) {
      throw new WebError(`configured web provider "${configuredId}" is registered but unavailable`, 'WEB_PROVIDER_CONFIGURED_UNAVAILABLE')
    }
    return provider
  }
  const usable = [...providers.values()].filter(provider => provider.available())
  const [single] = usable
  if (single === undefined) {
    throw new WebError('no usable web provider is registered', 'WEB_PROVIDER_UNAVAILABLE')
  }
  if (usable.length > 1) {
    const ids = usable.map(provider => provider.id).join(', ')
    throw new WebError(`multiple usable web providers are registered (${ids}); configure one explicitly`, 'WEB_PROVIDER_AMBIGUOUS')
  }
  return single
}

/** Enforce `maxResults` on a search result: truncate `sources[]` and flag it. */
function capSources(result: WebSearchResult, maxResults: number | undefined): WebSearchResult {
  if (maxResults === undefined || result.sources.length <= maxResults) return result
  return { ...result, sources: result.sources.slice(0, maxResults), truncated: true }
}

export default WebRuntime
