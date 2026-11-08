/** Expert catalog operations over the plugin's authenticated Remote namespace. */
import type { Context } from '@deepseek-ai/cordis';
import type { ModelCatalog } from '@deepseek-ai/dsh-api-session-controller/types';
import type { TeamExpertDefinition, TeamExpertView } from '@dsh-workbench/team-runtime/client';
/** Durable profiles together with the configured model choices. */
export interface TeamExpertCatalog {
    readonly profiles: readonly TeamExpertView[];
    readonly models: ModelCatalog;
}
/** Catalog operations used by the native editor; none starts a model turn. */
export interface TeamExpertOperations {
    /** Read all profiles, including archived ones, and current model choices. */
    load(signal: AbortSignal): Promise<TeamExpertCatalog>;
    /** Create or revise one profile at the editor's last observed revision. */
    save(definition: TeamExpertDefinition, previous: TeamExpertView | null, archived: boolean, signal: AbortSignal): Promise<TeamExpertView>;
}
/**
 * Bind catalog operations without changing the model or mode settings.
 * @param ctx - Client context declaring remote, remote.teamExperts, and remote.session.
 * @returns cancellable reads and revision-checked profile writes.
 */
export declare function createTeamExpertOperations(ctx: Context): TeamExpertOperations;
