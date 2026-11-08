/** Host-observed workspace files and local runtime values for task plans and results. */
import type { TeamEnvironmentReceipt, TeamFileReceipt } from './task-work-types.ts';
/**
 * Observe the local runtime without treating a caller's version label as a measurement.
 * @param cwd - Session workspace root.
 * @returns current canonical root and runtime identity.
 */
export declare function observeTaskEnvironment(cwd: string): Promise<TeamEnvironmentReceipt>;
/**
 * Hash regular workspace files with bounded count and total bytes.
 * @param environment - canonical workspace root observed for this operation.
 * @param paths - user-declared relative file paths.
 * @param maxPaths - configured maximum number of paths.
 * @param maxBytes - configured maximum cumulative file bytes.
 * @param signal - aborts reads before recording an incomplete receipt.
 * @returns host-observed receipts in the supplied order.
 */
export declare function observeTaskFiles(environment: TeamEnvironmentReceipt, paths: readonly string[], maxPaths: number, maxBytes: number, signal: AbortSignal): Promise<TeamFileReceipt[]>;
/**
 * Read a bounded UTF-8 page only while its recorded receipt still matches.
 * @param environment - Recorded executor workspace.
 * @param receipt - Submitted file version; arbitrary files are not accepted.
 * @param byteOffset - Byte position returned by an earlier page, or zero.
 * @param pageBytes - Maximum source bytes retained for this page.
 * @param receiptBytes - Maximum bytes hashed during verification.
 * @param signal - Cancellation during verification and reads.
 * @returns decoded text without an incomplete trailing UTF-8 character.
 */
export declare function readTaskReceiptText(environment: TeamEnvironmentReceipt, receipt: TeamFileReceipt, byteOffset: number, pageBytes: number, receiptBytes: number, signal: AbortSignal): Promise<string>;
