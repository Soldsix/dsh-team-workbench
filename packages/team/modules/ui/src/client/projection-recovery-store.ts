/** Plugin-owned fresh Team reads when the Session catalog has no Team value. */
import { useSyncExternalStore } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'

/** Plugin-owned fresh Team values and their React subscription lifetime. */
export interface TeamProjectionRecovery {
  /**
   * Refresh the owning root without starting a model request.
   * @param id - Displayed Session identity.
   * @returns completion of the coalesced read.
   */
  refresh(id: SessionId): Promise<void>
  /**
   * Subscribe to the fresh value for the displayed Session.
   * @param id - Displayed Session identity.
   * @returns recovered Team data when available.
   */
  useRecoveredTeam(id: SessionId): TeamProjection | undefined
  /** Abort pending reads and release stored values and subscribers. */
  dispose(): void
}

/**
 * Keep explicit fresh reads outside the Session catalog's ready-cache shortcut.
 * @param resolve - Find the root Session for a displayed descendant.
 * @param read - Read the authoritative projection without starting a model.
 * @returns refresh, React subscription, and disposal owned by the plugin.
 */
export function createTeamProjectionRecovery(
  resolve: (id: SessionId) => SessionId,
  read: (id: SessionId, signal: AbortSignal) => Promise<TeamProjection | undefined>,
): TeamProjectionRecovery {
  const values = new Map<SessionId, TeamProjection>()
  const pending = new Map<SessionId, Promise<void>>()
  const listeners = new Set<() => void>()
  const lifetime = new AbortController()
  const subscribe = (listener: () => void): (() => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
  return {
    async refresh(id: SessionId): Promise<void> {
      lifetime.signal.throwIfAborted()
      const root = resolve(id)
      const active = pending.get(root)
      if (active !== undefined) return active
      const operation = read(root, lifetime.signal).then((value) => {
        lifetime.signal.throwIfAborted()
        if (value !== undefined) values.set(root, value)
        for (const listener of listeners) listener()
      }).finally(() => { pending.delete(root) })
      pending.set(root, operation)
      return operation
    },
    useRecoveredTeam(id: SessionId): TeamProjection | undefined {
      return useSyncExternalStore(subscribe, () => values.get(resolve(id)))
    },
    dispose(): void { lifetime.abort(); values.clear(); listeners.clear() },
  }
}
