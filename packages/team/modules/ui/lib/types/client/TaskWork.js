import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import css from './TaskWork.module.css';
/**
 * Select the recorded workflow state without treating old completion flags as reviewed results.
 * @param task - Task from the persisted Team projection.
 * @param ownerRunning - Live Session activity; missing means no reliable activity observation.
 * @param currentGoalRevision - Confirmed goal revision used to distinguish an old plan from executable work.
 * @returns a locale key for planned work, or undefined for an ordinary legacy task.
 */
export function taskWorkStateKey(task, ownerRunning, currentGoalRevision) {
    if (task.dispatchBlocker !== undefined)
        return `work.blocker.${task.dispatchBlocker}`;
    if (task.status === 'pending' && task.writeScopeWarnings.some(warning => warning.startsWith('exclusive resource is owned by task ')))
        return 'work.resourceBusy';
    if (task.work === undefined) {
        if (task.status !== 'in_progress')
            return undefined;
        return ownerRunning === true ? 'status.in_progress' : ownerRunning === false ? 'work.ownerInactive' : 'work.ownerUnknown';
    }
    if (task.work.execution?.phase === 'accepted' && !task.validity.reusable)
        return 'work.stale';
    if (task.status !== 'deleted' && currentGoalRevision !== undefined && task.work.plan.goalRevision !== currentGoalRevision)
        return 'work.goalChanged';
    if (task.work.execution?.phase === 'running') {
        if (ownerRunning === true)
            return 'work.phase.running';
        if (task.recovery !== undefined)
            return `work.recovery.${task.recovery.action}`;
        return ownerRunning === false ? 'work.ownerInactive' : 'work.ownerUnknown';
    }
    return `work.phase.${task.work.execution?.phase ?? 'pending'}`;
}
/**
 * Resolve the execution owner without guessing between members with the same name.
 * @param task - Task from the persisted Team projection.
 * @param members - Members from that projection.
 * @returns the exact owner Session ID when available.
 */
export function taskOwnerSessionId(task, members) {
    if (task.work?.execution?.ownerId !== undefined)
        return task.work.execution.ownerId;
    if (task.ownerName === undefined)
        return undefined;
    const matches = members.filter(member => member.name === task.ownerName);
    return matches.length === 1 ? matches[0]?.id : undefined;
}
/**
 * Find tasks whose visible subjects repeat without removing either task.
 * @param tasks - Current tasks in the Team projection.
 * @returns IDs of tasks whose subjects repeat.
 */
export function duplicateTaskSubjects(tasks) {
    const counts = new Map();
    for (const task of tasks) {
        const subject = task.subject.trim().toLocaleLowerCase();
        counts.set(subject, (counts.get(subject) ?? 0) + 1);
    }
    return new Set(tasks.filter(task => (counts.get(task.subject.trim().toLocaleLowerCase()) ?? 0) > 1).map(task => task.id));
}
/**
 * Observe the owner's Session activity for each task in the shared board.
 * @param team - Current Team projection.
 * @param useSessions - Session summary selector.
 * @param useSessionStatus - Live Session status selector.
 * @returns activity by task ID, with undefined when neither source knows the Session.
 */
export function useTaskActivities(team, useSessions, useSessionStatus) {
    const tasks = team?.tasks ?? [];
    const members = team?.members ?? [];
    const live = useSessionStatus(state => tasks.map((task) => {
        const ownerId = taskOwnerSessionId(task, members);
        const value = ownerId === undefined ? undefined : state.get(ownerId)?.running;
        return value === true ? '1' : value === false ? '0' : '?';
    }).join(''));
    const summaries = useSessions(state => tasks.map((task) => {
        const ownerId = taskOwnerSessionId(task, members);
        const value = ownerId === undefined ? undefined : state.byId[ownerId]?.running;
        return value === true ? '1' : value === false ? '0' : '?';
    }).join(''));
    return new Map(tasks.map((task, index) => [task.id,
        live[index] === '1' ? true : live[index] === '0' ? false
            : summaries[index] === '1' ? true : summaries[index] === '0' ? false : undefined]));
}
/**
 * Display the plan, submitted evidence, and independent review as expandable task details.
 * @param props - Current task and the Team-owned translator.
 * @returns recorded workflow details, or a concise label for an unreviewed historical result.
 */
export function TaskWorkDetails({ task, t }) {
    const work = task.work;
    if (work === undefined)
        return task.status === 'completed' || task.result !== undefined
            ? _jsx("p", { className: css.hint, children: t('work.legacy') }) : null;
    const execution = work.execution;
    const submission = execution?.submission;
    return _jsxs("details", { className: css.details, children: [_jsx("summary", { children: t('work.details') }), _jsxs("dl", { className: css.versions, children: [_jsx("dt", { children: t('work.input') }), _jsx("dd", { children: work.plan.inputVersion }), _jsx("dt", { children: t('work.environment') }), _jsx("dd", { children: work.plan.environmentVersion }), _jsx("dt", { children: t('work.goal') }), _jsx("dd", { children: work.plan.goalRevision }), _jsx("dt", { children: t('work.plan') }), _jsx("dd", { children: work.plan.revision }), _jsx("dt", { children: t('work.attempt') }), _jsx("dd", { children: work.attempts })] }), _jsx("h4", { children: t('work.criteria') }), _jsx("ol", { children: work.plan.acceptanceCriteria.map((criterion, index) => _jsx("li", { children: criterion }, index)) }), submission !== undefined && execution?.phase !== 'accepted' && _jsxs("section", { children: [_jsx("h4", { children: t('work.submission') }), _jsx("p", { children: submission.result }), _jsx("ul", { children: submission.evidence.map((entry, index) => _jsx("li", { children: entry }, index)) })] }), execution?.review !== undefined && _jsxs("section", { children: [_jsx("h4", { children: t('work.review') }), _jsx("p", { children: execution.review.summary }), _jsx("ul", { children: execution.review.evidence.map((entry, index) => _jsx("li", { children: entry }, index)) })] }), task.recovery !== undefined && _jsx("p", { className: css.hint, children: t(`work.recovery.${task.recovery.action}`) }), task.validity.reasons.length > 0 && _jsx("ul", { className: css.hint, children: task.validity.reasons.map(reason => _jsx("li", { children: reason }, reason)) }), _jsx("p", { className: css.hint, children: t('work.declaredVersions') })] });
}
