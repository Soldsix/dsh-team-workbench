/** Content-addressed copies of submitted files retained beyond member workspace edits. */
import type { TeamEnvironmentReceipt, TeamFileReceipt } from './task-work-types.ts';
/** Preserves submitted bytes under their existing receipt digest without changing Session fields. */
export declare class TeamArtifactStore {
    private readonly root;
    /** @param root - Host-owned artifact directory outside writable member copies. */
    constructor(root: string);
    /**
     * Retain exact submitted bytes; an interrupted or changed source is never published.
     * @param environment - Canonical executor workspace.
     * @param receipts - Already observed artifact versions.
     * @param signal - Goal and caller cancellation.
     */
    capture(environment: TeamEnvironmentReceipt, receipts: readonly TeamFileReceipt[], signal: AbortSignal): Promise<void>;
    /**
     * Read the retained version, falling back to verified original files for older submissions.
     * @param environment - Original executor environment used for legacy receipts.
     * @param receipt - Authorized task receipt.
     * @param offset - Previously returned byte offset.
     * @param pageBytes - Maximum retained page bytes.
     * @param receiptBytes - Maximum verification bytes.
     * @param signal - Cancellation during reads.
     * @returns verified UTF-8 text from the submitted version.
     */
    read(environment: TeamEnvironmentReceipt, receipt: TeamFileReceipt, offset: number, pageBytes: number, receiptBytes: number, signal: AbortSignal): Promise<string>;
    /**
     * Verify retained submitted bytes independently of later member edits; older evidence uses its original files.
     * @param environment - Original execution workspace and runtime label.
     * @param receipts - Exact submitted versions in their recorded order.
     * @param maxPaths - Maximum receipt count.
     * @param maxBytes - Maximum cumulative verified bytes.
     * @param signal - Cancellation during verification.
     * @returns observed receipts under their logical project paths.
     */
    verify(environment: TeamEnvironmentReceipt, receipts: readonly TeamFileReceipt[], maxPaths: number, maxBytes: number, signal: AbortSignal): Promise<TeamFileReceipt[]>;
    private stored;
}
