// @vitest-environment jsdom

/** Human review, concurrent goal edits, and editor navigation. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate, RemoteError, TestRemote } from '@deepseek-ai/dsh-client-test-runtime'
import { Context } from '@deepseek-ai/cordis'
import type { TeamGoalDefinition, TeamGoalReview } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { TeamGoals } from '../src/client/TeamGoals.tsx'
import type { TeamGoalOperations } from '../src/client/goal-operations.ts'
import { createTeamGoalOperations } from '../src/client/goal-operations.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)
const ROOT = 'goal-lead' as SessionId
const t = makeTranslate(zh)
const openReview = vi.fn()
const definition: TeamGoalDefinition = {
  objective: 'Review the local SDK', acceptanceCriteria: ['Reproduce the recorded output'],
  plan: 'lead: mock/high coordinates; reviewer: mock/high checks evidence.',
  scope: { coverage: 'task', targets: ['Local SDK'], allowedActions: ['Read and test the fixture'],
    excludedTargets: ['External services'], constraints: ['Preserve originals'] },
}
const confirmed: TeamGoalReview = {
  goal: { revision: 2, proposalRevision: 3, status: 'active', definition, decidedAt: 1 },
  goalProposal: { revision: 3, baseRevision: 1, proposedBy: ROOT, change: { kind: 'replace', definition } },
  goalDecision: { proposalRevision: 3, outcome: 'accepted', comment: '', decidedAt: 1, channel: 'user-question' },
}

function operations() {
  return {
    propose: vi.fn<TeamGoalOperations['propose']>().mockImplementation(async (_id, request) => ({
      revision: request.expectedProposalRevision + 1, baseRevision: request.expectedGoalRevision, proposedBy: ROOT, change: request.change,
    })),
    review: vi.fn<TeamGoalOperations['review']>().mockResolvedValue({}),
  }
}

function field(key: 'objective' | 'plan' | 'acceptanceCriteria' | 'targets' | 'allowedActions', value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: zh[`goals.${key}`] }), { target: { value } })
}

describe('native Team goal editor', () => {
  it('routes reviews to the Lead and cancels them when the owning plugin is disposed', async () => {
    const ctx = new Context()
    const reviewGoal = vi.fn(async (_id: SessionId, _revision: number, signal: AbortSignal) => {
      await new Promise<void>((resolve) => { signal.addEventListener('abort', () => { resolve() }, { once: true }) })
      return { ok: false as const, error: new RemoteError('gateway/cancelled', 'cancelled', {}) }
    })
    new TestRemote(ctx, { agentTeams: { reviewGoal } })
    const ops = createTeamGoalOperations(ctx, () => ROOT)
    const outcome = ops.review('child' as SessionId, 3).catch((error: unknown) => error)
    try {
      expect(reviewGoal).toHaveBeenCalledWith(ROOT, 3, expect.any(AbortSignal))
      expect(reviewGoal.mock.calls[0]?.[2].aborted).toBe(false)
    } finally { await ctx.fiber.dispose() }
    expect(reviewGoal.mock.calls[0]?.[2].aborted).toBe(true)
    expect(await outcome).toMatchObject({ code: 'gateway/cancelled' })
  })

  it('requires a complete proposal and shows no confirmation before a human decision arrives', async () => {
    const ops = operations()
    const answer = Promise.withResolvers<TeamGoalReview>()
    ops.review.mockReturnValue(answer.promise)
    render(<TeamGoals sessionId={ROOT} state={{}} operations={ops} openReview={openReview} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: zh['goals.create'] }))
    fireEvent.click(screen.getByRole('button', { name: zh['goals.saveAndReview'] }))
    expect(screen.getByRole('alert').textContent).toBe(zh['goals.invalid'])
    expect(ops.propose).not.toHaveBeenCalled()
    field('objective', 'Analyze the local fixture')
    field('plan', 'lead: mock/high coordinates; reader: mock/high compares outputs.')
    field('acceptanceCriteria', 'Compare outputs\n Retain evidence \n')
    field('targets', 'Fixture file')
    field('allowedActions', 'Read the fixture')
    fireEvent.click(screen.getByRole('button', { name: zh['goals.saveAndReview'] }))
    await screen.findByText(zh['goals.reviewing'])
    expect(ops.propose).toHaveBeenCalledWith(ROOT, {
      expectedGoalRevision: 0, expectedProposalRevision: 0, change: { kind: 'replace', definition: {
        objective: 'Analyze the local fixture', acceptanceCriteria: ['Compare outputs', 'Retain evidence'],
        plan: 'lead: mock/high coordinates; reader: mock/high compares outputs.',
        scope: { coverage: 'task', targets: ['Fixture file'], allowedActions: ['Read the fixture'], excludedTargets: [], constraints: [],
          execution: { readPaths: ['.'], writePaths: [], webOrigins: [], allowSearch: true, allowUnrestrictedExecution: false } },
      } },
    }, expect.any(AbortSignal))
    expect(ops.review).toHaveBeenCalledWith(ROOT, 1)
    expect(openReview).toHaveBeenCalledOnce()
    expect(screen.getByText(zh['goals.unconfirmed'])).toBeDefined()
    await act(async () => { answer.resolve({}) })
  })

  it('retains a draft while a concurrent proposal arrives and requires review of the new revisions', async () => {
    const ops = operations()
    const view = render(<TeamGoals sessionId={ROOT} state={confirmed} operations={ops} openReview={openReview} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: zh['goals.edit'] }))
    field('objective', 'My retained objective')
    const latest: TeamGoalReview = { ...confirmed,
      goalProposal: { revision: 4, baseRevision: 2, proposedBy: ROOT, change: { kind: 'replace', definition: { ...definition, objective: 'Another proposal' } } },
    }
    view.rerender(<TeamGoals sessionId={ROOT} state={latest} operations={ops} openReview={openReview} t={t} />)
    expect(screen.getByDisplayValue('My retained objective')).toBeDefined()
    expect(screen.getByRole('button', { name: zh['goals.saveAndReview'] })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: zh['goals.keepDraft'] }))
    fireEvent.click(screen.getByRole('button', { name: zh['goals.saveAndReview'] }))
    await waitFor(() => { expect(ops.review).toHaveBeenCalledWith(ROOT, 5) })
    expect(ops.propose.mock.calls[0]?.[1]).toMatchObject({ expectedGoalRevision: 2, expectedProposalRevision: 4,
      change: { definition: { objective: 'My retained objective' } } })
  })

  it('keeps rejected scope active and requires a reason before proposing revocation', async () => {
    const ops = operations()
    const state: TeamGoalReview = { ...confirmed,
      goalProposal: { revision: 4, baseRevision: 2, proposedBy: ROOT, change: { kind: 'revoke', reason: 'Rejected withdrawal' } },
      goalDecision: { proposalRevision: 4, outcome: 'rejected', comment: 'Continue the original task', decidedAt: 2, channel: 'user-question' },
    }
    render(<TeamGoals sessionId={ROOT} state={state} operations={ops} openReview={openReview} t={t} />)
    expect(screen.getByText('已确认 · 版本 2')).toBeDefined()
    expect(screen.getByText(/Continue the original task/u)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: zh['goals.revoke'] }))
    fireEvent.click(screen.getByRole('button', { name: zh['goals.saveAndReview'] }))
    expect(screen.getByRole('alert').textContent).toBe(zh['goals.reasonRequired'])
    expect(ops.propose).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox', { name: zh['goals.reason'] }), { target: { value: 'User stopped this task' } })
    fireEvent.click(screen.getByRole('button', { name: zh['goals.saveAndReview'] }))
    await waitFor(() => { expect(ops.review).toHaveBeenCalledWith(ROOT, 5) })
    expect(ops.propose.mock.calls[0]?.[1].change).toEqual({ kind: 'revoke', reason: 'User stopped this task' })
  })

  it('restores the retained definition as a new proposal instead of silently reactivating a revoked goal', async () => {
    const ops = operations()
    const state: TeamGoalReview = { ...confirmed,
      goal: { ...confirmed.goal!, revision: 3, proposalRevision: 4, status: 'revoked', revocationReason: 'Stopped' },
      goalProposal: { revision: 4, baseRevision: 2, proposedBy: ROOT, change: { kind: 'revoke', reason: 'Stopped' } },
      goalDecision: { ...confirmed.goalDecision!, proposalRevision: 4 },
    }
    render(<TeamGoals sessionId={ROOT} state={state} operations={ops} openReview={openReview} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: zh['goals.restore'] }))
    expect(screen.getByDisplayValue(definition.objective)).toBeDefined()
    expect(ops.propose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: zh['goals.saveAndReview'] }))
    await waitFor(() => { expect(ops.review).toHaveBeenCalledWith(ROOT, 5) })
    expect(ops.propose.mock.calls[0]?.[1]).toEqual({ expectedGoalRevision: 3, expectedProposalRevision: 4,
      change: { kind: 'replace', definition: { ...definition, scope: { ...definition.scope,
        execution: { readPaths: ['.'], writePaths: [], webOrigins: [], allowSearch: true, allowUnrestrictedExecution: false } } } } })
  })

  it('retains an edit on a Host revision conflict', async () => {
    const ops = operations()
    ops.propose.mockRejectedValue(new RemoteError('TEAM_GOAL_STALE', 'changed', { goalRevision: 2, proposalRevision: 4 }))
    render(<TeamGoals sessionId={ROOT} state={confirmed} operations={ops} openReview={openReview} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: zh['goals.edit'] }))
    field('objective', 'Retain this edit')
    fireEvent.click(screen.getByRole('button', { name: zh['goals.saveAndReview'] }))
    await screen.findByText(zh['goals.conflict'])
    expect(screen.getByDisplayValue('Retain this edit')).toBeDefined()
    expect(ops.review).not.toHaveBeenCalled()
  })

  it('cancels an admitted save on disposal without starting a later review', async () => {
    const ops = operations()
    const saved = Promise.withResolvers<Awaited<ReturnType<TeamGoalOperations['propose']>>>()
    ops.propose.mockReturnValue(saved.promise)
    const view = render(<TeamGoals sessionId={ROOT} state={confirmed} operations={ops} openReview={openReview} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: zh['goals.edit'] }))
    fireEvent.click(screen.getByRole('button', { name: zh['goals.saveAndReview'] }))
    view.unmount()
    expect(ops.propose.mock.calls[0]?.[2].aborted).toBe(true)
    await act(async () => { saved.resolve({ revision: 4, baseRevision: 2, proposedBy: ROOT, change: { kind: 'replace', definition } }) })
    expect(ops.review).not.toHaveBeenCalled()
  })
})
