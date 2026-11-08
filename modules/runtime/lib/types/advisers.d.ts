import type { TeamState } from './projection.ts';
import type { TeamTaskSnapshot } from './types.ts';
/**
 * Check whether distinct current advisers approved this submitted execution.
 * @param state - Authoritative team state.
 * @param task - Current submitted task.
 * @returns whether both required roles approved.
 */
export declare function hasDualAdviserApproval(state: TeamState, task: TeamTaskSnapshot): boolean;
/**
 * Detect the latest required adviser request for independent revision review.
 * @param state - Authoritative team state.
 * @param task - Current submitted task.
 * @returns whether a current required role requests revision.
 */
export declare function hasAdviserRevisionRequest(state: TeamState, task: TeamTaskSnapshot): boolean;
