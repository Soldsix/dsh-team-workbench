/** Mutable Team responsibilities kept separate from immutable creation records. */
import { z } from 'zod';
import { SessionId } from '@deepseek-ai/dsh-session';
/** Validated responsibility values for durable role configurations. */
export const teamMemberFunctionSchema = z.enum([
    'planning_adviser', 'quality_adviser', 'domain_adviser', 'group_lead', 'executor', 'verifier',
]);
/** JSON validation for one complete responsibility revision. */
export const teamMemberRoleSchema = z.object({
    goalRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    memberId: z.string().min(1).transform(SessionId),
    revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    teamFunction: teamMemberFunctionSchema,
    reason: z.string().trim().min(1).max(4096),
}).strict();
/**
 * Read a retained member's configured responsibility, falling back only to its creation value.
 * @param state - Current durable Team state.
 * @param member - Retained member or absent lookup result.
 * @returns current responsibility; absent historical labels remain absent.
 */
export function memberFunction(state, member) {
    if (member === undefined)
        return undefined;
    return state.memberRoles?.find(role => role.memberId === member.id)?.teamFunction ?? member.teamFunction;
}
/**
 * Read the revision used to invalidate earlier adviser decisions after responsibility changes.
 * @param state - Current durable Team state.
 * @param memberId - Retained member identity.
 * @returns current revision, or zero for a creation-time responsibility.
 */
export function memberRoleRevision(state, memberId) {
    return state.memberRoles?.find(role => role.memberId === memberId)?.revision ?? 0;
}
