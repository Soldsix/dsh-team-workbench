/** Team selection and parent ordering shared by conversation presentations. */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SubagentCatalogEntry } from '@deepseek-ai/dsh-subagent/client'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ModelSelection, ModelSelectionProjection } from '@deepseek-ai/dsh-api-session-controller/types'
import type { TeamMemberProjection, TeamProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { TeamKey } from './locales.ts'

/** A displayed roster row; legacy rows retain their original Session lifecycle. */
export type DisplayMember = TeamMemberProjection & { readonly legacyMode?: 'one-shot' | 'continuable' | 'unknown' }

/**
 * Localized label key for an explicitly assigned Team responsibility.
 * @param member - Persisted Team member with an optional responsibility.
 * @returns the displayed function or retained-member label key.
 */
export function memberFunctionKey(member: TeamMemberProjection): TeamKey {
  switch (member.teamFunction) {
    case 'planning_adviser': return 'view.function.planningAdviser' as const
    case 'quality_adviser': return 'view.function.qualityAdviser' as const
    case 'domain_adviser': return 'view.function.domainAdviser' as const
    case 'group_lead': return 'view.function.groupLead' as const
    case 'executor': return 'view.function.executor' as const
    case 'verifier': return 'view.function.verifier' as const
    default: return member.expert === undefined ? 'view.longTermMember' as const : 'view.boundExpert' as const
  }
}

/** Team state with separately identified original-mode descendants for browsing. */
export type DisplayTeam = Omit<TeamProjection, 'members'> & { readonly members: DisplayMember[] }

const displayed = new WeakMap<TeamProjection, { catalogs: readonly (readonly SubagentCatalogEntry[] | undefined)[]; value: DisplayTeam }>()

function withLegacyMembers(state: SessionListState, team: TeamProjection): DisplayTeam {
  const catalogs: (readonly SubagentCatalogEntry[] | undefined)[] = []
  const members: DisplayMember[] = [...team.members]
  const seen = new Set(members.map(member => member.id))
  for (const parent of members) {
    const children = state.projectionsBySession[parent.id]?.values.subagentCatalog
    catalogs.push(children)
    for (const child of children ?? []) {
      if (child.mode === 'external') continue
      if (seen.has(child.id)) continue
      seen.add(child.id)
      members.push({ id: child.id, name: child.label ?? child.id, parentId: parent.id,
        role: 'teammate', phase: 'active', legacyMode: child.mode })
    }
  }
  const cached = displayed.get(team)
  if (cached !== undefined && cached.catalogs.length === catalogs.length
    && catalogs.every((value, index) => value === cached.catalogs[index])) return cached.value
  const result = members.length === team.members.length ? team : { ...team, members }
  displayed.set(team, { catalogs, value: result })
  return result
}

/** Displayed model settings for one member, with any distinct upcoming choice. */
export interface MemberModelDisplay {
  readonly model?: string
  readonly reasoningEffort?: string
  readonly source: 'recorded' | 'next' | 'bound'
  readonly next?: ModelSelection
}

/**
 * Show a Team route override as the next request; otherwise keep the last request distinct from a later Session selection.
 * @param member - Creation-time member settings.
 * @param selection - Durable Session model selection, when loaded.
 * @returns settings to display and search in the Team roster.
 */
export function memberModelDisplay(member: TeamMemberProjection, selection?: ModelSelectionProjection): MemberModelDisplay {
  if (member.modelRouteRevision !== undefined) {
    const recorded = selection?.lastUsed
    const upcoming = member.modelProvider === undefined || member.model === undefined ? undefined
      : { provider: member.modelProvider, model: member.model,
        ...member.reasoningEffort === undefined ? {} : { reasoningEffort: member.reasoningEffort } }
    return {
      ...recorded?.model === undefined ? member.model === undefined ? {} : { model: member.model } : { model: recorded.model },
      ...(recorded ?? member).reasoningEffort === undefined ? {} : { reasoningEffort: (recorded ?? member).reasoningEffort },
      source: recorded == null ? 'next' : 'recorded',
      ...recorded == null || upcoming === undefined || recorded.provider === upcoming.provider
        && recorded.model === upcoming.model && recorded.reasoningEffort === upcoming.reasoningEffort ? {} : { next: upcoming },
    }
  }
  const recorded = selection?.lastUsed ?? null
  const next = selection?.next ?? null
  const primary = recorded ?? next
  const model = primary?.model ?? member.model
  const reasoningEffort = primary === null ? member.reasoningEffort : primary.reasoningEffort
  const upcoming = recorded !== null && next !== null
    && (recorded.provider !== next.provider || recorded.model !== next.model || recorded.reasoningEffort !== next.reasoningEffort)
    ? next : undefined
  return {
    ...model === undefined ? {} : { model },
    ...reasoningEffort === undefined ? {} : { reasoningEffort },
    source: recorded !== null ? 'recorded' : next !== null ? 'next' : 'bound',
    ...upcoming === undefined ? {} : { next: upcoming },
  }
}

/**
 * Find the root Team for a root or addressed descendant conversation.
 * @param state - Current shared Session list snapshot.
 * @param sessionId - Displayed conversation.
 * @param parentId - Direct parent supplied by the Session binding, when present.
 * @returns the root projection, or undefined while unavailable.
 */
export function selectTeam(state: SessionListState, sessionId: SessionId, parentId?: SessionId): DisplayTeam | undefined {
  const projections = Object.entries(state.projectionsBySession)
  let id: SessionId = sessionId
  const seen = new Set<SessionId>()
  let fallback: TeamProjection | undefined
  while (!seen.has(id)) {
    seen.add(id)
    const own: TeamProjection | undefined = state.projectionsBySession[id]?.values.agentTeam
    for (const [, projection] of projections) {
      const team = projection.values.agentTeam
      if (team?.members.some(member => member.id === id && member.role === 'teammate')) return withLegacyMembers(state, team)
    }
    if (own !== undefined) fallback = own
    const catalogParent = projections.find(([, projection]) =>
      projection.values.subagentCatalog?.some(child => child.id === id))?.[0] as SessionId | undefined
    const next: SessionId | undefined = id === sessionId && parentId !== undefined ? parentId : catalogParent
    if (next === undefined) break
    id = next
  }
  return fallback === undefined ? undefined : withLegacyMembers(state, fallback)
}

/**
 * Place descendants after their parent, with advisers before execution siblings.
 * @param members - Durable root roster, including the Lead.
 * @returns each member once with its nesting depth.
 */
export function teamHierarchy(members: readonly DisplayMember[]): { member: DisplayMember; depth: number }[] {
  const lead = members.find(member => member.role === 'lead')
  const children = new Map<SessionId, DisplayMember[]>()
  for (const member of members) {
    const parentId = member.parentId ?? lead?.id
    if (member.role !== 'teammate' || parentId === undefined) continue
    const siblings = children.get(parentId) ?? []
    siblings.push(member)
    children.set(parentId, siblings)
  }
  const rank = (member: DisplayMember): number => member.legacyMode !== undefined ? 7
    : member.teamFunction === 'planning_adviser' ? 0 : member.teamFunction === 'quality_adviser' ? 1
      : member.teamFunction === 'domain_adviser' ? 2 : member.teamFunction === 'group_lead' ? 3
        : member.teamFunction === 'verifier' ? 5 : 4
  for (const siblings of children.values()) siblings.sort((left, right) => rank(left) - rank(right))
  const result: { member: DisplayMember; depth: number }[] = []
  const seen = new Set<SessionId>()
  const visit = (member: DisplayMember, depth: number): void => {
    if (seen.has(member.id)) return
    seen.add(member.id)
    result.push({ member, depth })
    for (const child of children.get(member.id) ?? []) visit(child, depth + 1)
  }
  if (lead !== undefined) visit(lead, 0)
  for (const member of members) if (!seen.has(member.id)) visit(member, 0)
  return result
}

/** One Lead child and its descendants, with tasks owned anywhere in that branch. */
export interface TeamWorkGroup {
  readonly id: string
  readonly leader?: DisplayMember
  readonly members: readonly DisplayMember[]
  readonly tasks: readonly TeamTaskView[]
}

/**
 * Group current work by the first roster member below the Lead.
 * Lead-owned or unassigned work stays in a separate group.
 * @param members - Displayed roster, including original-mode descendants.
 * @param tasks - Current shared tasks.
 * @returns groups in roster order, followed by unassigned work when present.
 */
export function teamWorkGroups(members: readonly DisplayMember[], tasks: readonly TeamTaskView[]): TeamWorkGroup[] {
  const lead = members.find(member => member.role === 'lead')
  const byId = new Map<string, DisplayMember>(members.map(member => [member.id, member]))
  const byName = new Map(members.map(member => [member.name, member]))
  const groupId = (member: DisplayMember): string => {
    if (member === lead) return 'lead'
    let current = member
    const seen = new Set<SessionId>()
    while (current.parentId !== undefined && current.parentId !== lead?.id && !seen.has(current.id)) {
      seen.add(current.id)
      const parent = byId.get(current.parentId)
      if (parent === undefined) break
      current = parent
    }
    return current.id
  }
  const groups = new Map<string, { leader: DisplayMember | undefined; members: DisplayMember[]; tasks: TeamTaskView[] }>()
  for (const member of members) {
    const id = groupId(member)
    const group = groups.get(id) ?? { leader: id === 'lead' ? undefined : byId.get(id), members: [], tasks: [] }
    group.members.push(member)
    groups.set(id, group)
  }
  for (const task of tasks) {
    const owner = task.ownerName === undefined ? undefined : byName.get(task.ownerName)
    const id = owner === undefined ? 'unassigned' : groupId(owner)
    const group = groups.get(id) ?? { leader: undefined, members: [], tasks: [] }
    group.tasks.push(task)
    groups.set(id, group)
  }
  return [...groups].filter(([, group]) => group.tasks.length > 0 || group.leader !== undefined)
    .map(([id, group]) => ({ id, ...group.leader === undefined ? {} : { leader: group.leader },
      members: group.members, tasks: group.tasks }))
}

/** Classify roster sections without changing parent/descendant order. */
export function memberSection(member: DisplayMember): 'coordination' | 'experts' | 'execution' | 'legacy' {
  if (member.legacyMode !== undefined) return 'legacy'
  if (member.role === 'lead' || member.teamFunction?.endsWith('_adviser')) return 'coordination'
  return member.expert === undefined ? 'execution' : 'experts'
}

/** Missing transport and summary data stays unknown instead of inventing an idle state. */
export function memberActivity(member: DisplayMember, running: boolean | undefined, summary: boolean | undefined, pending: boolean):
  'running' | 'inactive' | 'unknown' | 'needsInput' | 'failed' | 'provisioning' | 'retired' {
  if (member.phase !== 'active') return member.phase
  if (pending) return 'needsInput'
  const value = running ?? summary
  return value === undefined ? 'unknown' : value ? 'running' : 'inactive'
}
