/** Current independent adviser findings beside a key task's acceptance record. */
import type { TeamAdviserDecision, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'

/**
 * Show the latest independent findings for the selected task execution.
 * @param props - Current task, saved adviser findings, and locale resolver.
 * @returns a compact review section for a dual-adviser task.
 */
export function AdviserFindings({ task, findings, t }: PropsLocale<typeof NS> & {
  readonly task: TeamTaskView
  readonly findings?: readonly TeamAdviserDecision[] | undefined
}) {
  if (task.work?.plan.adviserGate !== 'dual') return null
  const executionId = task.work.execution?.id
  const current = (findings ?? []).filter(value => value.taskId === task.id
    && value.executionId === executionId && value.goalRevision === task.work?.plan.goalRevision)
  const planning = current.findLast(value => value.adviserFunction === 'planning_adviser')
  const quality = current.findLast(value => value.adviserFunction === 'quality_adviser')
  const render = (label: string, value: TeamAdviserDecision | undefined) => <li>
    <strong>{label}</strong> · {value === undefined ? t('work.adviserPending')
      : value.decision === 'approve' ? t('work.adviserApproved') : t('work.adviserRevise')}
    {value !== undefined && <><p>{value.summary}</p><ul>{value.evidence.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
  </li>
  return <details>
    <summary>{t('work.adviserGate')}</summary>
    <ul>{render(t('view.function.planningAdviser'), planning)}
      {render(t('view.function.qualityAdviser'), quality)}</ul>
  </details>
}
