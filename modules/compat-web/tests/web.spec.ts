import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import WebRuntime, {
  WebError,
  type WebFetchProvider,
  type WebFetchResult,
  type WebSearchProvider,
  type WebSearchRequest,
  type WebSearchResult,
} from '@deepseek-ai/dsh-web'

/** A scripted search provider for contract tests. */
function makeSearchProvider(
  id: string,
  available: boolean,
  search: (request: WebSearchRequest) => Promise<WebSearchResult>,
): WebSearchProvider {
  return { id, available: () => available, search: request => search(request) }
}

function makeFetchProvider(id: string, available: boolean, result: WebFetchResult): WebFetchProvider {
  return { id, available: () => available, fetch: () => Promise.resolve(result) }
}

const available = true
const unavailable = false

function searchResult(marker: string, overrides: Partial<WebSearchResult> = {}): WebSearchResult {
  return { content: marker, sources: [], truncated: false, ...overrides }
}

function fetchResult(marker: string): WebFetchResult {
  return { url: 'https://example.com', statusCode: 200, body: { kind: 'text', content: marker }, truncated: false }
}

/** Mount a WebRuntime on a fresh root context with the given config. */
async function mountWeb(config: { searchProvider?: string; fetchProvider?: string; searchFallbackProviders?: string[]; searchFailureCooldownMs?: number } = {}): Promise<{ ctx: Context; web: WebRuntime }> {
  const ctx = new Context()
  await ctx.plugin(WebRuntime, config)
  return { ctx, web: ctx.web }
}

describe('explicit search recovery', () => {
  it('uses only configured backups, discloses the route, and stops after success', async ({ onTestFinished }) => {
    const { ctx, web } = await mountWeb({ searchProvider: 'primary', searchFallbackProviders: ['backup'] })
    onTestFinished(async () => { await ctx.fiber.dispose() })
    const primary = vi.fn(async () => { throw new WebError('native search missing', 'WEB_SEARCH_NOT_PERFORMED') })
    const backup = vi.fn(async () => searchResult('verified backup', { sources: [{ url: 'https://source.test/a' }] }))
    const other = vi.fn(async () => searchResult('must not run'))
    web.registerSearchProvider(makeSearchProvider('primary', true, primary))
    web.registerSearchProvider(makeSearchProvider('backup', true, backup))
    web.registerSearchProvider(makeSearchProvider('unapproved', true, other))
    const result = await web.search({ query: 'q', maxResults: 1 })
    expect(result.content).toContain('configured backup provider "backup"')
    expect(result.content).toContain('WEB_SEARCH_NOT_PERFORMED')
    expect(result.sources).toEqual([{ url: 'https://source.test/a' }])
    expect(primary).toHaveBeenCalledOnce()
    expect(backup).toHaveBeenCalledOnce()
    expect(other).not.toHaveBeenCalled()
  })

  it.each(['WEB_ABORTED', 'WEB_ORIGIN_RESTRICTION'])('does not dispatch a backup after %s', async (code) => {
    const { ctx, web } = await mountWeb({ searchProvider: 'primary', searchFallbackProviders: ['backup'] })
    onTestFinished(async () => { await ctx.fiber.dispose() })
    web.registerSearchProvider(makeSearchProvider('primary', true, async () => { throw new WebError('stop', code) }))
    const backup = vi.fn(async () => searchResult('wrong'))
    web.registerSearchProvider(makeSearchProvider('backup', true, backup))
    await expect(web.search({ query: 'q' })).rejects.toMatchObject({ code })
    expect(backup).not.toHaveBeenCalled()
  })

  it('holds repeated rate failures until cooldown and forgets failures after provider disposal', async ({ onTestFinished }) => {
    const clock = vi.spyOn(Date, 'now')
    onTestFinished(() => { clock.mockRestore() })
    clock.mockReturnValue(1000)
    const { ctx, web } = await mountWeb({ searchProvider: 'limited', searchFailureCooldownMs: 100 })
    onTestFinished(async () => { await ctx.fiber.dispose() })
    const search = vi.fn(async () => { throw new WebError('rate', 'WEB_SEARCH_RATE_LIMITED') })
    const release = web.registerSearchProvider(makeSearchProvider('limited', true, search))
    await expect(web.search({ query: 'q' })).rejects.toMatchObject({ code: 'WEB_SEARCH_RATE_LIMITED' })
    await expect(web.search({ query: 'q' })).rejects.toMatchObject({ code: 'WEB_SEARCH_COOLDOWN' })
    expect(search).toHaveBeenCalledOnce()
    expect(web.status().search.providers[0]?.failure).toEqual({ code: 'WEB_SEARCH_RATE_LIMITED', retryAt: 1100 })
    clock.mockReturnValue(1100)
    await expect(web.search({ query: 'q' })).rejects.toMatchObject({ code: 'WEB_SEARCH_RATE_LIMITED' })
    expect(search).toHaveBeenCalledTimes(2)
    release()
    web.registerSearchProvider(makeSearchProvider('limited', true, async () => searchResult('restored')))
    await expect(web.search({ query: 'q' })).resolves.toMatchObject({ content: 'restored' })
    expect(web.status().search.providers[0]).not.toHaveProperty('failure')
  })

  it('retries repaired credentials immediately without changing the chat model', async ({ onTestFinished }) => {
    const { ctx, web } = await mountWeb({ searchProvider: 'credential' })
    onTestFinished(async () => { await ctx.fiber.dispose() })
    let ready = false
    web.registerSearchProvider(makeSearchProvider('credential', true, async () => {
      if (!ready) throw new WebError('missing', 'WEB_PROVIDER_CREDENTIAL_MISSING')
      return searchResult('ready')
    }))
    await expect(web.search({ query: 'q' })).rejects.toMatchObject({ code: 'WEB_PROVIDER_CREDENTIAL_MISSING' })
    ready = true
    await expect(web.search({ query: 'q' })).resolves.toMatchObject({ content: 'ready' })
  })
})

describe('WebRuntime registration', () => {
  it('rechecks the selected provider after an asynchronous origin admission and separates concurrent calls', async () => {
    const { ctx, web } = await mountWeb()
    const release = web.registerFetchProvider({ ...makeFetchProvider('confined', true, fetchResult('confined')), preservesOrigin: true })
    expect(web.fetchPreservesOrigin()).toBe(true)
    const pending = Promise.withResolvers<undefined>()
    const admitted = web.withFetchOrigin('https://example.com', async () => {
      await pending.promise
      return web.fetch({ url: 'https://example.com/page' })
    })
    release()
    web.registerFetchProvider(makeFetchProvider('replacement', true, fetchResult('replacement')))
    const rejected = expect(admitted).rejects.toMatchObject({ code: 'WEB_ORIGIN_RESTRICTION' })
    await expect(web.fetch({ url: 'https://other.example/page' })).resolves.toMatchObject({ body: { content: 'replacement' } })
    pending.resolve(undefined)
    await rejected
    await ctx.fiber.dispose()
  })

  it('reports redirect confinement only for the currently selected usable provider', async () => {
    const { ctx, web } = await mountWeb()
    const release = web.registerFetchProvider(makeFetchProvider('legacy', true, fetchResult('legacy')))
    expect(web.fetchPreservesOrigin()).toBe(false)
    release()
    web.registerFetchProvider({ ...makeFetchProvider('confined', true, fetchResult('confined')), preservesOrigin: true })
    expect(web.fetchPreservesOrigin()).toBe(true)
    await ctx.fiber.dispose()
  })

  it('registers a search provider and unregisters it via the returned disposer', async () => {
    const { web } = await mountWeb()

    const dispose = web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa'))))
    await expect(web.search({ query: 'q' })).resolves.toMatchObject({ content: 'exa' })

    dispose()
    await expect(web.search({ query: 'q' })).rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_UNAVAILABLE' }))
  })

  it('throws WEB_DUPLICATE_PROVIDER on a duplicate search id', async () => {
    const { web } = await mountWeb()
    web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa'))))
    expect(() => web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa')))))
      .toThrow(expect.objectContaining({ code: 'WEB_DUPLICATE_PROVIDER' }))
  })

  it('keeps search and fetch id namespaces independent', async () => {
    const { web } = await mountWeb()
    web.registerSearchProvider(makeSearchProvider('shared', available, () => Promise.resolve(searchResult('shared'))))
    expect(() => web.registerFetchProvider(makeFetchProvider('shared', available, fetchResult('shared')))).not.toThrow()
  })

  it('disposes provider registrations when the contributing fiber is disposed (HMR safety)', async () => {
    const { ctx, web } = await mountWeb()
    const fiber = await ctx.plugin(Object.assign((inner: Context) => {
      inner.web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa'))))
    }, { inject: ['web'] }))
    await expect(web.search({ query: 'q' })).resolves.toMatchObject({ content: 'exa' })
    await fiber.dispose()
    await expect(web.search({ query: 'q' })).rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_UNAVAILABLE' }))
  })
})

describe('WebRuntime execution resolution', () => {
  it('throws WEB_PROVIDER_UNAVAILABLE when nothing is registered', async () => {
    const { web } = await mountWeb()
    await expect(web.search({ query: 'q' })).rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_UNAVAILABLE' }))
  })

  it('throws WEB_PROVIDER_UNAVAILABLE when providers exist but none are usable', async () => {
    const { web } = await mountWeb()
    web.registerSearchProvider(makeSearchProvider('exa', unavailable, () => Promise.resolve(searchResult('exa'))))
    await expect(web.search({ query: 'q' })).rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_UNAVAILABLE' }))
  })

  it('throws WEB_PROVIDER_CONFIGURED_MISSING for an unregistered configured id', async () => {
    const { web } = await mountWeb({ searchProvider: 'perplexity' })
    web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa'))))
    await expect(web.search({ query: 'q' })).rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_CONFIGURED_MISSING' }))
  })

  it('throws WEB_PROVIDER_CONFIGURED_UNAVAILABLE for an unusable configured id', async () => {
    const { web } = await mountWeb({ searchProvider: 'exa' })
    web.registerSearchProvider(makeSearchProvider('exa', unavailable, () => Promise.resolve(searchResult('exa'))))
    await expect(web.search({ query: 'q' })).rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_CONFIGURED_UNAVAILABLE' }))
  })

  it('throws WEB_PROVIDER_AMBIGUOUS rather than picking by order', async () => {
    const { web } = await mountWeb()
    web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa'))))
    web.registerSearchProvider(makeSearchProvider('perplexity', available, () => Promise.resolve(searchResult('perplexity'))))
    await expect(web.search({ query: 'q' })).rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_AMBIGUOUS' }))
  })

  it('runs the configured provider even when another usable provider is registered', async () => {
    const { web } = await mountWeb({ searchProvider: 'perplexity' })
    web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa'))))
    web.registerSearchProvider(makeSearchProvider('perplexity', available, () => Promise.resolve(searchResult('perplexity'))))
    await expect(web.search({ query: 'q' })).resolves.toMatchObject({ content: 'perplexity' })
  })

  it('ignores unusable providers when auto-selecting', async () => {
    const { web } = await mountWeb()
    web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa'))))
    web.registerSearchProvider(makeSearchProvider('perplexity', unavailable, () => Promise.resolve(searchResult('perplexity'))))
    await expect(web.search({ query: 'q' })).resolves.toMatchObject({ content: 'exa' })
  })

  it('does not let registration order change auto-selection', async () => {
    const a = await mountWeb()
    a.web.registerSearchProvider(makeSearchProvider('exa', unavailable, () => Promise.resolve(searchResult('exa'))))
    a.web.registerSearchProvider(makeSearchProvider('perplexity', available, () => Promise.resolve(searchResult('perplexity'))))
    await expect(a.web.search({ query: 'q' })).resolves.toMatchObject({ content: 'perplexity' })

    const b = await mountWeb()
    b.web.registerSearchProvider(makeSearchProvider('perplexity', available, () => Promise.resolve(searchResult('perplexity'))))
    b.web.registerSearchProvider(makeSearchProvider('exa', unavailable, () => Promise.resolve(searchResult('exa'))))
    await expect(b.web.search({ query: 'q' })).resolves.toMatchObject({ content: 'perplexity' })
  })

  it('runs the selected provider and returns its result', async () => {
    const { web } = await mountWeb()
    web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(
      searchResult('exa', { content: 'answer', sources: [{ url: 'https://a' }] }),
    )))
    const result = await web.search({ query: 'q' })
    expect(result.content).toBe('answer')
    expect(result.sources).toEqual([{ url: 'https://a' }])
  })

  it('propagates the abort signal to the provider', async () => {
    const { web } = await mountWeb()
    const seen: (AbortSignal | undefined)[] = []
    web.registerSearchProvider({
      id: 'exa',
      available: () => available,
      search: (_request, signal) => { seen.push(signal); return Promise.resolve(searchResult('exa')) },
    })
    const controller = new AbortController()
    await web.search({ query: 'q' }, controller.signal)
    expect(seen[0]).toBe(controller.signal)
  })
})

describe('WebRuntime maxResults enforcement', () => {
  it('truncates sources and sets truncated when a provider over-returns', async () => {
    const { web } = await mountWeb()
    web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa', {
      sources: [{ url: 'https://1' }, { url: 'https://2' }, { url: 'https://3' }],
    }))))
    const result = await web.search({ query: 'q', maxResults: 2 })
    expect(result.sources).toHaveLength(2)
    expect(result.truncated).toBe(true)
  })

  it('leaves truncated false when within the bound', async () => {
    const { web } = await mountWeb()
    web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa', {
      sources: [{ url: 'https://1' }],
    }))))
    const result = await web.search({ query: 'q', maxResults: 8 })
    expect(result.sources).toHaveLength(1)
    expect(result.truncated).toBe(false)
  })

  it('does not bound when maxResults is omitted', async () => {
    const { web } = await mountWeb()
    web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa', {
      sources: [{ url: 'https://1' }, { url: 'https://2' }],
    }))))
    const result = await web.search({ query: 'q' })
    expect(result.sources).toHaveLength(2)
    expect(result.truncated).toBe(false)
  })
})

describe('WebRuntime fetch capability', () => {
  it('resolves and runs the fetch provider independently of search', async () => {
    const { web } = await mountWeb()
    web.registerFetchProvider(makeFetchProvider('http', available, fetchResult('http')))
    const result = await web.fetch({ url: 'https://example.com' })
    expect(result.body.content).toBe('http')
    expect(result.statusCode).toBe(200)
  })

  it('throws WEB_PROVIDER_UNAVAILABLE for fetch when no fetch provider is registered', async () => {
    const { web } = await mountWeb()
    web.registerSearchProvider(makeSearchProvider('exa', available, () => Promise.resolve(searchResult('exa'))))
    await expect(web.fetch({ url: 'https://example.com' })).rejects.toThrow(
      expect.objectContaining({ code: 'WEB_PROVIDER_UNAVAILABLE' }),
    )
  })
})

describe('WebError', () => {
  it('is a HarnessError carrying its code', () => {
    const error = new WebError('boom', 'WEB_INVALID_URL')
    expect(error.code).toBe('WEB_INVALID_URL')
    expect(error.name).toBe('WebError')
  })
})

describe('live provider selection', () => {
  it('applies a saved search and fetch selection to the next operation without remounting', async () => {
    const { liveConfig } = await import('../../../settings/settings/tests/live-config.ts')
    const ctx = new Context()
    try {
      const live = await liveConfig(ctx, WebRuntime, { searchProvider: 'first', fetchProvider: 'first' })
      const fiber = live.fiber
      for (const id of ['first', 'second']) {
        ctx.web.registerSearchProvider(makeSearchProvider(id, true, () => Promise.resolve(searchResult(id))))
        ctx.web.registerFetchProvider(makeFetchProvider(id, true, fetchResult(id)))
      }
      await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ content: 'first' })
      await expect(ctx.web.fetch({ url: 'https://example.com' })).resolves.toMatchObject({ body: { content: 'first' } })
      await live.update({ searchProvider: 'second', fetchProvider: 'second' })
      expect(Object.is(live.entry.fiber, fiber)).toBe(true)
      await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ content: 'second' })
      await expect(ctx.web.fetch({ url: 'https://example.com' })).resolves.toMatchObject({ body: { content: 'second' } })
    } finally { await ctx.fiber.dispose() }
  })
})
