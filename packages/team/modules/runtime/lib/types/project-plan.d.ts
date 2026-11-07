/** Structured project plans stored with the user-reviewed goal. */
import { z } from 'zod';
import type { TeamState } from './projection.ts';
/** Complete roster, work graph, resource budget, and recovery plan. */
export declare const projectPlanSchema: z.ZodObject<{
    format: z.ZodLiteral<"dsh-team-project-plan">;
    version: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>]>;
    automation: z.ZodOptional<z.ZodObject<{
        provision: z.ZodEnum<{
            manual: "manual";
            "on-demand": "on-demand";
        }>;
        requirePlanningGate: z.ZodBoolean;
    }, z.core.$strict>>;
    members: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        parent: z.ZodString;
        function: z.ZodEnum<{
            planning_adviser: "planning_adviser";
            quality_adviser: "quality_adviser";
            domain_adviser: "domain_adviser";
            group_lead: "group_lead";
            executor: "executor";
            verifier: "verifier";
        }>;
        modelProvider: z.ZodString;
        model: z.ZodString;
        reasoningEffort: z.ZodString;
        responsibility: z.ZodString;
        skills: z.ZodArray<z.ZodString>;
        persona: z.ZodOptional<z.ZodString>;
        instructions: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    tasks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        owner: z.ZodString;
        reviewer: z.ZodString;
        description: z.ZodString;
        kind: z.ZodEnum<{
            plan: "plan";
            execution: "execution";
            route: "route";
            key_result: "key_result";
            delivery: "delivery";
        }>;
        dependencies: z.ZodArray<z.ZodString>;
        inputs: z.ZodArray<z.ZodString>;
        outputs: z.ZodArray<z.ZodString>;
        exclusiveResources: z.ZodOptional<z.ZodArray<z.ZodString>>;
        acceptanceCriteria: z.ZodArray<z.ZodString>;
        critical: z.ZodBoolean;
    }, z.core.$strict>>;
    resources: z.ZodObject<{
        maxMembers: z.ZodNumber;
        maxConcurrentRequests: z.ZodNumber;
    }, z.core.$strict>;
    reviewPolicy: z.ZodLiteral<"independent-and-dual-for-critical">;
    previousTasks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        action: z.ZodEnum<{
            retain_history: "retain_history";
            replan: "replan";
        }>;
        reason: z.ZodString;
    }, z.core.$strict>>;
    recovery: z.ZodString;
}, z.core.$strict>;
/**
 * Decode a project plan without interpreting legacy prose as an approved roster.
 * @param textValue - JSON saved in the goal plan field.
 * @returns validated plan, or undefined for a historical prose plan.
 */
export declare function readProjectPlan(textValue: string | undefined): z.infer<typeof projectPlanSchema> | undefined;
/**
 * Check that every unfinished task has an explicit treatment in a replacement plan.
 * @param state - Current task history.
 * @param plan - Complete proposed plan.
 */
export declare function validateTaskTransition(state: TeamState, plan: z.infer<typeof projectPlanSchema>): void;
