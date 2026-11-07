/** Bounded mailbox history and explicit human recovery controls. */
import { useEffect, useRef, useState } from 'react'
import type { TeamMailboxPage, TeamMailboxMessageView, TeamMessageId, TeamMessageSnapshot } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { TeamMailboxOperations } from './mailbox-operations.ts'
import { NS } from './locales.ts'
import css from './TeamMailbox.module.css'

const PAGE_SIZE = 20
type Locale = PropsLocale<typeof NS>

/** Mailbox pagination is remote and sends message content only after selection. */
export function TeamMailbox({ sessionId, leadId, members, operations, t }: Locale & {
  readonly sessionId: SessionId
  readonly leadId: SessionId
  readonly members: readonly { id: SessionId; name: string }[]
  readonly operations: TeamMailboxOperations
}) {
  const [offset, setOffset] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [page, setPage] = useState<TeamMailboxPage | null>(null)
  const [selectedId, setSelectedId] = useState<TeamMessageId | null>(null)
  const [detail, setDetail] = useState<TeamMessageSnapshot | null>(null)
  const [busy, setBusy] = useState<TeamMessageId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const lifetime = useRef(new AbortController())
  const isLead = sessionId === leadId

  useEffect(() => {
    const controller = new AbortController()
    lifetime.current = controller
    return () => { controller.abort() }
  }, [])

  useEffect(() => {
    let current = true
    setPage(null)
    void operations.list(sessionId, offset, PAGE_SIZE).then((value) => {
      if (current) { setPage(value); setError(null) }
    }, () => { if (current) setError(t('mailbox.loadFailed')) })
    return () => { current = false }
  }, [sessionId, offset, refresh, operations, t])

  useEffect(() => {
    let current = true
    setDetail(null)
    if (selectedId !== null) void operations.get(sessionId, selectedId).then((value) => {
      if (current) { setDetail(value); setError(null) }
    }, () => { if (current) setError(t('mailbox.detailFailed')) })
    return () => { current = false }
  }, [sessionId, selectedId, operations, t])

  const run = async (kind: 'retry' | 'adopt', message: TeamMailboxMessageView): Promise<void> => {
    setBusy(message.id); setError(null); setNotice(null)
    try {
      const result = await operations[kind](sessionId, message.id, lifetime.current.signal)
      if (lifetime.current.signal.aborted) return
      setNotice(t(result.status === 'accepted' ? 'mailbox.accepted' : 'mailbox.queued'))
      setOffset(0); setRefresh(value => value + 1)
    } catch {
      if (!lifetime.current.signal.aborted) setError(t('mailbox.actionFailed'))
    } finally {
      if (!lifetime.current.signal.aborted) setBusy(null)
    }
  }

  const targetName = (id: SessionId): string => members.find(member => member.id === id)?.name ?? String(id)
  return <div className={css.page}>
    <div className={css.heading}><p>{t('mailbox.hint')}</p><button type="button" onClick={() => { setRefresh(value => value + 1) }}>{t('mailbox.refresh')}</button></div>
    {error !== null && <p role="alert" className={css.error}>{error}</p>}
    {notice !== null && <p role="status">{notice}</p>}
    {page === null ? <p role="status">{t('mailbox.loading')}</p> : <>
      {page.total === 0 ? <p>{t('mailbox.empty')}</p> : <ul className={css.list}>{page.items.map(message => <li key={message.id} className={css.item}>
        <div className={css.row}>
          <button type="button" className={css.message} onClick={() => { setSelectedId(selectedId === message.id ? null : message.id) }}
            aria-expanded={selectedId === message.id}>
            <strong>{message.senderName} → {targetName(message.targetId)}</strong>
            <span>{t(`mailbox.status.${message.status}`)} · {message.goalRevision === undefined
              ? t('mailbox.unversioned') : t('mailbox.goalRevision', { revision: message.goalRevision })}</span>
          </button>
          {(message.status === 'pending' || message.status === 'retry-exhausted') && <button type="button" disabled={busy !== null}
            onClick={() => { void run('retry', message) }}>{t('mailbox.retry')}</button>}
          {message.status === 'quarantined' && isLead && <button type="button" disabled={busy !== null}
            onClick={() => { void run('adopt', message) }}>{t('mailbox.adopt')}</button>}
        </div>
        {message.error !== undefined && <p className={css.error}>{message.error}</p>}
        {message.status === 'retry-exhausted' && <p>{t('mailbox.exhausted', { attempts: message.attempts })}</p>}
        {selectedId === message.id && <div className={css.detail}>
          {detail?.id !== message.id ? <p role="status">{t('mailbox.loadingDetail')}</p> : <>
            <p>{t('mailbox.id')}: {detail.id}</p>
            {detail.adoptedFrom !== undefined && <p>{t('mailbox.adoptedFrom')}: {detail.adoptedFrom}</p>}
            {detail.content.map((block, index) => block.type === 'text'
              ? <p key={index} className={css.body}>{block.text}</p>
              : <p key={index}>{t('mailbox.nonText')}</p>)}
          </>}
        </div>}
      </li>)}</ul>}
      <nav className={css.pagination} aria-label={t('mailbox.pagination')}>
        <button type="button" disabled={offset === 0} onClick={() => { setOffset(Math.max(0, offset - PAGE_SIZE)); setSelectedId(null) }}>{t('mailbox.previous')}</button>
        <span>{t('mailbox.range', { start: page.total === 0 ? 0 : offset + 1, end: offset + page.items.length, total: page.total })}</span>
        <button type="button" disabled={offset + page.items.length >= page.total} onClick={() => { setOffset(offset + PAGE_SIZE); setSelectedId(null) }}>{t('mailbox.next')}</button>
      </nav>
    </>}
  </div>
}
