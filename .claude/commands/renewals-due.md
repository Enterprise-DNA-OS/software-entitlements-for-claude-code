---
description: "Renewals due for the software entitlement desk"
---

# renewals-due

Read CLAUDE.md. Review subscription expiry and grace status with the named renewal owner. Do not infer renewal acceptance.

Run `node scripts/entitlements.mjs renewals-due` with the required positional arguments shown by the README. Supported flags: none, plus --json.

Mutations need the operator label in --actor. Do not guess missing business facts. Ambiguous matches must be resolved by a code. Nothing sends or changes a remote application.
