/** SQLite writer lock; process exit releases the lock without deleting shared files. */
export declare class CoordinationLocks {
    private readonly root;
    private readonly waitMs;
    private readonly pollMs;
    private readonly owned;
    private closed;
    constructor(root: string, waitMs: number, pollMs: number);
    /** Hold one identity until disposal; another process cannot own the same identity. */
    own(key: string, signal?: AbortSignal): Promise<void>;
    /** Serialize a publication across cooperative processes; cancellation never steals another writer's lock. */
    publish<T>(workspace: string, signal: AbortSignal | undefined, operation: () => Promise<T>): Promise<T>;
    private connect;
    /** Release lifetime locks after queued Team writes have drained. */
    close(): void;
}
