---
description: "为 DSH profile 增加长期团队、独立验收和按需技能。"
kind: "package-bundle"
---

# @dsh-workbench/team

[English](README.md) | 中文

## 概要

提供完整方案、长期成员、双军师、孙代理、私有成果与三栏工作台。包内没有个人模式、模型密钥、会话或人设正文。

## 安装

`dsh plugin --profile web add ./dsh-workbench-team-0.5.0-rc.1.tgz`

已有自定义 profile 应先使用发行 ZIP 中的安装助手；只在目标宿主停止后应用。详见[安装、配置迁移与回滚](docs/installation.md)。八个内部模块随包提供，无需逐个安装。

## 使用与自定义

选择原模式和模型，要求读取 team_help start 并提交完整方案，再确认具体版本。通过[自定义指南](docs/customization.md)配置模型、岗位、技能、并发与资源；默认层见[cordis.patch.yml](cordis.patch.yml)。

## 验证与限制

当前主包精确支持 DSH 0.2.1-rc.2，详见[兼容矩阵](docs/compatibility.md)和[测试报告](docs/test-report.md)。协作发布锁不约束任意完整权限工具；真实外部 MCP、设备、模型和计费需单独验证。

## 技能与开发

技能目录按需加载，专业模块见[技能专册](docs/skills.md)。架构见[架构说明](docs/architecture.md)，开发请使用完整源码发行版并阅读[贡献说明](CONTRIBUTING.md)。
