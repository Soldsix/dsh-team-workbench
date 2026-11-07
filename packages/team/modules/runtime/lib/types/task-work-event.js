/** Persisted task-work transitions checked against the already accepted Team prefix. */
import { assertNever } from '@deepseek-ai/dsh-util-values';
import { taskRecordValidity, taskWorkChanges } from "./task-work.js";
import { taskEffectCallCount, taskEffectsNeedReview } from "./task-effects.js";
/**
 * Reject a task record that would reuse an execution or rewrite accepted inputs or evidence.
 * @param state - Accepted Team state before the candidate event.
 * @param previous - Earlier task revision, if one exists.
 * @param task - Parsed candidate task record.
 */
export function assertTaskWorkEvent(state, previous, task) {
    const work = task.work;
    const prior = previous?.work;
    if (previous !== undefined && previous.status === 'in_progress' && task.autoAssign === false) {
        const { revision: _revision, autoAssign: _assign, autoDispatch: _dispatch, ...candidate } = task;
        const { revision: _priorRevision, autoAssign: _priorAssign, autoDispatch: _priorDispatch, ...base } = previous;
        if (JSON.stringify(candidate) === JSON.stringify(base)
            && (task.autoDispatch === previous.autoDispatch || task.autoDispatch === true))
            return;
    }
    if (previous !== undefined && (task.reviewerId !== previous.reviewerId
        || work?.execution?.phase === 'submitted' && task.autoDispatch !== previous.autoDispatch)) {
        const { revision: _revision, reviewerId: _reviewer, autoDispatch: _dispatch, ...candidate } = task;
        const { revision: _priorRevision, reviewerId: _priorReviewer, autoDispatch: _priorDispatch, ...base } = previous;
        if (JSON.stringify(candidate) === JSON.stringify(base)) {
            if (!['pending', 'in_progress'].includes(task.status) || task.reviewerId === undefined
                || task.autoDispatch !== previous.autoDispatch && (task.autoDispatch !== true || work?.execution?.phase !== 'submitted')
                || task.reviewerId === task.ownerId || String(task.reviewerId) !== state.id
                && !state.members.some(member => member.id === task.reviewerId && member.phase === 'active')) {
                throw new Error('review assignment requires an independent active member and unfinished task');
            }
            return;
        }
    }
    if (work === undefined) {
        if (prior !== undefined)
            throw new Error('versioned task work cannot be removed');
        return;
    }
    const activeMember = (id) => id === state.id || state.members.some(candidate => candidate.id === id && candidate.phase === 'active');
    const planChanged = prior === undefined || work.plan.revision !== prior.plan.revision;
    if (planChanged && !activeMember(work.plan.plannerId))
        throw new Error('task planner is not an active Team member');
    if (planChanged) {
        if (prior?.execution?.phase === 'running' || prior?.execution?.phase === 'submitted'
            || previous !== undefined && taskEffectsNeedReview(state, previous)) {
            throw new Error('an unresolved execution cannot be replaced by a new plan');
        }
        if (prior !== undefined && previous?.inputKey !== undefined)
            throw new Error('a keyed task plan cannot be replaced');
        if (previous !== undefined && task.inputKey !== previous.inputKey)
            throw new Error('a task input key cannot be replaced');
        if (work.plan.revision !== (prior?.plan.revision ?? 0) + 1 || work.attempts !== (prior?.attempts ?? 0)
            || work.execution !== undefined || work.plan.goalRevision !== (state.goal?.revision ?? 0)) {
            throw new Error('new task plan must advance once, capture the current goal, and have no execution');
        }
    }
    else if (JSON.stringify(work.plan) !== JSON.stringify(prior.plan)
        || task.subject !== previous?.subject || task.description !== previous.description
        || JSON.stringify(task.blockedBy) !== JSON.stringify(previous.blockedBy)
        || JSON.stringify(task.writeScopes) !== JSON.stringify(previous.writeScopes)
        || task.inputKey !== previous.inputKey) {
        throw new Error('task inputs cannot change within the same plan revision');
    }
    const run = work.execution;
    const oldRun = prior?.execution;
    if (run === undefined) {
        if (!planChanged && (oldRun !== undefined || work.attempts !== prior.attempts))
            throw new Error('task execution cannot disappear within one plan');
        if (task.status !== 'pending' && task.status !== 'deleted' || task.ownerId !== undefined
            || task.result !== undefined || task.evidence !== undefined)
            throw new Error('a task without an execution must remain unowned and uncompleted');
        return;
    }
    if (run.id !== `${task.id}/run-${work.attempts}` || run.planRevision !== work.plan.revision)
        throw new Error('task execution identity does not match its attempt and plan');
    if (oldRun?.id !== run.id) {
        if (!activeMember(run.ownerId))
            throw new Error('task executor is not an active Team member');
        if (run.effectReview !== undefined)
            throw new Error('a new execution cannot carry an earlier effect review');
        if (oldRun?.phase === 'submitted' || oldRun?.phase === 'accepted')
            throw new Error('release or reopen the previous execution before starting another');
        if (work.attempts !== (prior?.attempts ?? 0) + 1 || run.phase !== 'running')
            throw new Error('a new task execution must advance the attempt and start running');
        if (run.dependencies.length !== task.blockedBy.length || run.dependencies.some(item => !task.blockedBy.includes(item.taskId))) {
            throw new Error('task execution must capture every declared dependency');
        }
        for (const consumed of run.dependencies) {
            const dependency = state.tasks.find(candidate => candidate.id === consumed.taskId);
            if (dependency === undefined || dependency.revision !== consumed.revision || !taskRecordValidity(state, dependency).reusable) {
                throw new Error('task execution requires current independently accepted dependencies');
            }
        }
        if (taskWorkChanges(state, task).length > 0)
            throw new Error('task execution cannot start under a stale goal');
    }
    else {
        if (work.attempts !== prior?.attempts || run.ownerId !== oldRun.ownerId
            || run.effectTracking !== oldRun.effectTracking
            || run.planRevision !== oldRun.planRevision || JSON.stringify(run.dependencies) !== JSON.stringify(oldRun.dependencies)) {
            throw new Error('task execution identity and consumed versions are immutable');
        }
        const effectReviewChanged = JSON.stringify(run.effectReview) !== JSON.stringify(oldRun.effectReview);
        if (oldRun.review === undefined && run.review !== undefined && !activeMember(run.review.reviewerId)
            || effectReviewChanged && run.effectReview !== undefined && !activeMember(run.effectReview.reviewerId)) {
            throw new Error('task reviewer is not an active Team member');
        }
        if (effectReviewChanged && (run.effectReview === undefined || run.effectReview.reviewerId === run.ownerId
            || run.effectReview.evidence.length === 0 || run.effectReview.observedCalls <= (oldRun.effectReview?.observedCalls ?? -1)
            || run.effectReview.observedCalls !== taskEffectCallCount(state, task))) {
            throw new Error('external effect review must be independent and advance observed calls');
        }
        if (oldRun.submission !== undefined && JSON.stringify(run.submission) !== JSON.stringify(oldRun.submission)
            || oldRun.review !== undefined && JSON.stringify(run.review) !== JSON.stringify(oldRun.review)) {
            throw new Error('task submission and review records cannot be rewritten');
        }
        if (run.phase === 'cancelled' && (JSON.stringify(run.submission) !== JSON.stringify(oldRun.submission)
            || JSON.stringify(run.review) !== JSON.stringify(oldRun.review))) {
            throw new Error('cancellation must retain exactly the existing submission and review');
        }
        if (!(run.phase === 'cancelled' || oldRun.phase === run.phase && effectReviewChanged
            || oldRun.phase === 'running' && run.phase === 'submitted'
            || oldRun.phase === 'submitted' && (run.phase === 'accepted' || run.phase === 'rejected'))) {
            throw new Error(`task execution cannot move from ${oldRun.phase} to ${run.phase}`);
        }
        if (run.phase !== 'cancelled' && !effectReviewChanged
            && taskWorkChanges(state, task).length > 0)
            throw new Error('stale task execution cannot submit or pass review');
    }
    switch (run.phase) {
        case 'running':
        case 'submitted':
            if (task.status !== 'in_progress' || task.ownerId !== run.ownerId || task.result !== undefined || task.evidence !== undefined) {
                throw new Error('unreviewed task execution must stay in progress without an accepted result');
            }
            break;
        case 'accepted':
            if (task.status !== 'completed' || task.ownerId !== run.ownerId || task.result !== run.submission?.result
                || JSON.stringify(task.evidence) !== JSON.stringify(run.submission?.evidence)) {
                throw new Error('accepted task result must match the independently reviewed submission');
            }
            break;
        case 'rejected':
        case 'cancelled':
            if (task.status !== 'pending' && task.status !== 'deleted' || task.ownerId !== undefined || task.result !== undefined || task.evidence !== undefined) {
                throw new Error('rejected or cancelled execution cannot retain active ownership or an accepted result');
            }
            break;
        default: assertNever(run.phase);
    }
}
