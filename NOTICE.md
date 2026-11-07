# 许可与来源

本项目包含 DeepSeek Harness 的派生模块，保留 MIT License 与 `Copyright (c) 2026 DeepSeek`。八个内部模块从已安装的定制团队实现中独立复制，进一步修改集中在 V5 调度、协调、工具、技能和界面；它们不是未经修改的官方插件。

AdsPower 官方参考资料位于 skills 内独立的 official 目录，原 MIT License 随资料保留。项目未将个人模式、人设正文、聊天记录、模型凭据或本机工具可执行文件纳入发行。

运行时还依赖宿主的 Cordis、Schemastery、DSH 能力包及 Zod，各自许可由对应 npm 包保留。开发依赖与锁定版本在 package-lock.json 中。发行清单列出本包内部组件，不冒充完整宿主的软件物料清单。

源码与部署 ZIP 的 demos/harbor 包含使用 Three.js 的生成场景。两个示例及各自预构建目录都保留 Three.js 的完整 MIT 许可证；示例不是插件运行依赖，也不需要模型账号。
