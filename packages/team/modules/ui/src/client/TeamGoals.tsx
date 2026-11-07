/** Native editing of proposals and inspection of user-confirmed Team scope. */
import { useEffect, useId, useRef, useState } from 'react'
import { isRemoteFailure } from '@deepseek-ai/dsh-api-gateway/client'
import type { TeamGoalChange, TeamGoalDefinition, TeamGoalReview } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamGoalOperations } from './goal-operations.ts'
import { NS } from './locales.ts'
import css from './TeamGoals.module.css'
import { ProjectPlanView } from './ProjectPlanView.tsx'

type Locale = PropsLocale<typeof NS>
type ListField = 'acceptanceCriteria' | 'targets' | 'allowedActions' | 'excludedTargets' | 'constraints'
interface Draft {
  readonly goalRevision: number
  readonly proposalRevision: number
  readonly objective: string
  readonly plan: string
  readonly coverage: TeamGoalDefinition['scope']['coverage']
  readonly acceptanceCriteria: string
  readonly targets: string
  readonly allowedActions: string
  readonly excludedTargets: string
  readonly constraints: string
  readonly readPaths: string
  readonly writePaths: string
  readonly webOrigins: string
  readonly allowSearch: boolean
  readonly allowUnrestrictedExecution: boolean
}

const listFields: readonly ListField[] = ['acceptanceCriteria', 'targets', 'allowedActions', 'excludedTargets', 'constraints']
const resourceFields = ['readPaths', 'writePaths', 'webOrigins'] as const

function draftFrom(state: TeamGoalReview): Draft {
  const proposal = state.goalProposal?.change
  const definition = proposal?.kind === 'replace' ? proposal.definition : state.goal?.definition
  return {
    goalRevision: state.goal?.revision ?? 0, proposalRevision: state.goalProposal?.revision ?? 0,
    objective: definition?.objective ?? '', coverage: definition?.scope.coverage ?? 'task',
    plan: definition?.plan ?? '',
    acceptanceCriteria: definition?.acceptanceCriteria.join('\n') ?? '', targets: definition?.scope.targets.join('\n') ?? '',
    allowedActions: definition?.scope.allowedActions.join('\n') ?? '', excludedTargets: definition?.scope.excludedTargets.join('\n') ?? '',
    constraints: definition?.scope.constraints.join('\n') ?? '',
    readPaths: definition?.scope.execution?.readPaths.join('\n') ?? '.',
    writePaths: definition?.scope.execution?.writePaths.join('\n') ?? '',
    webOrigins: definition?.scope.execution?.webOrigins.join('\n') ?? '',
    allowSearch: definition?.scope.execution?.allowSearch ?? true,
    allowUnrestrictedExecution: definition?.scope.execution?.allowUnrestrictedExecution ?? false,
  }
}

function lines(text: string): string[] { return text.split(/\r?\n/u).map(line => line.trim()).filter(Boolean) }

function Definition({ definition, t }: { definition: TeamGoalDefinition } & Locale) {
  const execution = definition.scope.execution
  return <dl className={css.definition}>
    <div><dt>{t('goals.objective')}</dt><dd>{definition.objective}</dd></div>
    {definition.plan !== undefined && <div><dt>{t('goals.plan')}</dt><dd><ProjectPlanView text={definition.plan} t={t} /></dd></div>}
    <div><dt>{t('goals.coverage')}</dt><dd>{t(`goals.coverage.${definition.scope.coverage}`)}</dd></div>
    {listFields.map((field) => {
      const values = field === 'acceptanceCriteria' ? definition.acceptanceCriteria : definition.scope[field]
      return <div key={field}><dt>{t(`goals.${field}`)}</dt><dd>{values.length === 0 ? t('memory.none')
        : <ul>{values.map((value, index) => <li key={index}>{value}</li>)}</ul>}</dd></div>
    })}
    {execution !== undefined && <>
      {resourceFields.map(field => <div key={field}><dt>{t(`goals.${field}`)}</dt>
        <dd>{execution[field].join('\n') || t('memory.none')}</dd></div>)}
      <div><dt>{t('goals.allowSearch')}</dt><dd>{t(execution.allowSearch ? 'goals.enabled' : 'goals.disabled')}</dd></div>
      <div><dt>{t('goals.allowUnrestrictedExecution')}</dt><dd>{t(execution.allowUnrestrictedExecution ? 'goals.enabled' : 'goals.disabled')}</dd></div>
    </>}
  </dl>
}

/** Projection records and user-operated changes for one Team Lead. */
export type TeamGoalsProps = Locale & {
  readonly sessionId: SessionId
  readonly state: TeamGoalReview
  readonly operations: TeamGoalOperations
  /** Open the conversation composer that owns the native review card. */
  readonly openReview: () => void
}

/**
 * Edit complete proposals while retaining the confirmed values and concurrent drafts.
 * @param props - Lead identity, live projection, Remote operations, and localized copy.
 * @returns goal status, scope details, and native human review controls.
 */
export function TeamGoals({ sessionId, state, operations, openReview, t }: TeamGoalsProps) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<'saving' | 'reviewing' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lifetime = useRef(new AbortController())
  const id = useId()
  const goalRevision = state.goal?.revision ?? 0
  const proposalRevision = state.goalProposal?.revision ?? 0
  const pending = state.goalProposal !== undefined && state.goalDecision?.proposalRevision !== proposalRevision
  const stale = draft !== null && (draft.goalRevision !== goalRevision || draft.proposalRevision !== proposalRevision)
  useEffect(() => {
    const controller = new AbortController()
    lifetime.current = controller
    return () => { controller.abort() }
  }, [])

  const report = (failure: unknown): void => {
    if (!isRemoteFailure(failure)) throw failure
    setError(t(failure.code === 'TEAM_GOAL_STALE' ? 'goals.conflict'
      : failure.code === 'TEAM_GOAL_REVIEW_PENDING' ? 'goals.alreadyReviewing'
        : failure.code === 'TEAM_GOAL_NO_REVIEWER' ? 'goals.noReviewer'
          : failure.code === 'TEAM_GOAL_INVALID' ? 'goals.invalid'
            : failure.code === 'TEAM_GOAL_TOO_LARGE' ? 'goals.tooLarge' : 'goals.failed'))
  }

  const review = async (revision: number): Promise<void> => {
    const signal = lifetime.current.signal
    setBusy('reviewing'); setError(null)
    openReview()
    try { await operations.review(sessionId, revision) }
    catch (failure: unknown) { if (!signal.aborted) report(failure) }
    finally { if (!signal.aborted) setBusy(null) }
  }

  const save = async (change: TeamGoalChange): Promise<void> => {
    if (draft === null) return
    const signal = lifetime.current.signal
    setBusy('saving'); setError(null)
    try {
      const proposal = await operations.propose(sessionId, {
        expectedGoalRevision: draft.goalRevision, expectedProposalRevision: draft.proposalRevision, change,
      }, signal)
      if (signal.aborted) return
      setDraft(null); setRevoking(false); setReason('')
      await review(proposal.revision)
    } catch (failure: unknown) { if (!signal.aborted) { report(failure); setBusy(null) } }
  }

  const replace = (): void => {
    if (draft === null) return
    const definition: TeamGoalDefinition = {
      objective: draft.objective.trim(), acceptanceCriteria: lines(draft.acceptanceCriteria), plan: draft.plan.trim(),
      scope: { coverage: draft.coverage, targets: lines(draft.targets), allowedActions: lines(draft.allowedActions),
        excludedTargets: lines(draft.excludedTargets), constraints: lines(draft.constraints),
        execution: { readPaths: lines(draft.readPaths), writePaths: lines(draft.writePaths), webOrigins: lines(draft.webOrigins),
          allowSearch: draft.allowSearch, allowUnrestrictedExecution: draft.allowUnrestrictedExecution } },
    }
    if (!definition.objective || !definition.plan || definition.acceptanceCriteria.length === 0 || definition.scope.targets.length === 0
      || definition.scope.allowedActions.length === 0) { setError(t('goals.invalid')); return }
    void save({ kind: 'replace', definition })
  }

  return <div className={css.page} data-team-goals>
    <header className={css.header}>
      <div><h2>{t('view.goals')}</h2><p className={css.hint}>{t('goals.hint')}</p></div>
      <span className={css.status}>{state.goal === undefined ? t('goals.unconfirmed')
        : t(state.goal.status === 'active' ? 'goals.active' : 'goals.revoked', { revision: state.goal.revision })}</span>
    </header>
    {state.goal !== undefined && <>
      {state.goal.status === 'revoked' && <p role="status" className={css.notice}>{t('goals.revokedHint')} {state.goal.revocationReason}</p>}
      <Definition definition={state.goal.definition} t={t} />
    </>}
    {state.goal === undefined && <p className={css.hint}>{t('goals.empty')}</p>}
    {pending && <section className={css.pending}>
      <h3>{t('goals.pending', { revision: proposalRevision })}</h3>
      {state.goalProposal.change.kind === 'replace' ? <details open><summary>{t('goals.proposalDetails')}</summary>
        <Definition definition={state.goalProposal.change.definition} t={t} /></details>
        : <p>{t('goals.revocation')}: {state.goalProposal.change.reason}</p>}
      <button type="button" className={css.button} disabled={busy !== null} onClick={() => { void review(proposalRevision) }}>{t('goals.review')}</button>
    </section>}
    {!pending && state.goalDecision?.outcome === 'rejected' && <p role="status" className={css.notice}>
      {t('goals.rejected')} {state.goalDecision.comment}
    </p>}
    {error !== null && <p role="alert" className={css.error}>{error}</p>}
    {busy === 'reviewing' && <p role="status" className={css.notice}>{t('goals.reviewing')}</p>}
    {draft === null ? <div className={css.actions}>
      <button type="button" className={css.button} disabled={busy !== null} onClick={() => {
        setDraft(draftFrom(state)); setRevoking(false); setError(null)
      }}>{t(state.goal === undefined ? 'goals.create' : state.goal.status === 'revoked' ? 'goals.restore' : 'goals.edit')}</button>
      {state.goal?.status === 'active' && <button type="button" className={css.textButton} disabled={busy !== null} onClick={() => {
        setDraft(draftFrom(state)); setRevoking(true); setReason(''); setError(null)
      }}>{t('goals.revoke')}</button>}
    </div> : <form className={css.editor} onSubmit={(event) => {
      event.preventDefault()
      if (busy !== null || stale) return
      if (!revoking) replace()
      else if (reason.trim()) void save({ kind: 'revoke', reason: reason.trim() })
      else setError(t('goals.reasonRequired'))
    }}>
      <h3>{t(revoking ? 'goals.revocation' : 'goals.editing')}</h3>
      {stale && <div className={css.notice}>
        <p>{t('goals.conflict')}</p>
        <button type="button" className={css.button} disabled={busy !== null} onClick={() => {
          setDraft({ ...draft, goalRevision, proposalRevision }); setError(null)
        }}>{t('goals.keepDraft')}</button>
      </div>}
      <fieldset className={css.fields} disabled={busy !== null}>
        {revoking ? <div className={css.field}><label htmlFor={`${id}-reason`}>{t('goals.reason')}</label>
          <textarea id={`${id}-reason`} rows={3} value={reason} onChange={(event) => { setReason(event.target.value) }} /></div> : <>
          <div className={css.field}><label htmlFor={`${id}-objective`}>{t('goals.objective')}</label>
            <textarea id={`${id}-objective`} rows={3} value={draft.objective} onChange={(event) => { setDraft({ ...draft, objective: event.target.value }) }} /></div>
          <div className={css.field}><label htmlFor={`${id}-plan`}>{t('goals.plan')}</label>
            <textarea id={`${id}-plan`} rows={9} value={draft.plan} onChange={(event) => { setDraft({ ...draft, plan: event.target.value }) }} />
            <small className={css.hint}>{t('goals.planHint')}</small></div>
          <div className={css.field}><label htmlFor={`${id}-coverage`}>{t('goals.coverage')}</label>
            <select id={`${id}-coverage`} value={draft.coverage} onChange={(event) => {
              const value = event.target.value
              if (value === 'task' || value === 'partial' || value === 'full') setDraft({ ...draft, coverage: value })
            }}>{(['task', 'partial', 'full'] as const).map(value => <option key={value} value={value}>{t(`goals.coverage.${value}`)}</option>)}</select>
            <small className={css.hint}>{t('goals.coverageHint')}</small>
          </div>
          <p className={css.hint}>{t('goals.linesHint')}</p>
          {listFields.map(field => <div className={css.field} key={field}><label htmlFor={`${id}-${field}`}>{t(`goals.${field}`)}</label>
            <textarea id={`${id}-${field}`} rows={3} value={draft[field]} onChange={(event) => { setDraft({ ...draft, [field]: event.target.value }) }} /></div>)}
          <details><summary>{t('goals.executionScope')}</summary>
            <p className={css.hint}>{t('goals.executionHint')}</p>
            {resourceFields.map(field => <div className={css.field} key={field}><label htmlFor={`${id}-${field}`}>{t(`goals.${field}`)}</label>
              <textarea id={`${id}-${field}`} rows={2} value={draft[field]} onChange={(event) => { setDraft({ ...draft, [field]: event.target.value }) }} /></div>)}
            {(['allowSearch', 'allowUnrestrictedExecution'] as const).map(field => <div className={css.field} key={field}>
              <label><input type="checkbox" checked={draft[field]} onChange={(event) => { setDraft({ ...draft, [field]: event.target.checked }) }} /> {t(`goals.${field}`)}</label>
            </div>)}
          </details>
        </>}
      </fieldset>
      <div className={css.actions}>
        <button type="submit" className={css.button} disabled={busy !== null || stale}>{t(busy === 'saving' ? 'goals.saving' : 'goals.saveAndReview')}</button>
        <button type="button" className={css.textButton} disabled={busy !== null} onClick={() => { setDraft(null); setRevoking(false); setError(null) }}>{t('goals.cancelEdit')}</button>
      </div>
    </form>}
  </div>
}
