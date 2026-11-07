import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Show the latest independent findings for the selected task execution.
 * @param props - Current task, saved adviser findings, and locale resolver.
 * @returns a compact review section for a dual-adviser task.
 */
export function AdviserFindings({ task, findings, t }) {
    if (task.work?.plan.adviserGate !== 'dual')
        return null;
    const executionId = task.work.execution?.id;
    const current = (findings ?? []).filter(value => value.taskId === task.id
        && value.executionId === executionId && value.goalRevision === task.work?.plan.goalRevision);
    const planning = current.findLast(value => value.adviserFunction === 'planning_adviser');
    const quality = current.findLast(value => value.adviserFunction === 'quality_adviser');
    const render = (label, value) => _jsxs("li", { children: [_jsx("strong", { children: label }), " \u00B7 ", value === undefined ? t('work.adviserPending')
                : value.decision === 'approve' ? t('work.adviserApproved') : t('work.adviserRevise'), value !== undefined && _jsxs(_Fragment, { children: [_jsx("p", { children: value.summary }), _jsx("ul", { children: value.evidence.map((item, index) => _jsx("li", { children: item }, index)) })] })] });
    return _jsxs("details", { children: [_jsx("summary", { children: t('work.adviserGate') }), _jsxs("ul", { children: [render(t('view.function.planningAdviser'), planning), render(t('view.function.qualityAdviser'), quality)] })] });
}
