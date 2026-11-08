/** Relocate validated module imports into the self-contained public package. */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
const root = fileURLToPath(new URL('../', import.meta.url))
const baseline = JSON.parse(await readFile(join(root, 'validated-v5-sha256.json'), 'utf8'))
const aliases = new Map([
  ['@dsh-workbench/team-runtime', 'dsh-team-workbench/runtime'], ['@dsh-workbench/team-ui', 'dsh-team-workbench/ui'],
  ['@dsh-workbench/team-tools', 'dsh-team-workbench/tools'], ...['tools', 'policy', 'subagent', 'web', 'fetch'].map(name =>
    [`@dsh-workbench/compat-${name}`, `dsh-team-workbench/compat-${name}`]),
])
const publicHashes = {}
let relocated = 0
for (const [relative, expected] of Object.entries(baseline)) {
  const source = join(root, 'packages/team', relative)
  if (createHash('sha256').update(await readFile(source)).digest('hex') !== expected) {
    throw new Error(`The development runtime differs from the validated release: ${relative}; run its release validation before changing the public baseline`)
  }
  const target = join(root, relative)
  await mkdir(dirname(target), { recursive: true })
  const original = await readFile(source)
  let content = original
  if (/\.(?:js|ts|tsx)$/u.test(relative)) {
    let text = original.toString('utf8')
    for (const [from, to] of aliases) text = text.replaceAll(from, to)
    content = Buffer.from(text)
  }
  if (!content.equals(original)) relocated++
  await writeFile(target, content)
  publicHashes[relative] = createHash('sha256').update(content).digest('hex')
}
const originalPatch = await readFile(join(root, 'packages/team/cordis.patch.yml'), 'utf8')
let publicPatch = originalPatch.replace("name: '@dsh-workbench/team'", "name: 'dsh-team-workbench'")
for (const [from, to] of aliases) publicPatch = publicPatch.replaceAll(from, to)
await writeFile(join(root, 'cordis.patch.yml'), publicPatch)
await writeFile(join(root, 'public-runtime-sha256.json'), JSON.stringify(publicHashes, null, 2) + '\n')
const metadata = ['package.json', 'cordis.patch.yml', 'public-runtime-sha256.json', 'validated-v5-sha256.json']
const hashes = { ...publicHashes }
for (const name of metadata) hashes[name] = createHash('sha256').update(await readFile(join(root, name))).digest('hex')
await writeFile(join(root, 'SHA256SUMS'), Object.entries(hashes).map(([name, digest]) => `${digest}  ${name}`).sort().join('\n') + '\n')
console.log(`Synced ${Object.keys(baseline).length} validated files; ${relocated} files relocate internal package imports, with implementation bytes otherwise retained.`)
