/** Create a disposable source test fixture from an explicitly selected, built DSH checkout. */
import { mkdir, readdir, readFile, writeFile, symlink, copyFile, lstat, stat, realpath, rename } from 'node:fs/promises'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const host = process.env.DSH_DEV_HOST
if (!host) throw new Error('Set DSH_DEV_HOST to a built DSH 0.2.1-rc.2 checkout; this script never installs or edits that checkout')
const source = join(root, 'source')
const hostRoot = await realpath(resolve(host))
const version = JSON.parse(await readFile(join(hostRoot, 'packages/core/agent/package.json'), 'utf8')).version
if (version !== '0.2.1-rc.2') throw new Error(`Unsupported development host ${version}; use the pinned compatibility version`)
const sourceStat = await lstat(source).catch(error => { if (error.code !== 'ENOENT') throw error })
if (sourceStat?.isSymbolicLink()) throw new Error('The generated source fixture must be an ordinary directory')
const previous = await readFile(join(source, '.fixture.json'), 'utf8').catch(error => { if (error.code !== 'ENOENT') throw error })
const previousFixture = previous ? JSON.parse(previous) : undefined
if (previousFixture && previousFixture.host !== hostRoot) throw new Error('Choose a new fixture before changing the selected development host')
const aliases = new Map([
  ['experimental/agent-team', 'modules/runtime'], ['experimental/tool-agent-team', 'modules/tools'],
  ['experimental/client-ui-agent-team', 'modules/ui'], ['experimental/agent-team-profile', ''],
  ['core/tools', 'modules/compat-tools'], ['subagent/subagent', 'modules/compat-subagent'],
  ['sandbox/sandbox-policy', 'modules/compat-policy'], ['web/web', 'modules/compat-web'], ['web/web-fetch-http', 'modules/compat-fetch'],
])
async function link(input, output) {
  await mkdir(dirname(output), { recursive: true })
  const outputStat = await lstat(output).catch(error => { if (error.code === 'ENOENT') return; throw error })
  if (outputStat) {
    if (await realpath(output) === await realpath(input)) return
    if (outputStat.isFile()) {
      if ((await readFile(output)).equals(await readFile(input))) return
      if (previousFixture) {
        const temporary = output + '.fixture-update-' + process.pid
        await copyFile(input, temporary)
        await rename(temporary, output)
        return
      }
    }
    throw new Error(`Fixture path already belongs to another source: ${output}`)
  }
  if ((await stat(input)).isDirectory()) await symlink(input, output, process.platform === 'win32' ? 'junction' : 'dir')
  else if (process.platform === 'win32') await copyFile(input, output)
  else await symlink(input, output, 'file')
}
await mkdir(source, { recursive: true })
await writeFile(join(source, 'package.json'), '{"type":"module","private":true}\n')
for (const file of ['tsconfig.base.json', 'tsconfig.base.client.json']) await copyFile(join(hostRoot, file), join(source, file))
const basePath = join(source, 'tsconfig.base.json')
const parsedBase = ts.parseConfigFileTextToJson(basePath, await readFile(basePath, 'utf8'))
if (parsedBase.error) throw new Error('The selected development host has an invalid base tsconfig')
const baseConfig = parsedBase.config
baseConfig.compilerOptions.paths['@dsh-workbench/compat-tools/agent-menu'] = ['./packages/core/tools/src/agent-menu.ts']
await writeFile(basePath, JSON.stringify(baseConfig, null, 2) + '\n')
for (const name of ['node_modules', 'vendor', 'native']) await link(join(hostRoot, name), join(source, name))
for (const group of (await readdir(join(hostRoot, 'packages'), { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name)) {
  for (const item of await readdir(join(hostRoot, 'packages', group), { withFileTypes: true })) {
    if (!item.isDirectory()) continue
    const key = `${group}/${item.name}`
    const input = aliases.has(key) ? join(root, 'packages/team', aliases.get(key)) : join(hostRoot, 'packages', key)
    const output = join(source, 'packages', key)
    await mkdir(output, { recursive: true })
    for (const child of await readdir(input, { withFileTypes: true })) {
      if (child.name === 'node_modules') continue
      await link(join(input, child.name), join(output, child.name))
    }
    const dependencies = join(hostRoot, 'packages', key, 'node_modules')
    try { await stat(dependencies); await link(dependencies, join(output, 'node_modules')) }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
}
await mkdir(join(source, 'scripts'), { recursive: true })
for (const item of await readdir(join(hostRoot, 'scripts'), { withFileTypes: true })) {
  if (item.name === 'gen-tool-catalog.ts') {
    const input = await readFile(join(hostRoot, 'scripts', item.name), 'utf8')
    const marker = "      const session = ctx.sessions.create(SessionId('tool-catalog-team-lead'))"
    if (!input.includes(marker)) throw new Error('The pinned schema-harvest fixture changed; review its Team dependencies')
    await writeFile(join(source, 'scripts', item.name), input.replace(marker,
      '      await ctx.plugin(LlmRuntime)\n      await ctx.plugin(SubagentRuntime)\n' + marker))
  } else await link(join(hostRoot, 'scripts', item.name), join(source, 'scripts', item.name))
}
await mkdir(join(root, 'private-qa'), { recursive: true })
await writeFile(join(source, '.fixture.json'), JSON.stringify({ host: hostRoot, version }, null, 2) + '\n')
console.log('Prepared an isolated development fixture. The selected DSH checkout remains unchanged.')
