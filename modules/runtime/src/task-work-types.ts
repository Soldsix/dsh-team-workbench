/** Versioned task plans, execution identities, and independent review records. */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { TeamId, TeamTaskId } from './types.ts'

/** Identifies one attempt within its owning Team task. */
export type TeamTaskExecutionId = Branded<'TeamTaskExecutionId'>

/**
 * Brand a validated Team-local execution identity.
 * @param id - Persisted execution identity, scoped by its Team.
 * @returns the same text with its execution brand.
 */
export function TeamTaskExecutionId(id: string): TeamTaskExecutionId {
  return id as TeamTaskExecutionId
}

/** SHA-256 of one regular file observed inside the member workspace. */
export interface TeamFileReceipt {
  /** Logical project-relative output path. */
  readonly path: string
  /** Host-observed byte length. */
  readonly bytes: number
  /** Lowercase hexadecimal digest of the complete file bytes. */
  readonly sha256: string
}

/** Local runtime observations; the caller's environmentVersion remains a separate declaration. */
export interface TeamEnvironmentReceipt {
  readonly workspaceRoot: string
  readonly platform: string
  readonly arch: string
  readonly nodeVersion: string
}

/** Declared versions and concrete checks required for one task result. */
export interface TeamTaskPlanInput {
  /** Version of the supplied inputs; this declaration alone does not inspect files. */
  readonly inputVersion: string
  /** Version of the relevant tools, devices, and runtime conditions. */
  readonly environmentVersion: string
  readonly acceptanceCriteria: string[]
  /** Require independent planning and quality adviser approvals before accepting this execution. */
  readonly adviserGate?: 'dual' | undefined
  /** Workspace-relative files to hash when the plan is recorded. */
  readonly inputPaths?: string[] | undefined
}

/** Plan bound to the current user-reviewed goal when it is recorded. */
export interface TeamTaskPlan extends TeamTaskPlanInput {
  readonly inputPaths?: string[]
  readonly adviserGate?: 'dual'
  readonly revision: number
  readonly plannerId: SessionId
  /** Zero denotes a Team that has no confirmed goal yet. */
  readonly goalRevision: number
  /** Host-observed inputs; absent on legacy plans. */
  readonly inputs?: TeamFileReceipt[]
  /** Host-observed local runtime; absent on legacy plans. */
  readonly environment?: TeamEnvironmentReceipt
}

/** Exact completed dependency consumed by an execution. */
export interface TeamTaskDependencyVersion {
  readonly taskId: TeamTaskId
  readonly revision: number
}

/** Evidence submitted by the executing member; independent review remains pending. */
export interface TeamTaskSubmission {
  readonly result: string
  readonly evidence: string[]
  /** Host-observed output files; absent on legacy submissions. */
  readonly artifacts?: TeamFileReceipt[]
  /** Host-observed executor workspace and runtime for the artifact receipts. */
  readonly environment?: TeamEnvironmentReceipt
  /** Caller declaration, never by itself proof that no external side effect occurred. */
  readonly sideEffects?: 'none' | 'known' | 'unknown'
  readonly sideEffectEvidence?: string[]
}

/** A different member's decision about one exact submission. */
export interface TeamTaskReview {
  readonly reviewerId: SessionId
  readonly decision: 'accepted' | 'rejected'
  readonly summary: string
  readonly evidence: string[]
}

/** A durable observation of one tool dispatch inside an exact task attempt. */
export interface TeamTaskEffectEvent {
  readonly version: 2
  readonly teamId: TeamId
  readonly taskId: TeamTaskId
  readonly executionId: TeamTaskExecutionId
  readonly callId: ToolCallId
  readonly toolName: string
  readonly phase: 'started' | 'settled'
}

/** An independent finding about external effects before another attempt or reuse. */
export interface TeamTaskEffectReview {
  readonly reviewerId: SessionId
  readonly resolution: 'none' | 'known'
  readonly summary: string
  readonly evidence: string[]
  readonly observedCalls: number
}

/** One execution retains the versions it started with and its eventual review. */
export interface TeamTaskExecution {
  readonly id: TeamTaskExecutionId
  readonly ownerId: SessionId
  readonly planRevision: number
  readonly dependencies: TeamTaskDependencyVersion[]
  readonly phase: 'running' | 'submitted' | 'accepted' | 'rejected' | 'cancelled'
  /** Absent on attempts created before tool dispatch tracking was installed. */
  readonly effectTracking?: 'observed'
  readonly effectReview?: TeamTaskEffectReview
  readonly submission?: TeamTaskSubmission
  readonly review?: TeamTaskReview
}

/** Durable task workflow; new attempts never reuse an earlier execution identity. */
export interface TeamTaskWork {
  readonly plan: TeamTaskPlan
  readonly attempts: number
  readonly execution?: TeamTaskExecution
}

/** Select one submitted artifact and an optional continuation offset. */
export interface TeamTaskArtifactReadRequest {
  readonly taskId: TeamTaskId
  readonly executionId: TeamTaskExecutionId
  readonly path: string
  readonly byteOffset?: number
}

/** Verified UTF-8 excerpt from one submitted artifact; offsets address original bytes. */
export interface TeamTaskArtifactReadResult {
  readonly taskId: TeamTaskId
  readonly executionId: TeamTaskExecutionId
  readonly path: string
  readonly sha256: string
  readonly totalBytes: number
  readonly byteOffset: number
  readonly content: string
  readonly nextByteOffset?: number
}

/** Latest filesystem and runtime recheck for one recorded result. */
export interface TeamTaskReuseCheck {
  readonly taskId: TeamTaskId
  readonly revision: number
  readonly checkedAt: number
  readonly validity: TeamTaskValidity
  readonly inputs: TeamFileReceipt[]
  readonly artifacts: TeamFileReceipt[]
  readonly environment?: TeamEnvironmentReceipt
  /** Original execution workspace label with current runtime; byte checks may use the immutable archive. */
  readonly artifactEnvironment?: TeamEnvironmentReceipt
}

/** Current validity of the retained result, distinct from task activity. */
export interface TeamTaskValidity {
  readonly reusable: boolean
  readonly reasons: string[]
}
