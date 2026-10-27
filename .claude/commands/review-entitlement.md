---
description: "Review entitlement for the software entitlement desk"
---

# review-entitlement

Read CLAUDE.md. Confirm the signed agreement, owner and external seat count. Observed seats are a baseline. local allocations are additional. Record the review without changing status. Enable only after approval.

Run `node scripts/entitlements.mjs review-entitlement` with the required positional arguments shown by the README. Supported flags: observed-seats contract owner note actor, plus --json.

Mutations need the operator label in --actor. Do not guess missing business facts. Ambiguous matches must be resolved by a code. Nothing sends or changes a remote application.
