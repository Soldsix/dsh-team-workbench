/** Validate the installable repository root and its unchanged V5 runtime files. */
import { readFile, lstat, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const meta = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const errors = []
if (meta.private || meta.name !== 'dsh-team-workbench' || meta.version !== '0.5.0-rc.2') errors.push('Root package identity is not the public candidate')
if (meta.main !== 'lib/index.js' || meta.exports?.['.'] !== './lib/index.js') errors.push('Root ESM entry is missing')
if (meta.dsh?.bundle?.patch !== './cordis.patch.yml') errors.push('Profile bundle metadata is missing')
if (!meta.keywords?.includes('dsh-plugin') || meta.license !== 'MIT') errors.push('Community classification or license is missing')
if (meta.repository?.url !== 'git+https://github.com/Soldsix/dsh-team-workbench.git') errors.push('Repository owner differs from the publication target')
if (meta.peerDependencies?.['@deepseek-ai/dsh'] !== '0.2.1-rc.2') errors.push('Unverified host range')
const internal = ['runtime', 'ui', 'tools', 'compat-tools', 'compat-policy', 'compat-subagent', 'compat-web', 'compat-fetch']
if (Object.keys(meta.dependencies ?? {}).some(name => name.startsWith('@dsh-workbench/')) || meta.bundleDependencies !== undefined) errors.push('The public package must not depend on unpublished internal packages')
for (const slug of internal) {
  const dir = join(root, 'modules', slug)
  const module = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  const exported = meta.exports?.[`./${slug}`]
  if (exported?.default !== `./modules/${slug}/lib/index.js`) errors.push(`Internal module export missing: ${slug}`)
  await access(join(dir, 'lib/index.js'))
}
const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8')
if (!patch.includes("name: 'dsh-team-workbench'") || patch.includes("name: '@dsh-workbench/team'")) errors.push('The root patch does not select the public skill provider')
const entry = await readFile(join(root, meta.main), 'utf8')
if (!/export\s*\{[^}]*\bapply\b/su.test(entry)) errors.push('The ESM module does not export apply')
const baseline = JSON.parse(await readFile(join(root, 'public-runtime-sha256.json'), 'utf8'))
for (const [relative, expected] of Object.entries(baseline)) {
  const file = resolve(root, relative)
  if (!file.startsWith(resolve(root) + '/') && !file.startsWith(resolve(root) + '\\')) { errors.push('Unsafe runtime manifest path'); continue }
  if ((await lstat(file)).isSymbolicLink()) { errors.push(`Runtime link: ${relative}`); continue }
  const actual = createHash('sha256').update(await readFile(file)).digest('hex')
  if (actual !== expected) errors.push(`Runtime differs from validated V5 bytes: ${relative}`)
}
for (const name of ['README.md', 'README.zh.md', 'README.en.md', 'docs/public-package.md']) {
  const file = join(root, name), text = await readFile(file, 'utf8')
  if (!text.endsWith('\n') || text.endsWith('\n\n')) errors.push(`Invalid trailing newline: ${name}`)
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/gu)) {
    const target = match[1]
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(target)) continue
    try { await access(resolve(dirname(file), decodeURIComponent(target.split('#')[0]))) }
    catch (error) { errors.push(`Broken document link in ${name}: ${target} (${error.code})`) }
  }
}
const readme = await readFile(join(root, 'README.md'), 'utf8')
if (!readme.includes('[English](README.en.md)') || !readme.includes('dsh plugin --profile web add github:Soldsix/dsh-team-workbench')) errors.push('Language switch or source-install command missing')
if (errors.length) { process.stderr.write(errors.join('\n') + '\n'); process.exitCode = 1 }
else console.log(`Public root checks passed: ${meta.name}@${meta.version}, ${internal.length} package module exports, ${Object.keys(baseline).length} runtime/source/skill file hashes.`)
