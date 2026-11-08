import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { TeamTaskOperations } from './task-operations.ts';
import { NS } from './locales.ts';
/**
 * Read completed tasks only when the archive is opened, then recheck before reuse.
 * @param props - Selected Team, bounded Remote archive, and locale.
 * @returns one archive page and explicit validation results.
 */
export declare function TeamTaskArchive({ sessionId, operations, t }: PropsLocale<typeof NS> & {
    readonly sessionId: SessionId;
    readonly operations: TeamTaskOperations;
}): import("react").JSX.Element;
