/** Revision and review transitions for Team-owned goal events. */
import type { TeamGoalDecision, TeamGoalProposal, TeamGoalReview, TeamGoalSnapshot } from './goal-types.ts';
/**
 * Validate a proposal against the current review state.
 * @param state - Prior projected goal records.
 * @param proposal - Parsed replacement proposal.
 */
export declare function assertGoalProposal(state: TeamGoalReview, proposal: TeamGoalProposal): void;
/**
 * Derive the current goal from the exact reviewed proposal; rejection retains it.
 * @param state - Prior projected goal records.
 * @param decision - Parsed user answer.
 * @returns the unchanged or newly confirmed goal.
 */
export declare function applyGoalDecision(state: TeamGoalReview, decision: TeamGoalDecision): TeamGoalSnapshot | undefined;
