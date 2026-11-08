/** Read exact bundled work-skill content without walking unrelated modules. */
import { createHash } from 'node:crypto'
import { readFile, stat, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { isModelInvocable, isSkillName, renderSkillContent } from '@deepseek-ai/dsh-skill'
import type { SkillDefinition } from '@deepseek-ai/dsh-skill'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-working-directory'
import { fileURLToPath } from 'node:url'

const bundledVersion = readFile(new URL('../package.json', import.meta.url), 'utf8').then((text) => {
  const metadata: unknown = JSON.parse(text)
  if (typeof metadata !== 'object' || metadata === null || !('version' in metadata)
    || typeof metadata.version !== 'string' || metadata.version.length === 0) throw new Error('bundled skill package version is missing')
  return metadata.version
})

let catalog: Promise<{ name: string; description: string }[]> | undefined

/**
 * Resolve the active project before discovering a mode's local skills.
 * @param ctx - Registry owner; directory-free skill catalogs may omit workingDirectory.
 * @param agent - Session requesting the skill.
 * @param signal - Cancellation during directory validation.
 * @returns Scoped lookup using the committed directory, or the initial directory on older hosts.
 */
export async function resolveSkillLookup(ctx: Context, agent: Agent, signal: AbortSignal): Promise<{ scope: Agent; cwd?: string; signal: AbortSignal }> {
  const directories = ctx.get('workingDirectory')
  const cwd = directories === undefined ? agent.session.header.cwd : await directories.ensure(agent, signal)
  return { scope: agent, ...cwd === undefined ? {} : { cwd }, signal }
}

/**
 * Read one module from this package's fixed skill tree.
 * @param name - Exact team-* catalog name.
 * @param signal - Caller cancellation while reading the file.
 * @param reference - Optional module-local Markdown reference filename.
 * @param maxBytes - Optional caller-configured document byte limit.
 * @returns LF-normalized body and its SHA-256 digest.
 */
export async function readBundledSkill(name: string, signal: AbortSignal, reference?: string,
  maxBytes?: number): Promise<{ name: string; digest: string; content: string }> {
  if (!isSkillName(name) || !name.startsWith('team-')) throw new Error('工作技能名称必须是入口中列出的 team-* 名称。')
  if (reference !== undefined && !/^(?:[A-Za-z0-9][A-Za-z0-9._-]*\/)*[A-Za-z0-9][A-Za-z0-9._-]*\.md$/u.test(reference)) {
    throw new Error('reference 必须是模块内的 Markdown 相对路径，不能含绝对路径、上级路径或反斜杠。')
  }
  const document = reference ?? 'SKILL.md'
  const entry = name === 'team-workbench' ? document : `references/${name}/${document}`
  const path = new URL(`../skills/team-workbench/${entry}`, import.meta.url)
  let content: string
  try {
    const base = await realpath(fileURLToPath(new URL(name === 'team-workbench'
      ? '../skills/team-workbench/' : `../skills/team-workbench/references/${name}/`, import.meta.url)))
    const canonical = relative(base, await realpath(path))
    if (canonical === '..' || canonical.startsWith(`..${sep}`) || isAbsolute(canonical)) throw new Error('技能参考文件超出模块目录。')
    if (maxBytes !== undefined && (await stat(path)).size > maxBytes) throw new Error(`技能文档超过 ${maxBytes} 字节；选择更小的参考文档。`)
    content = await readFile(path, { encoding: 'utf8', signal })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') throw new Error(`找不到 ${name}${reference === undefined ? '' : `/${reference}`}。用 team_skill_catalog 按问题检索准确名称，再读取模块列出的参考文件。`)
    throw error
  }
  content = content.replaceAll('\r\n', '\n')
  content = `<!-- DSH Team skill package ${await bundledVersion} -->\n` + content
  if (maxBytes !== undefined && Buffer.byteLength(content, 'utf8') > maxBytes) throw new Error(`技能文档超过 ${maxBytes} 字节。`)
  return { name, digest: createHash('sha256').update(content).digest('hex'), content }
}

/**
 * Read only the fixed package's skill metadata; professional bodies do not enter the model catalog.
 * @param signal - Cancellation while reading immutable package files.
 * @returns exact names and single-line descriptions, sorted by name.
 */
export async function listBundledSkills(signal: AbortSignal): Promise<{ name: string; description: string }[]> {
  signal.throwIfAborted()
  catalog ??= readFile(new URL('../skills/catalog.json', import.meta.url), 'utf8').then(text => {
    const value: unknown = JSON.parse(text)
    if (!Array.isArray(value)) throw new Error('Invalid bundled skill catalog; rebuild the package')
    const entries = value.map((item: unknown) => {
      if (typeof item !== 'object' || item === null || !('name' in item) || typeof item.name !== 'string'
        || !isSkillName(item.name) || !('description' in item) || typeof item.description !== 'string' || !item.description.trim()) {
        throw new Error('Invalid bundled skill catalog entry')
      }
      return { name: item.name, description: item.description }
    })
    if (new Set(entries.map(entry => entry.name)).size !== entries.length) throw new Error('Duplicate bundled skill catalog name')
    return entries
  })
  const entries = await catalog
  signal.throwIfAborted()
  return entries.map(entry => ({ ...entry }))
}

/**
 * Resolve a model-invocable mode skill first, then a bundled module with the same exact name.
 * @param ctx - Skill registry owner.
 * @param agent - Caller whose mode determines available skills.
 * @param name - Exact skill name.
 * @param signal - Cancellation for provider reads.
 * @param maxBytes - Optional document byte limit for bundled modules.
 * @returns Saved model-visible content and its digest.
 */
export async function resolveTeamSkill(
  ctx: Context, agent: Agent, name: string, signal: AbortSignal, maxBytes?: number,
): Promise<{ name: string; digest: string; content: string }> {
  if (!isSkillName(name)) throw new Error('技能名称无效。')
  const lookup = await resolveSkillLookup(ctx, agent, signal)
  const skill = await ctx.skills.get(name, lookup)
  if (skill !== undefined && skill.provider !== 'team-workbench') return snapshotModeSkill(skill, signal, maxBytes)
  if (name.startsWith('team-')) return await readBundledSkill(name, signal, undefined, maxBytes)
  if (skill === undefined) {
    const suffix = name.split('-').at(-1) ?? name
    const candidates = (await ctx.skills.list(lookup))
      .filter(item => isModelInvocable(item) && (item.name.includes(suffix) || item.name.includes(name)))
      .slice(0, 5).map(item => item.name)
    throw new Error(`当前模式没有可供模型调用的技能 ${name}。${candidates.length === 0 ? '' : `可能相关的准确名称：${candidates.join('、')}。`}用 team_skill_catalog 检索；不会自动替换技能。`)
  }
  return snapshotModeSkill(skill, signal, maxBytes)
}

/**
 * Pin the model-visible body and resource hint of an existing mode skill.
 * @param skill - Resolved definition from the caller's mode.
 * @param signal - Cancellation while collecting referenced local resources.
 * @param maxBytes - Maximum encoded bytes of the body and resource snapshots.
 * @returns Saved model-visible content and its digest.
 */
export async function snapshotModeSkill(skill: SkillDefinition, signal?: AbortSignal,
  maxBytes?: number): Promise<{ name: string; digest: string; content: string }> {
  if (!isModelInvocable(skill)) throw new Error(`当前模式没有可供模型调用的技能 ${skill.name}。`)
  let body = skill.content.replaceAll('\r\n', '\n')
  if (skill.resourceBase?.kind === 'directory') {
    const root = await realpath(resolve(skill.resourceBase.path))
    const visited = new Set<string>()
    const references: string[] = []
    const include = async (text: string, base: string): Promise<void> => {
      const matches = text.matchAll(/(?:\]\(|`)([^\s`<>)]+\.(?:md|json|ya?ml|txt|py|js|ts))(?:#[^\s`)]*)?(?:\)|`)/gu)
      for (const match of matches) {
        signal?.throwIfAborted()
        const name = match[1]
        if (name === undefined) throw new Error('malformed skill resource reference')
        if (/^[a-z][a-z0-9+.-]*:\/\//iu.test(name)) continue
        const path = resolve(base, name)
        const key = relative(root, path)
        if (isAbsolute(name) || key === '..' || key.startsWith(`..${sep}`) || isAbsolute(key)) {
          throw new Error(`技能 ${skill.name} 依赖包外资源 ${name}；请补入该技能目录或改选完整的 team-* 模块，不会向成员注入作者电脑路径。`)
        }
        if (visited.has(path)) continue
        visited.add(path)
        let resource: string
        try {
          const canonical = relative(root, await realpath(path))
          if (canonical === '..' || canonical.startsWith(`..${sep}`) || isAbsolute(canonical)) throw new Error(`技能资源链接超出包目录：${name}`)
          if (maxBytes !== undefined && (await stat(path)).size > maxBytes) throw new Error(`技能资源超过 ${maxBytes} 字节：${name}`)
          resource = (await readFile(path, { encoding: 'utf8', ...signal === undefined ? {} : { signal } })).replaceAll('\r\n', '\n')
        } catch (error: unknown) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') throw new Error(`技能 ${skill.name} 缺少资源 ${name}；先补全资源或选择完整的 team-* 技能，不会保存不完整技能。`)
          throw error
        }
        references.push(`\n<skill_resource path=${JSON.stringify(key.split(sep).join('/'))}>\n${resource}\n</skill_resource>`)
        if (maxBytes !== undefined && Buffer.byteLength(body + references.join(''), 'utf8') > maxBytes) throw new Error(`技能及资源超过 ${maxBytes} 字节；选择更小的模块。`)
        await include(resource, dirname(path))
      }
    }
    await include(body, root)
    if (references.length > 0) body += '\n\n引用资源已随本版本内嵌；按下方路径标签读取内容，不要访问宿主绝对路径。' + references.join('')
  }
  const content = renderSkillContent({ name: skill.name, provider: skill.provider, content: body }).replaceAll('\r\n', '\n')
  if (maxBytes !== undefined && Buffer.byteLength(content, 'utf8') > maxBytes) throw new Error(`技能正文及资源超过 ${maxBytes} 字节。`)
  return { name: skill.name, digest: createHash('sha256').update(content).digest('hex'), content }
}
