/** Current independent adviser findings beside a key task's acceptance record. */
import type { TeamAdviserDecision, TeamTaskView } from 'dsh-team-workbench/runtime/client';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
/**
 * Show the latest independent findings for the selected task execution.
 * @param props - Current task, saved adviser findings, and locale resolver.
 * @returns a compact review section for a dual-adviser task.
 */
export declare function AdviserFindings({ task, findings, t }: PropsLocale<typeof NS> & {
    readonly task: TeamTaskView;
    readonly findings?: readonly TeamAdviserDecision[] | undefined;
}): import("react").JSX.Element | null;
