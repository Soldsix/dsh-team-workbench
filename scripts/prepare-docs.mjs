/** Generate public module references and the skills handbook from package-owned metadata. */
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as yaml from 'js-yaml'
const root = fileURLToPath(new URL('../', import.meta.url)), team = join(root, 'packages/team')
const references = {
  runtime: ['Persist reviewed goals, members, executions and artifact acceptance.', '保存确认目标、成员、执行与成果验收。', 'coordinationRoot, autoProvisionPlannedMembers, maxProvisionPerPass, maxMembers, maxDepth, workspaceIsolation'],
  tools: ['Expose scoped collaboration tools and on-demand calling guidance.', '提供成员作用域内的协作工具与按需调用说明。', 'freshProvider, forkProvider, automaticTeams, requireDetailedPlan, requireMemberSkills'],
  ui: ['Display the current Team, its grouped work and independent review evidence.', '展示当前团队、分组任务及独立复核证据。', 'Uses the host theme and current Session projections. / 使用宿主主题与当前会话投影。'],
  'compat-tools': ['Keep scoped tool caps and the released host scheduler connected.', '连接工具作用域上限与已发布宿主调度器。', 'mode, maxParallelSubCalls'],
  'compat-policy': ['Map isolated member workspaces into the host sandbox policy.', '将隔离成员工作区映射到宿主沙箱策略。', 'mode, workspaceRoot'],
  'compat-subagent': ['Retain nested member Sessions and restore their exact ancestors.', '保留嵌套成员会话并恢复真实祖先。', 'maxDepth'],
  'compat-web': ['Resolve configured search/fetch providers with explicit availability and recovery.', '按配置选择搜索／读取提供方并报告就绪与恢复状态。', 'searchProvider, fetchProvider, searchFallbackProviders, searchFailureCooldownMs'],
  'compat-fetch': ['Fetch allowed HTTP resources with transport, redirect and size limits.', '在传输、重定向和容量限制下读取已允许的 HTTP 资源。', 'maxResponseBytes, maxBodyChars, timeoutMs, maxRedirects, userAgent'],
}
for (const [name, [en, zh, fields]] of Object.entries(references)) {
  const dir = join(team, 'modules', name)
  const meta = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  for (const locale of ['en', 'zh']) {
    const chinese = locale === 'zh'
    const text = [
      '---', `description: "${chinese ? zh : en}"`, 'kind: "package-reference"', '---', '',
      `# ${meta.name}`, '', chinese ? '[English](README.md) | 中文' : 'English | [中文](README.zh.md)', '',
      chinese ? '## 概要' : '## Summary', '', chinese ? zh : en, '',
      chinese ? '## 使用与配置' : '## Use and configuration', '',
      chinese ? '此模块随团队 bundle 安装，不应独立安装第二套服务。部署与回滚见[安装说明](../../docs/installation.md)。' : 'This module ships inside the Team bundle; do not install a second service independently. See [installation and rollback](../../docs/installation.md).', '',
      chinese ? `配置入口：${fields}。完整声明以 [src/index.ts](src/index.ts) 为准；部署默认值见 [cordis.patch.yml](../../cordis.patch.yml)。` : `Configuration: ${fields}. [src/index.ts](src/index.ts) owns the complete declaration; deployment defaults are in [cordis.patch.yml](../../cordis.patch.yml).`, '',
      chinese ? '## 行为与验证' : '## Behavior and verification', '',
      chinese ? '真实调用、取消、恢复、界面与宿主版本的验证范围见[测试报告](../../docs/test-report.md)。目录中存在实现代码不等于外部设备或提供方已经通过。' : 'See the [test report](../../docs/test-report.md) for actual invocation, cancellation, recovery, UI and host-version coverage. Source presence does not establish external provider or device readiness.', '',
      chinese ? '## 模型体验' : '## Model experience', '',
      chinese ? '工具、目标、身份、技能与证据通过宿主 Session 机制记录。成员只加载选定模块，未知状态和调用错误需如实报告；注册成功不等于外部服务可用。' : 'Tools, goals, identity, selected skills and evidence are logged through the host Session mechanism. Members load selected modules only; unknown states and execution failures remain explicit. Registration does not imply external service readiness.', '',
      chinese ? '## 限制与开发' : '## Limitations and development', '',
      chinese ? '仅使用[已验证宿主版本](../../docs/compatibility.md)。共享发布锁不约束任意完整权限程序，真实 MCP 与设备需要单独验收。开发遵循[架构说明](../../docs/architecture.md)，不修改模式、人设或全局模型默认值。' : 'Use a [verified host version](../../docs/compatibility.md). Shared publication locks do not constrain arbitrary privileged programs; actual MCP servers and devices need separate acceptance. Follow the [architecture](../../docs/architecture.md), preserving modes, personas and global model defaults.', '',
    ].join('\n')
    await writeFile(join(dir, chinese ? 'README.zh.md' : 'README.md'), text)
  }
}
const catalog = JSON.parse(await readFile(join(team, 'skills/catalog.json'), 'utf8'))
const modules = catalog.filter(entry => entry.name !== 'team-workbench')
const escape = value => value.replaceAll('|', '\\|').replaceAll('\n', ' ')
const book = `# Skills 技能专册\n\n## 概要\n\n本版包含 ${modules.length} 个专业模块和一个团队入口。目录只提供名称与用途，正文按任务选择后加载；模式已有技能继续按宿主优先级解析。模块是可版本化的工作方法，不是对真实工具、模型或所有专业结果的成功保证。\n\n## 选择与上下文\n\n先用 team_skill_catalog 按具体问题检索，再选择一个当前流程与一至两个专业模块。每成员默认最多四个模块，并受 maxSkillSelectionBytes 限制；目录摘要不等于正文已加载。阶段切换前保存任务、输入、证据和未完成项，再显式调整技能，避免将全部历史与无关正文塞入上下文。\n\n角色指令、模式人设和技能职责分别保存。当前成员身份、确认目标与选定技能版本在冷恢复和压缩后重新形成上下文；旧项目授权不能跨项目自动复用。某个模型的限制或意见应当记录为该模型的阻碍，不得伪装成用户改变了授权。\n\n## V5 新增模块\n\n- team-research-design：把口语目标变成问题、假设、控制变量、证据和停止条件。\n- team-handoff-continuity：保留当前状态、失败尝试、输入版本、成果和下一步，交接时先核对再续跑。\n- team-tool-health-recovery：按工具发现、准入、凭据、网络与执行层定位错误，避免同类失败反复消耗。\n- team-quality-engineering：建立验收矩阵、独立验证、反例、回归与可复现交付。\n\n## 目录\n\n| 模块 | 用途摘要 |\n| --- | --- |\n${modules.map(entry => `| ${escape(entry.name)} | ${escape(entry.description)} |`).join('\n')}\n\n## 专业方法要求\n\n每个项目按实际样本、版本和目标范围选工作流。研究类保留原始样本、单变量实验、已排除假设及复现输入；开发类对齐需求、接口、实现、测试与交付；创作类固定人物、时间线、章节进入和离开状态并做连续性复核；运维类先诊断，再核对变更回执、健康和恢复。\n\n公开搜索和项目下载必须符合项目范围与真实工具权限；记录官方来源、版本和核查日期。技能更新先成为候选，经示例、反例与回归验证后发布；运行中的任务使用固定版本，不在执行途中悄悄替换。\n\n## 自定义\n\n通过 team-workbench-skills.additionalSkillRoots 加入自己的模块目录，使用独立 providerName。编写明确的适用条件、必要提问、输入和工具、步骤与分支、交付、验收、恢复及来源。不要复制私人账号、授权、人设或项目敏感资料到可复用技能。\n\n## 验证范围\n\n本轮验证目录解析、按需读取、选择预算、同名模式技能、版本固定、冷恢复与正文退休。真实 Android/iOS、微信工具、浏览器环境、生产运维、商业写作效果以及特定厂商最新协议不能仅凭技能文档判为通过，需在各自授权项目中验收。\n`
await writeFile(join(root, 'docs/skills.md'), book)
await mkdir(join(root, 'examples'), { recursive: true })
const common = { parent: 'lead', modelProvider: '<configured-provider>', model: '<exact-model-id>', reasoningEffort: '<highest-supported-effort>',
  responsibility: 'Review the supplied synthetic fixture and retain evidence', skills: ['team-quality-engineering'] }
const plan = { format: 'dsh-team-project-plan', version: 2, automation: { provision: 'on-demand', requirePlanningGate: true },
  members: [{ ...common, name: 'planner', function: 'planning_adviser' }, { ...common, name: 'quality', function: 'quality_adviser' },
    { ...common, name: 'writer', function: 'executor', instructions: 'Work only on the assigned task and preserve accepted artifacts.' },
    { ...common, name: 'verifier', function: 'verifier' }],
  tasks: [{ id: 'planning-v1', owner: 'writer', reviewer: 'verifier', description: 'Fix the input and acceptance matrix', kind: 'plan',
    dependencies: [], inputs: ['fixture.txt'], outputs: [], acceptanceCriteria: ['Input and acceptance matrix are explicit'], critical: true },
  { id: 'report-v1', owner: 'writer', reviewer: 'verifier', description: 'Write and independently verify the fixture report', kind: 'delivery',
    dependencies: ['planning-v1'], inputs: ['fixture.txt'], outputs: ['reports/result.md'], acceptanceCriteria: ['The report matches the supplied fixture'], critical: true }],
  resources: { maxMembers: 4, maxConcurrentRequests: 4 }, reviewPolicy: 'independent-and-dual-for-critical', previousTasks: [],
  recovery: 'Resume retained members; inspect receipts before repeating any operation' }
await writeFile(join(root, 'examples/project-plan-v2.json'), JSON.stringify(plan, null, 2) + '\n')
const expression = new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: text => ({ expression: text }) })
const layer = yaml.load(await readFile(join(team, 'cordis.patch.yml'), 'utf8'), { schema: yaml.DEFAULT_SCHEMA.extend([expression]) })
const runtime = layer.flatMap(row => row.insert ?? []).find(row => row.id === 'agent-team').config
const migratedKeys = ['portableEventEnvelope', 'autoProvisionPlannedMembers', 'maxProvisionPerPass', 'plannedMemberProvider', 'finalDelivery', 'filterToolsByGoal', 'resumeIncompleteOnUserContinue']
const coordination = /^dshHomePath\('([^']+)'\)$/u.exec(runtime.coordinationRoot.expression)?.[1]
if (!coordination) throw new Error('Unknown coordination-root expression in the bundle')
await writeFile(join(root, 'examples/v5-migration-defaults.json'), JSON.stringify({ version: 1,
  packageVersion: JSON.parse(await readFile(join(team, 'package.json'), 'utf8')).version,
  config: Object.fromEntries(migratedKeys.map(key => [key, runtime[key]])), coordinationRootPath: coordination }, null, 2) + '\n')
await writeFile(join(root, 'examples/README.md'), '# 可编辑示例\n\nproject-plan-v2.json 是合成项目模板。提交前把 provider、model、reasoningEffort 替换成 list_team_models 的真实结果，准备 fixture.txt，并核对项目范围。占位符不能直接执行。\n\n部署配置以 bundle 的 cordis.patch.yml 为默认值。调整 agent-team 行时复制完整 config，再修改需要的上限；参考 docs/customization.md。不要将示例当作个人密钥或通用全权限配置。\n')
await cp(join(team, 'LICENSE'), join(root, 'LICENSE'))
for (const locale of ['en', 'zh']) {
  const chinese = locale === 'zh'
  const text = ['---', `description: "${chinese ? '为 DSH profile 增加长期团队、独立验收和按需技能。' : 'Add retained teams, independent acceptance and on-demand skills to a DSH profile.'}"`, 'kind: "package-bundle"', '---', '',
    '# @dsh-workbench/team', '', chinese ? '[English](README.md) | 中文' : 'English | [中文](README.zh.md)', '',
    chinese ? '## 概要' : '## Summary', '', chinese ? '提供完整方案、长期成员、双军师、孙代理、私有成果与三栏工作台。包内没有个人模式、模型密钥、会话或人设正文。' : 'Provides complete plans, retained members, two advisers, nested agents, private artifacts and the three-column workbench. No personal modes, model credentials, Sessions or persona bodies are included.', '',
    chinese ? '## 安装' : '## Install', '', '`dsh plugin --profile web add ./dsh-workbench-team-0.5.0-rc.1.tgz`', '',
    chinese ? '已有自定义 profile 应先使用发行 ZIP 中的安装助手；只在目标宿主停止后应用。详见[安装、配置迁移与回滚](docs/installation.md)。八个内部模块随包提供，无需逐个安装。' : 'For an existing customized profile, use the installation helper from the release ZIP after stopping the selected host. See [installation, configuration migration and rollback](docs/installation.md). All eight internal modules are bundled.', '',
    chinese ? '## 使用与自定义' : '## Use and customize', '',
    chinese ? '选择原模式和模型，要求读取 team_help start 并提交完整方案，再确认具体版本。通过[自定义指南](docs/customization.md)配置模型、岗位、技能、并发与资源；默认层见[cordis.patch.yml](cordis.patch.yml)。' : 'Select your existing mode and model, request team_help start and a complete plan, then confirm its exact version. Configure models, roles, skills, concurrency and resources through [customization](docs/customization.md); defaults are in [cordis.patch.yml](cordis.patch.yml).', '',
    chinese ? '## 验证与限制' : '## Validation and limitations', '',
    chinese ? '当前主包精确支持 DSH 0.2.1-rc.2，详见[兼容矩阵](docs/compatibility.md)和[测试报告](docs/test-report.md)。协作发布锁不约束任意完整权限工具；真实外部 MCP、设备、模型和计费需单独验证。' : 'The main bundle pins DSH 0.2.1-rc.2; see [compatibility](docs/compatibility.md) and the [test report](docs/test-report.md). Cooperative publication locks do not constrain arbitrary privileged tools. Actual external MCP servers, devices, models and billing need separate verification.', '',
    chinese ? '## 技能与开发' : '## Skills and development', '',
    chinese ? '技能目录按需加载，专业模块见[技能专册](docs/skills.md)。架构见[架构说明](docs/architecture.md)，开发请使用完整源码发行版并阅读[贡献说明](CONTRIBUTING.md)。' : 'Skills load on demand; see the [skills handbook](docs/skills.md). See [architecture](docs/architecture.md); use the complete source release and [contribution instructions](CONTRIBUTING.md) for development.', '',
  ].join('\n')
  await writeFile(join(team, chinese ? 'README.zh.md' : 'README.md'), text)
}
console.log(`Generated eight module README pairs and ${modules.length}-module skills handbook.`)
