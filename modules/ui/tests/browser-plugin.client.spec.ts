import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, onTestFinished } from 'vitest'
import { TestRemote } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { TeamAction, type TeamActionInjected } from '../src/client/TeamAction.tsx'
import { TeamView } from '../src/client/TeamView.tsx'
import { registerAgentTeamUi as apply, inject } from '../src/client/mount.ts'
import { apply as nodeApply } from '../src/index.ts'

const SESSION = 'team-session' as SessionId
const CHILD = 'team-child' as SessionId
const GRANDCHILD = 'team-grandchild' as SessionId

async function bench(options: { addressed?: boolean; nested?: boolean; uncached?: boolean } = {}) {
  const ctx = new Context()
  onTestFinished(() => ctx.fiber.dispose())
  const navigation: unknown[] = []
  let mainSessionId = options.addressed === true ? CHILD : SESSION
  new TestRemote(ctx, { settings: {}, session: { projections: async () => ({ ok: true, value: null }) }, teamExperts: {}, agentTeams: {} })
  ctx.provide('sessions', {
    list: { getSnapshot: () => ({ projectionsBySession: options.nested === true && options.uncached !== true ? {
      [SESSION]: { values: { agentTeam: { members: [
        { id: SESSION, name: 'lead', role: 'lead', phase: 'active' },
        { id: CHILD, parentId: SESSION, name: 'worker', role: 'teammate', phase: 'active' },
        { id: GRANDCHILD, parentId: CHILD, name: 'historical-reviewer', role: 'teammate', phase: 'retired' },
      ], tasks: [] } } },
    } : {} }) },
    subagentAddress: (id: SessionId) => options.nested === true && id === GRANDCHILD
      ? { parentSessionId: CHILD, childSessionId: GRANDCHILD, mode: 'continuable' as const }
      : options.addressed === true && id === CHILD
        ? { parentSessionId: SESSION, childSessionId: CHILD, mode: 'continuable' as const }
        : undefined,
    refreshProjections: (id: SessionId) => {
      navigation.push(['refresh', id])
      return Promise.resolve()
    },
    retainInfo: (id: SessionId) => ({
      getSnapshot: () => ({
        referenceCount: id === mainSessionId ? 1 : 0,
        retainedBy: id === mainSessionId ? { mainView: 1 } : {},
      }),
      subscribe: () => () => {},
    }),
  })
  ctx.provide('uiWorkspace', {
    openSession: (target: unknown) => { navigation.push(['open', target]) },
  } as never)
  ctx.provide('conversation', {})
  ctx.provide('locale', new LocaleRuntime(ctx))
  await ctx.plugin(SlotRegistry).await()
  const collapseHeader = ctx.slots.register({
    name: 'root',
    children: {
      'conversation.session.header.actions': { kind: 'list', scope: 'session' },
      'conversation.view': { kind: 'list', scope: 'session' },
    },
  } as never, () => null)
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  const entry = () => ctx.slots.entries('conversation.session.header.actions')
    .find(candidate => candidate.component === TeamAction)
  const actions = (): TeamActionInjected => {
    const injected = entry()!.inject!()
    const { openTeammate } = injected
    if (typeof openTeammate !== 'function') {
      throw new Error('Team header action lacks its injected callbacks')
    }
    return {
      openTeammate: openTeammate as TeamActionInjected['openTeammate'],
      refreshTeam: injected.refreshTeam as TeamActionInjected['refreshTeam'],
    }
  }
  return {
    ctx,
    fiber,
    navigation,
    entry,
    actions,
    collapseHeader,
    select: (sessionId: SessionId) => { mainSessionId = sessionId },
  }
}

describe('ui-team browser plugin', () => {
  it('removes its header action, conversation view, and dictionaries on disposal', async () => {
    const b = await bench()
    expect(inject).toEqual(['sessions', 'uiWorkspace', 'slots', 'locale', 'remote', 'remote.settings', 'remote.session', 'remote.teamExperts', 'remote.agentTeams'])
    expect(b.entry()).toMatchObject({
      options: { id: 'agent-team', order: -20 },
      locale: 'agent-team',
    })
    const t = b.ctx.locale.bind('agent-team')
    expect(t('trigger')).toBe('Agent Team')
    expect(b.ctx.slots.entries('conversation.view').find(entry => entry.component === TeamView)).toMatchObject({
      options: { id: 'agent-team', order: 5 }, locale: 'agent-team',
    })

    expect(b.navigation).toEqual([])

    await b.fiber.dispose()
    expect(b.entry()).toBeUndefined()
    expect(b.ctx.slots.entries('conversation.view').find(entry => entry.component === TeamView)).toBeUndefined()
    expect(t('empty')).toBe('empty')
  })

  it('opens a continuable teammate address without touching the parent catalog', async () => {
    const b = await bench()
    b.actions().openTeammate(SESSION, CHILD)
    expect(b.navigation).toEqual([
      ['open', { parentSessionId: SESSION, childSessionId: CHILD, mode: 'continuable' }],
    ])
  })

  it('recovers a cold nested Team from the root Session without opening a conversation', async () => {
    const b = await bench({ nested: true, addressed: true, uncached: true })
    await b.actions().refreshTeam(GRANDCHILD)
    await b.actions().refreshTeam(GRANDCHILD, true)
    expect(b.navigation).toEqual([['refresh', SESSION], ['refresh', SESSION]])
  })

  it('routes teammate navigation from an addressed teammate conversation back through its Lead', async () => {
    const b = await bench({ addressed: true })
    b.actions().openTeammate(CHILD, CHILD)
    expect(b.navigation).toEqual([
      ['open', { parentSessionId: SESSION, childSessionId: CHILD, mode: 'continuable' }],
    ])
  })

  it('opens the Lead from an addressed teammate conversation', async () => {
    const b = await bench({ addressed: true })
    b.actions().openTeammate(CHILD, SESSION)
    expect(b.navigation).toEqual([['open', SESSION]])
  })

  it('opens retained history for a retired nested member through its direct parent', async () => {
    const b = await bench({ nested: true })
    b.actions().openTeammate(SESSION, GRANDCHILD)
    expect(b.navigation).toEqual([
      ['open', { parentSessionId: CHILD, childSessionId: GRANDCHILD, mode: 'continuable' }],
    ])
  })

  it('does not open a teammate from a conversation outside the main view', async () => {
    const b = await bench()
    b.select('other-session' as SessionId)
    b.actions().openTeammate(SESSION, CHILD)
    expect(b.navigation).toEqual([])
  })

  it('re-registers after the conversation header slot is collapsed and declared again', async () => {
    const b = await bench()
    expect(b.entry()).toBeDefined()
    b.collapseHeader()
    expect(b.entry()).toBeUndefined()
    b.ctx.slots.register({
      name: 'root',
      children: { 'conversation.session.header.actions': { kind: 'list', scope: 'session' } },
    } as never, () => null)
    await Promise.resolve()
    expect(b.entry()).toBeDefined()
  })

  it('keeps the node half inert', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })
})
