/** Native conversation Team view for members, tasks, and retained context. */
import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconUserOutlineRegular, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TeamActionInjected } from './TeamAction.tsx'
import { TeamRoles } from './TeamRoles.tsx'
import { CurrentTeamRoles } from './CurrentTeamRoles.tsx'
import { TeamExperts } from './TeamExperts.tsx'
import { TeamGoals } from './TeamGoals.tsx'
import { TeamMailbox } from './TeamMailbox.tsx'
import { MemberSkills } from './MemberSkills.tsx'
import { TaskWorkDetails, duplicateTaskSubjects, taskWorkStateKey, useTaskActivities } from './TaskWork.tsx'
import { TeamMemberControls } from './TeamMemberControls.tsx'
import { TeamTaskArchive } from './TeamTaskArchive.tsx'
import { AdviserFindings } from './AdviserFindings.tsx'
import { TeamDiagnostics } from './TeamDiagnostics.tsx'
import { NS } from './locales.ts'
import { memberActivity, memberSection, memberFunctionKey, memberModelDisplay, selectTeam, teamHierarchy, teamWorkGroups } from './team-view-data.ts'
import { useTeamProjectionRecovery } from './team-projection-recovery.ts'
import type { DisplayMember, DisplayTeam } from './team-view-data.ts'
import css from './TeamView.module.css'

/** Session hooks, native view navigation, and Team operations. */
export type TeamViewProps = PropsRuntime<'conversation.view'> & PropsLocale<typeof NS> & TeamActionInjected

type TeamTab = 'members' | 'tasks' | 'memory' | 'experts' | 'goals' | 'mailbox' | 'diagnostics' | 'settings'
type RowProps = Pick<TeamViewProps, 'useSessions' | 'useSessionStatus' | 't'> & {
  member: DisplayMember
  depth: number
  selected: boolean
  select: () => void
}

function TeamSummary({ members, useSessions, useSessionStatus, t }: Pick<RowProps, 'useSessions' | 'useSessionStatus' | 't'> & {
  members: readonly DisplayMember[]
}) {
  const runtime = useSessionStatus(state => members.map(member => state.get(member.id)?.pendingInteraction !== undefined ? 'input'
    : state.get(member.id)?.running === true ? 'running' : state.get(member.id)?.running === false ? 'idle' : 'unknown').join(','))
  const summaries = useSessions(state => members.map(member => state.byId[member.id]?.running === true ? 'running' : state.byId[member.id]?.running === false ? 'idle' : 'unknown').join(','))
  const actual = runtime.split(',')
  const fallback = summaries.split(',')
  let running = 0, waiting = 0, idle = 0, preparing = 0, failed = 0, unknown = 0
  members.forEach((member, index) => {
    if (member.phase === 'failed') failed++
    else if (member.phase === 'provisioning') preparing++
    else if (member.phase !== 'retired') {
      const status = actual[index] === 'unknown' ? fallback[index] : actual[index]
      if (status === 'input') waiting++
      else if (status === 'running') running++
      else if (status === 'unknown') unknown++
      else idle++
    }
  })
  return <section className={css.summary} aria-label={t('view.summary')}>
    <span><strong>{members.filter(member => member.legacyMode === undefined).length}</strong>{t('view.teamCount')}</span>
    <span><strong>{running}</strong>{t('memberStatus.running')}</span>
    <span><strong>{idle}</strong>{t('memberStatus.inactive')}</span>
    {unknown > 0 && <span><strong>{unknown}</strong>{t('memberStatus.unknown')}</span>}
    {waiting > 0 && <span><strong>{waiting}</strong>{t('memberStatus.needsInput')}</span>}
    {preparing > 0 && <span><strong>{preparing}</strong>{t('memberStatus.provisioning')}</span>}
    {failed > 0 && <span><strong>{failed}</strong>{t('memberStatus.failed')}</span>}
    {members.some(member => member.legacyMode !== undefined) && <span><strong>{members.filter(member => member.legacyMode !== undefined).length}</strong>{t('view.legacyCount')}</span>}
  </section>
}

function MemberRow({ member, depth, selected, select, useSessions, useSessionStatus, t }: RowProps) {
  const selection = useSessions(state => state.projectionsBySession[member.id]?.values.modelSelection)
  const model = memberModelDisplay(member, selection)
  const running = useSessionStatus(state => state.get(member.id)?.running)
  const pendingInteraction = useSessionStatus(state => state.get(member.id)?.pendingInteraction)
  const summaryRunning = useSessions(state => state.byId[member.id]?.running)
  const status = memberActivity(member, running, summaryRunning, pendingInteraction !== undefined)
  return <li className={selected ? `${css.memberItem} ${css.selectedRow}` : css.memberItem}
    style={{ marginInlineStart: `${Math.min(Math.max(depth - 1, 0), 4) * 12}px` }}>
    <button type="button" className={css.memberButton} onClick={select} aria-expanded={selected} aria-label={member.expert?.name ?? member.name}>
      <IconUserOutlineRegular size={17} />
      <span className={css.memberIdentity}><strong>{member.expert?.name ?? member.name}</strong>
        <span className={css.memberBadges}>
          <small>{t(member.role === 'lead' ? 'view.communicator' : memberFunctionKey(member))}</small>
          {member.role !== 'lead' && member.legacyMode === undefined && <small>{t(member.expert === undefined ? 'view.retained' : 'view.expert')}</small>}
        </span>
        {member.role !== 'lead' && member.legacyMode === undefined && <small className={css.roleSummary}>{member.description}</small>}
        <small className={css.model}><span>{model.model ?? t('view.sessionModel')}</span> · <span>{model.reasoningEffort ?? t('roles.defaultEffort')}</span></small>
        {model.next !== undefined && <small className={css.modelNote}><span>{t('view.nextModel', { model: model.next.model })}</span> · <span>{t('view.nextEffort', { effort: model.next.reasoningEffort ?? t('roles.defaultEffort') })}</span></small>}
        {depth > 1 && <small className={css.modelNote}>{t('view.descendant')}</small>}
        {member.legacyMode !== undefined && <small className={css.modelNote}>{t(`view.legacy.${member.legacyMode}`)}</small>}
      </span>
      <span className={css.memberStatus}><StateDot state={status === 'failed' ? 'error' : status === 'inactive' || status === 'retired' || status === 'unknown' ? 'idle' : status === 'needsInput' ? 'warning' : 'ongoing'} />
        <span>{t(`memberStatus.${status}`)}</span></span>
    </button>
  </li>
}

function TaskRow({ task, ownerRunning, currentGoalRevision, duplicate, t }: {
  task: TeamTaskView
  ownerRunning: boolean | undefined
  currentGoalRevision: number | undefined
  duplicate: boolean
  t: TeamViewProps['t']
}) {
  return <details className={css.task}>
    <summary><strong>{task.subject}</strong><span>{task.ownerName ?? t('unowned')} · {task.id}</span><span>{t(taskWorkStateKey(task, ownerRunning, currentGoalRevision) ?? `status.${task.status === 'deleted' ? 'completed' : task.status}`)}</span></summary>
    <div className={css.taskBody}>
      {duplicate && <p className={css.hint}>{t('work.duplicateSubject')}</p>}
      <p>{task.description}</p>
      {task.blockedBy.length > 0 && <p>{t('blockedBy')}: {task.blockedBy.join(', ')}</p>}
      {task.writeScopes.length > 0 && <p>{t('writeScopes')}: {task.writeScopes.join(', ')}</p>}
      {task.result !== undefined && <section><h4>{t(task.validity.reusable ? 'task.result' : 'task.recordedResult')}</h4><p>{task.result}</p></section>}
      {task.evidence !== undefined && task.evidence.length > 0 && <section><h4>{t('task.evidence')}</h4><ul>{task.evidence.map((entry, index) => <li key={index}>{entry}</li>)}</ul></section>}
      <TaskWorkDetails task={task} t={t} />
      {task.writeScopeWarnings.map(warning => <p key={warning} role="status">{warning}</p>)}
    </div>
  </details>
}

/**
 * Show the persistent Team with native tabs and a compact, searchable roster.
 * @param props - Session state hooks, Team navigation, role settings, and localized copy.
 * @returns the Team page without starting model work.
 */
export function TeamView({
  sessionId, useSession, useSessions, useSessionStatus, openTeammate, refreshTeam,
  roles, experts, goals, mailbox, members, taskArchive, openView, t, useRecoveredTeam = () => undefined,
}: TeamViewProps) {
  const [tab, setTab] = useState<TeamTab>('members')
  const [expertsVisited, setExpertsVisited] = useState(false)
  const [goalsVisited, setGoalsVisited] = useState(false)
  const [search, setSearch] = useState('')
  const [taskQuery, setTaskQuery] = useState('')
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [visibleLimit, setVisibleLimit] = useState(50)
  const [compact, setCompact] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const detailsRef = useRef<HTMLElement>(null)
  const tabId = useId()
  const parentId = useSession(snapshot => snapshot.subagent?.address.parentSessionId)
  const opening = useSession(snapshot => snapshot.openState === 'loading')
  const listing = useSessions(state => state.phase === 'pending')
  const recoveredTeam = useRecoveredTeam(sessionId)
  const team: DisplayTeam | undefined = useSessions(state => selectTeam(state, sessionId, parentId)) ?? recoveredTeam
  const pendingGoalReview = useSessionStatus(state => state.get(team?.members.find(member => member.role === 'lead')?.id ?? sessionId)
    ?.pendingInteraction?.kind === 'plan-review')
  const taskActivities = useTaskActivities(team, useSessions, useSessionStatus)
  const duplicateSubjects = duplicateTaskSubjects(team?.tasks ?? [])
  const recovery = useTeamProjectionRecovery(sessionId, true, team === undefined, refreshTeam)
  useEffect(() => {
    if (pendingGoalReview) openView('chat', '')
  }, [pendingGoalReview, openView])
  const rows = useMemo(() => teamHierarchy(team?.members ?? []), [team?.members])
  const workGroups = useMemo(() => teamWorkGroups(team?.members ?? [], team?.tasks ?? []), [team?.members, team?.tasks])
  const visibleTasks = useMemo(() => (team?.tasks ?? []).filter(task => (taskFilter === 'all' || task.status === taskFilter)
    && [task.id, task.subject, task.description, task.ownerName, ...task.writeScopes].some(value => value?.toLocaleLowerCase().includes(taskQuery.trim().toLocaleLowerCase()))), [team?.tasks, taskFilter, taskQuery])
  const displayedTaskIds = new Set(visibleTasks.slice(0, visibleLimit).map(task => task.id))
  const visibleWorkGroups = workGroups.map(group => ({ ...group, tasks: group.tasks.filter(task => displayedTaskIds.has(task.id)) }))
    .filter(group => group.tasks.length > 0)

  const tasksByOwner = useMemo(() => {
    const result = new Map<string, TeamTaskView[]>()
    for (const task of team?.tasks ?? []) {
      if (task.ownerName === undefined) continue
      const owned = result.get(task.ownerName) ?? []
      owned.push(task)
      result.set(task.ownerName, owned)
    }
    return result
  }, [team?.tasks])
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const matchingRows = useSessions(state => rows.map(({ member }) => {
    if (normalizedSearch === '') return '1'
    const model = memberModelDisplay(member, state.projectionsBySession[member.id]?.values.modelSelection)
    return [member.name, member.expert?.name, member.description, model.model, model.reasoningEffort,
      model.next?.model, model.next?.reasoningEffort]
      .some(value => value?.toLocaleLowerCase().includes(normalizedSearch)) ? '1' : '0'
  }).join(''))
  const filtered = rows.filter((_, index) => matchingRows[index] === '1')
  const selected = team?.members.find(member => member.id === selectedId) ?? team?.members.find(member => member.role === 'lead')
  const selectedTask = team?.tasks.find(task => task.id === selectedTaskId)
  const selectedModelSelection = useSessions(state => selected === undefined ? undefined
    : state.projectionsBySession[selected.id]?.values.modelSelection)
  const selectedModel = selected === undefined ? undefined : memberModelDisplay(selected, selectedModelSelection)
  const selectedRunning = useSessionStatus(state => selected === undefined ? undefined : state.get(selected.id)?.running)
  const selectedSummaryRunning = useSessions(state => selected === undefined ? undefined : state.byId[selected.id]?.running)
  const tabIds: Array<Exclude<TeamTab, 'settings'>> = ['members', 'tasks', ...(goals === undefined ? [] : ['goals'] as const),
    'memory', ...(mailbox === undefined ? [] : ['mailbox'] as const), ...(experts === undefined ? [] : ['experts'] as const), 'diagnostics']
  useEffect(() => { setSearch(''); setTaskQuery(''); setTaskFilter('all'); setVisibleLimit(50); setSelectedId(null); setSelectedTaskId(null); setError(null); setTab('members'); setExpertsVisited(false); setGoalsVisited(false) }, [sessionId])
  useEffect(() => {
    if (selectedId === null && selectedTaskId === null) return
    const details = detailsRef.current
    if (details !== null && details.parentElement !== null
      && details.getBoundingClientRect().top > details.parentElement.getBoundingClientRect().top + 4) {
      details.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedId, selectedTaskId])
  const selectTab = (value: TeamTab): void => {
    setTab(value)
    if (value === 'experts') setExpertsVisited(true)
    if (value === 'goals') setGoalsVisited(true)
  }

  return <div className={compact ? `${css.page} ${css.compact}` : css.page} data-team-view data-conversation-composer-overlay>
    <header className={css.header}>
      <div><h1>{t('view.title')}</h1><p>{t('view.subtitle')}</p></div>
      <div className={css.headerActions}>
      {goals !== undefined && <button type="button" className={css.button} onClick={() => { selectTab('goals') }}>{t('view.fullPlan')}</button>}
      <button type="button" className={css.button} onClick={() => { setCompact(!compact) }}>{t(compact ? 'view.comfortable' : 'view.compact')}</button>
      {roles !== undefined && <button type="button" className={css.button} onClick={() => { setTab(tab === 'settings' ? 'members' : 'settings') }}>
        {t(tab === 'settings' ? 'view.backToMembers' : 'view.settings')}
      </button>}</div>
    </header>
    {team !== undefined && <TeamSummary members={team.members} useSessions={useSessions} useSessionStatus={useSessionStatus} t={t} />}
    <div className={css.goal}>
      <span>{t(team?.goal?.status === 'revoked' ? 'goals.revokedShort' : 'view.goal')}</span><p>{team?.goal?.definition.objective ?? t('goals.empty')}</p>
      {goals !== undefined && <button type="button" className={css.textButton} onClick={() => { selectTab('goals') }}>{t('view.scope')}</button>}
    </div>
    {error !== null && <p role="alert" className={css.error}>{error}</p>}
    {team?.failure !== undefined && <p role="alert" className={css.error}>{t('failure', { message: team.failure })}</p>}
    {tab === 'settings' && roles !== undefined ? <div className={css.settings}>
      <CurrentTeamRoles members={team?.members ?? []}
        plannedTeam={team?.goalProposal?.change.kind === 'replace' && team.goalDecision?.proposalRevision !== team.goalProposal.revision
          ? team.goalProposal.change.definition.plan : undefined}
        useSessions={useSessions} t={t} />
      <TeamRoles operations={roles} t={t} />
    </div> : <>
      <div className={css.toolbar}>
        <div role="tablist" aria-label={t('workspace.navigation')} className={css.tabs}>
          {tabIds.map((value, index) => <button type="button" key={value} id={`${tabId}-${value}`} role="tab"
            aria-selected={tab === value} aria-controls={`${tabId}-panel`} tabIndex={tab === value ? 0 : -1}
            onClick={() => { selectTab(value) }} onKeyDown={(event) => {
              const next = event.key === 'ArrowRight' ? (index + 1) % tabIds.length
                : event.key === 'ArrowLeft' ? (index + tabIds.length - 1) % tabIds.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? tabIds.length - 1 : undefined
              if (next === undefined) return
              event.preventDefault()
              const value = tabIds[next]
              if (value === undefined) return
              selectTab(value)
              document.getElementById(`${tabId}-${value}`)?.focus()
            }}>{t(`view.${value}`)}</button>)}
        </div>
        {tab === 'members' && <input className={css.search} type="search" aria-label={t('view.search')} placeholder={t('view.search')}
          value={search} onChange={(event) => { setSearch(event.target.value) }} />}
      </div>
      <section id={tab === 'experts' || tab === 'goals' || tab === 'mailbox' ? undefined : `${tabId}-panel`}
        hidden={tab === 'experts' || tab === 'goals' || tab === 'mailbox'} role="tabpanel" aria-labelledby={`${tabId}-${tab}`} className={css.content}>
        {team === undefined && <div role="status" className={css.empty}>{t(opening || listing || recovery.state === 'loading' ? 'loading' : 'unavailable')}
          {!opening && !listing && recovery.state !== 'loading' && <button type="button" className={css.button} onClick={recovery.retry}>{t('recovery.retry')}</button>}</div>}
        {team !== undefined && tab === 'members' && <>
          <div className={css.overviewGrid}>
            <aside className={css.rosterPane} aria-label={t('view.memberTree')}>
              <h2>{t('roster')} <small>{team.members.length}</small></h2>
              <ul className={css.memberList} data-team-member-list>{filtered.map(({ member, depth }, index) => <Fragment key={member.id}>
                {(index === 0 || memberSection(filtered[index - 1]!.member) !== memberSection(member))
                  && <li role="presentation" className={css.groupLabel}>{t(`view.group.${memberSection(member)}`)}</li>}
                <MemberRow member={member} depth={depth}
                  selected={selectedId === member.id} select={() => { setSelectedId(member.id); setSelectedTaskId(null) }}
                  useSessions={useSessions} useSessionStatus={useSessionStatus} t={t} /></Fragment>)}</ul>
              {filtered.length === 0 && <p className={css.empty}>{t('view.noMatches')}</p>}
              <p className={css.hint}>{t('view.memberCount', { visible: filtered.length, total: team.members.length })}</p>
            </aside>
            <section className={css.boardPane} aria-label={t('view.groupTasks')}>
              <header><h2>{t('view.groupTasks')} <small>{team.tasks.length}</small></h2>
                <span>{t('view.filteredTasks', { visible: Math.min(visibleTasks.length, visibleLimit), total: team.tasks.length })}</span></header>
              <div className={css.boardFilters}>
                <input type="search" className={css.search} aria-label={t('view.taskSearch')} placeholder={t('view.taskSearch')}
                  value={taskQuery} onChange={event => { setTaskQuery(event.target.value); setVisibleLimit(50) }} />
                <select aria-label={t('view.taskFilter')} className={css.filterSelect} value={taskFilter} onChange={event => {
                  const value = event.target.value
                  if (value === 'all' || value === 'pending' || value === 'in_progress' || value === 'completed') { setTaskFilter(value); setVisibleLimit(50) }
                }}>{(['all', 'pending', 'in_progress', 'completed'] as const).map(value => <option key={value} value={value}>{t(`view.filter.${value}`)}</option>)}</select>
              </div>
              {team.tasks.length === 0 && <div className={css.boardEmpty}><p>{t('view.noActiveTasks')}</p>
                <small>{t('view.completedHint', { count: team.completedTaskCount ?? 0 })}</small>
                {taskArchive !== undefined && <button type="button" className={css.button} onClick={() => { selectTab('tasks') }}>{t('view.openArchive')}</button>}
              </div>}
              <div className={css.groupBoard}>{visibleWorkGroups.map(group => <section key={group.id} className={css.groupLane}>
                <header><h3>{group.leader?.expert?.name ?? group.leader?.name
                  ?? t(group.id === 'lead' ? 'workspace.leadGroup' : 'workspace.unassignedGroup')}</h3>
                <small>{t('workspace.groupProgress', { completed: group.tasks.filter(task => task.status === 'completed').length,
                  total: group.tasks.length })}</small></header>
                <div className={css.groupMembers}>{group.members.filter(member => member.role !== 'lead').slice(0, 5).map(member => <button
                  key={member.id} type="button" aria-label={t('view.inspectGroupMember', { name: member.expert?.name ?? member.name })}
                  onClick={() => { setSelectedId(member.id); setSelectedTaskId(null) }}>{member.expert?.name ?? member.name}</button>)}
                {group.members.filter(member => member.role !== 'lead').length > 5
                  && <span>+{group.members.filter(member => member.role !== 'lead').length - 5}</span>}
                </div>
                {group.tasks.map(task => <button key={task.id} type="button"
                  className={selectedTaskId === task.id ? `${css.boardTask} ${css.boardTaskSelected}` : css.boardTask}
                  aria-pressed={selectedTaskId === task.id} onClick={() => { setSelectedTaskId(task.id) }}>
                  <small>{task.id} · {t(taskWorkStateKey(task, taskActivities.get(task.id), team.goal?.revision) ?? `status.${task.status === 'deleted' ? 'completed' : task.status}`)}</small>
                  <strong>{task.subject}</strong><span>{task.description}</span>
                  {duplicateSubjects.has(task.id) && <small>{t('work.duplicateSubject')}</small>}
                  <small>{task.ownerName ?? t('unowned')}{task.blockedBy.length > 0 ? ` · ${t('blockedBy')}: ${task.blockedBy.join(', ')}` : ''}</small>
                </button>)}
              </section>)}</div>
              {visibleTasks.length === 0 && team.tasks.length > 0 && <p className={css.empty}>{t('view.noMatches')}</p>}
              {visibleTasks.length > visibleLimit && <button type="button" className={css.button} onClick={() => { setVisibleLimit(visibleLimit + 50) }}>{t('view.showMore')}</button>}
              <p className={css.hint}>{t('view.isolationHint')}</p>
            </section>
            <aside ref={detailsRef} className={css.inspectorPane} aria-label={t('workspace.details')}>
              {selectedTask !== undefined ? <section aria-label={t('view.taskDetail')}>
                <h2>{selectedTask.subject} · {selectedTask.id}</h2><p>{selectedTask.description}</p>
                <dl><dt>{t('owner')}</dt><dd>{selectedTask.ownerName ?? t('unowned')}</dd>
                  {selectedTask.reviewerName !== undefined && <><dt>{t('view.reviewer')}</dt><dd>{selectedTask.reviewerName}</dd></>}
                  {selectedTask.autoAssign !== undefined && <><dt>{t('view.autoAssign')}</dt><dd>{t(selectedTask.autoAssign ? 'view.enabled' : 'view.disabled')}</dd></>}
                  {selectedTask.requiredSkill !== undefined && <><dt>{t('view.requiredSkill')}</dt><dd>{selectedTask.requiredSkill}</dd></>}
                  <dt>{t('view.status')}</dt><dd>{t(taskWorkStateKey(selectedTask, taskActivities.get(selectedTask.id), team.goal?.revision) ?? `status.${selectedTask.status === 'deleted' ? 'completed' : selectedTask.status}`)}</dd>
                  <dt>{t('blockedBy')}</dt><dd>{selectedTask.blockedBy.join(', ') || t('memory.none')}</dd></dl>
                <TaskWorkDetails task={selectedTask} t={t} />
                <AdviserFindings task={selectedTask} findings={team.adviserDecisions} t={t} />
                {selectedTask.evidence !== undefined && selectedTask.evidence.length > 0 && <details>
                  <summary>{t('task.evidence')}</summary><ul>{selectedTask.evidence.map((entry, index) => <li key={index}>{entry}</li>)}</ul>
                </details>}
              </section> : selected !== undefined && <section aria-label={t('view.memberDetail')}>
                <header><h2>{selected.expert?.name ?? selected.name}</h2><button type="button" className={css.button}
                  disabled={selected.phase === 'provisioning' || selected.phase === 'failed'} onClick={() => {
                    try {
                      if (selected.id === sessionId) openView('chat', '')
                      else { openTeammate(sessionId, selected.id); openView('chat', '') }
                    } catch (reason: unknown) { setError(String(reason)) }
                  }}>{t('open')}</button></header>
                <p>{selected.description}</p>
                <dl><dt>{t('model')}</dt><dd>{selectedModel?.model ?? t('view.sessionModel')}</dd>
                  <dt>{t('reasoningEffort')}</dt><dd>{selectedModel?.reasoningEffort ?? t('roles.defaultEffort')}</dd>
                  <dt>{t('workspace.modelSource')}</dt><dd>{t(`view.modelSource.${selectedModel?.source ?? 'bound'}`)}</dd>
                  <dt>{t('parent')}</dt><dd>{team.members.find(member => member.id === selected.parentId)?.name ?? t('memory.none')}</dd>
                  <dt>{t('workspace.groupMembers')}</dt><dd>{team.members.filter(member => member.parentId === selected.id).length}</dd></dl>
                {selected.expert !== undefined && <p className={css.hint}>{t('view.boundRevision', { revision: selected.expert.revision })}</p>}
                {selected.persona !== undefined && <details><summary>{t('view.persona')}</summary><p className={css.preservedText}>{selected.persona}</p></details>}
                {selected.error !== undefined && <p role="alert">{selected.error}</p>}
                {selected.legacyMode !== undefined && <p className={css.hint}>{t(`view.legacy.${selected.legacyMode}`)}</p>}
                {members !== undefined && selected.role !== 'lead' && selected.legacyMode === undefined && <TeamMemberControls key={`${sessionId}:${selected.id}`}
                  sessionId={sessionId} member={selected} inactive={(selectedRunning ?? selectedSummaryRunning) === false}
                  operations={members} t={t} />}
                {selected.legacyMode === undefined && <MemberSkills key={selected.id}
                  selection={team.skillSelections?.find(selection => selection.memberId === selected.id)} t={t} />}
                <h3>{t('view.memberTasks')}</h3>
                {(tasksByOwner.get(selected.name)?.length ?? 0) === 0 ? <p className={css.hint}>{t('view.noTask')}</p>
                  : tasksByOwner.get(selected.name)?.map(task => <TaskRow key={task.id} task={task}
                    ownerRunning={taskActivities.get(task.id)} currentGoalRevision={team.goal?.revision}
                    duplicate={duplicateSubjects.has(task.id)} t={t} />)}
              </section>}
            </aside>
          </div>
        </>}
        {team !== undefined && tab === 'tasks' && <>
          {team.tasks.length === 0 ? <p className={css.empty}>{t('view.noActiveTasks')}</p>
            : team.tasks.map(task => <TaskRow key={task.id} task={task}
              ownerRunning={taskActivities.get(task.id)} currentGoalRevision={team.goal?.revision}
              duplicate={duplicateSubjects.has(task.id)} t={t} />)}
          {taskArchive !== undefined && <TeamTaskArchive key={`${sessionId}:${team.goal?.revision ?? 0}:${team.goal?.status ?? 'none'}`}
            sessionId={sessionId} operations={taskArchive} t={t} />}
        </>}
        {team !== undefined && tab === 'diagnostics' && <TeamDiagnostics team={team} t={t} />}
        {team !== undefined && tab === 'memory' && <div className={css.memory}>
          <p className={css.hint}>{t('memory.hint')}</p>
          {team.brief === undefined ? <p>{t('memory.empty')}</p> : <>
            {(team.brief.goalRevision === undefined || team.brief.goalRevision !== (team.goal?.revision ?? 0) || team.goal?.status === 'revoked')
              && <p role="status">{t('memory.historical')}</p>}
            <section><h2>{t('memory.objective')}</h2><p>{team.brief.objective}</p></section>
            <section><h2>{t('memory.authorization')}</h2><p>{team.brief.authorization || t('memory.none')}</p></section>
            <section><h2>{t('memory.decisions')}</h2><p>{team.brief.decisions || t('memory.none')}</p></section>
          </>}
        </div>}
      </section>
    </>}
    {experts !== undefined && expertsVisited && <section id={tab === 'experts' ? `${tabId}-panel` : undefined}
      role="tabpanel" aria-labelledby={`${tabId}-experts`} hidden={tab !== 'experts'} className={css.content}>
      <TeamExperts key={sessionId} operations={experts} members={team?.members ?? []}
        openMember={(id) => {
          if (id !== sessionId) openTeammate(sessionId, id)
          openView('chat', '')
        }} t={t} />
    </section>}
    {goals !== undefined && goalsVisited && <section id={tab === 'goals' ? `${tabId}-panel` : undefined}
      role="tabpanel" aria-labelledby={`${tabId}-goals`} hidden={tab !== 'goals'} className={css.content}>
      {team === undefined ? <div role="status" className={css.empty}>{t(opening || listing || recovery.state === 'loading' ? 'loading' : 'unavailable')}
        {!opening && !listing && recovery.state !== 'loading' && <button type="button" className={css.button} onClick={recovery.retry}>{t('recovery.retry')}</button>}</div>
        : <TeamGoals key={sessionId} sessionId={sessionId} operations={goals} state={team}
          openReview={() => { openView('chat', '') }} t={t} />}
    </section>}
    {mailbox !== undefined && tab === 'mailbox' && team !== undefined && <section id={`${tabId}-panel`} role="tabpanel"
      aria-labelledby={`${tabId}-mailbox`} className={css.content}>
      <TeamMailbox sessionId={sessionId} leadId={team.members.find(member => member.role === 'lead')?.id ?? sessionId}
        members={team.members} operations={mailbox} t={t} />
    </section>}
    <footer className={css.footer}>
      <span>{t('workspace.completed')} {team?.completedTaskCount ?? team?.tasks.filter(task => task.status === 'completed').length ?? 0}</span>
      <button type="button" className={css.textButton} onClick={() => { openView('chat', '') }}>{t('view.chat')}</button>
    </footer>
  </div>
}
