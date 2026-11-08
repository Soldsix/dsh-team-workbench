/** Install into an explicitly selected stopped profile, preserving provider settings and rollback bytes. */
import { readFile, writeFile, mkdir, copyFile, rename } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const values = new Map()
const options = new Set(['--cli', '--home', '--profile', '--archive', '--apply', '--host-stopped'])
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i]
  if (!options.has(key) || values.has(key)) throw new Error('Use distinct --cli, --home, --profile, --archive and optional --apply --host-stopped')
  values.set(key, ['--apply', '--host-stopped'].includes(key) ? true : process.argv[++i])
}
for (const key of ['--cli', '--home', '--profile', '--archive']) if (typeof values.get(key) !== 'string') throw new Error(`Required: ${key}`)
const profile = values.get('--profile')
if (!/^[a-z0-9][a-z0-9_-]*$/iu.test(profile)) throw new Error('Profile must be a simple profile name')
const cli = resolve(values.get('--cli')), home = resolve(values.get('--home')), archive = resolve(values.get('--archive'))
const require = createRequire(cli)
const hostVersion = JSON.parse(await readFile(require.resolve('@deepseek-ai/dsh/package.json'), 'utf8')).version
if (hostVersion !== '0.2.1-rc.2') throw new Error(`This release supports DSH 0.2.1-rc.2, observed ${hostVersion}; do not force an incompatible host`)
const includePath = require.resolve('@deepseek-ai/cordis-plugin-include')
const include = await import(pathToFileURL(includePath).href)
const yaml = await import(pathToFileURL(createRequire(includePath).resolve('js-yaml')).href)
const mappings = new Map([
  ['tools', ['workbench-tools', '@dsh-workbench/compat-tools', '@deepseek-ai/dsh-tools']],
  ['sandbox-policy', ['workbench-sandbox-policy', '@dsh-workbench/compat-policy', '@deepseek-ai/dsh-sandbox-policy']],
  ['subagent', ['workbench-subagent', '@dsh-workbench/compat-subagent', '@deepseek-ai/dsh-subagent']],
  ['web', ['workbench-web', '@dsh-workbench/compat-web', '@deepseek-ai/dsh-web']],
  ['web-fetch-http', ['workbench-web-fetch-http', '@dsh-workbench/compat-fetch', '@deepseek-ai/dsh-web-fetch-http']],
])
function cliRun(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { env: { ...process.env, DSH_HOME: home, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' },
    windowsHide: true, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 360_000 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`DSH command failed with status ${result.status}; profile rollback bytes remain available`)
  return result.stdout
}
function* rows(list) {
  for (const row of list) { yield row; if (row.group && Array.isArray(row.config)) yield* rows(row.config) }
}
const effective = yaml.load(cliRun(['--profile', profile, '--dump-config']), { schema: include.entryListSchema })
if (!Array.isArray(effective)) throw new Error('Host did not return an entry list')
const dir = join(home, 'profiles', profile)
const patchPath = join(dir, 'cordis.patch.yml')
const original = await readFile(patchPath, 'utf8').catch(error => { if (error.code === 'ENOENT') return '[]\n'; throw error })
const patch = yaml.load(original, { schema: include.entryListSchema }) ?? []
if (!Array.isArray(patch)) throw new Error('Profile patch must be an entry list')
const translated = patch.map(row => {
  const mapping = mappings.get(row.id)
  if (!mapping || row.insert) return row
  if (row.name && row.name !== mapping[2]) throw new Error(`Another provider owns ${row.id}; review the installation plan manually`)
  return { ...row, id: mapping[0], ...row.name ? { name: mapping[1] } : {} }
})
const defaults = JSON.parse(await readFile(fileURLToPath(new URL('../examples/v5-migration-defaults.json', import.meta.url)), 'utf8'))
const addedRuntimeKeys = []
for (const row of translated) if (row.id === 'agent-team' && row.config !== undefined) {
  if (row.config === null || Array.isArray(row.config) || typeof row.config !== 'object'
    || Object.getPrototypeOf(row.config) !== Object.prototype) throw new Error('Dynamic Team config needs a manual migration; the original file was not changed')
  if (Object.hasOwn(row.config, 'portableEventEnvelope') && row.config.portableEventEnvelope !== true) {
    throw new Error('The stock host requires portableEventEnvelope: true; keep native historical logs unchanged and review their migration separately')
  }
  for (const [key, value] of Object.entries(defaults.config)) if (!Object.hasOwn(row.config, key)) {
    row.config[key] = value; addedRuntimeKeys.push(key)
  }
  if (!Object.hasOwn(row.config, 'coordinationRoot')) {
    row.config.coordinationRoot = join(home, defaults.coordinationRootPath); addedRuntimeKeys.push('coordinationRoot')
  }
}
const migrated = []
for (const [oldId, [id, name, expected]] of mappings) {
  if (translated.some(row => row.id === id)) continue
  const source = [...rows(effective)].find(row => row.id === oldId)
  if (source && source.name !== expected) throw new Error(`Unknown implementation at ${oldId}; installation stopped without changing it`)
  if (source?.config !== undefined) { translated.push({ id, name, config: source.config }); migrated.push(oldId) }
}
const output = yaml.dump(translated, { schema: include.entryListSchema, lineWidth: -1, noRefs: true })
const planDir = join(home, 'workbench-install-plans', new Date().toISOString().replaceAll(':', '-'))
await mkdir(planDir, { recursive: true })
await writeFile(join(planDir, 'cordis.patch.proposed.yml'), output)
const plan = { profile, hostVersion, migrated,
  expectedPackageVersion: defaults.packageVersion, addedRuntimeKeys,
  archiveSha256: createHash('sha256').update(await readFile(archive)).digest('hex'),
  touches: ['profile package and lock', 'profile provider overrides', 'stopped profile dependencies'],
  preserves: ['Sessions', 'mode definitions', 'model connections', 'persona files'], applied: false, status: 'planned' }
const savePlan = () => writeFile(join(planDir, 'plan.json'), JSON.stringify(plan, null, 2) + '\n')
await savePlan()
if (!values.has('--apply')) { console.log(`Installation plan saved locally: ${planDir}`); process.exit(0) }
if (!values.has('--host-stopped')) throw new Error('Stop the selected profile host before applying, then pass --host-stopped; this installer never kills a host')
const backup = join(planDir, 'backup')
await mkdir(backup)
const profileFiles = ['package.json', 'cordis.yml', 'cordis.patch.yml', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']
const savedFiles = new Set()
for (const file of profileFiles) {
  await copyFile(join(dir, file), join(backup, file)).catch(error => { if (error.code !== 'ENOENT') throw error })
  try { await readFile(join(backup, file)); savedFiles.add(file) } catch (error) { if (error.code !== 'ENOENT') throw error }
}
let movedDependencies = false
let installationStarted = false
try {
  // Moving the stopped profile's directory retains exact rollback dependencies without copying private files.
  try { await rename(join(dir, 'node_modules'), join(backup, 'node_modules')); movedDependencies = true }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  installationStarted = true
  cliRun(['plugin', '--profile', profile, 'add', archive])
  const installed = JSON.parse(await readFile(join(dir, 'node_modules/@dsh-workbench/team/package.json'), 'utf8'))
  if (installed.version !== defaults.packageVersion) throw new Error('The archive version does not match this installation helper; restoring the saved profile')
  const temporary = patchPath + '.workbench-tmp'
  await writeFile(temporary, output)
  await rename(temporary, patchPath)
  const verified = yaml.load(cliRun(['--profile', profile, '--dump-config']), { schema: include.entryListSchema })
  for (const [, [id, name]] of mappings) if (![...rows(verified)].some(row => row.id === id && row.name === name)) {
    throw new Error(`Installed profile does not contain ${id}`)
  }
  plan.applied = true; plan.status = 'installed'; await savePlan()
} catch (error) {
  try {
    if (installationStarted) await rename(join(dir, 'node_modules'), join(planDir, 'failed-node_modules')).catch(moveError => { if (moveError.code !== 'ENOENT') throw moveError })
    if (movedDependencies) await rename(join(backup, 'node_modules'), join(dir, 'node_modules'))
    for (const file of profileFiles) {
      if (savedFiles.has(file)) await copyFile(join(backup, file), join(dir, file))
      else await rename(join(dir, file), join(planDir, 'failed-' + file)).catch(moveError => { if (moveError.code !== 'ENOENT') throw moveError })
    }
    plan.status = 'rolled-back'; await savePlan()
  } catch (rollbackError) {
    plan.status = 'rollback-incomplete'; await savePlan()
    throw new AggregateError([error, rollbackError], 'Installation failed and rollback was incomplete; keep the host stopped and inspect the local backup')
  }
  throw error
}
console.log(`Installed without starting a host. Profile rollback files: ${backup}`)
