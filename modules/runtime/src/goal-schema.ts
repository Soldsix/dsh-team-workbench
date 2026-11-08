/** JSON validation shared by the Team goal writer and persisted event reader. */

import { z } from 'zod'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamExecutionScope, TeamGoalChange, TeamGoalDecision, TeamGoalProposal, TeamGoalSnapshot } from './goal-types.ts'

const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const text = z.string().trim().min(1)
const origin = text.refine((value) => {
  if (value === '*') return true
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      && !url.hostname.includes('*') && url.pathname === '/' && !url.search && !url.hash
  } catch (error: unknown) {
    if (error instanceof TypeError) return false
    throw error
  }
}, 'expected an HTTP(S) origin without path, credentials or wildcard host').transform(value => value === '*' ? value : new URL(value).origin)
/** Explicit paths, origins and opaque-execution choice shown in the human goal review. */
export const teamExecutionScopeSchema = z.object({
  readPaths: z.array(text), writePaths: z.array(text), webOrigins: z.array(origin),
  allowSearch: z.boolean(), allowUnrestrictedExecution: z.boolean(),
}).strict().refine(value => !value.allowUnrestrictedExecution
  || value.readPaths.includes('*') && value.writePaths.includes('*') && value.webOrigins.includes('*'), {
  message: 'pwsh/bash/run_code 等任意程序执行需要 readPaths、writePaths、webOrigins 三项都包含 * 并由用户确认；要保留路径和网络限制，请将 allowUnrestrictedExecution 设为 false 并使用受限原生工具',
}) satisfies z.ZodType<TeamExecutionScope>
const definition = z.object({
  objective: text,
  acceptanceCriteria: z.array(text).min(1),
  plan: text.optional(),
  scope: z.object({
    coverage: z.enum(['full', 'partial', 'task']),
    targets: z.array(text).min(1),
    allowedActions: z.array(text).min(1),
    excludedTargets: z.array(text),
    constraints: z.array(text),
    execution: teamExecutionScopeSchema.optional(),
  }).strict(),
}).strict()

/** Complete proposal content accepted at the model JSON boundary. */
export const teamGoalChangeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('replace'), definition }).strict(),
  z.object({ kind: z.literal('revoke'), reason: text }).strict(),
]) as z.ZodType<TeamGoalChange>

/** Exact durable proposal, including the goal revision the user will replace. */
export const teamGoalProposalSchema = z.object({
  revision: revision.min(1),
  baseRevision: revision,
  proposedBy: text.transform(value => brandString<SessionId>(value)),
  change: teamGoalChangeSchema,
}).strict() as z.ZodType<TeamGoalProposal>

/** User answer checkpoint; a rejection does not change the confirmed goal. */
export const teamGoalDecisionSchema = z.object({
  proposalRevision: revision.min(1),
  outcome: z.enum(['accepted', 'rejected']),
  comment: z.string(),
  decidedAt: revision,
  channel: z.literal('user-question'),
}).strict() satisfies z.ZodType<TeamGoalDecision>

/** Current confirmed goal, retained in the projection cache and client view. */
export const teamGoalSnapshotSchema = z.object({
  revision: revision.min(1),
  proposalRevision: revision.min(1),
  status: z.enum(['active', 'revoked']),
  definition,
  decidedAt: revision,
  revocationReason: text.optional(),
}).strict() as z.ZodType<TeamGoalSnapshot>

/** Optional additions keep pre-goal Team logs readable. */
export const teamGoalStateFields = {
  goal: teamGoalSnapshotSchema.optional(),
  goalProposal: teamGoalProposalSchema.optional(),
  goalDecision: teamGoalDecisionSchema.optional(),
}
