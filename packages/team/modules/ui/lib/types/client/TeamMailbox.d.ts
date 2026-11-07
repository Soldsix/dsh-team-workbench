import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { TeamMailboxOperations } from './mailbox-operations.ts';
import { NS } from './locales.ts';
type Locale = PropsLocale<typeof NS>;
/** Mailbox pagination is remote and sends message content only after selection. */
export declare function TeamMailbox({ sessionId, leadId, members, operations, t }: Locale & {
    readonly sessionId: SessionId;
    readonly leadId: SessionId;
    readonly members: readonly {
        id: SessionId;
        name: string;
    }[];
    readonly operations: TeamMailboxOperations;
}): import("react").JSX.Element;
export {};
