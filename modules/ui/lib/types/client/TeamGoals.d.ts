import type { TeamGoalReview } from 'dsh-team-workbench/runtime/client';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { TeamGoalOperations } from './goal-operations.ts';
import { NS } from './locales.ts';
type Locale = PropsLocale<typeof NS>;
/** Projection records and user-operated changes for one Team Lead. */
export type TeamGoalsProps = Locale & {
    readonly sessionId: SessionId;
    readonly state: TeamGoalReview;
    readonly operations: TeamGoalOperations;
    /** Open the conversation composer that owns the native review card. */
    readonly openReview: () => void;
};
/**
 * Edit complete proposals while retaining the confirmed values and concurrent drafts.
 * @param props - Lead identity, live projection, Remote operations, and localized copy.
 * @returns goal status, scope details, and native human review controls.
 */
export declare function TeamGoals({ sessionId, state, operations, openReview, t }: TeamGoalsProps): import("react").JSX.Element;
export {};
