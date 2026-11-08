/** Content-addressed copies of submitted files retained beyond member workspace edits. */

import { randomUUID } from 'node:crypto'
import { link, mkdir, open, realpath, unlink } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { TeamError } from './error.ts'
import { observeTaskFiles, readTaskReceiptText } from './task-receipts.ts'
import type { TeamEnvironmentReceipt, TeamFileReceipt } from './task-work-types.ts'

/** Preserves submitted bytes under their existing receipt digest without changing Session fields. */
export class TeamArtifactStore {
  /** @param root - Host-owned artifact directory outside writable member copies. */
  constructor(private readonly root: string) {}

  /**
   * Retain exact submitted bytes; an interrupted or changed source is never published.
   * @param environment - Canonical executor workspace.
   * @param receipts - Already observed artifact versions.
   * @param signal - Goal and caller cancellation.
   */
  async capture(environment: TeamEnvironmentReceipt, receipts: readonly TeamFileReceipt[], signal: AbortSignal): Promise<void> {
    if (receipts.length === 0) return
    await mkdir(this.root, { recursive: true })
    const archiveRoot = await realpath(this.root)
    for (const receipt of receipts) {
      signal.throwIfAborted()
      const source = await realpath(resolve(environment.workspaceRoot, receipt.path))
      const tail = relative(environment.workspaceRoot, source)
      if (isAbsolute(tail) || tail === '..' || tail.startsWith(`..${sep}`)) {
        throw new TeamError('artifact source leaves its workspace', 'TEAM_INVALID_ARGUMENT')
      }
      const temporary = join(archiveRoot, `${receipt.sha256}-${randomUUID()}.tmp`)
      const input = await open(source, 'r')
      try {
        const output = await open(temporary, 'wx')
        try {
          const buffer = Buffer.alloc(65_536)
          let position = 0
          while (true) {
            signal.throwIfAborted()
            const { bytesRead } = await input.read(buffer, 0, Math.min(buffer.length, receipt.bytes - position + 1), position)
            if (bytesRead === 0) break
            if (position + bytesRead > receipt.bytes) {
              throw new TeamError('artifact grew after observation', 'TEAM_TASK_EXECUTION_STALE')
            }
            let written = 0
            while (written < bytesRead) {
              written += (await output.write(buffer, written, bytesRead - written, position + written)).bytesWritten
            }
            position += bytesRead
          }
          if (position !== receipt.bytes) throw new TeamError('artifact shrank after observation', 'TEAM_TASK_EXECUTION_STALE')
          await output.sync()
        } finally {
          await output.close()
        }
        const [copied] = await observeTaskFiles({ ...environment, workspaceRoot: archiveRoot },
          [relative(archiveRoot, temporary)], 1, receipt.bytes, signal)
        if (copied?.sha256 !== receipt.sha256 || copied.bytes !== receipt.bytes) {
          throw new TeamError('artifact changed after observation', 'TEAM_TASK_EXECUTION_STALE')
        }
        try {
          await link(temporary, join(archiveRoot, receipt.sha256))
        } catch (error) {
          if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error
          const [existing] = await observeTaskFiles({ ...environment, workspaceRoot: archiveRoot },
            [receipt.sha256], 1, receipt.bytes, signal)
          if (existing?.sha256 !== receipt.sha256 || existing.bytes !== receipt.bytes) {
            throw new TeamError('stored artifact digest does not match its contents', 'TEAM_TASK_EXECUTION_STALE')
          }
        }
      } finally {
        await input.close()
        try {
          await unlink(temporary)
        } catch (error) {
          // Opening the temporary file may fail before it exists.
          if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
        }
      }
    }
  }

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
  async read(environment: TeamEnvironmentReceipt, receipt: TeamFileReceipt, offset: number,
    pageBytes: number, receiptBytes: number, signal: AbortSignal): Promise<string> {
    const stored = await this.stored(receipt)
    if (stored === undefined) return readTaskReceiptText(environment, receipt, offset, pageBytes, receiptBytes, signal)
    return readTaskReceiptText({ ...environment, workspaceRoot: stored.root }, { ...receipt, path: receipt.sha256 },
      offset, pageBytes, receiptBytes, signal)
  }

  /**
   * Verify retained submitted bytes independently of later member edits; older evidence uses its original files.
   * @param environment - Original execution workspace and runtime label.
   * @param receipts - Exact submitted versions in their recorded order.
   * @param maxPaths - Maximum receipt count.
   * @param maxBytes - Maximum cumulative verified bytes.
   * @param signal - Cancellation during verification.
   * @returns observed receipts under their logical project paths.
   */
  async verify(environment: TeamEnvironmentReceipt, receipts: readonly TeamFileReceipt[], maxPaths: number,
    maxBytes: number, signal: AbortSignal): Promise<TeamFileReceipt[]> {
    if (receipts.length > maxPaths) throw new TeamError(`task receipt has more than ${maxPaths} files`, 'TEAM_TASK_WORK_TOO_LARGE')
    let bytes = 0
    const result: TeamFileReceipt[] = []
    for (const receipt of receipts) {
      signal.throwIfAborted()
      bytes += receipt.bytes
      if (!Number.isSafeInteger(bytes) || bytes > maxBytes) throw new TeamError(`task receipts exceed ${maxBytes} bytes`, 'TEAM_TASK_WORK_TOO_LARGE')
      const stored = await this.stored(receipt)
      const [observed] = await observeTaskFiles(stored === undefined ? environment : { ...environment, workspaceRoot: stored.root },
        [stored === undefined ? receipt.path : receipt.sha256], 1, receipt.bytes, signal)
      if (observed === undefined) throw new TeamError('artifact receipt is missing', 'TEAM_TASK_EXECUTION_STALE')
      result.push({ ...observed, path: receipt.path })
    }
    return result
  }

  private async stored(receipt: TeamFileReceipt): Promise<{ root: string } | undefined> {
    let stored: string
    try {
      stored = await realpath(join(this.root, receipt.sha256))
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
      return undefined
    }
    const root = await realpath(this.root)
    if (stored !== join(root, receipt.sha256)) throw new TeamError('stored artifact is redirected', 'TEAM_INVALID_ARGUMENT')
    return { root }
  }
}
