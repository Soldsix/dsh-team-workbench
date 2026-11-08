import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Complete human-readable roster, task graph and budget from the reviewed project plan. */
import { readProjectPlan } from '@dsh-workbench/team-runtime/client';
import css from './TeamView.module.css';
const roles = { planning_adviser: 'view.function.planningAdviser', quality_adviser: 'view.function.qualityAdviser',
    domain_adviser: 'view.function.domainAdviser', group_lead: 'view.function.groupLead', executor: 'view.function.executor', verifier: 'view.function.verifier' };
/**
 * Render structured plans as labelled sections and retain historical prose verbatim.
 * @param props - Saved plan text and locale.
 * @returns full plan details; no member or task is truncated.
 */
export function ProjectPlanView({ text, t }) {
    let plan;
    try {
        plan = readProjectPlan(text);
    }
    catch (error) {
        if (!(error instanceof Error))
            throw error;
        return _jsx("pre", { className: css.preservedText, children: text });
    }
    if (plan === undefined)
        return _jsx("p", { className: css.preservedText, children: text });
    return _jsxs("div", { className: css.preservedText, children: [plan.automation !== undefined && _jsxs("p", { children: [t('plan.automation'), ": ", t(plan.automation.provision === 'on-demand' ? 'plan.onDemand' : 'plan.manual')] }), _jsx("h4", { children: t('plan.roster') }), _jsx("p", { className: css.hint, children: t('plan.rosterHint') }), _jsx("ul", { children: plan.members.map(member => _jsxs("li", { children: [_jsx("strong", { children: member.name }), " \u00B7 ", t(roles[member.function]), " \u00B7 ", member.parent, _jsxs("p", { children: [member.modelProvider, " / ", member.model, " / ", member.reasoningEffort] }), _jsx("p", { children: member.responsibility }), _jsxs("p", { children: [t('plan.skills'), ": ", member.skills.join(', ') || t('memory.none')] }), member.persona !== undefined && _jsxs("details", { children: [_jsx("summary", { children: t('view.persona') }), _jsx("p", { children: member.persona })] }), member.instructions !== undefined && _jsxs("details", { children: [_jsx("summary", { children: t('roles.instructions') }), _jsx("p", { children: member.instructions })] })] }, member.name)) }), _jsx("h4", { children: t('tasks') }), plan.tasks.map(task => _jsxs("details", { open: true, children: [_jsxs("summary", { children: [task.id, " \u00B7 ", task.description] }), _jsxs("p", { children: [t('plan.owner'), ": ", task.owner, " \u00B7 ", t('plan.reviewer'), ": ", task.reviewer] }), _jsxs("p", { children: [t('plan.dependencies'), ": ", task.dependencies.join(', ') || t('plan.none')] }), _jsxs("p", { children: [t('plan.inputs'), ": ", task.inputs.join(', ') || t('plan.none')] }), _jsxs("p", { children: [t('plan.outputs'), ": ", task.outputs.join(', ') || t('plan.none')] }), task.exclusiveResources !== undefined && _jsxs("p", { children: [t('plan.resources'), ": ", task.exclusiveResources.join(', ') || t('plan.none')] }), _jsx("p", { children: task.critical ? t('plan.dual') : t('plan.independent') }), _jsx("ol", { children: task.acceptanceCriteria.map((criterion, index) => _jsx("li", { children: criterion }, index)) })] }, task.id)), _jsx("h4", { children: t('plan.budget') }), _jsxs("p", { children: [t('plan.members'), ": ", plan.resources.maxMembers, " \u00B7 ", t('plan.requests'), ": ", plan.resources.maxConcurrentRequests] }), _jsx("h4", { children: t('plan.recovery') }), _jsx("p", { children: plan.recovery }), plan.previousTasks.length > 0 && _jsxs(_Fragment, { children: [_jsx("h4", { children: t('plan.previous') }), _jsx("ul", { children: plan.previousTasks.map(task => _jsxs("li", { children: [task.id, " \u00B7 ", t(task.action === 'retain_history' ? 'plan.retain' : 'plan.replan'), " \u00B7 ", task.reason] }, task.id)) })] })] });
}
