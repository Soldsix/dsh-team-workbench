/** Versioned plugin records encoded in the fields of an official log-only task event. */
import z from 'zod';
import type { TeamTaskSnapshot } from './types.ts';
declare const payloadSchema: z.ZodObject<{
    format: z.ZodLiteral<"dsh-team-event">;
    version: z.ZodLiteral<1>;
    type: z.ZodString;
    payload: z.ZodString;
}, z.core.$strict>;
/**
 * Encode coordination data without adding fields or variants to official Session event types.
 * @param type - Exact inner Team event name.
 * @param payload - Serialized inner payload, subsequently validated by its owning reader.
 * @returns reserved log-only record; it is never projected as a project task.
 */
export declare function portableTeamRecord(type: string, payload: string): TeamTaskSnapshot;
/**
 * Decode reserved records and leave ordinary task records to their existing reader.
 * @param task - Typed outer event value read from the Session.
 * @returns version-checked inner data, or undefined for an ordinary task.
 */
export declare function readPortableTeamRecord(task: TeamTaskSnapshot): z.infer<typeof payloadSchema> | undefined;
export {};
