// @vitest-environment jsdom

/** Catalog editing, concurrent revisions, and existing Team navigation. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate, RemoteError } from '@deepseek-ai/dsh-client-test-runtime'
import type { TeamExpertId, TeamExpertView, TeamMemberProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { TeamExperts } from '../src/client/TeamExperts.tsx'
import type { TeamExpertCatalog, TeamExpertOperations } from '../src/client/expert-catalog.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const profile: TeamExpertView = {
  id: 'protocol-expert' as TeamExpertId, revision: 4, createdAt: 1, updatedAt: 2, archived: false,
  definition: { name: '协议专家', description: '审阅协议', persona: 'Keep evidence.', instructions: 'Retain verified work.', skills: ['protocol-reverse'], modelProvider: 'first', model: 'reasoner', reasoningEffort: 'high' },
}
const catalog: TeamExpertCatalog = {
  profiles: [profile],
  models: { default: { provider: 'first', model: 'reasoner' }, routableProviders: ['first', 'second'], failures: [], groups: [
    { id: 'first', name: 'First', models: [{ id: 'reasoner', name: 'Reasoner', reasoning: { efforts: [{ id: 'high', name: 'High' }] } }] },
    { id: 'second', name: 'Second', models: [{ id: 'small', name: 'Small', reasoning: { efforts: [{ id: 'low', name: 'Low' }] } }] },
  ] },
}
const t = makeTranslate(zh)

function renderEditor(operations: TeamExpertOperations, members: readonly TeamMemberProjection[] = [], openMember = vi.fn()) {
  return render(<TeamExperts operations={operations} members={members} openMember={openMember} t={t} />)
}

describe('native expert catalog', () => {
  it('keeps provider defaults and saves only the selected profile at its observed revision', async () => {
    const save = vi.fn<TeamExpertOperations['save']>().mockImplementation(async (definition, previous, archived) => ({ ...profile, definition, archived, revision: previous!.revision + 1 }))
    renderEditor({ load: async () => catalog, save })
    await screen.findByDisplayValue('Keep evidence.')
    fireEvent.change(screen.getByLabelText(zh['roles.provider']), { target: { value: 'second' } })
    expect(screen.queryByRole('option', { name: 'High' })).toBeNull()
    fireEvent.change(screen.getByLabelText(zh.reasoningEffort), { target: { value: 'low' } })
    fireEvent.change(screen.getByLabelText(zh['experts.skills']), { target: { value: 'protocol-reverse\n js-reverse \n' } })
    fireEvent.click(screen.getByRole('button', { name: zh['experts.save'] }))
    await screen.findByText(zh['experts.saved'])
    expect(save).toHaveBeenCalledWith({ ...profile.definition, modelProvider: 'second', model: 'small', reasoningEffort: 'low', skills: ['protocol-reverse', 'js-reverse'] }, profile, false, expect.any(AbortSignal))
    expect(screen.getByText('版本 5')).toBeDefined()
  })

  it('retains unsaved profiles across selection and catalog refresh', async () => {
    const other: TeamExpertView = { ...profile, id: 'reviewer' as TeamExpertId, definition: { ...profile.definition, name: '复核专家' } }
    const load = vi.fn<TeamExpertOperations['load']>().mockResolvedValue({ ...catalog, profiles: [profile, other] })
    renderEditor({ load, save: vi.fn() })
    await screen.findByDisplayValue('Keep evidence.')
    fireEvent.change(screen.getByLabelText(zh['roles.persona']), { target: { value: 'My retained draft.' } })
    fireEvent.click(screen.getByRole('button', { name: /复核专家/u }))
    expect(screen.getByDisplayValue('Keep evidence.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: zh['experts.refresh'] }))
    await waitFor(() => { expect(load).toHaveBeenCalledTimes(2) })
    fireEvent.click(screen.getByRole('button', { name: /协议专家/u }))
    expect(screen.getByDisplayValue('My retained draft.')).toBeDefined()
  })

  it('keeps a conflicting edit until the user explicitly loads the newer revision', async () => {
    const latest = { ...profile, revision: 5, definition: { ...profile.definition, persona: 'Saved elsewhere.' } }
    const load = vi.fn<TeamExpertOperations['load']>().mockResolvedValueOnce(catalog).mockResolvedValue({ ...catalog, profiles: [latest] })
    const save = vi.fn<TeamExpertOperations['save']>().mockRejectedValue(new RemoteError('team-expert/stale-revision', 'changed', { expectedRevision: 4, actualRevision: 5 }))
    renderEditor({ load, save })
    await screen.findByDisplayValue('Keep evidence.')
    fireEvent.change(screen.getByLabelText(zh['roles.persona']), { target: { value: 'My retained draft.' } })
    fireEvent.click(screen.getByRole('button', { name: zh['experts.save'] }))
    await screen.findByText(zh['experts.conflict'])
    await screen.findByText('目录已有版本 5，你的编辑仍然保留。')
    expect(screen.getByDisplayValue('My retained draft.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: zh['experts.reloadSelected'] }))
    expect(screen.getByDisplayValue('Saved elsewhere.')).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('archives and restores an expert without losing the existing Team conversation', async () => {
    const save = vi.fn<TeamExpertOperations['save']>().mockImplementation(async (definition, previous, archived) => ({ ...profile, definition, archived, revision: previous!.revision + 1 }))
    const member = { id: 'retained-session' as SessionId, name: 'worker', role: 'teammate', phase: 'active', expert: { id: profile.id, name: profile.definition.name, revision: 2 } } as TeamMemberProjection
    const open = vi.fn()
    renderEditor({ load: async () => catalog, save }, [member], open)
    await screen.findByDisplayValue('Keep evidence.')
    fireEvent.click(screen.getByLabelText(zh['experts.archive']))
    fireEvent.click(screen.getByRole('button', { name: zh['experts.save'] }))
    await screen.findByText('版本 5')
    expect(save.mock.calls[0]?.[2]).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: zh.open }))
    expect(open).toHaveBeenCalledWith(member.id)
    expect(screen.getByText('worker · 版本 2')).toBeDefined()
    fireEvent.click(screen.getByLabelText(zh['experts.archive']))
    fireEvent.click(screen.getByRole('button', { name: zh['experts.save'] }))
    await screen.findByText('版本 6')
    expect(save.mock.calls[1]?.[1]?.revision).toBe(5)
    expect(save.mock.calls[1]?.[2]).toBe(false)
  })

  it('creates one new expert and rejects empty required fields before saving', async () => {
    const save = vi.fn<TeamExpertOperations['save']>().mockImplementation(async definition => ({ ...profile, definition, revision: 1 }))
    renderEditor({ load: async () => ({ ...catalog, profiles: [] }), save })
    await screen.findByText(zh['experts.empty'])
    fireEvent.click(screen.getByRole('button', { name: zh['experts.add'] }))
    fireEvent.click(screen.getByRole('button', { name: zh['experts.save'] }))
    expect(screen.getByRole('alert').textContent).toBe(zh['experts.invalid'])
    expect(save).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(zh['experts.name']), { target: { value: '新专家' } })
    fireEvent.change(screen.getByLabelText(zh['roles.description']), { target: { value: '代码复核' } })
    fireEvent.change(screen.getByLabelText(zh['roles.persona']), { target: { value: 'Review code.' } })
    fireEvent.click(screen.getByRole('button', { name: zh['experts.save'] }))
    await screen.findByText('版本 1')
    expect(save.mock.calls[0]?.[1]).toBeNull()
    expect(screen.getAllByRole('button', { name: /新专家/u })).toHaveLength(1)
  })

  it('cancels its pending catalog load when the editor is disposed', async () => {
    let signal: AbortSignal | undefined
    const result = Promise.withResolvers<TeamExpertCatalog>()
    const editor = renderEditor({ load: (value) => { signal = value; return result.promise }, save: vi.fn() })
    editor.unmount()
    expect(signal?.aborted).toBe(true)
    result.reject(new RemoteError('gateway/cancelled', 'cancelled', {}))
    await Promise.resolve()
  })
})
