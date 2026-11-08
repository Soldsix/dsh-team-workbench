// @vitest-environment jsdom

import { Profiler } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamExpertId, TeamProjection, TeamTaskId } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { SessionListState, SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { TeamView, type TeamViewProps } from '../src/client/TeamView.tsx'
import { CurrentTeamRoles } from '../src/client/CurrentTeamRoles.tsx'
import { memberModelDisplay, selectTeam, teamHierarchy, teamWorkGroups } from '../src/client/team-view-data.ts'
import { zh } from '../src/client/locales.ts'
import { diagnosticSnapshot } from '../src/client/TeamDiagnostics.tsx'

const ROOT = 'root' as SessionId
const CHILD = 'child' as SessionId
const GRANDCHILD = 'grandchild' as SessionId

declare module '@deepseek-ai/dsh-client-ui-session/client' {
  interface SessionPendingInteractionMap {
    'agent-team-test': { readonly key: string; readonly kind: 'agent-team-test'; readonly sessionId: SessionId }
    'agent-team-review-test': { readonly key: string; readonly kind: 'plan-review'; readonly sessionId: SessionId }
  }
}
const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
const team: TeamProjection = {
  members: [
    { id: ROOT, name: 'lead', role: 'lead', phase: 'active' },
    { id: CHILD, name: 'reviewer', parentId: ROOT, role: 'teammate', phase: 'active', model: 'configured-model', reasoningEffort: 'high',
      persona: 'Retain the confirmed scope.', expert: { id: 'expert' as TeamExpertId, revision: 3, name: '证据复核' } },
    { id: GRANDCHILD, name: 'validator', parentId: CHILD, role: 'teammate', phase: 'provisioning', model: 'other-model' },
  ],
  completedTaskCount: 1,
  tasks: [
    { id: 'task-1' as TeamTaskId, revision: 1, subject: '核对 SDK 行为', description: 'Read the supplied fixture.',
      validity: { reusable: false, reasons: ['Legacy task'] },
      status: 'in_progress', ownerName: 'reviewer', ready: false, blockedBy: [], writeScopes: [], writeScopeWarnings: [] },
  ],
  brief: { revision: 1, objective: '完成 SDK 集成与验证', authorization: '仅用户提供的本地样本', decisions: '复用已验证结果' },
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  if (scrollIntoViewDescriptor === undefined) Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  else Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollIntoViewDescriptor)
})

function bench(value: TeamProjection | null = team, sessionId = ROOT, parentId?: SessionId) {
  const sessions = createSnapshotStore<SessionListState>({
    ids: [], byId: {}, phase: 'ready',
    projectionsBySession: value === null ? {} : { [ROOT]: { state: 'ready', error: null, values: { agentTeam: value } } },
  })
  const statuses = createSnapshotStore<SessionStatusSnapshot>(new Map())
  const session = createSnapshotStore<SessionSnapshot>({
    sessionId, pendingSubmissions: [], running: false,
    subagent: parentId === undefined ? null : { address: { parentSessionId: parentId, childSessionId: sessionId, mode: 'continuable' } },
    removed: false, openState: 'open', openError: null, hasMore: false, loadingOlder: false, promptError: null,
    blank: false, lastAgentError: null, promptAttempted: false, awaitingFirstTurn: false,
  })
  const openTeammate = vi.fn()
  const refreshTeam = vi.fn().mockResolvedValue(undefined)
  const openView = vi.fn()
  const props = {
    sessionId, useSessions: bindSnapshotSelector(sessions), useSession: bindSnapshotSelector(session),
    useSessionStatus: bindSnapshotSelector(statuses), openTeammate, refreshTeam, openView, t: makeTranslate(zh, commonZh),
  } as TeamViewProps
  return { props, sessions, statuses, openTeammate, refreshTeam, openView }
}

describe('native Team view', () => {
  it('exports diagnostic identifiers without user prose, paths, persona bodies or connections', () => {
    const privateTeam = { ...team, members: team.members.map(member => ({ ...member,
      persona: 'PRIVATE_PERSONA_SENTINEL', description: 'PRIVATE_DESCRIPTION_SENTINEL', modelProvider: 'PRIVATE_PROVIDER_SENTINEL' })) }
    const result = diagnosticSnapshot(privateTeam, 123)
    const encoded = JSON.stringify(result)
    expect(result).toMatchObject({ format: 'dsh-team-diagnostics', exportedAt: 123, completed: 1,
      limits: { externalConfinementVerified: false, providerCostKnown: false } })
    expect(encoded).not.toContain('PRIVATE_')
    expect(encoded).not.toContain('Read the supplied fixture')
    expect(encoded).not.toContain('Retain the confirmed scope')
    expect(result.members[1]?.id).toBe(CHILD)
  })
  it('labels unknown member status without claiming that it is idle', () => {
    const { props } = bench()
    render(<TeamView {...props} />)
    const summary = screen.getByRole('region', { name: zh['view.summary'] })
    expect(within(summary).getByText(zh['memberStatus.unknown'])).toBeDefined()
    expect(within(screen.getByRole('button', { name: '证据复核' })).getByText(zh['memberStatus.unknown'])).toBeDefined()
  })
  it('filters and pages 500 real task views while retaining selected task details', () => {
    const tasks = Array.from({ length: 500 }, (_, index) => ({ ...team.tasks[0]!, id: `task-${index}` as TeamTaskId,
      subject: `Fixture ${index}`, status: index % 2 === 0 ? 'pending' as const : 'in_progress' as const }))
    const { props } = bench({ ...team, tasks })
    render(<TeamView {...props} />)
    const board = screen.getByRole('region', { name: zh['view.groupTasks'] })
    expect(within(board).getAllByRole('button', { pressed: false })).toHaveLength(50)
    fireEvent.click(within(board).getByRole('button', { name: zh['view.showMore'] }))
    expect(within(board).getAllByRole('button', { pressed: false })).toHaveLength(100)
    fireEvent.change(screen.getByRole('searchbox', { name: zh['view.taskSearch'] }), { target: { value: 'Fixture 499' } })
    fireEvent.click(within(board).getByRole('button', { name: /Fixture 499/u }))
    expect(screen.getByRole('region', { name: zh['view.taskDetail'] }).textContent).toContain('Fixture 499')
    fireEvent.change(screen.getByRole('combobox', { name: zh['view.taskFilter'] }), { target: { value: 'pending' } })
    expect(within(board).getByText(zh['view.noMatches'])).toBeDefined()
  })
  it('renders a fresh plugin projection when the catalog is already ready without a Team', () => {
    const b = bench(null)
    render(<TeamView {...b.props} useRecoveredTeam={() => team} />)
    expect(screen.getByRole('button', { name: /reviewer/u })).toBeDefined()
    expect(screen.getByRole('region', { name: zh['view.summary'] })).toBeDefined()
    expect(b.refreshTeam).not.toHaveBeenCalled()
  })
  it('keeps completed work discoverable when the active task board is empty', () => {
    const b = bench({ ...team, tasks: [] })
    render(<TeamView {...b.props} />)
    expect(screen.getByText(zh['view.noActiveTasks'])).toBeDefined()
    expect(screen.getByText('已完成 1 项任务，成果与验收记录保存在归档中')).toBeDefined()
  })
  it('reveals a native goal review in Chat when the Lead is awaiting confirmation', () => {
    const { props, statuses, openView } = bench()
    render(<TeamView {...props} />)
    act(() => { statuses.set(new Map([[ROOT, {
      running: true, completionUnread: false,
      pendingInteraction: { key: 'review:1', kind: 'plan-review', sessionId: ROOT },
    }]])) })
    expect(openView).toHaveBeenCalledWith('chat', '')
  })
  it('shows a saved Team route as the next request over older Session model history', () => {
    expect(memberModelDisplay({ ...team.members[1]!, modelProvider: 'next-provider', model: 'next-model',
      reasoningEffort: 'max', modelRouteRevision: 1 }, {
      lastUsed: { provider: 'old-provider', model: 'old-model', reasoningEffort: 'low' }, next: null,
    })).toEqual({ model: 'old-model', reasoningEffort: 'low', source: 'recorded',
      next: { provider: 'next-provider', model: 'next-model', reasoningEffort: 'max' } })
  })
  it('loads a missing cold Team and allows a fresh retry', async () => {
    const b = bench(null)
    render(<TeamView {...b.props} />)
    expect(b.refreshTeam).toHaveBeenCalledWith(ROOT)
    fireEvent.click(await screen.findByRole('button', { name: zh['recovery.retry'] }))
    expect(b.refreshTeam).toHaveBeenCalledWith(ROOT, true)
    act(() => { b.sessions.set({ ...b.sessions.getSnapshot(), projectionsBySession: {
      [ROOT]: { state: 'ready', error: null, values: { agentTeam: team } },
    } }) })
    expect(screen.getByRole('button', { name: /reviewer/u })).toBeDefined()
  })
  it('shows actual member routes in the current Team before any role template is configured', () => {
    const b = bench()
    render(<CurrentTeamRoles members={team.members} useSessions={b.props.useSessions} t={b.props.t} />)
    const current = screen.getByRole('region', { name: zh['roles.currentTeam'] })
    expect(within(current).getByText('configured-model')).toBeDefined()
    act(() => { b.sessions.update((draft) => { draft.projectionsBySession = { ...draft.projectionsBySession, [CHILD]: {
      state: 'ready', error: null, values: { modelSelection: {
        lastUsed: { provider: 'p', model: 'actual-model', reasoningEffort: 'max' }, next: null,
      } },
    } } }) })
    expect(within(current).getByText('actual-model')).toBeDefined()
    expect(within(current).getByText('max')).toBeDefined()
    expect(within(current).queryByText('configured-model')).toBeNull()
  })

  it('shows the complete pending member plan beside actual routes', () => {
    const b = bench()
    const plan = '规划军师：GLM-5.3 / max\n复核军师：Grok 4.6 / xhigh\n执行成员：按任务分配'
    render(<CurrentTeamRoles members={team.members} plannedTeam={plan} useSessions={b.props.useSessions} t={b.props.t} />)
    const current = screen.getByRole('region', { name: zh['roles.currentTeam'] })
    expect(within(current).getByText(zh['roles.plannedTeam'])).toBeDefined()
    expect(within(current).getByText(/规划军师：GLM-5\.3/).textContent).toBe(plan)
    expect(within(current).getByText('configured-model')).toBeDefined()
  })

  it('opens a pending plan from Roles and Models before members start', () => {
    const plan = '规划军师：GLM-5.3 / max\n复核军师：Grok 4.6 / xhigh'
    const b = bench({ ...team, members: team.members.slice(0, 1), tasks: [], goalProposal: {
      revision: 1, baseRevision: 0, proposedBy: ROOT,
      change: { kind: 'replace', definition: { objective: '核对 SDK', acceptanceCriteria: ['记录证据'], plan,
        scope: { coverage: 'task', targets: ['本地样本'], allowedActions: ['读取'], excludedTargets: [], constraints: [] } } },
    } })
    render(<TeamView {...b.props} roles={{
      loadRoles: async () => ({ revision: 0, profiles: {}, catalog: {
        default: { provider: 'first', model: 'reasoner' }, routableProviders: [], failures: [], groups: [],
      } }),
      saveRoles: async () => 1,
    }} />)
    fireEvent.click(screen.getByRole('button', { name: zh['view.settings'] }))
    const current = screen.getByRole('region', { name: zh['roles.currentTeam'] })
    expect(within(current).getByText(/规划军师：GLM-5\.3/).textContent).toBe(plan)
  })

  it('keeps descendant tasks in their Lead-child group and separates unassigned work', () => {
    const { ownerName: _ownerName, ...unassigned } = team.tasks[0]!
    const groups = teamWorkGroups(team.members, [
      team.tasks[0]!,
      { ...team.tasks[0]!, id: 'task-2' as TeamTaskId, ownerName: 'validator' },
      { ...unassigned, id: 'task-3' as TeamTaskId },
    ])
    expect(groups.map(group => [group.id, group.tasks.map(task => task.id)])).toEqual([
      ['child', ['task-1', 'task-2']], ['unassigned', ['task-3']],
    ])
    expect(groups[0]?.members.map(member => member.name)).toEqual(['reviewer', 'validator'])
  })
  it('keeps same-subject tasks separate and labels unknown owner activity', () => {
    const b = bench({ ...team, tasks: [team.tasks[0]!, { ...team.tasks[0]!, id: 'task-2' as TeamTaskId }] })
    render(<TeamView {...b.props} />)
    fireEvent.click(screen.getByRole('tab', { name: zh['view.tasks'] }))
    expect(screen.getAllByText(zh['work.duplicateSubject'])).toHaveLength(2)
    expect(screen.getAllByText(zh['work.ownerUnknown'])).toHaveLength(2)
    const summaries = screen.getAllByText(/核对 SDK 行为/u)
    expect(summaries.map(node => node.parentElement?.textContent)).toEqual([
      expect.stringContaining('task-1'), expect.stringContaining('task-2'),
    ])
  })
  it('shows original-mode children once, opens their history, and omits Team-only lifecycle controls', () => {
    const b = bench()
    const oldId = 'old-workflow' as SessionId
    const original = b.sessions.getSnapshot()
    b.sessions.set({ ...original, projectionsBySession: {
      ...original.projectionsBySession,
      [ROOT]: { state: 'ready', error: null, values: { agentTeam: team,
        subagentCatalog: [{ id: CHILD, createdAt: 1, mode: 'continuable', label: 'duplicate' },
          { id: oldId, createdAt: 2, mode: 'one-shot', label: '原工作流复核' }] } },
    } })
    const state = b.sessions.getSnapshot()
    expect(selectTeam(state, ROOT)).toBe(selectTeam(state, ROOT))
    expect(selectTeam(state, oldId, ROOT)?.members).toHaveLength(4)
    const members = { retire: vi.fn(), reactivate: vi.fn(), workspace: vi.fn(), integrate: vi.fn(),
      models: vi.fn(), configureRole: vi.fn().mockResolvedValue({}), configureModel: vi.fn() }
    render(<TeamView {...b.props} members={members} />)
    fireEvent.click(screen.getByRole('button', { name: '原工作流复核' }))
    expect(screen.getAllByText(zh['view.legacy.one-shot']).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: zh.open }))
    expect(b.openTeammate).toHaveBeenCalledWith(ROOT, oldId)
    expect(members.workspace).not.toHaveBeenCalled()
    expect(team.members).toHaveLength(3)
  })
  it('opens the Chinese mailbox tab and fetches its bounded first page only when selected', async () => {
    const b = bench()
    const mailbox = {
      list: vi.fn().mockResolvedValue({ total: 0, items: [] }),
      get: vi.fn(), retry: vi.fn(), adopt: vi.fn(),
    }
    render(<TeamView {...b.props} mailbox={mailbox} />)
    expect(mailbox.list).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: zh['view.mailbox'] }))
    await screen.findByText(zh['mailbox.empty'])
    expect(mailbox.list).toHaveBeenCalledWith(ROOT, 0, 20)
  })

  it('keeps working notes out of the confirmed goal header and retains goal drafts across Team tabs', () => {
    const b = bench()
    const goals = { propose: vi.fn(), review: vi.fn() }
    render(<TeamView {...b.props} goals={goals} />)
    expect(screen.queryByText(team.brief!.objective)).toBeNull()
    expect(screen.getByText(zh['goals.empty'])).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: zh['view.scope'] }))
    fireEvent.click(screen.getByRole('button', { name: zh['goals.create'] }))
    fireEvent.change(screen.getByRole('textbox', { name: zh['goals.objective'] }), { target: { value: 'Retained goal draft' } })
    fireEvent.click(screen.getByRole('tab', { name: zh['view.members'] }))
    expect(screen.queryByRole('textbox', { name: zh['goals.objective'] })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: zh['view.goals'] }))
    expect(screen.getByDisplayValue('Retained goal draft')).toBeDefined()
    expect(goals.propose).not.toHaveBeenCalled()
    expect(goals.review).not.toHaveBeenCalled()
  })

  it('retains expert drafts while switching between native Team tabs', async () => {
    const b = bench()
    const load = vi.fn().mockResolvedValue({
      profiles: [], models: { default: { provider: 'test', model: 'test' }, groups: [], failures: [], routableProviders: [] },
    })
    render(<TeamView {...b.props} experts={{ load, save: vi.fn() }} />)
    expect(load).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: zh['view.experts'] }))
    await screen.findByText(zh['experts.empty'])
    fireEvent.click(screen.getByRole('button', { name: zh['experts.add'] }))
    fireEvent.change(screen.getByLabelText(zh['experts.name']), { target: { value: '保留草稿' } })
    fireEvent.click(screen.getByRole('tab', { name: zh['view.members'] }))
    expect(screen.queryByRole('textbox', { name: zh['experts.name'] })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: zh['view.experts'] }))
    expect(screen.getByDisplayValue('保留草稿')).toBeDefined()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('shows configured members, their current work, and retained role details', () => {
    const b = bench()
    render(<TeamView {...b.props} />)
    expect(screen.getByRole('heading', { name: '团队', level: 1 })).toBeTruthy()
    expect(screen.getByText('configured-model')).toBeTruthy()
    expect(screen.getByText('high')).toBeTruthy()
    expect(screen.getByText('核对 SDK 行为')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '证据复核' }))
    const detail = screen.getByRole('region', { name: '成员详情' })
    expect(within(detail).getByText('绑定的专家档案版本：3')).toBeTruthy()
    expect(within(detail).getByText('Retain the confirmed scope.')).toBeTruthy()
    fireEvent.click(within(detail).getByRole('button', { name: '打开成员会话' }))
    expect(b.openTeammate).toHaveBeenCalledWith(ROOT, CHILD)
    expect(b.openView).toHaveBeenCalledWith('chat', '')
    expect(screen.getByText('已完成任务 1')).toBeTruthy()
  })

  it('shows automatic assignment and exact skill requirements on a task', () => {
    const b = bench({ ...team, tasks: [{ ...team.tasks[0]!, autoAssign: true,
      requiredSkill: 'team-crawler-discovery', reviewerName: 'validator' }] })
    render(<TeamView {...b.props} />)
    fireEvent.click(screen.getByRole('button', { name: /核对 SDK 行为/u }))
    const detail = screen.getByRole('region', { name: zh['view.taskDetail'] })
    expect(within(detail).getByText(zh['view.autoAssign'])).toBeDefined()
    expect(within(detail).getByText(zh['view.enabled'])).toBeDefined()
    expect(within(detail).getByText('team-crawler-discovery')).toBeDefined()
    expect(within(detail).getByText('validator')).toBeDefined()
  })

  it('marks old work notes as historical while preserving their text', () => {
    const b = bench({ ...team, goal: { revision: 2, proposalRevision: 2, decidedAt: 1, status: 'active', definition: {
      objective: 'New goal', acceptanceCriteria: ['Verify new work'], scope: {
        coverage: 'task', targets: ['fixture'], allowedActions: ['read'], excludedTargets: [], constraints: [],
      },
    } }, brief: { ...team.brief!, goalRevision: 1 } })
    render(<TeamView {...b.props} />)
    fireEvent.click(screen.getByRole('tab', { name: zh['view.memory'] }))
    expect(screen.getByText(zh['memory.historical'])).toBeDefined()
    expect(screen.getByText(team.brief!.objective)).toBeDefined()
  })

  it('clears an archive reuse check when the confirmed goal changes', async () => {
    const b = bench()
    const completed = { ...team.tasks[0]!, id: 'archived' as TeamTaskId, subject: '归档成果', status: 'completed' as const }
    const archive = { archive: vi.fn().mockResolvedValue({ tasks: [completed] }),
      validateReuse: vi.fn().mockResolvedValue({ taskId: completed.id, revision: completed.revision, checkedAt: 1,
        validity: { reusable: true, reasons: [] }, inputs: [], artifacts: [] }) }
    render(<TeamView {...b.props} taskArchive={archive} />)
    fireEvent.click(screen.getByRole('tab', { name: zh['view.tasks'] }))
    fireEvent.click(screen.getByRole('button', { name: zh['archive.title'] }))
    const title = await screen.findByText('归档成果')
    fireEvent.click(title)
    fireEvent.click(title.closest('details')!.querySelector('button')!)
    await screen.findByText(zh['archive.reusable'])
    act(() => {
      const current = b.sessions.getSnapshot()
      b.sessions.set({ ...current, projectionsBySession: { [ROOT]: { state: 'ready', error: null, values: { agentTeam: {
        ...team, goal: { revision: 1, proposalRevision: 1, decidedAt: 1, status: 'active', definition: {
          objective: 'Changed goal', acceptanceCriteria: ['Check new work'],
          scope: { coverage: 'task', targets: ['fixture'], allowedActions: ['read'], excludedTargets: [], constraints: [] },
        } },
      } } } } })
    })
    expect(screen.queryByText(zh['archive.reusable'])).toBeNull()
    expect(screen.getByRole('button', { name: zh['archive.title'] }).getAttribute('aria-expanded')).toBe('false')
  })

  it('opens the displayed member conversation and returns to chat without creating a session', () => {
    const b = bench()
    render(<TeamView {...b.props} />)
    fireEvent.click(screen.getByRole('button', { name: 'lead' }))
    fireEvent.click(screen.getByRole('button', { name: '打开成员会话' }))
    expect(b.openView).toHaveBeenCalledWith('chat', '')
    expect(b.openTeammate).not.toHaveBeenCalled()
  })

  it('keeps skills specific to the selected member and reflects stale or cleared choices live', () => {
    const choice = { memberId: CHILD, revision: 1, goalRevision: 2, active: true,
      skills: [{ name: 'team-web-fingerprint', purpose: '核对网页指纹的输入与输出', digest: 'a'.repeat(64), bytes: 2048 }] }
    const leadChoice = { ...choice, memberId: ROOT,
      skills: [{ name: 'team-android-analysis', purpose: '安排安卓样本分析', digest: 'b'.repeat(64), bytes: 3072 }] }
    const b = bench({ ...team, skillSelections: [choice, leadChoice] })
    render(<TeamView {...b.props} />)
    fireEvent.click(screen.getByRole('button', { name: '证据复核' }))
    const skills = within(screen.getByRole('region', { name: zh['skills.title'] }))
    expect(skills.getByText(choice.skills[0]!.purpose)).toBeDefined()
    expect(skills.queryByText(leadChoice.skills[0]!.purpose)).toBeNull()
    expect(skills.getByRole('status').textContent).toBe(zh['skills.restore'])
    expect(skills.getByText(zh['skills.versions']).closest('details')?.open).toBe(false)
    expect(skills.getByText('关联目标版本：2')).toBeDefined()

    const replace = (value: typeof choice): void => {
      act(() => {
        const current = b.sessions.getSnapshot()
        b.sessions.set({ ...current, projectionsBySession: { [ROOT]: {
          state: 'ready', error: null, values: { agentTeam: { ...team, skillSelections: [value, leadChoice] } },
        } } })
      })
    }
    replace({ ...choice, active: false })
    expect(skills.getByRole('status').textContent).toBe(zh['skills.stale'])
    expect(skills.getByText(choice.skills[0]!.purpose)).toBeDefined()
    replace({ ...choice, revision: 2, goalRevision: 3, skills: [] })
    expect(skills.getByText(zh['skills.empty'])).toBeDefined()
    expect(skills.queryByText(choice.skills[0]!.purpose)).toBeNull()
    expect(skills.queryByRole('status')).toBeNull()
    expect(skills.getByText('技能选择版本：2')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'lead' }))
    expect(screen.getByText(leadChoice.skills[0]!.purpose)).toBeDefined()
    expect(b.openTeammate).not.toHaveBeenCalled()
    expect(b.openView).not.toHaveBeenCalled()
  })

  it('searches all 32 members and ignores unrelated Session updates', () => {
    const members: TeamProjection['members'] = Array.from({ length: 32 }, (_, index) => ({
      id: `worker-${index}` as SessionId, name: `worker-${index}`, role: 'teammate', phase: 'active', model: `model-${index}`,
    }))
    const b = bench({ members: [{ id: ROOT, name: 'lead', role: 'lead', phase: 'active' }, ...members], tasks: [] })
    let commits = 0
    render(<Profiler id="team-view" onRender={() => { commits += 1 }}><TeamView {...b.props} /></Profiler>)
    expect(within(screen.getByRole('complementary', { name: zh['view.memberTree'] })).getAllByRole('listitem')).toHaveLength(33)
    expect(within(screen.getByRole('region', { name: zh['view.groupTasks'] })).queryByRole('heading', { name: 'worker-0' })).toBeNull()
    const before = commits
    act(() => {
      const current = b.sessions.getSnapshot()
      b.sessions.set({ ...current, projectionsBySession: { ...current.projectionsBySession,
        ['unrelated' as SessionId]: { state: 'ready', error: null, values: { agentTeam: { members: [], tasks: [] } } },
      } })
    })
    expect(commits).toBe(before)
    fireEvent.change(screen.getByRole('searchbox', { name: zh['view.search'] }), { target: { value: 'model-27' } })
    expect(screen.getByRole('button', { name: 'worker-27' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'worker-26' })).toBeNull()
    expect(within(screen.getByRole('complementary', { name: zh['view.memberTree'] })).getAllByRole('listitem')).toHaveLength(1)
    fireEvent.change(screen.getByRole('searchbox', { name: zh['view.search'] }), { target: { value: 'absent-model' } })
    expect(screen.getByText('没有匹配的成员')).toBeTruthy()
  })

  it.each([8, 20, 32])('searches displayed selections across %i members', (count) => {
    const members: TeamProjection['members'] = Array.from({ length: count }, (_, index) => ({
      id: `worker-${index}` as SessionId, name: `worker-${index}`, role: 'teammate', phase: 'active',
      model: `old-model-${index}`, reasoningEffort: 'high',
    }))
    const b = bench({ members: [{ id: ROOT, name: 'lead', role: 'lead', phase: 'active' }, ...members], tasks: [] })
    const target = members[count - 1]!
    b.sessions.update((draft) => { draft.projectionsBySession = { ...draft.projectionsBySession, [target.id]: {
      state: 'ready', error: null, values: { modelSelection: {
        lastUsed: null, next: { provider: 'p', model: 'new-model', reasoningEffort: 'low' },
      } },
    } } })
    render(<TeamView {...b.props} />)
    fireEvent.change(screen.getByRole('searchbox', { name: zh['view.search'] }), { target: { value: 'new-model' } })
    fireEvent.click(screen.getByRole('button', { name: target.name }))
    expect(within(screen.getByRole('region', { name: zh['view.memberDetail'] })).getByRole('heading', { name: target.name })).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox', { name: zh['view.search'] }), { target: { value: `old-model-${count - 1}` } })
    expect(screen.queryByRole('button', { name: target.name })).toBeNull()
    fireEvent.change(screen.getByRole('searchbox', { name: zh['view.search'] }), { target: { value: 'new-model' } })
    expect(screen.getByRole('button', { name: target.name }).getAttribute('aria-expanded')).toBe('true')
  })

  it('distinguishes the last request from the next model and clears an old effort', () => {
    const b = bench()
    b.sessions.update((draft) => { draft.projectionsBySession = { ...draft.projectionsBySession, [CHILD]: {
      state: 'ready', error: null, values: { modelSelection: {
        lastUsed: { provider: 'p', model: 'running-model', reasoningEffort: 'high' },
        next: { provider: 'p', model: 'next-model' },
      } },
    } } })
    render(<TeamView {...b.props} />)
    const row = screen.getByRole('button', { name: '证据复核' }).closest('li')!
    expect(within(row).getByText('running-model')).toBeDefined()
    expect(within(row).getByText(zh['view.nextModel'].replace('{model}', 'next-model'))).toBeDefined()
    expect(within(row).getByText(zh['view.nextEffort'].replace('{effort}', zh['roles.defaultEffort']))).toBeDefined()
    fireEvent.change(screen.getByRole('searchbox', { name: zh['view.search'] }), { target: { value: 'next-model' } })
    expect(screen.getByRole('button', { name: '证据复核' })).toBeTruthy()
  })

  it('does not carry a bound effort into a new selection without one', () => {
    const b = bench()
    b.sessions.update((draft) => { draft.projectionsBySession = { ...draft.projectionsBySession, [CHILD]: {
      state: 'ready', error: null, values: { modelSelection: {
        lastUsed: null, next: { provider: 'p', model: 'plain-model' },
      } },
    } } })
    render(<TeamView {...b.props} />)
    const row = screen.getByRole('button', { name: '证据复核' }).closest('li')!
    expect(within(row).getByText('plain-model')).toBeDefined()
    expect(within(row).getByText(zh['roles.defaultEffort'])).toBeDefined()
    expect(within(row).queryByText('high')).toBeNull()
  })

  it('marks a member waiting for user input and opens its conversation', () => {
    const b = bench()
    act(() => { b.statuses.set(new Map([[CHILD, { running: true, completionUnread: false,
      pendingInteraction: { key: 'pending-question', kind: 'agent-team-test', sessionId: CHILD },
    }]])) })
    render(<TeamView {...b.props} />)
    const row = screen.getByRole('button', { name: '证据复核' }).closest('li')!
    expect(within(row).getByText(zh['memberStatus.needsInput'])).toBeDefined()
    fireEvent.click(within(row).getByRole('button', { name: '证据复核' }))
    fireEvent.click(within(screen.getByRole('region', { name: zh['view.memberDetail'] })).getByRole('button', { name: zh.open }))
    expect(b.openTeammate).toHaveBeenCalledWith(ROOT, CHILD)
    act(() => { b.statuses.set(new Map([[CHILD, { running: true, completionUnread: false, pendingInteraction: undefined }]])) })
    expect(within(row).getByText(zh['memberStatus.running'])).toBeDefined()
  })

  it('switches accessible tabs with the keyboard and displays persisted scope and results', () => {
    const b = bench()
    render(<TeamView {...b.props} />)
    fireEvent.keyDown(screen.getByRole('tab', { name: '成员' }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: '任务' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('核对 SDK 行为')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('tab', { name: '任务' }), { key: 'End' })
    expect(screen.getByRole('tab', { name: zh['view.diagnostics'] }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(screen.getByRole('tab', { name: zh['view.diagnostics'] }), { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: '记忆' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('仅用户提供的本地样本')).toBeTruthy()
    expect(screen.getByText('复用已验证结果')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('tab', { name: '记忆' }), { key: 'Home' })
    expect(screen.getByRole('tab', { name: '成员' }).getAttribute('aria-selected')).toBe('true')
  })

  it('finds the root roster for a grandchild and prevents opening a provisioning member', () => {
    const b = bench(team, GRANDCHILD, CHILD)
    render(<TeamView {...b.props} />)
    expect(screen.getByRole('button', { name: '证据复核' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'validator' }))
    expect(screen.getByRole('button', { name: '打开成员会话' })).toHaveProperty('disabled', true)
    expect(teamHierarchy(team.members).map(value => [value.member.name, value.depth])).toEqual([
      ['lead', 0], ['reviewer', 1], ['validator', 2],
    ])
  })
})
