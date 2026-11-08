// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { TeamRoles } from '../src/client/TeamRoles.tsx'
import type { TeamRoleOperations, TeamRoleSettings } from '../src/client/role-settings.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const settings: TeamRoleSettings = {
  revision: 7,
  profiles: { reviewer: { description: '证据复核', persona: 'Keep the evidence reviewer role.', instructions: 'Read the existing results before doing new work.', modelProvider: 'first', model: 'reasoner', reasoningEffort: 'high' } },
  catalog: {
    default: { provider: 'first', model: 'reasoner' }, routableProviders: ['first', 'second'], failures: [],
    groups: [
      { id: 'first', name: 'First', models: [{ id: 'reasoner', name: 'Reasoner', reasoning: { efforts: [{ id: 'high', name: 'High' }] } }] },
      { id: 'second', name: 'Second', models: [{ id: 'small', name: 'Small', reasoning: { efforts: [{ id: 'low', name: 'Low' }] } }] },
    ],
  },
}

describe('Team role editor', () => {
  it('loads saved rules, clears an incompatible effort on model change, and writes the observed revision', async () => {
    const saveRoles = vi.fn<TeamRoleOperations['saveRoles']>().mockResolvedValue(8)
    const operations: TeamRoleOperations = { loadRoles: async () => settings, saveRoles }
    render(<TeamRoles operations={operations} t={makeTranslate(zh)} />)
    await screen.findByDisplayValue('Keep the evidence reviewer role.')
    expect(screen.getByDisplayValue('Read the existing results before doing new work.')).toBeDefined()
    fireEvent.change(screen.getByLabelText(zh['roles.provider']), { target: { value: 'second' } })
    expect(screen.queryByRole('option', { name: 'High' })).toBeNull()
    fireEvent.change(screen.getByLabelText(zh.reasoningEffort), { target: { value: 'low' } })
    fireEvent.click(screen.getByRole('button', { name: zh['roles.save'] }))
    await screen.findByText(zh['roles.saved'])
    expect(saveRoles).toHaveBeenCalledWith({ reviewer: { ...settings.profiles['reviewer'], modelProvider: 'second', model: 'small', reasoningEffort: 'low' } }, 7)
  })

  it('retains the edited persona when a concurrent settings write rejects the revision', async () => {
    const operations: TeamRoleOperations = { loadRoles: async () => settings, saveRoles: async () => { throw new Error('settings/conflict') } }
    render(<TeamRoles operations={operations} t={makeTranslate(zh)} />)
    const persona = await screen.findByLabelText(zh['roles.persona'])
    fireEvent.change(persona, { target: { value: 'Updated reviewer role' } })
    fireEvent.click(screen.getByRole('button', { name: zh['roles.save'] }))
    await waitFor(() => { expect(screen.getByRole('alert').textContent).toContain('settings/conflict') })
    expect(screen.getByDisplayValue('Updated reviewer role')).toBeDefined()
  })

  it('keeps edits made during a save marked as unsaved', async () => {
    let finishSave: (revision: number) => void = () => { throw new Error('save was not started') }
    const saveRoles = vi.fn<TeamRoleOperations['saveRoles']>().mockImplementation(() => new Promise((resolve) => { finishSave = resolve }))
    render(<TeamRoles operations={{ loadRoles: async () => settings, saveRoles }} t={makeTranslate(zh)} />)
    const persona = await screen.findByLabelText(zh['roles.persona'])
    fireEvent.change(persona, { target: { value: 'Draft A' } })
    fireEvent.click(screen.getByRole('button', { name: zh['roles.save'] }))
    fireEvent.change(persona, { target: { value: 'Draft B' } })
    finishSave(8)
    await waitFor(() => { expect(screen.getByRole('button', { name: zh['roles.save'] })).toHaveProperty('disabled', false) })
    expect(screen.getByDisplayValue('Draft B')).toBeDefined()
    expect(screen.queryByText(zh['roles.saved'])).toBeNull()
    expect(saveRoles).toHaveBeenCalledWith({ reviewer: { ...settings.profiles.reviewer, persona: 'Draft A' } }, 7)
    fireEvent.click(screen.getByRole('button', { name: zh['roles.save'] }))
    expect(saveRoles).toHaveBeenLastCalledWith({ reviewer: { ...settings.profiles.reviewer, persona: 'Draft B' } }, 8)
    finishSave(9)
    await screen.findByText(zh['roles.saved'])
  })

  it('reloads a conflicting revision while keeping the edited role', async () => {
    const loadRoles = vi.fn<TeamRoleOperations['loadRoles']>()
      .mockResolvedValueOnce(settings)
      .mockResolvedValueOnce({ ...settings, revision: 8, profiles: {
        reviewer: { ...settings.profiles.reviewer!, description: 'Updated elsewhere' },
        writer: { description: 'Added elsewhere', persona: 'Write findings.', instructions: '' },
      } })
    const saveRoles = vi.fn<TeamRoleOperations['saveRoles']>()
      .mockRejectedValueOnce(new Error('settings/conflict')).mockResolvedValueOnce(9)
    render(<TeamRoles operations={{ loadRoles, saveRoles }} t={makeTranslate(zh)} />)
    const persona = await screen.findByLabelText(zh['roles.persona'])
    fireEvent.change(persona, { target: { value: 'Local draft' } })
    fireEvent.click(screen.getByRole('button', { name: zh['roles.save'] }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: zh['roles.reload'] }))
    await waitFor(() => { expect(loadRoles).toHaveBeenCalledTimes(2) })
    expect(screen.getByDisplayValue('Local draft')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: zh['roles.save'] }))
    await waitFor(() => { expect(saveRoles).toHaveBeenLastCalledWith({
      reviewer: { ...settings.profiles.reviewer, description: 'Updated elsewhere', persona: 'Local draft' },
      writer: { description: 'Added elsewhere', persona: 'Write findings.', instructions: '' },
    }, 8) })
  })
})
