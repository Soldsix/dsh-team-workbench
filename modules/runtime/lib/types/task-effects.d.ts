/** Durable dispatch observations and conservative recovery of task attempts. */
import { z } from 'zod';
import type { TeamState } from './projection.ts';
import type { TeamTaskSnapshot } from './types.ts';
import type { TeamTaskEffectEvent } from './task-work-types.ts';
/**
 * Return whether a tool needs an opaque dispatch record for task recovery.
 * @param name - Registered tool name.
 * @param args - Logged tool JSON for action-specific read-only observations.
 * @returns whether task recovery must track its dispatch.
 */
export declare function taskToolNeedsEffectTracking(name: string, args?: unknown): boolean;
/** JSON validation for one logged dispatch observation. */
export declare const taskEffectEventSchema: z.ZodType<TeamTaskEffectEvent>;
/**
 * Apply a dispatch observation after validating its exact task and call identity.
 * @param state - accepted Team state before the event.
 * @param event - decoded dispatch observation.
 * @returns latest observation for each call, including settled calls.
 */
export declare function applyTaskEffectEvent(state: TeamState, event: TeamTaskEffectEvent): TeamTaskEffectEvent[];
/**
 * Identify an attempt whose external effects have not been independently reviewed.
 * @param state - current Team state with durable dispatch observations.
 * @param task - task whose latest execution may be resumed or replaced.
 * @returns whether independent recovery is required.
 */
export declare function taskEffectsNeedReview(state: TeamState, task: TeamTaskSnapshot): boolean;
/**
 * Count logged calls in the latest attempt, including calls that settled.
 * @param state - Current Team state with durable dispatch observations.
 * @param task - Task whose latest attempt is inspected.
 * @returns distinct calls in that attempt.
 */
export declare function taskEffectCallCount(state: TeamState, task: TeamTaskSnapshot): number;
