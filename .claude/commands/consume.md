---
description: "Consume for the software entitlement desk"
---

# consume

Read CLAUDE.md. Use a unique stable event key. Duplicate matching events are safe to retry. A different event with that key is rejected. This records local usage only.

Run `node scripts/entitlements.mjs consume` with the required positional arguments shown by the README. Supported flags: feature units event actor, plus --json.

Mutations need the operator label in --actor. Do not guess missing business facts. Ambiguous matches must be resolved by a code. Nothing sends or changes a remote application.
