import { afterEach, beforeEach, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, readlink, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, sep } from 'node:path'
import { checkAutomaticWorkspaceSize, createMemberWorkspace, integrateMemberWorkspace } from '../src/workspaces.ts'
import { refreshMemberInputs } from '../src/workspace-refresh.ts'

let root: string
let shared: string
let store: string
const limits = { maxFiles: 20, maxBytes: 4096 }

async function publish(workspace: Awaited<ReturnType<typeof createMemberWorkspace>>, paths: string[], bounds = limits) {
  const publication = await Promise.all(paths.map(async path => {
    const bytes = await readFile(join(workspace.cwd, path))
    return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
  }))
  return integrateMemberWorkspace(shared, workspace, { ...bounds, publication })
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'dsh-team-workspaces-'))
  shared = join(root, 'shared')
  store = join(root, 'store')
  await mkdir(shared)
  await mkdir(store)
})

async function cleanupPath(path: string) {
  const canonical = await realpath(path)
  const rel = relative(await realpath(tmpdir()), canonical)
  if (rel === '' || isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error('test cleanup escaped the temporary root')
  return canonical
}

afterEach(async () => {
  await rm(await cleanupPath(root), { recursive: true, force: true })
})

it('rejects cleaning the temporary directory itself or its ancestor', async () => {
  await expect(cleanupPath(tmpdir())).rejects.toThrow('test cleanup escaped the temporary root')
  await expect(cleanupPath(join(tmpdir(), '..'))).rejects.toThrow('test cleanup escaped the temporary root')
})

it('publishes only accepted hashes and preserves another member file and unsubmitted scratch', async () => {
  await writeFile(join(shared, 'other.txt'), 'other member result')
  const workspace = await createMemberWorkspace(shared, store, limits)
  await rm(join(workspace.cwd, 'other.txt'))
  await writeFile(join(workspace.cwd, 'scratch.txt'), 'not submitted')
  await writeFile(join(workspace.cwd, 'accepted.txt'), 'accepted')
  const publication = [{ path: 'accepted.txt', bytes: 8, sha256: createHash('sha256').update('accepted').digest('hex') }]
  expect(await integrateMemberWorkspace(shared, workspace, { ...limits, publication })).toEqual({ paths: ['accepted.txt'] })
  expect(await readFile(join(shared, 'other.txt'), 'utf8')).toBe('other member result')
  await expect(readFile(join(shared, 'scratch.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
  await writeFile(join(workspace.cwd, 'accepted.txt'), 'tampered')
  await expect(integrateMemberWorkspace(shared, workspace, { ...limits, publication })).rejects.toThrow('changed or is missing')
  expect(await readFile(join(shared, 'accepted.txt'), 'utf8')).toBe('accepted')
})

it('never infers deletion from an absent member file', async () => {
  await writeFile(join(shared, 'keep.txt'), 'preserved')
  const workspace = await createMemberWorkspace(shared, store, limits)
  await rm(join(workspace.cwd, 'keep.txt'))
  await expect(integrateMemberWorkspace(shared, workspace, limits)).rejects.toThrow('requires independently accepted artifact receipts')
  expect(await readFile(join(shared, 'keep.txt'), 'utf8')).toBe('preserved')
})

it('refreshes explicit input versions without replacing the member or overwriting its work', async () => {
  await writeFile(join(shared, 'input.txt'), 'v1')
  const workspace = await createMemberWorkspace(shared, store, limits)
  await writeFile(join(shared, 'input.txt'), 'v2')
  await writeFile(join(shared, 'next.txt'), 'new input')
  expect(await refreshMemberInputs(shared, workspace, ['input.txt', 'next.txt'], 100, new AbortController().signal))
    .toEqual(['input.txt', 'next.txt'])
  expect(await readFile(join(workspace.cwd, 'input.txt'), 'utf8')).toBe('v2')
  await writeFile(join(workspace.cwd, 'input.txt'), 'member work')
  await writeFile(join(shared, 'input.txt'), 'v3')
  await expect(refreshMemberInputs(shared, workspace, ['input.txt'], 100, new AbortController().signal)).rejects.toThrow('member edits retained')
  expect(await readFile(join(workspace.cwd, 'input.txt'), 'utf8')).toBe('member work')
  await expect(refreshMemberInputs(shared, workspace, ['../outside.txt'], 100, new AbortController().signal)).rejects.toThrow('project-relative')
})

it('rejects an oversized automatic copy before hashing or reserving a member', async () => {
  await mkdir(join(shared, '.cache'))
  await writeFile(join(shared, '.cache', 'ignored.bin'), 'long cache data')
  await writeFile(join(shared, 'first.txt'), 'first')
  await writeFile(join(shared, 'second.txt'), 'second')
  await expect(checkAutomaticWorkspaceSize(shared, {
    maxFiles: 1, maxBytes: 100, omittedDirectories: ['.cache'],
  })).rejects.toThrow(/Pass task-specific project-relative working_paths/u)
  await expect(checkAutomaticWorkspaceSize(shared, {
    maxFiles: 2, maxBytes: 12, omittedDirectories: ['.cache'],
  })).resolves.toBeUndefined()
})

it('keeps member edits private and rejects a stale second integration', async () => {
  await writeFile(join(shared, 'same.txt'), 'base')
  const first = await createMemberWorkspace(shared, store, limits)
  const second = await createMemberWorkspace(shared, store, limits)
  await writeFile(join(first.cwd, 'same.txt'), 'first')
  await writeFile(join(second.cwd, 'same.txt'), 'second')
  expect(await readFile(join(shared, 'same.txt'), 'utf8')).toBe('base')
  expect(await publish(first, ['same.txt'])).toEqual({ paths: ['same.txt'] })
  await expect(publish(second, ['same.txt'])).rejects.toThrow('integration conflict: same.txt')
  expect(await readFile(join(shared, 'same.txt'), 'utf8')).toBe('first')
})

it('serially integrates disjoint member changes against their captured baseline', async () => {
  await writeFile(join(shared, 'a.txt'), 'a')
  await writeFile(join(shared, 'b.txt'), 'b')
  const first = await createMemberWorkspace(shared, store, limits)
  const second = await createMemberWorkspace(shared, store, limits)
  await writeFile(join(first.cwd, 'a.txt'), 'A')
  await writeFile(join(second.cwd, 'b.txt'), 'B')
  const results = await Promise.all([
    publish(first, ['a.txt']),
    publish(second, ['b.txt']),
  ])
  expect(results).toEqual([{ paths: ['a.txt'] }, { paths: ['b.txt'] }])
  expect(await readFile(join(shared, 'a.txt'), 'utf8')).toBe('A')
  expect(await readFile(join(shared, 'b.txt'), 'utf8')).toBe('B')
})

it('rejects an oversized working set before allocating a member copy', async () => {
  await writeFile(join(shared, 'large.txt'), 'x'.repeat(10))
  await expect(createMemberWorkspace(shared, store, { maxFiles: 1, maxBytes: 9 }))
    .rejects.toThrow(/exceeds configured file or byte limit at large\.txt: 1\/1 files, 10\/9 bytes.*working_paths/u)
})

it('links configured dependencies for reads without integrating their files', async () => {
  await mkdir(join(shared, 'node_modules'))
  await writeFile(join(shared, 'node_modules', 'dependency.txt'), 'dependency')
  await writeFile(join(shared, 'code.ts'), 'old')
  const bounded = { ...limits, readOnlySharedDirectories: ['node_modules'] }
  const workspace = await createMemberWorkspace(shared, store, bounded)
  expect(await readFile(join(workspace.cwd, 'node_modules', 'dependency.txt'), 'utf8')).toBe('dependency')
  await writeFile(join(workspace.cwd, 'code.ts'), 'new')
  expect(await publish(workspace, ['code.ts'], bounded)).toEqual({ paths: ['code.ts'] })
})

it('ignores absent optional cache and dependency directories', async () => {
  await writeFile(join(shared, 'code.ts'), 'base')
  const bounded = { ...limits, omittedDirectories: ['.git', '.cache'], readOnlySharedDirectories: ['node_modules', '.venv'] }
  const workspace = await createMemberWorkspace(shared, store, bounded)
  expect(await readFile(join(workspace.cwd, 'code.ts'), 'utf8')).toBe('base')
})

it('preserves a relative dependency link while checking an unchanged project', async () => {
  await writeFile(join(shared, 'target.txt'), 'original')
  await symlink('target.txt', join(shared, 'alias.txt'), 'file')
  const workspace = await createMemberWorkspace(shared, store, limits)
  expect(await readlink(join(workspace.cwd, 'alias.txt'))).toBe('target.txt')
  expect(await readFile(join(workspace.cwd, 'alias.txt'), 'utf8')).toBe('original')
  expect(await publish(workspace, [])).toEqual({ paths: [] })
})

it('copies the approved working set and detects conflicts on newly written paths', async () => {
  await mkdir(join(shared, 'docs'))
  await writeFile(join(shared, 'docs', 'architecture.md'), 'base')
  await writeFile(join(shared, 'unrelated.bin'), 'x'.repeat(100))
  const selected = { ...limits, maxBytes: 30, includedPaths: ['docs'] }
  const workspace = await createMemberWorkspace(shared, store, selected)
  await expect(readFile(join(workspace.cwd, 'unrelated.bin'))).rejects.toMatchObject({ code: 'ENOENT' })
  await writeFile(join(workspace.cwd, 'docs', 'architecture.md'), 'updated')
  expect(await publish(workspace, ['docs/architecture.md'])).toEqual({ paths: ['docs/architecture.md'] })
  await writeFile(join(workspace.cwd, 'new.txt'), 'member')
  await writeFile(join(shared, 'new.txt'), 'lead')
  await expect(publish(workspace, ['new.txt'])).rejects.toThrow('integration conflict: new.txt')
  expect(await readFile(join(shared, 'new.txt'), 'utf8')).toBe('lead')
})

it('retains a named artifact directory without copying unrelated artifacts', async () => {
  await mkdir(join(shared, '.artifacts', 'selected'), { recursive: true })
  await mkdir(join(shared, '.artifacts', 'unrelated'), { recursive: true })
  await writeFile(join(shared, '.artifacts', 'selected', 'input.md'), 'base')
  await writeFile(join(shared, '.artifacts', 'unrelated', 'large.bin'), 'x'.repeat(100))
  const selected = { ...limits, maxBytes: 32, omittedDirectories: ['.artifacts'],
    includedOmittedPaths: ['.artifacts/selected'] }
  const workspace = await createMemberWorkspace(shared, store, selected)
  expect(await readFile(join(workspace.cwd, '.artifacts', 'selected', 'input.md'), 'utf8')).toBe('base')
  await expect(readFile(join(workspace.cwd, '.artifacts', 'unrelated', 'large.bin'))).rejects.toMatchObject({ code: 'ENOENT' })
  await writeFile(join(workspace.cwd, '.artifacts', 'selected', 'result.md'), 'done')
  expect(await publish(workspace, ['.artifacts/selected/result.md']))
    .toEqual({ paths: ['.artifacts/selected/result.md'] })
  expect(await readFile(join(shared, '.artifacts', 'selected', 'result.md'), 'utf8')).toBe('done')
})

it('resumes a partially published integration from its durable receipt', async () => {
  await writeFile(join(shared, 'a.txt'), 'old-a')
  await writeFile(join(shared, 'b.txt'), 'old-b')
  const workspace = await createMemberWorkspace(shared, store, limits)
  await writeFile(join(workspace.cwd, 'a.txt'), 'new-a')
  await writeFile(join(workspace.cwd, 'b.txt'), 'new-b')
  const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
  await writeFile(join(shared, 'a.txt'), 'new-a')
  await writeFile(join(store, relative(store, join(workspace.cwd, '..', 'integration.json'))), JSON.stringify({
    version: 1,
    paths: ['a.txt', 'b.txt'],
    desired: {
      'a.txt': { kind: 'file', sha256: sha256('new-a') },
      'b.txt': { kind: 'file', sha256: sha256('new-b') },
    },
    applied: ['a.txt'],
  }))
  expect(await publish(workspace, ['a.txt', 'b.txt'])).toEqual({ paths: ['a.txt', 'b.txt'] })
  expect(await readFile(join(shared, 'a.txt'), 'utf8')).toBe('new-a')
  expect(await readFile(join(shared, 'b.txt'), 'utf8')).toBe('new-b')
})

it.each([8, 20, 32])('keeps %i concurrent copies independent and admits one conflicting publication', async (count) => {
  await writeFile(join(shared, 'shared.txt'), 'base')
  const copies = await Promise.all(Array.from({ length: count }, () => createMemberWorkspace(shared, store, limits)))
  await Promise.all(copies.map((workspace, index) => writeFile(join(workspace.cwd, 'shared.txt'), `member-${index}`)))
  expect(await readFile(join(shared, 'shared.txt'), 'utf8')).toBe('base')
  const outcomes = await Promise.allSettled(copies.map(workspace => publish(workspace, ['shared.txt'])))
  const winners = outcomes.flatMap((result, index) => result.status === 'fulfilled' ? [index] : [])
  expect(winners).toHaveLength(1)
  expect(outcomes.filter(result => result.status === 'rejected')).toHaveLength(count - 1)
  expect(await readFile(join(shared, 'shared.txt'), 'utf8')).toBe(`member-${winners[0]}`)
})

it.each([8, 20, 32])('integrates %i disjoint member files without dropping an update', async (count) => {
  const largeLimits = { ...limits, maxFiles: 64 }
  const copies = await Promise.all(Array.from({ length: count }, () => createMemberWorkspace(shared, store, largeLimits)))
  await Promise.all(copies.map((workspace, index) => writeFile(join(workspace.cwd, `member-${index}.txt`), String(index))))
  const outcomes = await Promise.all(copies.map((workspace, index) => publish(workspace, [`member-${index}.txt`], largeLimits)))
  expect(outcomes.flatMap(result => result.paths)).toHaveLength(count)
  expect(await Promise.all(copies.map((_, index) => readFile(join(shared, `member-${index}.txt`), 'utf8'))))
    .toEqual(Array.from({ length: count }, (_, index) => String(index)))
})
