---
description: "Usage review for the software entitlement desk"
---

# usage-review

Read CLAUDE.md. Review monthly feature budgets against recorded events. No telemetry is collected automatically.

Run `node scripts/entitlements.mjs usage-review` with the required positional arguments shown by the README. Supported flags: none, plus --json.

Mutations need the operator label in --actor. Do not guess missing business facts. Ambiguous matches must be resolved by a code. Nothing sends or changes a remote application.
