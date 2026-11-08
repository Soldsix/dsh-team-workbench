---
description: "Display the current Team, its grouped work and independent review evidence."
kind: "package-reference"
---

# @dsh-workbench/team-ui

English | [中文](README.zh.md)

## Summary

Display the current Team, its grouped work and independent review evidence.

## Use and configuration

This module ships inside the Team bundle; do not install a second service independently. See [installation and rollback](../../docs/installation.md).

Configuration: Uses the host theme and current Session projections. / 使用宿主主题与当前会话投影。. [src/index.ts](src/index.ts) owns the complete declaration; deployment defaults are in [cordis.patch.yml](../../cordis.patch.yml).

## Behavior and verification

See the [test report](../../docs/test-report.md) for actual invocation, cancellation, recovery, UI and host-version coverage. Source presence does not establish external provider or device readiness.

## Model experience

Tools, goals, identity, selected skills and evidence are logged through the host Session mechanism. Members load selected modules only; unknown states and execution failures remain explicit. Registration does not imply external service readiness.

## Limitations and development

Use a [verified host version](../../docs/compatibility.md). Shared publication locks do not constrain arbitrary privileged programs; actual MCP servers and devices need separate acceptance. Follow the [architecture](../../docs/architecture.md), preserving modes, personas and global model defaults.
