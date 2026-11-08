import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { TeamProjection } from 'dsh-team-workbench/runtime/client';
/** Plugin-owned fresh Team values and their React subscription lifetime. */
export interface TeamProjectionRecovery {
    /**
     * Refresh the owning root without starting a model request.
     * @param id - Displayed Session identity.
     * @returns completion of the coalesced read.
     */
    refresh(id: SessionId): Promise<void>;
    /**
     * Subscribe to the fresh value for the displayed Session.
     * @param id - Displayed Session identity.
     * @returns recovered Team data when available.
     */
    useRecoveredTeam(id: SessionId): TeamProjection | undefined;
    /** Abort pending reads and release stored values and subscribers. */
    dispose(): void;
}
/**
 * Keep explicit fresh reads outside the Session catalog's ready-cache shortcut.
 * @param resolve - Find the root Session for a displayed descendant.
 * @param read - Read the authoritative projection without starting a model.
 * @returns refresh, React subscription, and disposal owned by the plugin.
 */
export declare function createTeamProjectionRecovery(resolve: (id: SessionId) => SessionId, read: (id: SessionId, signal: AbortSignal) => Promise<TeamProjection | undefined>): TeamProjectionRecovery;
