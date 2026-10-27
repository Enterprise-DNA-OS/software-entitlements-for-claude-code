---
description: "Heartbeat for the software entitlement desk"
---

# heartbeat

Read CLAUDE.md. Read the relevant records first. Use the CLI as the source of truth and report the result plainly.

Run `node scripts/entitlements.mjs heartbeat` with the required positional arguments shown by the README. Supported flags: actor, plus --json.

Mutations need the operator label in --actor. Do not guess missing business facts. Ambiguous matches must be resolved by a code. Nothing sends or changes a remote application.
