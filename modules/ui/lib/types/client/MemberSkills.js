import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import css from './MemberSkills.module.css';
/**
 * Display a member's selected methods and whether they match the current goal.
 * @param props - Compact saved selection and localized text.
 * @returns skill purposes and expandable version metadata, without starting work.
 */
export function MemberSkills({ selection, t }) {
    const skills = selection?.skills ?? [];
    return _jsxs("section", { className: css.skills, "aria-label": t('skills.title'), children: [_jsx("h3", { children: t('skills.title') }), skills.length === 0 ? _jsx("p", { className: css.hint, children: t('skills.empty') }) : _jsxs(_Fragment, { children: [_jsx("p", { className: css.hint, role: "status", children: t(selection?.active === true ? 'skills.restore' : 'skills.stale') }), _jsx("ul", { className: css.choices, children: skills.map(skill => _jsxs("li", { children: [_jsx("p", { children: skill.purpose }), _jsx("span", { children: skill.name })] }, skill.name)) })] }), selection !== undefined && _jsxs("details", { className: css.versions, children: [_jsx("summary", { children: t('skills.versions') }), _jsx("p", { children: t('skills.revision', { revision: selection.revision }) }), _jsx("p", { children: selection.goalRevision === 0 ? t('skills.unconfirmedGoal') : t('skills.goalRevision', { revision: selection.goalRevision }) }), _jsx("ul", { children: skills.map(skill => _jsxs("li", { children: [_jsxs("span", { children: [skill.name, " \u00B7 ", t('skills.bytes', { bytes: skill.bytes })] }), _jsx("code", { children: skill.digest })] }, skill.name)) })] })] });
}
