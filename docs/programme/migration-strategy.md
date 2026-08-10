# Unified Estate Migration Strategy

Status: source migration implemented; managed staging and production execution pending external gates
Date: 1 August 2026

## Objective

Move three live public properties and the undeployed secure platform into one governed source architecture without interrupting the current public websites or sacrificing search equity, evidence controls or rollback.

## Migration principles

1. Keep all current public sites available until their replacement routes pass acceptance.
2. Do not publish a secure control on a runtime that cannot execute it.
3. Preserve canonical URLs where they remain useful; use direct permanent redirects for intentional changes.
4. Migrate approved content and media, not unsupported legacy claims.
5. Maintain one authoritative record for every company, person, claim, route and integration fact.
6. Rehearse data migration and rollback with synthetic or approved non-confidential records.
7. Never change DNS, Microsoft permissions or paid infrastructure without the relevant owner gate.

## Source migration stages

### Stage 0 - Baseline and containment

- Freeze evidence at current default-branch SHAs.
- Generate the complete line-level requirements matrix.
- Record current routes, titles, canonicals, sitemaps, redirects, assets and live behaviours.
- Enforce honest public-only capability boundaries on existing static deployments.
- Correct critical NIT dependency and mobile defects.

Exit evidence: clean checks, static-mode artifact scan, current-site screenshots and signed-off baseline.

### Stage 1 - Shared governance foundation

- Introduce pnpm/Turborepo workspace controls.
- Add strict TypeScript configuration.
- Add typed configuration, platform-mode, people, claims, content, route and SEO packages.
- Add package-boundary, entity-consistency, claims and public-artifact tests.

Exit evidence: one lockfile, strict typecheck, no duplicated canonical facts and deterministic builds.

### Stage 2 - Public property migration

Migration order:

1. Founder, because it has the smallest route surface and a strong evidence-bound content model.
2. Technology, after dependency and mobile corrections and legal-relationship evidence review.
3. Corporate, preserving all approved product media, Insights, legal content and current canonical routes.

Each property requires:

- route and status parity;
- title, description, canonical, H1 and schema parity or approved improvement;
- image licence/provenance transfer;
- visual comparison at all specified viewports;
- redirect and link verification;
- accessibility and performance budgets;
- no secure controls in public-only output.

### Stage 3 - API and forms

- Migrate typed contact and account-application contracts.
- Implement CSRF, exact origins/hosts, validation, idempotency, rate limits, queues and accessible outcomes.
- Store relational state in Azure SQL staging.
- Store validation uploads in private Blob quarantine.
- Activate forms only after API health and end-to-end provider tests pass.
- Route public browser submissions through the corporate same-origin gateway so slot-specific API origins remain server-side configuration.

### Stage 4 - Identity and portal

- Create dedicated portal/API applications and origins.
- Configure Entra workforce roles and Entra External ID approval journeys.
- Enforce customer isolation and resource-level document access.
- Complete customer, employee, board and administrator route matrix.
- Keep bootstrap authentication restricted to controlled activation and password replacement.
- Sign portal-to-API Easy Auth assertions and reject stale, altered or replayed principal handoffs.

### Stage 5 - Microsoft 365 and controlled documents

- Inventory SharePoint sites, groups, inheritance, direct assignments and sharing links.
- Apply owner-approved least privilege.
- Create controlled lists/libraries and immutable SQL-to-SharePoint identifiers.
- Run idempotency, throttling, conflict and outage reconciliation tests.

### Stage 6 - Azure staging

- Deploy isolated applications, SQL, Blob, Key Vault and observability with synthetic data.
- Add `noindex`, `nofollow`, `X-Robots-Tag` and restricted access.
- Run the full functional, security, browser, accessibility, performance, backup and restoration suites.
- Record costs before any production approval.
- Deploy six independent release packages on separate public and secure plans, with API-only SQL/Blob access and separate portal/API secret vaults.

### Stage 7 - Production candidate and cutover

- Create immutable candidate releases and database migration artifacts.
- Back up current data/configuration and record all DNS.
- Preserve MX, SPF, DKIM, DMARC, Microsoft 365 and unrelated verification records.
- Obtain explicit owner approval.
- Connect root, www, portal, API and status origins in a controlled order.
- Verify HTTPS, redirects, cookies, CSRF, Entra callbacks, forms, portals, sitemap and monitoring.
- Retire Pages only after stable acceptance and absence of split traffic.

## Repository history approach

The corporate repository becomes the orchestration workspace. NIT and founder histories remain intact and are referenced by migration manifests. Their default branches are not deleted. After migration acceptance they may be archived or retained as read-only provenance according to an owner decision.

No source history is rewritten as part of ordinary migration. Retired-credential remediation follows its separate protected runbook and GitHub Support process.

## Data migration controls

1. Create and verify a source backup.
2. Record schema version and table counts.
3. Export through structured database tooling.
4. Transform through versioned scripts with no secret or document content in logs.
5. Import into isolated Azure SQL staging.
6. Reconcile row counts, constraints, identifiers and timestamps.
7. Run application and authorisation tests.
8. Restore the target backup into a second isolated database.
9. Compare both restored and migrated records.
10. Execute production migration only after approval and retain rollback until acceptance.

Test identities and fabricated transactions are never migrated to production.

## URL and search-equity controls

- Generate a route manifest from current production before each cutover.
- Keep useful URLs unchanged.
- Implement one-hop `308` or `301` redirects for approved replacements.
- Do not redirect missing content indiscriminately to the homepage.
- Preserve canonical host and trailing-slash policy.
- Exclude portals, APIs, private files, staging and validation origins from public sitemaps.
- Compare indexable URL counts and structured data before cutover.
- Monitor 404s, crawl errors, canonicals and inbound-link destinations after release.

## Rollback

Public rollback:

- retain the previous immutable application release;
- preserve current Pages artifacts until acceptance;
- restore the previous DNS values only from the recorded DNS snapshot;
- never roll back Microsoft 365 mail records as part of a website rollback.

Application rollback:

- redeploy the previous application release;
- disable incompatible write paths;
- restore the verified database backup only after data-owner approval;
- reconcile any accepted writes before reopening service.

Identity/document rollback:

- restore recorded group and permission assignments;
- revoke temporary credentials and sessions;
- preserve audit evidence;
- do not recreate anonymous links.

## Owner-controlled gates

- Evidence and publication approval for regulated titles and claims.
- Azure subscription, region, cost and production deployment.
- Entra workforce/external tenant and MFA configuration.
- Graph application consent and SharePoint permission changes.
- Email provider and recipient routing.
- Malware-scanning service.
- UK solicitor and accountant review.
- Search-platform and social-profile ownership.
- Production merge, DNS cutover and Pages retirement.

## Completion rule

Repository migration is not production completion. The programme closes only after the live managed platform, forms, portals, identities, database, documents, domains, HTTPS, monitoring, backup restoration, SEO/GEO and rollback are all genuinely verified.
