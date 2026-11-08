/** On-demand Team history inspection and retained-member lifecycle tools. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/**
 * Register retained-member and bounded task-history operations.
 * @param scoped - Exact caller's registration scope.
 * @param agent - Live caller used for service admission.
 * @param ctx - Plugin context declaring the Team service.
 * @param freshProvider - Configured provider for a successor's new Session.
 * @returns the combined registration disposer.
 */
export declare function installHistoryTools(scoped: Context, agent: Agent, ctx: Context, freshProvider: string): () => void;
