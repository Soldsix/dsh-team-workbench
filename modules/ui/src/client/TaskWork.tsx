/** Recorded task versions and independent review details in the native Team views. */

import type { TeamMemberProjection, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { TeamProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { NS, type TeamKey } from './locales.ts'
import css from './TaskWork.module.css'

/**
 * Select the recorded workflow state without treating old completion flags as reviewed results.
 * @param task - Task from the persisted Team projection.
 * @param ownerRunning - Live Session activity; missing means no reliable activity observation.
 * @param currentGoalRevision - Confirmed goal revision used to distinguish an old plan from executable work.
 * @returns a locale key for planned work, or undefined for an ordinary legacy task.
 */
export function taskWorkStateKey(task: TeamTaskView, ownerRunning?: boolean, currentGoalRevision?: number): TeamKey | undefined {
  if (task.dispatchBlocker !== undefined) return `work.blocker.${task.dispatchBlocker}`
  if (task.status === 'pending' && task.writeScopeWarnings.some(warning => warning.startsWith('exclusive resource is owned by task '))) return 'work.resourceBusy'
  if (task.work === undefined) {
    if (task.status !== 'in_progress') return undefined
    return ownerRunning === true ? 'status.in_progress' : ownerRunning === false ? 'work.ownerInactive' : 'work.ownerUnknown'
  }
  if (task.work.execution?.phase === 'accepted' && !task.validity.reusable) return 'work.stale'
  if (task.status !== 'deleted' && currentGoalRevision !== undefined && task.work.plan.goalRevision !== currentGoalRevision) return 'work.goalChanged'
  if (task.work.execution?.phase === 'running') {
    if (ownerRunning === true) return 'work.phase.running'
    if (task.recovery !== undefined) return `work.recovery.${task.recovery.action}`
    return ownerRunning === false ? 'work.ownerInactive' : 'work.ownerUnknown'
  }
  return `work.phase.${task.work.execution?.phase ?? 'pending'}`
}

/**
 * Resolve the execution owner without guessing between members with the same name.
 * @param task - Task from the persisted Team projection.
 * @param members - Members from that projection.
 * @returns the exact owner Session ID when available.
 */
export function taskOwnerSessionId(task: TeamTaskView, members: readonly TeamMemberProjection[]): SessionId | undefined {
  if (task.work?.execution?.ownerId !== undefined) return task.work.execution.ownerId
  if (task.ownerName === undefined) return undefined
  const matches = members.filter(member => member.name === task.ownerName)
  return matches.length === 1 ? matches[0]?.id : undefined
}

/**
 * Find tasks whose visible subjects repeat without removing either task.
 * @param tasks - Current tasks in the Team projection.
 * @returns IDs of tasks whose subjects repeat.
 */
export function duplicateTaskSubjects(tasks: readonly TeamTaskView[]): ReadonlySet<string> {
  const counts = new Map<string, number>()
  for (const task of tasks) {
    const subject = task.subject.trim().toLocaleLowerCase()
    counts.set(subject, (counts.get(subject) ?? 0) + 1)
  }
  return new Set(tasks.filter(task => (counts.get(task.subject.trim().toLocaleLowerCase()) ?? 0) > 1).map(task => task.id))
}

/**
 * Observe the owner's Session activity for each task in the shared board.
 * @param team - Current Team projection.
 * @param useSessions - Session summary selector.
 * @param useSessionStatus - Live Session status selector.
 * @returns activity by task ID, with undefined when neither source knows the Session.
 */
export function useTaskActivities(
  team: TeamProjection | undefined,
  useSessions: PropsRuntime<'conversation.view'>['useSessions'],
  useSessionStatus: PropsRuntime<'conversation.view'>['useSessionStatus'],
): ReadonlyMap<string, boolean | undefined> {
  const tasks = team?.tasks ?? []
  const members = team?.members ?? []
  const live = useSessionStatus(state => tasks.map((task) => {
    const ownerId = taskOwnerSessionId(task, members)
    const value = ownerId === undefined ? undefined : state.get(ownerId)?.running
    return value === true ? '1' : value === false ? '0' : '?'
  }).join(''))
  const summaries = useSessions(state => tasks.map((task) => {
    const ownerId = taskOwnerSessionId(task, members)
    const value = ownerId === undefined ? undefined : state.byId[ownerId]?.running
    return value === true ? '1' : value === false ? '0' : '?'
  }).join(''))
  return new Map(tasks.map((task, index) => [task.id,
    live[index] === '1' ? true : live[index] === '0' ? false
      : summaries[index] === '1' ? true : summaries[index] === '0' ? false : undefined]))
}

/**
 * Display the plan, submitted evidence, and independent review as expandable task details.
 * @param props - Current task and the Team-owned translator.
 * @returns recorded workflow details, or a concise label for an unreviewed historical result.
 */
export function TaskWorkDetails({ task, t }: { task: TeamTaskView; t: TranslateNS<typeof NS> }) {
  const work = task.work
  if (work === undefined) return task.status === 'completed' || task.result !== undefined
    ? <p className={css.hint}>{t('work.legacy')}</p> : null
  const execution = work.execution
  const submission = execution?.submission
  return <details className={css.details}>
    <summary>{t('work.details')}</summary>
    <dl className={css.versions}>
      <dt>{t('work.input')}</dt><dd>{work.plan.inputVersion}</dd>
      <dt>{t('work.environment')}</dt><dd>{work.plan.environmentVersion}</dd>
      <dt>{t('work.goal')}</dt><dd>{work.plan.goalRevision}</dd>
      <dt>{t('work.plan')}</dt><dd>{work.plan.revision}</dd>
      <dt>{t('work.attempt')}</dt><dd>{work.attempts}</dd>
    </dl>
    <h4>{t('work.criteria')}</h4><ol>{work.plan.acceptanceCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ol>
    {submission !== undefined && execution?.phase !== 'accepted' && <section>
      <h4>{t('work.submission')}</h4><p>{submission.result}</p><ul>{submission.evidence.map((entry, index) => <li key={index}>{entry}</li>)}</ul>
    </section>}
    {execution?.review !== undefined && <section>
      <h4>{t('work.review')}</h4><p>{execution.review.summary}</p>
      <ul>{execution.review.evidence.map((entry, index) => <li key={index}>{entry}</li>)}</ul>
    </section>}
    {task.recovery !== undefined && <p className={css.hint}>{t(`work.recovery.${task.recovery.action}`)}</p>}
    {task.validity.reasons.length > 0 && <ul className={css.hint}>
      {task.validity.reasons.map(reason => <li key={reason}>{reason}</li>)}
    </ul>}
    <p className={css.hint}>{t('work.declaredVersions')}</p>
  </details>
}
