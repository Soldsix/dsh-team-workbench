/** Local diagnostics export omitting user prose, personas, skills and connection settings. */
import { useState } from 'react'
import { readProjectPlan } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { DisplayTeam } from './team-view-data.ts'
import { NS } from './locales.ts'
import css from './TeamView.module.css'

/**
 * Create a metadata-only diagnostic snapshot suitable for local support review.
 * @param team - Current Team projection.
 * @param now - Export time, kept explicit for deterministic replay.
 * @returns identifiers and workflow counters without goal text, file paths or model credentials.
 */
export function diagnosticSnapshot(team: DisplayTeam, now: number) {
  return { format: 'dsh-team-diagnostics', version: 1, exportedAt: now,
    goal: { revision: team.goal?.revision ?? 0, status: team.goal?.status ?? 'unconfirmed' },
    members: team.members.map(member => ({ id: member.id, parentId: member.parentId, role: member.role,
      function: member.teamFunction, phase: member.phase, legacy: member.legacyMode !== undefined,
      selectedSkills: team.skillSelections?.find(selection => selection.memberId === member.id)?.skills.length ?? 0 })),
    tasks: team.tasks.map(task => ({ id: task.id, revision: task.revision, status: task.status,
      executionId: task.work?.execution?.id, phase: task.work?.execution?.phase,
      goalRevision: task.work?.plan.goalRevision, dependencies: task.blockedBy, blocker: task.dispatchBlocker,
      reusable: task.validity.reusable, requiredCriteria: task.work?.plan.acceptanceCriteria.length ?? 0 })),
    completed: team.completedTaskCount ?? 0,
    evidence: { adviserDecisions: team.adviserDecisions?.length ?? 0 },
    limits: { externalConfinementVerified: false, toolHealthVerified: false, providerCostKnown: false },
  }
}

/** Display only observed workflow diagnostics and explicitly identify unverified host resources. */
export function TeamDiagnostics({ team, t }: { team: DisplayTeam } & PropsLocale<typeof NS>) {
  const [error, setError] = useState<string | null>(null)
  let plan: ReturnType<typeof readProjectPlan>
  try { plan = readProjectPlan(team.goal?.definition.plan) } catch (failure: unknown) {
    if (!(failure instanceof Error)) throw failure
    plan = undefined
  }
  const needsReview = team.tasks.filter(task => task.work?.execution?.phase === 'submitted').length
  const resourceWaits = team.tasks.filter(task => task.status === 'pending'
    && task.writeScopeWarnings.some(warning => warning.startsWith('exclusive resource is owned by task '))).length
  return <section className={css.memory}>
    <h2>{t('diagnostics.title')}</h2><p className={css.hint}>{t('diagnostics.hint')}</p>
    <dl className={css.diagnosticGrid}>
      <dt>{t('diagnostics.goal')}</dt><dd>{team.goal?.revision ?? 0}</dd>
      <dt>{t('diagnostics.provision')}</dt><dd>{t(plan?.automation?.provision === 'on-demand' ? 'plan.onDemand' : 'plan.manual')}</dd>
      <dt>{t('plan.members')}</dt><dd>{plan?.resources.maxMembers ?? t('diagnostics.unknown')}</dd>
      <dt>{t('plan.requests')}</dt><dd>{plan?.resources.maxConcurrentRequests ?? t('diagnostics.unknown')}</dd>
      <dt>{t('diagnostics.review')}</dt><dd>{needsReview}</dd>
      <dt>{t('work.resourceBusy')}</dt><dd>{resourceWaits}</dd>
      <dt>{t('diagnostics.failed')}</dt><dd>{team.members.filter(member => member.phase === 'failed').length}</dd>
    </dl>
    <p>{t('diagnostics.health')}</p><p>{t('diagnostics.cost')}</p><p>{t('view.isolationHint')}</p>
    <button type="button" className={css.button} onClick={() => {
      try {
        const url = URL.createObjectURL(new Blob([JSON.stringify(diagnosticSnapshot(team, Date.now()), null, 2)], { type: 'application/json' }))
        const link = document.createElement('a')
        link.href = url; link.download = 'team-workbench-diagnostics.json'; link.click()
        setTimeout(() => { URL.revokeObjectURL(url) }, 0)
        setError(null)
      } catch (failure: unknown) { setError(String(failure)) }
    }}>{t('diagnostics.export')}</button>
    {error !== null && <p role="alert" className={css.error}>{error}</p>}
  </section>
}
