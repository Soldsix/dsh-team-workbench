/** Copy only the validated runtime bytes into the installable repository root. */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
const root = fileURLToPath(new URL('../', import.meta.url))
const baseline = JSON.parse(await readFile(join(root, 'public-runtime-sha256.json'), 'utf8'))
for (const [relative, expected] of Object.entries(baseline)) {
  const source = join(root, 'packages/team', relative)
  if (createHash('sha256').update(await readFile(source)).digest('hex') !== expected) {
    throw new Error(`The development runtime differs from the validated release: ${relative}; run its release validation before changing the public baseline`)
  }
  const target = join(root, relative)
  await mkdir(dirname(target), { recursive: true })
  await copyFile(source, target)
}
const originalPatch = await readFile(join(root, 'packages/team/cordis.patch.yml'), 'utf8')
const publicPatch = originalPatch.replace("name: '@dsh-workbench/team'", "name: 'dsh-team-workbench'")
await writeFile(join(root, 'cordis.patch.yml'), publicPatch)
const metadata = ['package.json', 'cordis.patch.yml', 'public-runtime-sha256.json']
const hashes = { ...baseline }
for (const name of metadata) hashes[name] = createHash('sha256').update(await readFile(join(root, name))).digest('hex')
await writeFile(join(root, 'SHA256SUMS'), Object.entries(hashes).map(([name, digest]) => `${digest}  ${name}`).sort().join('\n') + '\n')
console.log(`Synced ${Object.keys(baseline).length} validated public runtime/source/skill files.`)
