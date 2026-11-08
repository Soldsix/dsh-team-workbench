/** Revision and review transitions for Team-owned goal events. */

import type { TeamGoalDecision, TeamGoalProposal, TeamGoalReview, TeamGoalSnapshot } from './goal-types.ts'

/**
 * Validate a proposal against the current review state.
 * @param state - Prior projected goal records.
 * @param proposal - Parsed replacement proposal.
 */
export function assertGoalProposal(state: TeamGoalReview, proposal: TeamGoalProposal): void {
  if (proposal.revision !== (state.goalProposal?.revision ?? 0) + 1) throw new Error('goal proposal revision is not contiguous')
  if (proposal.baseRevision !== (state.goal?.revision ?? 0)) throw new Error('goal proposal has a stale goal revision')
  if (proposal.change.kind === 'revoke' && state.goal?.status !== 'active') throw new Error('only an active goal can be revoked')
}

/**
 * Derive the current goal from the exact reviewed proposal; rejection retains it.
 * @param state - Prior projected goal records.
 * @param decision - Parsed user answer.
 * @returns the unchanged or newly confirmed goal.
 */
export function applyGoalDecision(state: TeamGoalReview, decision: TeamGoalDecision): TeamGoalSnapshot | undefined {
  const proposal = state.goalProposal
  if (proposal === undefined || proposal.revision !== decision.proposalRevision) throw new Error('goal decision names a superseded or absent proposal')
  if (state.goalDecision?.proposalRevision === proposal.revision) throw new Error('goal proposal was already reviewed')
  if (proposal.baseRevision !== (state.goal?.revision ?? 0)) throw new Error('goal decision has a stale goal revision')
  if (decision.outcome === 'rejected') return state.goal
  const revision = (state.goal?.revision ?? 0) + 1
  if (!Number.isSafeInteger(revision)) throw new Error('goal revision limit reached')
  const common = { revision, proposalRevision: proposal.revision, decidedAt: decision.decidedAt }
  if (proposal.change.kind === 'replace') return { ...common, status: 'active', definition: proposal.change.definition }
  if (state.goal?.status !== 'active') throw new Error('only an active goal can be revoked')
  return { ...common, status: 'revoked', definition: state.goal.definition, revocationReason: proposal.change.reason }
}
