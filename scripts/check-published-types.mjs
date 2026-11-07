/** Check built plugin declarations with separate Host and Client consumers. */
import ts from 'typescript'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const host = resolve(process.env.DSH_DEV_HOST ?? join(root, 'source'))
const paths = {}
const entries = { host: [], client: [] }

function readExports(dir, own) {
  const meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  for (const [key, value] of Object.entries(meta.exports ?? {})) {
    if (key.includes('*') || typeof value !== 'object' || value === null || typeof value.types !== 'string') continue
    const target = join(dir, value.types)
    if (!existsSync(target)) throw new Error(`Build the declared type entry before checking it: ${meta.name}${key.slice(1)}`)
    const name = meta.name + (key === '.' ? '' : key.slice(1))
    paths[name] = [target]
    if (own) entries[name.endsWith('/client') || name.endsWith('/remote') ? 'client' : 'host'].push(name)
  }
}

for (const group of readdirSync(join(host, 'packages'), { withFileTypes: true }).filter(value => value.isDirectory())) {
  for (const item of readdirSync(join(host, 'packages', group.name), { withFileTypes: true }).filter(value => value.isDirectory())) {
    const dir = join(host, 'packages', group.name, item.name)
    if (existsSync(join(dir, 'package.json'))) readExports(dir, false)
  }
}
for (const module of readdirSync(join(root, 'packages/team/modules'))) readExports(join(root, 'packages/team/modules', module), true)

const virtualHost = join(root, 'private-qa/published-consumer-host.mts')
const virtualClient = join(root, 'private-qa/published-consumer-client.mts')
const consumers = new Map([
  [virtualHost, 'export type Entries = [\n' + entries.host.map(name => `typeof import(${JSON.stringify(name)}),`).join('\n') + '\n];\n'],
  [virtualClient, 'export type Entries = [\n' + entries.client.map(name => `typeof import(${JSON.stringify(name)}),`).join('\n') + '\n];\n'
    + 'import type { TeamActionProps } from "@dsh-workbench/team-ui/client";\n'
    + 'export type Translator = TeamActionProps["t"];\nexport type Identity = TeamActionProps["sessionId"];\n'
    + 'type IsAny<T> = 0 extends (1 & T) ? true : false;\n'
    + 'export const translatorIsSpecific: IsAny<Translator> = false;\n'
    + 'export const identityIsSpecific: IsAny<Identity> = false;\n'],
])
const options = { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true, noEmit: true, skipLibCheck: true, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
  paths, types: ['node'], typeRoots: [join(host, 'node_modules/@types'), join(root, 'node_modules/@types')] }
const uiEntry = resolve(root, 'packages/team/modules/ui/lib/types/client/index.d.ts')
const localeImport = /^export type \{\} from ['"]\.\/mount\.ts['"];?\r?\n/mu
if (!localeImport.test(readFileSync(uiEntry, 'utf8'))) throw new Error('The published UI declaration omits its local locale augmentation')

function check(file, omitLocale = false) {
  const compiler = ts.createCompilerHost(options)
  const originalRead = compiler.readFile.bind(compiler)
  const originalExists = compiler.fileExists.bind(compiler)
  compiler.fileExists = path => consumers.has(resolve(path)) || originalExists(path)
  compiler.readFile = path => {
    const value = consumers.get(resolve(path)) ?? originalRead(path)
    return omitLocale && resolve(path) === uiEntry ? value?.replace(localeImport, '') : value
  }
  return ts.getPreEmitDiagnostics(ts.createProgram({ rootNames: [file], options, host: compiler }))
}

const hostDiagnostics = check(virtualHost)
const clientDiagnostics = check(virtualClient)
const regression = check(virtualClient, true)
const rejectsMissingLocale = regression.some(value => value.file !== undefined && resolve(value.file.fileName) === resolve(virtualClient) && value.code === 2339
  && ts.flattenDiagnosticMessageText(value.messageText, ' ').includes("Property 't'"))
const result = { passed: hostDiagnostics.length === 0 && clientDiagnostics.length === 0 && rejectsMissingLocale,
  hostEntries: entries.host.length, clientEntries: entries.client.length, hostErrors: hostDiagnostics.length,
  clientErrors: clientDiagnostics.length, rejectsMissingLocale, regressionErrors: regression.length, separateFaces: true,
  peerLibraryChecking: 'Skipped; checks consumers and their concrete property types against the pinned Host declaration environment' }
const outputIndex = process.argv.indexOf('--output')
if (outputIndex >= 0 && !process.argv[outputIndex + 1]) throw new Error('--output requires a result file path')
const output = outputIndex < 0 ? join(root, 'private-qa/published-types-result.json') : resolve(process.argv[outputIndex + 1])
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(result, null, 2) + '\n')
if (!result.passed) {
  process.stderr.write(ts.formatDiagnostics([...hostDiagnostics, ...clientDiagnostics], {
    getCanonicalFileName: name => name, getCurrentDirectory: () => root, getNewLine: () => '\n',
  }))
  throw new Error('Published declaration consumers or the missing-locale regression failed')
}
console.log(`Published declaration consumers passed: ${entries.host.length} Host, ${entries.client.length} Client; missing locale rejected.`)
