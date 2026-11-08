/** Serialized task-work transitions; execution ids fence late submissions and reviews. */
import { brandString } from '@deepseek-ai/dsh-brand';
import { assertNever } from '@deepseek-ai/dsh-util-values';
import { TeamError } from "./error.js";
import { TeamTaskExecutionId } from "./task-work-types.js";
import { taskPlanInputSchema, taskRecordValidity, taskWorkChanges } from "./task-work.js";
import { taskEffectCallCount, taskEffectsNeedReview } from "./task-effects.js";
import { requiredText } from "./validation.js";
/**
 * Create the next plan, bound to the goal visible at this exact serialized write.
 * @param state - Current Team state.
 * @param input - Complete declared task inputs and checks.
 * @param plannerId - Exact member authoring this plan.
 * @param previous - Prior work whose plan and attempt counters must be retained.
 * @param observed - Host-observed input files and runtime when recorded.
 * @returns a new plan without an active execution or accepted result.
 */
export function planTaskWork(state, input, plannerId, previous, observed) {
    const parsed = taskPlanInputSchema.safeParse(input);
    if (!parsed.success)
        throw new TeamError('a task plan requires input_version, environment_version, and acceptance_criteria', 'TEAM_TASK_PLAN_INVALID');
    const { inputPaths, adviserGate, ...declared } = parsed.data;
    const revision = (previous?.plan.revision ?? 0) + 1;
    if (!Number.isSafeInteger(revision))
        throw new TeamError('task plan revision limit reached', 'TEAM_TASK_REVISION_LIMIT');
    return { plan: { ...declared, ...inputPaths === undefined ? {} : { inputPaths },
            ...adviserGate === undefined ? {} : { adviserGate },
            revision, plannerId, goalRevision: state.goal?.revision ?? 0,
            ...observed === undefined ? {} : observed,
        }, attempts: previous?.attempts ?? 0 };
}
/**
 * Remove a current completion without deleting the earlier Session records.
 * @param task - Current task.
 * @returns a pending unowned task whose earlier result remains only in history.
 */
export function pendingTask(task) {
    const { result: _result, evidence: _evidence, ownerId: _owner, ...rest } = task;
    return { ...rest, status: 'pending' };
}
/** Deny an action on a plan whose goal or consumed dependencies changed. */
function requireCurrent(state, task) {
    const changes = taskWorkChanges(state, task);
    if (changes.length > 0)
        throw new TeamError(changes.join(' '), 'TEAM_TASK_EXECUTION_STALE');
}
/** A new run captures independently accepted dependencies at their current revisions. */
function startExecution(state, task, work, ownerId) {
    requireCurrent(state, { ...task, work: { plan: work.plan, attempts: work.attempts } });
    if (taskEffectsNeedReview(state, task)) {
        throw new TeamError('earlier tool effects still need independent review: read team_task_get for the current revision and execution_id, ask a different member to inspect receipts or actual state, then call team_task_reconcile with side_effects, review_summary, and review_evidence before another attempt', 'TEAM_TASK_EFFECT_REVIEW_REQUIRED');
    }
    const busy = state.tasks.find(candidate => candidate.id !== task.id && candidate.status === 'in_progress'
        && candidate.ownerId === ownerId && candidate.work?.execution?.phase !== 'submitted');
    if (busy !== undefined)
        throw new TeamError(`member already owns execution of ${busy.id}`, 'TEAM_TASK_MEMBER_BUSY');
    const dependencies = task.blockedBy.map((taskId) => {
        const dependency = state.tasks.find(candidate => candidate.id === taskId);
        if (dependency === undefined || !taskRecordValidity(state, dependency).reusable) {
            throw new TeamError(`dependency ${taskId} has no current independently accepted result`, 'TEAM_TASK_BLOCKED');
        }
        return { taskId, revision: dependency.revision };
    });
    const attempts = work.attempts + 1;
    if (!Number.isSafeInteger(attempts))
        throw new TeamError('task execution counter limit reached', 'TEAM_TASK_REVISION_LIMIT');
    const execution = {
        id: TeamTaskExecutionId(`${task.id}/run-${attempts}`), ownerId,
        planRevision: work.plan.revision, dependencies, phase: 'running', effectTracking: 'observed',
    };
    return { ...pendingTask(task), status: 'in_progress', ownerId, work: { plan: work.plan, attempts, execution } };
}
/** Exact execution matching prevents a delayed model result from completing a replacement run. */
function executionFor(task, request) {
    const execution = task.work?.execution;
    if (execution === undefined || request.executionId !== execution.id) {
        throw new TeamError('read the task and provide its current execution_id', 'TEAM_TASK_EXECUTION_STALE');
    }
    return execution;
}
/** Require recorded verification details without interpreting model text as machine evidence. */
function evidenceList(values, field) {
    if (values === undefined || values.length === 0) {
        throw new TeamError(`${field} must contain at least one actual verification check or receipt`, 'TEAM_TASK_EVIDENCE_REQUIRED');
    }
    return values.map(value => requiredText(value, field, Number.MAX_SAFE_INTEGER));
}
/**
 * Apply a workflow action, or delegate legacy tasks to their existing transition owner.
 * @param state - Current Team state inside the write transaction.
 * @param task - Current task; a plan update may supply its newly validated definition.
 * @param request - Complete requested mutation.
 * @param callerId - Exact live caller identity.
 * @param lead - Whether the caller is the Team Lead.
 * @param observed - Host-observed plan inputs or submitted artifacts.
 * @returns the next task before its revision increment, or undefined for a legacy action.
 */
export function updateTaskWork(state, task, request, callerId, lead, observed) {
    const work = task.work;
    if (request.action === 'plan') {
        if (!lead && work?.plan.plannerId !== callerId)
            throw new TeamError('only the task planner or Team Lead may revise the plan', 'TEAM_TASK_UNAUTHORIZED');
        if (request.plan === undefined)
            throw new TeamError('plan requires the full task input and environment versions and acceptance criteria', 'TEAM_TASK_PLAN_INVALID');
        if (task.inputKey !== undefined && work !== undefined)
            throw new TeamError('create a new task input_key for a different plan; the keyed task retains its original result', 'TEAM_TASK_INPUT_CONFLICT');
        if (work?.execution?.phase === 'running' || work?.execution?.phase === 'submitted') {
            throw new TeamError('release or review the current execution before replacing its plan', 'TEAM_TASK_INVALID_TRANSITION');
        }
        if (taskEffectsNeedReview(state, task)) {
            throw new TeamError('review earlier tool effects before replacing this plan', 'TEAM_TASK_EFFECT_REVIEW_REQUIRED');
        }
        return { ...pendingTask(task), work: planTaskWork(state, request.plan, callerId, work, observed?.plan) };
    }
    if (work === undefined) {
        if (request.action === 'resume' || request.action === 'review')
            throw new TeamError('record a versioned task plan before this operation', 'TEAM_TASK_PLAN_REQUIRED');
        return undefined;
    }
    const owner = task.ownerId === callerId;
    const authorizeOwner = () => {
        if (!lead && !owner)
            throw new TeamError('task mutation requires its owner or Team Lead', 'TEAM_TASK_UNAUTHORIZED');
    };
    switch (request.action) {
        case 'claim':
            if (task.status !== 'pending')
                throw new TeamError('only a pending task can start; resume an existing execution instead', 'TEAM_TASK_INVALID_TRANSITION');
            return startExecution(state, task, work, callerId);
        case 'resume': {
            const execution = executionFor(task, request);
            if (!owner || execution.ownerId !== callerId)
                throw new TeamError('only the executing member can resume this execution', 'TEAM_TASK_UNAUTHORIZED');
            if (task.status !== 'in_progress' || execution.phase !== 'running')
                throw new TeamError('only a running task execution can resume', 'TEAM_TASK_INVALID_TRANSITION');
            requireCurrent(state, task);
            if (taskEffectsNeedReview(state, task)) {
                throw new TeamError('independent review of earlier tool effects is required before resuming', 'TEAM_TASK_EFFECT_REVIEW_REQUIRED');
            }
            return task;
        }
        case 'reconcile': {
            const execution = executionFor(task, request);
            if (execution.ownerId === callerId)
                throw new TeamError('a different member must review tool effects', 'TEAM_TASK_SELF_REVIEW');
            if (execution.effectReview !== undefined
                && taskEffectCallCount(state, task) <= execution.effectReview.observedCalls) {
                throw new TeamError('no newer tool effects require review', 'TEAM_TASK_INVALID_TRANSITION');
            }
            if (request.sideEffects !== 'none' && request.sideEffects !== 'known') {
                throw new TeamError('reconcile requires a definite external effect finding', 'TEAM_TASK_EFFECT_REVIEW_REQUIRED');
            }
            const effectReview = { reviewerId: callerId, resolution: request.sideEffects,
                summary: requiredText(request.reviewSummary ?? '', 'review_summary', Number.MAX_SAFE_INTEGER),
                evidence: evidenceList(request.reviewEvidence, 'review_evidence'), observedCalls: taskEffectCallCount(state, task) };
            return { ...task, work: { ...work, execution: { ...execution, effectReview } } };
        }
        case 'complete': {
            const execution = executionFor(task, request);
            if (!owner || execution.ownerId !== callerId)
                throw new TeamError('only the executing member can submit its result', 'TEAM_TASK_UNAUTHORIZED');
            if (task.status !== 'in_progress' || execution.phase !== 'running')
                throw new TeamError('only a running execution can submit a result', 'TEAM_TASK_INVALID_TRANSITION');
            requireCurrent(state, task);
            const result = requiredText(request.result ?? '', 'result', Number.MAX_SAFE_INTEGER);
            const evidence = evidenceList(request.evidence, 'evidence');
            return { ...task, work: { ...work, execution: { ...execution, phase: 'submitted', submission: { result, evidence,
                            ...observed?.submission === undefined ? {} : observed.submission,
                            sideEffects: request.sideEffects ?? (execution.effectTracking === 'observed'
                                && taskEffectCallCount(state, task) === 0 ? 'none' : 'unknown'),
                            ...request.sideEffectEvidence === undefined ? {} : { sideEffectEvidence: evidenceList(request.sideEffectEvidence, 'side_effect_evidence') },
                        } } } };
        }
        case 'review': {
            const execution = executionFor(task, request);
            if (execution.ownerId === callerId)
                throw new TeamError('a different member must review the result', 'TEAM_TASK_SELF_REVIEW');
            if (task.reviewerId !== undefined && task.reviewerId !== callerId) {
                const reviewer = String(task.reviewerId) === state.id ? 'lead'
                    : state.members.find(member => member.id === task.reviewerId)?.name ?? String(task.reviewerId);
                throw new TeamError(`only the assigned independent reviewer ${JSON.stringify(reviewer)} may review this result. `
                    + 'Send that member the current task_id and execution_id; the Lead can use configure_review to explicitly change the reviewer without rerunning the task.', 'TEAM_TASK_UNAUTHORIZED');
            }
            if (task.status !== 'in_progress' || execution.phase !== 'submitted' || execution.submission === undefined) {
                throw new TeamError('only the current submitted result can be reviewed', 'TEAM_TASK_INVALID_TRANSITION');
            }
            requireCurrent(state, task);
            if (request.reviewDecision === 'accepted' && taskEffectsNeedReview(state, task)) {
                throw new TeamError('Before accepting, inspect the recorded tool effects and actual state, then call team_task_reconcile '
                    + 'with the current task_id, expected_revision, execution_id, side_effects (none or known), review_summary, '
                    + 'and review_evidence (a nonempty string array). Read the updated revision before review. '
                    + 'Use review_decision=rejected to record missing evidence without authorizing a retry.', 'TEAM_TASK_EFFECT_REVIEW_REQUIRED');
            }
            if (request.reviewDecision === undefined)
                throw new TeamError('review requires accepted or rejected', 'TEAM_TASK_REVIEW_REQUIRED');
            const review = { reviewerId: callerId, decision: request.reviewDecision,
                summary: requiredText(request.reviewSummary ?? '', 'review_summary', Number.MAX_SAFE_INTEGER), evidence: evidenceList(request.reviewEvidence, 'review_evidence') };
            const reviewed = { ...execution, phase: request.reviewDecision, review };
            return request.reviewDecision === 'accepted'
                ? { ...task, status: 'completed', result: execution.submission.result, evidence: [...execution.submission.evidence], work: { ...work, execution: reviewed } }
                : { ...pendingTask(task), work: { ...work, execution: reviewed } };
        }
        case 'release':
        case 'reopen':
        case 'delete': {
            authorizeOwner();
            if (request.action === 'release' && task.status !== 'in_progress'
                || request.action === 'reopen' && task.status !== 'completed') {
                throw new TeamError(`cannot ${request.action} a ${task.status} task`, 'TEAM_TASK_INVALID_TRANSITION');
            }
            return { ...pendingTask(task), ...request.action === 'delete' ? { status: 'deleted' } : {},
                work: { ...work, ...work.execution === undefined ? {} : { execution: { ...work.execution, phase: 'cancelled' } } } };
        }
        case 'reassign': {
            if (!lead)
                throw new TeamError('only the Team Lead can reassign tasks', 'TEAM_LEAD_REQUIRED');
            if (task.status !== 'pending' && task.status !== 'in_progress' || work.execution?.phase === 'submitted') {
                throw new TeamError('release or review the existing result before reassignment', 'TEAM_TASK_INVALID_TRANSITION');
            }
            if (request.owner === undefined || request.owner.trim() === '') {
                return { ...pendingTask(task), work: { ...work, ...work.execution === undefined ? {} : { execution: { ...work.execution, phase: 'cancelled' } } } };
            }
            const name = request.owner.trim();
            const target = name === 'lead' ? brandString(state.id)
                : state.members.find(member => member.name === name && member.phase === 'active')?.id;
            if (target === undefined)
                throw new TeamError(`active teammate ${name} not found`, 'TEAM_MEMBER_NOT_FOUND');
            return startExecution(state, task, work, target);
        }
        case 'edit':
        case 'set_dependencies':
            authorizeOwner();
            throw new TeamError('revise the complete task plan or create a new keyed task before changing its inputs', 'TEAM_TASK_PLAN_REQUIRED');
        case 'configure_review':
        case 'configure_dispatch':
            return undefined;
        default: return assertNever(request.action);
    }
}
