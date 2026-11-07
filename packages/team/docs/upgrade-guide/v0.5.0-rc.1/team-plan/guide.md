---
description: "Upgrade the independent Team bundle without replacing existing modes or conversation generations."
kind: "upgrade-guide"
---

# Team Workbench 0.5

[中文](guide.zh.md)

Version 1 plans remain manual. Version 2 requires explicit automation settings, accepts member persona/instructions and exclusive resource keys, and can require a dual-reviewed planning dependency. Replacements use new versioned task identifiers; old tasks and evidence stay in history. Older Team packages must not write new V2 work.

Install with the reviewed profile helper described in the [installation guide](../../../installation.md). Keep original provider configuration when translating to workbench-* IDs, and preserve complete config blocks. The include loader treats `name` as a match condition; it cannot replace a provider name under the old ID.

New runs use the existing portable carrier and goal JSON string. No committed Session generation is moved, overwritten or deleted. Old native Team events still require a host that recognizes them; this upgrade does not convert a personal Session archive.

Stop the selected host before applying. Verify an isolated synthetic Session, mode selection, model route, skills, tools, nested member, independent review and restart. Keep the old profile files and installed package for rollback, and retain any new Sessions separately. Do not cut over a running task or widen host peers to bypass a compatibility failure.

New task inputs and submitted artifacts retain immutable bytes. A retained member may edit the same file in a later task without invalidating an archived submission. Legacy records without archived bytes still require their original files. Handoffs accept approved versions along explicit dependencies; ordinary result reuse continues to reject changed original inputs.

A required adviser revision now wakes the designated independent reviewer. Acceptance still requires both approvals. A rejected execution produces one durable coordinator notice; starting another attempt remains an explicit coordinator action, including any required side-effect reconciliation.

Reactivation validates the saved active lineage. An idle parent does not need a resident Agent or a model request. A retired ancestor must still be reactivated first.
