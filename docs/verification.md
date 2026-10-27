# Verification

27 October 2026, Linux, Node 22.23.4:

- npm install and dependency audit: PASS, zero known vulnerabilities. ExcelJS uses its v4 UUID interface with a patched UUID 11 override.
- npm test: PASS, all 36 CLI commands using disposable PGlite storage.
- The same smoke suite: PASS on disposable PostgreSQL 18.4. The server was stopped after testing.
- Tests cover repeated migrations and seed, case-insensitive matching, ambiguous lookup exit status, CSV and XLSX import, preview rollback, invalid-row rollback, unchanged import, changed-source rejection, pending imported rights, seat limits, usage limits and retry keys, expiry and disabled status, evidence reviews, immutable audit records, complete JSON export, drafts and HTML generation.
- npm run demo, npm run view and npm run docs: PASS. Three read-only dashboards and ten documents across three document types.
- Page gate in Command Centre: PASS with sourced prices and three actual demo command runs.
- Brand lint: zero errors and zero warnings on the README, operating instructions, documents and command recipes.
- Landing page preview: HTTP 200, noindex,nofollow, all three offers and the attributed booking link checked. Desktop and mobile screenshots inspected. Read-only seat and usage report inspected.

The committed workflow checks Windows and Linux on Node 20 and 22, plus Postgres 17. Local results above do not claim a Windows run. No customer system or private vendor export was used. Import fixtures are synthetic and match documented report field names. Product enforcement integration is not part of these tests.
