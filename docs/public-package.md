# 公开根包与社区收录

## 本次变化

`dsh-team-workbench@0.5.0-rc.2` 将完整 profile bundle 暴露在仓库根目录，使 GitHub 源码安装和社区扫描能读取真正的插件包名、版本、`apply(ctx)` 与 `dsh.bundle` 元数据。内部八个模块沿用 V5 已验证文件，原 `packages/team` 的开发与历史发行内容保留。

根包不依赖部署者构建 DSH 或运行 TypeScript。预构建 ESM、浏览器模块和技能资源随源码提供；根 patch 的技能入口使用公开包名，其他兼容模块的服务标识保持。

## 收录信息

- 仓库目标：公开的 `Soldsix/dsh-team-workbench`。
- topic：`dsh-plugin`，并附团队/技能等用途标签。
- 许可证：MIT；保留上游声明，不冒充官方。
- 支持 profile：`web`；宿主精确为 DSH `0.2.1-rc.2`。
- GitHub 安装：`dsh plugin --profile web add github:Soldsix/dsh-team-workbench`。
- 当前不发布 npm，因此只申请 GitHub 公开收录，不宣称已经进入 DSH 内置插件中心。

## 测试记录

根包需要独立完成元数据、真实 `apply` 导出、文件白名单、八模块打包、stock profile 安装/加载、工具与技能及 Git 源安装检查。最终通过结果记录在公开的发布验证摘要中；不得用旧包的测试代替新入口的安装证据。

## 已有安装怎样处理

新版根包名与旧的 `@dsh-workbench/team` 不同，不应同时作为两个 profile layer 启用。升级前保存 profile、Session 与成果，处理任务并停止目标 Host；在隔离 home 中验证移除旧 bundle、保留原提供方配置及安装新包，再切换正式环境。

当前安装助手使用 `--package-name dsh-team-workbench` 选择根包，校验实际包名及版本，保存配置与依赖回滚材料。省略参数保留历史包行为。跨包名的已启用 bundle 会在修改前报错；这版不提供自动跨名迁移。旧版助手和回滚材料随历史 Release 保留，完整任务和模式不能依赖改写旧 Session 来迁移。

本次发布不读取或修改维护者正在使用的个人模式、人设、模型连接、密钥或会话。
