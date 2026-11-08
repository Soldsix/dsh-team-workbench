/** Saved skill choices for one member, without transferring instruction bodies. */
import type { TeamProjection } from '@dsh-workbench/team-runtime/client';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
type Props = PropsLocale<typeof NS> & {
    selection: NonNullable<TeamProjection['skillSelections']>[number] | undefined;
};
/**
 * Display a member's selected methods and whether they match the current goal.
 * @param props - Compact saved selection and localized text.
 * @returns skill purposes and expandable version metadata, without starting work.
 */
export declare function MemberSkills({ selection, t }: Props): import("react").JSX.Element;
export {};
