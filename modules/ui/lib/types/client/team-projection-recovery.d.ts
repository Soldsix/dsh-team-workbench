import type { SessionId } from '@deepseek-ai/dsh-session/types';
type RecoveryState = 'idle' | 'loading' | 'settled' | 'error';
/**
 * Request a missing Team projection when its view is opened, with an explicit fresh retry.
 * @param sessionId - Conversation whose root Team should be loaded.
 * @param active - Whether the Team view is visible.
 * @param missing - Whether the shared Session store lacks its Team value.
 * @param refresh - Projection reader supplied by the browser plugin.
 * @returns loading state and a retry action for a missing value.
 */
export declare function useTeamProjectionRecovery(sessionId: SessionId, active: boolean, missing: boolean, refresh: (sessionId: SessionId, force?: boolean) => Promise<void>): {
    readonly state: RecoveryState;
    readonly retry: () => void;
};
export {};
