---
description: "在受支持的 DSH profile 中安装和自定义长期团队工作台。"
kind: "package-bundle"
---

# DSH 团队工作台 V5

[English](README.md) | 中文

## 概要

在 DSH 内管理长期成员、规划军师、质量军师、孙代理、独立验收和经检查的成果发布。成员使用宿主已配置模型与按需技能；发布包不包含个人模式、模型密钥或聊天记录。插件通过 profile bundle 安装，明确标注兼容版本与文件保护边界。

![三栏团队工作台](docs/assets/team-desktop.png)

[实际界面与布局](docs/ui.md) · [安装与回滚](docs/installation.md) · [可自定义配置](docs/customization.md) · [测试报告](docs/test-report.md)

## 目录

- [安装](#安装)
- [自定义](#自定义)
- [开发](#开发)
- [兼容与限制](#兼容与限制)

## 安装

安装目标是发行版 `.tgz`，不是源码仓库根目录。独立 DSH home 中已验证的命令是 `dsh plugin --profile web add ./dsh-workbench-team-0.5.0-rc.1.tgz`。修改 profile 前先停止该宿主；安装本身不会重启服务。

已有自定义配置时，使用[安装助手与回滚流程](docs/installation.md)，将原工具、网络和沙箱配置转到兼容提供方的 ID。助手默认只生成本地可审阅方案，不读取人设文件，不修改模型连接。

新建会话，选择原有模式与模型，要求 Agent Team 提交完整方案，检查全部成员和验收标准，再批准该版本。V2 按需方案只创建已批准且有就绪任务的成员，可以先通过双军师规划里程碑再进入执行。

## 自定义

[配置示例](examples/)与[自定义指南](docs/customization.md)覆盖模型、思考强度、岗位、技能、并发、工作集、浏览器／设备独占资源及模式集成。DSH 补丁会替换整行 `config`，应保留仍需使用的全部字段。插件不绑定某家服务或某个模型。

[V5 规格与实现对照](docs/v5-plan.md)、[技能专册](docs/skills.md)、[架构](docs/architecture.md)与[测试报告](docs/test-report.md)说明现有行为和未完成工作。[32 位作者首稿与五轮渔港示例](docs/harbor-case-study.md)附实际图片、可预览源码和性能对照，不需要模型账号即可查看。

## 开发

使用 Node `^22.19 || >=24`，安装锁定的开发依赖，将 `DSH_DEV_HOST` 指向已构建的 DSH `0.2.1-rc.2` 检出。执行 `node scripts/setup-dev.mjs`、`node scripts/typecheck.mjs --emit`、`npm run build`、三组测试及 `npm run check`。准备脚本只建立忽略提交的测试夹具，不修改宿主源码。详见[贡献说明](CONTRIBUTING.md)。

## 兼容与限制

受支持的宿主版本见[兼容矩阵](docs/compatibility.md)，不能通过放宽 peer 范围跳过失败。发布锁约束协作插件进程，不能约束持有宿主完整权限的任意外部工具。真实 MCP、浏览器环境、移动设备、供应商计费与付费模型行为仍需按部署环境验证。

采用 MIT 许可，[NOTICE](NOTICE.md)保留上游声明；漏洞报告方式见[SECURITY](SECURITY.md)。插件不会自动上传诊断文件。
