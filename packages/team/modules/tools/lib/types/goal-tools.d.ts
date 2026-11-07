/** Native user review and logged current-goal context for the Team tool composition. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/**
 * Register the goal proposal tool and the current confirmed goal in one Agent scope.
 * @param scoped - Exact Agent-owned tool and prompt context.
 * @param agent - Live member receiving the context.
 * @param ctx - Plugin context owning the Team service.
 * @param requireDetailedPlan - Whether new model proposals must include the complete plan.
   * @param maxPlanContextBytes - Maximum standing structured-plan summary bytes.
 * @returns disposers for both contributions.
 */
export declare function installGoalTools(scoped: Context, agent: Agent, ctx: Context, requireDetailedPlan: boolean, maxPlanContextBytes?: number): Array<() => unknown>;
