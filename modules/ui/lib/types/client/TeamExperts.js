import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Native editor for durable experts and their current Team bindings. */
import { useEffect, useId, useRef, useState } from 'react';
import { isRemoteFailure } from '@deepseek-ai/dsh-api-gateway/client';
import css from './TeamExperts.module.css';
function fromProfile(profile) {
    return { base: profile, definition: profile.definition, skillsText: profile.definition.skills.join('\n'), archived: profile.archived };
}
function definitionOf(draft) {
    return { ...draft.definition, skills: draft.skillsText.split('\n').map(value => value.trim()).filter(Boolean) };
}
function isEdited(draft) {
    return draft.base === null || draft.archived !== draft.base.archived
        || JSON.stringify(definitionOf(draft)) !== JSON.stringify(draft.base.definition);
}
/**
 * Edit reusable expert profiles while preserving unsaved drafts across selection and refresh.
 * @param props - Catalog operations, current Team members, navigation, and localized copy.
 * @returns a searchable catalog, profile editor, and existing conversation links.
 */
export function TeamExperts({ operations, members, openMember, t }) {
    const [catalog, setCatalog] = useState(null);
    const [drafts, setDrafts] = useState({});
    const [selected, setSelected] = useState('');
    const [search, setSearch] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [reload, setReload] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const request = useRef(null);
    const nextDraft = useRef(0);
    const formId = useId();
    useEffect(() => {
        const controller = new AbortController();
        request.current = controller;
        setLoading(true);
        void operations.load(controller.signal).then((value) => {
            if (controller.signal.aborted)
                return;
            setCatalog(value);
            setDrafts((current) => {
                const next = { ...current };
                for (const profile of value.profiles) {
                    const draft = next[profile.id];
                    if (draft === undefined || !isEdited(draft))
                        next[profile.id] = fromProfile(profile);
                }
                return next;
            });
            setSelected(current => current || value.profiles.find(profile => !profile.archived)?.id || '');
        }).catch((reason) => {
            if (controller.signal.aborted)
                return;
            if (!isRemoteFailure(reason))
                throw reason;
            setError(t('experts.loadFailed'));
        }).finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => { controller.abort(); };
    }, [operations, reload, t]);
    const draft = drafts[selected];
    const profile = draft?.definition;
    const provider = catalog?.models.groups.find(group => group.id === profile?.modelProvider);
    const model = provider?.models.find(value => value.id === profile?.model);
    const busy = loading || saving;
    const latest = catalog?.profiles.find(value => value.id === draft?.base?.id);
    const bindings = members.flatMap(member => member.expert !== undefined && member.expert.id === draft?.base?.id
        ? [{ member, revision: member.expert.revision }] : []);
    const needle = search.trim().toLocaleLowerCase();
    const choices = Object.entries(drafts).filter(([key, value]) => (showArchived || !value.archived || key === selected)
        && [value.definition.name, value.definition.description, value.definition.model, ...value.definition.skills]
            .some(text => text?.toLocaleLowerCase().includes(needle)));
    const change = (next) => { setDrafts(current => ({ ...current, [selected]: next })); setError(null); };
    const update = (next) => { if (draft !== undefined)
        change({ ...draft, definition: next }); };
    const save = async () => {
        const signal = request.current?.signal;
        if (draft === undefined || signal === undefined || busy)
            return;
        const cancelled = () => signal.aborted;
        if (cancelled())
            return;
        const definition = definitionOf(draft);
        if ([definition.name, definition.description, definition.persona].some(value => value.trim() === '')) {
            setError(t('experts.invalid'));
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const saved = await operations.save(definition, draft.base, draft.archived, signal);
            if (cancelled())
                return;
            setDrafts((current) => {
                const next = Object.fromEntries(Object.entries(current).filter(([key]) => key !== selected));
                next[saved.id] = fromProfile(saved);
                return next;
            });
            setCatalog(current => current === null ? null : {
                ...current, profiles: [...current.profiles.filter(value => value.id !== saved.id), saved],
            });
            setSelected(current => current === selected ? saved.id : current);
        }
        catch (reason) {
            if (cancelled())
                return;
            if (!isRemoteFailure(reason))
                throw reason;
            if (reason.code === 'team-expert/stale-revision') {
                setError(t('experts.conflict'));
                setReload(value => value + 1);
            }
            else {
                setError(t(reason.code === 'team-expert/model-unavailable' ? 'roles.invalidModel'
                    : reason.code === 'team-expert/invalid-profile' ? 'experts.invalid' : 'experts.saveFailed'));
            }
        }
        finally {
            if (!cancelled())
                setSaving(false);
        }
    };
    return _jsxs("section", { className: css.catalog, "aria-label": t('view.experts'), children: [_jsx("p", { className: css.hint, children: t('experts.hint') }), error !== null && _jsx("p", { role: "alert", className: css.error, children: error }), loading && _jsx("p", { role: "status", className: css.hint, children: t('loading') }), _jsxs("div", { className: css.layout, children: [_jsxs("aside", { className: css.sidebar, children: [_jsx("input", { type: "search", "aria-label": t('experts.search'), placeholder: t('experts.search'), value: search, onChange: (event) => { setSearch(event.target.value); } }), _jsxs("label", { className: css.checkbox, children: [_jsx("input", { type: "checkbox", checked: showArchived, onChange: (event) => { setShowArchived(event.target.checked); } }), t('experts.showArchived')] }), _jsxs("div", { className: css.choices, children: [choices.map(([key, value]) => _jsxs("button", { type: "button", className: css.choice, "aria-pressed": key === selected, onClick: () => { setSelected(key); setError(null); }, children: [_jsx("strong", { children: value.definition.name || t('experts.untitled') }), _jsx("span", { children: value.definition.description || t('roles.description') }), _jsxs("small", { children: [value.archived ? t('experts.archived') : value.definition.model ?? t('roles.inherit'), isEdited(value) ? ` · ${t('experts.unsaved')}` : ''] })] }, key)), !loading && choices.length === 0 && _jsx("p", { className: css.hint, children: t('experts.empty') })] }), _jsxs("div", { className: css.actions, children: [_jsx("button", { className: css.button, type: "button", disabled: busy, onClick: () => {
                                            const key = `draft:${++nextDraft.current}`;
                                            setDrafts(current => ({ ...current, [key]: {
                                                    base: null, definition: { name: '', description: '', persona: '', instructions: '', skills: [] }, skillsText: '', archived: false,
                                                } }));
                                            setSelected(key);
                                            setSearch('');
                                            setError(null);
                                        }, children: t('experts.add') }), _jsx("button", { className: css.textButton, type: "button", disabled: busy, onClick: () => { setError(null); setReload(value => value + 1); }, children: t('experts.refresh') })] })] }), draft !== undefined && profile !== undefined ? _jsxs("div", { className: css.editor, children: [_jsxs("header", { className: css.editorHeader, children: [_jsx("h2", { children: profile.name || t('experts.untitled') }), _jsx("span", { className: css.hint, children: draft.base === null ? t('experts.unsaved') : t('experts.revision', { revision: draft.base.revision }) })] }), latest !== undefined && draft.base !== null && latest.revision !== draft.base.revision && _jsxs("div", { className: css.conflict, children: [_jsx("p", { children: t('experts.newRevision', { revision: latest.revision }) }), _jsx("button", { type: "button", className: css.button, disabled: busy, onClick: () => { change(fromProfile(latest)); }, children: t('experts.reloadSelected') })] }), catalog?.models.failures.map(failure => _jsxs("p", { className: css.error, children: [failure.name, ": ", failure.message] }, failure.id)), _jsxs("fieldset", { className: css.fields, disabled: busy, children: [_jsxs("label", { children: [t('experts.name'), _jsx("input", { value: profile.name, onChange: (event) => { update({ ...profile, name: event.target.value }); } })] }), _jsxs("label", { children: [t('roles.description'), _jsx("input", { maxLength: 200, value: profile.description, onChange: (event) => { update({ ...profile, description: event.target.value }); } })] }), _jsxs("div", { className: css.models, children: [_jsxs("label", { children: [t('roles.provider'), _jsxs("select", { value: profile.modelProvider ?? '', onChange: (event) => {
                                                            const group = catalog?.models.groups.find(value => value.id === event.target.value);
                                                            const { modelProvider: _provider, model: _model, reasoningEffort: _effort, ...definition } = profile;
                                                            update({ ...definition, ...(group?.models[0] === undefined ? {} : { modelProvider: group.id, model: group.models[0].id }) });
                                                        }, children: [_jsx("option", { value: "", children: t('roles.inherit') }), profile.modelProvider !== undefined && provider === undefined
                                                                && _jsx("option", { value: profile.modelProvider, children: profile.modelProvider }), catalog?.models.groups.map(group => _jsx("option", { value: group.id, disabled: group.models.length === 0, children: group.name }, group.id))] })] }), _jsxs("label", { children: [t('model'), _jsxs("select", { value: profile.model ?? '', disabled: provider === undefined, onChange: (event) => {
                                                            const { reasoningEffort: _effort, ...definition } = profile;
                                                            update({ ...definition, model: event.target.value });
                                                        }, children: [profile.model === undefined ? _jsx("option", { value: "", children: t('roles.inherit') })
                                                                : model === undefined && _jsx("option", { value: profile.model, children: profile.model }), provider?.models.map(value => _jsx("option", { value: value.id, children: value.name }, value.id))] })] }), _jsxs("label", { children: [t('reasoningEffort'), _jsxs("select", { value: profile.reasoningEffort ?? '', onChange: (event) => {
                                                            const { reasoningEffort: _effort, ...definition } = profile;
                                                            update(event.target.value === '' ? definition : { ...definition, reasoningEffort: event.target.value });
                                                        }, children: [_jsx("option", { value: "", children: t('roles.defaultEffort') }), profile.reasoningEffort !== undefined && !model?.reasoning?.efforts.some(effort => effort.id === profile.reasoningEffort)
                                                                && _jsx("option", { value: profile.reasoningEffort, children: profile.reasoningEffort }), model?.reasoning?.efforts.map(effort => _jsx("option", { value: effort.id, children: effort.name }, effort.id))] })] })] }), _jsx("p", { className: css.hint, children: t('experts.modelHint') }), _jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: `${formId}-persona`, children: t('roles.persona') }), _jsx("textarea", { id: `${formId}-persona`, rows: 4, value: profile.persona, onChange: (event) => { update({ ...profile, persona: event.target.value }); } })] }), _jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: `${formId}-instructions`, children: t('roles.instructions') }), _jsx("textarea", { id: `${formId}-instructions`, rows: 7, className: css.instructions, value: profile.instructions, onChange: (event) => { update({ ...profile, instructions: event.target.value }); } })] }), _jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: `${formId}-skills`, children: t('experts.skills') }), _jsx("textarea", { id: `${formId}-skills`, rows: 3, value: draft.skillsText, onChange: (event) => { change({ ...draft, skillsText: event.target.value }); } })] }), _jsx("p", { className: css.hint, children: t('experts.skillsHint') }), _jsxs("label", { className: css.checkbox, children: [_jsx("input", { type: "checkbox", disabled: draft.base === null, checked: draft.archived, onChange: (event) => { change({ ...draft, archived: event.target.checked }); } }), t('experts.archive')] })] }), _jsxs("div", { className: css.footer, children: [_jsx("span", { role: "status", className: css.hint, children: t(isEdited(draft) ? 'experts.unsaved' : 'experts.saved') }), _jsx("button", { type: "button", className: css.primaryButton, disabled: busy || !isEdited(draft), onClick: () => { void save(); }, children: t(saving ? 'roles.saving' : 'experts.save') })] }), _jsxs("section", { className: css.bindings, children: [_jsx("h3", { children: t('experts.bindings') }), _jsx("p", { className: css.hint, children: t('experts.bindingHint') }), bindings.map(({ member, revision }) => _jsxs("div", { className: css.binding, children: [_jsxs("span", { children: [member.name, " \u00B7 ", t('experts.revision', { revision })] }), _jsx("button", { type: "button", className: css.textButton, disabled: member.phase !== 'active', onClick: () => { openMember(member.id); }, children: t('open') })] }, member.id)), bindings.length === 0 && _jsx("p", { className: css.hint, children: t('experts.unassigned') })] })] }) : _jsx("p", { className: css.hint, children: t('experts.select') })] })] });
}
