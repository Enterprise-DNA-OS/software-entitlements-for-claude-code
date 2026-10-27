---
description: "Seat review for the software entitlement desk"
---

# seat-review

Read CLAUDE.md. Compare observed external seats with local allocations. A stale allocation is a review item, not permission to release it.

Run `node scripts/entitlements.mjs seat-review` with the required positional arguments shown by the README. Supported flags: none, plus --json.

Mutations need the operator label in --actor. Do not guess missing business facts. Ambiguous matches must be resolved by a code. Nothing sends or changes a remote application.
