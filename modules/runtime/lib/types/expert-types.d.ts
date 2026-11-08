/** Durable expert profiles shared across Teams; conversations remain Team-local. */
import type { Branded } from '@deepseek-ai/dsh-brand';
import type { SessionId } from '@deepseek-ai/dsh-session';
/** Stable identity of one reusable expert profile. */
export type TeamExpertId = Branded<'TeamExpertId'>;
/**
 * Brand an expert id parsed at a tool or durable boundary.
 * @param id - Validated expert identity.
 * @returns the same string branded as an expert identity.
 */
export declare function TeamExpertId(id: string): TeamExpertId;
/** Parent-authored role settings; model limits belong to the configured DSH adapter. */
export interface TeamExpertDefinition {
    readonly name: string;
    readonly description: string;
    readonly persona: string;
    /** AGENT.md text copied into the continuable member's logged persona. */
    readonly instructions: string;
    /** Available skill names to consult; these references do not install skills. */
    readonly skills: readonly string[];
    /** Omit provider and model together to inherit the assigning parent's route. */
    readonly modelProvider?: string;
    readonly model?: string;
    readonly reasoningEffort?: string;
}
/** Whole expert value retained by the expert catalog. */
export interface TeamExpertRecord {
    readonly definition: TeamExpertDefinition;
    readonly revision: number;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly archived: boolean;
    /** Model-created profiles belong to one Team; absent ownership denotes a user-managed shared template. */
    readonly ownerTeamId?: SessionId;
    /** Member that authored this Team-local profile. */
    readonly ownerMemberId?: SessionId;
}
/** Detached catalog record with its storage identity. */
export interface TeamExpertView extends TeamExpertRecord {
    readonly id: TeamExpertId;
}
/** Immutable creation-time expert reference retained in a Team member's log. */
export interface TeamExpertBinding {
    readonly id: TeamExpertId;
    readonly revision: number;
    readonly name: string;
}
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface RemoteErrorDetailsMap {
        /** No expert carries the requested identity. */
        'team-expert/not-found': {
            readonly expertId: TeamExpertId;
        };
        /** A concurrent writer has committed another revision. */
        'team-expert/stale-revision': {
            readonly expectedRevision: number;
            readonly actualRevision: number;
        };
        /** No further revision can be represented exactly. */
        'team-expert/revision-limit': {
            readonly expertId: TeamExpertId;
        };
        /** Archived profiles cannot receive new member assignments. */
        'team-expert/archived': {
            readonly expertId: TeamExpertId;
        };
        /** Profile fields fail the catalog's content requirements. */
        'team-expert/invalid-profile': {
            readonly fields: readonly string[];
        };
        /** The configured provider cannot resolve the selected model or effort. */
        'team-expert/model-unavailable': {
            readonly provider: string;
            readonly model: string;
        };
        /** The initiating member cannot mutate this shared or foreign profile. */
        'team-expert/edit-denied': {
            readonly expertId: TeamExpertId;
        };
    }
}
