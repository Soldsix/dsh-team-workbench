/** Cross-process exclusion for a Team owner and cooperative workspace publication. */
import { DatabaseSync } from 'node:sqlite';
import { mkdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
/** SQLite writer lock; process exit releases the lock without deleting shared files. */
export class CoordinationLocks {
    root;
    waitMs;
    pollMs;
    owned = new Map();
    closed = false;
    constructor(root, waitMs, pollMs) {
        this.root = root;
        this.waitMs = waitMs;
        this.pollMs = pollMs;
    }
    /** Hold one identity until disposal; another process cannot own the same identity. */
    async own(key, signal) {
        if (this.closed)
            throw new Error('Team coordination is closed');
        if (this.owned.has(key))
            return;
        await mkdir(this.root, { recursive: true });
        signal?.throwIfAborted();
        if (this.closed)
            throw new Error('Team coordination is closed');
        // Recheck after mkdir: concurrent in-process callers share this lifetime lock.
        if (this.owned.has(key))
            return;
        const db = this.connect(key);
        try {
            db.exec('BEGIN IMMEDIATE');
        }
        catch (error) {
            db.close();
            throw new Error('Another DSH process owns this Team; stop that owner before resuming', { cause: error });
        }
        this.owned.set(key, db);
    }
    /** Serialize a publication across cooperative processes; cancellation never steals another writer's lock. */
    async publish(workspace, signal, operation) {
        const canonical = await realpath(workspace);
        const key = 'publish:' + (process.platform === 'win32' ? canonical.toLowerCase() : canonical);
        await mkdir(this.root, { recursive: true });
        const db = this.connect(key);
        const deadline = performance.now() + this.waitMs;
        try {
            for (;;) {
                signal?.throwIfAborted();
                if (this.closed)
                    throw new Error('Team coordination is closed');
                try {
                    db.exec('BEGIN IMMEDIATE');
                    break;
                }
                catch (error) {
                    if (!(error instanceof Error) || !('errcode' in error) || error.errcode !== 5)
                        throw error;
                    if (performance.now() >= deadline)
                        throw new Error('Workspace publication is busy; retry after the current publication settles');
                    await delay(Math.min(this.pollMs, Math.max(1, deadline - performance.now())), undefined, { signal });
                }
            }
            signal?.throwIfAborted();
            return await operation();
        }
        finally {
            db.close();
        }
    }
    connect(key) {
        const db = new DatabaseSync(join(this.root, createHash('sha256').update(key).digest('hex') + '.sqlite'));
        db.exec('PRAGMA busy_timeout=0');
        // The lock database holds no project or Session data; its write transaction is the lease.
        return db;
    }
    /** Release lifetime locks after queued Team writes have drained. */
    close() {
        this.closed = true;
        for (const db of this.owned.values())
            db.close();
        this.owned.clear();
    }
}
