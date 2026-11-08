import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  TeamMemberProjection,
  TeamProjection,
  TeamTaskView as TeamTask,
} from '@deepseek-ai/dsh-experimental-agent-team/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import {
  IconChevronDownOutlineRegular,
  IconUserOutlineRegular, IconUsersOutlineRegular, StateDot, Tag, Tooltip,
  useAnchoredPosition, useDismissOnOutsidePointer, type StateDotState,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NS, type TeamKey } from './locales.ts'
import { TaskWorkDetails, duplicateTaskSubjects, taskWorkStateKey, useTaskActivities } from './TaskWork.tsx'
import { AdviserFindings } from './AdviserFindings.tsx'
import css from './TeamAction.module.css'
import { ProjectPlanView } from './ProjectPlanView.tsx'
import { TeamRoles } from './TeamRoles.tsx'
import { CurrentTeamRoles } from './CurrentTeamRoles.tsx'
import type { TeamRoleOperations } from './role-settings.ts'
import type { TeamExpertOperations } from './expert-catalog.ts'
import type { TeamGoalOperations } from './goal-operations.ts'
import type { TeamMailboxOperations } from './mailbox-operations.ts'
import type { TeamMemberOperations } from './member-operations.ts'
import type { TeamTaskOperations } from './task-operations.ts'
import { memberActivity, memberFunctionKey, memberModelDisplay, selectTeam, teamHierarchy, teamWorkGroups } from './team-view-data.ts'
import { useTeamProjectionRecovery } from './team-projection-recovery.ts'

/** Business actions injected by the browser plugin. */
export interface TeamActionInjected {
  /** Open a roster Session from the current conversation. */
  openTeammate: (sessionId: SessionId, childSessionId: SessionId) => void
  /** Restore a cold Team projection from the root Session log. */
  refreshTeam: (sessionId: SessionId, force?: boolean) => Promise<void>
  /** Fresh plugin read used when the shared catalog lacks this Team. */
  useRecoveredTeam?: (sessionId: SessionId) => TeamProjection | undefined
  /** Saved role configuration, available in the Web composition. */
  roles?: TeamRoleOperations
  /** Durable expert profiles and their bound revisions. */
  experts?: TeamExpertOperations
  /** Goal proposals and native user confirmation. */
  goals?: TeamGoalOperations
  /** Bounded mailbox history and explicit recovery. */
  mailbox?: TeamMailboxOperations
  /** Member retirement, reactivation, and private-workspace integration. */
  members?: TeamMemberOperations
  /** Completed-task archive and fresh reuse validation. */
  taskArchive?: TeamTaskOperations
}

/** Durable lifecycle overlaid with the member Session's live turn activity. */
type MemberStatus = 'unknown' | 'running' | 'inactive' | 'needsInput' | 'provisioning' | 'failed' | 'retired'

/** Full props of the Team conversation-header action. */
export type TeamActionProps =
  PropsRuntime<'conversation.session.header.actions'> & TeamActionInjected & PropsLocale<typeof NS>

function statusKey(status: TeamTask['status']): TeamKey {
  switch (status) {
    case 'pending': return 'status.pending'
    case 'in_progress': return 'status.in_progress'
    case 'completed': return 'status.completed'
    /* v8 ignore next -- Team views omit deleted task tombstones. */
    case 'deleted': return 'status.completed'
  }
}

function memberStatusKey(status: MemberStatus): TeamKey {
  switch (status) {
    case 'running': return 'memberStatus.running'
    case 'unknown': return 'memberStatus.unknown'
    case 'inactive': return 'memberStatus.inactive'
    case 'needsInput': return 'memberStatus.needsInput'
    case 'provisioning': return 'memberStatus.provisioning'
    case 'failed': return 'memberStatus.failed'
    case 'retired': return 'memberStatus.retired'
  }
}

function memberDotState(status: Exclude<MemberStatus, 'inactive'>): StateDotState {
  switch (status) {
    case 'running':
    case 'provisioning': return 'ongoing'
    case 'needsInput': return 'warning'
    case 'failed': return 'error'
    case 'unknown':
    case 'retired': return 'idle'
  }
}

function taskDotState(task: TeamTask, ownerRunning?: boolean): StateDotState {
  switch (task.status) {
    case 'pending': return task.ready ? 'idle' : 'warning'
    case 'in_progress': return task.work?.execution?.phase === 'submitted' ? 'warning'
      : ownerRunning === true ? 'ongoing' : 'warning'
    case 'completed': return 'done'
    /* v8 ignore next -- Team views omit deleted task tombstones. */
    case 'deleted': return 'idle'
  }
}

type TeamMemberRowProps = Pick<TeamActionProps,
  'sessionId' | 'useSessions' | 'useSessionStatus' | 'openTeammate' | 't'
> & {
  member: TeamMemberProjection
  memberCount: number
  parentName?: string
  depth: number
  onSelect: (memberId: SessionId) => void
  onError: (message: string) => void
}

function TeamMemberRow({
  member, memberCount, parentName, depth, sessionId, useSessions, useSessionStatus, openTeammate, onSelect, onError, t,
}: TeamMemberRowProps) {
  const selection = useSessions(state => state.projectionsBySession[member.id]?.values.modelSelection)
  const model = memberModelDisplay(member, selection)
  const running = useSessionStatus(state => state.get(member.id)?.running)
  const pendingInteraction = useSessionStatus(state => state.get(member.id)?.pendingInteraction)
  const summaryRunning = useSessions(state => state.byId[member.id]?.running)
  const status: MemberStatus = memberActivity(member, running, summaryRunning, pendingInteraction !== undefined)
  const isCurrent = member.id === sessionId
  const highlightCurrent = isCurrent && memberCount > 1
  const inert = isCurrent

  return (
    <Tooltip label={status === 'failed' || status === 'provisioning' ? t('workspace.inspect') : t('open')} side="bottom" gap={4} disabled={inert}>
      <button
        type="button"
        className={highlightCurrent ? `${css.member} ${css.memberCurrent}` : css.member}
        style={depth > 1 ? { marginInlineStart: `${Math.min(depth - 1, 4) * 14}px`, width: `calc(100% - ${Math.min(depth - 1, 4) * 14}px)` } : undefined}
        disabled={inert}
        onClick={() => {
          onSelect(member.id)
          if (status === 'failed' || status === 'provisioning') return
          try {
            openTeammate(sessionId, member.id)
          } catch (reason) {
            onError(String(reason))
          }
        }}
      >
        <span className={css.memberDot}>
          {status === 'inactive'
            ? <IconUserOutlineRegular size={14} className={css.inactiveIcon} />
            : <StateDot state={memberDotState(status)} />}
        </span>
        <span className={css.memberText}>
          <span className={css.memberName}>
            <span className={css.memberNameText}>{member.name}</span>
            {isCurrent && <Tag tone="info" className={css.currentTag}>{t('current')}</Tag>}
          </span>
          {parentName !== undefined && <small>{t('parent')}: {parentName}</small>}
          {member.role !== 'lead' && <small>{t(memberFunctionKey(member))}</small>}
          {member.description !== undefined && <span className={css.memberDescription}>{member.description}</span>}
          <small>
            {t(memberStatusKey(status))}
            {model.model !== undefined && (
              <span className={css.memberModel}>{` · ${t('model')}: ${model.model} (${t(`view.modelSource.${model.source}`)})`}</span>
            )}
          </small>
          {(model.model !== undefined || member.persona !== undefined) && (
            <span className={css.memberConfiguration}>
              {model.model !== undefined && <span>{t('reasoningEffort')}: {model.reasoningEffort ?? t('roles.defaultEffort')}</span>}
              {model.next !== undefined && <span>{t('view.nextModel', { model: model.next.model })} · {t('view.nextEffort', { effort: model.next.reasoningEffort ?? t('roles.defaultEffort') })}</span>}
              {member.persona !== undefined && (
                <Tooltip label={member.persona} side="bottom" gap={4}>
                  <span className={css.personaTag}>{t('personaBound')}</span>
                </Tooltip>
              )}
            </span>
          )}
          {member.error !== undefined && <small className={css.diagnostic}>{member.error}</small>}
        </span>
      </button>
    </Tooltip>
  )
}

/** Task card with a two-line description clamp expanded from a toggle in the meta row. */
function TaskCard({ task, ownerRunning, currentGoalRevision, duplicate, onSelect, t }: {
  task: TeamTask
  ownerRunning: boolean | undefined
  currentGoalRevision: number | undefined
  duplicate: boolean
  onSelect: (taskId: string) => void
  t: TranslateNS<typeof NS>
}) {
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => {
    if (expanded) return
    const paragraph = textRef.current
    /* v8 ignore next -- the paragraph mounts in the same commit as the effect. */
    if (paragraph === null) return
    const measure = (): void => { setClamped(paragraph.scrollHeight > paragraph.clientHeight + 1) }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(paragraph)
    return () => { observer.disconnect() }
  }, [task.description, expanded])
  return (
    <article className={css.task}>
      <div className={css.taskTitle}>
        <button type="button" className={css.taskSelect} onClick={() => { onSelect(task.id) }}>{task.subject}</button>
        <span className={css.taskState}>
          <StateDot state={taskDotState(task, ownerRunning)} />
          <span>{t(taskWorkStateKey(task, ownerRunning, currentGoalRevision) ?? statusKey(task.status))}</span>
        </span>
      </div>
      <p ref={textRef} className={expanded ? undefined : css.clampedDescription}>{task.description}</p>
      {task.result !== undefined && <div className={css.taskResult}><strong>{t(task.validity.reusable ? 'task.result' : 'task.recordedResult')}</strong><p>{task.result}</p></div>}
      <TaskWorkDetails task={task} t={t} />
      {task.evidence !== undefined && task.evidence.length > 0 && <details className={css.evidence}><summary>{t('task.evidence')}</summary><ul>{task.evidence.map((value, index) => <li key={index}>{value}</li>)}</ul></details>}
      <div className={css.meta}>
        {(clamped || expanded) && (
          <button
            type="button"
            className={css.expandToggle}
            aria-expanded={expanded}
            onClick={() => { setExpanded(current => !current) }}
          >
            {t(expanded ? 'task.collapse' : 'task.expand')}
            <IconChevronDownOutlineRegular size={12} className={expanded ? css.expandToggleOpen : undefined} />
          </button>
        )}
        <span>{task.id}</span>
        {duplicate && <span>{t('work.duplicateSubject')}</span>}
        <span>{t('owner')}: {task.ownerName ?? t('unowned')}</span>
        {task.status === 'pending' && <span>{task.ready ? t('ready') : t('blocked')}</span>}
        {task.blockedBy.length > 0 && <span>{t('blockedBy')}: {task.blockedBy.join(', ')}</span>}
        {task.writeScopes.length > 0 && <span>{t('writeScopes')}: {task.writeScopes.join(', ')}</span>}
        {task.writeScopeWarnings.map(warning => <span key={warning} className={css.warning}>{warning}</span>)}
      </div>
    </article>
  )
}

/** Render the Team roster, role editor, shared context, and read-only task board. */
export function TeamAction({
  sessionId, useSession, useSessions, useSessionStatus, openTeammate, refreshTeam, roles, t,
  useRecoveredTeam = () => undefined,
}: TeamActionProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'roles' | 'memory' | 'plan'>('overview')
  const [selectedMemberId, setSelectedMemberId] = useState<SessionId | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const triggerLabelRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const position = useAnchoredPosition({
    open, anchorRef: triggerRef, panelRef, gap: 5, margin: 16,
  })
  const positioned = position !== null
  const parentSessionId = useSession(snapshot => snapshot.subagent?.address.parentSessionId)
  const recoveredTeam = useRecoveredTeam(sessionId)
  const team = useSessions(state => selectTeam(state, sessionId, parentSessionId)) ?? recoveredTeam
  const pendingGoalReview = useSessionStatus(state => state.get(team?.members.find(member => member.role === 'lead')?.id ?? sessionId)
    ?.pendingInteraction?.kind === 'plan-review')
  const taskActivities = useTaskActivities(team, useSessions, useSessionStatus)
  const duplicateSubjects = duplicateTaskSubjects(team?.tasks ?? [])
  const recovery = useTeamProjectionRecovery(sessionId, open, team === undefined, refreshTeam)
  const opening = useSession(snapshot => snapshot.openState === 'loading')
  const listing = useSessions(state => state.phase === 'pending')
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pinnedRef = useRef(false)

  const cancelHoverChange = (): void => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = undefined
  }

  useEffect(() => {
    cancelHoverChange()
    pinnedRef.current = false
    setOpen(false)
    setError(null)
    setSelectedMemberId(null)
    setSelectedTaskId(null)
  }, [sessionId])

  useEffect(() => cancelHoverChange, [])

  useEffect(() => {
    if (pendingGoalReview) {
      cancelHoverChange()
      pinnedRef.current = false
      setOpen(false)
    }
  }, [pendingGoalReview])

  useLayoutEffect(() => {
    if (open && positioned && pinnedRef.current) panelRef.current?.focus()
  }, [open, positioned])

  const changeOpen = (next: boolean): void => {
    cancelHoverChange()
    if (!next) pinnedRef.current = false
    setOpen(next)
  }

  const scheduleHoverOpen = (): void => {
    cancelHoverChange()
    if (open) return
    const label = triggerLabelRef.current
    /* v8 ignore next -- the label mounts with the trigger that received the hover. */
    if (label === null) return
    // Icon-only trigger (label collapsed by the header container query):
    // hover-open would surprise on such a small target, so only click opens.
    if (getComputedStyle(label).display === 'none') return
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = undefined
      changeOpen(true)
    }, 150)
  }

  const scheduleHoverClose = (): void => {
    cancelHoverChange()
    if (pinnedRef.current) return
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = undefined
      changeOpen(false)
    }, 120)
  }

  useDismissOnOutsidePointer(rootRef, open, changeOpen, panelRef)

  useEffect(() => {
    if (!open) return
    const dismiss = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      cancelHoverChange()
      pinnedRef.current = false
      setOpen(false)
      if (panelRef.current?.contains(document.activeElement)) triggerRef.current?.focus()
    }
    document.addEventListener('keydown', dismiss)
    return () => { document.removeEventListener('keydown', dismiss) }
  }, [open])

  const compact = roles === undefined && team !== undefined && team.members.length === 1 && team.tasks.length === 0
  const selectedMember = team?.members.find(member => member.id === selectedMemberId)
    ?? team?.members.find(member => member.role === 'lead')
  const selectedTask = team?.tasks.find(task => task.id === selectedTaskId)
  const selectedModelSelection = useSessions(state => selectedMember === undefined
    ? undefined : state.projectionsBySession[selectedMember.id]?.values.modelSelection)
  const selectedModel = selectedMember === undefined ? undefined : memberModelDisplay(selectedMember, selectedModelSelection)
  const taskGroups = team === undefined ? [] : teamWorkGroups(team.members, team.tasks)
  const pendingPlan = team?.goalProposal?.change.kind === 'replace' && team.goalDecision?.proposalRevision !== team.goalProposal.revision
    ? team.goalProposal.change.definition : undefined
  const displayedPlan = pendingPlan ?? team?.goal?.definition

  return (
    <div
      ref={rootRef}
      className={css.root}
      data-team-action
      onMouseLeave={scheduleHoverClose}
    >
      <button
        type="button"
        ref={triggerRef}
        onMouseEnter={scheduleHoverOpen}
        className={css.trigger}
        aria-label={t('trigger')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          cancelHoverChange()
          pinnedRef.current = true
          if (!open) changeOpen(true)
          else panelRef.current?.focus()
        }}
      >
        <IconUsersOutlineRegular size={14} />
        <span ref={triggerLabelRef} className={css.triggerLabel}>{t('trigger')}</span>
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className={roles !== undefined ? `${css.panel} ${css.workspacePanel}` : compact ? `${css.panel} ${css.panelCompact}` : css.panel}
          style={position ?? { visibility: 'hidden', left: 0, top: 0 }}
          role="dialog"
          tabIndex={-1}
          aria-label={t('trigger')}
          data-team-panel
          onMouseEnter={cancelHoverChange}
          onMouseLeave={scheduleHoverClose}
        >
          {roles !== undefined && <header className={css.workspaceHeader}>
            <div><span className={css.eyebrow}>{t('workspace.eyebrow')}</span><h2>{t('workspace.title')}</h2><p>{t('workspace.subtitle')}</p></div>
            <div className={css.headerActions}>
              <button type="button" className={css.secondaryButton} onClick={() => { setTab('plan'); pinnedRef.current = true }}>{t('workspace.plan')}</button>
              <button type="button" className={css.secondaryButton} onClick={() => { changeOpen(false) }}>{t('workspace.close')}</button>
            </div>
          </header>}
          {roles !== undefined && <nav className={css.tabs} aria-label={t('workspace.navigation')}>
            {(['overview', 'roles', 'memory'] as const).map(value => <button type="button" key={value} aria-current={tab === value ? 'page' : undefined} onClick={() => { pinnedRef.current = true; setTab(value) }}>{t(`workspace.${value}`)}</button>)}
          </nav>}
          <div className={css.body}>
            {roles !== undefined && tab === 'roles' && <>
              <CurrentTeamRoles members={team?.members ?? []} useSessions={useSessions} t={t} />
              <TeamRoles operations={roles} t={t} />
            </>}
            {roles !== undefined && tab === 'plan' && <section className={css.plan}>
              <h3>{t('workspace.plan')}</h3>
              {displayedPlan === undefined ? <p>{t('workspace.noPlan')}</p> : <>
                {pendingPlan !== undefined && <p role="status">{t('goals.pending', { revision: team?.goalProposal?.revision ?? 0 })}</p>}
                <h4>{t('goals.objective')}</h4><p>{displayedPlan.objective}</p>
                <h4>{t('goals.plan')}</h4><ProjectPlanView text={displayedPlan.plan ?? t('workspace.noPlan')} t={t} />
                <h4>{t('goals.acceptanceCriteria')}</h4>
                <ul>{displayedPlan.acceptanceCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul>
                <h4>{t('goals.coverage')}</h4><p>{t(`goals.coverage.${displayedPlan.scope.coverage}`)}</p>
                <h4>{t('goals.targets')}</h4><ul>{displayedPlan.scope.targets.map((target, index) => <li key={index}>{target}</li>)}</ul>
                <h4>{t('goals.allowedActions')}</h4><ul>{displayedPlan.scope.allowedActions.map((action, index) => <li key={index}>{action}</li>)}</ul>
                <h4>{t('goals.excludedTargets')}</h4><ul>{displayedPlan.scope.excludedTargets.length === 0
                  ? <li>{t('memory.none')}</li> : displayedPlan.scope.excludedTargets.map((target, index) => <li key={index}>{target}</li>)}</ul>
                <h4>{t('goals.constraints')}</h4><ul>{displayedPlan.scope.constraints.length === 0
                  ? <li>{t('memory.none')}</li> : displayedPlan.scope.constraints.map((constraint, index) => <li key={index}>{constraint}</li>)}</ul>
                {displayedPlan.scope.execution !== undefined && <>
                  <h4>{t('goals.executionScope')}</h4><pre>{JSON.stringify(displayedPlan.scope.execution, null, 2)}</pre>
                </>}
              </>}
            </section>}
            {roles !== undefined && tab === 'memory' && <section className={css.memory}>
              <h3>{t('memory.title')}</h3><p className={css.sectionHint}>{t('memory.hint')}</p>
              {team?.brief === undefined ? <p>{t('memory.empty')}</p> : <>
                {(team.brief.goalRevision === undefined || team.brief.goalRevision !== (team.goal?.revision ?? 0) || team.goal?.status === 'revoked')
                  && <p role="status">{t('memory.historical')}</p>}
                <article><h4>{t('memory.objective')}</h4><p>{team.brief.objective}</p></article>
                <article><h4>{t('memory.authorization')}</h4><p>{team.brief.authorization || t('memory.none')}</p></article>
                <article><h4>{t('memory.decisions')}</h4><p>{team.brief.decisions || t('memory.none')}</p></article>
              </>}
            </section>}
            {tab === 'overview' && <>
              {error !== null && (
                <div className={css.error} role="alert"><StateDot state="error" />{error}</div>
              )}
              {team === undefined && (
                <div className={css.notice} role="status">
                  <StateDot state={opening || listing || recovery.state === 'loading' ? 'ongoing' : 'warning'} />
                  {t(opening || listing || recovery.state === 'loading' ? 'loading' : 'unavailable')}
                  {!opening && !listing && recovery.state !== 'loading' && <button type="button" className={css.secondaryButton} onClick={recovery.retry}>{t('recovery.retry')}</button>}
                </div>
              )}
              {team !== undefined && (
                <>
                  {team.failure !== undefined && (
                    <div className={css.error} role="alert"><StateDot state="error" />{t('failure', { message: team.failure })}</div>
                  )}
                  {roles !== undefined && <div className={css.metrics}>
                    <div><strong>{team.members.length}</strong><span>{t('roster')}</span></div>
                    <div><strong>{team.tasks.length}</strong><span>{t('work.openTasks')}</span></div>
                    <div><strong>{team.completedTaskCount ?? team.tasks.filter(task => task.status === 'completed').length}</strong><span>{t('workspace.completed')}</span></div>
                  </div>}
                  <div className={roles !== undefined ? css.overviewColumns : undefined}>
                    <section>
                      <h3>
                        {t('roster')}
                        {team.members.length > 1 && <span className={css.count}>{team.members.length}</span>}
                      </h3>
                      <div className={css.roster}>
                        {teamHierarchy(team.members).map(({ member, depth }) => (
                          <TeamMemberRow
                            key={member.id}
                            member={member}
                            memberCount={team.members.length}
                            depth={depth}
                            {...member.parentId === undefined ? {} : { parentName: team.members.find(parent => parent.id === member.parentId)?.name ?? t('memory.none') }}
                            sessionId={sessionId}
                            useSessions={useSessions}
                            useSessionStatus={useSessionStatus}
                            openTeammate={openTeammate}
                            onSelect={(id) => { setSelectedMemberId(id); setSelectedTaskId(null) }}
                            onError={setError}
                            t={t}
                          />
                        ))}
                      </div>
                    </section>
                    <section>
                      {team.tasks.length === 0
                        ? <p className={css.emptyNotice}>{t('view.noActiveTasks')} · {t('view.completedHint', { count: team.completedTaskCount ?? 0 })}</p>
                        : (
                          <>
                            <h3>{t('tasks')}<span className={css.count}>{team.tasks.length}</span></h3>
                            <div className={roles !== undefined ? css.groupGrid : css.tasks}>
                              {taskGroups.filter(group => group.tasks.length > 0
                                || roles !== undefined && group.members.length > 1).map(group => <section
                                key={group.id} className={css.taskGroup}>
                                {roles !== undefined && <>
                                  <div className={css.groupHeading}>
                                    <h4>{group.leader?.expert?.name ?? group.leader?.name
                                      ?? t(group.id === 'lead' ? 'workspace.leadGroup' : 'workspace.unassignedGroup')}</h4>
                                    <span>{t('workspace.groupProgress', {
                                      completed: group.tasks.filter(task => task.status === 'completed').length,
                                      total: group.tasks.length,
                                    })}</span>
                                  </div>
                                  {group.members.length > 0 && <div className={css.groupPeople}>
                                    {group.members.filter(member => member.role !== 'lead').slice(0, 5).map(member => <button
                                      key={member.id} type="button" className={css.groupPerson}
                                      onClick={() => { setSelectedMemberId(member.id); setSelectedTaskId(null) }}>
                                      {member.expert?.name ?? member.name}
                                    </button>)}
                                    {group.members.filter(member => member.role !== 'lead').length > 5
                                      && <span className={css.groupMore}>+{group.members.filter(member => member.role !== 'lead').length - 5}</span>}
                                  </div>}
                                </>}
                                {group.tasks.length === 0 ? <p className={css.groupEmpty}>{t('view.noTask')}</p>
                                  : group.tasks.map(task => <TaskCard key={task.id} task={task}
                                    ownerRunning={taskActivities.get(task.id)} currentGoalRevision={team.goal?.revision}
                                    duplicate={duplicateSubjects.has(task.id)}
                                    onSelect={setSelectedTaskId} t={t} />)}
                              </section>)}
                            </div>
                          </>
                        )}
                    </section>
                    {roles !== undefined && <aside className={css.inspector} aria-label={t('workspace.details')}>
                      <h3>{t('workspace.details')}</h3>
                      {selectedTask !== undefined ? <>
                        <strong>{selectedTask.subject}</strong>
                        <p>{selectedTask.description}</p>
                        <dl>
                          <dt>{t('owner')}</dt><dd>{selectedTask.ownerName ?? t('unowned')}</dd>
                          {selectedTask.reviewerName !== undefined && <><dt>{t('view.reviewer')}</dt><dd>{selectedTask.reviewerName}</dd></>}
                          {selectedTask.autoAssign !== undefined && <><dt>{t('view.autoAssign')}</dt><dd>{t(selectedTask.autoAssign ? 'view.enabled' : 'view.disabled')}</dd></>}
                          {selectedTask.requiredSkill !== undefined && <><dt>{t('view.requiredSkill')}</dt><dd>{selectedTask.requiredSkill}</dd></>}
                          <dt>{t('view.status')}</dt><dd>{t(taskWorkStateKey(selectedTask, taskActivities.get(selectedTask.id), team.goal?.revision) ?? statusKey(selectedTask.status))}</dd>
                          <dt>{t('work.criteria')}</dt><dd>{selectedTask.work?.plan.acceptanceCriteria.join('\n') ?? t('memory.none')}</dd>
                        </dl>
                        <TaskWorkDetails task={selectedTask} t={t} />
                        <AdviserFindings task={selectedTask} findings={team.adviserDecisions} t={t} />
                      </> : selectedMember !== undefined ? <>
                        <strong>{selectedMember.name}</strong>
                        <p>{selectedMember.description ?? t('workspace.noDescription')}</p>
                        <dl>
                          <dt>{t('parent')}</dt><dd>{team.members.find(member => member.id === selectedMember.parentId)?.name ?? t('memory.none')}</dd>
                          <dt>{t('model')}</dt><dd>{selectedModel?.model ?? t('view.sessionModel')}</dd>
                          <dt>{t('reasoningEffort')}</dt><dd>{selectedModel?.reasoningEffort ?? t('roles.defaultEffort')}</dd>
                          <dt>{t('workspace.modelSource')}</dt><dd>{selectedModel === undefined ? t('memory.none') : t(`view.modelSource.${selectedModel.source}`)}</dd>
                          {selectedModel?.next !== undefined && <><dt>{t('view.nextModel', { model: selectedModel.next.model })}</dt><dd>{selectedModel.next.reasoningEffort ?? t('roles.defaultEffort')}</dd></>}
                          <dt>{t('workspace.groupMembers')}</dt><dd>{team.members.filter(member => member.parentId === selectedMember.id).length}</dd>
                          <dt>{t('view.persona')}</dt><dd>{selectedMember.persona ?? t('memory.none')}</dd>
                        </dl>
                        {selectedMember.error !== undefined && <p role="status" className={css.diagnostic}>{selectedMember.error}</p>}
                        {selectedMember.phase === 'provisioning' && <p role="status">{t('memberStatus.provisioning')}</p>}
                      </> : <p>{t('workspace.noSelection')}</p>}
                    </aside>}
                  </div>
                </>
              )}
            </>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
