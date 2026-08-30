# Medicines Intelligence Source Refresh Runbook

Status date: 2026-08-26

## Scope and authority

This runbook governs repository and isolated-validation refreshes. It does not authorise Azure provisioning, production ingestion, external licensing, campaign activation, or cost-bearing infrastructure.

Production operation requires a named operator, approver, managed identity, private storage, alerts, backup/restore evidence, and exact-release acceptance.

## Runtime gate

Use the repository-governed Node 24 runtime and locked package manager. Do not weaken the engine gate to accommodate a different shell runtime.

```bash
export PATH="<node-24-bin>:<approved-system-path>"
node --version
npm --version
npm ci
```

`node --version` must report a supported Node 24 release before any importer or canonical acceptance command runs.

## Working locations

```bash
export NOVAPHARM_DATA_ROOT="<absolute-private-cloud-root-outside-git>"
export NOVAPHARM_DATABASE_URL="$NOVAPHARM_DATA_ROOT/warehouse/novapharm.sqlite"
export NOVAPHARM_OBJECT_STORE="$NOVAPHARM_DATA_ROOT/objects"
export NOVAPHARM_ENVIRONMENT="local_private_cloud"
export MI_DATABASE="$NOVAPHARM_DATABASE_URL"
export MI_RAW_DIRECTORY="$NOVAPHARM_DATA_ROOT/raw"
export MI_EVIDENCE_DIRECTORY="docs/data/evidence"
```

Rules:

- raw national files and the owner workbook remain outside Git;
- evidence committed to Git contains metadata, digests, schemas, counts, caveats, and status, not raw personal/contact data;
- a validation database is isolated from production;
- secrets are supplied through an approved server-side secret mechanism, never command history, URLs, source, or evidence files; and
- a dirty worktree cannot create an exact-candidate-SHA acceptance claim.

## Standard lifecycle

Every source follows this sequence:

1. Determine the expected release from the publisher cadence.
2. Discover the actual publisher release and immutable resource identity.
3. Compare expected, discovered, and last ingested periods.
4. Download to the private raw zone with bounded size, timeout, and retry policy.
5. Compute or verify the content digest.
6. Validate content type, archive entry, schema, identifiers, units, and period.
7. Create a `running` ingestion record.
8. Parse into a transaction-bound staging boundary.
9. Reconcile source, accepted, rejected, duplicate, aggregate, and relationship counts.
10. Publish curated facts atomically only when the source-specific acceptance passes.
11. Mark the run successful only after commit; otherwise roll back and preserve a safe failed-run record.
12. Refresh marts only from accepted curated data.
13. Write repository-safe evidence, alert the operator, and retain prior accepted history.

A source sample can validate a contract but cannot advance the ingested period.

## Storage preflight

Run the capacity gate before creating directories or transferring bulk data:

```bash
npm run intelligence:backfill:plan -- \
  --sources epd,pca \
  --output "$MI_EVIDENCE_DIRECTORY/backfill-storage-preflight.json"
```

Use `--from` and `--to` to evaluate a bounded validation range. Add `--initialise` only after the selected range reports `sufficient`. The planner reserves immutable raw data, conservative fact/database growth, marts/indexes, transformation working space, one recovery copy and a filesystem reserve.

On 26 August 2026 the live publisher metadata produced these decisions for the current Mac volume:

| Scope | Raw bytes | Governed estimate | Decision |
|---|---:|---:|---|
| Complete EPD and PCA period history | 502,121,785,236 | 2,134,017,587,253 | Blocked on current storage |
| EPD January-June 2026 | 45,565,397,443 | 193,652,939,134 | Blocked on current storage |
| EPD June 2026 only | 7,691,543,506 | 32,689,059,901 | Accepted for isolated validation |

The one-month decision does not convert the dataset into a national historical backfill and cannot support a forecast claim.

## Repository commands

### Source discovery

```bash
npm run intelligence:sources:discover -- \
  --database "$MI_DATABASE" \
  --output "$MI_EVIDENCE_DIRECTORY/source-discovery.json" \
  --checked-at "<ISO-8601-time>"
```

### Bounded EPD/PCA sample validation

```bash
npm run intelligence:sources:validate-samples -- \
  --database "$MI_DATABASE" \
  --evidence "$MI_EVIDENCE_DIRECTORY/authoritative-source-samples.json" \
  --checked-at "<ISO-8601-time>" \
  --rows 1000
```

This command proves parser/schema compatibility only. It must not be called a national backfill.

### Immutable EPD/PCA resource download

First inspect the exact publisher resource and capacity decision:

```bash
npm run intelligence:backfill:download -- \
  --source epd \
  --period 2026-06
```

Execute only after the dry run identifies the expected resource and reports `sufficient`:

```bash
npm run intelligence:backfill:download -- \
  --source epd \
  --period 2026-06 \
  --execute
```

The transfer is resumable, bounded to the publisher-declared size plus a small protocol allowance, and uses a separate long-running bulk timeout. A completed source file is accepted only when its byte count and SHA-256 match an immutable manifest. An orphan source file, missing manifest, changed manifest or digest mismatch fails closed.

### Full-resource observation ingestion

```bash
npm run intelligence:backfill:ingest -- \
  --manifest "<absolute-immutable-download-manifest>" \
  --batch-size 25000 \
  --maximum-rejected-rows 0
```

The importer verifies the manifest and complete file again, validates the exact schema and reporting period, checkpoints committed batches, preserves identifiers as strings, and writes source-specific EPD or PCA observations. Only `succeeded` runs are queryable. `partial`, `failed`, `running` and validation-sample runs are excluded at both database-view and service-query boundaries. A partial run requires review and a new governed importer version; it is not silently promoted by retry.

### Pharmacy workbook

Run a dry validation first, then the isolated import:

```bash
npm run intelligence:pharmacies:import -- \
  --dry-run \
  --workbook "<owner-approved-workbook>" \
  --evidence "$MI_EVIDENCE_DIRECTORY/pharmacy-workbook-import.json"

npm run intelligence:pharmacies:import -- \
  --workbook "<owner-approved-workbook>" \
  --database "$MI_DATABASE" \
  --evidence "$MI_EVIDENCE_DIRECTORY/pharmacy-workbook-import.json" \
  --import-at "<ISO-8601-time>"
```

Verify the approved workbook digest and expected row/email controls before accepting the import.

### BNF current and temporal identity

```bash
npm run intelligence:bnf:import -- \
  --database "$MI_DATABASE" \
  --raw-directory "$MI_RAW_DIRECTORY" \
  --evidence "$MI_EVIDENCE_DIRECTORY/bnf-current-import.json" \
  --ingested-at "<ISO-8601-time>"

npm run intelligence:bnf:temporal -- \
  --database "$MI_DATABASE" \
  --raw-directory "$MI_RAW_DIRECTORY" \
  --evidence "$MI_EVIDENCE_DIRECTORY/bnf-temporal-import.json" \
  --ingested-at "<ISO-8601-time>"
```

### Practice master

```bash
npm run intelligence:practices:import -- \
  --database "$MI_DATABASE" \
  --raw-directory "$MI_RAW_DIRECTORY" \
  --evidence "$MI_EVIDENCE_DIRECTORY/practice-master-import.json" \
  --ingested-at "<ISO-8601-time>"
```

The curated output must omit prescriber names, titles, and codes.

### Registered population

```bash
npm run intelligence:population:import -- \
  --database "$MI_DATABASE" \
  --period "<YYYY-MM>" \
  --totals-zip "<outside-git-totals-zip>" \
  --totals-url "<official-https-resource-url>" \
  --age-sex-zip "<outside-git-age-sex-zip>" \
  --age-sex-url "<official-https-resource-url>" \
  --mapping-zip "<outside-git-mapping-zip>" \
  --mapping-url "<official-https-resource-url>" \
  --evidence "$MI_EVIDENCE_DIRECTORY/registered-population-import.json" \
  --ingested-at "<ISO-8601-time>" \
  --code-sha "<clean-candidate-sha>"
```

Omit `--code-sha` when the worktree is not the clean exact candidate. Do not attach a base SHA as if it were the tested final tree.

### Postcode geography

```bash
npm run intelligence:pharmacies:geocode -- \
  --database "$MI_DATABASE" \
  --evidence "$MI_EVIDENCE_DIRECTORY/pharmacy-geography.json" \
  --checked-at "<ISO-8601-time>" \
  --batch-size 200 \
  --concurrency 6
```

## Refresh cadence

| Source family | Review cadence | Publication handling |
| --- | --- | --- |
| EPD, PCA, BNF, registered population | Monthly | Discover release, validate period/schema, backfill gaps in order |
| SCMD | Monthly with provisional/final lifecycle | Preserve provisional facts; version final replacements |
| PHS prescribed/dispensed | Quarterly | Retain provisional status from the publisher |
| QOF | Annual | Never ingest a scheduled release before publication |
| ONSPD live | Operational review | Use for current lookup; retain publisher observation time |
| ONSPD quarterly | Quarterly | Temporal fallback and reproducible bulk reference |
| IMD/RUC/small-area population | On official release | Version geography and classification; do not overwrite history |
| Pharmacy workbook | Owner-approved release only | Verify checksum and full reconciliation |
| Regulator/ODS/DoHS | Licence/API cadence | Refresh only under approved terms and credentials |

## Acceptance checks

For every run confirm:

- publisher and HTTPS resource are approved;
- digest and byte count are recorded;
- schema status is exact or explicitly reviewed compatible;
- identifiers remain strings;
- expected, discovered, and ingested periods are distinct and correct;
- source, accepted, and rejected rows reconcile;
- rejections have safe reason codes and row references;
- aggregate controls reconcile where the publisher supplies them;
- no patient-level data or secret entered evidence;
- database integrity and foreign keys pass;
- the protected service reflects the new state truthfully; and
- a sample or partial run is not displayed as complete ingestion.

Run the relevant package, migration, service, security, Portal, and root canonical tests under Node 24 before promoting a candidate.

## Failure and rollback

On schema drift, period mismatch, checksum mismatch, unexpected content, reconciliation error, permission failure, or unsafe output:

1. stop before publish or roll back the transaction;
2. retain the previous accepted curated snapshot;
3. mark the candidate run failed with a safe error classification;
4. quarantine the raw candidate without exposing it publicly;
5. alert the operator and data owner;
6. document whether the publisher corrected or revised the source;
7. update the contract only after source review;
8. rerun from the immutable raw file; and
9. re-execute all affected downstream models and acceptance.

Never delete prior accepted data merely to make a new run appear current.

## Production blockers

Production scheduling remains blocked until private Blob Storage, Azure SQL, Key Vault, managed identity, network controls, Entra roles, monitoring, alert routing, retention, backup, restore, and staging acceptance are evidenced. ODS/DoHS production clients additionally require approved onboarding and server-side keys. Licensed sources require owner-approved terms.
