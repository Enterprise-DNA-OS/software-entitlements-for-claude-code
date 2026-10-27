# Evidence checks, with sources

Sources checked 27 October 2026. These are record checks for a New Zealand software seller, not a compliance certificate or a legal decision.

| Check | Source and meaning | What this tool tests |
|---|---|---|
| IPP5 security evidence | [NZ Privacy Commissioner, principle 5](https://www.privacy.org.nz/privacy-principles/5/): reasonable safeguards against loss and unauthorised access, modification or disclosure | A security review date is present and within the local review interval. It does not inspect safeguards or verify that the review happened. |
| IPP9 purpose and retention | [NZ Privacy Commissioner, principle 9](https://www.privacy.org.nz/privacy-principles/9/): do not hold personal information longer than its lawful purpose requires | A purpose is recorded and the account retention review is not overdue. A review date is not permission to keep information. |
| Contract evidence | Local operational policy, not legislation | Each entitlement has an order or agreement reference. The tool does not verify its terms. |

The security and entitlement review interval is 90 days, stale allocations are 30 days old, and renewal lookahead is 60 days. These are configurable local defaults, not statutory deadlines. No automatic deletion or legal breach notification runs. The operator decides the lawful retention requirement, access safeguards and response to a finding.

Use opaque device references, not machine fingerprints or personal telemetry. `review-account` records the purpose, owner and review dates. `review-entitlement` records an observed seat baseline, agreement reference and renewal owner. A record of evidence does not make imported records correct. Check actual deployment and contracts first.

One trusted operator organisation per database. Public database access is revoked and row-level security is enabled without public policies. A database owner still bypasses these controls. A hosted service needs authenticated users, limited roles, backups and tested restoration. The command-line actor is attribution, not authenticated identity.
