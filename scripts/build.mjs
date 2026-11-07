/** Build portable ESM plugins and the DSH browser module without touching a host profile. */
import { build } from 'esbuild-bundle'
import ts from 'typescript'
import { readFile, writeFile, mkdir, readdir, cp } from 'node:fs/promises'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const root = fileURLToPath(new URL('../', import.meta.url))
const team = join(root, 'packages/team')
const identities = new Map([
  ['@deepseek-ai/dsh-subagent/internal', '@dsh-workbench/compat-subagent/internal'],
  ['@deepseek-ai/dsh-experimental-agent-team-profile', '@dsh-workbench/team'],
  ['@deepseek-ai/dsh-experimental-client-ui-agent-team', '@dsh-workbench/team-ui'],
  ['@deepseek-ai/dsh-experimental-tool-agent-team', '@dsh-workbench/team-tools'],
  ['@deepseek-ai/dsh-experimental-agent-team', '@dsh-workbench/team-runtime'],
])
const mapped = input => {
  for (const [before, after] of identities) input = input.replaceAll(before, after)
  return input
}
async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else yield path
  }
}
const directories = [team, ...(await readdir(join(team, 'modules'))).map(name => join(team, 'modules', name))]
for (const dir of directories) {
  const src = join(dir, 'src')
  await mkdir(join(dir, 'lib/types'), { recursive: true })
  for await (const path of files(src)) {
    if (path.endsWith('.css')) {
      const target = join(dir, 'lib/types', relative(src, path))
      await mkdir(dirname(target), { recursive: true }); await cp(path, target); continue
    }
    if (!/\.tsx?$/u.test(path) || path.endsWith('.d.ts')) continue
    const source = mapped(await readFile(path, 'utf8'))
    const output = join(dir, 'lib/types', relative(src, path).replace(/\.tsx?$/u, '.js'))
    await mkdir(dirname(output), { recursive: true })
    const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
      rewriteRelativeImportExtensions: true }
    await writeFile(output, ts.transpileModule(source, { fileName: path, compilerOptions: options }).outputText)
  }
  const inputs = ['index']
  if (dir.endsWith('runtime')) inputs.push('experts')
  if (dir.endsWith('compat-subagent')) inputs.push('internal')
  for (const entry of inputs) {
    const result = await build({ entryPoints: [join(dir, 'lib/types', entry + '.js')], outfile: join(dir, 'lib', entry + '.js'),
      absWorkingDir: root,
      platform: 'node', format: 'esm', target: 'node22', bundle: true, packages: 'external',
      tsconfigRaw: { compilerOptions: {} }, sourcemap: false, write: false, metafile: true })
    if (Object.keys(result.metafile.inputs).some(path => !resolve(root, path).startsWith(resolve(team)))) {
      throw new Error(`Host dependencies were bundled into ${entry}; keep host services external`)
    }
    for (const output of result.outputFiles) await writeFile(output.path, output.contents)
  }
}
const runtime = join(team, 'modules/runtime')
const host = join(root, 'source')
const safeBrowser = new Map([
  ['@dsh-workbench/team-runtime/client', join(runtime, 'src/client.ts')],
  ['@dsh-workbench/team-runtime/remote', join(runtime, 'lib/typert.remote-client.js')],
  ['@deepseek-ai/dsh-session', join(host, 'packages/core/session/src/types.ts')],
  ['@deepseek-ai/dsh-typert-protocol/remote-info', join(host, 'packages/typert/protocol/src/remote-info.ts')],
  ['@deepseek-ai/dsh-brand', join(host, 'packages/util/brand/src/index.ts')],
  ['@deepseek-ai/dsh-util-values', join(host, 'packages/util/values/src/index.ts')],
])
const ui = join(team, 'modules/ui')
const browser = await build({ entryPoints: [join(ui, 'lib/types/client/index.js')],
  absWorkingDir: root, preserveSymlinks: true,
  outfile: join(ui, 'lib/browser.js'), platform: 'browser', format: 'cjs', target: 'es2022',
  bundle: true, packages: 'external', tsconfigRaw: { compilerOptions: {} }, loader: { '.module.css': 'local-css' }, write: false,
  plugins: [{ name: 'dsh-client-identities', setup(builder) {
    builder.onResolve({ filter: /^@(?:deepseek-ai|dsh-workbench)\// }, args => {
      const input = mapped(args.path)
      if (safeBrowser.has(input)) return { path: safeBrowser.get(input) }
      return { path: input === '@deepseek-ai/dsh-api-gateway/client' ? input : input.replace(/\/client$/u, ''), external: true }
    })
  } }],
})
const css = browser.outputFiles.find(file => file.path.endsWith('.css'))?.text ?? ''
const js = browser.outputFiles.find(file => file.path.endsWith('.js'))?.text
if (js === undefined) throw new Error('No browser module emitted')
const style = `const tagId='@dsh-workbench/team-ui/v5';if(!document.querySelector('style[data-plugin-css="'+tagId+'"]')){const tag=document.createElement('style');tag.dataset.plugin='@dsh-workbench/team-ui';tag.dataset.pluginCss=tagId;tag.textContent=${JSON.stringify(css)};document.head.appendChild(tag);}`
await writeFile(join(ui, 'lib/client.js'), `window.__ModuleLoader__.load({id:'@dsh-workbench/team-ui',factory:(require)=>{const module={exports:{}};const exports=module.exports;${style}\n${js}\nreturn module.exports;}});\n`)

// Only package metadata is indexed; professional instructions stay on demand.
const catalog = []
const referenceRoot = join(team, 'skills/team-workbench/references')
const skillEntries = [join(team, 'skills/team-workbench/SKILL.md'), ...(await readdir(referenceRoot, { withFileTypes: true }))
  .filter(entry => entry.isDirectory() && entry.name.startsWith('team-')).map(entry => join(referenceRoot, entry.name, 'SKILL.md'))]
for (const path of skillEntries) {
  const content = await readFile(path, 'utf8')
  const name = /^name: (.+)$/mu.exec(content)?.[1]
  const description = /^description: (.+)$/mu.exec(content)?.[1]
  if (name === undefined || description === undefined) throw new Error(`Missing skill metadata: ${relative(team, path)}`)
  catalog.push({ name, description })
}
await writeFile(join(team, 'skills/catalog.json'), JSON.stringify(catalog.sort((a, b) => a.name.localeCompare(b.name)), null, 2) + '\n')

await cp(join(root, 'docs'), join(team, 'docs'), { recursive: true })
await cp(join(root, 'examples'), join(team, 'examples'), { recursive: true })
for await (const path of files(join(team, 'docs'))) if (path.endsWith('.md')) {
  await writeFile(path, (await readFile(path, 'utf8')).replaceAll('../packages/team/', '../'))
}
for (const name of ['NOTICE.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md']) await cp(join(root, name), join(team, name))
await mkdir(join(team, 'scripts'), { recursive: true })
await cp(join(root, 'scripts/install.mjs'), join(team, 'scripts/install.mjs'))
const codeHashes = []
for (const base of ['src', 'skills', 'modules']) for await (const path of files(join(team, base))) {
  if (path.split(/[\\/]/u).includes('node_modules')) continue
  codeHashes.push(`${createHash('sha256').update(await readFile(path)).digest('hex')}  ${relative(team, path).replaceAll('\\', '/')}`)
}
await writeFile(join(team, 'SHA256SUMS'), codeHashes.sort().join('\n') + '\n')
await writeFile(join(root, 'SHA256SUMS'), codeHashes.map(line => line.replace('  ', '  packages/team/')).sort().join('\n') + '\n')

// npm bundles the internal modules so the tarball installs without unpublished registry packages.
const manifest = JSON.parse(await readFile(join(team, 'package.json'), 'utf8'))
manifest.bundleDependencies = Object.keys(manifest.dependencies).filter(name => name.startsWith('@dsh-workbench/'))
await writeFile(join(team, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
for (const dir of directories.slice(1)) {
  const meta = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  const target = join(team, 'node_modules', meta.name)
  await mkdir(dirname(target), { recursive: true })
  await cp(dir, target, { recursive: true, filter: path => !path.split(/[\\/]/u).includes('node_modules') })
}
console.log(`Built ${directories.length} plugin modules and ${catalog.length} on-demand skill entries.`)
