/** Source-safe Agent Teams browser registration. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
export type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
export type {} from '@deepseek-ai/dsh-client-locale/client'
export type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
export type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { TeamAction, type TeamActionInjected } from './TeamAction.tsx'
import { en, NS, zh, type TeamKey } from './locales.ts'
import { createTeamRoleOperations } from './role-settings.ts'
import { createTeamExpertOperations } from './expert-catalog.ts'
import { createTeamGoalOperations } from './goal-operations.ts'
import { createTeamMailboxOperations } from './mailbox-operations.ts'
import { createTeamMemberOperations } from './member-operations.ts'
import { createTeamTaskOperations } from './task-operations.ts'
import { TeamView } from './TeamView.tsx'
import { selectTeam } from './team-view-data.ts'
import { createTeamProjectionRecovery } from './projection-recovery-store.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Agent Teams roster and task-board copy. */
    'agent-team': TeamKey
  }
}

/** Required browser services for navigation, slots, and localized copy. */
export const inject = ['sessions', 'uiWorkspace', 'slots', 'locale', 'remote', 'remote.settings', 'remote.session', 'remote.teamExperts', 'remote.agentTeams']

/**
 * Register Team dictionaries, the header action, and the conversation view.
 * Both views read the Lead Session's `agentTeam` projection from the shared
 * Session store and request a missing cold baseline when opened.
 * @param ctx - Client Context carrying the injected navigation, locale, slot, and Session services.
 */
export function registerAgentTeamUi(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'client-ui-agent-team: dictionaries')
  const t = ctx.locale.bind(NS)
  // The Team Remote imports Host Session types; this browser service uses the Client Session face.
  const sessions = (ctx as ClientContext & { sessions: ISessions }).sessions
  const leadSessionId = (sessionId: SessionId): SessionId => {
    const state = sessions.list.getSnapshot()
    const team = selectTeam(state, sessionId, sessions.subagentAddress(sessionId)?.parentSessionId)
    const knownLead = team?.members.find(member => member.role === 'lead')?.id
    if (knownLead !== undefined) return knownLead
    let current = sessionId
    const seen = new Set<SessionId>()
    while (!seen.has(current)) {
      seen.add(current)
      const parent = sessions.subagentAddress(current)?.parentSessionId
      if (parent === undefined) break
      current = parent
    }
    return current
  }

  const recovery = createTeamProjectionRecovery(leadSessionId, async (sessionId, signal) => {
    const result = await ctx.remote.session.projections({ sessionId }, signal)
    if (!result.ok) throw new Error(result.error.message)
    return result.value?.values.agentTeam
  })
  ctx.effect(() => () => { recovery.dispose() }, 'teamUI.projectionRecovery')
  const actions: TeamActionInjected = {
    useRecoveredTeam: recovery.useRecoveredTeam,
    async refreshTeam(sessionId: SessionId, force = false): Promise<void> {
      await sessions.refreshProjections(leadSessionId(sessionId))
      if (force || selectTeam(sessions.list.getSnapshot(), sessionId, sessions.subagentAddress(sessionId)?.parentSessionId) === undefined) {
        await recovery.refresh(sessionId)
      }
    },
    roles: createTeamRoleOperations(ctx),
    experts: createTeamExpertOperations(ctx),
    goals: createTeamGoalOperations(ctx, leadSessionId),
    mailbox: createTeamMailboxOperations(ctx, leadSessionId),
    members: createTeamMemberOperations(ctx, leadSessionId),
    taskArchive: createTeamTaskOperations(ctx, leadSessionId),
    openTeammate(sessionId: SessionId, childSessionId: SessionId): void {
      const parentSessionId = leadSessionId(sessionId)
      if ((sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView ?? 0) === 0) return
      if (childSessionId === parentSessionId) {
        ctx.uiWorkspace.openSession(parentSessionId)
        return
      }
      ctx.uiWorkspace.openSession({
        parentSessionId: sessions.list.getSnapshot().projectionsBySession[parentSessionId]?.values.agentTeam
          ?.members.find(member => member.id === childSessionId)?.parentId ?? parentSessionId,
        childSessionId,
        ...sessions.subagentAddress(childSessionId) ?? { mode: 'continuable' as const },
      })
    },
  }

  ctx.slots.inject(
    'conversation.session.header.actions',
    () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'agent-team',
      order: -20,
      locale: NS,
      inject: () => actions,
    }, TeamAction),
  )
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'agent-team',
    order: 5,
    locale: NS,
    label: () => t('view.title'),
    inject: () => actions,
  }, TeamView))
}
