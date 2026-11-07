/** Bundled work skills keep the catalog small and inherit across mode scopes. */

import { readFile, readdir, stat, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { createHash } from 'node:crypto'
import { bindScopeParent, createScope, scopeOf } from '@deepseek-ai/dsh-scope'
import { describe, expect, it, onTestFinished } from 'vitest'
import * as WorkSkills from '../src/index.ts'

const skillsRoot = fileURLToPath(new URL('../skills/', import.meta.url))

async function registry(): Promise<Context> {
  const ctx = new Context()
  onTestFinished(async () => { await ctx.fiber.dispose() })
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(SkillRegistry)
  return ctx
}

describe('bundled work skills', () => {
  it('discovers a user-maintained skill root without injecting its body into the catalog', async () => {
    const ctx = await registry()
    const root = await mkdtemp(resolve(tmpdir(), 'team-user-skills-'))
    onTestFinished(() => rm(root, { recursive: true, force: true }))
    await mkdir(resolve(root, 'custom-fixture'))
    await writeFile(resolve(root, 'custom-fixture/SKILL.md'), '---\nname: custom-fixture\ndescription: Synthetic custom method\n---\n\nCUSTOM_BODY_ONLY_ON_REQUEST\n')
    await ctx.plugin(WorkSkills, { additionalSkillRoots: [{ providerName: 'user-workflows', path: root }] })
    const catalog = await ctx.skills.list()
    expect(catalog.some(entry => entry.name === 'custom-fixture' && entry.provider === 'user-workflows')).toBe(true)
    expect(JSON.stringify(catalog)).not.toContain('CUSTOM_BODY_ONLY_ON_REQUEST')
    expect((await ctx.skills.get('custom-fixture'))?.content).toContain('CUSTOM_BODY_ONLY_ON_REQUEST')
  })
  it('publishes one Chinese routing summary and keeps professional bodies out of the catalog', async () => {
    const ctx = await registry()
    await ctx.plugin(WorkSkills)
    const catalog = await ctx.skills.list()
    expect(catalog.map(skill => skill.name)).toEqual(['team-workbench'])
    expect(catalog[0]).toMatchObject({ provider: 'team-workbench', source: 'bundled',
      invocation: { modelInvocable: true, userInvocable: true } })
    expect(catalog[0]?.description).toContain('按需')
    expect(Buffer.byteLength(catalog[0]!.description, 'utf8')).toBeLessThan(512)
    expect(catalog[0]).not.toHaveProperty('content')
    expect(await ctx.skills.get('team-android-fingerprint')).toBeUndefined()
    const entry = await ctx.skills.get('team-workbench')
    expect(entry?.content).toContain('references/team-android-fingerprint/SKILL.md')
    expect(entry?.content).toContain('references/team-jsvmp/SKILL.md')
    expect(entry?.content).toContain('references/team-captcha-challenges/SKILL.md')
    expect(entry?.content).not.toContain('# Android 设备指纹 SDK')
    expect(entry?.content).not.toContain('# JSVMP 目标语义恢复')
    expect(entry?.resourceBase).toEqual({ kind: 'directory', path: resolve(skillsRoot, 'team-workbench') })
  })

  it('inherits in every mode and descendant without replacing existing mode skills', async () => {
    const ctx = await registry()
    await ctx.plugin(WorkSkills)
    for (const mode of ['standard', 'ptc', 'minimal', 'cordis', 'beluga', 'whale-standard', 'whale-ptc', 'whale-cordis', 'future-custom-mode']) {
      const preset = createScope(ctx, { preset: mode })
      onTestFinished(async () => { await preset.dispose() })
      preset.ctx.get('skills')!.register({ name: 'original-mode-skill', description: 'Original mode skill',
        source: 'preset', content: `Original ${mode} instructions.` })
      const agent = {}
      bindScopeParent(agent, scopeOf(preset.ctx) as object)
      const grandchild = {}
      bindScopeParent(grandchild, agent)
      expect((await ctx.skills.list({ scope: grandchild })).map(skill => skill.name)).toEqual(['original-mode-skill', 'team-workbench'])
      expect((await ctx.skills.get('original-mode-skill', { scope: grandchild }))?.content).toBe(`Original ${mode} instructions.`)
    }
  })

  it('removes its catalog on disposal and preserves user skills when enabled again', async () => {
    const ctx = await registry()
    ctx.skills.register({ name: 'user-notes', description: 'Existing skill', source: 'user-dsh', content: 'Retain these instructions.' })
    const fiber = ctx.plugin(WorkSkills)
    await fiber
    expect((await ctx.skills.list()).map(skill => skill.name)).toEqual(['team-workbench', 'user-notes'])
    await fiber.dispose()
    expect(ctx.tools.get('team_skill')).toBeUndefined()
    expect(ctx.tools.get('team_skill_catalog')).toBeUndefined()
    expect((await ctx.skills.list()).map(skill => skill.name)).toEqual(['user-notes'])
    expect((await ctx.skills.get('user-notes'))?.content).toBe('Retain these instructions.')
    await ctx.plugin(WorkSkills)
    expect((await ctx.skills.list()).map(skill => skill.name)).toEqual(['team-workbench', 'user-notes'])
  })

  it('loads one module without filesystem tools and rejects paths or unknown modules', async () => {
    const ctx = await registry()
    await ctx.plugin(WorkSkills)
    const execute = (name: string) => ctx.tools.execute({ name: 'team_skill', arguments: { name },
      callId: ToolCallId(`skill-${name}`), signal: new AbortController().signal })
    expect(ctx.tools.get('read')).toBeUndefined()
    const loaded = await execute('team-android-fingerprint')
    expect(loaded.isError).not.toBe(true)
    const version = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version as string
    const content = `<!-- DSH Team skill package ${version} -->\n` + (await readFile(resolve(skillsRoot, 'team-workbench/references/team-android-fingerprint/SKILL.md'), 'utf8')).replaceAll('\r\n', '\n')
    expect(loaded.value).toEqual({ name: 'team-android-fingerprint', digest: createHash('sha256').update(content).digest('hex'), content })
    expect(loaded.content).toEqual([
      { type: 'text', text: `工作技能：team-android-fingerprint\n内容摘要：${createHash('sha256').update(content).digest('hex')}` },
      { type: 'text', text: content },
    ])
    const akamai = await execute('team-akamai-web-sdk')
    expect(akamai.isError).not.toBe(true)
    expect(akamai.value).toMatchObject({ name: 'team-akamai-web-sdk' })
    expect(JSON.stringify(akamai.content)).toContain('Cookie 生命周期')
    expect((await execute('team-../../package.json')).isError).toBe(true)
    expect((await execute('team-missing-module')).isError).toBe(true)
    expect((await ctx.skills.list()).map(skill => skill.name)).toEqual(['team-workbench'])
  })

  it('resolves each new specialist by exact name without expanding the initial catalog', async () => {
    const ctx = await registry()
    await ctx.plugin(WorkSkills)
    const names = [
      'team-jsvmp', 'team-offline-computation', 'team-captcha-challenges',
      'team-risk-sdk', 'team-byte-device', 'team-commerce-platforms',
      'team-crawler-discovery', 'team-crawler-pipeline', 'team-business-authorization', 'team-threat-intelligence',
      'team-meituan-signature', 'team-shopee-detail', 'team-cn-commerce',
      'team-network-research', 'team-tool-operations', 'team-workspace-handoff', 'team-windows-execution',
      'team-review-decisions', 'team-memory-recovery', 'team-wechat-miniprogram', 'team-novel-continuity',
      'team-fiction-craft', 'team-product-ui-design', 'team-deployment-operations',
    ]
    for (const name of names) {
      const result = await ctx.tools.execute({ name: 'team_skill', arguments: { name },
        callId: ToolCallId(`skill-${name}`), signal: new AbortController().signal })
      expect(result.isError, name).not.toBe(true)
      expect(result.value, name).toMatchObject({ name })
      expect(JSON.stringify(result.value)).toContain(`name: ${name}`)
    }
    expect((await ctx.skills.list()).map(skill => skill.name)).toEqual(['team-workbench'])
  })

  it('searches bounded metadata pages without loading unrelated bodies or hiding mode skills', async () => {
    const ctx = await registry()
    ctx.skills.register({ name: 'original-fiction', description: '小说模式已有方法', source: 'preset', content: 'Preserve this mode body.' })
    await ctx.plugin(WorkSkills, { maxCatalogResults: 2 })
    const call = (args: Record<string, unknown>) => ctx.tools.execute({ name: 'team_skill_catalog', arguments: args,
      callId: ToolCallId('catalog-page'), signal: new AbortController().signal })
    const first = await call({ query: '小说' })
    expect(first.isError).toBe(false)
    expect(typeof first.value).toBe('string')
    const page = JSON.parse(String(first.value)) as { entries: { name: string }[]; nextOffset: number }
    expect(page.entries).toHaveLength(2)
    expect(page.entries[0]?.name).toBe('original-fiction')
    expect(first.value).not.toContain('Preserve this mode body.')
    expect(first.value).not.toContain('## 编辑顺序')
    const next = await call({ query: '小说', offset: page.nextOffset })
    expect(next.isError).toBe(false)
    expect(next.value).toContain('team-novel-continuity')
    expect((await call({ limit: 3 })).isError).toBe(true)
    expect((await call({ offset: -1 })).isError).toBe(true)
    expect((await ctx.skills.get('original-fiction'))?.content).toBe('Preserve this mode body.')
    expect((await ctx.skills.list()).map(item => item.name)).toEqual(['original-fiction', 'team-workbench'])
  })

  it('reads detailed references without file tools, and rejects traversal and oversized documents', async () => {
    const ctx = await registry()
    await ctx.plugin(WorkSkills)
    const call = (reference: string) => ctx.tools.execute({ name: 'team_skill', arguments: { name: 'team-fiction-craft', reference },
      callId: ToolCallId('fiction-reference'), signal: new AbortController().signal })
    const result = await call('references.md')
    expect(result.isError).toBe(false)
    expect(result.value).toMatchObject({ name: 'team-fiction-craft', content: expect.stringContaining('## 六、示范修订') })
    expect((await call('../package.json')).isError).toBe(true)
    expect((await call('missing.md')).isError).toBe(true)
    expect(ctx.tools.get('read')).toBeUndefined()
    const limited = await registry()
    await limited.plugin(WorkSkills, { maxReferenceBytes: 100 })
    const oversized = await limited.tools.execute({ name: 'team_skill', arguments: { name: 'team-fiction-craft', reference: 'references.md' },
      callId: ToolCallId('bounded-reference'), signal: new AbortController().signal })
    expect(oversized.isError).toBe(true)
    expect(JSON.stringify(oversized.content)).toContain('超过 100 字节')
  })

  it('retains a user override with the same skill name', async () => {
    const ctx = await registry()
    ctx.skills.register({ name: 'team-workbench', description: 'User work instructions', source: 'user-dsh', content: 'User-owned body.' })
    await ctx.plugin(WorkSkills)
    expect((await ctx.skills.get('team-workbench'))?.content).toBe('User-owned body.')
  })

  it('ships all linked reference bodies inside the published skill tree', async () => {
    const files = await readdir(skillsRoot, { recursive: true, withFileTypes: true })
    const documents = files.filter(file => file.isFile() && file.name.endsWith('.md'))
    expect(documents.length).toBeGreaterThan(20)
    for (const file of documents) {
      const path = resolve(file.parentPath, file.name)
      const body = await readFile(path, 'utf8')
      if (!path.includes(`${sep}team-adspower-browser${sep}official${sep}`)) {
        expect(body, path).toMatch(/[\u4e00-\u9fff]/)
      }
      for (const match of body.matchAll(/\]\(([^)]+)\)/g)) {
        const link = match[1]!
        if (link.startsWith('https:') || link.startsWith('#')) continue
        const target = resolve(dirname(path), link.split('#')[0]!)
        const within = relative(skillsRoot, target)
        expect(isAbsolute(within) || within.startsWith('..'), path).toBe(false)
        expect((await stat(target)).isFile(), `${path}: ${link}`).toBe(true)
      }
    }
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { files: string[] }
    expect(manifest.files).toContain('skills/**/*.md')
  })
})
