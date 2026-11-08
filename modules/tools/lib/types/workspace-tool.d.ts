/** Explicit inspection and Lead-owned integration of private member workspaces. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/**
 * Register workspace operations for one live Team member.
 * @param scoped - Member-owned registration context.
 * @param agent - Exact live caller retained by each operation.
 * @param ctx - Plugin context declaring the Team service.
 * @returns the tool registration disposer.
 */
export declare function installWorkspaceTool(scoped: Context, agent: Agent, ctx: Context): () => void;
