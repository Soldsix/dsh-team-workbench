/** Authoritative expert catalog schemas and storage declaration. */
import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { TeamExpertDefinition, TeamExpertId, TeamExpertRecord } from './expert-types.ts'

/** Profile validation shared by model input parsing and durable catalog reads. */
export const expertDefinitionSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).max(200),
  persona: z.string().trim().min(1),
  instructions: z.string(),
  skills: z.array(z.string().trim().min(1)),
  modelProvider: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  reasoningEffort: z.string().trim().min(1).optional(),
}).strict().refine(
  value => (value.modelProvider === undefined) === (value.model === undefined),
  { message: 'modelProvider and model must be supplied together' },
) as z.ZodType<TeamExpertDefinition>

const expertRecordSchema = z.object({
  definition: expertDefinitionSchema,
  revision: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  archived: z.boolean(),
  ownerTeamId: z.string().min(1).transform(SessionId).optional(),
  ownerMemberId: z.string().min(1).transform(SessionId).optional(),
}).strict().refine(value => (value.ownerTeamId === undefined) === (value.ownerMemberId === undefined), {
  message: 'expert ownership requires both Team and member identities',
}) as z.ZodType<TeamExpertRecord>

/** Personal expert catalog; Team logs own the member-to-expert references. */
export const teamExpertDomainSpec = defineDomain({
  name: 'team_experts',
  version: 1,
  tables: { experts: domainTable<TeamExpertId, TeamExpertRecord>(expertRecordSchema) },
})
