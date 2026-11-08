import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Team role editor with provider-owned model and reasoning selections. */
import { useEffect, useRef, useState } from 'react';
import css from './TeamAction.module.css';
const roleFields = [
    'description', 'persona', 'instructions', 'modelProvider', 'model', 'reasoningEffort',
];
function sameRole(left, right) {
    return roleFields.every(field => left[field] === right[field]);
}
function mergeRole(base, draft, incoming) {
    const value = (field) => draft[field] === base[field] ? incoming[field] : draft[field];
    const modelProvider = value('modelProvider');
    const model = value('model');
    const reasoningEffort = value('reasoningEffort');
    return {
        description: value('description') ?? '', persona: value('persona') ?? '', instructions: value('instructions') ?? '',
        ...modelProvider === undefined ? {} : { modelProvider },
        ...model === undefined ? {} : { model },
        ...reasoningEffort === undefined ? {} : { reasoningEffort },
    };
}
function mergeProfiles(base, draft, incoming) {
    const merged = { ...incoming };
    for (const [id, previous] of Object.entries(base)) {
        const edited = draft[id];
        if (edited === undefined) {
            Reflect.deleteProperty(merged, id);
            continue;
        }
        const latest = incoming[id];
        if (latest === undefined) {
            if (!sameRole(previous, edited))
                merged[id] = edited;
            continue;
        }
        merged[id] = mergeRole(previous, edited, latest);
    }
    for (const [id, edited] of Object.entries(draft))
        if (base[id] === undefined)
            merged[id] = edited;
    return merged;
}
/**
 * Edit reusable roles; existing member descriptors remain tied to their creation snapshot.
 * @param props - model catalog/settings operations and localized copy.
 * @returns the role list, editor, and save feedback.
 */
export function TeamRoles({ operations, t }) {
    const [settings, setSettings] = useState(null);
    const [profiles, setProfiles] = useState({});
    const [selected, setSelected] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [saved, setSaved] = useState(false);
    const [dirty, setDirty] = useState(false);
    const draftRevision = useRef(0);
    useEffect(() => {
        let disposed = false;
        void operations.loadRoles().then((value) => {
            if (disposed)
                return;
            setSettings(value);
            setProfiles(value.profiles);
            setSelected(Object.keys(value.profiles)[0] ?? '');
            setDirty(false);
        }).catch((reason) => { if (!disposed)
            setError(String(reason)); });
        return () => { disposed = true; };
    }, [operations]);
    const profile = profiles[selected];
    const provider = settings?.catalog.groups.find(group => group.id === profile?.modelProvider);
    const model = provider?.models.find(candidate => candidate.id === profile?.model);
    const update = (next) => {
        draftRevision.current += 1;
        setProfiles(current => ({ ...current, [selected]: next }));
        setDirty(true);
        setSaved(false);
    };
    const reload = async () => {
        if (settings === null)
            return;
        setBusy(true);
        try {
            const latest = await operations.loadRoles();
            setProfiles(current => mergeProfiles(settings.profiles, current, latest.profiles));
            setSettings(latest);
            setError(null);
            setSaved(false);
        }
        catch (reason) {
            setError(String(reason));
        }
        finally {
            setBusy(false);
        }
    };
    const save = async () => {
        if (settings === null)
            return;
        setError(null);
        for (const [id, candidate] of Object.entries(profiles)) {
            const route = settings.catalog.groups.find(group => group.id === candidate.modelProvider);
            const choice = route?.models.find(item => item.id === candidate.model);
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id) || candidate.description.trim() === '' || candidate.persona.trim() === '') {
                setError(t('roles.invalid'));
                return;
            }
            if ((candidate.modelProvider !== undefined || candidate.model !== undefined) && choice === undefined) {
                setError(t('roles.invalidModel'));
                return;
            }
            if (candidate.reasoningEffort !== undefined && !choice?.reasoning?.efforts.some(effort => effort.id === candidate.reasoningEffort)) {
                setError(t('roles.invalidEffort'));
                return;
            }
        }
        setBusy(true);
        const savingRevision = draftRevision.current;
        try {
            const revision = await operations.saveRoles(profiles, settings.revision);
            setSettings({ ...settings, revision, profiles });
            setSaved(draftRevision.current === savingRevision);
            if (draftRevision.current === savingRevision)
                setDirty(false);
        }
        catch (reason) {
            setError(String(reason));
        }
        finally {
            setBusy(false);
        }
    };
    return _jsxs("section", { className: css.roles, children: [_jsx("h3", { children: t('roles.templates') }), _jsx("p", { className: css.sectionHint, children: t('roles.hint') }), error !== null && _jsx("p", { className: css.error, role: "alert", children: error }), settings === null && error === null && _jsx("p", { role: "status", children: t('loading') }), settings !== null && _jsxs(_Fragment, { children: [settings.catalog.failures.map(failure => _jsxs("p", { className: css.warning, children: [failure.name, ": ", failure.message] }, failure.id)), _jsxs("div", { className: css.roleColumns, children: [_jsxs("div", { className: css.roleList, children: [Object.entries(profiles).map(([id, value]) => _jsxs("button", { type: "button", className: id === selected ? `${css.roleChoice} ${css.roleSelected}` : css.roleChoice, onClick: () => { setSelected(id); }, children: [_jsx("strong", { children: id }), _jsx("span", { children: value.description }), _jsx("small", { children: value.model ?? t('roles.inherit') })] }, id)), _jsx("button", { type: "button", className: css.secondaryButton, onClick: () => {
                                            let number = Object.keys(profiles).length + 1;
                                            while (profiles[`member-${number}`] !== undefined)
                                                number += 1;
                                            const id = `member-${number}`;
                                            draftRevision.current += 1;
                                            setProfiles(current => ({ ...current, [id]: { description: '', persona: '', instructions: '' } }));
                                            setSelected(id);
                                            setSaved(false);
                                            setDirty(true);
                                        }, children: t('roles.add') })] }), profile !== undefined && _jsxs("div", { className: css.roleForm, children: [_jsxs("div", { className: css.roleFormHeader, children: [_jsx("strong", { children: selected }), _jsx("button", { type: "button", className: css.textButton, onClick: () => {
                                                    const next = Object.fromEntries(Object.entries(profiles).filter(([id]) => id !== selected));
                                                    draftRevision.current += 1;
                                                    setProfiles(next);
                                                    setSelected(Object.keys(next)[0] ?? '');
                                                    setSaved(false);
                                                    setDirty(true);
                                                }, children: t('roles.remove') })] }), _jsxs("label", { children: [t('roles.description'), _jsx("input", { value: profile.description, onChange: (event) => { update({ ...profile, description: event.target.value }); } })] }), _jsxs("div", { className: css.modelFields, children: [_jsxs("label", { children: [t('roles.provider'), _jsxs("select", { value: profile.modelProvider ?? '', onChange: (event) => {
                                                            const group = settings.catalog.groups.find(candidate => candidate.id === event.target.value);
                                                            const { modelProvider: _provider, model: _model, reasoningEffort: _effort, ...role } = profile;
                                                            update({ ...role, ...(group?.models[0] === undefined ? {} : { modelProvider: group.id, model: group.models[0].id }) });
                                                        }, children: [_jsx("option", { value: "", children: t('roles.inherit') }), settings.catalog.groups.map(group => _jsx("option", { value: group.id, children: group.name }, group.id))] })] }), _jsxs("label", { children: [t('model'), _jsx("select", { value: profile.model ?? '', disabled: provider === undefined, onChange: (event) => {
                                                            const { reasoningEffort: _effort, ...role } = profile;
                                                            update({ ...role, model: event.target.value });
                                                        }, children: provider === undefined ? _jsx("option", { value: "", children: t('roles.inherit') }) : provider.models.map(value => _jsx("option", { value: value.id, children: value.name }, value.id)) })] }), _jsxs("label", { children: [t('reasoningEffort'), _jsxs("select", { value: profile.reasoningEffort ?? '', disabled: model?.reasoning === undefined, onChange: (event) => {
                                                            const { reasoningEffort: _effort, ...role } = profile;
                                                            update(event.target.value === '' ? role : { ...role, reasoningEffort: event.target.value });
                                                        }, children: [_jsx("option", { value: "", children: t(model?.reasoning === undefined ? 'roles.noEffort' : 'roles.defaultEffort') }), model?.reasoning?.efforts.map(effort => _jsx("option", { value: effort.id, children: effort.name }, effort.id))] })] })] }), _jsxs("label", { children: [t('roles.persona'), _jsx("textarea", { rows: 5, value: profile.persona, onChange: (event) => { update({ ...profile, persona: event.target.value }); } })] }), _jsxs("label", { children: [t('roles.instructions'), _jsx("textarea", { rows: 8, className: css.instructions, value: profile.instructions, onChange: (event) => { update({ ...profile, instructions: event.target.value }); } })] })] })] }), _jsxs("div", { className: css.editorFooter, children: [_jsx("span", { role: "status", children: saved ? t('roles.saved') : dirty ? t('roles.unsaved') : t('roles.persisted') }), error !== null && _jsx("button", { type: "button", className: css.secondaryButton, disabled: busy, onClick: () => { void reload(); }, children: t('roles.reload') }), _jsx("button", { type: "button", className: css.primaryButton, disabled: busy, onClick: () => { void save(); }, children: t(busy ? 'roles.saving' : 'roles.save') })] })] })] });
}
