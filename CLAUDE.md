# Software Entitlements for Claude Code

This is a seller's entitlement operations desk: customers, products, licence terms, local allocations, usage budgets and renewal evidence. It is one trusted organisation's database. Production application enforcement is separate integration work.

## Working rules

Read before writing. Every answer about a record starts with the CLI. Never invent terms or usage. Use codes when names are ambiguous. Mutation actor labels are attribution, not authentication. Never send, delete business records or change customer software from this desk. Drafts stay in drafts/.

Use node scripts/entitlements.mjs help for flags. README holds examples. A command accepts --json. Every mutation is transactional and appends an audit record. Import preview rolls back its transaction.

## Recurring work

| Ask | Recipe |
|---|---|
| help | /help |
| accounts | /accounts |
| products | /products |
| entitlements | /entitlements |
| show | /show |
| renewals due | /renewals-due |
| seat review | /seat-review |
| usage review | /usage-review |
| maintenance due | /maintenance-due |
| attention | /attention |
| compliance | /compliance |
| insights | /insights |
| history | /history |
| add account | /add-account |
| add product | /add-product |
| add | /add |
| allocate | /allocate |
| release | /release |
| heartbeat | /heartbeat |
| renew | /renew |
| disable | /disable |
| enable | /enable |
| resize | /resize |
| maintain | /maintain |
| grant | /grant |
| consume | /consume |
| add task | /add-task |
| complete task | /complete-task |
| log | /log |
| review account | /review-account |
| review entitlement | /review-entitlement |
| import | /import |
| export | /export |
| weekly review | /weekly-review |
| draft renewal | /draft-renewal |
| check access | /check-access |
| Change a field or rule | /customise |
| Add a read-only report | /new-view |

## Record boundaries

No secret keys, activation codes, personal fingerprints or payment credentials. Store opaque device references and agreement references. Imported source rows stay pending until an operator reconciles observed seats and agreement evidence. Do not count a device in both the external baseline and local allocations.

Take a protected backup before changing a real database. Tests set isolated storage and never use DATABASE_URL unless TEST_DATABASE_URL explicitly names a disposable database. Do not seed a real business register.

Read docs/compliance.md for the sources and limits of evidence checks. Read docs/replace-nalpeiron-zentitle.md before any import.

Built by Enterprise DNA. [Omni by Enterprise DNA](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=nalpeiron-zentitle) installs, customises and runs the system.
