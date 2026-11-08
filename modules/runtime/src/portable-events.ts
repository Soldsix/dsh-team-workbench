/** Versioned plugin records encoded in the fields of an official log-only task event. */
import z from 'zod'
import { TeamTaskId } from './types.ts'
import type { TeamTaskSnapshot } from './types.ts'

const marker = '__dsh_workbench_event__'
const subject = 'dsh-workbench:portable-event'
const payloadSchema = z.object({ format: z.literal('dsh-team-event'), version: z.literal(1),
  type: z.string().min(1), payload: z.string() }).strict()
const recordSchema = z.object({ id: z.literal(marker), subject: z.literal(subject), revision: z.literal(1),
  status: z.literal('deleted'), description: z.string(), blockedBy: z.array(z.never()), writeScopes: z.array(z.never()) }).strict()

/**
 * Encode coordination data without adding fields or variants to official Session event types.
 * @param type - Exact inner Team event name.
 * @param payload - Serialized inner payload, subsequently validated by its owning reader.
 * @returns reserved log-only record; it is never projected as a project task.
 */
export function portableTeamRecord(type: string, payload: string): TeamTaskSnapshot {
  return { id: TeamTaskId(marker), revision: 1, subject, status: 'deleted', blockedBy: [], writeScopes: [],
    description: JSON.stringify({ format: 'dsh-team-event', version: 1, type, payload }) }
}

/**
 * Decode reserved records and leave ordinary task records to their existing reader.
 * @param task - Typed outer event value read from the Session.
 * @returns version-checked inner data, or undefined for an ordinary task.
 */
export function readPortableTeamRecord(task: TeamTaskSnapshot): z.infer<typeof payloadSchema> | undefined {
  if (task.id !== marker) return undefined
  const record = recordSchema.parse(task)
  return payloadSchema.parse(JSON.parse(record.description))
}
