/** Check the independent source distribution before packing or publishing it. */
import { readFile, readdir, lstat, access } from 'node:fs/promises'
import { resolve, join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url)), team = join(root, 'packages/team')
const errors = []
const names = new Set()
const rootMeta = JSON.parse(await readFile(join(team, 'package.json'), 'utf8'))
for (const dir of [team, ...(await readdir(join(team, 'modules'))).map(name => join(team, 'modules', name))]) {
  const meta = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  if (meta.private || meta.publishConfig?.access !== 'public' || meta.version !== rootMeta.version) errors.push(`Invalid public manifest: ${relative(root, dir)}`)
  if (names.has(meta.name)) errors.push(`Duplicate package: ${meta.name}`)
  names.add(meta.name)
  for (const [name, version] of Object.entries(meta.peerDependencies ?? {})) if (name.startsWith('@deepseek-ai/dsh-') || name === '@deepseek-ai/dsh') {
    if (version !== '0.2.1-rc.2') errors.push(`Unverified host peer range: ${meta.name} ${name}`)
  }
  const entry = await readFile(join(dir, 'lib/index.js'), 'utf8')
  if (/vendor\/|source\/packages\/|DSH-Staging|\.\.\/runtime\//u.test(entry)) errors.push(`Host source leaked into bundle: ${meta.name}`)
  if (!entry.includes('export')) errors.push(`Missing ESM entry: ${meta.name}`)
}
if ((rootMeta.bundleDependencies ?? []).length !== 8) errors.push('The install archive must bundle all eight internal modules')
async function walk(dir) {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__pycache__') continue
    const path = join(dir, entry.name)
    if ((await lstat(path)).isSymbolicLink()) { errors.push(`Source distribution contains a link: ${relative(root, path)}`); continue }
    if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path)
  }
  return files
}
const files = [...await walk(team), ...await walk(join(root, 'docs')), ...await walk(join(root, 'examples')),
  ...['README.md', 'README.zh.md', 'CONTRIBUTING.md', 'SECURITY.md', 'NOTICE.md', 'CHANGELOG.md'].map(name => join(root, name))]
for (const path of files) {
  if (!/\.(?:md|ts|tsx|js|json|yml|css|snap)$/u.test(path)) continue
  const text = await readFile(path, 'utf8')
  if (/(?:C:[\\/]Users[\\/]Administrator|E:[\\/]DSH-Staging|(?:gh[pousr]_[A-Za-z0-9]{30,})|sk-[A-Za-z0-9]{32,})/u.test(text)) errors.push(`Private path or credential-like value: ${relative(root, path)}`)
  if (path.endsWith('.md')) {
    if (!text.endsWith('\n') || text.endsWith('\n\n')) errors.push(`Markdown trailing newline: ${relative(root, path)}`)
    for (const match of text.matchAll(/!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/gu)) {
      const target = match[1] ?? match[2]
      if (!target || /^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(target)) continue
      const local = resolve(dirname(path), decodeURIComponent(target.split('#')[0]))
      try { await access(local) } catch { errors.push(`Broken link in ${relative(root, path)}: ${target}`) }
    }
  }
}
const catalog = JSON.parse(await readFile(join(team, 'skills/catalog.json'), 'utf8'))
if (new Set(catalog.map(skill => skill.name)).size !== catalog.length || catalog.length !== 56) errors.push('Unexpected or duplicate skill catalog')
const { readProjectPlan } = await import(new URL('../packages/team/modules/runtime/lib/types/project-plan.js', import.meta.url))
if (readProjectPlan(await readFile(join(root, 'examples/project-plan-v2.json'), 'utf8'))?.version !== 2) errors.push('Example plan does not pass the actual parser')
if (errors.length) { process.stderr.write(errors.join('\n') + '\n'); process.exitCode = 1 }
else console.log(`Release source checks passed: ${names.size} packages, ${catalog.length} skill entries, ${files.length} files.`)
