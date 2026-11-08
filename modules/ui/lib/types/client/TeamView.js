import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Native conversation Team view for members, tasks, and retained context. */
import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import { IconUserOutlineRegular, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { TeamRoles } from "./TeamRoles.js";
import { CurrentTeamRoles } from "./CurrentTeamRoles.js";
import { TeamExperts } from "./TeamExperts.js";
import { TeamGoals } from "./TeamGoals.js";
import { TeamMailbox } from "./TeamMailbox.js";
import { MemberSkills } from "./MemberSkills.js";
import { TaskWorkDetails, duplicateTaskSubjects, taskWorkStateKey, useTaskActivities } from "./TaskWork.js";
import { TeamMemberControls } from "./TeamMemberControls.js";
import { TeamTaskArchive } from "./TeamTaskArchive.js";
import { AdviserFindings } from "./AdviserFindings.js";
import { TeamDiagnostics } from "./TeamDiagnostics.js";
import { memberActivity, memberSection, memberFunctionKey, memberModelDisplay, selectTeam, teamHierarchy, teamWorkGroups } from "./team-view-data.js";
import { useTeamProjectionRecovery } from "./team-projection-recovery.js";
import css from './TeamView.module.css';
function TeamSummary({ members, useSessions, useSessionStatus, t }) {
    const runtime = useSessionStatus(state => members.map(member => state.get(member.id)?.pendingInteraction !== undefined ? 'input'
        : state.get(member.id)?.running === true ? 'running' : state.get(member.id)?.running === false ? 'idle' : 'unknown').join(','));
    const summaries = useSessions(state => members.map(member => state.byId[member.id]?.running === true ? 'running' : state.byId[member.id]?.running === false ? 'idle' : 'unknown').join(','));
    const actual = runtime.split(',');
    const fallback = summaries.split(',');
    let running = 0, waiting = 0, idle = 0, preparing = 0, failed = 0, unknown = 0;
    members.forEach((member, index) => {
        if (member.phase === 'failed')
            failed++;
        else if (member.phase === 'provisioning')
            preparing++;
        else if (member.phase !== 'retired') {
            const status = actual[index] === 'unknown' ? fallback[index] : actual[index];
            if (status === 'input')
                waiting++;
            else if (status === 'running')
                running++;
            else if (status === 'unknown')
                unknown++;
            else
                idle++;
        }
    });
    return _jsxs("section", { className: css.summary, "aria-label": t('view.summary'), children: [_jsxs("span", { children: [_jsx("strong", { children: members.filter(member => member.legacyMode === undefined).length }), t('view.teamCount')] }), _jsxs("span", { children: [_jsx("strong", { children: running }), t('memberStatus.running')] }), _jsxs("span", { children: [_jsx("strong", { children: idle }), t('memberStatus.inactive')] }), unknown > 0 && _jsxs("span", { children: [_jsx("strong", { children: unknown }), t('memberStatus.unknown')] }), waiting > 0 && _jsxs("span", { children: [_jsx("strong", { children: waiting }), t('memberStatus.needsInput')] }), preparing > 0 && _jsxs("span", { children: [_jsx("strong", { children: preparing }), t('memberStatus.provisioning')] }), failed > 0 && _jsxs("span", { children: [_jsx("strong", { children: failed }), t('memberStatus.failed')] }), members.some(member => member.legacyMode !== undefined) && _jsxs("span", { children: [_jsx("strong", { children: members.filter(member => member.legacyMode !== undefined).length }), t('view.legacyCount')] })] });
}
function MemberRow({ member, depth, selected, select, useSessions, useSessionStatus, t }) {
    const selection = useSessions(state => state.projectionsBySession[member.id]?.values.modelSelection);
    const model = memberModelDisplay(member, selection);
    const running = useSessionStatus(state => state.get(member.id)?.running);
    const pendingInteraction = useSessionStatus(state => state.get(member.id)?.pendingInteraction);
    const summaryRunning = useSessions(state => state.byId[member.id]?.running);
    const status = memberActivity(member, running, summaryRunning, pendingInteraction !== undefined);
    return _jsx("li", { className: selected ? `${css.memberItem} ${css.selectedRow}` : css.memberItem, style: { marginInlineStart: `${Math.min(Math.max(depth - 1, 0), 4) * 12}px` }, children: _jsxs("button", { type: "button", className: css.memberButton, onClick: select, "aria-expanded": selected, "aria-label": member.expert?.name ?? member.name, children: [_jsx(IconUserOutlineRegular, { size: 17 }), _jsxs("span", { className: css.memberIdentity, children: [_jsx("strong", { children: member.expert?.name ?? member.name }), _jsxs("span", { className: css.memberBadges, children: [_jsx("small", { children: t(member.role === 'lead' ? 'view.communicator' : memberFunctionKey(member)) }), member.role !== 'lead' && member.legacyMode === undefined && _jsx("small", { children: t(member.expert === undefined ? 'view.retained' : 'view.expert') })] }), member.role !== 'lead' && member.legacyMode === undefined && _jsx("small", { className: css.roleSummary, children: member.description }), _jsxs("small", { className: css.model, children: [_jsx("span", { children: model.model ?? t('view.sessionModel') }), " \u00B7 ", _jsx("span", { children: model.reasoningEffort ?? t('roles.defaultEffort') })] }), model.next !== undefined && _jsxs("small", { className: css.modelNote, children: [_jsx("span", { children: t('view.nextModel', { model: model.next.model }) }), " \u00B7 ", _jsx("span", { children: t('view.nextEffort', { effort: model.next.reasoningEffort ?? t('roles.defaultEffort') }) })] }), depth > 1 && _jsx("small", { className: css.modelNote, children: t('view.descendant') }), member.legacyMode !== undefined && _jsx("small", { className: css.modelNote, children: t(`view.legacy.${member.legacyMode}`) })] }), _jsxs("span", { className: css.memberStatus, children: [_jsx(StateDot, { state: status === 'failed' ? 'error' : status === 'inactive' || status === 'retired' || status === 'unknown' ? 'idle' : status === 'needsInput' ? 'warning' : 'ongoing' }), _jsx("span", { children: t(`memberStatus.${status}`) })] })] }) });
}
function TaskRow({ task, ownerRunning, currentGoalRevision, duplicate, t }) {
    return _jsxs("details", { className: css.task, children: [_jsxs("summary", { children: [_jsx("strong", { children: task.subject }), _jsxs("span", { children: [task.ownerName ?? t('unowned'), " \u00B7 ", task.id] }), _jsx("span", { children: t(taskWorkStateKey(task, ownerRunning, currentGoalRevision) ?? `status.${task.status === 'deleted' ? 'completed' : task.status}`) })] }), _jsxs("div", { className: css.taskBody, children: [duplicate && _jsx("p", { className: css.hint, children: t('work.duplicateSubject') }), _jsx("p", { children: task.description }), task.blockedBy.length > 0 && _jsxs("p", { children: [t('blockedBy'), ": ", task.blockedBy.join(', ')] }), task.writeScopes.length > 0 && _jsxs("p", { children: [t('writeScopes'), ": ", task.writeScopes.join(', ')] }), task.result !== undefined && _jsxs("section", { children: [_jsx("h4", { children: t(task.validity.reusable ? 'task.result' : 'task.recordedResult') }), _jsx("p", { children: task.result })] }), task.evidence !== undefined && task.evidence.length > 0 && _jsxs("section", { children: [_jsx("h4", { children: t('task.evidence') }), _jsx("ul", { children: task.evidence.map((entry, index) => _jsx("li", { children: entry }, index)) })] }), _jsx(TaskWorkDetails, { task: task, t: t }), task.writeScopeWarnings.map(warning => _jsx("p", { role: "status", children: warning }, warning))] })] });
}
/**
 * Show the persistent Team with native tabs and a compact, searchable roster.
 * @param props - Session state hooks, Team navigation, role settings, and localized copy.
 * @returns the Team page without starting model work.
 */
export function TeamView({ sessionId, useSession, useSessions, useSessionStatus, openTeammate, refreshTeam, roles, experts, goals, mailbox, members, taskArchive, openView, t, useRecoveredTeam = () => undefined, }) {
    const [tab, setTab] = useState('members');
    const [expertsVisited, setExpertsVisited] = useState(false);
    const [goalsVisited, setGoalsVisited] = useState(false);
    const [search, setSearch] = useState('');
    const [taskQuery, setTaskQuery] = useState('');
    const [taskFilter, setTaskFilter] = useState('all');
    const [visibleLimit, setVisibleLimit] = useState(50);
    const [compact, setCompact] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [error, setError] = useState(null);
    const detailsRef = useRef(null);
    const tabId = useId();
    const parentId = useSession(snapshot => snapshot.subagent?.address.parentSessionId);
    const opening = useSession(snapshot => snapshot.openState === 'loading');
    const listing = useSessions(state => state.phase === 'pending');
    const recoveredTeam = useRecoveredTeam(sessionId);
    const team = useSessions(state => selectTeam(state, sessionId, parentId)) ?? recoveredTeam;
    const pendingGoalReview = useSessionStatus(state => state.get(team?.members.find(member => member.role === 'lead')?.id ?? sessionId)
        ?.pendingInteraction?.kind === 'plan-review');
    const taskActivities = useTaskActivities(team, useSessions, useSessionStatus);
    const duplicateSubjects = duplicateTaskSubjects(team?.tasks ?? []);
    const recovery = useTeamProjectionRecovery(sessionId, true, team === undefined, refreshTeam);
    useEffect(() => {
        if (pendingGoalReview)
            openView('chat', '');
    }, [pendingGoalReview, openView]);
    const rows = useMemo(() => teamHierarchy(team?.members ?? []), [team?.members]);
    const workGroups = useMemo(() => teamWorkGroups(team?.members ?? [], team?.tasks ?? []), [team?.members, team?.tasks]);
    const visibleTasks = useMemo(() => (team?.tasks ?? []).filter(task => (taskFilter === 'all' || task.status === taskFilter)
        && [task.id, task.subject, task.description, task.ownerName, ...task.writeScopes].some(value => value?.toLocaleLowerCase().includes(taskQuery.trim().toLocaleLowerCase()))), [team?.tasks, taskFilter, taskQuery]);
    const displayedTaskIds = new Set(visibleTasks.slice(0, visibleLimit).map(task => task.id));
    const visibleWorkGroups = workGroups.map(group => ({ ...group, tasks: group.tasks.filter(task => displayedTaskIds.has(task.id)) }))
        .filter(group => group.tasks.length > 0);
    const tasksByOwner = useMemo(() => {
        const result = new Map();
        for (const task of team?.tasks ?? []) {
            if (task.ownerName === undefined)
                continue;
            const owned = result.get(task.ownerName) ?? [];
            owned.push(task);
            result.set(task.ownerName, owned);
        }
        return result;
    }, [team?.tasks]);
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const matchingRows = useSessions(state => rows.map(({ member }) => {
        if (normalizedSearch === '')
            return '1';
        const model = memberModelDisplay(member, state.projectionsBySession[member.id]?.values.modelSelection);
        return [member.name, member.expert?.name, member.description, model.model, model.reasoningEffort,
            model.next?.model, model.next?.reasoningEffort]
            .some(value => value?.toLocaleLowerCase().includes(normalizedSearch)) ? '1' : '0';
    }).join(''));
    const filtered = rows.filter((_, index) => matchingRows[index] === '1');
    const selected = team?.members.find(member => member.id === selectedId) ?? team?.members.find(member => member.role === 'lead');
    const selectedTask = team?.tasks.find(task => task.id === selectedTaskId);
    const selectedModelSelection = useSessions(state => selected === undefined ? undefined
        : state.projectionsBySession[selected.id]?.values.modelSelection);
    const selectedModel = selected === undefined ? undefined : memberModelDisplay(selected, selectedModelSelection);
    const selectedRunning = useSessionStatus(state => selected === undefined ? undefined : state.get(selected.id)?.running);
    const selectedSummaryRunning = useSessions(state => selected === undefined ? undefined : state.byId[selected.id]?.running);
    const tabIds = ['members', 'tasks', ...(goals === undefined ? [] : ['goals']),
        'memory', ...(mailbox === undefined ? [] : ['mailbox']), ...(experts === undefined ? [] : ['experts']), 'diagnostics'];
    useEffect(() => { setSearch(''); setTaskQuery(''); setTaskFilter('all'); setVisibleLimit(50); setSelectedId(null); setSelectedTaskId(null); setError(null); setTab('members'); setExpertsVisited(false); setGoalsVisited(false); }, [sessionId]);
    useEffect(() => {
        if (selectedId === null && selectedTaskId === null)
            return;
        const details = detailsRef.current;
        if (details !== null && details.parentElement !== null
            && details.getBoundingClientRect().top > details.parentElement.getBoundingClientRect().top + 4) {
            details.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedId, selectedTaskId]);
    const selectTab = (value) => {
        setTab(value);
        if (value === 'experts')
            setExpertsVisited(true);
        if (value === 'goals')
            setGoalsVisited(true);
    };
    return _jsxs("div", { className: compact ? `${css.page} ${css.compact}` : css.page, "data-team-view": true, "data-conversation-composer-overlay": true, children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { children: [_jsx("h1", { children: t('view.title') }), _jsx("p", { children: t('view.subtitle') })] }), _jsxs("div", { className: css.headerActions, children: [goals !== undefined && _jsx("button", { type: "button", className: css.button, onClick: () => { selectTab('goals'); }, children: t('view.fullPlan') }), _jsx("button", { type: "button", className: css.button, onClick: () => { setCompact(!compact); }, children: t(compact ? 'view.comfortable' : 'view.compact') }), roles !== undefined && _jsx("button", { type: "button", className: css.button, onClick: () => { setTab(tab === 'settings' ? 'members' : 'settings'); }, children: t(tab === 'settings' ? 'view.backToMembers' : 'view.settings') })] })] }), team !== undefined && _jsx(TeamSummary, { members: team.members, useSessions: useSessions, useSessionStatus: useSessionStatus, t: t }), _jsxs("div", { className: css.goal, children: [_jsx("span", { children: t(team?.goal?.status === 'revoked' ? 'goals.revokedShort' : 'view.goal') }), _jsx("p", { children: team?.goal?.definition.objective ?? t('goals.empty') }), goals !== undefined && _jsx("button", { type: "button", className: css.textButton, onClick: () => { selectTab('goals'); }, children: t('view.scope') })] }), error !== null && _jsx("p", { role: "alert", className: css.error, children: error }), team?.failure !== undefined && _jsx("p", { role: "alert", className: css.error, children: t('failure', { message: team.failure }) }), tab === 'settings' && roles !== undefined ? _jsxs("div", { className: css.settings, children: [_jsx(CurrentTeamRoles, { members: team?.members ?? [], plannedTeam: team?.goalProposal?.change.kind === 'replace' && team.goalDecision?.proposalRevision !== team.goalProposal.revision
                            ? team.goalProposal.change.definition.plan : undefined, useSessions: useSessions, t: t }), _jsx(TeamRoles, { operations: roles, t: t })] }) : _jsxs(_Fragment, { children: [_jsxs("div", { className: css.toolbar, children: [_jsx("div", { role: "tablist", "aria-label": t('workspace.navigation'), className: css.tabs, children: tabIds.map((value, index) => _jsx("button", { type: "button", id: `${tabId}-${value}`, role: "tab", "aria-selected": tab === value, "aria-controls": `${tabId}-panel`, tabIndex: tab === value ? 0 : -1, onClick: () => { selectTab(value); }, onKeyDown: (event) => {
                                        const next = event.key === 'ArrowRight' ? (index + 1) % tabIds.length
                                            : event.key === 'ArrowLeft' ? (index + tabIds.length - 1) % tabIds.length
                                                : event.key === 'Home' ? 0 : event.key === 'End' ? tabIds.length - 1 : undefined;
                                        if (next === undefined)
                                            return;
                                        event.preventDefault();
                                        const value = tabIds[next];
                                        if (value === undefined)
                                            return;
                                        selectTab(value);
                                        document.getElementById(`${tabId}-${value}`)?.focus();
                                    }, children: t(`view.${value}`) }, value)) }), tab === 'members' && _jsx("input", { className: css.search, type: "search", "aria-label": t('view.search'), placeholder: t('view.search'), value: search, onChange: (event) => { setSearch(event.target.value); } })] }), _jsxs("section", { id: tab === 'experts' || tab === 'goals' || tab === 'mailbox' ? undefined : `${tabId}-panel`, hidden: tab === 'experts' || tab === 'goals' || tab === 'mailbox', role: "tabpanel", "aria-labelledby": `${tabId}-${tab}`, className: css.content, children: [team === undefined && _jsxs("div", { role: "status", className: css.empty, children: [t(opening || listing || recovery.state === 'loading' ? 'loading' : 'unavailable'), !opening && !listing && recovery.state !== 'loading' && _jsx("button", { type: "button", className: css.button, onClick: recovery.retry, children: t('recovery.retry') })] }), team !== undefined && tab === 'members' && _jsx(_Fragment, { children: _jsxs("div", { className: css.overviewGrid, children: [_jsxs("aside", { className: css.rosterPane, "aria-label": t('view.memberTree'), children: [_jsxs("h2", { children: [t('roster'), " ", _jsx("small", { children: team.members.length })] }), _jsx("ul", { className: css.memberList, "data-team-member-list": true, children: filtered.map(({ member, depth }, index) => _jsxs(Fragment, { children: [(index === 0 || memberSection(filtered[index - 1].member) !== memberSection(member))
                                                                && _jsx("li", { role: "presentation", className: css.groupLabel, children: t(`view.group.${memberSection(member)}`) }), _jsx(MemberRow, { member: member, depth: depth, selected: selectedId === member.id, select: () => { setSelectedId(member.id); setSelectedTaskId(null); }, useSessions: useSessions, useSessionStatus: useSessionStatus, t: t })] }, member.id)) }), filtered.length === 0 && _jsx("p", { className: css.empty, children: t('view.noMatches') }), _jsx("p", { className: css.hint, children: t('view.memberCount', { visible: filtered.length, total: team.members.length }) })] }), _jsxs("section", { className: css.boardPane, "aria-label": t('view.groupTasks'), children: [_jsxs("header", { children: [_jsxs("h2", { children: [t('view.groupTasks'), " ", _jsx("small", { children: team.tasks.length })] }), _jsx("span", { children: t('view.filteredTasks', { visible: Math.min(visibleTasks.length, visibleLimit), total: team.tasks.length }) })] }), _jsxs("div", { className: css.boardFilters, children: [_jsx("input", { type: "search", className: css.search, "aria-label": t('view.taskSearch'), placeholder: t('view.taskSearch'), value: taskQuery, onChange: event => { setTaskQuery(event.target.value); setVisibleLimit(50); } }), _jsx("select", { "aria-label": t('view.taskFilter'), className: css.filterSelect, value: taskFilter, onChange: event => {
                                                                const value = event.target.value;
                                                                if (value === 'all' || value === 'pending' || value === 'in_progress' || value === 'completed') {
                                                                    setTaskFilter(value);
                                                                    setVisibleLimit(50);
                                                                }
                                                            }, children: ['all', 'pending', 'in_progress', 'completed'].map(value => _jsx("option", { value: value, children: t(`view.filter.${value}`) }, value)) })] }), team.tasks.length === 0 && _jsxs("div", { className: css.boardEmpty, children: [_jsx("p", { children: t('view.noActiveTasks') }), _jsx("small", { children: t('view.completedHint', { count: team.completedTaskCount ?? 0 }) }), taskArchive !== undefined && _jsx("button", { type: "button", className: css.button, onClick: () => { selectTab('tasks'); }, children: t('view.openArchive') })] }), _jsx("div", { className: css.groupBoard, children: visibleWorkGroups.map(group => _jsxs("section", { className: css.groupLane, children: [_jsxs("header", { children: [_jsx("h3", { children: group.leader?.expert?.name ?? group.leader?.name
                                                                            ?? t(group.id === 'lead' ? 'workspace.leadGroup' : 'workspace.unassignedGroup') }), _jsx("small", { children: t('workspace.groupProgress', { completed: group.tasks.filter(task => task.status === 'completed').length,
                                                                            total: group.tasks.length }) })] }), _jsxs("div", { className: css.groupMembers, children: [group.members.filter(member => member.role !== 'lead').slice(0, 5).map(member => _jsx("button", { type: "button", "aria-label": t('view.inspectGroupMember', { name: member.expert?.name ?? member.name }), onClick: () => { setSelectedId(member.id); setSelectedTaskId(null); }, children: member.expert?.name ?? member.name }, member.id)), group.members.filter(member => member.role !== 'lead').length > 5
                                                                        && _jsxs("span", { children: ["+", group.members.filter(member => member.role !== 'lead').length - 5] })] }), group.tasks.map(task => _jsxs("button", { type: "button", className: selectedTaskId === task.id ? `${css.boardTask} ${css.boardTaskSelected}` : css.boardTask, "aria-pressed": selectedTaskId === task.id, onClick: () => { setSelectedTaskId(task.id); }, children: [_jsxs("small", { children: [task.id, " \u00B7 ", t(taskWorkStateKey(task, taskActivities.get(task.id), team.goal?.revision) ?? `status.${task.status === 'deleted' ? 'completed' : task.status}`)] }), _jsx("strong", { children: task.subject }), _jsx("span", { children: task.description }), duplicateSubjects.has(task.id) && _jsx("small", { children: t('work.duplicateSubject') }), _jsxs("small", { children: [task.ownerName ?? t('unowned'), task.blockedBy.length > 0 ? ` · ${t('blockedBy')}: ${task.blockedBy.join(', ')}` : ''] })] }, task.id))] }, group.id)) }), visibleTasks.length === 0 && team.tasks.length > 0 && _jsx("p", { className: css.empty, children: t('view.noMatches') }), visibleTasks.length > visibleLimit && _jsx("button", { type: "button", className: css.button, onClick: () => { setVisibleLimit(visibleLimit + 50); }, children: t('view.showMore') }), _jsx("p", { className: css.hint, children: t('view.isolationHint') })] }), _jsx("aside", { ref: detailsRef, className: css.inspectorPane, "aria-label": t('workspace.details'), children: selectedTask !== undefined ? _jsxs("section", { "aria-label": t('view.taskDetail'), children: [_jsxs("h2", { children: [selectedTask.subject, " \u00B7 ", selectedTask.id] }), _jsx("p", { children: selectedTask.description }), _jsxs("dl", { children: [_jsx("dt", { children: t('owner') }), _jsx("dd", { children: selectedTask.ownerName ?? t('unowned') }), selectedTask.reviewerName !== undefined && _jsxs(_Fragment, { children: [_jsx("dt", { children: t('view.reviewer') }), _jsx("dd", { children: selectedTask.reviewerName })] }), selectedTask.autoAssign !== undefined && _jsxs(_Fragment, { children: [_jsx("dt", { children: t('view.autoAssign') }), _jsx("dd", { children: t(selectedTask.autoAssign ? 'view.enabled' : 'view.disabled') })] }), selectedTask.requiredSkill !== undefined && _jsxs(_Fragment, { children: [_jsx("dt", { children: t('view.requiredSkill') }), _jsx("dd", { children: selectedTask.requiredSkill })] }), _jsx("dt", { children: t('view.status') }), _jsx("dd", { children: t(taskWorkStateKey(selectedTask, taskActivities.get(selectedTask.id), team.goal?.revision) ?? `status.${selectedTask.status === 'deleted' ? 'completed' : selectedTask.status}`) }), _jsx("dt", { children: t('blockedBy') }), _jsx("dd", { children: selectedTask.blockedBy.join(', ') || t('memory.none') })] }), _jsx(TaskWorkDetails, { task: selectedTask, t: t }), _jsx(AdviserFindings, { task: selectedTask, findings: team.adviserDecisions, t: t }), selectedTask.evidence !== undefined && selectedTask.evidence.length > 0 && _jsxs("details", { children: [_jsx("summary", { children: t('task.evidence') }), _jsx("ul", { children: selectedTask.evidence.map((entry, index) => _jsx("li", { children: entry }, index)) })] })] }) : selected !== undefined && _jsxs("section", { "aria-label": t('view.memberDetail'), children: [_jsxs("header", { children: [_jsx("h2", { children: selected.expert?.name ?? selected.name }), _jsx("button", { type: "button", className: css.button, disabled: selected.phase === 'provisioning' || selected.phase === 'failed', onClick: () => {
                                                                    try {
                                                                        if (selected.id === sessionId)
                                                                            openView('chat', '');
                                                                        else {
                                                                            openTeammate(sessionId, selected.id);
                                                                            openView('chat', '');
                                                                        }
                                                                    }
                                                                    catch (reason) {
                                                                        setError(String(reason));
                                                                    }
                                                                }, children: t('open') })] }), _jsx("p", { children: selected.description }), _jsxs("dl", { children: [_jsx("dt", { children: t('model') }), _jsx("dd", { children: selectedModel?.model ?? t('view.sessionModel') }), _jsx("dt", { children: t('reasoningEffort') }), _jsx("dd", { children: selectedModel?.reasoningEffort ?? t('roles.defaultEffort') }), _jsx("dt", { children: t('workspace.modelSource') }), _jsx("dd", { children: t(`view.modelSource.${selectedModel?.source ?? 'bound'}`) }), _jsx("dt", { children: t('parent') }), _jsx("dd", { children: team.members.find(member => member.id === selected.parentId)?.name ?? t('memory.none') }), _jsx("dt", { children: t('workspace.groupMembers') }), _jsx("dd", { children: team.members.filter(member => member.parentId === selected.id).length })] }), selected.expert !== undefined && _jsx("p", { className: css.hint, children: t('view.boundRevision', { revision: selected.expert.revision }) }), selected.persona !== undefined && _jsxs("details", { children: [_jsx("summary", { children: t('view.persona') }), _jsx("p", { className: css.preservedText, children: selected.persona })] }), selected.error !== undefined && _jsx("p", { role: "alert", children: selected.error }), selected.legacyMode !== undefined && _jsx("p", { className: css.hint, children: t(`view.legacy.${selected.legacyMode}`) }), members !== undefined && selected.role !== 'lead' && selected.legacyMode === undefined && _jsx(TeamMemberControls, { sessionId: sessionId, member: selected, inactive: (selectedRunning ?? selectedSummaryRunning) === false, operations: members, t: t }, `${sessionId}:${selected.id}`), selected.legacyMode === undefined && _jsx(MemberSkills, { selection: team.skillSelections?.find(selection => selection.memberId === selected.id), t: t }, selected.id), _jsx("h3", { children: t('view.memberTasks') }), (tasksByOwner.get(selected.name)?.length ?? 0) === 0 ? _jsx("p", { className: css.hint, children: t('view.noTask') })
                                                        : tasksByOwner.get(selected.name)?.map(task => _jsx(TaskRow, { task: task, ownerRunning: taskActivities.get(task.id), currentGoalRevision: team.goal?.revision, duplicate: duplicateSubjects.has(task.id), t: t }, task.id))] }) })] }) }), team !== undefined && tab === 'tasks' && _jsxs(_Fragment, { children: [team.tasks.length === 0 ? _jsx("p", { className: css.empty, children: t('view.noActiveTasks') })
                                        : team.tasks.map(task => _jsx(TaskRow, { task: task, ownerRunning: taskActivities.get(task.id), currentGoalRevision: team.goal?.revision, duplicate: duplicateSubjects.has(task.id), t: t }, task.id)), taskArchive !== undefined && _jsx(TeamTaskArchive, { sessionId: sessionId, operations: taskArchive, t: t }, `${sessionId}:${team.goal?.revision ?? 0}:${team.goal?.status ?? 'none'}`)] }), team !== undefined && tab === 'diagnostics' && _jsx(TeamDiagnostics, { team: team, t: t }), team !== undefined && tab === 'memory' && _jsxs("div", { className: css.memory, children: [_jsx("p", { className: css.hint, children: t('memory.hint') }), team.brief === undefined ? _jsx("p", { children: t('memory.empty') }) : _jsxs(_Fragment, { children: [(team.brief.goalRevision === undefined || team.brief.goalRevision !== (team.goal?.revision ?? 0) || team.goal?.status === 'revoked')
                                                && _jsx("p", { role: "status", children: t('memory.historical') }), _jsxs("section", { children: [_jsx("h2", { children: t('memory.objective') }), _jsx("p", { children: team.brief.objective })] }), _jsxs("section", { children: [_jsx("h2", { children: t('memory.authorization') }), _jsx("p", { children: team.brief.authorization || t('memory.none') })] }), _jsxs("section", { children: [_jsx("h2", { children: t('memory.decisions') }), _jsx("p", { children: team.brief.decisions || t('memory.none') })] })] })] })] })] }), experts !== undefined && expertsVisited && _jsx("section", { id: tab === 'experts' ? `${tabId}-panel` : undefined, role: "tabpanel", "aria-labelledby": `${tabId}-experts`, hidden: tab !== 'experts', className: css.content, children: _jsx(TeamExperts, { operations: experts, members: team?.members ?? [], openMember: (id) => {
                        if (id !== sessionId)
                            openTeammate(sessionId, id);
                        openView('chat', '');
                    }, t: t }, sessionId) }), goals !== undefined && goalsVisited && _jsx("section", { id: tab === 'goals' ? `${tabId}-panel` : undefined, role: "tabpanel", "aria-labelledby": `${tabId}-goals`, hidden: tab !== 'goals', className: css.content, children: team === undefined ? _jsxs("div", { role: "status", className: css.empty, children: [t(opening || listing || recovery.state === 'loading' ? 'loading' : 'unavailable'), !opening && !listing && recovery.state !== 'loading' && _jsx("button", { type: "button", className: css.button, onClick: recovery.retry, children: t('recovery.retry') })] })
                    : _jsx(TeamGoals, { sessionId: sessionId, operations: goals, state: team, openReview: () => { openView('chat', ''); }, t: t }, sessionId) }), mailbox !== undefined && tab === 'mailbox' && team !== undefined && _jsx("section", { id: `${tabId}-panel`, role: "tabpanel", "aria-labelledby": `${tabId}-mailbox`, className: css.content, children: _jsx(TeamMailbox, { sessionId: sessionId, leadId: team.members.find(member => member.role === 'lead')?.id ?? sessionId, members: team.members, operations: mailbox, t: t }) }), _jsxs("footer", { className: css.footer, children: [_jsxs("span", { children: [t('workspace.completed'), " ", team?.completedTaskCount ?? team?.tasks.filter(task => task.status === 'completed').length ?? 0] }), _jsx("button", { type: "button", className: css.textButton, onClick: () => { openView('chat', ''); }, children: t('view.chat') })] })] });
}
