/**
 * Bundled Chinese work skills contributed through the native skill provider.
 * @module @deepseek-ai/dsh-experimental-agent-team-profile
 */

import type { Context } from '@deepseek-ai/cordis'
import { fileURLToPath } from 'node:url'
import z from '@deepseek-ai/schemastery'
import * as SkillFilesystem from '@deepseek-ai/dsh-skill-filesystem'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { isModelInvocable } from '@deepseek-ai/dsh-skill'
import { listBundledSkills, readBundledSkill, resolveSkillLookup, resolveTeamSkill, snapshotModeSkill } from './reader.ts'
import { installSkillSelections } from './selection-tools.ts'
import { installBackgroundContinuity } from './continuity.ts'
import { installTeamServiceGuard } from './service-guard.ts'

export const name = 'team-workbench-skills'
export const inject: string[] = ['skills', 'tools']

/** Bounds for explicit on-demand skill reads and catalog pages. */
export interface Config {
  /** Additional user-maintained skill directories; never copied into this package or loaded wholesale. */
  additionalSkillRoots?: { providerName: string; path: string }[]
  /** Maximum results per catalog page; defaults to 20. */
  maxCatalogResults?: number
  /** Maximum bytes of one bundled document; defaults to 65536. Selection has its own Team limit. */
  maxReferenceBytes?: number
  /** Preserve active turns while their owned background jobs run. */
  autoFollowJobs?: boolean
  /** Presets in which background continuity and its control tool are omitted. */
  autoFollowExcludedPresets?: string[]
}

export const Config: z<Config> = z.object({
  additionalSkillRoots: z.array(z.object({ providerName: z.string().required(), path: z.string().required() })).default([]),
  maxCatalogResults: z.number().step(1).min(1).default(20),
  maxReferenceBytes: z.number().step(1).min(1).default(65_536),
  autoFollowJobs: z.boolean().default(true),
  autoFollowExcludedPresets: z.array(z.string()).default([]),
})

/**
 * Mount immutable package skills in every mode and remove them on plugin disposal.
 * @param ctx - Plugin context with the profile's skills and tool registries.
 * @param config - Catalog and document limits, independent of mode and model configuration.
 */
export function apply(ctx: Context, config: Config = {}): void {
  ctx.inject(['agents', 'sessionPersistence'], installTeamServiceGuard)
  const maxCatalogResults = config.maxCatalogResults ?? 20
  const maxReferenceBytes = config.maxReferenceBytes ?? 65_536
  if (![maxCatalogResults, maxReferenceBytes].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('团队技能目录和文档上限必须是正整数。')
  }
  const customRoots = config.additionalSkillRoots ?? []
  if (new Set(customRoots.map(root => root.providerName)).size !== customRoots.length
    || customRoots.some(root => !/^[a-z0-9][a-z0-9-]*$/u.test(root.providerName) || root.providerName === 'team-workbench' || !root.path.trim())) {
    throw new Error('Custom skill providers need unique names, non-empty paths, and must not replace team-workbench')
  }
  for (const root of customRoots) ctx.plugin(SkillFilesystem, {
    providerName: root.providerName, includeDefaultRoots: false, bundledSkillDir: root.path, watch: false,
  })
  ctx.on('team/resolve-skill', async ({ agent, name, signal }, next) =>
    name.startsWith('team-') ? resolveTeamSkill(ctx, agent, name, signal, maxReferenceBytes)
      : ctx.skills.get(name, await resolveSkillLookup(ctx, agent, signal)).then(skill =>
        skill === undefined ? next() : snapshotModeSkill(skill, signal, maxReferenceBytes)))
  ctx.inject(['agentTeams', 'agents', 'systemPrompt', 'sessionProjections'], (c) => { installSkillSelections(c, maxReferenceBytes) })
  if (config.autoFollowJobs !== false) {
    ctx.inject(['agents', 'jobs', 'systemPrompt'], (c) => {
      installBackgroundContinuity(c, new Set(config.autoFollowExcludedPresets ?? []))
    })
  }
  ctx.plugin(SkillFilesystem, {
    providerName: 'team-workbench',
    includeDefaultRoots: false,
    bundledSkillDir: fileURLToPath(new URL('../skills/', import.meta.url)),
    watch: false,
  })
  ctx.tools.register(defineTool({
    name: 'team_skill_catalog',
    description: '按问题检索插件的专业技能及当前模式已有技能，只返回名称和用途，不加载正文。名称不确定时先查此工具；用准确名称选择 team_skills 或临时读取 team_skill。',
    isConcurrencySafe: () => true,
    parameters: {
      query: { type: 'string', description: '问题、领域或名称片段；多个词以空格分隔，任一词匹配。省略按名称分页。' },
      offset: { type: 'integer', description: '从 0 开始的分页位置；继续使用返回的 nextOffset，查询变化时归零。' },
      limit: { type: 'integer', description: `每页条数，1 至 ${maxCatalogResults}，默认 ${maxCatalogResults}。` },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    presentCall: args => ({ card: 'generic', title: '查找工作技能', kind: 'read', rawInput: args.query }),
    presentResult: (_args, result) => ({ card: 'generic', title: '可选技能', content: result.content }),
    async execute(args, exec) {
      const offset = args.offset ?? 0
      const limit = args.limit ?? maxCatalogResults
      if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > maxCatalogResults) {
        throw new Error(`offset 须为非负整数，limit 须为 1 至 ${maxCatalogResults}。`)
      }
      if ((args.query?.length ?? 0) > 200) throw new Error('query 最多 200 字符；按一个具体问题检索。')
      const bundled = await listBundledSkills(exec.signal)
      const mode = await ctx.skills.list({
        ...exec.agent === undefined ? {} : await resolveSkillLookup(ctx, exec.agent, exec.signal), signal: exec.signal,
      })
      const entries = new Map(bundled.map(item => [item.name, { ...item, source: 'team-bundled' }]))
      for (const item of mode) {
        if (isModelInvocable(item)) entries.set(item.name, { name: item.name, description: item.description, source: item.source })
        else entries.delete(item.name)
      }
      const terms = (args.query ?? '').toLocaleLowerCase().split(/\s+/u).filter(Boolean)
      const matches = [...entries.values()].filter(item => terms.length === 0
        || terms.some(term => `${item.name} ${item.description}`.toLocaleLowerCase().includes(term)))
        .sort((left, right) => left.name.localeCompare(right.name))
      return JSON.stringify({ total: matches.length, entries: matches.slice(offset, offset + limit),
        ...offset + limit >= matches.length ? {} : { nextOffset: offset + limit } })
    },
  }))
  ctx.tools.register(defineTool({
    name: 'team_skill',
    description: '按需读取一项工作技能或该模块列出的详细参考文件。先用 team_skill_catalog 查准确名称；已选正文会自动恢复，不要重复读取。参考文件只临时读取，不替换已保存的技能版本。',
    parameters: {
      name: { type: 'string', required: true, description: '准确的技能名，例如 team-android-fingerprint 或当前模式列出的技能。' },
      reference: { type: 'string', description: '仅插件模块：模块内的 Markdown 相对路径，如 references.md 或 official/SKILL.md；省略读取正文。不能使用绝对路径、上级路径或反斜杠。' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          digest: { type: 'string', required: true, description: '换行统一为 LF 后的正文 SHA-256，供交接与版本核对。' },
          content: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [
        { type: 'text', text: `工作技能：${value.name}\n内容摘要：${value.digest}` },
        { type: 'text', text: value.content },
      ],
    },
    presentCall: args => ({ card: 'generic', title: '读取工作技能', kind: 'read', rawInput: args.name }),
    presentResult: (_args, result) => ({ card: 'generic', title: '工作技能', content: result.content }),
    async execute(args, exec) {
      if (args.reference !== undefined) {
        const teams = ctx.get('agentTeams')
        const saved = exec.agent === undefined || teams?.tryMembership(exec.agent) === undefined
          ? undefined : teams.getSkillContent(exec.agent, args.name)
        if (saved !== undefined && saved.digest !== (await readBundledSkill(args.name, exec.signal, undefined, maxReferenceBytes)).digest) {
          throw new Error('已选技能与当前插件资源版本不同；保留原包版本读取，或由队长明确重新选择技能。不会把新参考资料混入旧正文。')
        }
        return await readBundledSkill(args.name, exec.signal, args.reference, maxReferenceBytes)
      }
      const teams = ctx.get('agentTeams')
      if (teams !== undefined && exec.agent !== undefined && teams.tryMembership(exec.agent) !== undefined) {
        const saved = teams.getSkillContent(exec.agent, args.name)
        if (saved !== undefined) return { name: saved.name, digest: saved.digest, content: saved.content }
      }
      return exec.agent === undefined ? await readBundledSkill(args.name, exec.signal, undefined, maxReferenceBytes)
        : await resolveTeamSkill(ctx, exec.agent, args.name, exec.signal, maxReferenceBytes)
    },
  }))
}
