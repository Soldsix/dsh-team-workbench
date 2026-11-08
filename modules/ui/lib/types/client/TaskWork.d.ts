/** Recorded task versions and independent review details in the native Team views. */
import type { TeamMemberProjection, TeamTaskView } from '@dsh-workbench/team-runtime/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { TeamProjection } from '@dsh-workbench/team-runtime/client';
import { NS, type TeamKey } from './locales.ts';
/**
 * Select the recorded workflow state without treating old completion flags as reviewed results.
 * @param task - Task from the persisted Team projection.
 * @param ownerRunning - Live Session activity; missing means no reliable activity observation.
 * @param currentGoalRevision - Confirmed goal revision used to distinguish an old plan from executable work.
 * @returns a locale key for planned work, or undefined for an ordinary legacy task.
 */
export declare function taskWorkStateKey(task: TeamTaskView, ownerRunning?: boolean, currentGoalRevision?: number): TeamKey | undefined;
/**
 * Resolve the execution owner without guessing between members with the same name.
 * @param task - Task from the persisted Team projection.
 * @param members - Members from that projection.
 * @returns the exact owner Session ID when available.
 */
export declare function taskOwnerSessionId(task: TeamTaskView, members: readonly TeamMemberProjection[]): SessionId | undefined;
/**
 * Find tasks whose visible subjects repeat without removing either task.
 * @param tasks - Current tasks in the Team projection.
 * @returns IDs of tasks whose subjects repeat.
 */
export declare function duplicateTaskSubjects(tasks: readonly TeamTaskView[]): ReadonlySet<string>;
/**
 * Observe the owner's Session activity for each task in the shared board.
 * @param team - Current Team projection.
 * @param useSessions - Session summary selector.
 * @param useSessionStatus - Live Session status selector.
 * @returns activity by task ID, with undefined when neither source knows the Session.
 */
export declare function useTaskActivities(team: TeamProjection | undefined, useSessions: PropsRuntime<'conversation.view'>['useSessions'], useSessionStatus: PropsRuntime<'conversation.view'>['useSessionStatus']): ReadonlyMap<string, boolean | undefined>;
/**
 * Display the plan, submitted evidence, and independent review as expandable task details.
 * @param props - Current task and the Team-owned translator.
 * @returns recorded workflow details, or a concise label for an unreviewed historical result.
 */
export declare function TaskWorkDetails({ task, t }: {
    task: TeamTaskView;
    t: TranslateNS<typeof NS>;
}): import("react").JSX.Element | null;
