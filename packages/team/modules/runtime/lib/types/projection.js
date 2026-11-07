/** Team state projected incrementally from committed Session events, with a durable-only client view. */
import { z } from 'zod';
import { memberFunction, memberRoleRevision, teamMemberRoleSchema } from "./member-role.js";
import { readPortableTeamRecord } from "./portable-events.js";
import { brandString } from '@deepseek-ai/dsh-brand';
import { TeamId as toTeamId, TeamMessageId as toTeamMessageId, TeamTaskId as toTeamTaskId, } from "./types.js";
import { assertTaskGraphCandidate } from "./task-graph.js";
import { projectTaskView } from "./task-view.js";
import { TeamExpertId } from "./expert-types.js";
import { teamGoalDecisionSchema, teamGoalProposalSchema, teamGoalStateFields } from "./goal-schema.js";
import { assertGoalProposal, applyGoalDecision } from "./goal-fold.js";
import { taskWorkSchema } from "./task-work.js";
import { TeamTaskExecutionId } from "./task-work-types.js";
import { assertTaskWorkEvent } from "./task-work-event.js";
import { applyTaskEffectEvent, taskEffectEventSchema } from "./task-effects.js";
import { teamSkillSelectionSchema, teamSkillSelectionViewSchema, assertTeamSkillSelection, teamSkillSelectionView } from "./skill-state.js";
const nonNegativeSafeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const positiveSafeInteger = nonNegativeSafeInteger.min(1);
const sessionIdSchema = z.string().min(1).transform(value => brandString(value));
const teamIdSchema = z.string().min(1).transform(value => toTeamId(value));
const numericTaskIdPattern = /^task-(\d+)$/u;
const teamTaskIdSchema = z.string().min(1).refine((value) => {
    const match = numericTaskIdPattern.exec(value);
    return match === null || Number.isSafeInteger(Number(match[1]));
}, { message: 'numeric task id suffix must be a safe integer' }).transform(value => toTeamTaskId(value));
const teamMessageIdSchema = z.string().min(1).transform(value => toTeamMessageId(value));
const teamTaskExecutionIdSchema = z.string().min(1).transform(value => TeamTaskExecutionId(value));
const coreContentBlockTypes = new Set(['text', 'reasoning', 'image', 'tool-call', 'tool-result']);
const imageAttachmentSchema = z.object({
    attachmentId: z.string().min(1),
    mediaType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
    bytes: nonNegativeSafeInteger,
    width: positiveSafeInteger,
    height: positiveSafeInteger,
    name: z.string().optional(),
}).strict();
// Validate the listed variants; retired tool-result tags cannot enter the
// merge-extensible fallback for JSON-decoded plugin content.
const contentBlockSchema = z.lazy(() => z.union([
    z.object({ type: z.literal('text'), text: z.string() }).strict(),
    z.object({ type: z.literal('reasoning'), text: z.string() }).strict(),
    z.object({ type: z.literal('image'), attachment: imageAttachmentSchema }).strict(),
    z.object({
        type: z.literal('tool-call'),
        id: z.string().min(1),
        name: z.string(),
        arguments: z.string(),
    }).strict(),
    // Keep unknown JSON objects by reference; loose-object parsing drops their own __proto__ keys.
    z.custom((value) => {
        if (typeof value !== 'object' || value === null || Array.isArray(value))
            return false;
        const type = value.type;
        return typeof type === 'string' && type.length > 0 && !coreContentBlockTypes.has(type);
    }),
]));
const memberSettingsFields = {
    teamFunction: z.enum(['planning_adviser', 'quality_adviser', 'domain_adviser',
        'group_lead', 'executor', 'verifier']).optional(),
    expert: z.object({
        id: z.string().min(1).transform(TeamExpertId), revision: positiveSafeInteger, name: z.string().min(1),
    }).strict().optional(),
    modelProvider: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    reasoningEffort: z.string().min(1).optional(),
    persona: z.string().optional(),
};
const teamMemberSnapshotSchema = z.object({
    ...memberSettingsFields,
    id: sessionIdSchema,
    parentId: sessionIdSchema.optional(),
    name: z.string(),
    description: z.string(),
    provider: z.string(),
    context: z.enum(['fresh', 'fork']),
    phase: z.enum(['provisioning', 'active', 'failed', 'retired']),
    error: z.string().optional(),
    workspace: z.object({
        cwd: z.string().min(1),
        baselineManifestPath: z.string().min(1),
        maxMode: z.enum(['read-only', 'workspace-write']),
    }).strict().optional(),
}).strict();
const taskEvidenceFields = {
    inputKey: z.string().min(1).optional(),
    result: z.string().min(1).optional(),
    evidence: z.array(z.string().min(1)).optional(),
};
const teamBriefSchema = z.object({
    revision: positiveSafeInteger,
    goalRevision: nonNegativeSafeInteger.optional(),
    objective: z.string().min(1),
    authorization: z.string(),
    decisions: z.string(),
}).strict();
const teamBriefEventSchema = z.object({
    version: z.literal(2),
    teamId: teamIdSchema,
    brief: teamBriefSchema,
}).strict();
const teamGoalProposedEventSchema = z.object({
    version: z.literal(2), teamId: teamIdSchema, proposal: teamGoalProposalSchema,
}).strict();
const teamGoalDecidedEventSchema = z.object({
    version: z.literal(2), teamId: teamIdSchema, decision: teamGoalDecisionSchema,
}).strict();
const teamSkillsSelectedEventSchema = z.object({
    version: z.literal(2), teamId: teamIdSchema, selection: teamSkillSelectionSchema,
}).strict();
const teamTaskSnapshotSchema = z.object({
    work: taskWorkSchema.optional(),
    autoAssign: z.boolean().optional(),
    requiredSkill: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).optional(),
    autoDispatch: z.boolean().optional(),
    ...taskEvidenceFields,
    id: teamTaskIdSchema,
    revision: positiveSafeInteger,
    subject: z.string(),
    description: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'deleted']),
    ownerId: sessionIdSchema.optional(),
    reviewerId: sessionIdSchema.optional(),
    blockedBy: z.array(teamTaskIdSchema),
    writeScopes: z.array(z.string()),
}).strict();
const teamMessageSnapshotSchema = z.object({
    cooldownProvider: z.string().min(1).optional(),
    notBefore: nonNegativeSafeInteger.optional(),
    id: teamMessageIdSchema,
    taskDispatch: z.object({ taskId: teamTaskIdSchema, executionId: teamTaskExecutionIdSchema,
        adviserRoleRevision: nonNegativeSafeInteger.optional(), kind: z.enum(['execute', 'review', 'advice']) }).strict().optional(),
    goalRevision: nonNegativeSafeInteger.optional(),
    adoptedFrom: teamMessageIdSchema.optional(),
    senderId: sessionIdSchema,
    senderName: z.string(),
    targetId: sessionIdSchema,
    content: z.array(contentBlockSchema),
}).strict();
const teamEventSelectorSchema = z.object({
    version: nonNegativeSafeInteger,
    teamId: teamIdSchema,
}).loose();
const teamMemberEventSchema = z.object({
    version: z.literal(2),
    teamId: teamIdSchema,
    member: teamMemberSnapshotSchema.refine(member => member.phase !== 'retired', 'retirement requires its own event'),
}).strict();
const teamMemberRetirementEventSchema = z.object({
    version: z.literal(2), teamId: teamIdSchema, memberId: sessionIdSchema, retired: z.boolean(),
}).strict();
const teamMemberModelRouteSchema = z.object({
    goalRevision: nonNegativeSafeInteger.optional(),
    memberId: sessionIdSchema,
    revision: positiveSafeInteger,
    modelProvider: z.string().min(1),
    model: z.string().min(1),
    reasoningEffort: z.string().min(1).optional(),
}).strict();
const teamMemberModelRouteEventSchema = z.object({
    version: z.literal(2), teamId: teamIdSchema, route: teamMemberModelRouteSchema,
}).strict();
const teamMemberRoleEventSchema = z.object({
    version: z.literal(2), teamId: teamIdSchema, role: teamMemberRoleSchema,
}).strict();
const teamTaskEventSchema = z.object({
    version: z.literal(2),
    teamId: teamIdSchema,
    task: teamTaskSnapshotSchema,
}).strict();
const teamAdviserDecisionSchema = z.object({
    id: z.string().min(1), goalRevision: nonNegativeSafeInteger,
    taskId: teamTaskIdSchema, executionId: teamTaskExecutionIdSchema,
    adviserId: sessionIdSchema, adviserRoleRevision: nonNegativeSafeInteger.optional(),
    adviserFunction: z.enum(['planning_adviser', 'quality_adviser', 'domain_adviser']),
    decision: z.enum(['approve', 'revise']), summary: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
}).strict();
const teamAdviserDecisionEventSchema = z.object({
    version: z.literal(2), teamId: teamIdSchema, finding: teamAdviserDecisionSchema,
}).strict();
const teamMessageQueuedEventSchema = z.object({
    version: z.literal(2),
    teamId: teamIdSchema,
    message: teamMessageSnapshotSchema,
}).strict();
const teamMessageDeliveredEventSchema = z.object({
    version: z.literal(2),
    teamId: teamIdSchema,
    messageId: teamMessageIdSchema,
    targetId: sessionIdSchema,
}).strict();
/**
 * Construct empty state for one Team identity.
 * @param rootId - root Session identity.
 * @returns empty Team state.
 */
export function emptyTeamState(rootId) {
    return {
        id: toTeamId(rootId),
        members: [],
        tasks: [],
        taskEffects: [],
        messages: [],
        delivered: [],
        nextTaskNumber: 1,
    };
}
const teamProjectionEntrySchema = z.object({
    skillSelections: z.array(teamSkillSelectionSchema).optional(),
    memberRoles: z.array(teamMemberRoleSchema).optional(),
    modelRoutes: z.array(teamMemberModelRouteSchema).optional(),
    ...teamGoalStateFields,
    id: teamIdSchema,
    members: z.array(teamMemberSnapshotSchema),
    tasks: z.array(teamTaskSnapshotSchema),
    taskEffects: z.array(taskEffectEventSchema).optional(),
    adviserDecisions: z.array(teamAdviserDecisionSchema).optional(),
    messages: z.array(teamMessageSnapshotSchema),
    delivered: z.array(teamMessageIdSchema),
    nextTaskNumber: positiveSafeInteger,
    brief: teamBriefSchema.optional(),
    failure: z.string().optional(),
}).strict();
/**
 * Test whether a Session event belongs to the Team domain.
 * @param event - candidate Session event.
 * @returns whether the event has a Team-owned type.
 */
export function isTeamEvent(event) {
    return event.type === 'team/brief'
        || event.type === 'team/skills-selected'
        || event.type === 'team/goal-proposed'
        || event.type === 'team/goal-decided'
        || event.type === 'team/member'
        || event.type === 'team/member-retirement'
        || event.type === 'team/member-model-route'
        || event.type === 'team/member-role'
        || event.type === 'team/task'
        || event.type === 'team/task-effect'
        || event.type === 'team/adviser-decision'
        || event.type === 'team/message/queued'
        || event.type === 'team/message/delivered';
}
/** Decode one persisted Team value and retain the schema failure as its cause. */
function parsePersisted(type, schema, value) {
    try {
        return schema.parse(value);
    }
    catch (error) {
        throw new Error(`persisted Agent Teams ${type} payload is invalid`, { cause: error });
    }
}
/** Decode the complete current-version payload selected by one Team event type. */
function parseCurrentTeamEvent(event) {
    switch (event.type) {
        case 'team/skills-selected':
            return { ...event, data: parsePersisted(event.type, teamSkillsSelectedEventSchema, event.data) };
        case 'team/goal-proposed':
            return { ...event, data: parsePersisted(event.type, teamGoalProposedEventSchema, event.data) };
        case 'team/goal-decided':
            return { ...event, data: parsePersisted(event.type, teamGoalDecidedEventSchema, event.data) };
        case 'team/brief':
            return { ...event, data: parsePersisted(event.type, teamBriefEventSchema, event.data) };
        case 'team/member':
            return { ...event, data: parsePersisted(event.type, teamMemberEventSchema, event.data) };
        case 'team/member-retirement':
            return { ...event, data: parsePersisted(event.type, teamMemberRetirementEventSchema, event.data) };
        case 'team/member-role':
            return { ...event, data: parsePersisted(event.type, teamMemberRoleEventSchema, event.data) };
        case 'team/member-model-route':
            return { ...event, data: parsePersisted(event.type, teamMemberModelRouteEventSchema, event.data) };
        case 'team/task':
            return { ...event, data: parsePersisted(event.type, teamTaskEventSchema, event.data) };
        case 'team/task-effect':
            return { ...event, data: parsePersisted(event.type, taskEffectEventSchema, event.data) };
        case 'team/adviser-decision':
            return { ...event, data: parsePersisted(event.type, teamAdviserDecisionEventSchema, event.data) };
        case 'team/message/queued':
            return { ...event, data: parsePersisted(event.type, teamMessageQueuedEventSchema, event.data) };
        case 'team/message/delivered':
            return { ...event, data: parsePersisted(event.type, teamMessageDeliveredEventSchema, event.data) };
        /* v8 ignore next 2 -- TeamEventType is closed and every member is handled above. */
        default:
            return event;
    }
}
function applyProjectionEvent(state, event) {
    if (state.failure !== undefined)
        return state;
    if (!isTeamEvent(event))
        return state;
    try {
        const outerSelector = parsePersisted(event.type, teamEventSelectorSchema, event.data);
        if (outerSelector.teamId !== state.id)
            return state;
        if (outerSelector.version !== 2)
            throw new Error(`unsupported Agent Teams event version ${String(outerSelector.version)}`);
        if (event.type === 'team/task') {
            const outer = parsePersisted(event.type, teamTaskEventSchema, event.data);
            if (outer.teamId !== state.id)
                return state;
            const carrier = readPortableTeamRecord(outer.task);
            if (carrier !== undefined) {
                const data = z.object({ teamId: teamIdSchema }).loose().parse(JSON.parse(carrier.payload));
                if (data.teamId !== outer.teamId)
                    throw new Error('portable Team event selector differs from its carrier');
                if (carrier.type === 'team/task' && 'task' in data) {
                    const nested = teamTaskSnapshotSchema.parse(data.task);
                    if (readPortableTeamRecord(nested) !== undefined)
                        throw new Error('nested portable Team event is invalid');
                }
                const decoded = { ...event, type: carrier.type, data };
                if (!isTeamEvent(decoded))
                    throw new Error(`unsupported portable Team event ${carrier.type}`);
                event = decoded;
            }
        }
        const selector = parsePersisted(event.type, teamEventSelectorSchema, event.data);
        if (selector.teamId !== state.id)
            return state;
        if (selector.version !== 2) {
            throw new Error(`unsupported Agent Teams event version ${String(selector.version)}`);
        }
        return applyCurrentTeamEvent(state, parseCurrentTeamEvent(event));
    }
    catch (error) {
        /* v8 ignore next -- the owned Team transition throws Error instances. */
        return { ...state, failure: error instanceof Error ? error.message : String(error) };
    }
}
function replaceAt(items, index, item) {
    const next = [...items];
    if (index < 0)
        next.push(item);
    else
        next[index] = item;
    return next;
}
function applyCurrentTeamEvent(state, event) {
    switch (event.type) {
        case 'team/skills-selected': {
            const selection = event.data.selection;
            assertTeamSkillSelection(state, selection);
            const prior = state.skillSelections ?? [];
            return { ...state, skillSelections: replaceAt(prior, prior.findIndex(value => value.memberId === selection.memberId), selection) };
        }
        case 'team/goal-proposed': {
            if (String(event.data.proposal.proposedBy) !== state.id)
                throw new Error('only the Team Lead may propose a goal');
            assertGoalProposal(state, event.data.proposal);
            return { ...state, goalProposal: event.data.proposal };
        }
        case 'team/goal-decided': {
            const goal = applyGoalDecision(state, event.data.decision);
            return { ...state, goalDecision: event.data.decision, ...goal === undefined ? {} : { goal } };
        }
        case 'team/brief': {
            if (event.data.brief.revision !== (state.brief?.revision ?? 0) + 1) {
                throw new Error('shared brief revision is not contiguous');
            }
            return { ...state, brief: event.data.brief };
        }
        case 'team/member': {
            const member = event.data.member;
            const index = state.members.findIndex(candidate => candidate.id === member.id);
            const prior = state.members[index];
            const named = state.members.find(candidate => candidate.name === member.name);
            if (named !== undefined && named.id !== member.id) {
                throw new Error(`teammate name "${member.name}" is reused by another member`);
            }
            if (prior === undefined) {
                if (member.expert !== undefined && state.members.some(candidate => candidate.expert?.id === member.expert?.id && candidate.phase !== 'failed')) {
                    throw new Error('an expert is bound to multiple members in this Team');
                }
                if (member.phase !== 'provisioning')
                    throw new Error(`teammate "${member.name}" must begin provisioning`);
                if (member.parentId !== undefined && String(member.parentId) !== state.id
                    && !state.members.some(parent => parent.id === member.parentId && parent.phase === 'active')) {
                    throw new Error(`teammate "${member.name}" has no active parent in this Team`);
                }
            }
            else {
                const legacyCopyRetry = prior.phase === 'failed' && member.phase === 'provisioning'
                    && prior.workspace === undefined && member.workspace === undefined && member.error === undefined
                    && prior.error?.startsWith('Team workspace snapshot differs at ') === true;
                if (prior.name !== member.name || prior.parentId !== member.parentId
                    || !legacyCopyRetry && (prior.provider !== member.provider || prior.context !== member.context
                        || prior.modelProvider !== member.modelProvider || prior.model !== member.model
                        || prior.reasoningEffort !== member.reasoningEffort || prior.persona !== member.persona)
                    || prior.teamFunction !== member.teamFunction
                    || prior.expert?.id !== member.expert?.id || prior.expert?.revision !== member.expert?.revision
                    || prior.expert?.name !== member.expert?.name
                    || prior.workspace !== undefined && (member.workspace === undefined || prior.workspace.cwd !== member.workspace.cwd
                        || prior.workspace.baselineManifestPath !== member.workspace.baselineManifestPath
                        || prior.workspace.maxMode !== member.workspace.maxMode)) {
                    throw new Error(`teammate "${member.id}" changed immutable identity fields`);
                }
                const preparedWorkspace = prior.phase === 'provisioning' && member.phase === 'provisioning'
                    && prior.workspace === undefined && member.workspace !== undefined
                    && prior.description === member.description && prior.error === member.error;
                const retryUnmaterialized = prior.phase === 'failed' && member.phase === 'provisioning'
                    && prior.workspace === undefined && member.workspace === undefined && member.error === undefined;
                if (!retryUnmaterialized && (prior.phase !== 'provisioning' || member.phase === 'provisioning' && !preparedWorkspace)) {
                    throw new Error(`teammate "${member.name}" has an invalid ${prior.phase} -> ${member.phase} transition`);
                }
            }
            return { ...state, members: replaceAt(state.members, index, member) };
        }
        case 'team/member-retirement': {
            const index = state.members.findIndex(member => member.id === event.data.memberId);
            const member = state.members[index];
            const expected = event.data.retired ? 'active' : 'retired';
            if (member?.phase !== expected)
                throw new Error(`member retirement requires an existing ${expected} member`);
            return { ...state, members: replaceAt(state.members, index, { ...member, phase: event.data.retired ? 'retired' : 'active' }) };
        }
        case 'team/member-role': {
            const role = event.data.role;
            const member = state.members.find(candidate => candidate.id === role.memberId);
            const roles = state.memberRoles ?? [];
            const index = roles.findIndex(candidate => candidate.memberId === role.memberId);
            if (member === undefined || !['active', 'retired'].includes(member.phase)
                || role.revision !== (roles[index]?.revision ?? 0) + 1) {
                throw new Error('member responsibility requires a retained member and contiguous revision');
            }
            return { ...state, memberRoles: replaceAt(roles, index, role) };
        }
        case 'team/member-model-route': {
            const route = event.data.route;
            const member = state.members.find(candidate => candidate.id === route.memberId);
            if (member === undefined || member.phase === 'failed' || member.phase === 'provisioning') {
                throw new Error('model route requires an existing active or retired teammate');
            }
            const routes = state.modelRoutes ?? [];
            const index = routes.findIndex(candidate => candidate.memberId === route.memberId);
            if (route.revision !== (routes[index]?.revision ?? 0) + 1) {
                throw new Error('member model route revision is not contiguous');
            }
            return { ...state, modelRoutes: replaceAt(routes, index, route) };
        }
        case 'team/task': {
            const task = event.data.task;
            const index = state.tasks.findIndex(candidate => candidate.id === task.id);
            const prior = state.tasks[index];
            if (prior === undefined && task.revision !== 1) {
                throw new Error(`team task "${task.id}" must begin at revision 1`);
            }
            if (prior !== undefined && task.revision !== prior.revision + 1) {
                throw new Error(`team task "${task.id}" revision is not contiguous`);
            }
            assertTaskGraphCandidate(state.tasks, task);
            assertTaskWorkEvent(state, prior, task);
            let nextTaskNumber = state.nextTaskNumber;
            const match = numericTaskIdPattern.exec(task.id);
            if (match !== null) {
                const number = Number(match[1]);
                nextTaskNumber = Math.max(nextTaskNumber, number === Number.MAX_SAFE_INTEGER ? number : number + 1);
            }
            return { ...state, tasks: replaceAt(state.tasks, index, task), nextTaskNumber };
        }
        case 'team/task-effect':
            return { ...state, taskEffects: applyTaskEffectEvent(state, event.data) };
        case 'team/adviser-decision': {
            const finding = event.data.finding;
            const adviser = state.members.find(candidate => candidate.id === finding.adviserId);
            const task = state.tasks.find(candidate => candidate.id === finding.taskId);
            if (state.goal?.revision !== finding.goalRevision || state.goal.status !== 'active'
                || memberFunction(state, adviser) !== finding.adviserFunction
                || memberRoleRevision(state, finding.adviserId) !== (finding.adviserRoleRevision ?? 0) || adviser?.phase !== 'active'
                || !['planning_adviser', 'quality_adviser', 'domain_adviser'].includes(finding.adviserFunction)
                || task?.status !== 'in_progress' || task.work?.execution?.id !== finding.executionId
                || task.work.execution.phase !== 'submitted' || task.ownerId === finding.adviserId
                || state.adviserDecisions?.some(candidate => candidate.id === finding.id)) {
                throw new Error('adviser decision does not match a current independent submitted execution');
            }
            return { ...state, adviserDecisions: [...state.adviserDecisions ?? [], finding] };
        }
        case 'team/message/queued': {
            const message = event.data.message;
            if (state.messages.some(candidate => candidate.id === message.id)) {
                throw new Error(`team message "${message.id}" was queued twice`);
            }
            return { ...state, messages: [...state.messages, message] };
        }
        case 'team/message/delivered': {
            const queued = state.messages.find(message => message.id === event.data.messageId);
            if (queued === undefined)
                throw new Error(`team message "${event.data.messageId}" was delivered before queueing`);
            if (queued.targetId !== event.data.targetId)
                throw new Error(`team message "${event.data.messageId}" target changed`);
            if (state.delivered.includes(event.data.messageId))
                throw new Error(`team message "${event.data.messageId}" was delivered twice`);
            return { ...state, delivered: [...state.delivered, event.data.messageId] };
        }
        /* v8 ignore next 2 -- TeamEventType is closed and every member is handled above. */
        default:
            return state;
    }
}
const teamMemberProjectionSchema = z.object({
    ...memberSettingsFields,
    modelRouteRevision: positiveSafeInteger.optional(),
    roleRevision: positiveSafeInteger.optional(),
    id: sessionIdSchema,
    parentId: sessionIdSchema.optional(),
    description: z.string().optional(),
    name: z.string(),
    role: z.enum(['lead', 'teammate']),
    phase: z.enum(['provisioning', 'active', 'failed', 'retired']),
    error: z.string().optional(),
}).strict();
const teamTaskViewSchema = z.object({
    dispatchBlocker: z.enum(['goal', 'dependencies', 'reviewer_missing', 'adviser_review', 'skills', 'manual']).optional(),
    work: taskWorkSchema.optional(),
    autoAssign: z.boolean().optional(),
    requiredSkill: z.string().optional(),
    validity: z.object({ reusable: z.boolean(), reasons: z.array(z.string()) }).strict(),
    recovery: z.object({ reason: z.literal('owner_inactive'), action: z.enum(['resume', 'reconcile', 'review', 'inspect']) }).strict().optional(),
    ...taskEvidenceFields,
    id: teamTaskIdSchema,
    revision: positiveSafeInteger,
    subject: z.string(),
    description: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'deleted']),
    blockedBy: z.array(teamTaskIdSchema),
    writeScopes: z.array(z.string()),
    ownerName: z.string().optional(),
    reviewerName: z.string().optional(),
    ready: z.boolean(),
    writeScopeWarnings: z.array(z.string()),
}).strict();
const teamProjectionSchema = z.object({
    adviserDecisions: z.array(teamAdviserDecisionSchema).optional(),
    completedTaskCount: z.number().int().nonnegative().optional(),
    skillSelections: z.array(teamSkillSelectionViewSchema).optional(),
    ...teamGoalStateFields,
    members: z.array(teamMemberProjectionSchema),
    tasks: z.array(teamTaskViewSchema),
    brief: teamBriefSchema.optional(),
    failure: z.string().optional(),
}).strict();
/** Client views keyed by the member and task collections they were derived from. */
const teamProjectionViews = new WeakMap();
function buildTeamProjection(state) {
    const rootId = brandString(state.id);
    const members = [{ id: rootId, name: 'lead', role: 'lead', phase: 'active' }];
    for (const member of state.members) {
        const teamFunction = memberFunction(state, member);
        const route = state.modelRoutes?.find(candidate => candidate.memberId === member.id);
        members.push({
            id: member.id,
            ...member.parentId === undefined ? {} : { parentId: member.parentId },
            description: member.description,
            name: member.name,
            role: 'teammate',
            ...teamFunction === undefined ? {} : { teamFunction },
            ...memberRoleRevision(state, member.id) === 0 ? {} : { roleRevision: memberRoleRevision(state, member.id) },
            phase: member.phase,
            ...(route?.modelProvider ?? member.modelProvider) === undefined
                ? {} : { modelProvider: route?.modelProvider ?? member.modelProvider },
            ...(route?.model ?? member.model) === undefined ? {} : { model: route?.model ?? member.model },
            ...(route?.reasoningEffort ?? (route === undefined ? member.reasoningEffort : undefined)) === undefined
                ? {} : { reasoningEffort: route?.reasoningEffort ?? member.reasoningEffort },
            ...route === undefined ? {} : { modelRouteRevision: route.revision },
            ...member.persona === undefined ? {} : { persona: member.persona },
            ...member.expert === undefined ? {} : { expert: { ...member.expert } },
            ...member.error === undefined ? {} : { error: member.error },
        });
    }
    return {
        members,
        ...state.adviserDecisions === undefined ? {} : { adviserDecisions: structuredClone(state.adviserDecisions) },
        ...state.skillSelections === undefined ? {} : {
            skillSelections: state.skillSelections.map(value => teamSkillSelectionView(state, value)),
        },
        tasks: state.tasks
            .filter(task => (task.status === 'pending' || task.status === 'in_progress')
            && (task.work === undefined || task.work.plan.goalRevision === (state.goal?.revision ?? 0)))
            .map(task => projectTaskView(state, task)),
        completedTaskCount: state.tasks.filter(task => task.status === 'completed').length,
        ...state.brief === undefined ? {} : { brief: structuredClone(state.brief) },
        ...state.goal === undefined ? {} : { goal: structuredClone(state.goal) },
        ...state.goalProposal === undefined ? {} : { goalProposal: structuredClone(state.goalProposal) },
        ...state.goalDecision === undefined ? {} : { goalDecision: structuredClone(state.goalDecision) },
        ...state.failure === undefined ? {} : { failure: state.failure },
    };
}
/**
 * Durable client view of one Team state. Mailbox-only state changes reuse the
 * previous view reference, so the live drive publishes nothing for them.
 * A failure is terminal: later events retain the failed state reference and
 * do not republish its view.
 * @param state - current Team state.
 * @returns the roster and non-deleted task board, plus any projection failure.
 */
export function teamProjectionView(state) {
    if (state.failure !== undefined)
        return buildTeamProjection(state);
    let byTasks = teamProjectionViews.get(state.members);
    if (byTasks === undefined) {
        byTasks = new WeakMap();
        teamProjectionViews.set(state.members, byTasks);
    }
    let cached = byTasks.get(state.tasks);
    if (cached === undefined || cached.skillSelections !== state.skillSelections || cached.modelRoutes !== state.modelRoutes
        || cached.memberRoles !== state.memberRoles || cached.taskEffects !== state.taskEffects
        || cached.adviserDecisions !== state.adviserDecisions
        || cached.brief !== state.brief || cached.goal !== state.goal
        || cached.goalProposal !== state.goalProposal || cached.goalDecision !== state.goalDecision) {
        cached = { memberRoles: state.memberRoles, brief: state.brief, skillSelections: state.skillSelections,
            modelRoutes: state.modelRoutes, taskEffects: state.taskEffects,
            adviserDecisions: state.adviserDecisions, view: buildTeamProjection(state),
            ...state.goal === undefined ? {} : { goal: state.goal },
            ...state.goalProposal === undefined ? {} : { goalProposal: state.goalProposal },
            ...state.goalDecision === undefined ? {} : { goalDecision: state.goalDecision } };
        byTasks.set(state.tasks, cached);
    }
    return cached.view;
}
/** Team state selected by the projected Session identity, with compact coordination metadata for clients. */
export const teamProjectionDefinition = {
    key: 'agentTeam',
    stateVersion: 19,
    stateSchema: teamProjectionEntrySchema,
    init: header => emptyTeamState(header.id),
    apply: applyProjectionEvent,
    wire: { viewSchema: teamProjectionSchema, view: teamProjectionView },
};
