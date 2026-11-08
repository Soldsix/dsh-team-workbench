/** Human-readable review text with proposal content kept inside labelled fields. */
import type { TeamGoalProposal, TeamGoalSnapshot } from './goal-types.ts';
/**
 * Show the complete current and proposed scope before the human decides.
 * @param proposal - Exact durable proposal being reviewed.
 * @param current - Current confirmed goal, if present.
 * @returns Markdown suitable for the native plan-review component.
 */
export declare function renderGoalReview(proposal: TeamGoalProposal, current: TeamGoalSnapshot | undefined): string;
