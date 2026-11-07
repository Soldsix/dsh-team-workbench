/** Operation-specific task schemas that keep submission and review evidence distinct. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/**
 * Register explicit submit and review tools while retaining team_task_update for compatibility.
 * @param scoped - Exact Agent tool scope.
 * @param agent - Current member.
 * @param ctx - Team service owner.
 * @returns effect disposers.
 */
export declare function installTaskOperationTools(scoped: Context, agent: Agent, ctx: Context): (() => void)[];
