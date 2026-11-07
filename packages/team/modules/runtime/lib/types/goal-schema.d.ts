/** JSON validation shared by the Team goal writer and persisted event reader. */
import { z } from 'zod';
import type { TeamGoalChange, TeamGoalProposal, TeamGoalSnapshot } from './goal-types.ts';
/** Explicit paths, origins and opaque-execution choice shown in the human goal review. */
export declare const teamExecutionScopeSchema: z.ZodObject<{
    readPaths: z.ZodArray<z.ZodString>;
    writePaths: z.ZodArray<z.ZodString>;
    webOrigins: z.ZodArray<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    allowSearch: z.ZodBoolean;
    allowUnrestrictedExecution: z.ZodBoolean;
}, z.core.$strict>;
/** Complete proposal content accepted at the model JSON boundary. */
export declare const teamGoalChangeSchema: z.ZodType<TeamGoalChange>;
/** Exact durable proposal, including the goal revision the user will replace. */
export declare const teamGoalProposalSchema: z.ZodType<TeamGoalProposal>;
/** User answer checkpoint; a rejection does not change the confirmed goal. */
export declare const teamGoalDecisionSchema: z.ZodObject<{
    proposalRevision: z.ZodNumber;
    outcome: z.ZodEnum<{
        accepted: "accepted";
        rejected: "rejected";
    }>;
    comment: z.ZodString;
    decidedAt: z.ZodNumber;
    channel: z.ZodLiteral<"user-question">;
}, z.core.$strict>;
/** Current confirmed goal, retained in the projection cache and client view. */
export declare const teamGoalSnapshotSchema: z.ZodType<TeamGoalSnapshot>;
/** Optional additions keep pre-goal Team logs readable. */
export declare const teamGoalStateFields: {
    goal: z.ZodOptional<z.ZodType<TeamGoalSnapshot, unknown, z.core.$ZodTypeInternals<TeamGoalSnapshot, unknown>>>;
    goalProposal: z.ZodOptional<z.ZodType<TeamGoalProposal, unknown, z.core.$ZodTypeInternals<TeamGoalProposal, unknown>>>;
    goalDecision: z.ZodOptional<z.ZodObject<{
        proposalRevision: z.ZodNumber;
        outcome: z.ZodEnum<{
            accepted: "accepted";
            rejected: "rejected";
        }>;
        comment: z.ZodString;
        decidedAt: z.ZodNumber;
        channel: z.ZodLiteral<"user-question">;
    }, z.core.$strict>>;
};
