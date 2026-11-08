/** Team state projected incrementally from committed Session events, with a durable-only client view. */
import { z } from 'zod';
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session';
import type { TeamId, TeamMemberSnapshot, TeamMemberModelRoute, TeamMemberRole, TeamMessageId, TeamMessageSnapshot, TeamProjection, TeamTaskSnapshot, TeamBriefSnapshot, TeamAdviserDecision } from './types.ts';
import type { TeamGoalReview } from './goal-types.ts';
import type { TeamTaskEffectEvent } from './task-work-types.ts';
import type { TeamSkillSelection } from './skill-types.ts';
/**
 * Current Team state selected by durable Team identity. Every applied Team
 * event produces a new state object and replaces only the collection it
 * touched; untouched collections keep their references.
 */
export interface TeamState extends TeamGoalReview {
    readonly adviserDecisions?: readonly TeamAdviserDecision[];
    readonly skillSelections?: readonly TeamSkillSelection[];
    readonly memberRoles?: readonly TeamMemberRole[];
    readonly modelRoutes?: readonly TeamMemberModelRoute[];
    readonly id: TeamId;
    readonly members: readonly TeamMemberSnapshot[];
    readonly tasks: readonly TeamTaskSnapshot[];
    readonly taskEffects?: readonly TeamTaskEffectEvent[];
    readonly messages: readonly TeamMessageSnapshot[];
    readonly delivered: readonly TeamMessageId[];
    readonly nextTaskNumber: number;
    readonly brief?: TeamBriefSnapshot;
}
/**
 * Construct empty state for one Team identity.
 * @param rootId - root Session identity.
 * @returns empty Team state.
 */
export declare function emptyTeamState(rootId: SessionId): TeamProjectionState;
/** Checkpoint-safe state for the Team owned by the projected Session. */
export interface TeamProjectionState extends TeamState {
    readonly failure?: string;
}
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        agentTeam: TeamProjectionState;
    }
}
/** Whether one event belongs to the Team domain. */
export type TeamEventType = 'team/skills-selected' | 'team/goal-proposed' | 'team/goal-decided' | 'team/brief' | 'team/member' | 'team/member-retirement' | 'team/member-model-route' | 'team/member-role' | 'team/task' | 'team/task-effect' | 'team/adviser-decision' | 'team/message/queued' | 'team/message/delivered';
/** One event owned by the Team domain. */
type TeamSessionEvent = SessionEvent<TeamEventType>;
/**
 * Test whether a Session event belongs to the Team domain.
 * @param event - candidate Session event.
 * @returns whether the event has a Team-owned type.
 */
export declare function isTeamEvent(event: SessionEvent): event is TeamSessionEvent;
declare function applyProjectionEvent(state: TeamProjectionState, event: SessionEvent): TeamProjectionState;
/**
 * Durable client view of one Team state. Mailbox-only state changes reuse the
 * previous view reference, so the live drive publishes nothing for them.
 * A failure is terminal: later events retain the failed state reference and
 * do not republish its view.
 * @param state - current Team state.
 * @returns the roster and non-deleted task board, plus any projection failure.
 */
export declare function teamProjectionView(state: TeamProjectionState): TeamProjection;
/** Team state selected by the projected Session identity, with compact coordination metadata for clients. */
export declare const teamProjectionDefinition: {
    key: "agentTeam";
    stateVersion: number;
    stateSchema: z.ZodType<TeamProjectionState, unknown, z.core.$ZodTypeInternals<TeamProjectionState, unknown>>;
    init: (header: import("@deepseek-ai/dsh-session").SessionHeader) => TeamProjectionState;
    apply: typeof applyProjectionEvent;
    wire: {
        viewSchema: z.ZodType<TeamProjection, unknown, z.core.$ZodTypeInternals<TeamProjection, unknown>>;
        view: typeof teamProjectionView;
    };
};
export {};
