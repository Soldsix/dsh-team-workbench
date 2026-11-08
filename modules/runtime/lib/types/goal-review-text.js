/** Human-readable review text with proposal content kept inside labelled fields. */
import { readProjectPlan } from "./project-plan.js";
function literal(value) {
    return value.replace(/[\\`*_{}\[\]()<>#+.!|~\-]/gu, '\\$&').replace(/\r?\n/gu, '\n> ');
}
function field(title, values) {
    return `### ${title}\n\n${values.length === 0 ? 'None.' : values.map(value => `> ${literal(value)}`).join('\n\n')}`;
}
function definitionText(definition) {
    const plan = readProjectPlan(definition.plan);
    const detailed = plan === undefined ? definition.plan : [
        ...plan.members.map(member => `${member.name} ← ${member.parent}\n职责：${member.function}；${member.responsibility}\n模型：${member.modelProvider} / ${member.model} / ${member.reasoningEffort}\n技能：${member.skills.join(', ')}`),
        ...plan.tasks.map(task => `${task.id}：${task.description}\n执行：${task.owner}；复核：${task.reviewer}；${task.critical ? '双军师审核' : '独立复核'}\n前置：${task.dependencies.join(', ')}\n输入：${task.inputs.join(', ')}\n输出：${task.outputs.join(', ')}\n验收：${task.acceptanceCriteria.join('；')}`),
        `资源预算：下级成员 ${plan.resources.maxMembers}，模型请求并发 ${plan.resources.maxConcurrentRequests}`,
        ...plan.previousTasks.map(task => `旧任务 ${task.id}：${task.action}；${task.reason}`),
        `失败与恢复：${plan.recovery}`,
    ].join('\n\n');
    return [
        field('Objective', [definition.objective]),
        field('Acceptance criteria', definition.acceptanceCriteria),
        ...detailed === undefined ? [] : [field('Complete Team plan', [detailed])],
        field('Coverage within the named targets and actions', [definition.scope.coverage]),
        field('Targets', definition.scope.targets),
        field('Allowed actions', definition.scope.allowedActions),
        field('Excluded targets', definition.scope.excludedTargets),
        field('Constraints', definition.scope.constraints),
        ...definition.scope.execution === undefined ? [] : [
            field('Execution resources (enforced for supported tools)', [JSON.stringify(definition.scope.execution)]),
        ],
    ].join('\n\n');
}
/**
 * Show the complete current and proposed scope before the human decides.
 * @param proposal - Exact durable proposal being reviewed.
 * @param current - Current confirmed goal, if present.
 * @returns Markdown suitable for the native plan-review component.
 */
export function renderGoalReview(proposal, current) {
    const proposed = proposal.change.kind === 'replace'
        ? definitionText(proposal.change.definition)
        : field('Reason for withdrawal', [proposal.change.reason]);
    const prior = current === undefined ? 'No confirmed goal.'
        : `Status: ${current.status}. Revision: ${current.revision}.\n\n${definitionText(current.definition)}`;
    return `## Proposed ${proposal.change.kind === 'replace' ? 'goal' : 'withdrawal'} · ${proposal.revision}\n\n${proposed}\n\n## Current goal\n\n${prior}`;
}
