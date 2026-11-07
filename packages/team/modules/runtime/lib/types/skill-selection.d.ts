import type { Agent } from '@deepseek-ai/dsh-agent';
import type { Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { TeamJournal } from './journal.ts';
import { type TeamRoster } from './roster.ts';
import type { TeamGoals } from './goals.ts';
import type { SelectTeamSkillsRequest, TeamSelectedSkill, TeamSkillChoice, TeamSkillSelection, TeamSkillSelectionView } from './skill-types.ts';
/** Owns exact member identity, revision, size, and goal checks for skill choices. */
export declare class TeamSkillSelections {
    private readonly ctx;
    private readonly journal;
    private readonly roster;
    private readonly goals;
    private readonly maxSkills;
    private readonly maxBytes;
    /**
     * @param ctx - Context hosting Team skill providers.
     * @param journal - Root Session transaction owner.
     * @param roster - Exact live caller and durable target lookup.
     * @param goals - Current goal admission and revision cancellation.
     * @param maxSkills - Maximum selected modules per member.
     * @param maxBytes - Maximum encoded selection size, including saved content.
     */
    constructor(ctx: Context, journal: TeamJournal, roster: TeamRoster, goals: TeamGoals, maxSkills: number, maxBytes: number);
    /**
     * Resolve and validate an initial choice before creating its member or submitting work.
     * @param caller - Exact live parent in the Team.
     * @param memberId - Reserved identity of the future child.
     * @param choices - Only the modules required by the delegated task.
     * @param signal - Caller and goal cancellation throughout resolution.
     * @returns detached revision-one selection ready for the roster transaction.
     */
    prepare(caller: Agent, memberId: SessionId, choices: readonly TeamSkillChoice[], signal: AbortSignal): Promise<TeamSkillSelection>;
    /**
     * Copy one member's pinned instruction bytes to its replacement before the first model request.
     * @param caller - Team Lead or the source member's direct parent.
     * @param sourceId - Existing member whose choice remains in the Team log.
     * @param memberId - Reserved identity of the replacement.
     * @returns Validated revision-one choice, or undefined when the source has no choice.
     */
    copyForSuccessor(caller: Agent, sourceId: SessionId, memberId: SessionId): TeamSkillSelection | undefined;
    /**
     * Read compact metadata, including the caller's own choice during provisioning.
     * @param caller - Exact live Team member.
     * @param member - Durable target name; omitted means the caller.
     * @returns Saved choice or revision zero before the first choice.
     */
    read(caller: Agent, member?: string): TeamSkillSelectionView;
    /**
     * Read the caller's exact selected instruction version.
     * @param caller - Exact live Team member.
     * @param name - Selected module name.
     * @returns Detached saved content, or undefined when this module is not selected.
     */
    content(caller: Agent, name: string): TeamSelectedSkill | undefined;
    /**
     * Replace one member's entire choice using the current revision.
     * @param caller - Exact live member, direct parent, or Lead.
     * @param request - Expected revision, target, and fully resolved instruction snapshots.
     * @param signal - Cancellation before the record is appended.
     * @returns Committed metadata; identical choices reuse the current revision.
     */
    select(caller: Agent, request: SelectTeamSkillsRequest, signal: AbortSignal): Promise<TeamSkillSelectionView>;
    /**
     * Rebind reviewed saved skill bytes to the current goal without reading a newer module version.
     * @param caller - Exact Team Lead or direct parent of the selected member.
     * @param member - Retained target name.
     * @param expectedRevision - Saved selection revision reviewed for this goal.
     * @param signal - Cancellation before the new selection is recorded.
     * @returns current-goal selection retaining every prior content digest.
     */
    rebind(caller: Agent, member: string, expectedRevision: number, signal: AbortSignal): Promise<TeamSkillSelectionView>;
    /** Validate detached durable values and deployment limits for every selection writer. */
    private decode;
    /** A saved digest must identify the content used by the model. */
    private checkDigest;
}
