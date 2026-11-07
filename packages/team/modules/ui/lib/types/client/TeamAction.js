import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDownOutlineRegular, IconUserOutlineRegular, IconUsersOutlineRegular, StateDot, Tag, Tooltip, useAnchoredPosition, useDismissOnOutsidePointer, } from '@deepseek-ai/dsh-client-ui-primitives';
import { TaskWorkDetails, duplicateTaskSubjects, taskWorkStateKey, useTaskActivities } from "./TaskWork.js";
import { AdviserFindings } from "./AdviserFindings.js";
import css from './TeamAction.module.css';
import { ProjectPlanView } from "./ProjectPlanView.js";
import { TeamRoles } from "./TeamRoles.js";
import { CurrentTeamRoles } from "./CurrentTeamRoles.js";
import { memberActivity, memberFunctionKey, memberModelDisplay, selectTeam, teamHierarchy, teamWorkGroups } from "./team-view-data.js";
import { useTeamProjectionRecovery } from "./team-projection-recovery.js";
function statusKey(status) {
    switch (status) {
        case 'pending': return 'status.pending';
        case 'in_progress': return 'status.in_progress';
        case 'completed': return 'status.completed';
        /* v8 ignore next -- Team views omit deleted task tombstones. */
        case 'deleted': return 'status.completed';
    }
}
function memberStatusKey(status) {
    switch (status) {
        case 'running': return 'memberStatus.running';
        case 'unknown': return 'memberStatus.unknown';
        case 'inactive': return 'memberStatus.inactive';
        case 'needsInput': return 'memberStatus.needsInput';
        case 'provisioning': return 'memberStatus.provisioning';
        case 'failed': return 'memberStatus.failed';
        case 'retired': return 'memberStatus.retired';
    }
}
function memberDotState(status) {
    switch (status) {
        case 'running':
        case 'provisioning': return 'ongoing';
        case 'needsInput': return 'warning';
        case 'failed': return 'error';
        case 'unknown':
        case 'retired': return 'idle';
    }
}
function taskDotState(task, ownerRunning) {
    switch (task.status) {
        case 'pending': return task.ready ? 'idle' : 'warning';
        case 'in_progress': return task.work?.execution?.phase === 'submitted' ? 'warning'
            : ownerRunning === true ? 'ongoing' : 'warning';
        case 'completed': return 'done';
        /* v8 ignore next -- Team views omit deleted task tombstones. */
        case 'deleted': return 'idle';
    }
}
function TeamMemberRow({ member, memberCount, parentName, depth, sessionId, useSessions, useSessionStatus, openTeammate, onSelect, onError, t, }) {
    const selection = useSessions(state => state.projectionsBySession[member.id]?.values.modelSelection);
    const model = memberModelDisplay(member, selection);
    const running = useSessionStatus(state => state.get(member.id)?.running);
    const pendingInteraction = useSessionStatus(state => state.get(member.id)?.pendingInteraction);
    const summaryRunning = useSessions(state => state.byId[member.id]?.running);
    const status = memberActivity(member, running, summaryRunning, pendingInteraction !== undefined);
    const isCurrent = member.id === sessionId;
    const highlightCurrent = isCurrent && memberCount > 1;
    const inert = isCurrent;
    return (_jsx(Tooltip, { label: status === 'failed' || status === 'provisioning' ? t('workspace.inspect') : t('open'), side: "bottom", gap: 4, disabled: inert, children: _jsxs("button", { type: "button", className: highlightCurrent ? `${css.member} ${css.memberCurrent}` : css.member, style: depth > 1 ? { marginInlineStart: `${Math.min(depth - 1, 4) * 14}px`, width: `calc(100% - ${Math.min(depth - 1, 4) * 14}px)` } : undefined, disabled: inert, onClick: () => {
                onSelect(member.id);
                if (status === 'failed' || status === 'provisioning')
                    return;
                try {
                    openTeammate(sessionId, member.id);
                }
                catch (reason) {
                    onError(String(reason));
                }
            }, children: [_jsx("span", { className: css.memberDot, children: status === 'inactive'
                        ? _jsx(IconUserOutlineRegular, { size: 14, className: css.inactiveIcon })
                        : _jsx(StateDot, { state: memberDotState(status) }) }), _jsxs("span", { className: css.memberText, children: [_jsxs("span", { className: css.memberName, children: [_jsx("span", { className: css.memberNameText, children: member.name }), isCurrent && _jsx(Tag, { tone: "info", className: css.currentTag, children: t('current') })] }), parentName !== undefined && _jsxs("small", { children: [t('parent'), ": ", parentName] }), member.role !== 'lead' && _jsx("small", { children: t(memberFunctionKey(member)) }), member.description !== undefined && _jsx("span", { className: css.memberDescription, children: member.description }), _jsxs("small", { children: [t(memberStatusKey(status)), model.model !== undefined && (_jsx("span", { className: css.memberModel, children: ` · ${t('model')}: ${model.model} (${t(`view.modelSource.${model.source}`)})` }))] }), (model.model !== undefined || member.persona !== undefined) && (_jsxs("span", { className: css.memberConfiguration, children: [model.model !== undefined && _jsxs("span", { children: [t('reasoningEffort'), ": ", model.reasoningEffort ?? t('roles.defaultEffort')] }), model.next !== undefined && _jsxs("span", { children: [t('view.nextModel', { model: model.next.model }), " \u00B7 ", t('view.nextEffort', { effort: model.next.reasoningEffort ?? t('roles.defaultEffort') })] }), member.persona !== undefined && (_jsx(Tooltip, { label: member.persona, side: "bottom", gap: 4, children: _jsx("span", { className: css.personaTag, children: t('personaBound') }) }))] })), member.error !== undefined && _jsx("small", { className: css.diagnostic, children: member.error })] })] }) }));
}
/** Task card with a two-line description clamp expanded from a toggle in the meta row. */
function TaskCard({ task, ownerRunning, currentGoalRevision, duplicate, onSelect, t }) {
    const [expanded, setExpanded] = useState(false);
    const [clamped, setClamped] = useState(false);
    const textRef = useRef(null);
    useLayoutEffect(() => {
        if (expanded)
            return;
        const paragraph = textRef.current;
        /* v8 ignore next -- the paragraph mounts in the same commit as the effect. */
        if (paragraph === null)
            return;
        const measure = () => { setClamped(paragraph.scrollHeight > paragraph.clientHeight + 1); };
        measure();
        if (typeof ResizeObserver === 'undefined')
            return;
        const observer = new ResizeObserver(measure);
        observer.observe(paragraph);
        return () => { observer.disconnect(); };
    }, [task.description, expanded]);
    return (_jsxs("article", { className: css.task, children: [_jsxs("div", { className: css.taskTitle, children: [_jsx("button", { type: "button", className: css.taskSelect, onClick: () => { onSelect(task.id); }, children: task.subject }), _jsxs("span", { className: css.taskState, children: [_jsx(StateDot, { state: taskDotState(task, ownerRunning) }), _jsx("span", { children: t(taskWorkStateKey(task, ownerRunning, currentGoalRevision) ?? statusKey(task.status)) })] })] }), _jsx("p", { ref: textRef, className: expanded ? undefined : css.clampedDescription, children: task.description }), task.result !== undefined && _jsxs("div", { className: css.taskResult, children: [_jsx("strong", { children: t(task.validity.reusable ? 'task.result' : 'task.recordedResult') }), _jsx("p", { children: task.result })] }), _jsx(TaskWorkDetails, { task: task, t: t }), task.evidence !== undefined && task.evidence.length > 0 && _jsxs("details", { className: css.evidence, children: [_jsx("summary", { children: t('task.evidence') }), _jsx("ul", { children: task.evidence.map((value, index) => _jsx("li", { children: value }, index)) })] }), _jsxs("div", { className: css.meta, children: [(clamped || expanded) && (_jsxs("button", { type: "button", className: css.expandToggle, "aria-expanded": expanded, onClick: () => { setExpanded(current => !current); }, children: [t(expanded ? 'task.collapse' : 'task.expand'), _jsx(IconChevronDownOutlineRegular, { size: 12, className: expanded ? css.expandToggleOpen : undefined })] })), _jsx("span", { children: task.id }), duplicate && _jsx("span", { children: t('work.duplicateSubject') }), _jsxs("span", { children: [t('owner'), ": ", task.ownerName ?? t('unowned')] }), task.status === 'pending' && _jsx("span", { children: task.ready ? t('ready') : t('blocked') }), task.blockedBy.length > 0 && _jsxs("span", { children: [t('blockedBy'), ": ", task.blockedBy.join(', ')] }), task.writeScopes.length > 0 && _jsxs("span", { children: [t('writeScopes'), ": ", task.writeScopes.join(', ')] }), task.writeScopeWarnings.map(warning => _jsx("span", { className: css.warning, children: warning }, warning))] })] }));
}
/** Render the Team roster, role editor, shared context, and read-only task board. */
export function TeamAction({ sessionId, useSession, useSessions, useSessionStatus, openTeammate, refreshTeam, roles, t, useRecoveredTeam = () => undefined, }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('overview');
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const triggerLabelRef = useRef(null);
    const panelRef = useRef(null);
    const position = useAnchoredPosition({
        open, anchorRef: triggerRef, panelRef, gap: 5, margin: 16,
    });
    const positioned = position !== null;
    const parentSessionId = useSession(snapshot => snapshot.subagent?.address.parentSessionId);
    const recoveredTeam = useRecoveredTeam(sessionId);
    const team = useSessions(state => selectTeam(state, sessionId, parentSessionId)) ?? recoveredTeam;
    const pendingGoalReview = useSessionStatus(state => state.get(team?.members.find(member => member.role === 'lead')?.id ?? sessionId)
        ?.pendingInteraction?.kind === 'plan-review');
    const taskActivities = useTaskActivities(team, useSessions, useSessionStatus);
    const duplicateSubjects = duplicateTaskSubjects(team?.tasks ?? []);
    const recovery = useTeamProjectionRecovery(sessionId, open, team === undefined, refreshTeam);
    const opening = useSession(snapshot => snapshot.openState === 'loading');
    const listing = useSessions(state => state.phase === 'pending');
    const hoverTimer = useRef(undefined);
    const pinnedRef = useRef(false);
    const cancelHoverChange = () => {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = undefined;
    };
    useEffect(() => {
        cancelHoverChange();
        pinnedRef.current = false;
        setOpen(false);
        setError(null);
        setSelectedMemberId(null);
        setSelectedTaskId(null);
    }, [sessionId]);
    useEffect(() => cancelHoverChange, []);
    useEffect(() => {
        if (pendingGoalReview) {
            cancelHoverChange();
            pinnedRef.current = false;
            setOpen(false);
        }
    }, [pendingGoalReview]);
    useLayoutEffect(() => {
        if (open && positioned && pinnedRef.current)
            panelRef.current?.focus();
    }, [open, positioned]);
    const changeOpen = (next) => {
        cancelHoverChange();
        if (!next)
            pinnedRef.current = false;
        setOpen(next);
    };
    const scheduleHoverOpen = () => {
        cancelHoverChange();
        if (open)
            return;
        const label = triggerLabelRef.current;
        /* v8 ignore next -- the label mounts with the trigger that received the hover. */
        if (label === null)
            return;
        // Icon-only trigger (label collapsed by the header container query):
        // hover-open would surprise on such a small target, so only click opens.
        if (getComputedStyle(label).display === 'none')
            return;
        hoverTimer.current = setTimeout(() => {
            hoverTimer.current = undefined;
            changeOpen(true);
        }, 150);
    };
    const scheduleHoverClose = () => {
        cancelHoverChange();
        if (pinnedRef.current)
            return;
        hoverTimer.current = setTimeout(() => {
            hoverTimer.current = undefined;
            changeOpen(false);
        }, 120);
    };
    useDismissOnOutsidePointer(rootRef, open, changeOpen, panelRef);
    useEffect(() => {
        if (!open)
            return;
        const dismiss = (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            cancelHoverChange();
            pinnedRef.current = false;
            setOpen(false);
            if (panelRef.current?.contains(document.activeElement))
                triggerRef.current?.focus();
        };
        document.addEventListener('keydown', dismiss);
        return () => { document.removeEventListener('keydown', dismiss); };
    }, [open]);
    const compact = roles === undefined && team !== undefined && team.members.length === 1 && team.tasks.length === 0;
    const selectedMember = team?.members.find(member => member.id === selectedMemberId)
        ?? team?.members.find(member => member.role === 'lead');
    const selectedTask = team?.tasks.find(task => task.id === selectedTaskId);
    const selectedModelSelection = useSessions(state => selectedMember === undefined
        ? undefined : state.projectionsBySession[selectedMember.id]?.values.modelSelection);
    const selectedModel = selectedMember === undefined ? undefined : memberModelDisplay(selectedMember, selectedModelSelection);
    const taskGroups = team === undefined ? [] : teamWorkGroups(team.members, team.tasks);
    const pendingPlan = team?.goalProposal?.change.kind === 'replace' && team.goalDecision?.proposalRevision !== team.goalProposal.revision
        ? team.goalProposal.change.definition : undefined;
    const displayedPlan = pendingPlan ?? team?.goal?.definition;
    return (_jsxs("div", { ref: rootRef, className: css.root, "data-team-action": true, onMouseLeave: scheduleHoverClose, children: [_jsxs("button", { type: "button", ref: triggerRef, onMouseEnter: scheduleHoverOpen, className: css.trigger, "aria-label": t('trigger'), "aria-haspopup": "dialog", "aria-expanded": open, onClick: () => {
                    cancelHoverChange();
                    pinnedRef.current = true;
                    if (!open)
                        changeOpen(true);
                    else
                        panelRef.current?.focus();
                }, children: [_jsx(IconUsersOutlineRegular, { size: 14 }), _jsx("span", { ref: triggerLabelRef, className: css.triggerLabel, children: t('trigger') })] }), open && createPortal(_jsxs("div", { ref: panelRef, className: roles !== undefined ? `${css.panel} ${css.workspacePanel}` : compact ? `${css.panel} ${css.panelCompact}` : css.panel, style: position ?? { visibility: 'hidden', left: 0, top: 0 }, role: "dialog", tabIndex: -1, "aria-label": t('trigger'), "data-team-panel": true, onMouseEnter: cancelHoverChange, onMouseLeave: scheduleHoverClose, children: [roles !== undefined && _jsxs("header", { className: css.workspaceHeader, children: [_jsxs("div", { children: [_jsx("span", { className: css.eyebrow, children: t('workspace.eyebrow') }), _jsx("h2", { children: t('workspace.title') }), _jsx("p", { children: t('workspace.subtitle') })] }), _jsxs("div", { className: css.headerActions, children: [_jsx("button", { type: "button", className: css.secondaryButton, onClick: () => { setTab('plan'); pinnedRef.current = true; }, children: t('workspace.plan') }), _jsx("button", { type: "button", className: css.secondaryButton, onClick: () => { changeOpen(false); }, children: t('workspace.close') })] })] }), roles !== undefined && _jsx("nav", { className: css.tabs, "aria-label": t('workspace.navigation'), children: ['overview', 'roles', 'memory'].map(value => _jsx("button", { type: "button", "aria-current": tab === value ? 'page' : undefined, onClick: () => { pinnedRef.current = true; setTab(value); }, children: t(`workspace.${value}`) }, value)) }), _jsxs("div", { className: css.body, children: [roles !== undefined && tab === 'roles' && _jsxs(_Fragment, { children: [_jsx(CurrentTeamRoles, { members: team?.members ?? [], useSessions: useSessions, t: t }), _jsx(TeamRoles, { operations: roles, t: t })] }), roles !== undefined && tab === 'plan' && _jsxs("section", { className: css.plan, children: [_jsx("h3", { children: t('workspace.plan') }), displayedPlan === undefined ? _jsx("p", { children: t('workspace.noPlan') }) : _jsxs(_Fragment, { children: [pendingPlan !== undefined && _jsx("p", { role: "status", children: t('goals.pending', { revision: team?.goalProposal?.revision ?? 0 }) }), _jsx("h4", { children: t('goals.objective') }), _jsx("p", { children: displayedPlan.objective }), _jsx("h4", { children: t('goals.plan') }), _jsx(ProjectPlanView, { text: displayedPlan.plan ?? t('workspace.noPlan'), t: t }), _jsx("h4", { children: t('goals.acceptanceCriteria') }), _jsx("ul", { children: displayedPlan.acceptanceCriteria.map((criterion, index) => _jsx("li", { children: criterion }, index)) }), _jsx("h4", { children: t('goals.coverage') }), _jsx("p", { children: t(`goals.coverage.${displayedPlan.scope.coverage}`) }), _jsx("h4", { children: t('goals.targets') }), _jsx("ul", { children: displayedPlan.scope.targets.map((target, index) => _jsx("li", { children: target }, index)) }), _jsx("h4", { children: t('goals.allowedActions') }), _jsx("ul", { children: displayedPlan.scope.allowedActions.map((action, index) => _jsx("li", { children: action }, index)) }), _jsx("h4", { children: t('goals.excludedTargets') }), _jsx("ul", { children: displayedPlan.scope.excludedTargets.length === 0
                                                    ? _jsx("li", { children: t('memory.none') }) : displayedPlan.scope.excludedTargets.map((target, index) => _jsx("li", { children: target }, index)) }), _jsx("h4", { children: t('goals.constraints') }), _jsx("ul", { children: displayedPlan.scope.constraints.length === 0
                                                    ? _jsx("li", { children: t('memory.none') }) : displayedPlan.scope.constraints.map((constraint, index) => _jsx("li", { children: constraint }, index)) }), displayedPlan.scope.execution !== undefined && _jsxs(_Fragment, { children: [_jsx("h4", { children: t('goals.executionScope') }), _jsx("pre", { children: JSON.stringify(displayedPlan.scope.execution, null, 2) })] })] })] }), roles !== undefined && tab === 'memory' && _jsxs("section", { className: css.memory, children: [_jsx("h3", { children: t('memory.title') }), _jsx("p", { className: css.sectionHint, children: t('memory.hint') }), team?.brief === undefined ? _jsx("p", { children: t('memory.empty') }) : _jsxs(_Fragment, { children: [(team.brief.goalRevision === undefined || team.brief.goalRevision !== (team.goal?.revision ?? 0) || team.goal?.status === 'revoked')
                                                && _jsx("p", { role: "status", children: t('memory.historical') }), _jsxs("article", { children: [_jsx("h4", { children: t('memory.objective') }), _jsx("p", { children: team.brief.objective })] }), _jsxs("article", { children: [_jsx("h4", { children: t('memory.authorization') }), _jsx("p", { children: team.brief.authorization || t('memory.none') })] }), _jsxs("article", { children: [_jsx("h4", { children: t('memory.decisions') }), _jsx("p", { children: team.brief.decisions || t('memory.none') })] })] })] }), tab === 'overview' && _jsxs(_Fragment, { children: [error !== null && (_jsxs("div", { className: css.error, role: "alert", children: [_jsx(StateDot, { state: "error" }), error] })), team === undefined && (_jsxs("div", { className: css.notice, role: "status", children: [_jsx(StateDot, { state: opening || listing || recovery.state === 'loading' ? 'ongoing' : 'warning' }), t(opening || listing || recovery.state === 'loading' ? 'loading' : 'unavailable'), !opening && !listing && recovery.state !== 'loading' && _jsx("button", { type: "button", className: css.secondaryButton, onClick: recovery.retry, children: t('recovery.retry') })] })), team !== undefined && (_jsxs(_Fragment, { children: [team.failure !== undefined && (_jsxs("div", { className: css.error, role: "alert", children: [_jsx(StateDot, { state: "error" }), t('failure', { message: team.failure })] })), roles !== undefined && _jsxs("div", { className: css.metrics, children: [_jsxs("div", { children: [_jsx("strong", { children: team.members.length }), _jsx("span", { children: t('roster') })] }), _jsxs("div", { children: [_jsx("strong", { children: team.tasks.length }), _jsx("span", { children: t('work.openTasks') })] }), _jsxs("div", { children: [_jsx("strong", { children: team.completedTaskCount ?? team.tasks.filter(task => task.status === 'completed').length }), _jsx("span", { children: t('workspace.completed') })] })] }), _jsxs("div", { className: roles !== undefined ? css.overviewColumns : undefined, children: [_jsxs("section", { children: [_jsxs("h3", { children: [t('roster'), team.members.length > 1 && _jsx("span", { className: css.count, children: team.members.length })] }), _jsx("div", { className: css.roster, children: teamHierarchy(team.members).map(({ member, depth }) => (_jsx(TeamMemberRow, { member: member, memberCount: team.members.length, depth: depth, ...member.parentId === undefined ? {} : { parentName: team.members.find(parent => parent.id === member.parentId)?.name ?? t('memory.none') }, sessionId: sessionId, useSessions: useSessions, useSessionStatus: useSessionStatus, openTeammate: openTeammate, onSelect: (id) => { setSelectedMemberId(id); setSelectedTaskId(null); }, onError: setError, t: t }, member.id))) })] }), _jsx("section", { children: team.tasks.length === 0
                                                            ? _jsxs("p", { className: css.emptyNotice, children: [t('view.noActiveTasks'), " \u00B7 ", t('view.completedHint', { count: team.completedTaskCount ?? 0 })] })
                                                            : (_jsxs(_Fragment, { children: [_jsxs("h3", { children: [t('tasks'), _jsx("span", { className: css.count, children: team.tasks.length })] }), _jsx("div", { className: roles !== undefined ? css.groupGrid : css.tasks, children: taskGroups.filter(group => group.tasks.length > 0
                                                                            || roles !== undefined && group.members.length > 1).map(group => _jsxs("section", { className: css.taskGroup, children: [roles !== undefined && _jsxs(_Fragment, { children: [_jsxs("div", { className: css.groupHeading, children: [_jsx("h4", { children: group.leader?.expert?.name ?? group.leader?.name
                                                                                                        ?? t(group.id === 'lead' ? 'workspace.leadGroup' : 'workspace.unassignedGroup') }), _jsx("span", { children: t('workspace.groupProgress', {
                                                                                                        completed: group.tasks.filter(task => task.status === 'completed').length,
                                                                                                        total: group.tasks.length,
                                                                                                    }) })] }), group.members.length > 0 && _jsxs("div", { className: css.groupPeople, children: [group.members.filter(member => member.role !== 'lead').slice(0, 5).map(member => _jsx("button", { type: "button", className: css.groupPerson, onClick: () => { setSelectedMemberId(member.id); setSelectedTaskId(null); }, children: member.expert?.name ?? member.name }, member.id)), group.members.filter(member => member.role !== 'lead').length > 5
                                                                                                    && _jsxs("span", { className: css.groupMore, children: ["+", group.members.filter(member => member.role !== 'lead').length - 5] })] })] }), group.tasks.length === 0 ? _jsx("p", { className: css.groupEmpty, children: t('view.noTask') })
                                                                                    : group.tasks.map(task => _jsx(TaskCard, { task: task, ownerRunning: taskActivities.get(task.id), currentGoalRevision: team.goal?.revision, duplicate: duplicateSubjects.has(task.id), onSelect: setSelectedTaskId, t: t }, task.id))] }, group.id)) })] })) }), roles !== undefined && _jsxs("aside", { className: css.inspector, "aria-label": t('workspace.details'), children: [_jsx("h3", { children: t('workspace.details') }), selectedTask !== undefined ? _jsxs(_Fragment, { children: [_jsx("strong", { children: selectedTask.subject }), _jsx("p", { children: selectedTask.description }), _jsxs("dl", { children: [_jsx("dt", { children: t('owner') }), _jsx("dd", { children: selectedTask.ownerName ?? t('unowned') }), selectedTask.reviewerName !== undefined && _jsxs(_Fragment, { children: [_jsx("dt", { children: t('view.reviewer') }), _jsx("dd", { children: selectedTask.reviewerName })] }), selectedTask.autoAssign !== undefined && _jsxs(_Fragment, { children: [_jsx("dt", { children: t('view.autoAssign') }), _jsx("dd", { children: t(selectedTask.autoAssign ? 'view.enabled' : 'view.disabled') })] }), selectedTask.requiredSkill !== undefined && _jsxs(_Fragment, { children: [_jsx("dt", { children: t('view.requiredSkill') }), _jsx("dd", { children: selectedTask.requiredSkill })] }), _jsx("dt", { children: t('view.status') }), _jsx("dd", { children: t(taskWorkStateKey(selectedTask, taskActivities.get(selectedTask.id), team.goal?.revision) ?? statusKey(selectedTask.status)) }), _jsx("dt", { children: t('work.criteria') }), _jsx("dd", { children: selectedTask.work?.plan.acceptanceCriteria.join('\n') ?? t('memory.none') })] }), _jsx(TaskWorkDetails, { task: selectedTask, t: t }), _jsx(AdviserFindings, { task: selectedTask, findings: team.adviserDecisions, t: t })] }) : selectedMember !== undefined ? _jsxs(_Fragment, { children: [_jsx("strong", { children: selectedMember.name }), _jsx("p", { children: selectedMember.description ?? t('workspace.noDescription') }), _jsxs("dl", { children: [_jsx("dt", { children: t('parent') }), _jsx("dd", { children: team.members.find(member => member.id === selectedMember.parentId)?.name ?? t('memory.none') }), _jsx("dt", { children: t('model') }), _jsx("dd", { children: selectedModel?.model ?? t('view.sessionModel') }), _jsx("dt", { children: t('reasoningEffort') }), _jsx("dd", { children: selectedModel?.reasoningEffort ?? t('roles.defaultEffort') }), _jsx("dt", { children: t('workspace.modelSource') }), _jsx("dd", { children: selectedModel === undefined ? t('memory.none') : t(`view.modelSource.${selectedModel.source}`) }), selectedModel?.next !== undefined && _jsxs(_Fragment, { children: [_jsx("dt", { children: t('view.nextModel', { model: selectedModel.next.model }) }), _jsx("dd", { children: selectedModel.next.reasoningEffort ?? t('roles.defaultEffort') })] }), _jsx("dt", { children: t('workspace.groupMembers') }), _jsx("dd", { children: team.members.filter(member => member.parentId === selectedMember.id).length }), _jsx("dt", { children: t('view.persona') }), _jsx("dd", { children: selectedMember.persona ?? t('memory.none') })] }), selectedMember.error !== undefined && _jsx("p", { role: "status", className: css.diagnostic, children: selectedMember.error }), selectedMember.phase === 'provisioning' && _jsx("p", { role: "status", children: t('memberStatus.provisioning') })] }) : _jsx("p", { children: t('workspace.noSelection') })] })] })] }))] })] })] }), document.body)] }));
}
