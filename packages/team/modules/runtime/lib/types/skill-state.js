/** Pure validation and compact projection of durable member skill selections. */
import { z } from 'zod';
import { brandString } from '@deepseek-ai/dsh-brand';
const id = z.string().min(1).transform(value => brandString(value));
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
/** Decoded instruction snapshot; the Host also checks the content digest before use. */
export const teamSelectedSkillSchema = z.object({
    name: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    digest: z.string().regex(/^[a-f0-9]{64}$/u),
    purpose: z.string().trim().min(1),
    content: z.string().min(1).refine(value => !value.includes('\r'), 'skill content must use LF line endings'),
}).strict();
/** Whole durable selection decoded before its Team transition. */
export const teamSkillSelectionSchema = z.object({
    memberId: id, selectedBy: id, revision: revision.min(1), goalRevision: revision,
    skills: z.array(teamSelectedSkillSchema).refine(skills => new Set(skills.map(skill => skill.name)).size === skills.length, 'selected skill names must be unique'),
}).strict();
/** Compact wire metadata excludes the saved instruction text. */
export const teamSkillSelectionViewSchema = z.object({
    memberId: id, revision, goalRevision: revision, active: z.boolean(),
    skills: z.array(z.object({ name: z.string(), digest: z.string(), purpose: z.string(), bytes: revision }).strict()),
}).strict();
/**
 * Validate exact roster authorship and the next selection revision.
 * @param state - Team state preceding this selection.
 * @param selection - Fully decoded replacement.
 */
export function assertTeamSkillSelection(state, selection) {
    const target = state.members.find(member => member.id === selection.memberId);
    const previous = state.skillSelections?.find(value => value.memberId === selection.memberId);
    const initial = target?.phase === 'provisioning' && previous === undefined && selection.revision === 1;
    if (String(selection.memberId) !== state.id && target?.phase !== 'active' && !initial) {
        throw new Error('skill target must be active or receiving its initial provisioning choice');
    }
    if (String(selection.selectedBy) !== state.id) {
        if (!state.members.some(member => member.id === selection.selectedBy && member.phase === 'active')) {
            throw new Error('skill selector is not an active Team member');
        }
        if (selection.selectedBy !== selection.memberId && selection.selectedBy !== target?.parentId) {
            throw new Error('only the member, its direct parent, or Lead may select its skills');
        }
    }
    if (selection.revision !== (previous?.revision ?? 0) + 1)
        throw new Error('skill selection revision is not contiguous');
    if (state.goal?.status === 'revoked' || selection.goalRevision !== (state.goal?.revision ?? 0)) {
        throw new Error('skill selection does not belong to the current active goal');
    }
}
/**
 * Build a detached metadata view without sending skill bodies to the client.
 * @param state - Current Team state used to check goal applicability.
 * @param selection - Saved member choice.
 * @returns Current selection metadata and whether its goal still applies.
 */
export function teamSkillSelectionView(state, selection) {
    return {
        memberId: selection.memberId, revision: selection.revision, goalRevision: selection.goalRevision,
        active: state.goal?.status !== 'revoked' && selection.goalRevision === (state.goal?.revision ?? 0),
        skills: selection.skills.map(skill => ({ name: skill.name, digest: skill.digest, purpose: skill.purpose,
            bytes: new TextEncoder().encode(skill.content).length })),
    };
}
