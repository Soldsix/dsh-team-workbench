// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { TeamTaskReuseCheck, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { SessionId } from '@deepseek-ai/dsh-session'
import { TeamTaskArchive } from '../src/client/TeamTaskArchive.tsx'
import type { TeamTaskOperations } from '../src/client/task-operations.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)
const lead = SessionId('lead')
const t = makeTranslate(zh)
const tasks: TeamTaskView[] = Array.from({ length: 21 }, (_, index) => ({
  id: `task-${index}` as TeamTaskView['id'], revision: 2, subject: `归档任务 ${index}`,
  description: 'Recorded task', status: 'completed', ready: false,
  blockedBy: [], writeScopes: [], writeScopeWarnings: [], result: `result ${index}`,
  validity: { reusable: false, reasons: ['Revalidation required'] },
}))

function operations(): TeamTaskOperations {
  return {
    archive: vi.fn<TeamTaskOperations['archive']>().mockImplementation(async (_session, after, limit) => {
      const offset = after === undefined ? 0 : tasks.findIndex(task => task.id === after) + 1
      const selected = tasks.slice(offset, offset + limit)
      const nextCursor = offset + selected.length < tasks.length ? selected.at(-1)?.id : undefined
      return { tasks: selected, ...nextCursor === undefined ? {} : { nextCursor } }
    }),
    validateReuse: vi.fn<TeamTaskOperations['validateReuse']>().mockImplementation(async (_session, id): Promise<TeamTaskReuseCheck> => ({
      taskId: id, revision: 2, checkedAt: 1, inputs: [], artifacts: [],
      validity: { reusable: true, reasons: [] },
    })),
  }
}

describe('completed-task archive', () => {
  it('loads bounded pages on demand and shows reuse only after a fresh check', async () => {
    const ops = operations()
    render(<TeamTaskArchive sessionId={lead} operations={ops} t={t} />)
    expect(ops.archive).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: zh['archive.title'] }))
    await screen.findByText('归档任务 0')
    expect(ops.archive).toHaveBeenCalledWith(lead, undefined, 20)
    expect(screen.queryByText('归档任务 20')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: zh['archive.more'] }))
    await screen.findByText('归档任务 20')
    expect(ops.archive).toHaveBeenCalledWith(lead, tasks[19]!.id, 20)
    expect(screen.queryByText('归档任务 0')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: zh['archive.previous'] }))
    await screen.findByText('归档任务 0')
    fireEvent.click(screen.getByText('归档任务 0'))
    const firstTask = screen.getByText('归档任务 0').closest('details')!
    expect(within(firstTask).getByText(zh['archive.unchecked'])).toBeDefined()
    expect(screen.queryByText(zh['archive.reusable'])).toBeNull()
    fireEvent.click(within(firstTask).getByRole('button', { name: zh['archive.validate'] }))
    await screen.findByText(zh['archive.reusable'])
    expect(ops.validateReuse).toHaveBeenCalledWith(lead, tasks[0]!.id, expect.any(AbortSignal))
    fireEvent.click(screen.getByRole('button', { name: zh['archive.refresh'] }))
    await waitFor(() => { expect(screen.queryByText(zh['archive.reusable'])).toBeNull() })
  })

  it('ignores a previous Team page after the selected session changes', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<TeamTaskOperations['archive']>>>()
    const ops = operations()
    vi.mocked(ops.archive).mockImplementation(sessionId => sessionId === lead
      ? pending.promise : Promise.resolve({ tasks: [] }))
    const view = render(<TeamTaskArchive sessionId={lead} operations={ops} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: zh['archive.title'] }))
    view.rerender(<TeamTaskArchive sessionId={SessionId('other')} operations={ops} t={t} />)
    pending.resolve({ tasks: [tasks[0]!] })
    fireEvent.click(screen.getByRole('button', { name: zh['archive.title'] }))
    await screen.findByText(zh['archive.empty'])
    await waitFor(() => { expect(screen.queryByText('归档任务 0')).toBeNull() })
  })

  it('does not label an older displayed revision reusable after a concurrent task edit', async () => {
    const ops = operations()
    vi.mocked(ops.validateReuse).mockImplementation(async (_session, id) => ({
      taskId: id, revision: 3, checkedAt: 1, inputs: [], artifacts: [], validity: { reusable: true, reasons: [] },
    }))
    render(<TeamTaskArchive sessionId={lead} operations={ops} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: zh['archive.title'] }))
    const title = await screen.findByText('归档任务 0')
    fireEvent.click(title)
    fireEvent.click(within(title.closest('details')!).getByRole('button', { name: zh['archive.validate'] }))
    await screen.findByText(zh['archive.changed'])
    expect(screen.queryByText(zh['archive.reusable'])).toBeNull()
    expect(screen.getByText(zh['archive.stale'])).toBeDefined()
  })
})
