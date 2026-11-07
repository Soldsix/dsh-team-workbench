/** User-reviewed Team objectives, scope descriptions, and durable decisions. */

import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Resource rules enforced by the supported Team tool adapters; '*' is an explicit unrestricted grant. */
export interface TeamExecutionScope {
  readonly readPaths: string[]
  readonly writePaths: string[]
  readonly webOrigins: string[]
  readonly allowSearch: boolean
  /** Allows opaque programs only with unrestricted resource grants; sandbox ceilings still apply. */
  readonly allowUnrestrictedExecution: boolean
}

/** Scope confirmed for this task; coverage never includes unnamed targets or actions. */
export interface TeamGoalScope {
  readonly coverage: 'full' | 'partial' | 'task'
  readonly targets: string[]
  readonly allowedActions: string[]
  readonly excludedTargets: string[]
  readonly constraints: string[]
  /** Absent in legacy goals; ordinary scope text never substitutes for these resource checks. */
  readonly execution?: TeamExecutionScope
}

/** Complete objective shown to the user before a Team adopts it. */
export interface TeamGoalDefinition {
  readonly objective: string
  readonly acceptanceCriteria: string[]
  readonly scope: TeamGoalScope
  /** Complete member, model, task, dependency, and delivery plan reviewed with this goal. */
  readonly plan?: string
}

/** A replacement or withdrawal proposed by the Lead, without execution authority. */
export type TeamGoalChange =
  | { readonly kind: 'replace'; readonly definition: TeamGoalDefinition }
  | { readonly kind: 'revoke'; readonly reason: string }

/** Latest Lead proposal, retaining both revisions needed for an explicit review. */
export interface TeamGoalProposal {
  readonly revision: number
  readonly baseRevision: number
  readonly proposedBy: SessionId
  readonly change: TeamGoalChange
}

/** Exact outcome received through the trusted user-questions answerer. */
export interface TeamGoalDecision {
  readonly proposalRevision: number
  readonly outcome: 'accepted' | 'rejected'
  readonly comment: string
  readonly decidedAt: number
  readonly channel: 'user-question'
}

/** Current user-confirmed objective; withdrawal retains its definition for audit. */
export interface TeamGoalSnapshot {
  readonly revision: number
  readonly proposalRevision: number
  readonly status: 'active' | 'revoked'
  readonly definition: TeamGoalDefinition
  readonly decidedAt: number
  readonly revocationReason?: string
}

/** Detached current review state; absent fields represent a Team without that record. */
export interface TeamGoalReview {
  readonly goal?: TeamGoalSnapshot
  readonly goalProposal?: TeamGoalProposal
  readonly goalDecision?: TeamGoalDecision
}

/** Compare-and-set proposal; the user must subsequently review this exact revision. */
export interface ProposeTeamGoalRequest {
  readonly expectedProposalRevision: number
  readonly expectedGoalRevision: number
  readonly change: TeamGoalChange
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The proposed content fails the goal field requirements. */
    TEAM_GOAL_INVALID: { readonly fields: readonly string[] }
    /** The complete encoded proposal exceeds the configured limit. */
    TEAM_GOAL_TOO_LARGE: { readonly maxBytes: number }
    /** The displayed goal or proposal changed before the operation was admitted. */
    TEAM_GOAL_STALE: { readonly goalRevision: number; readonly proposalRevision: number }
    /** Another proposal revision cannot be represented exactly. */
    TEAM_GOAL_REVISION_LIMIT: Record<string, never>
    /** A review of this Team is already awaiting a human answer. */
    TEAM_GOAL_REVIEW_PENDING: Record<string, never>
    /** This Host has no available human question answerer. */
    TEAM_GOAL_NO_REVIEWER: Record<string, never>
  }
}
