/** On-demand independent adviser findings for key submitted Team results. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/**
 * Register the current-execution adviser review tool in one Team member scope.
 * @param scoped - Exact member's tool registration scope.
 * @param agent - Member recording or reading the finding.
 * @param ctx - Team service context.
 * @returns tool registration disposer.
 */
export declare function installAdviserTool(scoped: Context, agent: Agent, ctx: Context): () => void;
