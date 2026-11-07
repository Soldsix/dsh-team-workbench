---
description: "展示当前团队、分组任务及独立复核证据。"
kind: "package-reference"
---

# @dsh-workbench/team-ui

[English](README.md) | 中文

## 概要

展示当前团队、分组任务及独立复核证据。

## 使用与配置

此模块随团队 bundle 安装，不应独立安装第二套服务。部署与回滚见[安装说明](../../docs/installation.md)。

配置入口：Uses the host theme and current Session projections. / 使用宿主主题与当前会话投影。。完整声明以 [src/index.ts](src/index.ts) 为准；部署默认值见 [cordis.patch.yml](../../cordis.patch.yml)。

## 行为与验证

真实调用、取消、恢复、界面与宿主版本的验证范围见[测试报告](../../docs/test-report.md)。目录中存在实现代码不等于外部设备或提供方已经通过。

## 模型体验

工具、目标、身份、技能与证据通过宿主 Session 机制记录。成员只加载选定模块，未知状态和调用错误需如实报告；注册成功不等于外部服务可用。

## 限制与开发

仅使用[已验证宿主版本](../../docs/compatibility.md)。共享发布锁不约束任意完整权限程序，真实 MCP 与设备需要单独验收。开发遵循[架构说明](../../docs/architecture.md)，不修改模式、人设或全局模型默认值。
