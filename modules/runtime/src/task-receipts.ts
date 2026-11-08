/** Host-observed workspace files and local runtime values for task plans and results. */

import { createHash } from 'node:crypto'
import { open, realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { TeamError } from './error.ts'
import type { TeamEnvironmentReceipt, TeamFileReceipt } from './task-work-types.ts'
import { writeScope } from './validation.ts'

/**
 * Observe the local runtime without treating a caller's version label as a measurement.
 * @param cwd - Session workspace root.
 * @returns current canonical root and runtime identity.
 */
export async function observeTaskEnvironment(cwd: string): Promise<TeamEnvironmentReceipt> {
  return { workspaceRoot: await realpath(cwd), platform: process.platform,
    arch: process.arch, nodeVersion: process.version }
}

/**
 * Hash regular workspace files with bounded count and total bytes.
 * @param environment - canonical workspace root observed for this operation.
 * @param paths - user-declared relative file paths.
 * @param maxPaths - configured maximum number of paths.
 * @param maxBytes - configured maximum cumulative file bytes.
 * @param signal - aborts reads before recording an incomplete receipt.
 * @returns host-observed receipts in the supplied order.
 */
export async function observeTaskFiles(
  environment: TeamEnvironmentReceipt, paths: readonly string[], maxPaths: number, maxBytes: number, signal: AbortSignal,
): Promise<TeamFileReceipt[]> {
  if (paths.length > maxPaths) throw new TeamError(`task receipt has more than ${maxPaths} files`, 'TEAM_TASK_WORK_TOO_LARGE')
  const seen = new Set<string>()
  const receipts: TeamFileReceipt[] = []
  let totalBytes = 0
  for (const value of paths) {
    signal.throwIfAborted()
    const path = writeScope(value)
    if (seen.has(path)) throw new TeamError(`duplicate task receipt path ${path}`, 'TEAM_INVALID_ARGUMENT')
    seen.add(path)
    const target = await realpath(resolve(environment.workspaceRoot, path))
    const within = relative(environment.workspaceRoot, target)
    if (isAbsolute(within) || within === '..' || within.startsWith(`..${sep}`)) {
      throw new TeamError(`task receipt path leaves workspace: ${path}`, 'TEAM_INVALID_ARGUMENT')
    }
    const handle = await open(target, 'r')
    try {
      const before = await handle.stat()
      if (!before.isFile()) throw new TeamError(`task receipt path is not a regular file: ${path}`, 'TEAM_INVALID_ARGUMENT')
      totalBytes += before.size
      if (!Number.isSafeInteger(totalBytes) || totalBytes > maxBytes) {
        throw new TeamError(`task receipts exceed ${maxBytes} bytes`, 'TEAM_TASK_WORK_TOO_LARGE')
      }
      const hash = createHash('sha256')
      let readBytes = 0
      for await (const chunk of handle.createReadStream({ autoClose: false, signal }) as AsyncIterable<Buffer>) {
        readBytes += chunk.length
        if (!Number.isSafeInteger(readBytes) || totalBytes - before.size + readBytes > maxBytes) {
          throw new TeamError(`task receipts exceed ${maxBytes} bytes`, 'TEAM_TASK_WORK_TOO_LARGE')
        }
        hash.update(chunk)
      }
      const after = await handle.stat()
      const currentPath = await realpath(resolve(environment.workspaceRoot, path))
      const current = await stat(currentPath)
      signal.throwIfAborted()
      if (before.size !== readBytes || before.size !== after.size || before.mtimeMs !== after.mtimeMs
        || before.ctimeMs !== after.ctimeMs || before.dev !== after.dev || before.ino !== after.ino
        || currentPath !== target || before.dev !== current.dev || before.ino !== current.ino
        || before.size !== current.size || before.mtimeMs !== current.mtimeMs || before.ctimeMs !== current.ctimeMs) {
        throw new TeamError(`task receipt file changed while reading: ${path}`, 'TEAM_TASK_EXECUTION_STALE')
      }
      receipts.push({ path, bytes: before.size, sha256: hash.digest('hex') })
    } finally {
      await handle.close()
    }
  }
  return receipts
}

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
export async function readTaskReceiptText(
  environment: TeamEnvironmentReceipt, receipt: TeamFileReceipt, byteOffset: number, pageBytes: number,
  receiptBytes: number, signal: AbortSignal,
): Promise<string> {
  if (!Number.isSafeInteger(byteOffset) || byteOffset < 0 || byteOffset > receipt.bytes) {
    throw new TeamError('byte_offset must be within the submitted artifact; use nextByteOffset from the previous page', 'TEAM_INVALID_ARGUMENT')
  }
  const check = async (): Promise<void> => {
    const [current] = await observeTaskFiles(environment, [receipt.path], 1, receiptBytes, signal)
    if (current?.sha256 !== receipt.sha256 || current.bytes !== receipt.bytes) {
      throw new TeamError('submitted artifact changed; request a new submission instead of reviewing this file', 'TEAM_TASK_EXECUTION_STALE')
    }
  }
  await check()
  const target = await realpath(resolve(environment.workspaceRoot, receipt.path))
  const tail = relative(environment.workspaceRoot, target)
  if (isAbsolute(tail) || tail === '..' || tail.startsWith(`..${sep}`)) {
    throw new TeamError('artifact leaves its recorded workspace', 'TEAM_INVALID_ARGUMENT')
  }
  const handle = await open(target, 'r')
  let content: string
  try {
    const buffer = Buffer.alloc(Math.min(pageBytes, receipt.bytes - byteOffset))
    let count = 0
    while (count < buffer.length) {
      signal.throwIfAborted()
      const result = await handle.read(buffer, count, buffer.length - count, byteOffset + count)
      if (result.bytesRead === 0) break
      count += result.bytesRead
    }
    const page = buffer.subarray(0, count)
    if (page.includes(0)) throw new TeamError('artifact is binary; this operation reads UTF-8 text only', 'TEAM_INVALID_ARGUMENT')
    try {
      content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
        .decode(page, { stream: byteOffset + count < receipt.bytes })
    } catch (error: unknown) {
      throw new TeamError('artifact page is not valid UTF-8; use the previous nextByteOffset or a text artifact', 'TEAM_INVALID_ARGUMENT', { cause: error })
    }
  } finally {
    await handle.close()
  }
  await check()
  signal.throwIfAborted()
  return content
}
