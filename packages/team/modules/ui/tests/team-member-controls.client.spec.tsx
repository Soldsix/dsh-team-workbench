// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { TeamMemberProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { SessionId } from '@deepseek-ai/dsh-session'
import { TeamMemberControls } from '../src/client/TeamMemberControls.tsx'
import type { TeamMemberOperations } from '../src/client/member-operations.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)
const lead = SessionId('lead')
const worker: TeamMemberProjection = { id: SessionId('worker'), name: 'worker', role: 'teammate', phase: 'active' }
const t = makeTranslate(zh)

function operations(): TeamMemberOperations {
  return {
    models: vi.fn().mockResolvedValue({ default: { provider: 'primary', model: 'old-model' }, routableProviders: ['primary'], failures: [],
      groups: [{ id: 'primary', name: 'Primary', models: [{ id: 'old-model', name: 'Old model' }, { id: 'new-model', name: 'New model',
        reasoning: { efforts: [{ id: 'high', name: 'High' }, { id: 'max', name: 'Max' }] } }] }] }),
    configureRole: vi.fn().mockResolvedValue({}), configureModel: vi.fn().mockResolvedValue({}),
    workspace: vi.fn().mockResolvedValue({ cwd: 'private/worker', baselineManifestPath: 'baseline.json', maxMode: 'workspace-write' }),
    retire: vi.fn().mockResolvedValue({}),
    reactivate: vi.fn().mockResolvedValue({}),
    integrate: vi.fn().mockResolvedValue({ paths: ['src/a.ts', 'docs/report.md'] }),
  }
}

describe('member lifecycle controls', () => {
  it('retains an unlisted saved route instead of silently selecting the first provider', async () => {
    const ops = operations()
    render(<TeamMemberControls sessionId={lead} member={{ ...worker, modelProvider: 'unavailable', model: 'saved-model', reasoningEffort: 'max' }} inactive operations={ops} t={t} />)
    const save = await screen.findByRole('button', { name: zh['member.saveModel'] })
    expect(screen.getByLabelText<HTMLSelectElement>(zh['roles.provider']).value).toBe('unavailable')
    expect(screen.getByLabelText<HTMLSelectElement>(zh.model).value).toBe('saved-model')
    expect(save.hasAttribute('disabled')).toBe(true)
    expect(ops.configureModel).not.toHaveBeenCalled()
  })
  it('retains an edited model and its base revision when the server rejects a stale change', async () => {
    const ops = operations()
    vi.mocked(ops.configureModel).mockRejectedValue({ code: 'TEAM_MEMBER_STALE_REVISION', message: '模型配置已更新，请核对当前版本' })
    const view = render(<TeamMemberControls sessionId={lead} member={worker} inactive operations={ops} t={t} />)
    const save = await screen.findByRole('button', { name: zh['member.saveModel'] })
    fireEvent.change(screen.getByLabelText(zh.model), { target: { value: 'new-model' } })
    view.rerender(<TeamMemberControls sessionId={lead} member={{ ...worker, modelRouteRevision: 2, model: 'old-model', modelProvider: 'primary' }} inactive operations={ops} t={t} />)
    await screen.findByRole('button', { name: zh['member.saveModel'] })
    fireEvent.click(save.isConnected ? save : screen.getByRole('button', { name: zh['member.saveModel'] }))
    expect((await screen.findByRole('alert')).textContent).toContain('模型配置已更新')
    expect(screen.getByLabelText<HTMLSelectElement>(zh.model).value).toBe('new-model')
    expect(ops.configureModel).toHaveBeenCalledWith(lead, expect.objectContaining({ expectedRevision: 0, model: 'new-model' }), expect.any(AbortSignal))
  })
  it('assigns an idle member a responsibility with the displayed revision', async () => {
    const ops = operations()
    const view = render(<TeamMemberControls sessionId={lead} member={worker} inactive={false} operations={ops} t={t} />)
    expect(screen.getByRole('button', { name: zh['member.saveRole'] }).hasAttribute('disabled')).toBe(true)
    view.rerender(<TeamMemberControls sessionId={lead} member={worker} inactive operations={ops} t={t} />)
    fireEvent.change(screen.getByLabelText(zh['member.roleTitle']), { target: { value: 'quality_adviser' } })
    fireEvent.change(screen.getByLabelText(zh['member.roleReason']), { target: { value: 'Review independent evidence' } })
    fireEvent.click(screen.getByRole('button', { name: zh['member.saveRole'] }))
    await screen.findByText(zh['member.roleSaved'])
    expect(ops.configureRole).toHaveBeenCalledWith(lead, {
      target: 'worker', expectedRevision: 0, teamFunction: 'quality_adviser', reason: 'Review independent evidence',
    }, expect.any(AbortSignal))
    expect(ops.configureModel).not.toHaveBeenCalled()
  })

  it('keeps the member visible and reloads model choices after a catalog failure', async () => {
    const ops = operations()
    vi.mocked(ops.models).mockRejectedValueOnce(new Error('offline'))
    render(<TeamMemberControls sessionId={lead} member={worker} inactive operations={ops} t={t} />)
    expect(await screen.findByText(zh['member.modelCatalogFailed'])).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: zh['member.retryModels'] }))
    expect(await screen.findByRole('button', { name: zh['member.saveModel'] })).toBeDefined()
    expect(ops.models).toHaveBeenCalledTimes(2)
  })
  it('changes an existing teammate route in place with provider-owned choices', async () => {
    const ops = operations()
    render(<TeamMemberControls sessionId={lead} member={worker} inactive={false} operations={ops} t={t} />)
    const save = await screen.findByRole('button', { name: zh['member.saveModel'] })
    fireEvent.change(screen.getByLabelText(zh.model), { target: { value: 'new-model' } })
    fireEvent.change(screen.getByLabelText(zh.reasoningEffort), { target: { value: 'max' } })
    fireEvent.click(save)
    await screen.findByText(zh['member.modelSaved'])
    expect(ops.configureModel).toHaveBeenCalledWith(lead, {
      target: 'worker', expectedRevision: 0, modelProvider: 'primary', model: 'new-model', reasoningEffort: 'max',
    }, expect.any(AbortSignal))
  })
  it('offers a replacement only after an explicit provider choice when the saved route is unlisted', async () => {
    const ops = operations()
    const stale = { ...worker, modelProvider: 'retired-provider', model: 'retired-model', reasoningEffort: 'high' }
    render(<TeamMemberControls sessionId={lead} member={stale} inactive operations={ops} t={t} />)
    const save = await screen.findByRole('button', { name: zh['member.saveModel'] })
    expect(screen.getByLabelText<HTMLSelectElement>(zh.model).value).toBe('retired-model')
    expect(save.hasAttribute('disabled')).toBe(true)
    fireEvent.change(screen.getByLabelText(zh['roles.provider']), { target: { value: 'primary' } })
    expect(screen.getByLabelText<HTMLSelectElement>(zh['roles.provider']).value).toBe('primary')
    expect(screen.getByLabelText<HTMLSelectElement>(zh.reasoningEffort).value).toBe('')
    fireEvent.click(save)
    await screen.findByText(zh['member.modelSaved'])
    expect(ops.configureModel).toHaveBeenCalledWith(lead, {
      target: 'worker', expectedRevision: 0, modelProvider: 'primary', model: 'old-model',
    }, expect.any(AbortSignal))
  })
  it('shows private workspace integration only while inactive and reports committed paths', async () => {
    const ops = operations()
    const view = render(<TeamMemberControls sessionId={lead} member={worker} inactive={false} operations={ops} t={t} />)
    const integrate = await screen.findByRole('button', { name: zh['member.integrate'] })
    expect(integrate.hasAttribute('disabled')).toBe(true)
    view.rerender(<TeamMemberControls sessionId={lead} member={worker} inactive operations={ops} t={t} />)
    fireEvent.click(integrate)
    await screen.findByText('已集成：src/a.ts, docs/report.md')
    expect(ops.integrate).toHaveBeenCalledWith(lead, 'worker', expect.any(AbortSignal))
  })

  it('blocks repeated retirement clicks and ignores a prior selection after switching members', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<TeamMemberOperations['retire']>>>()
    const oldWorkspace = Promise.withResolvers<Awaited<ReturnType<TeamMemberOperations['workspace']>>>()
    const ops = operations()
    vi.mocked(ops.retire).mockReturnValue(pending.promise)
    vi.mocked(ops.workspace).mockImplementation((_session, target) => target === 'worker'
      ? oldWorkspace.promise : Promise.resolve(null))
    const view = render(<TeamMemberControls sessionId={lead} member={worker} inactive operations={ops} t={t} />)
    const retire = screen.getByRole('button', { name: zh['member.retire'] })
    fireEvent.click(retire)
    fireEvent.click(retire)
    expect(ops.retire).toHaveBeenCalledTimes(1)
    const next = { ...worker, id: SessionId('next-worker'), name: 'next-worker', phase: 'retired' as const }
    view.rerender(<TeamMemberControls sessionId={lead} member={next} inactive operations={ops} t={t} />)
    oldWorkspace.resolve({ cwd: 'old private workspace', baselineManifestPath: 'old.json', maxMode: 'read-only' })
    pending.resolve({ id: worker.id, name: worker.name, role: 'teammate', status: 'retired', diagnostics: [] })
    await screen.findByText(zh['member.sharedWorkspace'])
    await waitFor(() => { expect(screen.queryByText('old private workspace')).toBeNull() })
    expect(screen.queryByText(zh['member.retired'])).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: zh['member.reactivate'] }))
    expect(ops.reactivate).toHaveBeenCalledWith(lead, 'next-worker', expect.any(AbortSignal))
  })
})
