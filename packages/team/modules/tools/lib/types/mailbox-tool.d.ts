/** Explicit mailbox recovery without reissuing already durable peer messages. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/**
 * Register mailbox state and explicit recovery for one Team member.
 * @param scoped - Exact Agent-owned tool context.
 * @param agent - Exact live caller.
 * @param ctx - Team service owner.
 * @returns registration disposer.
 */
export declare function installMailboxTool(scoped: Context, agent: Agent, ctx: Context): () => void;
