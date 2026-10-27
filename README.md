# Software Entitlements for Claude Code

Own the desk that reviews who may use your software, how many seats they hold, what is due for renewal and which usage budgets need attention.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free MIT code. Install and operate it yourself. | Your products, terms, records and integration plan. | Installed, connected and operated through Omni by Enterprise DNA. |
| [Quick start](#quick-start) | One setup fee, then a retainer. [Get your version built](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=nalpeiron-zentitle) | One setup fee, then a retainer. [Talk to Sam](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=nalpeiron-zentitle) |

## The bill and scope

[Nalpeiron's pricing page](https://nalpeiron.com/pricing/), checked 27 October 2026, lists Core at $12,000 a year and Plus at $26,000 a year when billed annually. The page uses dollar signs without specifying a currency code. Confirm currency, eligibility and contract scope with the vendor. These are published prices, not observed customer invoices.

This independent project supplies the entitlement operations desk. Nalpeiron Zentitle also provides application licensing infrastructure. The base does not replace its SDK, signed licences, offline leases, customer authentication or production activation services. Those require a separately tested product integration. Keep existing enforcement running until cutover is proved. Nalpeiron and Zentitle are their owners' marks. no affiliation is implied.

## Quick start

Node 20 or later, with embedded PGlite locally or a trusted shared Postgres database.

```bash
git clone https://github.com/Enterprise-DNA-OS/software-entitlements-for-claude-code.git
cd software-entitlements-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
node scripts/entitlements.mjs help
```

Use Claude Code, Codex, OpenCode or Cursor. CLAUDE.md and AGENTS.md share one command library. Demo records are fictional and dates are relative to the first seed. The seed is idempotent. Never seed business data: start a fresh DATA_DIR, run migrate, then add or import your records.

## Five weekly rituals

1. /renewals-due: review subscriptions, grace periods, missing owners and agreement references.
2. /seat-review: reconcile external observed seats and local allocations, including stale devices.
3. /usage-review: compare monthly recorded events with each feature allowance.
4. /maintenance-due: separate perpetual use rights from support and upgrade dates.
5. /compliance: review security, retention and contract evidence gaps.

/attention brings the unresolved work together. /weekly-review writes a Monday draft from renewal, seat and attention reports. /draft-renewal writes an internal evidence brief. Nothing sends.

## Commands

Flags use --key=value. Every command accepts --json. Exact codes, exact case-insensitive names and unique partial names or UUIDs resolve. Ambiguous matches list candidates and exit 1. The same actor label is written to the audit history in each mutation's transaction.

```text
help
accounts
products
entitlements
show
renewals-due
seat-review
usage-review
maintenance-due
attention
compliance
insights
history
add-account --code=<value> --name=<value> --owner=<value> --purpose=<value> --retention=<value> --security=<value> --actor=<value>
add-product --code=<value> --name=<value> --actor=<value>
add --code=<value> --account=<value> --product=<value> --offering=<value> --plan=<value> --seats=<value> --expires=<value> --grace=<value> --maintenance=<value> --contract=<value> --owner=<value> --actor=<value>
allocate --code=<value> --device=<value> --actor=<value>
release --note=<value> --actor=<value>
heartbeat --actor=<value>
renew --expires=<value> --contract=<value> --note=<value> --actor=<value>
disable --note=<value> --actor=<value>
enable --note=<value> --actor=<value>
resize --seats=<value> --note=<value> --actor=<value>
maintain --until=<value> --note=<value> --actor=<value>
grant --feature=<value> --limit=<value> --actor=<value>
consume --feature=<value> --units=<value> --event=<value> --actor=<value>
add-task --code=<value> --title=<value> --owner=<value> --due=<value> --actor=<value>
complete-task --note=<value> --actor=<value>
log --note=<value> --actor=<value>
review-account --purpose=<value> --retention=<value> --security=<value> --owner=<value> --actor=<value>
review-entitlement --observed-seats=<value> --contract=<value> --owner=<value> --note=<value> --actor=<value>
import --source=<value> --dry-run --actor=<value>
export --out=<value> --format=<value>
weekly-review
draft-renewal
check-access --feature=<value>
```

show, history, check-access, draft-renewal, allocate, renew, resize, maintain, disable, enable, grant, consume, add-task, log and review-entitlement take an entitlement reference immediately after the command. release and heartbeat take an allocation reference. complete-task takes a task reference. review-account takes an account reference. import takes zentitle then the file path. Other commands take no positional arguments.

```bash
node scripts/entitlements.mjs allocate ENT-101 --code=SEAT-NEW --device=workstation-C --actor=Mia
node scripts/entitlements.mjs consume ENT-101 --feature=simulation-runs --units=2 --event=job-unique-101 --actor=Mia
node scripts/entitlements.mjs add-task ENT-101 --code=FOLLOW-101 --title="Confirm renewal evidence" --owner=Mia --due=2030-12-01 --actor=Mia
node scripts/entitlements.mjs show ENT-101 --json
```

## What the rules mean

A subscription expires after its expiry day and optional grace days. Perpetual rights stay active independently of maintenance. Disabled and pending records cannot allocate seats or consume usage. Renewal extends the recorded term but does not re-enable a disabled licence or extend maintenance.

Observed external seats are a baseline. active local allocations add to it. Allocation locks the entitlement row and refuses when capacity is full. A stale device is flagged after 30 days, never automatically released. The operator must reconcile deployment before release. Heartbeat is an explicit local record, not collected telemetry.

Feature budgets reset by calendar month in UTC. Consumption records only the current date, checks the budget and records a unique event key. Matching retries are idempotent. changed data under the same key is rejected. Feature grants are case-insensitive lowercase codes. Usage events and audit records reject ordinary updates and deletes. Database owners can override these safeguards.

check-access returns a recorded local decision and reason. It does not enforce a licence inside an application. It returns process success for both allowed and denied decisions. integrations must inspect the allowed boolean. No customer endpoint is exposed.

## Bring your records across

```bash
node scripts/entitlements.mjs import zentitle examples/zentitle-entitlements.csv --source=demo --dry-run --actor=Operator
node scripts/entitlements.mjs import zentitle imports/entitlements.xlsx --source=zentitle-main --actor=Operator
node scripts/entitlements.mjs export --out=exports/entitlements.json
```

Zentitle2 exports Excel report rows. The importer supports standard XLSX or CSV copies, validates the full batch and preserves source rows. Accounts and products must already exist. Every imported entitlement starts pending. Review the external seat baseline, agreement reference and owner before enabling it. [The switching guide](docs/replace-nalpeiron-zentitle.md) lists supported headings, duplicate rules, the dry run and what requires separate mapping.

## Ten questions to ask

node scripts/entitlements.mjs insights answers all ten against current records. These combine local evidence and operational history. no claim is made that Zentitle cannot produce similar analysis with configuration.

1. Which renewals have no named owner?
2. Which customers have stale seat allocations before renewal?
3. Which entitlements have reached their seat allowance?
4. Which perpetual licences have expired maintenance?
5. Which licences are in a grace period without order evidence?
6. Which feature budgets are at least ninety percent used this month?
7. Which disabled or expired licences still have allocated seats?
8. Which imported entitlements still await reconciliation?
9. Which overdue tasks sit against renewals due within sixty days?
10. Which account retention reviews are missing or overdue?

## Documents and views

npm run docs produces an entitlement schedule, renewal evidence brief and account retention review. npm run view produces the week, seats and usage, and evidence reports. Change brand.json for your business name, colours and logo. Reports are read-only HTML. /new-view adds a question. [Why no front end](docs/why-no-front-end.md) explains mobile, offline and application enforcement boundaries.

/compliance checks records against the cited NZ Privacy Commissioner principles and local contract evidence policy. It cannot certify legal compliance. [Sources and limitations](docs/compliance.md).

## Your first hour: ten things to ask for

1. Put our name and colours on the entitlement schedule.
2. Add our products and offerings.
3. Add our customer accounts with responsible owners.
4. Preview a selected Zentitle entitlement export.
5. Reconcile the exported count and exact source scope.
6. Record actual observed seats without double counting allocations.
7. Find renewals without an owner or agreement reference.
8. Record a real feature allowance and one usage event.
9. Prepare a renewal brief for internal review.
10. Add our support tier through /customise and a tested migration.

## Operating boundaries and verification

One organisation, trusted internal operators. No application authentication or tenant isolation layer. Public table access is revoked and row-level security has no public policies. Shared deployment needs scoped database roles, secured secrets, backups and a tested restore process. Do not commit keys, credentials, machine fingerprints or private customer records.

Exports and generated reports use restrictive file permissions where supported. Exports never overwrite a file, CSV protects formula cells and HTML escapes record content. JSON export includes all domain records but is not a tested restoration mechanism. See docs/verification.md for actual checks.

MIT. Built by Enterprise DNA.
