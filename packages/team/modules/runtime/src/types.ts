/** Public Agent Teams identities, durable records, and service request values. */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamExpertBinding } from './expert-types.ts'
import type { TeamGoalDecision, TeamGoalProposal, TeamGoalReview } from './goal-types.ts'
import type { TeamTaskEffectEvent, TeamTaskExecutionId, TeamTaskPlanInput, TeamTaskValidity, TeamTaskWork } from './task-work-types.ts'
import type { TeamSkillSelection, TeamSkillSelectionView } from './skill-types.ts'
import type { TeamWorkspaceConfig } from './workspace-runtime.ts'

export type * from './expert-types.ts'
export type * from './goal-types.ts'
export type * from './task-work-types.ts'
export type * from './skill-types.ts'

/** Identifies the implicit team rooted at one top-level Session. */
export type TeamId = Branded<'TeamId'>

/**
 * Brand one root Session identity as its implicit Team identity.
 * @param id - Root Session identity.
 * @returns the same string branded as a Team identity.
 */
export function TeamId(id: SessionId | string): TeamId {
  return id as TeamId
}

/** Stable identifier for one task in a Team. */
export type TeamTaskId = Branded<'TeamTaskId'>

/**
 * Brand a validated task id.
 * @param id - Team-local task identity.
 * @returns the same string branded as a Team task identity.
 */
export function TeamTaskId(id: string): TeamTaskId {
  return id as TeamTaskId
}

/** Stable identifier for one durable peer message. */
export type TeamMessageId = Branded<'TeamMessageId'>

/**
 * Brand a generated peer-message id.
 * @param id - Durable mailbox message identity.
 * @returns the same string branded as a Team message identity.
 */
export function TeamMessageId(id: string): TeamMessageId {
  return id as TeamMessageId
}

/** Durable teammate lifecycle. */
export type TeamMemberPhase = 'provisioning' | 'active' | 'failed' | 'retired'

/** Durable responsibility label; it does not change Team authority or model routing. */
export type TeamMemberFunction = 'planning_adviser' | 'quality_adviser' | 'domain_adviser'
  | 'group_lead' | 'executor' | 'verifier'

/** Private working copy and immutable sandbox ceiling retained across member activation. */
export interface TeamMemberWorkspace {
  readonly cwd: string
  readonly baselineManifestPath: string
  readonly maxMode: 'read-only' | 'workspace-write'
}

/** Member-owned model selection and role text retained independently of live activity. */
export interface TeamMemberSettings {
  /** Team responsibility chosen by the delegating member; absent historical rows stay valid. */
  readonly teamFunction?: TeamMemberFunction
  /** Creation-time profile identity; repeated assignment reuses this member. */
  readonly expert?: TeamExpertBinding
  /** Registered language-model provider, distinct from the subagent provider. */
  readonly modelProvider?: string
  /** Exact model selected when the member was created. */
  readonly model?: string
  /** Adapter-supported reasoning effort selected for this member. */
  readonly reasoningEffort?: string
  /** Persona persisted with the continuation and reapplied on resume. */
  readonly persona?: string
}

/** Versioned model route for an existing member; its creation profile remains immutable. */
export interface TeamMemberModelRoute {
  /** Confirmed goal at configuration, used to preserve later in-goal route changes. */
  readonly goalRevision?: number
  readonly memberId: SessionId
  readonly revision: number
  readonly modelProvider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** Model and effort selected for an existing teammate's next request. */
export interface ConfigureTeamMemberModelRequest {
  /** Optional route revision from listMembers; concurrent conflicting changes are rejected. */
  readonly expectedRevision?: number
  readonly target: string
  readonly modelProvider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** Versioned responsibility for a retained member; identity and persona remain unchanged. */
export interface TeamMemberRole {
  readonly goalRevision?: number
  readonly memberId: SessionId
  readonly revision: number
  readonly teamFunction: TeamMemberFunction
  readonly reason: string
}

/** Compare-and-set responsibility assignment for an inactive retained member. */
export interface ConfigureTeamMemberRoleRequest {
  readonly target: string
  readonly expectedRevision: number
  readonly teamFunction: TeamMemberFunction
  readonly reason: string
}

/** Saved role used for new members; an existing member keeps its creation-time copy. */
export interface TeamRoleProfile {
  readonly description: string
  readonly persona: string
  /** Per-role AGENT.md contents included in the durable member persona. */
  readonly instructions: string
  readonly modelProvider?: string
  readonly model?: string
  readonly reasoningEffort?: string
}

/** Whole durable value written on every teammate lifecycle change. */
export interface TeamMemberSnapshot extends TeamMemberSettings {
  readonly id: SessionId
  /** Direct delegating member; omitted by historical direct-child records. */
  readonly parentId?: SessionId
  readonly name: string
  readonly description: string
  readonly provider: string
  readonly context: 'fresh' | 'fork'
  readonly phase: TeamMemberPhase
  readonly error?: string
  /** Private working copy and immutable sandbox ceiling restored before activation. */
  readonly workspace?: TeamMemberWorkspace
}

/** Creation and settlement value carried by the released member registration event. */
export interface TeamMemberRegistration extends TeamMemberSnapshot {
  readonly phase: 'provisioning' | 'active' | 'failed'
}

/** Current runtime-enriched roster row. */
export interface TeamMemberView extends TeamMemberSettings {
  readonly id: SessionId
  readonly parentId?: SessionId
  readonly parentName?: string
  readonly name: string
  readonly role: 'lead' | 'teammate'
  readonly status: 'running' | 'inactive' | 'provisioning' | 'failed' | 'retired'
  readonly description?: string
  readonly provider?: string
  readonly context?: 'fresh' | 'fork'
  readonly diagnostics: string[]
  /** Revision of an in-place model choice; absent when still using the creation route. */
  readonly modelRouteRevision?: number
  /** Revision of the current responsibility; omitted for the creation-time role. */
  readonly roleRevision?: number
}

/** Durable task lifecycle. */
export type TeamTaskStatus = 'pending' | 'in_progress' | 'completed' | 'deleted'

/** Whole durable task snapshot; every mutation increments {@link revision}. */
export interface TeamTaskSnapshot extends TeamTaskEvidence {
  readonly work?: TeamTaskWork
  /** New tasks may be assigned to an idle executor with a matching selected skill. */
  readonly autoAssign?: boolean
  readonly requiredSkill?: string
  /** New tasks may request durable, once-per-execution member notification. Absent historical tasks remain manual. */
  readonly autoDispatch?: boolean
  readonly id: TeamTaskId
  readonly revision: number
  readonly subject: string
  readonly description: string
  readonly status: TeamTaskStatus
  readonly ownerId?: SessionId
  /** Optional independent reviewer, notified only after this execution submits evidence. */
  readonly reviewerId?: SessionId
  readonly blockedBy: TeamTaskId[]
  readonly writeScopes: string[]
}

/** First durable condition preventing task dispatch; live request quotas are reported separately. */
export type TeamTaskDispatchBlocker = 'goal' | 'dependencies' | 'reviewer_missing' | 'adviser_review' | 'skills' | 'manual'

/** Runtime-enriched task view returned to tools and hosts. */
export interface TeamTaskView extends TeamTaskEvidence {
  readonly dispatchBlocker?: TeamTaskDispatchBlocker
  readonly work?: TeamTaskWork
  readonly validity: TeamTaskValidity
  /** Runtime-only next step when an inactive owner leaves a task in progress. */
  readonly recovery?: { readonly reason: 'owner_inactive'; readonly action: 'resume' | 'reconcile' | 'review' | 'inspect' }
  readonly id: TeamTaskId
  readonly revision: number
  readonly subject: string
  readonly description: string
  readonly status: TeamTaskStatus
  readonly blockedBy: TeamTaskId[]
  readonly writeScopes: string[]
  readonly ownerName?: string
  readonly reviewerName?: string
  readonly requiredSkill?: string
  readonly autoAssign?: boolean
  readonly ready: boolean
  readonly writeScopeWarnings: string[]
}

/** Stable work identity and evidence retained with a task's completion. */
export interface TeamTaskEvidence {
  /** Caller-supplied input version, or a configured hash of the original task inputs. */
  readonly inputKey?: string
  /** Reusable completion summary. */
  readonly result?: string
  /** Artifact paths, source URLs, or executed verification facts supporting the result. */
  readonly evidence?: string[]
}

/** Shared objective and recorded decisions; authorization text does not grant tool permissions. */
export interface TeamBriefSnapshot {
  readonly revision: number
  /** Goal confirmed when the brief was written; absent legacy briefs remain historical. */
  readonly goalRevision?: number
  readonly objective: string
  readonly authorization: string
  readonly decisions: string
}

/** Current-goal brief or historical revision metadata without stale instructions. */
export interface TeamBriefView {
  readonly revision: number
  readonly goalRevision?: number
  readonly active: boolean
  readonly objective?: string
  readonly authorization?: string
  readonly decisions?: string
}

/** Independent adviser finding tied to an exact submitted task execution. */
export interface TeamAdviserDecision {
  /** Responsibility revision under which this decision was made; legacy values imply zero. */
  readonly adviserRoleRevision?: number
  readonly id: string
  readonly goalRevision: number
  readonly taskId: TeamTaskId
  readonly executionId: TeamTaskExecutionId
  readonly adviserId: SessionId
  readonly adviserFunction: 'planning_adviser' | 'quality_adviser' | 'domain_adviser'
  readonly decision: 'approve' | 'revise'
  readonly summary: string
  readonly evidence: string[]
}

/** Evidence submitted by one adviser for a current task execution. */
export interface RecordTeamAdviserDecisionRequest {
  readonly taskId: TeamTaskId
  readonly executionId: TeamTaskExecutionId
  readonly decision: 'approve' | 'revise'
  readonly summary: string
  readonly evidence: readonly string[]
}

/** Lead-authored compare-and-set update of the shared brief. */
export interface UpdateTeamBriefRequest {
  readonly expectedRevision: number
  readonly objective?: string
  readonly authorization?: string
  readonly decisions?: string
}

/** One durable roster row published through the `agentTeam` Session projection. */
export interface TeamMemberProjection extends TeamMemberSettings {
  readonly id: SessionId
  readonly parentId?: SessionId
  readonly description?: string
  readonly name: string
  readonly role: 'lead' | 'teammate'
  /** Durable lifecycle; the Lead row is always `active`. Turn activity comes from Session status. */
  readonly phase: TeamMemberPhase
  readonly error?: string
  /** Revision of an in-place model choice; absent when still using the creation route. */
  readonly modelRouteRevision?: number
  /** Revision of the current responsibility; omitted for the creation-time role. */
  readonly roleRevision?: number
}

/**
 * Durable Team state published to browser clients through the Lead Session's
 * `agentTeam` projection. `failure` names the first rejected persisted Team
 * record; members and tasks then stay at the last valid state.
 */
export interface TeamProjection extends TeamGoalReview {
  readonly adviserDecisions?: readonly TeamAdviserDecision[]
  readonly skillSelections?: readonly TeamSkillSelectionView[]
  readonly members: TeamMemberProjection[]
  readonly tasks: TeamTaskView[]
  /** Archived completions excluded from the active board; absent in earlier client views. */
  readonly completedTaskCount?: number
  readonly brief?: TeamBriefSnapshot
  readonly failure?: string
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Durable roster and active task board of the Team rooted at the projected Session. */
    agentTeam: TeamProjection
  }
}

/** One peer message retained until its target Session records it. */
export interface TeamMessageSnapshot {
  /** Earliest host-scheduled delivery time; survives restart without model polling. */
  readonly notBefore?: number
  /** Connection whose cooldown caused this deadline; an explicit connection change releases it. */
  readonly cooldownProvider?: string
  readonly id: TeamMessageId
  /** Automatic task notification; delivery stops if its assigned execution changes. */
  readonly taskDispatch?: { readonly taskId: TeamTaskId
    readonly executionId: TeamTaskExecutionId
    readonly kind: 'execute' | 'review' | 'advice'
    readonly adviserRoleRevision?: number }
  /** Confirmed goal at admission; absent legacy values are historical and never auto-dispatched. */
  readonly goalRevision?: number
  /** Historical message explicitly adopted by the Lead under this goal. */
  readonly adoptedFrom?: TeamMessageId
  readonly senderId: SessionId
  readonly senderName: string
  readonly targetId: SessionId
  readonly content: ContentBlock[]
}

/** Mailbox summary without message bodies; retry counters describe the current runtime. */
export interface TeamMailboxMessageView {
  readonly id: TeamMessageId
  readonly senderId: SessionId
  readonly senderName: string
  readonly targetId: SessionId
  readonly goalRevision?: number
  readonly adoptedFrom?: TeamMessageId
  readonly status: 'pending' | 'quarantined' | 'delivered' | 'retry-exhausted'
  readonly attempts: number
  readonly error?: string
  readonly nextAttemptAt?: number
}

/** Bounded newest-first mailbox page; message bodies are fetched individually. */
export interface TeamMailboxPage {
  readonly total: number
  readonly items: TeamMailboxMessageView[]
}

/** Source retained by the target Session for durable mailbox de-duplication. */
export interface TeamMessageSource {
  readonly kind: 'team-message'
  readonly teamId: TeamId
  readonly messageId: TeamMessageId
  readonly senderId: SessionId
  readonly senderName: string
}

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'team-message': TeamMessageSource
  }
}

/** Concurrent Team requests sharing one registered language-model provider. */
export interface TeamProviderConcurrency {
  /** Exact registered language-model provider route. */
  readonly provider: string
  /** Maximum active Team requests sharing this route. */
  readonly maxConcurrentRequests: number
}

/** Concurrent Team requests sharing an exact provider and model route. */
export interface TeamModelConcurrency extends TeamProviderConcurrency {
  /** Exact model routing name within the provider. */
  readonly model: string
}

/** Model-request limits, independent of retained member and resident Agent counts. */
export interface TeamRequestLimits {
  /** Maximum concurrent model streams per Team, including its Lead. */
  readonly maxConcurrentRequestsPerTeam?: number
  /** Optional limits shared by all Teams using each provider in this runtime. */
  readonly providerConcurrency?: TeamProviderConcurrency[]
  /** Optional limits shared by all Teams using each exact model route in this runtime. */
  readonly modelConcurrency?: TeamModelConcurrency[]
}

/** Team-service deployment limits. */
export interface Config extends TeamRequestLimits {
  /** Accepted V2 plan completion: manual, notify only, or checked publication followed by one notice. */
  readonly finalDelivery?: 'manual' | 'notify' | 'publish-and-notify'
  /** Hide tools unavailable to the exact member's current V2 role and confirmed resources. */
  readonly filterToolsByGoal?: boolean
  /** A new user turn may resume inactive unfinished members of the current V2 goal, within the retry limit. */
  readonly resumeIncompleteOnUserContinue?: boolean
  /** Shared local directory holding cooperative cross-process owner and publisher locks. */
  readonly coordinationRoot?: string
  /** Maximum publication queue duration in milliseconds. */
  readonly coordinationWaitMs?: number
  /** Cancellation-aware publication polling interval in milliseconds. */
  readonly coordinationPollMs?: number
  /** Provision only members and tasks explicitly approved in version-2 plans. */
  readonly autoProvisionPlannedMembers?: boolean
  /** Maximum member creations attempted in one scheduler pass. */
  readonly maxProvisionPerPass?: number
  /** Registered continuable provider used for approved fresh members. */
  readonly plannedMemberProvider?: string
  /** Connections sharing an account also share this capacity and cooldown. */
  readonly accountPools?: {
    /** Deployment-local shared account identity. */
    readonly id: string
    /** Configured provider identifiers using this account. */
    readonly providers: string[]
    /** Maximum simultaneous model requests across these connections. */
    readonly maxConcurrentRequests: number
  }[]
  /** Delay after a provider rate or concurrency rejection. */
  readonly rateLimitCooldownMs?: number
  /** Delay after exhausted balance or quota. */
  readonly quotaCooldownMs?: number
  /** Maximum automatic continuation messages for one task attempt. */
  readonly maxAutomaticResumes?: number
  /** Persist plugin state inside a versioned team/task carrier for unmodified DSH readers. */
  readonly portableEventEnvelope?: boolean
  /** Require a structured roster, work graph, resource budget and goal transition plan. */
  readonly requireStructuredPlans?: boolean
  /** Mark new tasks for deterministic assignment to idle matching executor members. */
  readonly autoAssignReadyTasks?: boolean
  /** Reject simultaneous running tasks whose declared shared output paths overlap. */
  readonly enforceWriteScopeExclusivity?: boolean
  /** Mark newly created tasks for once-per-execution automatic member notification. */
  readonly autoDispatchReadyTasks?: boolean
  /** Private member workspaces and audited tool capabilities; omitted for existing shared-workspace deployments. */
  readonly workspaceIsolation?: TeamWorkspaceConfig | false
  /** Resolve an omitted member effort to the strongest supported named level. */
  readonly defaultMemberReasoningEffort?: 'inherit' | 'highest'
  /** Maximum active skill modules retained by one member. */
  readonly maxSelectedSkillsPerMember?: number
  /** Maximum UTF-8 bytes of one member's skill selection, including instruction snapshots. */
  readonly maxSkillSelectionBytes?: number
  /** Require a versioned plan before starting a task; legacy records remain readable. */
  readonly requireTaskPlans?: boolean
  /** Maximum UTF-8 bytes in one task's complete plan, execution, and review record. */
  readonly maxTaskWorkBytes?: number
  /** Maximum concrete input or artifact paths observed for one task receipt. */
  readonly maxTaskReceiptPaths?: number
  /** Maximum cumulative file bytes read while observing one task receipt. */
  readonly maxTaskReceiptBytes?: number
  /** Maximum UTF-8 bytes in one complete task-artifact read response. */
  readonly maxTaskArtifactReadBytes?: number
  /** Require human confirmation before Team delegation; existing deployments default to false. */
  readonly requireConfirmedGoal?: boolean
  /** Require explicit execution resources in newly proposed goals and before executing legacy goals. */
  readonly requireExecutionScope?: boolean
  /** Maximum UTF-8 size of one proposed goal change. */
  readonly maxGoalBytes?: number
  /** Preset ids whose root sessions expose Team operations; '*' allows every preset and [] disables Teams. */
  readonly enabledPresets?: string[]
  /** Maximum active or provisioning teammates; retired and failed identities remain in history. */
  readonly maxMembers?: number
  /** Maximum resident continuable descendants for Team member activation, including waiting parents. */
  readonly maxResidentMembers?: number
  /** Maximum Team delegation depth, counting children of the Lead as one. */
  readonly maxDepth?: number
  /** Reuse the task with identical normalized creation inputs when no input key is supplied. */
  readonly deduplicateTaskInputs?: boolean
  /** Require a non-empty reusable result before a task can complete. */
  readonly requireTaskResults?: boolean
  /** Maximum pending or in-progress tasks; completed results remain in the archive. */
  readonly maxTasks?: number
  /** Maximum queued-minus-delivered messages for one target member. */
  readonly maxPendingMessagesPerMember?: number
  /** Maximum UTF-8 bytes in one complete sender-framed delivery. */
  readonly maxMessageBytes?: number
  /** Initial delay before retrying a failed mailbox delivery. */
  readonly mailboxRetryInitialMs?: number
  /** Maximum delay between mailbox delivery retries. */
  readonly mailboxRetryMaxMs?: number
  /** Automatic delivery attempts per message and runtime before explicit retry is required. */
  readonly mailboxRetryMaxAttempts?: number
  /** Maximum milliseconds allowed for Team-owned runtime disposal. */
  readonly disposalTimeoutMs?: number
}

/** Result after one teammate reaches a durable active or failed edge. */
export interface SpawnTeammateResult {
  readonly member: TeamMemberView
}

/** Assignment result; reused members receive no additional model prompt. */
export interface EnsureExpertMemberResult extends SpawnTeammateResult {
  readonly reused: boolean
}

/** Input for one durable peer message. */
export interface SendTeamMessageRequest {
  /** Host-owned delivery deadline used for provider cooldown recovery. */
  readonly notBefore?: number
  readonly cooldownProvider?: string
  readonly target: string
  readonly content: ContentBlock[]
  readonly signal: AbortSignal
}

/** Result after a peer message enters the durable mailbox. */
export interface SendTeamMessageResult {
  readonly messageId: TeamMessageId
  readonly status: 'accepted' | 'queued'
}

/** Request one bounded page of retained task completions. */
export interface ListTeamTaskArchiveRequest {
  /** Exclusive cursor from the preceding archive page. */
  readonly after?: TeamTaskId
  readonly limit: number
}

/** Bounded completed-task history, separate from the active task board. */
export interface TeamTaskArchivePage {
  readonly tasks: TeamTaskView[]
  readonly nextCursor?: TeamTaskId
}

/** Input for creating one shared task. */
export interface CreateTeamTaskRequest {
  readonly plan?: TeamTaskPlanInput
  readonly inputKey?: string
  readonly subject: string
  readonly description: string
  readonly blockedBy?: readonly TeamTaskId[]
  readonly writeScopes?: readonly string[]
  /** Active member name that will independently check the submitted result. */
  readonly reviewer?: string
  readonly requiredSkill?: string
  /** Override the Team's new-task automatic assignment default. */
  readonly autoAssign?: boolean
}

/** Supported task mutation actions. */
export type TeamTaskAction =
  | 'plan'
  | 'configure_dispatch'
  | 'configure_review'
  | 'resume'
  | 'review'
  | 'reconcile'
  | 'claim'
  | 'release'
  | 'edit'
  | 'set_dependencies'
  | 'complete'
  | 'reopen'
  | 'reassign'
  | 'delete'

/** Compare-and-set mutation of one shared task. */
export interface UpdateTeamTaskRequest {
  /** Lead-selected independent reviewer for pending, running, or submitted work. */
  readonly reviewer?: string
  /** Explicit Lead opt-in for an existing pending task; omitted historical records stay manual. */
  readonly autoAssign?: boolean
  readonly requiredSkill?: string
  readonly artifactPaths?: readonly string[]
  readonly sideEffects?: 'none' | 'known' | 'unknown'
  readonly sideEffectEvidence?: readonly string[]
  readonly plan?: TeamTaskPlanInput
  readonly executionId?: TeamTaskExecutionId
  readonly reviewDecision?: 'accepted' | 'rejected'
  readonly reviewSummary?: string
  readonly reviewEvidence?: readonly string[]
  readonly taskId: TeamTaskId
  readonly expectedRevision: number
  readonly action: TeamTaskAction
  readonly subject?: string
  readonly description?: string
  readonly blockedBy?: readonly TeamTaskId[]
  readonly writeScopes?: readonly string[]
  readonly owner?: string
  readonly result?: string
  readonly evidence?: readonly string[]
}

/** Result of waiting for Team activity. */
export interface TeamWaitResult {
  readonly timedOut: boolean
  readonly noProgress?: {
    readonly reason: 'no-active-peer' | 'all-peers-waiting' | 'resident-capacity-blocked'
    readonly message: string
  }
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** Exact instruction versions selected for one member under the current goal. */
    'team/skills-selected': { version: 2; teamId: TeamId; selection: TeamSkillSelection }
    /** Lead proposal awaiting a user review; never grants execution authority. */
    'team/goal-proposed': { version: 2; teamId: TeamId; proposal: TeamGoalProposal }
    /** Exact user review of the current proposal; only acceptance advances the goal. */
    'team/goal-decided': { version: 2; teamId: TeamId; decision: TeamGoalDecision }
    /** Whole Lead-authored shared brief, stored only in the Team Lead Session. */
    'team/brief': { version: 2; teamId: TeamId; brief: TeamBriefSnapshot }
    /** Whole teammate creation or settlement value, stored only in the Team Lead Session. */
    'team/member': { version: 2; teamId: TeamId; member: TeamMemberRegistration }
    /** Retirement or reactivation of an existing member without replacing its registration. */
    'team/member-retirement': { version: 2; teamId: TeamId; memberId: SessionId; retired: boolean }
    /** In-place model choice for an existing member; the creation profile and Session id stay fixed. */
    'team/member-model-route': { version: 2; teamId: TeamId; route: TeamMemberModelRoute }
    /** In-place responsibility change; creation identity and persona stay fixed. */
    'team/member-role': { version: 2; teamId: TeamId; role: TeamMemberRole }
    /** Whole shared-task value, stored only in the Team Lead Session. */
    'team/task': { version: 2; teamId: TeamId; task: TeamTaskSnapshot }
    /** Tool dispatch and settlement observed for one exact task execution. */
    'team/task-effect': TeamTaskEffectEvent
    /** Independent adviser finding for one submitted task execution. */
    'team/adviser-decision': { version: 2; teamId: TeamId; finding: TeamAdviserDecision }
    /** Durable mailbox enqueue, stored before delivery is attempted. */
    'team/message/queued': { version: 2; teamId: TeamId; message: TeamMessageSnapshot }
    /** Durable acknowledgement that the target Session recorded the message. */
    'team/message/delivered': {
      version: 2
      teamId: TeamId
      messageId: TeamMessageId
      targetId: SessionId
    }
  }
}
