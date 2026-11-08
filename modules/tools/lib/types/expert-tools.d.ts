/** Scoped catalog tools for durable expert profiles and continuation reuse. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/**
 * Register expert tools in one enabled Team member scope.
 * @param agent - Exact live member owning the tool registrations.
 * @param ctx - Plugin context with the expert service.
 * @param providers - Configured continuable-subagent routes.
 * @returns a disposer for this member's tool registrations.
 */
export declare function installExpertTools(agent: Agent, ctx: Context, providers: {
    readonly freshProvider: string;
    readonly forkProvider: string;
    readonly expertCatalogPageSize: number;
    readonly maxExpertCatalogBytes: number;
    readonly maxExpertProfileBytes: number;
    readonly requireMemberSkills: boolean;
}): () => void;
