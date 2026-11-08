/** Serialized task-work transitions; execution ids fence late submissions and reviews. */
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { TeamState } from './projection.ts';
import type { TeamTaskSnapshot, UpdateTeamTaskRequest } from './types.ts';
import type { TeamEnvironmentReceipt, TeamFileReceipt, TeamTaskPlanInput, TeamTaskWork } from './task-work-types.ts';
/**
 * Create the next plan, bound to the goal visible at this exact serialized write.
 * @param state - Current Team state.
 * @param input - Complete declared task inputs and checks.
 * @param plannerId - Exact member authoring this plan.
 * @param previous - Prior work whose plan and attempt counters must be retained.
 * @param observed - Host-observed input files and runtime when recorded.
 * @returns a new plan without an active execution or accepted result.
 */
export declare function planTaskWork(state: TeamState, input: TeamTaskPlanInput, plannerId: SessionId, previous?: TeamTaskWork, observed?: {
    inputs: TeamFileReceipt[];
    environment: TeamEnvironmentReceipt;
}): TeamTaskWork;
/**
 * Remove a current completion without deleting the earlier Session records.
 * @param task - Current task.
 * @returns a pending unowned task whose earlier result remains only in history.
 */
export declare function pendingTask(task: TeamTaskSnapshot): TeamTaskSnapshot;
/**
 * Apply a workflow action, or delegate legacy tasks to their existing transition owner.
 * @param state - Current Team state inside the write transaction.
 * @param task - Current task; a plan update may supply its newly validated definition.
 * @param request - Complete requested mutation.
 * @param callerId - Exact live caller identity.
 * @param lead - Whether the caller is the Team Lead.
 * @param observed - Host-observed plan inputs or submitted artifacts.
 * @returns the next task before its revision increment, or undefined for a legacy action.
 */
export declare function updateTaskWork(state: TeamState, task: TeamTaskSnapshot, request: UpdateTeamTaskRequest, callerId: SessionId, lead: boolean, observed?: {
    plan?: {
        inputs: TeamFileReceipt[];
        environment: TeamEnvironmentReceipt;
    };
    submission?: {
        artifacts: TeamFileReceipt[];
        environment: TeamEnvironmentReceipt;
    };
}): TeamTaskSnapshot | undefined;
