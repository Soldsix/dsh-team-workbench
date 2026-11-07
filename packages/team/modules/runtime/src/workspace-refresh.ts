/** Refresh selected shared inputs without overwriting a member's edits. */
import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { z } from 'zod'
import type { MemberWorkspace } from './workspaces.ts'

const entry = z.union([z.object({ kind: z.literal('file'), sha256: z.string() }).strict(),
  z.object({ kind: z.literal('symlink'), target: z.string() }).strict()])
const manifestSchema = z.object({ version: z.literal(1), sharedRoot: z.string(), workspaceRoot: z.string(),
  entries: z.record(z.string(), entry), omittedDirectories: z.array(z.string()), readOnlySharedDirectories: z.array(z.string()),
  includedPaths: z.array(z.string()).optional(), includedOmittedPaths: z.array(z.string()).optional(),
}).strict()
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

/**
 * Materialize explicit input files and advance only their baseline entries.
 * @param sharedPath - Owning Lead workspace.
 * @param workspace - Inactive member's durable workspace record.
 * @param paths - Explicit existing relative input files, excluding directories and links.
 * @param maxBytes - Combined input byte budget.
 * @param signal - Goal and caller cancellation.
 * @returns files refreshed; all inputs are checked before the first publication.
 */
export async function refreshMemberInputs(sharedPath: string, workspace: MemberWorkspace, paths: readonly string[],
  maxBytes: number, signal: AbortSignal): Promise<string[]> {
  const sourceRoot = await realpath(sharedPath)
  const targetRoot = await realpath(workspace.cwd)
  const manifest = manifestSchema.parse(JSON.parse(await readFile(workspace.baselineManifestPath, 'utf8')))
  if (manifest.sharedRoot !== sourceRoot || manifest.workspaceRoot !== targetRoot
    || dirname(resolve(workspace.baselineManifestPath)) !== dirname(targetRoot)) throw new Error('workspace refresh baseline differs')
  if (paths.length === 0 || new Set(paths).size !== paths.length) throw new Error('refresh requires distinct existing input files')
  const files: { key: string; bytes: Buffer; digest: string; target: string; previous?: string }[] = []
  let total = 0
  for (const path of paths) {
    signal.throwIfAborted()
    const key = relative(sourceRoot, resolve(sourceRoot, path)).split(sep).join('/')
    if (isAbsolute(path) || key === '' || key === '..' || key.startsWith('../')) throw new Error('refresh input must be project-relative')
    const source = resolve(sourceRoot, path)
    const target = resolve(targetRoot, key)
    if (manifest.readOnlySharedDirectories.some(name => key === name || key.startsWith(`${name}/`))) {
      throw new Error('linked dependencies cannot be refreshed as writable inputs')
    }
    for (const [root, absolute] of [[sourceRoot, source], [targetRoot, target]] as const) {
      let parent = dirname(absolute)
      while (parent !== root) {
        try { if ((await lstat(parent)).isSymbolicLink()) throw new Error('refresh cannot traverse a symbolic link') }
        catch (error: unknown) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error }
        const next = dirname(parent)
        if (next === parent) throw new Error('refresh escaped workspace')
        parent = next
      }
    }
    const info = await lstat(source)
    if (!info.isFile()) throw new Error(`refresh selects regular input files only: ${key}`)
    total += info.size
    if (total > maxBytes) throw new Error(`refresh exceeds ${maxBytes} bytes`)
    const bytes = await readFile(source, { signal })
    let previous: string | undefined
    try {
      if (!(await lstat(target)).isFile()) throw new Error(`refresh target is not a regular file: ${key}`)
      previous = hash(await readFile(target, { signal }))
    } catch (error: unknown) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error }
    const baseline = manifest.entries[key]
    if (previous !== undefined && (baseline?.kind !== 'file' || baseline.sha256 !== previous)) {
      throw new Error(`refresh conflict: member edits retained at ${key}; submit or merge them first`)
    }
    if (previous === undefined && baseline !== undefined) throw new Error(`refresh conflict: member removed ${key}`)
    files.push({ key, bytes, digest: hash(bytes), target, ...previous === undefined ? {} : { previous } })
  }
  for (const file of files) {
    signal.throwIfAborted()
    if (hash(await readFile(resolve(sourceRoot, file.key), { signal })) !== file.digest) throw new Error(`refresh source changed: ${file.key}`)
    await mkdir(dirname(file.target), { recursive: true })
    const temp = `${file.target}.${randomUUID()}.team-refresh`
    try { await writeFile(temp, file.bytes, { flag: 'wx', mode: 0o600 }); signal.throwIfAborted(); await rename(temp, file.target) }
    finally { await rm(temp, { force: true }) }
    manifest.entries[file.key] = { kind: 'file', sha256: file.digest }
    const checkpoint = `${workspace.baselineManifestPath}.${randomUUID()}.tmp`
    try { await writeFile(checkpoint, JSON.stringify(manifest), { flag: 'wx', mode: 0o600 }); await rename(checkpoint, workspace.baselineManifestPath) }
    finally { await rm(checkpoint, { force: true }) }
  }
  return files.map(file => file.key)
}
