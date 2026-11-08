/** Mutable Team responsibilities kept separate from immutable creation records. */
import { z } from 'zod';
import { SessionId } from '@deepseek-ai/dsh-session';
import type { TeamState } from './projection.ts';
import type { TeamMemberFunction, TeamMemberRole, TeamMemberSnapshot } from './types.ts';
/** Validated responsibility values for durable role configurations. */
export declare const teamMemberFunctionSchema: z.ZodEnum<{
    planning_adviser: "planning_adviser";
    quality_adviser: "quality_adviser";
    domain_adviser: "domain_adviser";
    group_lead: "group_lead";
    executor: "executor";
    verifier: "verifier";
}>;
/** JSON validation for one complete responsibility revision. */
export declare const teamMemberRoleSchema: z.ZodType<TeamMemberRole>;
/**
 * Read a retained member's configured responsibility, falling back only to its creation value.
 * @param state - Current durable Team state.
 * @param member - Retained member or absent lookup result.
 * @returns current responsibility; absent historical labels remain absent.
 */
export declare function memberFunction(state: TeamState, member: TeamMemberSnapshot | undefined): TeamMemberFunction | undefined;
/**
 * Read the revision used to invalidate earlier adviser decisions after responsibility changes.
 * @param state - Current durable Team state.
 * @param memberId - Retained member identity.
 * @returns current revision, or zero for a creation-time responsibility.
 */
export declare function memberRoleRevision(state: TeamState, memberId: SessionId): number;
