/**
 * Bundled Chinese work skills contributed through the native skill provider.
 * @module @dsh-workbench/team
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "team-workbench-skills";
export declare const inject: string[];
/** Bounds for explicit on-demand skill reads and catalog pages. */
export interface Config {
    /** Additional user-maintained skill directories; never copied into this package or loaded wholesale. */
    additionalSkillRoots?: {
        providerName: string;
        path: string;
    }[];
    /** Maximum results per catalog page; defaults to 20. */
    maxCatalogResults?: number;
    /** Maximum bytes of one bundled document; defaults to 65536. Selection has its own Team limit. */
    maxReferenceBytes?: number;
    /** Preserve active turns while their owned background jobs run. */
    autoFollowJobs?: boolean;
    /** Presets in which background continuity and its control tool are omitted. */
    autoFollowExcludedPresets?: string[];
}
export declare const Config: z<Config>;
/**
 * Mount immutable package skills in every mode and remove them on plugin disposal.
 * @param ctx - Plugin context with the profile's skills and tool registries.
 * @param config - Catalog and document limits, independent of mode and model configuration.
 */
export declare function apply(ctx: Context, config?: Config): void;
