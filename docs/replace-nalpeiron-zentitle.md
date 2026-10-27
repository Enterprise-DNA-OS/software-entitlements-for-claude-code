# Bring Zentitle entitlement records across

This is an independent entitlement operations desk, not a compatible Zentitle licensing server. Zentitle, Nalpeiron and their marks belong to their owners. Keep production enforcement running until a separately tested product integration is ready.

## Export

In Zentitle2, open the Entitlements report. Use Column Chooser to include Entitlement ID, Customer name, Product name, Offering name, Plan type, Seats and Expiry date. Include order references and status for reconciliation. Remove activation codes, licence keys and any credential columns. Clear filters and selected rows if you need the whole register, or document the selected scope.

The vendor [report guide](https://docs.nalpeiron.com/zentitle2-docs/using-the-platform-ui/getting-around/using-reports) documents Excel export from the leftmost export icon. With selected rows it exports those rows. with none selected it exports all report rows. [Entitlement details](https://docs.nalpeiron.com/zentitle2-docs/ui-entitlements/working-with-entitlements) describes the fields and lifecycle. Sources checked 27 October 2026.

Before import, add the known accounts and products using the CLI. Exact codes take priority. unique case-insensitive names also match. Ambiguous names stop the batch. This avoids inventing customer ownership from a flat report.

```bash
node scripts/entitlements.mjs import zentitle imports/entitlements.xlsx --source=zentitle-main --dry-run --actor="Operator"
node scripts/entitlements.mjs import zentitle imports/entitlements.xlsx --source=zentitle-main --actor="Operator"
```

A CSV copy works with the same command. The example CSV is synthetic, shaped around documented fields, not a customer export. Standard single-sheet XLSX files are supported. formulas, links, rich text and multiple worksheets are refused. Convert those cells to plain values or export a clean report. Use calendar dates in YYYY-MM-DD format. native Excel date cells are converted. Customized headings need an explicit mapping in the importer and a test before the real import. English report headings are supported.

## Mapping and reconciliation

| Source | Local record |
|---|---|
| Entitlement ID | Stable source identifier. local code is Z-source-identifier |
| Customer name, Product name | Existing account and product, matched unambiguously |
| Offering name | Offering label |
| Plan type | Subscription or perpetual. other models stop the import |
| Seats | Positive seat allowance |
| Expiry date | Required for subscription. optional for perpetual |
| Other columns | Original row retained for explicit mapping. never interpreted as granted access |

The whole file validates inside one transaction. A failed row rolls back all imports and their audit events. Preview uses the same transaction and rolls it back. Re-importing unchanged rows with the same source label skips them. A changed row stops for explicit reconciliation. Do not change source labels to bypass this check.

Every imported entitlement is pending. Import does not activate licences, infer feature grants, import usage totals, establish grace periods, copy maintenance dates or recreate device activations. For each row, reconcile the external seat baseline and agreement first:

```bash
node scripts/entitlements.mjs review-entitlement Z-zentitle-main-EXPORT-101 --observed-seats=2 --contract=ORDER-101 --owner=Mia --note="Compared deployment list and signed order" --actor="Operator"
node scripts/entitlements.mjs enable Z-zentitle-main-EXPORT-101 --note="Reconciled for local operations" --actor="Operator"
```

Observed seats are a separately recorded baseline. Local allocations are added to that baseline. Do not record the same seat in both. Imported source status is retained as evidence but never grants local access automatically. Reconcile counts against the original export before relying on a review.

SDKs, signed activation credentials, local license servers, account authentication, floating leases, webhooks, billing and storefront connections need their own integration and migration plan. The importer never contacts Nalpeiron or any customer application. One command brings the supported records across. product enforcement cutover is separate work.

## Take your records out

```bash
node scripts/entitlements.mjs export --out=exports/entitlements.json
node scripts/entitlements.mjs export --format=csv --out=exports/entitlements.csv
```

JSON contains every domain record and audit event. It is a portable record copy, not a database backup or tested restore. CSV is a review summary with spreadsheet formula protection. Existing files are never overwritten. Protect exports as business data.
