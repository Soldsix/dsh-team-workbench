import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Native editing of proposals and inspection of user-confirmed Team scope. */
import { useEffect, useId, useRef, useState } from 'react';
import { isRemoteFailure } from '@deepseek-ai/dsh-api-gateway/client';
import css from './TeamGoals.module.css';
import { ProjectPlanView } from "./ProjectPlanView.js";
const listFields = ['acceptanceCriteria', 'targets', 'allowedActions', 'excludedTargets', 'constraints'];
const resourceFields = ['readPaths', 'writePaths', 'webOrigins'];
function draftFrom(state) {
    const proposal = state.goalProposal?.change;
    const definition = proposal?.kind === 'replace' ? proposal.definition : state.goal?.definition;
    return {
        goalRevision: state.goal?.revision ?? 0, proposalRevision: state.goalProposal?.revision ?? 0,
        objective: definition?.objective ?? '', coverage: definition?.scope.coverage ?? 'task',
        plan: definition?.plan ?? '',
        acceptanceCriteria: definition?.acceptanceCriteria.join('\n') ?? '', targets: definition?.scope.targets.join('\n') ?? '',
        allowedActions: definition?.scope.allowedActions.join('\n') ?? '', excludedTargets: definition?.scope.excludedTargets.join('\n') ?? '',
        constraints: definition?.scope.constraints.join('\n') ?? '',
        readPaths: definition?.scope.execution?.readPaths.join('\n') ?? '.',
        writePaths: definition?.scope.execution?.writePaths.join('\n') ?? '',
        webOrigins: definition?.scope.execution?.webOrigins.join('\n') ?? '',
        allowSearch: definition?.scope.execution?.allowSearch ?? true,
        allowUnrestrictedExecution: definition?.scope.execution?.allowUnrestrictedExecution ?? false,
    };
}
function lines(text) { return text.split(/\r?\n/u).map(line => line.trim()).filter(Boolean); }
function Definition({ definition, t }) {
    const execution = definition.scope.execution;
    return _jsxs("dl", { className: css.definition, children: [_jsxs("div", { children: [_jsx("dt", { children: t('goals.objective') }), _jsx("dd", { children: definition.objective })] }), definition.plan !== undefined && _jsxs("div", { children: [_jsx("dt", { children: t('goals.plan') }), _jsx("dd", { children: _jsx(ProjectPlanView, { text: definition.plan, t: t }) })] }), _jsxs("div", { children: [_jsx("dt", { children: t('goals.coverage') }), _jsx("dd", { children: t(`goals.coverage.${definition.scope.coverage}`) })] }), listFields.map((field) => {
                const values = field === 'acceptanceCriteria' ? definition.acceptanceCriteria : definition.scope[field];
                return _jsxs("div", { children: [_jsx("dt", { children: t(`goals.${field}`) }), _jsx("dd", { children: values.length === 0 ? t('memory.none')
                                : _jsx("ul", { children: values.map((value, index) => _jsx("li", { children: value }, index)) }) })] }, field);
            }), execution !== undefined && _jsxs(_Fragment, { children: [resourceFields.map(field => _jsxs("div", { children: [_jsx("dt", { children: t(`goals.${field}`) }), _jsx("dd", { children: execution[field].join('\n') || t('memory.none') })] }, field)), _jsxs("div", { children: [_jsx("dt", { children: t('goals.allowSearch') }), _jsx("dd", { children: t(execution.allowSearch ? 'goals.enabled' : 'goals.disabled') })] }), _jsxs("div", { children: [_jsx("dt", { children: t('goals.allowUnrestrictedExecution') }), _jsx("dd", { children: t(execution.allowUnrestrictedExecution ? 'goals.enabled' : 'goals.disabled') })] })] })] });
}
/**
 * Edit complete proposals while retaining the confirmed values and concurrent drafts.
 * @param props - Lead identity, live projection, Remote operations, and localized copy.
 * @returns goal status, scope details, and native human review controls.
 */
export function TeamGoals({ sessionId, state, operations, openReview, t }) {
    const [draft, setDraft] = useState(null);
    const [revoking, setRevoking] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);
    const lifetime = useRef(new AbortController());
    const id = useId();
    const goalRevision = state.goal?.revision ?? 0;
    const proposalRevision = state.goalProposal?.revision ?? 0;
    const pending = state.goalProposal !== undefined && state.goalDecision?.proposalRevision !== proposalRevision;
    const stale = draft !== null && (draft.goalRevision !== goalRevision || draft.proposalRevision !== proposalRevision);
    useEffect(() => {
        const controller = new AbortController();
        lifetime.current = controller;
        return () => { controller.abort(); };
    }, []);
    const report = (failure) => {
        if (!isRemoteFailure(failure))
            throw failure;
        setError(t(failure.code === 'TEAM_GOAL_STALE' ? 'goals.conflict'
            : failure.code === 'TEAM_GOAL_REVIEW_PENDING' ? 'goals.alreadyReviewing'
                : failure.code === 'TEAM_GOAL_NO_REVIEWER' ? 'goals.noReviewer'
                    : failure.code === 'TEAM_GOAL_INVALID' ? 'goals.invalid'
                        : failure.code === 'TEAM_GOAL_TOO_LARGE' ? 'goals.tooLarge' : 'goals.failed'));
    };
    const review = async (revision) => {
        const signal = lifetime.current.signal;
        setBusy('reviewing');
        setError(null);
        openReview();
        try {
            await operations.review(sessionId, revision);
        }
        catch (failure) {
            if (!signal.aborted)
                report(failure);
        }
        finally {
            if (!signal.aborted)
                setBusy(null);
        }
    };
    const save = async (change) => {
        if (draft === null)
            return;
        const signal = lifetime.current.signal;
        setBusy('saving');
        setError(null);
        try {
            const proposal = await operations.propose(sessionId, {
                expectedGoalRevision: draft.goalRevision, expectedProposalRevision: draft.proposalRevision, change,
            }, signal);
            if (signal.aborted)
                return;
            setDraft(null);
            setRevoking(false);
            setReason('');
            await review(proposal.revision);
        }
        catch (failure) {
            if (!signal.aborted) {
                report(failure);
                setBusy(null);
            }
        }
    };
    const replace = () => {
        if (draft === null)
            return;
        const definition = {
            objective: draft.objective.trim(), acceptanceCriteria: lines(draft.acceptanceCriteria), plan: draft.plan.trim(),
            scope: { coverage: draft.coverage, targets: lines(draft.targets), allowedActions: lines(draft.allowedActions),
                excludedTargets: lines(draft.excludedTargets), constraints: lines(draft.constraints),
                execution: { readPaths: lines(draft.readPaths), writePaths: lines(draft.writePaths), webOrigins: lines(draft.webOrigins),
                    allowSearch: draft.allowSearch, allowUnrestrictedExecution: draft.allowUnrestrictedExecution } },
        };
        if (!definition.objective || !definition.plan || definition.acceptanceCriteria.length === 0 || definition.scope.targets.length === 0
            || definition.scope.allowedActions.length === 0) {
            setError(t('goals.invalid'));
            return;
        }
        void save({ kind: 'replace', definition });
    };
    return _jsxs("div", { className: css.page, "data-team-goals": true, children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { children: [_jsx("h2", { children: t('view.goals') }), _jsx("p", { className: css.hint, children: t('goals.hint') })] }), _jsx("span", { className: css.status, children: state.goal === undefined ? t('goals.unconfirmed')
                            : t(state.goal.status === 'active' ? 'goals.active' : 'goals.revoked', { revision: state.goal.revision }) })] }), state.goal !== undefined && _jsxs(_Fragment, { children: [state.goal.status === 'revoked' && _jsxs("p", { role: "status", className: css.notice, children: [t('goals.revokedHint'), " ", state.goal.revocationReason] }), _jsx(Definition, { definition: state.goal.definition, t: t })] }), state.goal === undefined && _jsx("p", { className: css.hint, children: t('goals.empty') }), pending && _jsxs("section", { className: css.pending, children: [_jsx("h3", { children: t('goals.pending', { revision: proposalRevision }) }), state.goalProposal.change.kind === 'replace' ? _jsxs("details", { open: true, children: [_jsx("summary", { children: t('goals.proposalDetails') }), _jsx(Definition, { definition: state.goalProposal.change.definition, t: t })] })
                        : _jsxs("p", { children: [t('goals.revocation'), ": ", state.goalProposal.change.reason] }), _jsx("button", { type: "button", className: css.button, disabled: busy !== null, onClick: () => { void review(proposalRevision); }, children: t('goals.review') })] }), !pending && state.goalDecision?.outcome === 'rejected' && _jsxs("p", { role: "status", className: css.notice, children: [t('goals.rejected'), " ", state.goalDecision.comment] }), error !== null && _jsx("p", { role: "alert", className: css.error, children: error }), busy === 'reviewing' && _jsx("p", { role: "status", className: css.notice, children: t('goals.reviewing') }), draft === null ? _jsxs("div", { className: css.actions, children: [_jsx("button", { type: "button", className: css.button, disabled: busy !== null, onClick: () => {
                            setDraft(draftFrom(state));
                            setRevoking(false);
                            setError(null);
                        }, children: t(state.goal === undefined ? 'goals.create' : state.goal.status === 'revoked' ? 'goals.restore' : 'goals.edit') }), state.goal?.status === 'active' && _jsx("button", { type: "button", className: css.textButton, disabled: busy !== null, onClick: () => {
                            setDraft(draftFrom(state));
                            setRevoking(true);
                            setReason('');
                            setError(null);
                        }, children: t('goals.revoke') })] }) : _jsxs("form", { className: css.editor, onSubmit: (event) => {
                    event.preventDefault();
                    if (busy !== null || stale)
                        return;
                    if (!revoking)
                        replace();
                    else if (reason.trim())
                        void save({ kind: 'revoke', reason: reason.trim() });
                    else
                        setError(t('goals.reasonRequired'));
                }, children: [_jsx("h3", { children: t(revoking ? 'goals.revocation' : 'goals.editing') }), stale && _jsxs("div", { className: css.notice, children: [_jsx("p", { children: t('goals.conflict') }), _jsx("button", { type: "button", className: css.button, disabled: busy !== null, onClick: () => {
                                    setDraft({ ...draft, goalRevision, proposalRevision });
                                    setError(null);
                                }, children: t('goals.keepDraft') })] }), _jsx("fieldset", { className: css.fields, disabled: busy !== null, children: revoking ? _jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: `${id}-reason`, children: t('goals.reason') }), _jsx("textarea", { id: `${id}-reason`, rows: 3, value: reason, onChange: (event) => { setReason(event.target.value); } })] }) : _jsxs(_Fragment, { children: [_jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: `${id}-objective`, children: t('goals.objective') }), _jsx("textarea", { id: `${id}-objective`, rows: 3, value: draft.objective, onChange: (event) => { setDraft({ ...draft, objective: event.target.value }); } })] }), _jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: `${id}-plan`, children: t('goals.plan') }), _jsx("textarea", { id: `${id}-plan`, rows: 9, value: draft.plan, onChange: (event) => { setDraft({ ...draft, plan: event.target.value }); } }), _jsx("small", { className: css.hint, children: t('goals.planHint') })] }), _jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: `${id}-coverage`, children: t('goals.coverage') }), _jsx("select", { id: `${id}-coverage`, value: draft.coverage, onChange: (event) => {
                                                const value = event.target.value;
                                                if (value === 'task' || value === 'partial' || value === 'full')
                                                    setDraft({ ...draft, coverage: value });
                                            }, children: ['task', 'partial', 'full'].map(value => _jsx("option", { value: value, children: t(`goals.coverage.${value}`) }, value)) }), _jsx("small", { className: css.hint, children: t('goals.coverageHint') })] }), _jsx("p", { className: css.hint, children: t('goals.linesHint') }), listFields.map(field => _jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: `${id}-${field}`, children: t(`goals.${field}`) }), _jsx("textarea", { id: `${id}-${field}`, rows: 3, value: draft[field], onChange: (event) => { setDraft({ ...draft, [field]: event.target.value }); } })] }, field)), _jsxs("details", { children: [_jsx("summary", { children: t('goals.executionScope') }), _jsx("p", { className: css.hint, children: t('goals.executionHint') }), resourceFields.map(field => _jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: `${id}-${field}`, children: t(`goals.${field}`) }), _jsx("textarea", { id: `${id}-${field}`, rows: 2, value: draft[field], onChange: (event) => { setDraft({ ...draft, [field]: event.target.value }); } })] }, field)), ['allowSearch', 'allowUnrestrictedExecution'].map(field => _jsx("div", { className: css.field, children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: draft[field], onChange: (event) => { setDraft({ ...draft, [field]: event.target.checked }); } }), " ", t(`goals.${field}`)] }) }, field))] })] }) }), _jsxs("div", { className: css.actions, children: [_jsx("button", { type: "submit", className: css.button, disabled: busy !== null || stale, children: t(busy === 'saving' ? 'goals.saving' : 'goals.saveAndReview') }), _jsx("button", { type: "button", className: css.textButton, disabled: busy !== null, onClick: () => { setDraft(null); setRevoking(false); setError(null); }, children: t('goals.cancelEdit') })] })] })] });
}
