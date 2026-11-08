/** Plugin-owned fresh Team reads when the Session catalog has no Team value. */
import { useSyncExternalStore } from 'react';
/**
 * Keep explicit fresh reads outside the Session catalog's ready-cache shortcut.
 * @param resolve - Find the root Session for a displayed descendant.
 * @param read - Read the authoritative projection without starting a model.
 * @returns refresh, React subscription, and disposal owned by the plugin.
 */
export function createTeamProjectionRecovery(resolve, read) {
    const values = new Map();
    const pending = new Map();
    const listeners = new Set();
    const lifetime = new AbortController();
    const subscribe = (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
    return {
        async refresh(id) {
            lifetime.signal.throwIfAborted();
            const root = resolve(id);
            const active = pending.get(root);
            if (active !== undefined)
                return active;
            const operation = read(root, lifetime.signal).then((value) => {
                lifetime.signal.throwIfAborted();
                if (value !== undefined)
                    values.set(root, value);
                for (const listener of listeners)
                    listener();
            }).finally(() => { pending.delete(root); });
            pending.set(root, operation);
            return operation;
        },
        useRecoveredTeam(id) {
            return useSyncExternalStore(subscribe, () => values.get(resolve(id)));
        },
        dispose() { lifetime.abort(); values.clear(); listeners.clear(); },
    };
}
