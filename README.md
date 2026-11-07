---
description: "Install and customize a persistent Team workbench inside a supported DSH profile."
kind: "package-bundle"
---

# DSH Team Workbench V5

English | [中文](README.zh.md)

## Summary

Coordinate retained members, planning and quality advisers, nested teams, independent review and checked artifact publication inside DSH. Members use the host's configured models and selected skills; the bundle includes no personal modes, model credentials or conversation history. The release is a profile bundle with a versioned installation path and explicit protection limits.

![Three-column team workbench](docs/assets/team-desktop.png)

[UI guide](docs/ui.md) · [Installation](docs/installation.md) · [Customization](docs/customization.md) · [Test report](docs/test-report.md)

## Contents

- [Install](#install)
- [Customize](#customize)
- [Develop](#develop)
- [Compatibility and limitations](#compatibility-and-limitations)

## Install

Use the release `.tgz`, not the source repository root, as the DSH plugin package. In a separate DSH home, the verified profile command is `dsh plugin --profile web add ./dsh-workbench-team-0.5.0-rc.1.tgz`. Stop the selected host before changing its profile; installation does not restart it.

For an existing customized profile, use the [installation helper and rollback procedure](docs/installation.md) so existing tool, network and sandbox settings are translated to the compatibility provider IDs. The helper generates a local reviewable plan by default. It never reads persona files or changes model connections.

Open a new Session, select your existing mode and model, request an Agent Team plan, inspect the complete roster and acceptance criteria, and confirm that exact version. A V2 on-demand plan creates only approved members needed for ready work. A dual-reviewed planning milestone can precede execution.

## Customize

Use [configuration examples](examples/) and the [customization guide](docs/customization.md) for model routes, reasoning effort, roles, skills, concurrency, working sets, exclusive browser/device resources and mode integration. Values in a DSH patch replace a row's whole `config`; keep every field you intend to retain. No vendor or model is mandatory.

The [V5 specification and implementation map](docs/v5-plan.md), [skills handbook](docs/skills.md), [architecture](docs/architecture.md) and [test report](docs/test-report.md) describe the observable behavior and remaining work. The [32-author harbor case study](docs/harbor-case-study.md) includes first-submission and five-round source examples, actual screenshots, motion checks, and measured rendering counts. Both examples can be previewed without a model account.

## Develop

Use Node `^22.19 || >=24`, install the pinned development dependencies, and set `DSH_DEV_HOST` to a built DSH `0.2.1-rc.2` checkout. Run `node scripts/setup-dev.mjs`, `node scripts/typecheck.mjs --emit`, `npm run build`, the three test commands, and `npm run check`. The setup script creates an ignored fixture and does not edit the host checkout. See [CONTRIBUTING](CONTRIBUTING.md).

## Compatibility and limitations

The supported host version is listed in [compatibility](docs/compatibility.md). Do not widen the peer range to bypass a failed host check. Shared publication locks protect cooperating plugin processes, not arbitrary external tools with unrestricted host access. Actual MCP servers, browser profiles, mobile devices, vendor billing and paid model behavior require environment-specific verification.

MIT license; upstream notices are retained in [NOTICE](NOTICE.md). Report vulnerabilities using [SECURITY](SECURITY.md). This package does not publish or transmit diagnostics automatically.
