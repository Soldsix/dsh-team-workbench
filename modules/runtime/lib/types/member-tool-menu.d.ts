/** Reduce model-visible choices to the current role, task and confirmed execution resources. */
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { TeamState } from './projection.ts';
/**
 * Select an additional exact-Session ceiling; it cannot grant absent tools.
 * @param state - Authoritative Team state for this request.
 * @param id - Exact requesting member.
 * @param names - Already resolved tool names, including the deployment's security caps.
 * @returns allowed names, or undefined outside a current V2 goal.
 */
export declare function currentMemberToolMenu(state: TeamState, id: SessionId, names: readonly string[]): string[] | undefined;
