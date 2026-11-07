/** On-demand Chinese calling examples from the tools available to this member. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/**
 * Register one small help entry without loading every workflow into the prompt.
 * @param scoped - Exact member's tool registration context.
 * @param agent - Member whose visible tools supply current parameter schemas.
 * @returns registration disposer.
 */
export declare function installHelpTool(scoped: Context, agent: Agent): () => void;
