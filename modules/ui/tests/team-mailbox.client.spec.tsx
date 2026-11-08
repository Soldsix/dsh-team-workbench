// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { TeamMessageId } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { TeamMailboxMessageView, TeamMailboxPage, TeamMessageSnapshot } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { SessionId } from '@deepseek-ai/dsh-session'
import { TeamMailbox } from '../src/client/TeamMailbox.tsx'
import type { TeamMailboxOperations } from '../src/client/mailbox-operations.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)
const lead = SessionId('mailbox-lead')
const worker = SessionId('mailbox-worker')
const t = makeTranslate(zh)
const members = [{ id: lead, name: 'lead' }, { id: worker, name: 'worker' }]

function message(index: number, status: TeamMailboxMessageView['status'] = 'delivered'): TeamMailboxMessageView {
  return {
    id: TeamMessageId(`message-${index}`), senderId: lead, senderName: 'lead', targetId: worker,
    goalRevision: 2, status, attempts: 0,
  }
}

function operations(messages: TeamMailboxMessageView[]) {
  const list = vi.fn<TeamMailboxOperations['list']>().mockImplementation(async (_sessionId, offset, limit): Promise<TeamMailboxPage> => ({
    total: messages.length, items: messages.slice(offset, offset + limit),
  }))
  const get = vi.fn<TeamMailboxOperations['get']>().mockImplementation(async (_sessionId, id): Promise<TeamMessageSnapshot> => ({
    id, senderId: lead, senderName: 'lead', targetId: worker, goalRevision: 2,
    content: [{ type: 'text', text: 'selected body only' }],
  }))
  return {
    list, get,
    retry: vi.fn<TeamMailboxOperations['retry']>().mockImplementation(async (_sessionId, id) => ({ messageId: id, status: 'accepted' })),
    adopt: vi.fn<TeamMailboxOperations['adopt']>().mockImplementation(async (_sessionId, id) => ({ messageId: id, status: 'accepted' })),
  }
}

describe('Team mailbox view', () => {
  it('reads twenty summaries per page and fetches a body only after selection', async () => {
    const ops = operations(Array.from({ length: 21 }, (_, index) => message(index)))
    render(<TeamMailbox sessionId={lead} leadId={lead} members={members} operations={ops} t={t} />)
    await screen.findByText('显示 1–20 / 21 条')
    expect(ops.list).toHaveBeenCalledWith(lead, 0, 20)
    expect(ops.get).not.toHaveBeenCalled()
    expect(screen.queryByText('selected body only')).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: /lead → worker/u })[0]!)
    await screen.findByText('selected body only')
    expect(ops.get).toHaveBeenCalledWith(lead, TeamMessageId('message-0'))
    fireEvent.click(screen.getByRole('button', { name: zh['mailbox.next'] }))
    await screen.findByText('显示 21–21 / 21 条')
    expect(ops.list).toHaveBeenCalledWith(lead, 20, 20)
    expect(screen.queryByText('selected body only')).toBeNull()
  })

  it('shows adoption only to the Lead and retries exhausted mail by its durable id', async () => {
    const historical: TeamMailboxMessageView = {
      id: TeamMessageId('historical'), senderId: lead, senderName: 'lead', targetId: worker,
      status: 'quarantined', attempts: 0,
    }
    const exhausted = { ...message(2, 'retry-exhausted'), attempts: 8, error: 'target read failed' }
    const ops = operations([historical, exhausted])
    const view = render(<TeamMailbox sessionId={worker} leadId={lead} members={members} operations={ops} t={t} />)
    await screen.findByText('显示 1–2 / 2 条')
    expect(screen.queryByRole('button', { name: zh['mailbox.adopt'] })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: zh['mailbox.retry'] }))
    await waitFor(() => { expect(ops.retry).toHaveBeenCalledWith(worker, exhausted.id, expect.any(AbortSignal)) })
    view.rerender(<TeamMailbox sessionId={lead} leadId={lead} members={members} operations={ops} t={t} />)
    await screen.findByRole('button', { name: zh['mailbox.adopt'] })
    fireEvent.click(screen.getByRole('button', { name: zh['mailbox.adopt'] }))
    await waitFor(() => { expect(ops.adopt).toHaveBeenCalledWith(lead, historical.id, expect.any(AbortSignal)) })
  })
})
