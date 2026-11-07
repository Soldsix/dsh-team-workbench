/** One-shot Team change waiters independent of durable state projection. */

import type { SessionId } from '@deepseek-ai/dsh-session'
import type { TeamId, TeamWaitResult } from './types.ts'
import { errorMessage, TeamError } from './error.ts'

interface Waiter {
  readonly resolve: () => void
}

/** Owns current Team change waiters and releases each at most once. */
export class TeamActivity {
  private readonly waiters = new Map<TeamId, Set<Waiter>>()
  private readonly waiting = new Map<TeamId, Map<SessionId, number>>()
  private closed = false

  /**
   * Wait for one later Team-domain or member-status change.
   * @param id - Team whose next edge wakes the caller.
   * @param callerId - exact member whose turn is parked in this wait.
   * @param timeoutMs - bounded wait duration from ten seconds through one hour.
   * @param signal - caller cancellation for this wait only.
   * @returns whether the wait ended by timeout.
   */
  async wait(id: TeamId, callerId: SessionId, timeoutMs: number, signal: AbortSignal): Promise<TeamWaitResult> {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10_000 || timeoutMs > 3_600_000) {
      throw new TeamError('timeoutMs must be an integer from 10000 through 3600000', 'TEAM_INVALID_TIMEOUT')
    }
    signal.throwIfAborted()
    if (this.closed) return { timedOut: false }
    let waiting = this.waiting.get(id)
    if (waiting === undefined) {
      waiting = new Map()
      this.waiting.set(id, waiting)
    }
    waiting.set(callerId, (waiting.get(callerId) ?? 0) + 1)
    const changed = await new Promise<boolean>((resolve, reject) => {
      let waiters = this.waiters.get(id)
      if (waiters === undefined) {
        waiters = new Set()
        this.waiters.set(id, waiters)
      }
      let settled = false
      const finish = (settle: () => void): void => {
        /* v8 ignore next -- timeout, abort, and notification may race after one winner removes the others. */
        if (settled) return
        settled = true
        clearTimeout(timer)
        signal.removeEventListener('abort', onAbort)
        waiters.delete(waiter)
        if (waiters.size === 0) this.waiters.delete(id)
        const count = waiting.get(callerId)
        if (count === 1) {
          waiting.delete(callerId)
          if (waiting.size === 0) this.waiting.delete(id)
          if (!this.closed) this.notify(id)
        } else if (count !== undefined) {
          waiting.set(callerId, count - 1)
        }
        settle()
      }
      const onAbort = (): void => {
        finish(() => {
          const reason: unknown = signal.reason
          reject(reason instanceof Error
            ? reason
            : new TeamError(`wait_agent aborted: ${errorMessage(reason)}`, 'TEAM_WAIT_ABORTED'))
        })
      }
      const waiter: Waiter = {
        resolve: () => {
          finish(() => { resolve(true) })
        },
      }
      waiters.add(waiter)
      const timer = setTimeout(() => { finish(() => { resolve(false) }) }, timeoutMs)
      signal.addEventListener('abort', onAbort, { once: true })
      // AbortSignal does not replay an abort that wins between the pre-check and listener registration.
      /* v8 ignore next -- requires an abort in the synchronous gap between the pre-check and listener registration. */
      if (signal.aborted) onAbort()
    })
    return { timedOut: !changed }
  }

  /**
   * Whether one exact member currently owns at least one active wait lease.
   * @param id - Team whose wait leases are inspected.
   * @param memberId - Exact member whose lease is checked.
   * @returns whether that member currently waits.
   */
  isWaiting(id: TeamId, memberId: SessionId): boolean {
    return this.waiting.get(id)?.has(memberId) ?? false
  }

  /**
   * Detached member ids parked in wait calls for Team diagnostics.
   * @param id - Team whose waiters are listed.
   * @returns member ids with active wait leases.
   */
  waitingMembers(id: TeamId): SessionId[] {
    return [...(this.waiting.get(id)?.keys() ?? [])]
  }

  /**
   * Wake and remove every current waiter for one Team.
   * @param id - Team whose current waiters observe the change.
   */
  notify(id: TeamId): void {
    const waiters = this.waiters.get(id)
    if (waiters === undefined) return
    this.waiters.delete(id)
    for (const waiter of waiters) waiter.resolve()
  }

  /** Close admission and wake every current waiter during runtime disposal. */
  close(): void {
    this.closed = true
    for (const waiters of this.waiters.values()) {
      for (const waiter of waiters) waiter.resolve()
    }
    this.waiters.clear()
    this.waiting.clear()
  }
}
