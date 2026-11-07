# 自定义与模式兼容

## 概要

主沟通者使用用户当前选择的模型与思考档。岗位、执行模型、技能、资源及任务图由经过确认的项目方案决定；部署者通过 profile 补丁设置更高层的上限。插件不要求修改原模式，不扫描或合并模式人设正文。

## 目录

- [项目级设置](#项目级设置)
- [部署级设置](#部署级设置)
- [技能与工具](#技能与工具)
- [界面与扩展](#界面与扩展)

## 项目级设置

每位成员填写唯一名称、上级、岗位、实际 provider/model、思考档、职责和一至四个所需技能。V2 可增加 `persona` 和 `instructions`：前者用于新成员的固定身份，后者从当前已批准计划读取，仅注入对应成员；换阶段先确认新版本，不能把另一个成员的指令串入。空值、未配置模型、不可解析思考档、过深层级或不存在的技能在预检时报错。

成员岗位包括 planning_adviser、quality_adviser、domain_adviser、group_lead、executor、verifier。军师不能领取执行任务；主沟通者在 V2 中不能直接进行项目写操作。读资料、解释和协调仍可进行；实际成果由执行者提交，非作者复核，关键里程碑还需规划与质量两份决定。

通过 `team_member configure_model` 原位换模，不更改成员 ID、Session、任务、人设与选定技能。运行中的请求保持原配置，下次请求采用新路由；在工作台核对“当前／下次”。成员详情也提供实际模型、思考档与职责保存按钮。退休后可恢复原成员；父级待命无需额外唤醒，父级已退休则必须先恢复父级。只有用户或方案允许的替代连接才可切换；插件不根据名字猜测模型能力，也不自动修改宿主上下文或输出上限。

V2 的 `automation.provision` 可设 `manual` 或 `on-demand`；`requirePlanningGate` 为 true 时，每条执行路线必须依赖规划任务。每次替换目标使用新的版本化任务 ID，旧 ID 保留历史；重复使用会在确认前拒绝，避免新目标看似启动却跳过任务。

`exclusiveResources` 使用部署者自定义的稳定键，例如 `browser:research-a`、`android:device-a`、`account:fixture`。任务领取时排他，提交后仍保留至独立验收或明确释放；同一资源的后续任务显示等待，不用反复唤醒模型。它是团队调度约束，不能代替外部工具的系统权限控制。

## 部署级设置

配置入口为 `agent-team` 行及 [bundle 默认值](../cordis.patch.yml)。DSH 替换整块 `config`，不会深层合并；复制完整默认块后再调整。不能仅粘贴几个键导致目标检查、技能预算或文件隔离被隐式关闭。

| 配置 | 作用 |
| --- | --- |
| maxMembers / maxDepth | 成员与委派深度上限；不是供应商并发承诺 |
| maxResidentMembers / maxConcurrentRequestsPerTeam | 会话驻留与实际模型请求分别限制 |
| providerConcurrency / modelConcurrency / accountPools | 单连接、单模型、共享账户额度池 |
| autoProvisionPlannedMembers / maxProvisionPerPass | 启用按需创建，限制每次调度的创建数量 |
| finalDelivery | manual 手动收尾；notify 只通知；publish-and-notify 检查发布后通知。bundle 默认最后一种，单独运行模块默认 manual |
| filterToolsByGoal | 将模型可见工具缩到当前岗位、任务与已确认范围；实际准入仍逐次检查，不能把隐藏清单当作权限隔离 |
| resumeIncompleteOnUserContinue | 用户继续时唤醒仍未完成且待命的原执行；跳过已完成、有待投递消息、冷却中及正在运行的成员 |
| coordinationRoot / coordinationWaitMs / coordinationPollMs | 所有协作宿主共用的锁目录与等待策略 |
| workspaceIsolation | 工作集总量、自动选择上限、输入目录、允许工具与 MCP 名称 |
| maxSelectedSkillsPerMember / maxSkillSelectionBytes | 技能数量和真实注入文本预算 |
| rateLimitCooldownMs / quotaCooldownMs / maxAutomaticResumes | 服务错误冷却与自动接续上限 |

多进程使用不同的 coordinationRoot 会绕过协作锁，因此同一团队与共享发布目录必须使用同一个本地锁根。SQLite 事务在进程退出后释放；锁不是跨机器的分布式租约，网络文件系统未验证。

[完整自定义补丁](../examples/profile-customization.patch.yml)保留安全检查、工作区、工具与交付配置，演示 96 名成员上限和 16 路模型请求。它不修改任何模型连接或模式。先将[自定义技能示例](../examples/custom-skills/project-evidence/SKILL.md)复制到独立 DSH home 的 `workbench-skills/project-evidence/SKILL.md`，再启用示例中的额外目录；不要将不存在的目录当作已经接入。

## 技能与工具

`team-workbench-skills.additionalSkillRoots` 可增加用户维护的目录，每项使用不同 providerName 和绝对 path；不能覆盖内置 team-workbench 提供方。名称和用途先进入目录，正文只在选择后读取。模式、项目或用户已有同名技能沿宿主优先级解析，不能静默用插件正文替换。

模式人设插件仍归原模式管理，团队插件只增加团队岗位和任务约束。模式已有 skills 能通过 `team_skill_catalog` 找到并被选择；选定内容固定摘要与版本，阶段切换通过显式选择更新，不把整个目录全文加入上下文。

增加 MCP 时，先在 DSH 挂载该服务，再将必要的准确工具名加入成员允许列表。工具注册、成员可见、授权允许和实际调用成功是四个不同状态。Windows 的 Python、Node、curl 与 PowerShell 执行仍由宿主沙箱和目标范围约束；完整程序执行不能伪装成仅路径受限的原生文件操作。

Windows 部署建议使用 PowerShell 7，并在宿主的 `pwsh-sandbox` 配置中指定已安装的 `pwshPath`。每次调用明确工作目录、超时和 UTF-8；复杂 Node／Python 程序先保存到任务专属文件，再用准确可执行文件路径调用，禁止混用 Bash、cmd 和 PowerShell 引号语法。Windows PowerShell 5.1 的独立脚本调用已验证；同机沙箱内的内联／管道测试未得到完整输出，不能据此声称全部写法兼容。插件不修改全局 PATH、执行策略或模型连接。

复核人可使用 `team_workspace read_input` 读取任务输入回执中的文本，不必复制别人的整个目录；`read_artifact` 读取不可变提交。新任务的输入会留存于内容归档，即使共享文件随后被批准修改，仍返回原输入版本。没有归档的旧记录只在原字节仍匹配时读取。两者都核对路径与哈希，并按返回的 `nextByteOffset` 续页。图像由任务输入准备到成员工作区后，通过 `read_image` 查看；文本接口不会把二进制伪装为文本。

## 界面与扩展

工作台复用 DSH 主题变量，提供三栏分组、紧凑排列、成员搜索、任务筛选与分页、完整方案、长期专家、记忆、邮箱及诊断。窄屏改为纵向排列，键盘方向键、Home/End 切换标签。右侧宿主文档栏占据空间时可收起，以显示完整三栏。

更深层定制在独立源码中的 runtime、tools、ui 和 skills 目录进行；不得直接修改已发布包缓存。新增模型可见字段须写入 Session，持久字段须有版本说明与回放测试，新增工具须同时具备执行、取消、错误、展示和真实安装验证。
