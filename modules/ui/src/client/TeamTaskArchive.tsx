/** Bounded completed-task history with explicit reuse validation. */
import { useEffect, useRef, useState } from 'react'
import type { TeamTaskArchivePage, TeamTaskId, TeamTaskReuseCheck, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { TeamTaskOperations } from './task-operations.ts'
import { TaskWorkDetails, taskWorkStateKey } from './TaskWork.tsx'
import { NS } from './locales.ts'
import css from './TeamView.module.css'

const PAGE_SIZE = 20

/**
 * Read completed tasks only when the archive is opened, then recheck before reuse.
 * @param props - Selected Team, bounded Remote archive, and locale.
 * @returns one archive page and explicit validation results.
 */
export function TeamTaskArchive({ sessionId, operations, t }: PropsLocale<typeof NS> & {
  readonly sessionId: SessionId
  readonly operations: TeamTaskOperations
}) {
  const [page, setPage] = useState<TeamTaskArchivePage | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [cursors, setCursors] = useState<Array<TeamTaskId | undefined>>([undefined])
  const [opened, setOpened] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<TeamTaskId | null>(null)
  const [checks, setChecks] = useState<Record<string, TeamTaskReuseCheck>>({})
  const [error, setError] = useState<string | null>(null)
  const [failedPage, setFailedPage] = useState<{ after: TeamTaskId | undefined; index: number } | null>(null)
  const lifetime = useRef(new AbortController())
  const inFlight = useRef(false)
  const validating = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    lifetime.current = controller
    setPage(null); setPageIndex(0); setCursors([undefined]); setOpened(false); setLoading(false)
    setBusy(null); setChecks({}); setError(null); setFailedPage(null); inFlight.current = false; validating.current = false
    return () => { controller.abort() }
  }, [sessionId])

  const load = async (after: TeamTaskId | undefined, index: number): Promise<void> => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true); setError(null); setFailedPage(null)
    const signal = lifetime.current.signal
    try {
      const loaded = await operations.archive(sessionId, after, PAGE_SIZE)
      if (!signal.aborted) {
        setPage(loaded); setPageIndex(index); setCursors(current => [...current.slice(0, index), after]); setChecks({})
      }
    } catch {
      if (!signal.aborted) { setError(t('archive.loadFailed')); setFailedPage({ after, index }) }
    } finally {
      if (!signal.aborted) { inFlight.current = false; setLoading(false) }
    }
  }

  const validate = async (task: TeamTaskView): Promise<void> => {
    if (validating.current) return
    validating.current = true
    setBusy(task.id); setError(null)
    const signal = lifetime.current.signal
    try {
      const check = await operations.validateReuse(sessionId, task.id, signal)
      if (!signal.aborted) setChecks(current => ({ ...current, [task.id]: check }))
    } catch {
      if (!signal.aborted) setError(t('archive.validateFailed'))
    } finally {
      if (!signal.aborted) { validating.current = false; setBusy(null) }
    }
  }

  const tasks = page?.tasks ?? []
  const next = page?.nextCursor
  return <section className={css.archive}>
    <button type="button" className={css.button} aria-expanded={opened} onClick={() => {
      setOpened(value => !value)
      if (!opened && page === null) void load(undefined, 0)
    }}>{t('archive.title')}</button>
    {opened && <>
      <p className={css.hint}>{t('archive.hint')}</p>
      {page !== null && <button type="button" className={css.button} disabled={loading}
        onClick={() => { void load(undefined, 0) }}>{t('archive.refresh')}</button>}
      {error !== null && <p role="alert" className={css.error}>{error}</p>}
      {loading && <p role="status">{t('archive.loading')}</p>}
      {!loading && page !== null && tasks.length === 0 && <p>{t('archive.empty')}</p>}
      {tasks.map((task) => {
        const check = checks[task.id]
        const changed = check !== undefined && check.revision !== task.revision
        return <details className={css.task} key={task.id}>
          <summary><strong>{task.subject}</strong><span>{task.ownerName ?? t('unowned')}</span>
            <span>{t(taskWorkStateKey(task) ?? 'status.completed')}</span></summary>
          <div className={css.taskBody}>
            <p>{task.description}</p>
            {task.result !== undefined && <section><h4>{t('task.recordedResult')}</h4><p>{task.result}</p></section>}
            {task.evidence !== undefined && task.evidence.length > 0 && <section>
              <h4>{t('task.evidence')}</h4><ul>{task.evidence.map((entry, index) => <li key={index}>{entry}</li>)}</ul>
            </section>}
            <TaskWorkDetails task={task} t={t} />
            <button type="button" className={css.button} disabled={busy !== null}
              onClick={() => { void validate(task) }}>{t('archive.validate')}</button>
            {check === undefined ? <p className={css.hint}>{t('archive.unchecked')}</p>
              : <div role="status"><strong>{t(!changed && check.validity.reusable ? 'archive.reusable' : 'archive.stale')}</strong>
                {changed && <p>{t('archive.changed')}</p>}
                {check.validity.reasons.length > 0 && <ul>
                  {check.validity.reasons.map(reason => <li key={reason}>{reason}</li>)}
                </ul>}</div>}
          </div>
        </details>
      })}
      {pageIndex > 0 && <button type="button" className={css.button} disabled={loading}
        onClick={() => { void load(cursors[pageIndex - 1], pageIndex - 1) }}>{t('archive.previous')}</button>}
      {next !== undefined && <button type="button" className={css.button} disabled={loading}
        onClick={() => { void load(next, pageIndex + 1) }}>{t('archive.more')}</button>}
      {failedPage !== null && <button type="button" className={css.button}
        onClick={() => { void load(failedPage.after, failedPage.index) }}>{t('archive.retry')}</button>}
    </>}
  </section>
}
