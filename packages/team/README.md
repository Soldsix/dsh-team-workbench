---
description: "Add retained teams, independent acceptance and on-demand skills to a DSH profile."
kind: "package-bundle"
---

# @dsh-workbench/team

English | [中文](README.zh.md)

## Summary

Provides complete plans, retained members, two advisers, nested agents, private artifacts and the three-column workbench. No personal modes, model credentials, Sessions or persona bodies are included.

## Install

`dsh plugin --profile web add ./dsh-workbench-team-0.5.0-rc.1.tgz`

For an existing customized profile, use the installation helper from the release ZIP after stopping the selected host. See [installation, configuration migration and rollback](docs/installation.md). All eight internal modules are bundled.

## Use and customize

Select your existing mode and model, request team_help start and a complete plan, then confirm its exact version. Configure models, roles, skills, concurrency and resources through [customization](docs/customization.md); defaults are in [cordis.patch.yml](cordis.patch.yml).

## Validation and limitations

The main bundle pins DSH 0.2.1-rc.2; see [compatibility](docs/compatibility.md) and the [test report](docs/test-report.md). Cooperative publication locks do not constrain arbitrary privileged tools. Actual external MCP servers, devices, models and billing need separate verification.

## Skills and development

Skills load on demand; see the [skills handbook](docs/skills.md). See [architecture](docs/architecture.md); use the complete source release and [contribution instructions](CONTRIBUTING.md) for development.
