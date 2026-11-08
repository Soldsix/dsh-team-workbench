/** Task-plan parsing and pure checks of execution and dependency versions. */
import { z } from 'zod';
import { brandString } from '@deepseek-ai/dsh-brand';
import { TeamTaskExecutionId } from "./task-work-types.js";
import { taskEffectsNeedReview } from "./task-effects.js";
const positiveInteger = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const nonNegativeInteger = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const text = z.string().trim().min(1);
const sessionId = text.transform(value => brandString(value));
const fileReceipt = z.object({ path: text, bytes: nonNegativeInteger,
    sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const environmentReceipt = z.object({ workspaceRoot: text, platform: text, arch: text, nodeVersion: text }).strict();
/** Validation at model, persisted-file, and remote task-plan inputs. */
export const taskPlanInputSchema = z.object({
    inputVersion: text, environmentVersion: text, acceptanceCriteria: z.array(text).min(1),
    adviserGate: z.literal('dual').optional(),
    inputPaths: z.array(text).optional(),
}).strict();
/** Durable work records validate their internal execution and review relationships. */
export const taskWorkSchema = z.object({
    plan: taskPlanInputSchema.extend({
        revision: positiveInteger, plannerId: sessionId, goalRevision: nonNegativeInteger,
        inputs: z.array(fileReceipt).optional(), environment: environmentReceipt.optional(),
    }).strict(),
    attempts: nonNegativeInteger,
    execution: z.object({
        id: text.transform(TeamTaskExecutionId), ownerId: sessionId, planRevision: positiveInteger,
        dependencies: z.array(z.object({
            taskId: text.transform(value => brandString(value)), revision: positiveInteger,
        }).strict()),
        phase: z.enum(['running', 'submitted', 'accepted', 'rejected', 'cancelled']),
        effectTracking: z.literal('observed').optional(),
        effectReview: z.object({ reviewerId: sessionId, resolution: z.enum(['none', 'known']),
            summary: text, evidence: z.array(text).min(1), observedCalls: nonNegativeInteger }).strict().optional(),
        submission: z.object({ result: text, evidence: z.array(text).min(1),
            artifacts: z.array(fileReceipt).optional(), environment: environmentReceipt.optional(),
            sideEffects: z.enum(['none', 'known', 'unknown']).optional(),
            sideEffectEvidence: z.array(text).optional(),
        }).strict().optional(),
        review: z.object({
            reviewerId: sessionId, decision: z.enum(['accepted', 'rejected']),
            summary: text, evidence: z.array(text).min(1),
        }).strict().optional(),
    }).strict().optional(),
}).strict().superRefine((work, context) => {
    if ((work.plan.inputs === undefined) !== (work.plan.environment === undefined)) {
        context.addIssue({ code: 'custom', message: 'plan input and environment receipts must appear together' });
    }
    if (work.execution?.submission !== undefined
        && (work.execution.submission.artifacts === undefined) !== (work.execution.submission.environment === undefined)) {
        context.addIssue({ code: 'custom', message: 'submission artifact and environment receipts must appear together' });
    }
    const run = work.execution;
    if (run === undefined)
        return;
    if (work.attempts === 0 || run.planRevision !== work.plan.revision) {
        context.addIssue({ code: 'custom', message: 'execution must belong to the current plan and a positive attempt' });
    }
    if (new Set(run.dependencies.map(item => item.taskId)).size !== run.dependencies.length) {
        context.addIssue({ code: 'custom', message: 'execution repeats a dependency' });
    }
    if (['submitted', 'accepted', 'rejected'].includes(run.phase) && run.submission === undefined) {
        context.addIssue({ code: 'custom', message: 'submitted execution requires its result and evidence' });
    }
    if (run.phase === 'running' && (run.submission !== undefined || run.review !== undefined)) {
        context.addIssue({ code: 'custom', message: 'running execution cannot have a submission or review' });
    }
    if (run.review !== undefined && (run.review.reviewerId === run.ownerId
        || run.review.decision !== run.phase && run.phase !== 'cancelled')) {
        context.addIssue({ code: 'custom', message: 'review must be independent and agree with the execution phase' });
    }
    if (run.effectReview?.reviewerId === run.ownerId) {
        context.addIssue({ code: 'custom', message: 'external effects require an independent reviewer' });
    }
    if (['accepted', 'rejected'].includes(run.phase) && run.review === undefined) {
        context.addIssue({ code: 'custom', message: 'reviewed execution requires a decision' });
    }
});
/**
 * Check the goal and dependency versions captured by an execution.
 * @param state - Current Team state.
 * @param task - Task whose execution or result is being considered.
 * @returns concrete changes that require a new plan or execution.
 */
export function taskWorkChanges(state, task) {
    return taskAssessment(state).changes(task);
}
/**
 * Distinguish an independently accepted result from an unverified or stale record.
 * @param state - Current Team state.
 * @param task - Task whose current result is requested.
 * @returns whether this exact recorded result remains reusable under its declared versions.
 */
export function taskValidity(state, task) {
    const recorded = taskRecordValidity(state, task);
    return recorded.reusable
        ? { reusable: false, reasons: ['Current files and local runtime require a fresh recheck.'] }
        : recorded;
}
/**
 * Check recorded goal, dependency, plan, and review relationships without reading files.
 * @param state - Current Team state.
 * @param task - Recorded result under consideration.
 * @returns structural acceptance that is insufficient for live reuse.
 */
export function taskRecordValidity(state, task) {
    return taskAssessment(state).validity(task);
}
/** Shared dependencies are assessed once per read across the validated task DAG. */
function taskAssessment(state) {
    const byId = new Map(state.tasks.map(task => [task.id, task]));
    const accepted = new Map();
    const changes = (task) => {
        const work = task.work;
        if (work === undefined)
            return [];
        const reasons = [];
        if (state.goal?.status === 'revoked')
            reasons.push('The user revoked the Team goal.');
        if (work.plan.goalRevision !== (state.goal?.revision ?? 0))
            reasons.push('The confirmed Team goal changed.');
        for (const consumed of work.execution?.dependencies ?? []) {
            const dependency = byId.get(consumed.taskId);
            if (dependency === undefined || dependency.revision !== consumed.revision || !validity(dependency).reusable) {
                reasons.push(`Dependency ${consumed.taskId} changed or lost acceptance after this execution started.`);
            }
        }
        return reasons;
    };
    const validity = (task) => {
        const cached = accepted.get(task.id);
        if (cached !== undefined)
            return cached;
        const reasons = changes(task);
        if (task.work === undefined)
            reasons.push('This task has no versioned plan or independent review.');
        else if (task.work.execution?.phase !== 'accepted')
            reasons.push('This execution has not passed independent review.');
        if (task.work?.plan.inputs === undefined || task.work.plan.environment === undefined
            || task.work.execution?.submission?.artifacts === undefined
            || task.work.execution.submission.environment === undefined) {
            reasons.push('This result has no host-observed input, environment, and artifact receipts.');
        }
        if (taskEffectsNeedReview(state, task))
            reasons.push('Tool execution effects require independent review.');
        if (task.work?.execution?.submission?.sideEffects === 'unknown'
            && task.work.execution.effectReview === undefined) {
            reasons.push('External side effects remain unresolved.');
        }
        if (task.status !== 'completed')
            reasons.push('This task is not completed.');
        const result = { reusable: reasons.length === 0, reasons };
        accepted.set(task.id, result);
        return result;
    };
    return { changes, validity };
}
