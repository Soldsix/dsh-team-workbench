/** Team selection and parent ordering shared by conversation presentations. */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
import type { ModelSelection, ModelSelectionProjection } from '@deepseek-ai/dsh-api-session-controller/types';
import type { TeamMemberProjection, TeamProjection } from 'dsh-team-workbench/runtime/client';
import type { TeamTaskView } from 'dsh-team-workbench/runtime/client';
import type { TeamKey } from './locales.ts';
/** A displayed roster row; legacy rows retain their original Session lifecycle. */
export type DisplayMember = TeamMemberProjection & {
    readonly legacyMode?: 'one-shot' | 'continuable' | 'unknown';
};
/**
 * Localized label key for an explicitly assigned Team responsibility.
 * @param member - Persisted Team member with an optional responsibility.
 * @returns the displayed function or retained-member label key.
 */
export declare function memberFunctionKey(member: TeamMemberProjection): TeamKey;
/** Team state with separately identified original-mode descendants for browsing. */
export type DisplayTeam = Omit<TeamProjection, 'members'> & {
    readonly members: DisplayMember[];
};
/** Displayed model settings for one member, with any distinct upcoming choice. */
export interface MemberModelDisplay {
    readonly model?: string;
    readonly reasoningEffort?: string;
    readonly source: 'recorded' | 'next' | 'bound';
    readonly next?: ModelSelection;
}
/**
 * Show a Team route override as the next request; otherwise keep the last request distinct from a later Session selection.
 * @param member - Creation-time member settings.
 * @param selection - Durable Session model selection, when loaded.
 * @returns settings to display and search in the Team roster.
 */
export declare function memberModelDisplay(member: TeamMemberProjection, selection?: ModelSelectionProjection): MemberModelDisplay;
/**
 * Find the root Team for a root or addressed descendant conversation.
 * @param state - Current shared Session list snapshot.
 * @param sessionId - Displayed conversation.
 * @param parentId - Direct parent supplied by the Session binding, when present.
 * @returns the root projection, or undefined while unavailable.
 */
export declare function selectTeam(state: SessionListState, sessionId: SessionId, parentId?: SessionId): DisplayTeam | undefined;
/**
 * Place descendants after their parent, with advisers before execution siblings.
 * @param members - Durable root roster, including the Lead.
 * @returns each member once with its nesting depth.
 */
export declare function teamHierarchy(members: readonly DisplayMember[]): {
    member: DisplayMember;
    depth: number;
}[];
/** One Lead child and its descendants, with tasks owned anywhere in that branch. */
export interface TeamWorkGroup {
    readonly id: string;
    readonly leader?: DisplayMember;
    readonly members: readonly DisplayMember[];
    readonly tasks: readonly TeamTaskView[];
}
/**
 * Group current work by the first roster member below the Lead.
 * Lead-owned or unassigned work stays in a separate group.
 * @param members - Displayed roster, including original-mode descendants.
 * @param tasks - Current shared tasks.
 * @returns groups in roster order, followed by unassigned work when present.
 */
export declare function teamWorkGroups(members: readonly DisplayMember[], tasks: readonly TeamTaskView[]): TeamWorkGroup[];
/** Classify roster sections without changing parent/descendant order. */
export declare function memberSection(member: DisplayMember): 'coordination' | 'experts' | 'execution' | 'legacy';
/** Missing transport and summary data stays unknown instead of inventing an idle state. */
export declare function memberActivity(member: DisplayMember, running: boolean | undefined, summary: boolean | undefined, pending: boolean): 'running' | 'inactive' | 'unknown' | 'needsInput' | 'failed' | 'provisioning' | 'retired';
