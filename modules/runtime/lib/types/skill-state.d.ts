/** Pure validation and compact projection of durable member skill selections. */
import { z } from 'zod';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { TeamState } from './projection.ts';
import type { TeamSkillSelection, TeamSkillSelectionView } from './skill-types.ts';
/** Decoded instruction snapshot; the Host also checks the content digest before use. */
export declare const teamSelectedSkillSchema: z.ZodObject<{
    name: z.ZodString;
    digest: z.ZodString;
    purpose: z.ZodString;
    content: z.ZodString;
}, z.core.$strict>;
/** Whole durable selection decoded before its Team transition. */
export declare const teamSkillSelectionSchema: z.ZodObject<{
    memberId: z.ZodPipe<z.ZodString, z.ZodTransform<SessionId, string>>;
    selectedBy: z.ZodPipe<z.ZodString, z.ZodTransform<SessionId, string>>;
    revision: z.ZodNumber;
    goalRevision: z.ZodNumber;
    skills: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        digest: z.ZodString;
        purpose: z.ZodString;
        content: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** Compact wire metadata excludes the saved instruction text. */
export declare const teamSkillSelectionViewSchema: z.ZodObject<{
    memberId: z.ZodPipe<z.ZodString, z.ZodTransform<SessionId, string>>;
    revision: z.ZodNumber;
    goalRevision: z.ZodNumber;
    active: z.ZodBoolean;
    skills: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        digest: z.ZodString;
        purpose: z.ZodString;
        bytes: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>;
/**
 * Validate exact roster authorship and the next selection revision.
 * @param state - Team state preceding this selection.
 * @param selection - Fully decoded replacement.
 */
export declare function assertTeamSkillSelection(state: TeamState, selection: TeamSkillSelection): void;
/**
 * Build a detached metadata view without sending skill bodies to the client.
 * @param state - Current Team state used to check goal applicability.
 * @param selection - Saved member choice.
 * @returns Current selection metadata and whether its goal still applies.
 */
export declare function teamSkillSelectionView(state: TeamState, selection: TeamSkillSelection): TeamSkillSelectionView;
