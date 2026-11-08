/** Scoped model-facing tools for the opt-in Agent Teams runtime. */
import type { Context, Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { TeamRoleProfile } from 'dsh-team-workbench/runtime';
/** Cordis plugin name. */
export declare const name = "tool-agent-team";
/** Services required by the Team tool plugin. */
export declare const inject: string[];
/** Tool routing configuration. */
export interface Config {
    /** Continuable-subagent provider used for fresh teammates. */
    readonly freshProvider?: string;
    /** Continuable-subagent provider used for completed-prefix fork teammates. */
    readonly forkProvider?: string;
    /** Permit task-driven team assembly without repeating an explicit team request. */
    readonly automaticTeams?: boolean;
    /** Give every created member a persisted role even when the call omits persona. */
    readonly bindMemberPersonas?: boolean;
    /** Require the full member and task plan when the model proposes a Team goal. */
    readonly requireDetailedPlan?: boolean;
    /** Maximum UTF-8 bytes of per-member plan references in the standing goal context. */
    readonly maxPlanContextBytes?: number;
    /** Require a task-specific selected skill before creating a new member. */
    readonly requireMemberSkills?: boolean;
    /** Saved model and role choices used when a creation selects the named profile. */
    readonly memberProfiles?: Volatile<Record<string, TeamRoleProfile>>;
    /** Maximum expert summaries returned in one model-visible catalog page. */
    readonly expertCatalogPageSize?: number;
    /** Maximum UTF-8 bytes in a complete expert catalog page. */
    readonly maxExpertCatalogBytes?: number;
    /** Maximum UTF-8 bytes returned when reading one complete expert profile. */
    readonly maxExpertProfileBytes?: number;
}
/** Plain values accepted before Loader creates volatile role references. */
export type Options = Omit<Config, 'memberProfiles'> & {
    readonly memberProfiles?: Record<string, TeamRoleProfile>;
};
/** Loader schema for the opt-in Team tool plugin. */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    freshProvider: z<string, string, "defined">;
    forkProvider: z<string, string, "defined">;
    automaticTeams: z<boolean, boolean, "defined">;
    bindMemberPersonas: z<boolean, boolean, "defined">;
    requireDetailedPlan: z<boolean, boolean, "defined">;
    maxPlanContextBytes: z<number, number, "defined">;
    requireMemberSkills: z<boolean, boolean, "defined">;
    memberProfiles: z<NoInfer<import("@deepseek-ai/cosmokit").Dict<TeamRoleProfile, string>>, NoInfer<import("@deepseek-ai/cosmokit").Dict<TeamRoleProfile, string>>, "volatile-defined">;
    expertCatalogPageSize: z<number, number, "defined">;
    maxExpertCatalogBytes: z<number, number, "defined">;
    maxExpertProfileBytes: z<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    freshProvider: z<string, string, "defined">;
    forkProvider: z<string, string, "defined">;
    automaticTeams: z<boolean, boolean, "defined">;
    bindMemberPersonas: z<boolean, boolean, "defined">;
    requireDetailedPlan: z<boolean, boolean, "defined">;
    maxPlanContextBytes: z<number, number, "defined">;
    requireMemberSkills: z<boolean, boolean, "defined">;
    memberProfiles: z<NoInfer<import("@deepseek-ai/cosmokit").Dict<TeamRoleProfile, string>>, NoInfer<import("@deepseek-ai/cosmokit").Dict<TeamRoleProfile, string>>, "volatile-defined">;
    expertCatalogPageSize: z<number, number, "defined">;
    maxExpertCatalogBytes: z<number, number, "defined">;
    maxExpertProfileBytes: z<number, number, "defined">;
}>>, "plain">;
/** Install Team tools in every live or subsequently published Team member scope. */
export declare function apply(ctx: Context, config?: Config): void;
/**
 * Keep one plugin-owned installation per enabled live Team member, including blank-session mode changes.
 * @param ctx - Plugin context owning the installation and lifecycle listeners.
 * @param installScope - Registers contributions for the exact member and returns their combined disposer.
 */
export declare function installOnTeamScopes(ctx: Context, installScope: (agent: Agent) => () => void): void;
