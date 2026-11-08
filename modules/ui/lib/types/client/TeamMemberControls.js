import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Member history and private workspace actions in the native Team view. */
import { useEffect, useRef, useState } from 'react';
import { memberFunctionKey } from "./team-view-data.js";
import css from './TeamView.module.css';
/**
 * Show lifecycle and integration controls only for a selected teammate.
 * @param props - Selected member, live activity, Remote actions, and locale.
 * @returns controls retaining the selected member's history.
 */
export function TeamMemberControls({ sessionId, member, inactive, operations, t }) {
    const [workspace, setWorkspace] = useState(undefined);
    const [catalog, setCatalog] = useState(null);
    const [modelProvider, setModelProvider] = useState(member.modelProvider ?? '');
    const [model, setModel] = useState(member.model ?? '');
    const [reasoningEffort, setReasoningEffort] = useState(member.reasoningEffort ?? '');
    const [teamFunction, setTeamFunction] = useState(member.teamFunction ?? '');
    const [roleReason, setRoleReason] = useState('');
    const [modelError, setModelError] = useState(false);
    const [modelRead, setModelRead] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const controller = useRef(new AbortController());
    const inFlight = useRef(false);
    const modelDraft = useRef(false);
    const modelBaseRevision = useRef(member.modelRouteRevision ?? 0);
    useEffect(() => {
        const lifetime = new AbortController();
        controller.current = lifetime;
        modelDraft.current = false;
        modelBaseRevision.current = member.modelRouteRevision ?? 0;
        setWorkspace(undefined);
        setError(null);
        setNotice(null);
        setBusy(false);
        inFlight.current = false;
        void operations.workspace(sessionId, member.name).then((value) => {
            if (!lifetime.signal.aborted)
                setWorkspace(value);
        }, () => { if (!lifetime.signal.aborted)
            setError(t('member.workspaceFailed')); });
        return () => { lifetime.abort(); };
    }, [sessionId, member.id, member.name, operations, t]);
    useEffect(() => {
        let current = true;
        setCatalog(null);
        setModelError(false);
        if (!modelDraft.current) {
            modelBaseRevision.current = member.modelRouteRevision ?? 0;
            setModelProvider(member.modelProvider ?? '');
            setModel(member.model ?? '');
            setReasoningEffort(member.reasoningEffort ?? '');
        }
        void operations.models().then((value) => {
            if (!current)
                return;
            setCatalog(value);
            if (modelDraft.current)
                return;
            if (member.modelProvider !== undefined) {
                setModelProvider(member.modelProvider);
                setModel(member.model ?? '');
                setReasoningEffort(member.reasoningEffort ?? '');
                return;
            }
            const group = value.groups.find(candidate => candidate.id === value.default.provider)
                ?? value.groups[0];
            const currentModel = group?.models.find(candidate => candidate.id === member.model);
            const selected = currentModel ?? group?.models.find(candidate => candidate.id === value.default.model)
                ?? group?.models[0];
            setModelProvider(group?.id ?? '');
            setModel(selected?.id ?? '');
            setReasoningEffort(currentModel?.reasoning?.efforts.some(effort => effort.id === member.reasoningEffort)
                ? member.reasoningEffort ?? '' : '');
        }, () => { if (current)
            setModelError(true); });
        return () => { current = false; };
    }, [sessionId, member.id, member.modelProvider, member.model, member.reasoningEffort, member.modelRouteRevision, modelRead, operations]);
    useEffect(() => { setTeamFunction(member.teamFunction ?? ''); setRoleReason(''); }, [member.id, member.teamFunction, member.roleRevision]);
    const functions = ['planning_adviser', 'quality_adviser', 'domain_adviser', 'group_lead', 'executor', 'verifier'];
    const run = async (action) => {
        if (inFlight.current)
            return;
        inFlight.current = true;
        setBusy(true);
        setError(null);
        setNotice(null);
        const signal = controller.current.signal;
        try {
            if (action === 'configureRole') {
                if (teamFunction === '')
                    return;
                await operations.configureRole(sessionId, { target: member.name, expectedRevision: member.roleRevision ?? 0,
                    teamFunction, reason: roleReason }, signal);
                if (!signal.aborted)
                    setNotice(t('member.roleSaved'));
            }
            else if (action === 'configure') {
                const saved = await operations.configureModel(sessionId, {
                    target: member.name, expectedRevision: modelBaseRevision.current, modelProvider, model,
                    ...reasoningEffort === '' ? {} : { reasoningEffort },
                }, signal);
                if (!signal.aborted) {
                    modelDraft.current = false;
                    modelBaseRevision.current = saved.modelRouteRevision ?? member.modelRouteRevision ?? 0;
                    setNotice(t('member.modelSaved'));
                }
            }
            else if (action === 'integrate') {
                const result = await operations.integrate(sessionId, member.name, signal);
                if (!signal.aborted)
                    setNotice(result.paths.length === 0
                        ? t('member.integratedEmpty') : t('member.integratedPaths', { paths: result.paths.join(', ') }));
            }
            else {
                await operations[action](sessionId, member.name, signal);
                if (!signal.aborted)
                    setNotice(t(action === 'retire' ? 'member.retired' : 'member.reactivated'));
            }
        }
        catch (cause) {
            const detail = typeof cause === 'object' && cause !== null && 'message' in cause && typeof cause.message === 'string'
                ? cause.message.trim() : '';
            if (!signal.aborted)
                setError(detail === '' ? t('member.actionFailed') : `${t('member.actionFailed')} ${detail}`);
        }
        finally {
            if (!signal.aborted) {
                inFlight.current = false;
                setBusy(false);
            }
        }
    };
    const provider = catalog?.groups.find(group => group.id === modelProvider);
    const selectedModel = provider?.models.find(candidate => candidate.id === model);
    return _jsxs("section", { className: css.memberActions, "aria-label": t('member.actions'), children: [_jsx("h3", { children: t('member.actions') }), _jsxs("div", { className: css.memberModelForm, children: [_jsx("h4", { children: t('member.modelTitle') }), _jsx("p", { className: css.hint, children: t('member.modelHint') }), catalog === null ? _jsxs("div", { role: "status", children: [t(modelError ? 'member.modelCatalogFailed' : 'loading'), modelError && _jsx("button", { type: "button", className: css.button, onClick: () => { setModelRead(value => value + 1); }, children: t('member.retryModels') })] }) : _jsxs(_Fragment, { children: [_jsxs("label", { children: [t('roles.provider'), _jsxs("select", { value: modelProvider, onChange: (event) => {
                                            modelDraft.current = true;
                                            const next = catalog.groups.find(group => group.id === event.target.value);
                                            setModelProvider(event.target.value);
                                            setModel(next?.models[0]?.id ?? '');
                                            setReasoningEffort('');
                                        }, children: [provider === undefined && modelProvider !== '' && _jsx("option", { value: modelProvider, disabled: true, children: t('member.unlistedRoute', { name: modelProvider }) }), catalog.groups.map(group => _jsx("option", { value: group.id, children: group.name }, group.id))] })] }), _jsxs("label", { children: [t('model'), _jsxs("select", { value: model, onChange: (event) => { modelDraft.current = true; setModel(event.target.value); setReasoningEffort(''); }, children: [selectedModel === undefined && model !== '' && _jsx("option", { value: model, disabled: true, children: t('member.unlistedRoute', { name: model }) }), provider?.models.map(candidate => _jsx("option", { value: candidate.id, children: candidate.name }, candidate.id))] })] }), _jsxs("label", { children: [t('reasoningEffort'), _jsxs("select", { value: reasoningEffort, onChange: (event) => { modelDraft.current = true; setReasoningEffort(event.target.value); }, children: [_jsx("option", { value: "", children: t('member.highestEffort') }), reasoningEffort !== '' && !selectedModel?.reasoning?.efforts.some(effort => effort.id === reasoningEffort)
                                                && _jsx("option", { value: reasoningEffort, disabled: true, children: reasoningEffort }), selectedModel?.reasoning?.efforts.map(effort => _jsx("option", { value: effort.id, children: effort.name }, effort.id))] })] }), _jsx("button", { type: "button", className: css.button, disabled: busy || model === '' || selectedModel === undefined, onClick: () => { void run('configure'); }, children: t('member.saveModel') })] })] }), _jsxs("div", { className: css.memberModelForm, children: [_jsx("h4", { children: t('member.roleTitle') }), _jsx("p", { className: css.hint, children: t('member.roleHint') }), _jsxs("label", { children: [t('member.roleTitle'), _jsxs("select", { value: teamFunction, disabled: busy || !inactive, onChange: (event) => {
                                    const selected = functions.find(value => value === event.target.value);
                                    setTeamFunction(selected ?? '');
                                }, children: [_jsx("option", { value: "", children: t('member.roleUnset') }), functions.map(value => _jsx("option", { value: value, children: t(memberFunctionKey({ ...member, teamFunction: value })) }, value))] })] }), _jsxs("label", { children: [t('member.roleReason'), _jsx("input", { value: roleReason, onChange: (event) => { setRoleReason(event.target.value); } })] }), _jsx("button", { type: "button", className: css.button, disabled: busy || !inactive || teamFunction === '' || roleReason.trim() === '', onClick: () => { void run('configureRole'); }, children: t('member.saveRole') })] }), member.phase === 'active' && _jsx("button", { type: "button", className: css.button, disabled: busy || !inactive, onClick: () => { void run('retire'); }, children: t('member.retire') }), member.phase === 'retired' && _jsx("button", { type: "button", className: css.button, disabled: busy, onClick: () => { void run('reactivate'); }, children: t('member.reactivate') }), _jsx("p", { className: css.hint, children: member.phase === 'retired' ? t('member.retiredHint') : t('member.retireHint') }), workspace === undefined ? _jsx("p", { role: "status", children: t('member.workspaceLoading') }) : workspace === null
                ? _jsx("p", { children: t('member.sharedWorkspace') }) : _jsxs(_Fragment, { children: [_jsx("p", { children: t('member.privateWorkspace') }), _jsx("p", { className: css.preservedText, children: workspace.cwd }), member.phase === 'active' && _jsx("button", { type: "button", className: css.button, disabled: busy || !inactive, onClick: () => { void run('integrate'); }, children: t('member.integrate') }), _jsx("p", { className: css.hint, children: t('member.integrateHint') })] }), error !== null && _jsx("p", { role: "alert", className: css.error, children: error }), notice !== null && _jsx("p", { role: "status", children: notice })] });
}
