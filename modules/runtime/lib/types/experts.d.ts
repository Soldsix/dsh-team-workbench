import { Context, Service } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { TeamExpertId } from './expert-types.ts';
import type { TeamExpertDefinition, TeamExpertView } from './expert-types.ts';
import type { AssignTeamExpertRequest } from './host-types.ts';
import type { EnsureExpertMemberResult } from './types.ts';
export type * from './expert-types.ts';
export { TeamExpertId } from './expert-types.ts';
export type { AssignTeamExpertRequest } from './host-types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        teamExperts: TeamExpertService;
    }
}
/**
 * Parse a complete expert definition received from a model or client.
 * @param input - Untrusted JSON-decoded profile fields.
 * @returns the validated definition with trimmed identifiers.
 */
export declare function parseTeamExpertDefinition(input: unknown): TeamExpertDefinition;
/** Durable expert profiles; assignment never rewrites an existing member's persona. */
export declare class TeamExpertService extends TypertRemoteService {
    static inject: string[];
    private table;
    constructor(ctx: Context);
    /** Open the authoritative catalog before publishing the service. */
    protected [Service.init](): Promise<void>;
    /**
     * Read the catalog without resolving models or starting turns.
     * @param includeArchived - Include profiles hidden from normal assignment.
     * @returns detached profiles in stable creation order.
     */
    list(includeArchived: boolean): TeamExpertView[];
    /**
     * Read one profile, including an archived profile.
     * @param id - Stable catalog identity.
     * @returns a detached profile; missing identities throw.
     */
    get(id: TeamExpertId): TeamExpertView;
    /**
     * Save a new reusable role without generating a model response.
     * @param definition - Validated full role definition.
     * @param signal - Cancellation before the durable write is admitted.
     * @returns the committed revision-one profile.
     */
    create(definition: TeamExpertDefinition, signal: AbortSignal): Promise<TeamExpertView>;
    /**
     * Replace a profile using its last observed revision; bound members keep their saved copy.
     * @param id - Stable catalog identity.
     * @param expectedRevision - Revision observed before editing.
     * @param definition - Validated complete replacement definition.
     * @param archived - Whether to hide the profile from new assignments.
     * @param signal - Cancellation before the durable write is admitted.
     * @returns the committed next profile revision.
     */
    update(id: TeamExpertId, expectedRevision: number, definition: TeamExpertDefinition, archived: boolean, signal: AbortSignal): Promise<TeamExpertView>;
    /** Local profiles are visible only to their Team and the user. */
    private assertReader;
    /** Shared templates remain user-managed; model edits stay with the author, its parent, or the Team Lead. */
    private assertEditor;
    /**
     * Locate this expert's member in the calling Team, creating one only when absent.
     * A reused member receives no prompt; send new work explicitly after inspecting its tasks.
     * @param caller - Exact live parent in an enabled Team.
     * @param request - Catalog revision, initial task, and continuation composition.
     * @returns the member and whether its existing Session was reused.
     */
    assign(caller: Agent, request: AssignTeamExpertRequest): Promise<EnsureExpertMemberResult>;
    /** Check configured route capabilities without changing provider defaults or generating text. */
    private validateRoute;
    /** Reject stale profile edits and assignments before changing durable state. */
    private assertRevision;
}
export default TeamExpertService;
