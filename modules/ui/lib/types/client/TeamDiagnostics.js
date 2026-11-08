import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Local diagnostics export omitting user prose, personas, skills and connection settings. */
import { useState } from 'react';
import { readProjectPlan } from 'dsh-team-workbench/runtime/client';
import css from './TeamView.module.css';
/**
 * Create a metadata-only diagnostic snapshot suitable for local support review.
 * @param team - Current Team projection.
 * @param now - Export time, kept explicit for deterministic replay.
 * @returns identifiers and workflow counters without goal text, file paths or model credentials.
 */
export function diagnosticSnapshot(team, now) {
    return { format: 'dsh-team-diagnostics', version: 1, exportedAt: now,
        goal: { revision: team.goal?.revision ?? 0, status: team.goal?.status ?? 'unconfirmed' },
        members: team.members.map(member => ({ id: member.id, parentId: member.parentId, role: member.role,
            function: member.teamFunction, phase: member.phase, legacy: member.legacyMode !== undefined,
            selectedSkills: team.skillSelections?.find(selection => selection.memberId === member.id)?.skills.length ?? 0 })),
        tasks: team.tasks.map(task => ({ id: task.id, revision: task.revision, status: task.status,
            executionId: task.work?.execution?.id, phase: task.work?.execution?.phase,
            goalRevision: task.work?.plan.goalRevision, dependencies: task.blockedBy, blocker: task.dispatchBlocker,
            reusable: task.validity.reusable, requiredCriteria: task.work?.plan.acceptanceCriteria.length ?? 0 })),
        completed: team.completedTaskCount ?? 0,
        evidence: { adviserDecisions: team.adviserDecisions?.length ?? 0 },
        limits: { externalConfinementVerified: false, toolHealthVerified: false, providerCostKnown: false },
    };
}
/** Display only observed workflow diagnostics and explicitly identify unverified host resources. */
export function TeamDiagnostics({ team, t }) {
    const [error, setError] = useState(null);
    let plan;
    try {
        plan = readProjectPlan(team.goal?.definition.plan);
    }
    catch (failure) {
        if (!(failure instanceof Error))
            throw failure;
        plan = undefined;
    }
    const needsReview = team.tasks.filter(task => task.work?.execution?.phase === 'submitted').length;
    const resourceWaits = team.tasks.filter(task => task.status === 'pending'
        && task.writeScopeWarnings.some(warning => warning.startsWith('exclusive resource is owned by task '))).length;
    return _jsxs("section", { className: css.memory, children: [_jsx("h2", { children: t('diagnostics.title') }), _jsx("p", { className: css.hint, children: t('diagnostics.hint') }), _jsxs("dl", { className: css.diagnosticGrid, children: [_jsx("dt", { children: t('diagnostics.goal') }), _jsx("dd", { children: team.goal?.revision ?? 0 }), _jsx("dt", { children: t('diagnostics.provision') }), _jsx("dd", { children: t(plan?.automation?.provision === 'on-demand' ? 'plan.onDemand' : 'plan.manual') }), _jsx("dt", { children: t('plan.members') }), _jsx("dd", { children: plan?.resources.maxMembers ?? t('diagnostics.unknown') }), _jsx("dt", { children: t('plan.requests') }), _jsx("dd", { children: plan?.resources.maxConcurrentRequests ?? t('diagnostics.unknown') }), _jsx("dt", { children: t('diagnostics.review') }), _jsx("dd", { children: needsReview }), _jsx("dt", { children: t('work.resourceBusy') }), _jsx("dd", { children: resourceWaits }), _jsx("dt", { children: t('diagnostics.failed') }), _jsx("dd", { children: team.members.filter(member => member.phase === 'failed').length })] }), _jsx("p", { children: t('diagnostics.health') }), _jsx("p", { children: t('diagnostics.cost') }), _jsx("p", { children: t('view.isolationHint') }), _jsx("button", { type: "button", className: css.button, onClick: () => {
                    try {
                        const url = URL.createObjectURL(new Blob([JSON.stringify(diagnosticSnapshot(team, Date.now()), null, 2)], { type: 'application/json' }));
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'team-workbench-diagnostics.json';
                        link.click();
                        setTimeout(() => { URL.revokeObjectURL(url); }, 0);
                        setError(null);
                    }
                    catch (failure) {
                        setError(String(failure));
                    }
                }, children: t('diagnostics.export') }), error !== null && _jsx("p", { role: "alert", className: css.error, children: error })] });
}
