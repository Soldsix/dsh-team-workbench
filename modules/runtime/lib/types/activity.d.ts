/** One-shot Team change waiters independent of durable state projection. */
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { TeamId, TeamWaitResult } from './types.ts';
/** Owns current Team change waiters and releases each at most once. */
export declare class TeamActivity {
    private readonly waiters;
    private readonly waiting;
    private closed;
    /**
     * Wait for one later Team-domain or member-status change.
     * @param id - Team whose next edge wakes the caller.
     * @param callerId - exact member whose turn is parked in this wait.
     * @param timeoutMs - bounded wait duration from ten seconds through one hour.
     * @param signal - caller cancellation for this wait only.
     * @returns whether the wait ended by timeout.
     */
    wait(id: TeamId, callerId: SessionId, timeoutMs: number, signal: AbortSignal): Promise<TeamWaitResult>;
    /**
     * Whether one exact member currently owns at least one active wait lease.
     * @param id - Team whose wait leases are inspected.
     * @param memberId - Exact member whose lease is checked.
     * @returns whether that member currently waits.
     */
    isWaiting(id: TeamId, memberId: SessionId): boolean;
    /**
     * Detached member ids parked in wait calls for Team diagnostics.
     * @param id - Team whose waiters are listed.
     * @returns member ids with active wait leases.
     */
    waitingMembers(id: TeamId): SessionId[];
    /**
     * Wake and remove every current waiter for one Team.
     * @param id - Team whose current waiters observe the change.
     */
    notify(id: TeamId): void;
    /** Close admission and wake every current waiter during runtime disposal. */
    close(): void;
}
