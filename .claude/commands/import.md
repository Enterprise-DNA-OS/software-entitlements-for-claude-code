# import

Read CLAUDE.md. Read docs/replace-nalpeiron-zentitle.md. Compare headers and count scope. Run import zentitle <file.xlsx> --source=<stable-label> --dry-run --actor=<operator>. Review the preview before the real import. Imported records remain pending until reconciled.

Run `node scripts/entitlements.mjs import` with the required positional arguments shown by the README. Supported flags: source dry-run actor, plus --json.

Mutations need the operator label in --actor. Do not guess missing business facts. Ambiguous matches must be resolved by a code. Nothing sends or changes a remote application.
