/** Agent Teams service façade over roster, mailbox, task, and runtime lifecycle owners. */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { CoordinationLocks } from "./coordination.js";
import { provisionPlan } from "./provision-plan.js";
import { resourceConflicts } from "./resource-scheduling.js";
import { teamCoordinationTools, adviserTools, hasNoExternalTaskEffect } from "./tool-capabilities.js";
import { currentMemberToolMenu } from "./member-tool-menu.js";
import { capCurrentAgentToolMenu } from '@dsh-workbench/compat-tools/agent-menu';
import { memberFunction, memberRoleRevision } from "./member-role.js";
import { readProjectPlan } from "./project-plan.js";
import { failureCooldownMs } from "./cooldown.js";
import { readPersistedSession } from "./persisted.js";
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import z from '@deepseek-ai/schemastery';
import { createHash, randomUUID } from 'node:crypto';
import { readTaskReceiptText } from "./task-receipts.js";
import { TeamArtifactStore } from "./artifact-store.js";
import { selectPublicationArtifacts } from "./publication.js";
import { join } from 'node:path';
import { installModelSelection } from '@deepseek-ai/dsh-agent';
import { TeamActivity } from "./activity.js";
import { errorMessage, TeamError } from "./error.js";
import { TeamJournal } from "./journal.js";
import { TeamGoals } from "./goals.js";
import { TeamRuntimeLifecycle } from "./lifecycle.js";
import { TeamMailbox } from "./mailbox.js";
import { teamProjectionDefinition } from "./projection.js";
import { TeamRoster } from "./roster.js";
import { TeamTaskBoard } from "./task-board.js";
import { taskReady } from "./task-view.js";
import { hasAdviserRevisionRequest, hasDualAdviserApproval } from "./advisers.js";
import { TeamSkillSelections } from "./skill-selection.js";
import { TeamWorkspaceRuntime } from "./workspace-runtime.js";
import { executionScopeDenial, memberExecutionScope, withinExecutionPaths } from "./execution-scope.js";
import { positiveLimit, resolveRequestLimits, TeamRequestQueue } from "./request-queue.js";
import { TeamId, TeamMessageId } from "./types.js";
import { requiredText } from "./validation.js";
export { TeamId, TeamMessageId, TeamTaskId } from "./types.js";
export { TeamTaskExecutionId } from "./task-work-types.js";
export { readProjectPlan } from "./project-plan.js";
export { TeamError } from "./error.js";
const DEFAULT_MAX_MEMBERS = 16;
const DEFAULT_MAX_DEPTH = 1;
const DEFAULT_MAX_TASKS = 256;
const DEFAULT_MAX_PENDING_MESSAGES = 64;
const DEFAULT_MAX_MESSAGE_BYTES = 65_536;
const DEFAULT_DISPOSAL_TIMEOUT_MS = 5_000;
/** Agent Teams service backed by the exact live Lead Session log. */
let TeamService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _configureMemberModel_decorators;
    let _configureMemberRole_decorators;
    let _retireMember_decorators;
    let _reactivateMember_decorators;
    let _getWorkspace_decorators;
    let _integrateWorkspace_decorators;
    let _getGoal_decorators;
    let _proposeGoal_decorators;
    let _reviewGoal_decorators;
    let _listMessages_decorators;
    let _listMessagePage_decorators;
    let _getMessage_decorators;
    let _retryMessage_decorators;
    let _adoptMessage_decorators;
    let _listTaskArchive_decorators;
    let _validateTaskReuse_decorators;
    let _readTaskArtifact_decorators;
    return class TeamService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _configureMemberModel_decorators = [Remote('configureMemberModel')];
            _configureMemberRole_decorators = [Remote('configureMemberRole')];
            _retireMember_decorators = [Remote('retireMember')];
            _reactivateMember_decorators = [Remote('reactivateMember')];
            _getWorkspace_decorators = [Remote('getWorkspace')];
            _integrateWorkspace_decorators = [Remote('integrateWorkspace')];
            _getGoal_decorators = [Remote('getGoal')];
            _proposeGoal_decorators = [Remote('proposeGoal')];
            _reviewGoal_decorators = [Remote('reviewGoal')];
            _listMessages_decorators = [Remote('listMessages')];
            _listMessagePage_decorators = [Remote('listMessagePage')];
            _getMessage_decorators = [Remote('getMessage')];
            _retryMessage_decorators = [Remote('retryMessage')];
            _adoptMessage_decorators = [Remote('adoptMessage')];
            _listTaskArchive_decorators = [Remote('listTaskArchive')];
            _validateTaskReuse_decorators = [Remote('validateTaskReuse')];
            _readTaskArtifact_decorators = [Remote('readTaskArtifact')];
            __esDecorate(this, null, _configureMemberModel_decorators, { kind: "method", name: "configureMemberModel", static: false, private: false, access: { has: obj => "configureMemberModel" in obj, get: obj => obj.configureMemberModel }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _configureMemberRole_decorators, { kind: "method", name: "configureMemberRole", static: false, private: false, access: { has: obj => "configureMemberRole" in obj, get: obj => obj.configureMemberRole }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _retireMember_decorators, { kind: "method", name: "retireMember", static: false, private: false, access: { has: obj => "retireMember" in obj, get: obj => obj.retireMember }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _reactivateMember_decorators, { kind: "method", name: "reactivateMember", static: false, private: false, access: { has: obj => "reactivateMember" in obj, get: obj => obj.reactivateMember }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getWorkspace_decorators, { kind: "method", name: "getWorkspace", static: false, private: false, access: { has: obj => "getWorkspace" in obj, get: obj => obj.getWorkspace }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _integrateWorkspace_decorators, { kind: "method", name: "integrateWorkspace", static: false, private: false, access: { has: obj => "integrateWorkspace" in obj, get: obj => obj.integrateWorkspace }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getGoal_decorators, { kind: "method", name: "getGoal", static: false, private: false, access: { has: obj => "getGoal" in obj, get: obj => obj.getGoal }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _proposeGoal_decorators, { kind: "method", name: "proposeGoal", static: false, private: false, access: { has: obj => "proposeGoal" in obj, get: obj => obj.proposeGoal }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _reviewGoal_decorators, { kind: "method", name: "reviewGoal", static: false, private: false, access: { has: obj => "reviewGoal" in obj, get: obj => obj.reviewGoal }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listMessages_decorators, { kind: "method", name: "listMessages", static: false, private: false, access: { has: obj => "listMessages" in obj, get: obj => obj.listMessages }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listMessagePage_decorators, { kind: "method", name: "listMessagePage", static: false, private: false, access: { has: obj => "listMessagePage" in obj, get: obj => obj.listMessagePage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getMessage_decorators, { kind: "method", name: "getMessage", static: false, private: false, access: { has: obj => "getMessage" in obj, get: obj => obj.getMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _retryMessage_decorators, { kind: "method", name: "retryMessage", static: false, private: false, access: { has: obj => "retryMessage" in obj, get: obj => obj.retryMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _adoptMessage_decorators, { kind: "method", name: "adoptMessage", static: false, private: false, access: { has: obj => "adoptMessage" in obj, get: obj => obj.adoptMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listTaskArchive_decorators, { kind: "method", name: "listTaskArchive", static: false, private: false, access: { has: obj => "listTaskArchive" in obj, get: obj => obj.listTaskArchive }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _validateTaskReuse_decorators, { kind: "method", name: "validateTaskReuse", static: false, private: false, access: { has: obj => "validateTaskReuse" in obj, get: obj => obj.validateTaskReuse }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _readTaskArtifact_decorators, { kind: "method", name: "readTaskArtifact", static: false, private: false, access: { has: obj => "readTaskArtifact" in obj, get: obj => obj.readTaskArtifact }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['agents', 'sessions', 'sessionPersistence', 'sessionProjections', 'subagents'];
        coordination = __runInitializers(this, _instanceExtraInitializers);
        selectedMembers = new WeakSet();
        pendingTaskDispatches = new Set();
        taskDispatchRuns = new Map();
        memberToolMenus = new Map();
        continueRuns = new Map();
        static Config = z.object({
            finalDelivery: z.union([z.const('manual'), z.const('notify'), z.const('publish-and-notify')]).default('manual'),
            filterToolsByGoal: z.boolean().default(false),
            resumeIncompleteOnUserContinue: z.boolean().default(false),
            coordinationRoot: z.string().min(1),
            coordinationWaitMs: z.number().step(1).min(1).default(30000),
            coordinationPollMs: z.number().step(1).min(1).default(50),
            autoProvisionPlannedMembers: z.boolean().default(false),
            maxProvisionPerPass: z.number().step(1).min(1).max(32).default(4),
            plannedMemberProvider: z.string().min(1).default('spawn'),
            autoAssignReadyTasks: z.boolean().default(false),
            accountPools: z.array(z.object({ id: z.string().min(1), providers: z.array(z.string().min(1)),
                maxConcurrentRequests: z.number().step(1).min(1) })).default([]),
            rateLimitCooldownMs: z.number().step(1).min(1).max(2_147_483_647).default(60_000),
            quotaCooldownMs: z.number().step(1).min(1).max(2_147_483_647).default(3_600_000),
            maxAutomaticResumes: z.number().step(1).min(1).max(100).default(3),
            enforceWriteScopeExclusivity: z.boolean().default(false),
            autoDispatchReadyTasks: z.boolean().default(false),
            workspaceIsolation: z.union([z.const(false), z.object({
                    storageRoot: z.string().min(1).required(),
                    maxFiles: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).required(),
                    maxBytes: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).required(),
                    maxAutomaticFiles: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(2_000),
                    maxAutomaticBytes: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(67_108_864),
                    omittedDirectories: z.array(z.string().min(1)),
                    readOnlySharedDirectories: z.array(z.string().min(1)),
                    allowedTools: z.array(z.string().min(1)).required(),
                    additionalMcpTools: z.array(z.string().min(1)),
                })]).default(false),
            defaultMemberReasoningEffort: z.union([z.const('inherit'), z.const('highest')]).default('inherit'),
            maxSelectedSkillsPerMember: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(4),
            maxSkillSelectionBytes: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(131_072),
            requireTaskPlans: z.boolean().default(false),
            maxTaskWorkBytes: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(65_536),
            maxTaskReceiptPaths: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(128),
            maxTaskReceiptBytes: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(268_435_456),
            maxTaskArtifactReadBytes: z.number().step(1).min(4_096).max(Number.MAX_SAFE_INTEGER).default(65_536),
            requireConfirmedGoal: z.boolean().default(false),
            requireStructuredPlans: z.boolean().default(false),
            portableEventEnvelope: z.boolean().default(false),
            requireExecutionScope: z.boolean().default(false),
            maxGoalBytes: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(65_536),
            enabledPresets: z.array(z.string()).default(['*']),
            maxMembers: z.number().step(1).min(1).default(DEFAULT_MAX_MEMBERS),
            maxResidentMembers: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(8),
            maxConcurrentRequestsPerTeam: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(8),
            providerConcurrency: z.array(z.object({
                provider: z.string().min(1),
                maxConcurrentRequests: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER),
            })).default([]),
            modelConcurrency: z.array(z.object({
                provider: z.string().min(1),
                model: z.string().min(1),
                maxConcurrentRequests: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER),
            })).default([]),
            maxDepth: z.number().step(1).min(1).default(DEFAULT_MAX_DEPTH),
            deduplicateTaskInputs: z.boolean().default(false),
            requireTaskResults: z.boolean().default(false),
            maxTasks: z.number().step(1).min(1).default(DEFAULT_MAX_TASKS),
            maxPendingMessagesPerMember: z.number().step(1).min(1).default(DEFAULT_MAX_PENDING_MESSAGES),
            maxMessageBytes: z.number().step(1).min(1).default(DEFAULT_MAX_MESSAGE_BYTES),
            mailboxRetryInitialMs: z.number().step(1).min(1).max(2_147_483_647).default(250),
            mailboxRetryMaxMs: z.number().step(1).min(1).max(2_147_483_647).default(30_000),
            mailboxRetryMaxAttempts: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(8),
            disposalTimeoutMs: z.number().step(1).min(1).default(DEFAULT_DISPOSAL_TIMEOUT_MS),
        });
        /** Validated deployment limits used by every Team operation. */
        config;
        workspaces;
        artifacts;
        activity;
        lifecycle;
        journal;
        roster;
        mailbox;
        tasks;
        requests;
        goals;
        skillSelections;
        constructor(ctx, config = {}) {
            if (ctx.get('agentTeams') !== undefined)
                throw new TeamError('Another Team engine already owns agentTeams; disable it before enabling this runtime', 'TEAM_ENGINE_CONFLICT');
            super(ctx, 'agentTeams');
            this.config = {
                finalDelivery: config.finalDelivery ?? 'manual',
                filterToolsByGoal: config.filterToolsByGoal ?? false,
                resumeIncompleteOnUserContinue: config.resumeIncompleteOnUserContinue ?? false,
                ...config.workspaceIsolation === undefined ? {} : { workspaceIsolation: structuredClone(config.workspaceIsolation) },
                ...config.coordinationRoot === undefined ? {} : { coordinationRoot: config.coordinationRoot },
                coordinationWaitMs: positiveLimit('coordinationWaitMs', config.coordinationWaitMs ?? 30000),
                coordinationPollMs: positiveLimit('coordinationPollMs', config.coordinationPollMs ?? 50),
                autoProvisionPlannedMembers: config.autoProvisionPlannedMembers ?? false,
                maxProvisionPerPass: positiveLimit('maxProvisionPerPass', config.maxProvisionPerPass ?? 4),
                plannedMemberProvider: config.plannedMemberProvider ?? 'spawn',
                defaultMemberReasoningEffort: config.defaultMemberReasoningEffort ?? 'inherit',
                autoDispatchReadyTasks: config.autoDispatchReadyTasks ?? false,
                autoAssignReadyTasks: config.autoAssignReadyTasks ?? false,
                accountPools: structuredClone(config.accountPools ?? []),
                rateLimitCooldownMs: config.rateLimitCooldownMs ?? 60_000,
                quotaCooldownMs: config.quotaCooldownMs ?? 3_600_000,
                maxAutomaticResumes: config.maxAutomaticResumes ?? 3,
                enforceWriteScopeExclusivity: config.enforceWriteScopeExclusivity ?? false,
                maxSelectedSkillsPerMember: positiveLimit('maxSelectedSkillsPerMember', config.maxSelectedSkillsPerMember ?? 4),
                maxSkillSelectionBytes: positiveLimit('maxSkillSelectionBytes', config.maxSkillSelectionBytes ?? 131_072),
                requireTaskPlans: config.requireTaskPlans ?? false,
                maxTaskWorkBytes: positiveLimit('maxTaskWorkBytes', config.maxTaskWorkBytes ?? 65_536),
                maxTaskReceiptPaths: positiveLimit('maxTaskReceiptPaths', config.maxTaskReceiptPaths ?? 128),
                maxTaskReceiptBytes: positiveLimit('maxTaskReceiptBytes', config.maxTaskReceiptBytes ?? 268_435_456),
                maxTaskArtifactReadBytes: positiveLimit('maxTaskArtifactReadBytes', config.maxTaskArtifactReadBytes ?? 65_536),
                requireConfirmedGoal: config.requireConfirmedGoal ?? false,
                requireStructuredPlans: config.requireStructuredPlans ?? false,
                portableEventEnvelope: config.portableEventEnvelope ?? false,
                requireExecutionScope: config.requireExecutionScope ?? false,
                maxGoalBytes: positiveLimit('maxGoalBytes', config.maxGoalBytes ?? 65_536),
                enabledPresets: [...(config.enabledPresets ?? ['*'])],
                maxMembers: positiveLimit('maxMembers', config.maxMembers ?? DEFAULT_MAX_MEMBERS),
                maxResidentMembers: positiveLimit('maxResidentMembers', config.maxResidentMembers ?? 8),
                ...resolveRequestLimits(config),
                maxDepth: positiveLimit('maxDepth', config.maxDepth ?? DEFAULT_MAX_DEPTH),
                deduplicateTaskInputs: config.deduplicateTaskInputs ?? false,
                requireTaskResults: config.requireTaskResults ?? false,
                maxTasks: positiveLimit('maxTasks', config.maxTasks ?? DEFAULT_MAX_TASKS),
                maxPendingMessagesPerMember: positiveLimit('maxPendingMessagesPerMember', config.maxPendingMessagesPerMember ?? DEFAULT_MAX_PENDING_MESSAGES),
                maxMessageBytes: positiveLimit('maxMessageBytes', config.maxMessageBytes ?? DEFAULT_MAX_MESSAGE_BYTES),
                mailboxRetryInitialMs: positiveLimit('mailboxRetryInitialMs', config.mailboxRetryInitialMs ?? 250),
                mailboxRetryMaxMs: positiveLimit('mailboxRetryMaxMs', config.mailboxRetryMaxMs ?? 30_000),
                mailboxRetryMaxAttempts: positiveLimit('mailboxRetryMaxAttempts', config.mailboxRetryMaxAttempts ?? 8),
                disposalTimeoutMs: positiveLimit('disposalTimeoutMs', config.disposalTimeoutMs ?? DEFAULT_DISPOSAL_TIMEOUT_MS),
            };
            if (this.config.mailboxRetryMaxMs > 2_147_483_647 || this.config.mailboxRetryInitialMs > 2_147_483_647) {
                throw new TeamError('mailbox retry delays must not exceed 2147483647 milliseconds', 'TEAM_INVALID_ARGUMENT');
            }
            if (this.config.mailboxRetryMaxMs < this.config.mailboxRetryInitialMs) {
                throw new TeamError('mailboxRetryMaxMs must be at least mailboxRetryInitialMs', 'TEAM_INVALID_ARGUMENT');
            }
            this.activity = new TeamActivity();
            this.lifecycle = new TeamRuntimeLifecycle(this.config.disposalTimeoutMs);
            this.requests = new TeamRequestQueue(this.config, { rateMs: this.config.rateLimitCooldownMs, quotaMs: this.config.quotaCooldownMs }, this.config.accountPools);
            this.coordination = this.config.coordinationRoot === undefined ? undefined
                : new CoordinationLocks(this.config.coordinationRoot, this.config.coordinationWaitMs, this.config.coordinationPollMs);
            this.journal = new TeamJournal(ctx, (root, type) => {
                this.activity.notify(TeamId(root.id));
                if (type === 'team/task' || type === 'team/member' || type === 'team/goal-decided'
                    || type === 'team/adviser-decision' || type === 'team/skills-selected'
                    || type === 'team/message/delivered' || type === 'team/member-role' || type === 'team/member-retirement' || type === 'team/member-model-route') {
                    this.scheduleTaskDispatch(root);
                }
            }, this.config.portableEventEnvelope, this.coordination === undefined ? undefined : async (rootId) => {
                this.lifecycle.signal.throwIfAborted();
                await this.coordination.own('team:' + rootId, this.lifecycle.signal);
            });
            this.workspaces = this.config.workspaceIsolation === undefined || this.config.workspaceIsolation === false ? undefined
                : new TeamWorkspaceRuntime(ctx, { ...this.config.workspaceIsolation,
                    coordinationRoot: this.config.coordinationRoot ?? join(this.config.workspaceIsolation.storageRoot, '.coordination'),
                    coordinationWaitMs: this.config.coordinationWaitMs, coordinationPollMs: this.config.coordinationPollMs });
            this.artifacts = this.config.workspaceIsolation === undefined || this.config.workspaceIsolation === false ? undefined
                : new TeamArtifactStore(join(this.config.workspaceIsolation.storageRoot, 'artifacts'));
            this.roster = new TeamRoster(ctx, this.journal, this.lifecycle, this.config.maxMembers, this.config.maxDepth, this.config.enabledPresets, (caller, memberId, choices, signal) => this.skillSelections.prepare(caller, memberId, choices, signal), (caller, sourceId, memberId) => this.skillSelections.copyForSuccessor(caller, sourceId, memberId), this.workspaces, this.config.defaultMemberReasoningEffort, (caller, request) => this.resolveSpawnPlan(caller, request));
            this.goals = new TeamGoals(ctx, this.journal, this.roster, this.lifecycle, this.config.maxGoalBytes, this.config.requireConfirmedGoal, this.config.requireExecutionScope, this.config.requireStructuredPlans, { members: this.config.maxMembers, requests: this.config.maxConcurrentRequestsPerTeam,
                tasks: this.config.maxTasks, skills: this.config.maxSelectedSkillsPerMember, skillBytes: this.config.maxSkillSelectionBytes,
                depth: this.config.maxDepth, automatic: this.config.autoProvisionPlannedMembers, provider: this.config.plannedMemberProvider });
            this.skillSelections = new TeamSkillSelections(ctx, this.journal, this.roster, this.goals, this.config.maxSelectedSkillsPerMember, this.config.maxSkillSelectionBytes);
            this.mailbox = new TeamMailbox(ctx, this.journal, this.roster, this.lifecycle, this.config.maxPendingMessagesPerMember, this.config.maxMessageBytes, this.goals, this.config.mailboxRetryInitialMs, this.config.mailboxRetryMaxMs, this.config.mailboxRetryMaxAttempts);
            this.tasks = new TeamTaskBoard(this.journal, this.roster, this.goals, this.config.maxTasks, this.config.deduplicateTaskInputs, this.config.requireTaskResults, this.config.requireTaskPlans, this.config.maxTaskWorkBytes, this.config.maxTaskReceiptPaths, this.config.maxTaskReceiptBytes, this.config.autoDispatchReadyTasks, this.config.enforceWriteScopeExclusivity, this.config.autoAssignReadyTasks, this.artifacts);
            ctx.on('subagent/activation-capacity', (parent, childId, next) => {
                const configured = next();
                const membership = this.roster.tryMembership(parent);
                if (membership === undefined)
                    return configured;
                if (this.roster.isRetiredOrRetiring(membership.root, childId)) {
                    throw new TeamError('reactivate this retired Team member before starting work', 'TEAM_MEMBER_RETIRED');
                }
                const member = this.journal.state(membership.root).members.find(candidate => candidate.id === childId);
                return member !== undefined && member.phase !== 'failed' && (member.parentId ?? membership.root.id) === parent.id
                    ? this.config.maxResidentMembers : configured;
            });
            ctx.inject(['llm'], (modelCtx) => {
                const validateProviders = () => {
                    this.requests.validateProviders(modelCtx.llm.listProviders().map(provider => provider.id));
                };
                modelCtx.on('llm/stream', (options, next) => {
                    const agent = options.sessionId === undefined ? undefined : ctx.agents.get(options.sessionId);
                    const retired = agent === undefined ? undefined : this.roster.retirementDenial(agent);
                    if (retired !== undefined)
                        throw new TeamError(retired, 'TEAM_MEMBER_RETIRED');
                    const membership = agent === undefined ? undefined : this.roster.governingMembership(agent);
                    if (membership === undefined)
                        return next();
                    validateProviders();
                    const roster = this.roster;
                    const requestSignal = membership.root === agent ? options.signal ?? this.lifecycle.signal
                        : this.goals.admit(membership.root, options.signal ?? this.lifecycle.signal);
                    const dispatch = async function* () {
                        if (agent !== undefined) {
                            await roster.waitForIntegration(agent, requestSignal);
                            const denial = roster.retirementDenial(agent);
                            if (denial !== undefined)
                                throw new TeamError(denial, 'TEAM_MEMBER_RETIRED');
                        }
                        requestSignal.throwIfAborted();
                        yield* next();
                    };
                    return this.requests.stream(membership.id, { ...options, signal: requestSignal }, dispatch, readProjectPlan(this.journal.state(membership.root).goal?.definition.plan)?.resources.maxConcurrentRequests);
                });
            });
            const stepGoalRevisions = new WeakMap();
            ctx.on('agent/pre-step', async (payload, next) => {
                await this.roster.waitForIntegration(payload.agent, payload.signal);
                if (this.roster.retirementDenial(payload.agent) !== undefined)
                    return { kind: 'reject' };
                const decision = await next();
                const membership = this.roster.governingMembership(payload.agent);
                if (membership !== undefined) {
                    const state = this.journal.state(membership.root);
                    stepGoalRevisions.set(payload.agent, state.goal?.revision ?? 0);
                }
                return membership !== undefined && membership.root !== payload.agent && this.goals.denial(membership.root) !== undefined
                    ? { kind: 'reject' } : decision;
            });
            ctx.on('agent/disposed', ({ agent }) => { this.memberToolMenus.get(agent)?.(); this.memberToolMenus.delete(agent); });
            ctx.effect(() => () => { for (const release of this.memberToolMenus.values())
                release(); this.memberToolMenus.clear(); }, 'team.toolMenus');
            ctx.inject(['tools'], (toolsCtx) => {
                toolsCtx.on('agent/pre-step', async (payload, next) => {
                    const decision = await next();
                    if (!this.config.filterToolsByGoal)
                        return decision;
                    const membership = this.roster.governingMembership(payload.agent);
                    if (membership === undefined)
                        return decision;
                    this.memberToolMenus.get(payload.agent)?.();
                    this.memberToolMenus.delete(payload.agent);
                    const names = currentMemberToolMenu(this.journal.state(membership.root), payload.agent.id, toolsCtx.tools.schemas(payload.agent).map(tool => tool.name));
                    if (names !== undefined)
                        this.memberToolMenus.set(payload.agent, capCurrentAgentToolMenu(toolsCtx.tools, payload.agent.id, names));
                    return decision;
                });
                const control = new Set(['team_goal', 'team_help', 'team_context', 'ask_user_question']);
                const guardedRoot = (agent, name) => {
                    const membership = agent === undefined ? undefined : this.roster.governingMembership(agent);
                    if (membership === undefined || (membership.root === agent && control.has(name)))
                        return undefined;
                    return membership.root;
                };
                toolsCtx.tools.guard((exec) => {
                    const retired = exec.agent === undefined ? undefined : this.roster.retirementDenial(exec.agent);
                    if (retired !== undefined)
                        return retired;
                    const membership = exec.agent === undefined ? undefined : this.roster.tryMembership(exec.agent);
                    if (membership !== undefined && exec.agent !== undefined) {
                        const state = this.journal.state(membership.root);
                        if (readProjectPlan(state.goal?.definition.plan)?.version === 2 && !teamCoordinationTools.has(exec.name)) {
                            const actor = state.members.find(member => member.id === exec.agent?.id);
                            const adviser = memberFunction(state, actor)?.endsWith('_adviser') === true;
                            const executing = state.tasks.some(task => task.work?.plan.goalRevision === state.goal?.revision
                                && task.ownerId === exec.agent?.id && task.work?.execution?.phase === 'running');
                            const verifying = state.tasks.some(task => task.work?.plan.goalRevision === state.goal?.revision
                                && task.reviewerId === exec.agent?.id && task.work?.execution?.phase === 'submitted');
                            if (membership.role === 'lead' && !hasNoExternalTaskEffect(exec.name, exec.arguments)) {
                                return 'The communicator delegates execution in a version-2 plan; assign a task and publish reviewed artifacts through team_workspace.';
                            }
                            if (membership.role === 'teammate' && !adviser && !executing && !verifying) {
                                return 'No current task execution is assigned to this member; inspect the task board and wait for an assignment. Submitted work must not be modified.';
                            }
                        }
                    }
                    if (membership?.role === 'teammate') {
                        const state = this.journal.state(membership.root);
                        const role = memberFunction(state, state.members.find(member => member.id === exec.agent?.id));
                        if (role?.endsWith('_adviser') && !adviserTools.has(exec.name)) {
                            return 'Advisers decide and review evidence only. Delegate implementation or verification to an executor/verifier; this role cannot run commands, edit files, claim tasks, or change members.';
                        }
                        if (role?.endsWith('_adviser') && exec.name === 'team_workspace'
                            && typeof exec.arguments === 'object' && exec.arguments !== null && 'action' in exec.arguments
                            && !['get', 'read_artifact', 'read_input'].includes(String(exec.arguments.action))) {
                            return 'Advisers can inspect submitted artifacts but cannot publish or prepare execution workspaces.';
                        }
                    }
                    const root = guardedRoot(exec.agent, exec.name);
                    if (root === undefined)
                        return undefined;
                    const goal = this.journal.state(root).goal;
                    const observed = exec.agent === undefined ? undefined : stepGoalRevisions.get(exec.agent);
                    if (observed !== undefined && observed !== (goal?.revision ?? 0))
                        return 'The confirmed Team goal changed after this model step; prepare a new step before executing its tools.';
                    return exec.agent === root && goal === undefined && !['subagent', 'workflow'].includes(exec.name)
                        ? undefined : this.goals.denial(root);
                });
                toolsCtx.on('tools/execute', async (exec, next) => {
                    let dispatch = next;
                    if (exec.agent !== undefined) {
                        await this.roster.waitForIntegration(exec.agent, exec.signal);
                        const retired = this.roster.retirementDenial(exec.agent);
                        if (retired !== undefined)
                            throw new TeamError(retired, 'TEAM_MEMBER_RETIRED');
                    }
                    const root = guardedRoot(exec.agent, exec.name);
                    if (root !== undefined) {
                        const goal = this.journal.state(root).goal;
                        const observed = exec.agent === undefined ? undefined : stepGoalRevisions.get(exec.agent);
                        if (observed !== undefined && observed !== (goal?.revision ?? 0))
                            throw new TeamError('Team goal changed before tool dispatch', 'TEAM_GOAL_CHANGED');
                        exec.signal = exec.agent === root && goal === undefined
                            ? this.goals.capture(root, exec.signal) : this.goals.admit(root, exec.signal);
                        if (goal !== undefined && exec.agent !== undefined) {
                            const scope = goal.definition.scope.execution;
                            const sharedCwd = root.session.header.cwd;
                            const privateCwd = exec.agent === root ? undefined : exec.agent.session.header.cwd;
                            const effective = scope !== undefined && sharedCwd !== undefined && privateCwd !== undefined
                                ? memberExecutionScope(scope, sharedCwd, privateCwd) : scope;
                            const denial = await executionScopeDenial(effective, exec, this.config.requireExecutionScope, exec.name === 'web_fetch' && (toolsCtx.get('web')?.fetchPreservesOrigin() ?? false));
                            if (denial !== undefined)
                                throw new TeamError(denial, 'TEAM_EXECUTION_SCOPE_DENIED');
                            exec.signal.throwIfAborted();
                            const resources = goal.definition.scope.execution;
                            if (exec.name === 'web_fetch' && resources !== undefined && !resources.allowUnrestrictedExecution
                                && !resources.webOrigins.includes('*')) {
                                const args = exec.arguments;
                                const web = toolsCtx.get('web');
                                if (web === undefined || args === null || typeof args !== 'object' || !('url' in args) || typeof args.url !== 'string') {
                                    throw new TeamError('scoped fetch is unavailable', 'TEAM_EXECUTION_SCOPE_DENIED');
                                }
                                const origin = new URL(args.url).origin;
                                dispatch = () => web.withFetchOrigin(origin, next);
                            }
                        }
                    }
                    const token = exec.agent === undefined ? undefined
                        : await this.tasks.recordToolEffect(exec.agent, exec.callId, exec.name, exec.signal, exec.arguments);
                    try {
                        exec.signal.throwIfAborted();
                        return await dispatch();
                    }
                    finally {
                        if (token !== undefined)
                            await this.tasks.settleToolEffect(token);
                    }
                });
            });
            ctx.on('session/event', (session, event) => {
                this.mailbox.observeSessionEvent(session, event);
                const actor = ctx.agents.get(session.id);
                const membership = actor === undefined ? undefined : this.roster.tryMembership(actor);
                const userInputs = event.type === 'user/message' ? [event.data]
                    : event.type === 'agent/inbox/spliced' && event.data.outcome !== 'canceled' ? event.data.inserted : [];
                if (this.config.resumeIncompleteOnUserContinue && membership?.role === 'lead' && membership.root === actor
                    && userInputs.some(input => input.source.kind === 'user')) {
                    const root = membership.root;
                    for (const input of userInputs.filter(input => input.source.kind === 'user'))
                        queueMicrotask(() => {
                            if (this.lifecycle.disposed)
                                return;
                            const operation = () => this.resumeIncompleteTasks(root, input.id ?? `event:${event.seq}`);
                            const run = (this.continueRuns.get(root.id) ?? Promise.resolve()).then(operation, operation);
                            this.continueRuns.set(root.id, run);
                            void run.catch((error) => {
                                if (!this.lifecycle.disposed)
                                    this.ctx.logger.warn(`Team continuation failed: ${errorMessage(error)}`);
                            }).finally(() => { if (this.continueRuns.get(root.id) === run)
                                this.continueRuns.delete(root.id); });
                        });
                }
                if (membership?.role === 'teammate' && event.type === 'turn/end' && event.data.reason.kind === 'error') {
                    void this.scheduleCooldown(membership.root, session.id, event).catch((error) => {
                        if (!this.lifecycle.disposed)
                            ctx.logger.warn(`Team cooldown scheduling failed: ${errorMessage(error)}`);
                    });
                }
            });
            ctx.on('subagent/activation-released', (info) => { this.mailbox.capacityReleased(info.childId); });
            ctx.on('agent/created', ({ agent }) => {
                this.installMemberModelSelection(agent);
                this.scheduleRecovery(agent);
            });
            ctx.on('agent/status', ({ agent }) => {
                const membership = this.roster.tryMembership(agent);
                if (membership !== undefined) {
                    this.activity.notify(membership.id);
                    this.scheduleTaskDispatch(membership.root);
                }
            });
            ctx.effect(() => {
                const disposeProjection = ctx.root.sessionProjections.register(teamProjectionDefinition);
                return async () => {
                    try {
                        await this.disposeRuntime();
                    }
                    finally {
                        disposeProjection();
                    }
                };
            }, 'agentTeams.runtimeLifecycle()');
            for (const agent of ctx.agents.list()) {
                this.installMemberModelSelection(agent);
                this.scheduleRecovery(agent);
            }
        }
        /** Install a route selector whose value follows the Lead's durable member revision. */
        installMemberModelSelection(agent) {
            if (this.selectedMembers.has(agent) || this.roster.tryMembership(agent)?.role !== 'teammate')
                return;
            this.selectedMembers.add(agent);
            const roster = this.roster;
            const selection = {
                get current() { return roster.modelRouteFor(agent); },
                assembled: undefined,
            };
            agent.ctx.effect(() => installModelSelection(agent.ctx, selection), 'agentTeams.memberModelSelection');
            agent.ctx.effect(() => agent.ctx.systemPrompt.section({
                name: 'team:member-instructions', order: agent.ctx.systemPrompt.getSectionOrder('TEAM_POLICY') + 3,
                text: () => {
                    const member = this.listMembers(agent).find(candidate => candidate.id === agent.id);
                    const root = this.roster.membership(agent).root;
                    const goal = this.journal.state(root).goal;
                    const instructions = goal?.status === 'active' ? readProjectPlan(goal.definition.plan)?.members
                        .find(candidate => candidate.name === member?.name)?.instructions : undefined;
                    return [member?.persona, instructions].filter(value => value !== undefined).join('\n\n');
                },
            }), 'agentTeams.memberInstructions');
        }
        /**
         * Resolve one exact live Agent's Team role.
         * @param agent - exact live Agent used as the authority credential.
         * @returns its root, Team identity, role, and model-facing name.
         */
        membership(agent) {
            return this.roster.membership(agent);
        }
        /** Validated selection limits for tool admission before resolving instruction files. */
        get skillSelectionLimits() {
            return { maxSkills: this.config.maxSelectedSkillsPerMember, maxBytes: this.config.maxSkillSelectionBytes };
        }
        /**
         * Read one member's saved skill names, purposes, versions, and goal applicability.
         * @param caller - Exact live Team member.
         * @param member - Durable target name; omitted means the caller.
         * @returns Compact metadata without loading instruction bodies.
         */
        getSkills(caller, member) {
            return this.skillSelections.read(caller, member);
        }
        /**
         * Read an exact instruction version saved for the caller.
         * @param caller - Exact live Team member.
         * @param name - Selected module name.
         * @returns Detached selected content or undefined when not selected; stale goals and corrupt content throw.
         */
        getSkillContent(caller, name) {
            return this.skillSelections.content(caller, name);
        }
        /**
         * Replace the skill choice for a member, its direct child, or any member when called by the Lead.
         * @param caller - Exact live selecting Agent.
         * @param request - Target, current selection revision, and resolved instruction snapshots.
         * @param signal - Cancellation before append; accepted goal changes and runtime disposal also cancel queued writes.
         * @returns Committed selection metadata.
         */
        async selectSkills(caller, request, signal) {
            return await this.skillSelections.select(caller, request, signal);
        }
        /**
         * List the runtime-enriched roster visible to one Team member.
         * @param agent - exact live Team member.
         * @returns Lead and teammate rows in creation order.
         */
        listMembers(agent) {
            return this.roster.list(this.roster.membership(agent));
        }
        /**
         * Change an existing teammate's model for its next request while retaining its Session.
         * @param agent - Exact live Team Lead or the target's direct parent.
         * @param request - Configured provider, model, and optional supported effort.
         * @param signal - Cancellation before the durable route is committed.
         * @returns updated member row.
         */
        async configureMemberModel(agent, request, signal) {
            const membership = this.roster.membership(agent);
            const updated = await this.roster.configureModel(agent, request, this.goals.capture(membership.root, signal));
            await this.mailbox.recoverFor(membership.root, this.lifecycle.signal);
            return updated;
        }
        /**
         * Configure an inactive retained member's responsibility without replacing its Session.
         * @param agent - Exact Lead or direct parent.
         * @param request - Responsibility and expected role revision from listMembers.
         * @param signal - Cancellation before the role is committed.
         * @returns updated member row.
         */
        async configureMemberRole(agent, request, signal) {
            const membership = this.roster.membership(agent);
            return await this.roster.configureRole(agent, request, this.goals.capture(membership.root, signal));
        }
        /**
         * Read bounded current-goal recovery diagnostics without waking members or mutating their work.
         * @param caller - Exact Team member reading the shared board.
         * @param limit - Maximum tasks in this page, between one and fifty.
         * @param after - Exclusive task cursor from the previous page.
         * @returns current goal, aggregate role and skill gaps, and paged task recovery pointers.
         */
        recoverySummary(caller, limit, after) {
            if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
                throw new TeamError('recovery limit must be 1 through 50', 'TEAM_INVALID_ARGUMENT');
            const membership = this.roster.membership(caller);
            const state = this.journal.state(membership.root);
            const tasks = state.tasks.filter(task => task.status === 'pending' || task.status === 'in_progress')
                .map(task => this.tasks.get(membership, task.id));
            const issues = tasks.filter(task => task.dispatchBlocker !== undefined || task.recovery !== undefined
                || task.work?.execution?.phase === 'submitted');
            const cursor = after === undefined ? -1 : issues.findIndex(task => task.id === after);
            if (after !== undefined && cursor === -1)
                throw new TeamError('recovery state changed; read the first page again', 'TEAM_TASK_STALE_REVISION');
            const page = issues.slice(cursor + 1, cursor + 1 + limit);
            const next = issues.length > cursor + 1 + limit ? page.at(-1)?.id : undefined;
            return { goalRevision: state.goal?.revision ?? 0, activeGoal: state.goal?.status === 'active',
                membersWithoutRole: state.members.filter(member => member.phase === 'active' && memberFunction(state, member) === undefined).length,
                staleSkillSelections: (state.skillSelections ?? [])
                    .filter(selection => selection.goalRevision !== (state.goal?.revision ?? 0)).length,
                totalIssues: issues.length, issues: page.map(task => ({ taskId: task.id, revision: task.revision,
                    ...task.work === undefined ? {} : { goalRevision: task.work.plan.goalRevision },
                    ...task.work?.execution === undefined ? {} : { phase: task.work.execution.phase },
                    ...task.ownerName === undefined ? {} : { ownerName: task.ownerName },
                    ...task.reviewerName === undefined ? {} : { reviewerName: task.reviewerName },
                    nextStep: task.dispatchBlocker === 'goal' ? '核对旧目标与现目标差异，保留原成果；不能把旧提交直接验收给新目标。'
                        : task.dispatchBlocker === 'adviser_review' ? '正式规划与质量军师分别审核当前提交，用 team_adviser_review 记录证据。'
                            : task.work?.execution?.phase === 'submitted' ? task.reviewerName === undefined
                                ? '队长用 configure_review 指定独立复核员；保留原执行与提交证据。'
                                : `由 ${task.reviewerName} 检查当前执行后 review；先核对任务板与邮箱，避免重复唤醒。`
                                : '先用 team_task_get 核对依赖、技能与副作用记录，再按当前状态恢复；不要重复已验收工作。',
                    ...task.dispatchBlocker === undefined ? {} : { blocker: task.dispatchBlocker },
                    ...task.work?.execution === undefined ? {} : { executionId: task.work.execution.id },
                    ...task.recovery === undefined ? {} : { recovery: task.recovery } })),
                submitted: {
                    currentGoal: tasks.filter(task => task.work?.execution?.phase === 'submitted'
                        && task.work.plan.goalRevision === (state.goal?.revision ?? 0)).length,
                    historicalGoal: tasks.filter(task => task.work?.execution?.phase === 'submitted'
                        && task.work.plan.goalRevision !== (state.goal?.revision ?? 0)).length,
                },
                advisers: state.members.flatMap((member) => {
                    const teamFunction = memberFunction(state, member);
                    return member.phase === 'active' && teamFunction !== undefined && teamFunction.endsWith('_adviser')
                        ? [{ name: member.name, teamFunction }] : [];
                }),
                ...next === undefined ? {} : { nextCursor: next },
            };
        }
        /**
         * Retire an inactive direct child or any inactive member when called by its Lead.
         * @param agent - Exact live parent or Team Lead.
         * @param target - Durable member name whose history and identity remain retained.
         * @param signal - Cancellation before the lifecycle change commits.
         * @returns the retired member's current row.
         */
        async retireMember(agent, target, signal) {
            return await this.roster.retire(agent, target, this.goals.capture(this.roster.membership(agent).root, signal));
        }
        /**
         * Return a retired member to the active roster without submitting another prompt.
         * @param agent - Exact live parent or Team Lead.
         * @param target - Retained member name to reuse.
         * @param signal - Cancellation before the lifecycle change commits.
         * @returns the active member's current row; sending a message starts its next work.
         */
        async reactivateMember(agent, target, signal) {
            return await this.roster.reactivate(agent, target, this.goals.admit(this.roster.membership(agent).root, signal));
        }
        /**
         * Inspect a member's private working copy without reading project contents.
         * @param agent - Exact live Team member.
         * @param target - Durable member name.
         * @returns its saved isolation details, or null for a shared-workspace member.
         */
        getWorkspace(agent, target) {
            const membership = this.roster.membership(agent);
            const member = this.journal.state(membership.root).members.find(candidate => candidate.name === target);
            if (member === undefined)
                throw new TeamError('Team member not found', 'TEAM_MEMBER_NOT_FOUND');
            return member.workspace === undefined ? null : structuredClone(member.workspace);
        }
        /**
         * Check input paths and automatic-copy limits before reserving a member identity.
         * @param caller - Exact live Lead or delegating Team member.
         * @param workingPaths - Existing paths below the Lead project; omitted uses confirmed resources.
         * @param signal - Cancellation while checking metadata; goal changes also cancel this operation.
         * @returns selected inputs and copy limits; this does not create, copy, or publish files.
         */
        async prepareWorkspace(caller, workingPaths, signal) {
            const membership = this.roster.membership(caller);
            const admitted = this.goals.admit(membership.root, signal);
            admitted.throwIfAborted();
            const goal = this.journal.state(membership.root).goal;
            if (this.workspaces === undefined || this.config.workspaceIsolation === false || this.config.workspaceIsolation === undefined) {
                return { isolation: false, goalRevision: goal?.revision ?? 0, workingPaths: [], note: 'Private workspace isolation is disabled; working_paths cannot isolate shared writes.' };
            }
            const paths = await this.workspaces.validateSelection(membership.root, goal?.definition.scope.execution, workingPaths, admitted);
            admitted.throwIfAborted();
            const limits = this.config.workspaceIsolation;
            return { isolation: true, goalRevision: goal?.revision ?? 0, workingPaths: paths,
                limits: { maxFiles: limits.maxFiles, maxBytes: limits.maxBytes,
                    ...limits.maxAutomaticFiles === undefined ? {} : { maxAutomaticFiles: limits.maxAutomaticFiles },
                    ...limits.maxAutomaticBytes === undefined ? {} : { maxAutomaticBytes: limits.maxAutomaticBytes } },
                note: 'Inputs must already exist. Empty workingPaths here means automatic selection from confirmed resources. Future deliverables belong in task write scopes and confirmed write paths. Creation rechecks files and scope; this is not a reservation or an execution grant.' };
        }
        /**
         * Publish an inactive member's changes after checking the captured shared-file versions.
         * @param agent - Exact live Team Lead owning integration.
         * @param target - Durable member name whose work is ready to integrate.
         * @param signal - Cancellation before and during file publication.
         * @returns the paths recorded by the resumable integration receipt.
         */
        async integrateWorkspace(agent, target, signal) {
            const membership = this.roster.membership(agent);
            if (membership.role !== 'lead')
                throw new TeamError('only the Team Lead integrates member workspaces', 'TEAM_LEAD_REQUIRED');
            const runtime = this.workspaces;
            if (runtime === undefined)
                throw new TeamError('member workspace isolation is disabled', 'TEAM_INVALID_ARGUMENT');
            const admitted = this.goals.admit(membership.root, signal);
            const prepare = await this.journal.transact(membership.root.id, () => {
                admitted.throwIfAborted();
                const current = this.roster.membership(agent);
                if (current.root !== membership.root || current.role !== 'lead')
                    throw new TeamError('Team Lead changed before integration', 'TEAM_NOT_MEMBER');
                const member = this.journal.state(current.root).members.find(candidate => candidate.name === target);
                const view = this.roster.list(current).find(candidate => candidate.id === member?.id);
                if (member?.workspace === undefined || member.phase !== 'active')
                    throw new TeamError('member has no active private workspace', 'TEAM_MEMBER_NOT_FOUND');
                if (view?.status !== 'inactive')
                    throw new TeamError('wait until the member is inactive before integrating files', 'TEAM_INVALID_ARGUMENT');
                const state = this.journal.state(current.root);
                const accepted = state.tasks.filter(task => task.status === 'completed'
                    && task.work?.plan.goalRevision === (state.goal?.revision ?? 0)
                    && task.work.execution?.ownerId === member.id && task.work.execution.phase === 'accepted'
                    && task.work.execution.review?.reviewerId !== member.id);
                for (const task of accepted)
                    for (const artifact of task.work?.execution?.submission?.artifacts ?? []) {
                        if (!task.writeScopes.some(scope => artifact.path === scope || artifact.path.startsWith(`${scope}/`))) {
                            throw new TeamError(`accepted artifact is outside task ${task.id} write scopes: ${artifact.path}`, 'TEAM_EXECUTION_SCOPE_DENIED');
                        }
                    }
                const artifacts = selectPublicationArtifacts(state.tasks.map(task => ({ id: task.id, dependencies: task.blockedBy,
                    artifacts: accepted.includes(task) ? task.work?.execution?.submission?.artifacts ?? [] : [] })));
                if (artifacts.length === 0)
                    throw new TeamError('No independently accepted artifacts for this member and current goal. Submit artifact_paths, obtain independent review, then integrate; scratch files and implicit deletions are never published.', 'TEAM_TASK_EVIDENCE_REQUIRED');
                return Promise.resolve({ memberId: member.id, artifacts,
                    tasks: accepted.map(task => [task.id, task.revision]), rules: state.goal?.definition.scope.execution });
            });
            return this.roster.integrateWorkspace(membership.root, prepare.memberId, admitted, async (path) => {
                admitted.throwIfAborted();
                const state = this.journal.state(membership.root);
                if (prepare.tasks.some(([id, revision]) => !state.tasks.some(task => task.id === id
                    && task.revision === revision && task.status === 'completed'))) {
                    throw new TeamError('accepted task changed during publication', 'TEAM_TASK_EXECUTION_STALE');
                }
                const rules = prepare.rules;
                if (rules === undefined) {
                    if (this.config.requireExecutionScope)
                        throw new TeamError('integration requires explicit file execution scope', 'TEAM_EXECUTION_SCOPE_DENIED');
                    return;
                }
                const cwd = membership.root.session.header.cwd;
                if (cwd === undefined || !await withinExecutionPaths(rules.writePaths, cwd, path)) {
                    throw new TeamError(`integration path is outside the confirmed execution scope: ${path}`, 'TEAM_EXECUTION_SCOPE_DENIED');
                }
            }, prepare.artifacts);
        }
        /**
         * Refresh explicit inputs of an inactive retained teammate without replacing its identity.
         * @param caller - Exact Team Lead.
         * @param target - Member name from listMembers.
         * @param paths - Existing project-relative input files.
         * @param signal - Goal and caller cancellation.
         * @returns refreshed input paths.
         */
        async refreshWorkspace(caller, target, paths, signal) {
            const membership = this.roster.membership(caller);
            if (membership.role !== 'lead')
                throw new TeamError('only the Lead refreshes member inputs', 'TEAM_LEAD_REQUIRED');
            const state = this.journal.state(membership.root);
            const admitted = this.goals.admit(membership.root, signal);
            const member = state.members.find(candidate => candidate.name === target && candidate.phase === 'active');
            if (member === undefined || this.workspaces === undefined)
                throw new TeamError('active isolated member not found', 'TEAM_MEMBER_NOT_FOUND');
            await this.workspaces.validateSelection(membership.root, state.goal?.definition.scope.execution, paths, admitted);
            return this.roster.refreshWorkspace(membership.root, member.id, paths, admitted);
        }
        /**
         * Create one named, continuable child of the calling Team member.
         * @param caller - exact live Team member.
         * @param request - name, responsibility, prompt, composition, model settings, and cancellation.
         * @returns the active roster row.
         */
        resolveSpawnPlan(caller, request) {
            const root = this.roster.membership(caller).root;
            const state = this.journal.state(root);
            const plan = readProjectPlan(state.goal?.definition.plan);
            if (this.config.requireStructuredPlans && plan !== undefined) {
                const member = plan.members.find(candidate => candidate.name === request.name);
                if (member === undefined)
                    throw new TeamError('member is absent from the confirmed project roster; review a roster change before creating it', 'TEAM_INVALID_ARGUMENT');
                const parent = caller === root ? 'lead' : state.members.find(candidate => candidate.id === caller.id)?.name;
                if (member.parent !== parent || request.agentOptions?.provider !== member.modelProvider
                    || request.agentOptions.model !== member.model || request.teamFunction !== member.function
                    || request.agentOptions.reasoningEffort !== undefined && request.agentOptions.reasoningEffort !== member.reasoningEffort
                    || JSON.stringify([...(request.skills?.map(skill => skill.name) ?? [])].sort()) !== JSON.stringify([...member.skills].sort())) {
                    throw new TeamError('member parent, model route and function must match the user-confirmed project plan', 'TEAM_INVALID_ARGUMENT');
                }
                if (state.members.filter(candidate => candidate.phase !== 'failed' && candidate.phase !== 'retired').length >= plan.resources.maxMembers) {
                    throw new TeamError('confirmed member budget reached; reuse an idle member or review an expanded plan', 'TEAM_MEMBER_LIMIT');
                }
                if (member.persona !== undefined) {
                    if (request.persona !== undefined && request.persona !== member.persona)
                        throw new TeamError('member persona differs from the confirmed version-2 plan', 'TEAM_INVALID_ARGUMENT');
                    request = { ...request, persona: member.persona };
                }
                if (request.workingPaths === undefined) {
                    const produced = plan.tasks.flatMap(task => task.outputs);
                    const inputs = [...new Set(plan.tasks.filter(task => task.owner === request.name).flatMap(task => task.inputs))]
                        .filter(path => !produced.some(output => path === output || path.startsWith(`${output}/`)));
                    request = { ...request, ...inputs.length === 0 ? { workspaceMode: 'empty' } : { workingPaths: inputs } };
                }
            }
            return request.teamFunction?.endsWith('_adviser') ? { ...request, workspaceMode: 'empty' } : request;
        }
        /**
         * Create one continuable member after confirmed scope and roster admission.
         * @param caller - Exact Lead or delegating member.
         * @param request - Named member, role, model, skills, prompt and cancellation.
         * @returns retained member identity and current activity.
         */
        async spawnTeammate(caller, request) {
            const signal = this.goals.admit(this.roster.membership(caller).root, request.signal);
            return await this.roster.spawn(caller, { ...request, signal });
        }
        /**
         * Reuse one expert's existing Team member or provision it once for concurrent callers.
         * @param caller - Exact live Team member.
         * @param request - Expert reference and creation settings used only when absent.
         * @returns the bound member; reuse never submits another prompt.
         */
        async ensureExpertMember(caller, request) {
            const signal = this.goals.admit(this.roster.membership(caller).root, request.signal);
            return await this.roster.ensureExpert(caller, { ...request, signal });
        }
        /**
         * Read the confirmed goal separately from Lead-authored notes.
         * @param agent - Exact live Team member.
         * @returns detached proposal, decision, and current goal records.
         */
        getGoal(agent) {
            return this.goals.read(agent);
        }
        /**
         * Describe deployment controls without exposing model connections, skills or user content.
         * @param agent - Exact live Team member reading the policy.
         * @returns current provisioning limits and the protection actually provided.
         */
        runtimePolicy(agent) {
            this.roster.membership(agent);
            return { automaticProvisioning: this.config.autoProvisionPlannedMembers, maxProvisionPerPass: this.config.maxProvisionPerPass,
                finalDelivery: this.config.finalDelivery,
                maxDepth: this.config.maxDepth, crossProcessCoordination: this.coordination !== undefined,
                fileProtection: this.workspaces === undefined ? 'shared-workspace' : 'private-workspaces-and-cooperative-publication', strictExternalConfinement: false };
        }
        /**
         * Propose a complete objective or withdrawal without changing execution authority.
         * @param agent - Exact live Lead.
         * @param request - Current revisions and the proposed change.
         * @param signal - Cancellation before the write.
         * @returns the pending proposal shown in the native user review.
         */
        async proposeGoal(agent, request, signal) {
            return await this.goals.propose(agent, request, signal);
        }
        /**
         * Ask the user to accept or revise the current persisted proposal.
         * @param agent - Exact live Lead; descendants relay their questions to it.
         * @param proposalRevision - Exact proposal being reviewed.
         * @param signal - Cancellation while awaiting the human answer.
         * @returns committed goal review state; stale answers cannot apply.
         */
        async reviewGoal(agent, proposalRevision, signal) {
            return this.goals.review(agent, proposalRevision, signal);
        }
        /**
         * Queue one durable peer message, then attempt immediate delivery.
         * @param caller - exact live sending Team member.
         * @param request - target name, content, and pre-queue cancellation.
         * @returns durable message identity and immediate-delivery observation.
         */
        async sendMessage(caller, request) {
            return await this.mailbox.send(caller, request);
        }
        /**
         * Read delivery state without copying message bodies into the caller's context.
         * @param agent - Exact live member of this Team.
         * @returns ordered mailbox summaries, including quarantined history.
         */
        listMessages(agent) {
            return this.mailbox.list(agent);
        }
        /**
         * Read a bounded newest-first mailbox page.
         * @param agent - Exact live member of this Team.
         * @param offset - Number of newer records to skip.
         * @param limit - Page length from one through fifty.
         * @returns delivery summaries and the total available count.
         */
        listMessagePage(agent, offset, limit) {
            return this.mailbox.listPage(agent, offset, limit);
        }
        /**
         * Read one message for inspection before recovery or historical adoption.
         * @param agent - Exact live member of this Team.
         * @param messageId - Durable message identity.
         * @returns a detached saved message including its full content.
         */
        getMessage(agent, messageId) {
            return this.mailbox.get(agent, messageId);
        }
        /**
         * Retry delivery of a message belonging to the current confirmed goal.
         * @param agent - Exact live member authorized to recover this message.
         * @param messageId - Durable message identity.
         * @param signal - Cancellation while admitting or attempting delivery.
         * @returns its immediate delivery observation.
         */
        async retryMessage(agent, messageId, signal) {
            return await this.mailbox.retry(agent, messageId, signal);
        }
        /**
         * Requeue a historical message after the Lead explicitly adopts its contents.
         * @param agent - Exact live Team Lead.
         * @param messageId - Historical source message, retained unchanged.
         * @param signal - Cancellation before the new queued record is admitted.
         * @returns the new message's identity and immediate delivery observation.
         */
        async adoptMessage(agent, messageId, signal) {
            return await this.mailbox.adopt(agent, messageId, signal);
        }
        /**
         * Create one unowned pending task in the Team Lead log.
         * @param caller - exact live Team member creating the task.
         * @param request - task text, blockers, and advisory write scopes.
         * @param signal - optional caller cancellation before append; goal changes and runtime disposal always cancel queued writes.
         * @returns the revision-one task view.
         */
        async createTask(caller, request, signal = this.lifecycle.signal) {
            return await this.tasks.create(caller, request, signal);
        }
        /**
         * Return one task, including a deleted tombstone.
         * @param caller - exact live Team member reading the task.
         * @param id - Team-local task identity.
         * @returns the latest task value and derived readiness diagnostics.
         */
        getTask(caller, id) {
            return this.tasks.get(this.roster.membership(caller), id);
        }
        /**
         * List pending and in-progress tasks in numeric creation order.
         * @param caller - exact live Team member reading the board.
         * @returns detached current task views.
         */
        listTasks(caller) {
            return this.tasks.list(this.roster.membership(caller));
        }
        /**
         * Record one independently evidenced adviser finding on a submitted execution.
         * @param caller - Exact live adviser member.
         * @param request - Submitted execution, conclusion, and directly checked evidence.
         * @param signal - Cancellation before the durable decision is committed.
         * @returns the saved finding.
         */
        async recordAdviserDecision(caller, request, signal) {
            const membership = this.roster.membership(caller);
            const root = membership.root;
            const admitted = this.goals.admit(root, signal);
            return await this.journal.transact(root.id, async () => {
                admitted.throwIfAborted();
                if (this.roster.membership(caller).root !== root)
                    throw new TeamError('adviser is no longer in this Team', 'TEAM_NOT_MEMBER');
                const state = this.journal.state(root);
                const adviser = state.members.find(candidate => candidate.id === caller.id && candidate.phase === 'active');
                const adviserFunction = memberFunction(state, adviser);
                if (adviserFunction !== 'planning_adviser' && adviserFunction !== 'quality_adviser'
                    && adviserFunction !== 'domain_adviser') {
                    throw new TeamError('only a designated Team adviser can record an adviser decision', 'TEAM_ADVISER_REQUIRED');
                }
                const task = state.tasks.find(candidate => candidate.id === request.taskId);
                if (state.goal?.status !== 'active' || task?.status !== 'in_progress'
                    || task.work?.execution?.id !== request.executionId || task.work.execution.phase !== 'submitted'
                    || task.ownerId === caller.id || task.work.plan.goalRevision !== state.goal.revision) {
                    throw new TeamError('adviser decision requires the current independently submitted execution', 'TEAM_TASK_EXECUTION_STALE');
                }
                const evidence = request.evidence.map(value => requiredText(value, 'evidence', 4_096));
                if (evidence.length === 0)
                    throw new TeamError('adviser decision requires checked evidence', 'TEAM_TASK_EVIDENCE_REQUIRED');
                const finding = {
                    id: `team-adviser-${randomUUID()}`, goalRevision: state.goal.revision,
                    taskId: request.taskId, executionId: request.executionId, adviserId: caller.id,
                    adviserRoleRevision: memberRoleRevision(state, caller.id), adviserFunction, decision: request.decision,
                    summary: requiredText(request.summary, 'summary', 8_192), evidence,
                };
                await this.journal.appendAndFlush(root, 'team/adviser-decision', {
                    version: 2, teamId: TeamId(root.id), finding,
                });
                return finding;
            });
        }
        /**
         * Reuse reviewed skill content under the current confirmed goal without upgrading its version.
         * @param caller - Exact Lead or direct parent.
         * @param member - Retained member name.
         * @param expectedRevision - Saved skill selection version.
         * @param signal - Cancellation before publication.
         * @returns metadata for the rebound selection.
         */
        async rebindSkills(caller, member, expectedRevision, signal) {
            return await this.skillSelections.rebind(caller, member, expectedRevision, signal);
        }
        /**
         * Current decisions for one exact execution, in saved order.
         * @param caller - Team member reading the findings.
         * @param taskId - Current task whose execution supplies the decision identity.
         * @returns detached findings for the current goal and execution.
         */
        listAdviserDecisions(caller, taskId) {
            const { root } = this.roster.membership(caller);
            const state = this.journal.state(root);
            const task = state.tasks.find(candidate => candidate.id === taskId);
            const executionId = task?.work?.execution?.id;
            return executionId === undefined ? [] : (state.adviserDecisions ?? [])
                .filter(value => value.taskId === taskId && value.executionId === executionId
                && value.goalRevision === state.goal?.revision).map(value => structuredClone(value));
        }
        /**
         * Read a bounded page of completed tasks without consuming the active task quota.
         * @param agent - Exact live Team member.
         * @param request - Exclusive archive cursor and requested page length.
         * @returns retained task views and the next cursor when more completions exist.
         */
        listTaskArchive(agent, request) {
            return this.tasks.listArchive(this.roster.membership(agent), request);
        }
        /**
         * Recheck observed files and environment before reusing a retained task result.
         * @param agent - Exact live Team member requesting verification.
         * @param id - Retained Team task identity.
         * @param signal - Cancellation while inspecting files.
         * @returns the current reuse decision and concrete observations.
         */
        async validateTaskReuse(agent, id, signal) {
            return await this.tasks.validateReuse(agent, id, signal);
        }
        /**
         * Check a trusted scheduler's explicit prerequisite set before publishing and preparing downstream inputs.
         * @param agent - Exact live Team member.
         * @param ids - Accepted prerequisites or the final delivery task.
         * @param signal - Cancellation while inspecting versions and files.
         * @returns checked receipts; expected accepted updates do not invalidate the handoff.
         */
        async validateTaskHandoff(agent, ids, signal) {
            return await this.tasks.validateHandoff(agent, ids, signal);
        }
        /**
         * Inspect a submitted artifact without exposing another member's private directory.
         * @param agent - Exact live Team member requesting evidence.
         * @param request - Task, execution, receipt path, and optional continuation offset.
         * @param signal - Cancellation during version checks and bounded reads.
         * @returns verified text and the next byte offset when more remains.
         */
        async readTaskArtifact(agent, request, signal) {
            return await this.readTaskFile(agent, request, 'artifact', signal);
        }
        /**
         * Read a task's recorded input without depending on the reviewer's private working set.
         * @param agent - Exact Team member inspecting the current execution.
         * @param request - Task, execution, recorded input path and continuation offset.
         * @param signal - Cancellation during receipt verification and reading.
         * @returns verified UTF-8 input text and the next page offset.
         */
        async readTaskInput(agent, request, signal) {
            return await this.readTaskFile(agent, request, 'input', signal);
        }
        async readTaskFile(agent, request, source, signal) {
            const root = this.roster.membership(agent).root;
            const admitted = this.goals.admit(root, signal);
            const state = this.journal.state(root);
            const task = state.tasks.find(candidate => candidate.id === request.taskId);
            if (task === undefined)
                throw new TeamError(`team task "${request.taskId}" not found`, 'TEAM_TASK_NOT_FOUND');
            const execution = task.work?.execution;
            const phases = source === 'input' ? ['running', 'submitted', 'accepted', 'rejected'] : ['submitted', 'accepted', 'rejected'];
            if (execution?.id !== request.executionId || !phases.includes(execution.phase)
                || task.work?.plan.goalRevision !== (state.goal?.revision ?? 0)) {
                throw new TeamError('read_artifact requires the current submitted execution from team_task_get', 'TEAM_TASK_EXECUTION_STALE');
            }
            const receipt = (source === 'input' ? task.work?.plan.inputs : execution.submission?.artifacts)?.find(candidate => candidate.path === request.path);
            const environment = source === 'input' ? task.work?.plan.environment : execution.submission?.environment;
            if (receipt === undefined || environment === undefined) {
                throw new TeamError(`read_${source} requires a ${source} path recorded in the current task version`, 'TEAM_INVALID_ARGUMENT');
            }
            const scope = state.goal?.definition.scope.execution;
            const sharedCwd = root.session.header.cwd;
            if (scope !== undefined && (sharedCwd === undefined || !await withinExecutionPaths(scope.readPaths, sharedCwd, receipt.path))) {
                throw new TeamError('artifact is outside the confirmed project read scope', 'TEAM_EXECUTION_SCOPE_DENIED');
            }
            const byteOffset = request.byteOffset ?? 0;
            let content = await (this.artifacts === undefined ? readTaskReceiptText(environment, receipt, byteOffset, this.config.maxTaskArtifactReadBytes, this.config.maxTaskReceiptBytes, admitted)
                : this.artifacts.read(environment, receipt, byteOffset, this.config.maxTaskArtifactReadBytes, this.config.maxTaskReceiptBytes, admitted));
            const response = () => {
                const nextByteOffset = byteOffset + Buffer.byteLength(content);
                return { taskId: request.taskId, executionId: request.executionId, path: receipt.path, sha256: receipt.sha256,
                    totalBytes: receipt.bytes, byteOffset, content, ...nextByteOffset < receipt.bytes ? { nextByteOffset } : {} };
            };
            while (Buffer.byteLength(JSON.stringify(response())) > this.config.maxTaskArtifactReadBytes) {
                const characters = Array.from(content);
                if (characters.length === 0)
                    throw new TeamError('artifact read response metadata exceeds its configured byte limit', 'TEAM_TASK_WORK_TOO_LARGE');
                content = characters.slice(0, Math.floor(characters.length / 2)).join('');
            }
            if (content.length === 0 && byteOffset < receipt.bytes) {
                throw new TeamError('artifact read byte limit cannot retain one text character', 'TEAM_TASK_WORK_TOO_LARGE');
            }
            const current = this.journal.state(root).tasks.find(candidate => candidate.id === task.id);
            admitted.throwIfAborted();
            if (current?.revision !== task.revision || current.work?.execution?.id !== request.executionId) {
                throw new TeamError('task changed during artifact read; get its current execution', 'TEAM_TASK_EXECUTION_STALE');
            }
            return response();
        }
        /**
         * Read the shared brief without changing task or Agent state.
         * @param caller - exact live Team member.
         * @returns detached brief, or null before the Lead records one.
         */
        getBrief(caller) {
            const { root } = this.roster.membership(caller);
            const state = this.journal.state(root);
            const brief = state.brief;
            if (brief === undefined)
                return null;
            const active = state.goal?.status !== 'revoked' && brief.goalRevision === (state.goal?.revision ?? 0);
            return active ? { ...structuredClone(brief), active } : {
                revision: brief.revision, active,
                ...brief.goalRevision === undefined ? {} : { goalRevision: brief.goalRevision },
            };
        }
        /**
         * Record the user's objective, existing authorization, and shared decisions.
         * This text supplies context and never changes runtime permission policy.
         * @param caller - exact live Team Lead.
         * @param request - observed revision and fields to replace.
         * @param signal - optional caller cancellation before append; goal changes and runtime disposal always cancel queued writes.
         * @returns the committed next brief revision.
         */
        async updateBrief(caller, request, signal = this.lifecycle.signal) {
            const membership = this.roster.membership(caller);
            if (membership.role !== 'lead')
                throw new TeamError('only the Team Lead can edit the shared brief', 'TEAM_LEAD_REQUIRED');
            const { root } = membership;
            const admitted = this.goals.capture(root, signal);
            admitted.throwIfAborted();
            return this.journal.transact(root.id, async () => {
                admitted.throwIfAborted();
                const current = this.roster.membership(caller);
                if (current.root !== root || current.role !== 'lead')
                    throw new TeamError('the calling Agent changed Teams while its write was queued', 'TEAM_NOT_MEMBER');
                const state = this.journal.state(root);
                const previous = state.brief;
                if (request.expectedRevision !== (previous?.revision ?? 0)) {
                    throw new TeamError('shared brief revision changed; read it before updating', 'TEAM_BRIEF_STALE_REVISION');
                }
                const goalRevision = state.goal?.revision ?? 0;
                const currentBrief = previous?.goalRevision === goalRevision ? previous : undefined;
                const brief = {
                    revision: (previous?.revision ?? 0) + 1,
                    goalRevision,
                    objective: requiredText(request.objective ?? currentBrief?.objective ?? '', 'objective', 16_384),
                    authorization: request.authorization === undefined ? currentBrief?.authorization ?? '' : request.authorization.trim(),
                    decisions: request.decisions === undefined ? currentBrief?.decisions ?? '' : request.decisions.trim(),
                };
                if (brief.authorization.length > 16_384 || brief.decisions.length > 16_384) {
                    throw new TeamError('shared brief fields must not exceed 16384 characters', 'TEAM_INVALID_ARGUMENT');
                }
                await this.journal.appendAndFlush(root, 'team/brief', { version: 2, teamId: TeamId(root.id), brief });
                return structuredClone(brief);
            });
        }
        /**
         * Compare-and-set one authorized task transition.
         * @param caller - exact live Team member authorizing the mutation.
         * @param request - task identity, expected revision, action, and action fields.
         * @param signal - optional caller cancellation before append; goal changes and runtime disposal always cancel queued writes.
         * @returns the committed next task revision.
         */
        async updateTask(caller, request, signal = this.lifecycle.signal) {
            return await this.tasks.update(caller, request, signal);
        }
        /**
         * Wait for the next Team-domain or member-status change.
         * @param caller - exact live Team member waiting for activity.
         * @param timeoutMs - bounded wait duration from ten seconds through one hour.
         * @param signal - caller cancellation for the wait only.
         * @returns one observed change or a timeout result.
         */
        async waitForChange(caller, timeoutMs, signal) {
            const membership = this.roster.membership(caller);
            if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10_000 || timeoutMs > 3_600_000) {
                throw new TeamError('timeoutMs must be an integer from 10000 through 3600000', 'TEAM_INVALID_TIMEOUT');
            }
            signal.throwIfAborted();
            const noProgress = this.waitReadiness(caller);
            // Host callers may await human edits even while every Agent is inactive.
            if (noProgress !== undefined && noProgress.reason !== 'no-active-peer')
                return { timedOut: false, noProgress };
            return await this.activity.wait(membership.id, caller.id, timeoutMs, signal);
        }
        /**
         * Diagnose whether another Team member can advance a model-owned wait.
         * @param caller - Exact live member considering a wait.
         * @returns a concrete no-progress reason, or undefined when a peer is runnable.
         */
        waitReadiness(caller) {
            const membership = this.roster.membership(caller);
            const active = this.roster.list(membership).filter(member => member.id !== caller.id
                && (member.status === 'running' || member.status === 'provisioning'));
            if (active.some(member => !this.activity.isWaiting(membership.id, member.id)))
                return undefined;
            if (this.mailbox.hasScheduledRetry(membership.root))
                return undefined;
            if (this.mailbox.hasCapacityWait(membership.root))
                return {
                    reason: 'resident-capacity-blocked',
                    message: 'Team delivery is waiting for resident capacity and no peer can advance it. Inspect team_mailbox and list_agents; finish or interrupt unneeded work before retrying.',
                };
            if (active.length > 0)
                return {
                    reason: 'all-peers-waiting',
                    message: 'Every active peer is also waiting. Reconcile the task dependencies and assign runnable work before waiting again.',
                };
            return {
                reason: 'no-active-peer',
                message: 'No other Team member is running or provisioning. wait_agent cannot make progress or wake inactive teammates. Re-list with list_agents and team_task_list, then use send_message to wake each required inactive teammate before waiting again.',
            };
        }
        /**
         * Interrupt one live teammate turn without clearing its pending inbox.
         * @param caller - exact live Lead Agent.
         * @param targetName - durable teammate name.
         * @returns the target status sampled before cancellation.
         */
        interrupt(caller, targetName) {
            return this.roster.interrupt(caller, targetName);
        }
        /**
         * Resolve a caller without throwing, used by scoped-tool installation and observers.
         * @param agent - candidate exact live Agent.
         * @returns Team membership, or undefined for non-Team subagents and stale identities.
         */
        tryMembership(agent) {
            return this.roster.tryMembership(agent);
        }
        /** Queue one contained recovery pass after publication has unwound. */
        scheduleRecovery(agent) {
            queueMicrotask(() => {
                if (this.lifecycle.disposed)
                    return;
                void this.recoverFor(agent).catch((error) => {
                    if (this.lifecycle.disposed)
                        return;
                    this.ctx.logger.warn(`Agent Teams recovery for "${agent.id}" failed: ${errorMessage(error)}`);
                });
            });
        }
        /** Reconcile roster provisioning before retrying that member's pending mailbox. */
        async recoverFor(agent) {
            await this.roster.recoverFor(agent, this.lifecycle.signal);
            await this.mailbox.recoverFor(agent, this.lifecycle.signal);
            if (this.roster.tryMembership(agent)?.root === agent) {
                const state = this.journal.state(agent);
                const targets = new Set(state.tasks.filter(task => task.status === 'in_progress'
                    && task.work?.plan.goalRevision === state.goal?.revision).flatMap(task => [task.ownerId, task.reviewerId, ...task.work?.plan.adviserGate === 'dual'
                        ? state.members.filter(member => memberFunction(state, member)?.endsWith('_adviser')).map(member => member.id) : []]));
                for (const owner of targets) {
                    if (owner === undefined || owner === agent.id || this.ctx.agents.get(owner) !== undefined)
                        continue;
                    const stored = await readPersistedSession(this.ctx.sessionPersistence, owner, this.lifecycle.signal);
                    const last = stored.events.findLast(event => event.type === 'turn/end');
                    const route = stored.events.findLast(event => event.type === 'request/header');
                    if (last !== undefined)
                        await this.scheduleCooldown(agent, owner, last, route?.data.header.config.provider);
                }
                this.scheduleTaskDispatch(agent);
            }
        }
        async scheduleCooldown(root, memberId, event, recordedProvider) {
            if (this.lifecycle.disposed || event.type !== 'turn/end' || event.data.reason.kind !== 'error')
                return;
            const delay = failureCooldownMs(event.data.reason.error, this.config.rateLimitCooldownMs, this.config.quotaCooldownMs);
            if (delay === undefined)
                return;
            const state = this.journal.state(root);
            if (state.goal?.status !== 'active')
                return;
            const member = state.members.find(candidate => candidate.id === memberId && candidate.phase === 'active');
            const provider = recordedProvider ?? this.ctx.agents.get(memberId)?.session.requestHeader()?.config.provider
                ?? state.modelRoutes?.find(route => route.memberId === memberId)?.modelProvider ?? member?.modelProvider;
            if (provider !== undefined)
                this.requests.pause(provider, event.time + delay);
            const task = state.tasks.find(candidate => candidate.status === 'in_progress'
                && candidate.work !== undefined && candidate.work.plan.goalRevision === state.goal?.revision
                && (candidate.ownerId === memberId && candidate.work.execution?.phase === 'running'
                    || candidate.work.execution?.phase === 'submitted' && (candidate.reviewerId === memberId
                        || candidate.work.plan.adviserGate === 'dual' && memberFunction(state, member)?.endsWith('_adviser')
                            && !state.adviserDecisions?.some(decision => decision.adviserId === memberId
                                && decision.taskId === candidate.id && decision.executionId === candidate.work?.execution?.id))));
            const execution = task?.work?.execution;
            if (member === undefined || task === undefined || execution === undefined)
                return;
            const kind = execution.phase === 'running' ? 'execute' : task.reviewerId === memberId ? 'review' : 'advice';
            const prior = state.messages.filter(message => message.targetId === memberId && message.id.startsWith('team-message-cooldown-')
                && message.taskDispatch?.executionId === execution.id && message.taskDispatch.taskId === task.id);
            const id = TeamMessageId(`team-message-cooldown-${createHash('sha256').update(JSON.stringify([root.id, memberId, task.id, execution.id, event.seq])).digest('hex')}`);
            if (prior.some(message => message.id === id) || prior.length >= this.config.maxAutomaticResumes)
                return;
            await this.mailbox.sendTask(root, { target: member.name, signal: this.lifecycle.signal,
                ...provider === undefined ? {} : { cooldownProvider: provider },
                notBefore: event.time + delay, content: [{ type: 'text', text: `模型服务冷却结束后续接 ${task.id}，保留执行 ${execution.id}、原模型和记忆。先读取当前目标、team_task_get 和已完成检查点；不新建执行、不重跑已完成工具操作。存在未核实外部副作用时先请独立成员核对；权限、服务内容限制与技术失败分别报告，不能改写用户授权。` }],
            }, id, task.id, execution.id, kind, kind === 'advice' ? memberRoleRevision(state, memberId) : undefined);
        }
        /** Resume delivered but unfinished work only after a new user turn, preserving its exact execution. */
        async resumeIncompleteTasks(root, userKey) {
            const state = this.journal.state(root);
            if (state.goal?.status !== 'active' || readProjectPlan(state.goal.definition.plan)?.version !== 2)
                return;
            for (const task of state.tasks) {
                const work = task.work;
                const execution = work?.execution;
                if (work === undefined || work.plan.goalRevision !== state.goal.revision || execution === undefined
                    || !['running', 'submitted'].includes(execution.phase))
                    continue;
                const targets = execution.phase === 'running' ? [execution.ownerId] : [task.reviewerId,
                    ...work.plan.adviserGate === 'dual' ? state.members.filter(member => memberFunction(state, member)?.endsWith('_adviser') && !state.adviserDecisions?.some(decision => decision.adviserId === member.id && decision.taskId === task.id && decision.executionId === execution.id
                        && decision.adviserRoleRevision === memberRoleRevision(state, member.id))).map(member => member.id) : []];
                for (const targetId of targets) {
                    const current = this.journal.state(root);
                    const member = current.members.find(candidate => candidate.id === targetId && candidate.phase === 'active');
                    if (member === undefined || member.id === root.id || this.roster.list(this.roster.membership(root))
                        .find(candidate => candidate.id === member.id)?.status !== 'inactive')
                        continue;
                    if (current.messages.some(message => message.targetId === member.id && message.goalRevision === state.goal?.revision
                        && !current.delivered.includes(message.id)))
                        continue;
                    const previous = current.messages.filter(message => message.targetId === member.id
                        && message.id.startsWith('team-message-continue-') && message.taskDispatch?.taskId === task.id
                        && message.taskDispatch.executionId === execution.id);
                    if (previous.length >= this.config.maxAutomaticResumes)
                        continue;
                    const kind = execution.phase === 'running' ? 'execute' : member.id === task.reviewerId ? 'review' : 'advice';
                    if (kind === 'review' && work.plan.adviserGate === 'dual' && !hasDualAdviserApproval(current, task) && !hasAdviserRevisionRequest(current, task))
                        continue;
                    const id = TeamMessageId('team-message-continue-' + createHash('sha256').update(JSON.stringify([
                        root.id, member.id, state.goal.revision, task.id, execution.id, userKey
                    ])).digest('hex'));
                    await this.mailbox.sendTask(root, { target: member.name, signal: this.lifecycle.signal, content: [{ type: 'text', text: `用户已继续当前会话。续接任务 ${task.id}，保留执行 ${execution.id}、身份、模型、技能及已有文件；不是新一轮尝试。先读取 team_task_get 和现有检查点，禁止重跑已完成操作。输入可用 team_workspace read_input 按回执核对；存在未知外部影响时先由独立复核人核对并 reconcile。服务限制、技术阻碍和授权分别报告；不要改写用途或用户授权。仅完成尚未完成的${kind === 'execute' ? '执行与提交' : kind === 'review' ? '独立复核' : '军师决定'}。` }] }, id, task.id, execution.id, kind, kind === 'advice' ? memberRoleRevision(current, member.id) : undefined);
                }
            }
        }
        /** Schedule one coalesced pass after the committing transaction releases the Lead log. */
        scheduleTaskDispatch(root) {
            if ((!this.config.autoDispatchReadyTasks && !this.config.autoAssignReadyTasks)
                || this.lifecycle.disposed || this.ctx.agents.get(root.id) !== root)
                return;
            this.pendingTaskDispatches.add(root.id);
            if (this.taskDispatchRuns.has(root.id))
                return;
            queueMicrotask(() => {
                if (this.lifecycle.disposed || this.taskDispatchRuns.has(root.id) || !this.pendingTaskDispatches.has(root.id))
                    return;
                const run = this.dispatchReadyTasks(root).catch(async (error) => {
                    if (this.lifecycle.disposed || error instanceof TeamError && error.code === 'TEAM_GOAL_CHANGED')
                        return;
                    const detail = errorMessage(error).slice(0, 2000);
                    this.ctx.logger.warn(`Team task dispatch for "${root.id}" failed: ${detail}`);
                    const state = this.journal.state(root);
                    const marker = `dispatch-failure:${createHash('sha256').update(JSON.stringify([state.goal?.revision, detail])).digest('hex')}`;
                    const noticeId = TeamMessageId('team-message-' + marker.replace(':', '-'));
                    if (state.messages.some(message => message.id === noticeId))
                        return;
                    try {
                        await this.mailbox.sendNotice(root, noticeId, [{ type: 'text', text: `${marker}\n团队自动派工未完成。保留原成员、任务和产物；先用 team_goal read、team_context diagnostics、team_mailbox 检查目标及阻碍，不要新建重复队伍或改用普通 subagent。修复提供方、技能或路径配置后继续原任务。错误：${detail}` }], this.lifecycle.signal);
                    }
                    catch (notificationError) {
                        if (!this.lifecycle.disposed)
                            this.ctx.logger.warn(`Team dispatch diagnostic could not be delivered: ${errorMessage(notificationError)}`);
                    }
                }).finally(() => {
                    this.taskDispatchRuns.delete(root.id);
                    if (this.pendingTaskDispatches.has(root.id))
                        this.scheduleTaskDispatch(root);
                });
                this.taskDispatchRuns.set(root.id, run);
            });
        }
        /** Deliver each current assigned execution once through the durable mailbox. */
        async dispatchReadyTasks(root) {
            while (this.pendingTaskDispatches.delete(root.id)) {
                if (this.lifecycle.disposed || this.goals.denial(root) !== undefined)
                    return;
                if (this.config.autoProvisionPlannedMembers)
                    await provisionPlan(this, root, {
                        subagents: this.ctx.subagents, provider: this.config.plannedMemberProvider, maxNew: this.config.maxProvisionPerPass,
                        signal: this.goals.capture(root, this.lifecycle.signal),
                        state: () => this.journal.state(root),
                    });
                await this.applyProjectRoster(root);
                if (this.config.autoAssignReadyTasks)
                    await this.assignReadyTasks(root);
                if (!this.config.autoDispatchReadyTasks)
                    continue;
                const state = this.journal.state(root);
                if (state.goal === undefined)
                    return;
                for (const task of state.tasks) {
                    const execution = task.work?.execution;
                    if (task.autoDispatch === true && task.status === 'pending' && execution?.phase === 'rejected'
                        && task.work?.plan.goalRevision === state.goal.revision) {
                        const noticeId = TeamMessageId(`team-message-task-rejected-${createHash('sha256').update(JSON.stringify([root.id, task.id, execution.id])).digest('hex')}`);
                        if (!state.messages.some(message => message.id === noticeId)) {
                            await this.mailbox.sendNotice(root, noticeId, [{ type: 'text', text: `任务 ${task.id}（${task.subject}）的执行 ${execution.id} 已被独立复核退回。先用 team_task_get 和 team_adviser_review(action=list) 核对修订理由与旧工具影响；需要时请原复核人 reconcile。可修订时由队长用 team_task_update(action=reassign, owner=原成员名称) 明确开始下一次执行，保留原成员与成果；不能取消验收要求、伪造军师批准或重跑已完成任务。真实分歧向用户说明，只暂停受影响路线。` }], this.lifecycle.signal);
                        }
                        continue;
                    }
                    if (task.autoDispatch !== true || task.status !== 'in_progress' || execution === undefined
                        || task.work?.plan.goalRevision !== state.goal.revision || !taskReady(state, task))
                        continue;
                    if (this.config.autoAssignReadyTasks && execution.phase === 'submitted' && (task.reviewerId === undefined
                        || !state.members.some(member => member.id === task.reviewerId && member.phase === 'active'))) {
                        const planned = readProjectPlan(state.goal.definition.plan)?.tasks.find(candidate => candidate.id === task.inputKey);
                        const eligible = this.roster.list(this.roster.membership(root)).filter(member => member.role === 'teammate'
                            && (planned === undefined || member.name === planned.reviewer)
                            && member.id !== execution.ownerId && member.status === 'inactive'
                            && (member.teamFunction === 'verifier' || member.teamFunction === 'executor')
                            && !state.tasks.some(other => other.ownerId === member.id && other.work?.execution?.phase === 'running'));
                        eligible.sort((a, b) => Number(b.teamFunction === 'verifier') - Number(a.teamFunction === 'verifier')
                            || state.tasks.filter(other => other.reviewerId === a.id && other.status === 'in_progress').length
                                - state.tasks.filter(other => other.reviewerId === b.id && other.status === 'in_progress').length);
                        const reviewer = eligible[0];
                        if (reviewer !== undefined) {
                            await this.tasks.update(root, { taskId: task.id, expectedRevision: task.revision,
                                action: 'configure_review', reviewer: reviewer.name }, this.lifecycle.signal);
                            continue;
                        }
                    }
                    const notifications = [];
                    if (execution.phase === 'running')
                        notifications.push({ targetId: execution.ownerId, kind: 'execute' });
                    if (execution.phase === 'submitted') {
                        if (task.work.plan.adviserGate === 'dual') {
                            for (const adviserFunction of ['planning_adviser', 'quality_adviser']) {
                                const adviser = state.members.find(candidate => candidate.phase === 'active'
                                    && memberFunction(state, candidate) === adviserFunction);
                                if (adviser !== undefined)
                                    notifications.push({ targetId: adviser.id, kind: 'advice' });
                            }
                        }
                        if (task.reviewerId !== undefined
                            && (task.work.plan.adviserGate !== 'dual' || hasDualAdviserApproval(state, task) || hasAdviserRevisionRequest(state, task))) {
                            notifications.push({ targetId: task.reviewerId, kind: 'review' });
                        }
                    }
                    for (const { targetId, kind } of notifications) {
                        if (targetId === root.id)
                            continue;
                        const member = state.members.find(candidate => candidate.id === targetId && candidate.phase === 'active');
                        if (member === undefined)
                            continue;
                        const revisedAdvisers = kind === 'review' && task.work.plan.adviserGate === 'dual'
                            ? state.members.filter(candidate => candidate.phase === 'active'
                                && (memberFunction(state, candidate) === 'planning_adviser' || memberFunction(state, candidate) === 'quality_adviser'))
                                .map(candidate => [candidate.id, memberRoleRevision(state, candidate.id)])
                                .filter(([, revision]) => revision > 0)
                            : [];
                        const digest = createHash('sha256').update(JSON.stringify([root.id, task.id, execution.id,
                            targetId, kind, state.goal.revision,
                            ...kind === 'review' && hasAdviserRevisionRequest(state, task) ? ['adviser-revision'] : [],
                            ...kind === 'advice' && memberRoleRevision(state, targetId) > 0 ? [memberRoleRevision(state, targetId)] : [],
                            ...revisedAdvisers.length === 0 ? [] : [revisedAdvisers]])).digest('hex');
                        const messageId = TeamMessageId(`team-message-task-${digest}`);
                        const inputPaths = task.work.plan.inputPaths ?? [];
                        if (member.workspace !== undefined && inputPaths.length > 0
                            && !state.messages.some(message => message.id === messageId)) {
                            const activity = this.roster.list(this.roster.membership(root)).find(candidate => candidate.id === member.id);
                            if (activity?.status !== 'inactive')
                                continue;
                            try {
                                await this.refreshWorkspace(root, member.name, inputPaths, this.lifecycle.signal);
                            }
                            catch (error) {
                                if (this.lifecycle.signal.aborted)
                                    return;
                                const detail = errorMessage(error);
                                const marker = `workspace-preparation:${createHash('sha256').update(JSON.stringify([task.id, execution.id, detail])).digest('hex')}`;
                                if (!this.journal.state(root).messages.some(message => message.targetId === root.id
                                    && message.content.some(block => block.type === 'text' && block.text.includes(marker)))) {
                                    await this.mailbox.sendNotice(root, TeamMessageId('team-message-' + marker.replace(':', '-')), [{ type: 'text', text: `${marker}\n任务 ${task.id} 派发前的输入准备失败，保留原成员和成果。请核对前置产物是否已验收并发布、当前计划输入版本和成员未提交修改；解决冲突后继续原任务，不重做已验收工作。错误数据：${JSON.stringify(detail)}` }], this.lifecycle.signal);
                                }
                                continue;
                            }
                        }
                        const text = kind === 'execute'
                            ? `已分配团队任务 ${task.id}（${task.subject}），执行编号 ${execution.id}。先用 team_task_get({"task_id":"${task.id}"}) 核对当前目标版本、输入和验收，再按计划执行。提交结果须附文件与验证证据，由另一名成员独立复核。不要重做已验收的任务。`
                            : kind === 'advice'
                                ? `关键任务 ${task.id}（${task.subject}）的执行 ${execution.id} 已提交。你是军师，只需审阅该版本的方案、证据与反例；调用 team_task_get，用 team_workspace 的 read_artifact 读产物、read_input 读计划 inputs 中记录的原始输入，按 nextByteOffset 续页；再用 team_adviser_review({"action":"record",...}) 留下简短独立意见。不得声称未实际完成的检查，不重复执行原任务。`
                                : `团队任务 ${task.id}（${task.subject}）的执行 ${execution.id} 已提交。${hasAdviserRevisionRequest(state, task) ? '军师提出修订，先读取当前意见并独立核对；有实质缺陷可 rejected，未有双批准不得 accepted。' : ''}你是指定的独立复核人；先用 team_task_get({"task_id":"${task.id}"}) 核对当前提交、每项验收条件及实际证据。使用 team_workspace({"action":"read_artifact","task_id":"${task.id}","execution_id":"${execution.id}","file_path":"提交记录中的相对产物路径"}) 读成果；把 action 改为 read_input 可读 plan.inputs 中记录的原始输入，即使你的私有目录为空也可核对。按 nextByteOffset 原值分页，不必集成或扩大权限。工具影响未核对时，接受前先检查实际状态并用 team_task_reconcile，再读取最新 revision。证据不足可直接 rejected；review 必须提供 execution_id、review_decision、review_summary 和非空字符串数组 review_evidence，accepted 还须逐项 review_checks。不重复执行原任务。`;
                        const content = [{ type: 'text', text }];
                        try {
                            await this.mailbox.sendTask(root, { target: member.name, content, signal: this.lifecycle.signal }, messageId, task.id, execution.id, kind, kind === 'advice' ? memberRoleRevision(state, targetId) : undefined);
                        }
                        catch (error) {
                            if (this.lifecycle.signal.aborted)
                                return;
                            this.ctx.logger.warn(`Team task ${task.id} notification failed: ${errorMessage(error)}`);
                        }
                    }
                }
                await this.completeProject(root);
            }
        }
        /** Publish accepted final artifacts and notify the communicator once for the exact approved plan. */
        async completeProject(root) {
            if (this.config.finalDelivery === 'manual')
                return;
            const state = this.journal.state(root);
            const goal = state.goal;
            const plan = readProjectPlan(goal?.definition.plan);
            if (goal?.status !== 'active' || plan?.version !== 2 || plan.automation?.provision !== 'on-demand')
                return;
            const id = TeamMessageId(`team-message-complete-${createHash('sha256').update(JSON.stringify([goal.revision, goal.definition.plan, this.config.finalDelivery])).digest('hex')}`);
            if (state.messages.some(message => message.id === id))
                return;
            const tasks = plan.tasks.map(planned => state.tasks.find(task => task.inputKey === planned.id
                && task.work?.plan.goalRevision === goal.revision && task.status === 'completed'));
            if (tasks.some(task => task === undefined))
                return;
            const signal = this.goals.capture(root, this.lifecycle.signal);
            for (const planned of plan.tasks.filter(task => task.kind === 'delivery')) {
                const task = tasks.find(candidate => candidate?.inputKey === planned.id);
                const [verified] = await this.validateTaskHandoff(root, [task.id], signal);
                if (verified?.validity.reusable !== true || verified.revision !== task.revision)
                    throw new TeamError('Final delivery evidence changed; revalidate the original result before publication', 'TEAM_TASK_EXECUTION_STALE');
                const owner = state.members.find(member => member.id === task.ownerId);
                if (this.config.finalDelivery === 'publish-and-notify' && owner?.workspace !== undefined && task.work?.execution?.submission?.artifacts?.length) {
                    if (this.roster.list(this.roster.membership(root)).find(member => member.id === owner.id)?.status !== 'inactive')
                        return;
                    await this.integrateWorkspace(root, owner.name, signal);
                }
            }
            signal.throwIfAborted();
            const publication = this.config.finalDelivery === 'publish-and-notify'
                ? '最终文件已完成受检查的发布。' : '最终成果仍需按提交回执检查并显式发布；不能宣称已写入共享目录。';
            await this.mailbox.sendNotice(root, id, [{ type: 'text', text: `确认方案版本 ${goal.revision} 的 ${tasks.length} 项任务均已独立验收，${publication}请读取当前目标与 team_task_archive 的验收回执，向用户汇总交付位置、逐项结果与已知限制。不要重新执行已验收任务，也不要把方案完成扩大为未经验证的业务结论。` }], signal);
        }
        async applyProjectRoster(root) {
            const state = this.journal.state(root);
            const goal = state.goal;
            const plan = readProjectPlan(goal?.definition.plan);
            if (goal?.status !== 'active' || plan === undefined)
                return;
            const signal = this.goals.admit(root, this.lifecycle.signal);
            for (const planned of plan.members) {
                const member = this.roster.list(this.roster.membership(root)).find(candidate => candidate.name === planned.name && candidate.status === 'inactive');
                if (member === undefined)
                    continue;
                const current = this.journal.state(root);
                const route = current.modelRoutes?.find(candidate => candidate.memberId === member.id);
                if (route?.goalRevision !== goal.revision && (member.modelProvider !== planned.modelProvider
                    || member.model !== planned.model || member.reasoningEffort !== planned.reasoningEffort)) {
                    await this.roster.configureModel(root, { target: member.name, expectedRevision: route?.revision ?? 0,
                        modelProvider: planned.modelProvider, model: planned.model, reasoningEffort: planned.reasoningEffort }, signal);
                }
                const role = current.memberRoles?.find(candidate => candidate.memberId === member.id);
                if (role?.goalRevision !== goal.revision && member.teamFunction !== planned.function) {
                    await this.roster.configureRole(root, { target: member.name, expectedRevision: role?.revision ?? 0,
                        teamFunction: planned.function, reason: `Confirmed project goal ${goal.revision}` }, signal);
                }
                const saved = this.skillSelections.read(root, member.name);
                if (saved.goalRevision !== goal.revision || saved.revision === 0) {
                    if (saved.skills.length === planned.skills.length && saved.skills.every(skill => planned.skills.includes(skill.name))) {
                        if (saved.revision > 0)
                            await this.skillSelections.rebind(root, member.name, saved.revision, signal);
                    }
                    else {
                        const skills = await Promise.all(planned.skills.map(async (name) => ({
                            ...await this.ctx.waterfall('team/resolve-skill', { agent: root, name, signal }, () => Promise.reject(new TeamError(`skill unavailable: ${name}`, 'TEAM_SKILL_UNAVAILABLE'))),
                            purpose: planned.responsibility.slice(0, 200).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' '),
                        })));
                        await this.skillSelections.select(root, { member: member.name, expectedRevision: saved.revision, skills }, signal);
                    }
                }
            }
        }
        /** Give each ready task one idle executor with its selected current-goal skill. */
        async assignReadyTasks(root) {
            const skipped = new Set();
            while (!this.lifecycle.disposed) {
                const state = this.journal.state(root);
                if (state.goal?.status !== 'active')
                    return;
                const task = state.tasks.find(candidate => candidate.autoAssign === true && candidate.status === 'pending'
                    && candidate.work?.execution?.phase !== 'rejected'
                    && resourceConflicts(state, candidate).length === 0
                    && !skipped.has(candidate.id) && taskReady(state, candidate));
                if (task === undefined)
                    return;
                const members = this.roster.list(this.roster.membership(root));
                const planned = readProjectPlan(state.goal.definition.plan)?.tasks.find(candidate => candidate.id === task.inputKey);
                const candidate = members.find(member => member.role === 'teammate'
                    && (planned === undefined || member.name === planned.owner)
                    && (member.teamFunction === 'executor' || member.teamFunction === 'group_lead' || member.teamFunction === 'verifier'
                        || member.teamFunction === undefined && task.requiredSkill !== undefined)
                    && member.status === 'inactive'
                    && !state.skillSelections?.some(selection => selection.memberId === member.id
                        && selection.goalRevision !== state.goal?.revision && selection.skills.length > 0)
                    && !state.tasks.some(other => other.status === 'in_progress' && other.ownerId === member.id
                        && other.work?.execution?.phase !== 'submitted')
                    && !state.messages.some(message => message.targetId === member.id && message.goalRevision === state.goal?.revision
                        && !state.delivered.includes(message.id))
                    && (task.requiredSkill === undefined || state.skillSelections?.some(selection => selection.memberId === member.id
                        && selection.goalRevision === state.goal?.revision
                        && selection.skills.some(skill => skill.name === task.requiredSkill)) === true));
                if (candidate === undefined) {
                    skipped.add(task.id);
                    continue;
                }
                try {
                    await this.tasks.update(root, { taskId: task.id, expectedRevision: task.revision,
                        action: 'reassign', owner: candidate.name }, this.lifecycle.signal);
                }
                catch (error) {
                    if (this.lifecycle.signal.aborted)
                        return;
                    skipped.add(task.id);
                    this.ctx.logger.warn(`Team task ${task.id} automatic assignment skipped: ${errorMessage(error)}`);
                }
            }
        }
        /** Stop Team-owned live branches and release every waiter before service disposal completes. */
        async disposeRuntime() {
            this.lifecycle.close();
            this.requests.close(new TeamError('Agent Teams service disposed', 'TEAM_DISPOSED'));
            this.activity.close();
            const failures = [];
            await this.lifecycle.settle(this.roster.pendingCreations(), failures);
            await this.lifecycle.settle(this.mailbox.pendingDispatches(), failures);
            await this.lifecycle.settle([...this.taskDispatchRuns.values(), ...this.continueRuns.values()], failures);
            for (const [root, childIds] of this.roster.liveChildrenByRoot()) {
                try {
                    await this.roster.stopTeammates(root, childIds);
                }
                catch (error) {
                    failures.push(error);
                }
            }
            await this.lifecycle.settle([this.journal.drain()], failures);
            this.roster.releaseWorkspaceCaps();
            this.coordination?.close();
            if (failures.length > 0)
                throw new AggregateError(failures, 'Agent Teams runtime disposal failed');
        }
    };
})();
export { TeamService };
export default TeamService;
