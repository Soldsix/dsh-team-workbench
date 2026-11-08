import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memberFunctionKey, memberModelDisplay, teamHierarchy } from "./team-view-data.js";
import css from './CurrentTeamRoles.module.css';
import { ProjectPlanView } from "./ProjectPlanView.js";
function CurrentRole({ member, depth, useSessions, t }) {
    const selection = useSessions(state => state.projectionsBySession[member.id]?.values.modelSelection);
    const model = memberModelDisplay(member, selection);
    return _jsxs("li", { className: css.member, style: { marginInlineStart: `${Math.min(Math.max(depth - 1, 0), 4) * 12}px` }, children: [_jsxs("div", { children: [_jsx("strong", { children: member.expert?.name ?? member.name }), member.role !== 'lead' && _jsx("small", { children: t(memberFunctionKey(member)) }), _jsx("span", { children: member.description })] }), _jsxs("div", { className: css.route, children: [_jsx("span", { children: model.model ?? t('view.sessionModel') }), _jsx("small", { children: model.reasoningEffort ?? t('roles.defaultEffort') })] })] });
}
/**
 * Display the actual Team before editable templates.
 * @param props - Current roster, pending plan, Session model choices, and localized labels.
 * @returns a read-only list of member routes.
 */
export function CurrentTeamRoles({ members, plannedTeam, useSessions, t }) {
    return _jsxs("section", { className: css.current, "aria-label": t('roles.currentTeam'), children: [_jsxs("header", { children: [_jsx("h3", { children: t('roles.currentTeam') }), _jsx("small", { children: members.length })] }), plannedTeam !== undefined && _jsxs("div", { className: css.planned, children: [_jsx("h4", { children: t('roles.plannedTeam') }), _jsx(ProjectPlanView, { text: plannedTeam, t: t })] }), members.length === 0 ? _jsx("p", { children: t('roles.noCurrentTeam') })
                : _jsx("ul", { children: teamHierarchy(members).map(({ member, depth }) => _jsx(CurrentRole, { member: member, depth: depth, useSessions: useSessions, t: t }, member.id)) })] });
}
