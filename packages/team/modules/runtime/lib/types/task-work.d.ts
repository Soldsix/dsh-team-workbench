/** Task-plan parsing and pure checks of execution and dependency versions. */
import { z } from 'zod';
import type { TeamTaskValidity, TeamTaskWork } from './task-work-types.ts';
import type { TeamState } from './projection.ts';
import type { TeamTaskSnapshot } from './types.ts';
/** Validation at model, persisted-file, and remote task-plan inputs. */
export declare const taskPlanInputSchema: z.ZodObject<{
    inputVersion: z.ZodString;
    environmentVersion: z.ZodString;
    acceptanceCriteria: z.ZodArray<z.ZodString>;
    adviserGate: z.ZodOptional<z.ZodLiteral<"dual">>;
    inputPaths: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
/** Durable work records validate their internal execution and review relationships. */
export declare const taskWorkSchema: z.ZodType<TeamTaskWork>;
/**
 * Check the goal and dependency versions captured by an execution.
 * @param state - Current Team state.
 * @param task - Task whose execution or result is being considered.
 * @returns concrete changes that require a new plan or execution.
 */
export declare function taskWorkChanges(state: TeamState, task: TeamTaskSnapshot): string[];
/**
 * Distinguish an independently accepted result from an unverified or stale record.
 * @param state - Current Team state.
 * @param task - Task whose current result is requested.
 * @returns whether this exact recorded result remains reusable under its declared versions.
 */
export declare function taskValidity(state: TeamState, task: TeamTaskSnapshot): TeamTaskValidity;
/**
 * Check recorded goal, dependency, plan, and review relationships without reading files.
 * @param state - Current Team state.
 * @param task - Recorded result under consideration.
 * @returns structural acceptance that is insufficient for live reuse.
 */
export declare function taskRecordValidity(state: TeamState, task: TeamTaskSnapshot): TeamTaskValidity;
