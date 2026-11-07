/** Pack the already-built bundle through npm without shell interpolation. */
import { mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const npm = process.env.npm_execpath
if (!npm || !/[\\/]npm-cli\.js$/u.test(npm)) throw new Error('Run this command with npm run pack')
await mkdir(join(root, 'artifacts'), { recursive: true })
const result = spawnSync(process.execPath, [npm, 'pack', './packages/team', '--pack-destination', './artifacts', '--json'],
  { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
if (result.error) throw result.error
if (result.status !== 0) throw new Error(`npm pack failed: ${result.stderr}`)
const packages = JSON.parse(result.stdout)
await writeFile(join(root, 'artifacts/pack-manifest.json'), JSON.stringify(packages, null, 2) + '\n')
for (const item of packages) console.log(`Packed ${item.filename}: ${item.entryCount} entries, ${item.size} bytes`)
