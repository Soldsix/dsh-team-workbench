/** Independent planning and quality decisions on one submitted execution. */
import { memberFunction, memberRoleRevision } from "./member-role.js";
/**
 * Check the latest finding from each adviser role for one current execution.
 * @param state - Authoritative Team state.
 * @param task - Task carrying the submitted execution.
 * @returns latest current findings for the two required roles.
 */
function currentFindings(state, task) {
    const executionId = task.work?.execution?.id;
    if (executionId === undefined || task.work?.execution?.phase !== 'submitted')
        return [];
    const decisions = (state.adviserDecisions ?? []).filter(value => value.taskId === task.id
        && value.executionId === executionId && value.goalRevision === state.goal?.revision
        && (value.adviserRoleRevision ?? 0) === memberRoleRevision(state, value.adviserId)
        && state.members.some(member => member.id === value.adviserId && member.phase === 'active'
            && memberFunction(state, member) === value.adviserFunction));
    return ['planning_adviser', 'quality_adviser'].map(role => decisions.findLast(value => value.adviserFunction === role));
}
/**
 * Check whether distinct current advisers approved this submitted execution.
 * @param state - Authoritative team state.
 * @param task - Current submitted task.
 * @returns whether both required roles approved.
 */
export function hasDualAdviserApproval(state, task) {
    const [planning, quality] = currentFindings(state, task);
    return planning?.decision === 'approve' && quality?.decision === 'approve'
        && planning.adviserId !== quality.adviserId;
}
/**
 * Detect the latest required adviser request for independent revision review.
 * @param state - Authoritative team state.
 * @param task - Current submitted task.
 * @returns whether a current required role requests revision.
 */
export function hasAdviserRevisionRequest(state, task) {
    return currentFindings(state, task).some(value => value?.decision === 'revise');
}
