/** Pack a fresh public-root stage with eight modules exposed as package subpaths. */
import { readFile, writeFile, mkdir, mkdtemp, cp, lstat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
const root = fileURLToPath(new URL('../', import.meta.url))
const meta = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const npm = process.env.npm_execpath
if (!npm || !/[\\/]npm-cli\.js$/u.test(npm)) throw new Error('Run through npm run pack:public')
if (meta.private || meta.name !== 'dsh-team-workbench') throw new Error('Not a public-root package')
await mkdir(join(root, 'private-qa'), { recursive: true })
await mkdir(join(root, 'artifacts'), { recursive: true })
const stage = await mkdtemp(join(root, 'private-qa/public-package-'))
for (const name of ['package.json', ...meta.files]) {
  const from = resolve(root, name)
  if (!from.startsWith(resolve(root) + '/') && !from.startsWith(resolve(root) + '\\')) throw new Error('Pack file escaped the repository')
  if ((await lstat(from)).isSymbolicLink()) throw new Error(`Pack entry is a link: ${name}`)
  await cp(from, join(stage, name), { recursive: true, filter: path => !path.split(/[\\/]/u).includes('node_modules') })
}
const packed = spawnSync(process.execPath, [npm, 'pack', stage, '--ignore-scripts', '--pack-destination', join(root, 'artifacts'), '--json'],
  { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
if (packed.error) throw packed.error
if (packed.status !== 0) throw new Error(`Public pack failed: ${packed.stderr}`)
const result = JSON.parse(packed.stdout)
await writeFile(join(root, 'artifacts/public-pack-manifest.json'), JSON.stringify(result, null, 2) + '\n')
for (const item of result) console.log(`Packed ${item.filename}: ${item.entryCount} entries, ${item.size} bytes`)
