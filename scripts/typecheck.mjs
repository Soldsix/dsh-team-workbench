/** Check both plugin faces against a pinned DSH checkout's published declarations. */
import ts from 'typescript'
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const host = resolve(process.env.DSH_DEV_HOST ?? join(root, 'source'))
const team = join(root, 'packages/team')
const base = ts.readConfigFile(join(host, 'tsconfig.base.json'), ts.sys.readFile)
if (base.error) throw new Error('Set DSH_DEV_HOST to the pinned DSH development checkout')
const paths = {}
for (const [name, values] of Object.entries(base.config.compilerOptions.paths)) paths[name] = values.map(value => {
  const source = resolve(host, value)
  const declaration = source.replace(/[\\/]src(?:[\\/]|$)/u, '/lib/types/').replace(/\.tsx?$/u, '.d.ts')
  return existsSync(declaration) ? declaration : existsSync(join(declaration, 'index.d.ts')) ? join(declaration, 'index.d.ts') : source
})
const dirs = [team, ...readdirSync(join(team, 'modules')).map(name => join(team, 'modules', name))]
const installedTypes = process.env.DSH_TYPE_PACKAGES
// Resolve every exported client face explicitly; wildcard source exports must not mix host programs.
for (const group of readdirSync(join(host, 'packages'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)) for (const name of readdirSync(join(host, 'packages', group))) {
  const dir = join(host, 'packages', group, name), file = join(dir, 'package.json')
  if (!existsSync(file)) continue
  const meta = JSON.parse(readFileSync(file, 'utf8'))
  for (const [key, value] of Object.entries(meta.exports ?? {})) {
    if (typeof value !== 'object' || value === null || typeof value.types !== 'string' || key.includes('*')) continue
    const declaration = join(dir, value.types)
    if (existsSync(declaration)) paths[meta.name + (key === '.' ? '' : key.slice(1))] = [declaration]
  }
}
if (installedTypes !== undefined) for (const name of readdirSync(join(resolve(installedTypes), '@deepseek-ai'))) {
  const dir = join(resolve(installedTypes), '@deepseek-ai', name), file = join(dir, 'package.json')
  if (!existsSync(file)) continue
  const meta = JSON.parse(readFileSync(file, 'utf8'))
  for (const [key, value] of Object.entries(meta.exports ?? {})) {
    if (typeof value !== 'object' || value === null || typeof value.types !== 'string' || key.includes('*')) continue
    const declaration = join(dir, value.types)
    if (existsSync(declaration)) paths[meta.name + (key === '.' ? '' : key.slice(1))] = [declaration]
  }
}
const remaps = { runtime: 'experimental-agent-team', tools: 'experimental-tool-agent-team', ui: 'experimental-client-ui-agent-team',
  'compat-tools': 'tools', 'compat-subagent': 'subagent', 'compat-policy': 'sandbox-policy', 'compat-web': 'web', 'compat-fetch': 'web-fetch-http' }
for (const dir of dirs) {
  const meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  paths[meta.name] = [join(dir, 'src/index.ts')]
  const official = remaps[dir.split(/[\\/]/u).at(-1)]
  if (official === 'tools') paths[meta.name + '/agent-menu'] = [join(dir, 'src/agent-menu.ts')]
  for (const prefix of [meta.name, ...(official ? ['@deepseek-ai/dsh-' + official] : [])]) {
    paths[prefix] = [join(dir, 'src/index.ts')]
    paths[prefix + '/client'] = [join(dir, existsSync(join(dir, 'src/client.ts')) ? 'src/client.ts' : 'src/client/index.ts')]
    paths[prefix + '/experts'] = [join(dir, 'src/experts.ts')]
    paths[prefix + '/internal'] = [join(dir, 'src/internal.ts')]
    paths[prefix + '/remote'] = [join(dir, 'lib/typert.remote-client.d.ts')]
  }
}
const collect = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const path = join(dir, entry.name)
  return entry.isDirectory() ? collect(path) : /\.tsx?$/u.test(path) ? [path] : []
})
const roots = dirs.flatMap(dir => collect(join(dir, 'src')))
const options = { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noImplicitOverride: true,
  noUnusedLocals: true, noUnusedParameters: true, skipLibCheck: true, esModuleInterop: true,
  jsx: ts.JsxEmit.ReactJSX, allowImportingTsExtensions: true, rewriteRelativeImportExtensions: true,
  declaration: true, emitDeclarationOnly: true, paths, types: ['node'],
}
const faces = [roots.filter(path => !path.replaceAll('\\', '/').includes('/src/client/')), roots.filter(path => path.replaceAll('\\', '/').includes('/modules/ui/src/client/'))]
const programs = faces.map(files => ts.createProgram({ rootNames: [...files, join(root, 'tests/styles.d.ts')], options }))
const diagnostics = programs.flatMap(program => ts.getPreEmitDiagnostics(program))
const format = values => ts.formatDiagnostics(values, { getCanonicalFileName: name => name, getCurrentDirectory: () => root, getNewLine: () => '\n' })
if (diagnostics.length) { process.stderr.write(format(diagnostics)); process.exitCode = 1 }
else if (process.argv.includes('--emit')) for (const program of programs) program.emit(undefined, (output, content, bom, onError, sources) => {
  const source = sources?.[0]?.fileName
  const dir = source === undefined ? undefined : dirs.find(candidate => source.replaceAll('\\', '/').startsWith(candidate.replaceAll('\\', '/') + '/src/'))
  if (dir === undefined) return
  const target = join(dir, 'lib/types', relative(join(dir, 'src'), source).replace(/\.tsx?$/u, '.d.ts'))
  mkdirSync(dirname(target), { recursive: true })
  for (const [before, after] of [['experimental-agent-team-profile', 'team'], ['experimental-client-ui-agent-team', 'team-ui'], ['experimental-tool-agent-team', 'team-tools'], ['experimental-agent-team', 'team-runtime']]) content = content.replaceAll('@deepseek-ai/dsh-' + before, '@dsh-workbench/' + after)
  content = content.replaceAll('@deepseek-ai/dsh-subagent/internal', '@dsh-workbench/compat-subagent/internal')
  writeFileSync(target, content)
}, undefined, true)
if (!diagnostics.length) console.log(`Typechecked ${roots.length} plugin sources; strict host and client consumers passed.`)
