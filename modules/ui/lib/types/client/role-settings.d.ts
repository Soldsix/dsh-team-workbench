/** Saved Team roles edited through the existing revision-checked Settings API. */
import type { Context } from '@deepseek-ai/cordis';
import type { ModelCatalog } from '@deepseek-ai/dsh-api-session-controller/types';
import type { TeamRoleProfile } from 'dsh-team-workbench/runtime/client';
/** One editable settings generation and its current model choices. */
export interface TeamRoleSettings {
    readonly revision: number;
    readonly profiles: Record<string, TeamRoleProfile>;
    readonly catalog: ModelCatalog;
}
/** Host operations used by the role editor. */
export interface TeamRoleOperations {
    /** Read role profiles and exact provider-owned reasoning choices. */
    loadRoles(): Promise<TeamRoleSettings>;
    /** Replace the role dictionary at its observed settings revision. */
    saveRoles(profiles: Record<string, TeamRoleProfile>, revision: number): Promise<number>;
}
/**
 * Bind role reads and writes to the authenticated Settings and Session remotes.
 * @param ctx - browser plugin declaring both remote namespaces.
 * @returns revision-checked role operations.
 */
export declare function createTeamRoleOperations(ctx: Context): TeamRoleOperations;
