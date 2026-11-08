# 公开根包验证 · 0.5.0-rc.2

本轮验证日期为 2026-11-09。`dsh-team-workbench@0.5.0-rc.2` 使用 V5 运行时，新增可直接安装的仓库根入口、包内模块子路径、中文主页和手动英文页。测试使用官方 npm DSH `0.2.1-rc.2`、Windows、Node `24.13.1`，没有接入维护者的正式 profile，也没有读取私有人设正文。

## 本轮实际通过

| 检查 | 结果与范围 |
| --- | --- |
| 核心与工具回归 | 395 项通过 |
| 客户端逻辑 | 110 项通过；jsdom 测试，本轮没有操作浏览器 |
| 兼容提供方 | 987 项通过、2 项 Windows 条件跳过；不是 989 项全部通过 |
| 严格类型 | 139 份插件源码及 Host／Client 消费者通过 |
| 已发布声明 | 13 个 Host、3 个 Client 声明消费者通过，缺失 locale 的反例被拒绝 |
| 预构建模块 | 9 个模块、56 项技能目录；部署者不需要构建 DSH |
| 原运行时输入 | 677 份源码、运行与技能文件按原版摘要核对；其中 46 份仅重定位内部包引用，其他实现字节保留 |
| 新包安装 | 通过受支持的 `dsh plugin` CLI 安装，10 个团队与兼容提供方全部 active |
| Git 源安装 | 从提交固定的本地 Git URL 安装，在仓库外的独立 home 启动，结果与压缩包相同 |
| 实际工具会话 | 两条安装路径各完成三次主模型请求，实际请求包含 56 个工具；依次调用 `team_help` 和 `team_skill_catalog`，最终回复及 `turn/end` 写入新建 Session |
| 安装助手 | 新根包 10 条 CLI 操作通过：只读计划、配置迁移、显式值保留、错误版本回滚、原依赖恢复、卸载；旧包另有 10 条回归通过 |
| 包名冲突 | 已启用另一包名的团队 bundle 时，在改动前拒绝，避免两个 layer 同时运行 |
| 发行文件 | 核对全部 677 份根包文件摘要，排除开发目录、私有 QA、密钥文件与 `node_modules`；错误版本和篡改运行文件两个反例均被检查器拒绝 |
| 测试清理 | 结束每个隔离 Host，关闭本地模型服务并等待退出 |

合计重新运行 1492 项插件回归，2 项条件跳过。模型服务使用本机合成响应，付费模型请求为零。标题生成请求与实际带工具的主模型请求分别处理，不把无工具的辅助请求误判为工具丢失。

## 两种安装方式为什么能独立运行

根包把八个模块通过 `dsh-team-workbench/runtime`、`dsh-team-workbench/tools`、`dsh-team-workbench/ui` 和五个 `compat-*` 子路径导出。它们随同一个 Git 源包或 `.tgz` 分发，不要求 npm 上存在单独的内部包，也不依赖开发目录中的 `node_modules`。生成输入与发行输出分别保存摘要；修改运行时应先完成对应测试，再明确更新输入基线。

隔离 Host 的 home 放在开发仓库外，避免祖先目录中的开发依赖干扰宿主单例。测试使用已固定版本的 pnpm `11.28.5`；部署者应使用受支持 DSH 环境自带的包管理器，不能把本机的偶发 Corepack 下载失败当成插件加载成功。

## 如何复验

在准备好固定版本的开发宿主后，按贡献指南运行类型、构建、核心、客户端和兼容回归。发行入口的专门检查为：

```text
npm run check:public
npm run pack:public
python scripts/test-public-package.py --archive artifacts/dsh-team-workbench-0.5.0-rc.2.tgz --run <新的独立目录>
python scripts/test-install.py --cli <DSH的lib/bin.js> --archive artifacts/dsh-team-workbench-0.5.0-rc.2.tgz --package-name dsh-team-workbench --run <另一个独立目录>
python scripts/host-public-smoke.py --cli <DSH的lib/bin.js> --package artifacts/dsh-team-workbench-0.5.0-rc.2.tgz --run <仓库外的新目录>
```

Git 路径使用同一个 `host-public-smoke.py`，将 `--package` 换成提交固定的 Git 源。脚本拒绝复用已有目录，不启动浏览器，不连接真实模型服务，也不把正式 profile 当作测试数据。完整 QA 输出留在本地，公开只提供结果摘要。

## 证据的限制

这一轮没有重做真实模型质量排名、所有第三方 MCP、手机或模拟器验证，也没有在浏览器重新点遍界面。界面截图、8／20／32 人流程、三小时待命与恢复、真实项目案例来自此前 V5 验证，见[原测试报告](test-report.md)和[案例](harbor-case-study.md)。此前四组 Windows／Linux × Node 22／24 的 hosted CI 属于 rc.1；本轮公开入口的 CI 结果应以新发布提交上的实际 Actions 状态为准。

根包仍只支持精确宿主 `0.2.1-rc.2`。本轮不执行旧包到新包的自动跨名切换，不迁移用户原始 Session 世代，不修改正式运行中的服务。测试通过覆盖上述路径，不能据此承诺任意模型、插件组合、设备或长期任务永远没有错误。
