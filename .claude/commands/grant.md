---
description: "Grant for the software entitlement desk"
---

# grant

Read CLAUDE.md. Read the relevant records first. Use the CLI as the source of truth and report the result plainly.

Run `node scripts/entitlements.mjs grant` with the required positional arguments shown by the README. Supported flags: feature limit actor, plus --json.

Mutations need the operator label in --actor. Do not guess missing business facts. Ambiguous matches must be resolved by a code. Nothing sends or changes a remote application.
