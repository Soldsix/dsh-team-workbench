/** Complete human-readable roster, task graph and budget from the reviewed project plan. */
import { readProjectPlan } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import css from './TeamView.module.css'

const roles = { planning_adviser: 'view.function.planningAdviser', quality_adviser: 'view.function.qualityAdviser',
  domain_adviser: 'view.function.domainAdviser', group_lead: 'view.function.groupLead', executor: 'view.function.executor', verifier: 'view.function.verifier' } as const

/**
 * Render structured plans as labelled sections and retain historical prose verbatim.
 * @param props - Saved plan text and locale.
 * @returns full plan details; no member or task is truncated.
 */
export function ProjectPlanView({ text, t }: { text: string } & PropsLocale<typeof NS>) {
  let plan: ReturnType<typeof readProjectPlan>
  try { plan = readProjectPlan(text) } catch (error: unknown) {
    if (!(error instanceof Error)) throw error
    return <pre className={css.preservedText}>{text}</pre>
  }
  if (plan === undefined) return <p className={css.preservedText}>{text}</p>
  return <div className={css.preservedText}>
    {plan.automation !== undefined && <p>{t('plan.automation')}: {t(plan.automation.provision === 'on-demand' ? 'plan.onDemand' : 'plan.manual')}</p>}
    <h4>{t('plan.roster')}</h4><p className={css.hint}>{t('plan.rosterHint')}</p>
    <ul>{plan.members.map(member => <li key={member.name}>
      <strong>{member.name}</strong> · {t(roles[member.function])} · {member.parent}
      <p>{member.modelProvider} / {member.model} / {member.reasoningEffort}</p>
      <p>{member.responsibility}</p><p>{t('plan.skills')}: {member.skills.join(', ') || t('memory.none')}</p>
      {member.persona !== undefined && <details><summary>{t('view.persona')}</summary><p>{member.persona}</p></details>}
      {member.instructions !== undefined && <details><summary>{t('roles.instructions')}</summary><p>{member.instructions}</p></details>}
    </li>)}</ul>
    <h4>{t('tasks')}</h4>
    {plan.tasks.map(task => <details key={task.id} open>
      <summary>{task.id} · {task.description}</summary>
      <p>{t('plan.owner')}: {task.owner} · {t('plan.reviewer')}: {task.reviewer}</p>
      <p>{t('plan.dependencies')}: {task.dependencies.join(', ') || t('plan.none')}</p>
      <p>{t('plan.inputs')}: {task.inputs.join(', ') || t('plan.none')}</p>
      <p>{t('plan.outputs')}: {task.outputs.join(', ') || t('plan.none')}</p>
      {task.exclusiveResources !== undefined && <p>{t('plan.resources')}: {task.exclusiveResources.join(', ') || t('plan.none')}</p>}
      <p>{task.critical ? t('plan.dual') : t('plan.independent')}</p>
      <ol>{task.acceptanceCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ol>
    </details>)}
    <h4>{t('plan.budget')}</h4>
    <p>{t('plan.members')}: {plan.resources.maxMembers} · {t('plan.requests')}: {plan.resources.maxConcurrentRequests}</p>
    <h4>{t('plan.recovery')}</h4><p>{plan.recovery}</p>
    {plan.previousTasks.length > 0 && <><h4>{t('plan.previous')}</h4><ul>{plan.previousTasks.map(task =>
      <li key={task.id}>{task.id} · {t(task.action === 'retain_history' ? 'plan.retain' : 'plan.replan')} · {task.reason}</li>)}</ul></>}
  </div>
}
