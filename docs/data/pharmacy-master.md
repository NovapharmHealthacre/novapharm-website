# UK Pharmacy Master

Status date: 2026-08-24

## Purpose and authority

The UK pharmacy workbook is an owner-supplied governed research seed for protected organisation intelligence. It is not a regulator register, a claim that every premise is currently trading, a medicine-level dispensing source, or permission to market to any contact.

The source is represented by metadata and digest in Git; the workbook itself is not copied into the repository.

| Source fact | Value |
| --- | --- |
| Source file | `UK_Pharmacy_13K_MASTER_ALL_12936_ACTIONED_7211_VERIFIED_2026-08-24.xlsx` |
| SHA-256 | `c07c42c378e4aa9d8a2ce891e037fa8b1f4b2992837c94ec6436bfe06ce9d668` |
| Workbook rows | 12,936 |
| Repository import evidence | `docs/data/evidence/pharmacy-workbook-import.json` |
| Production import claim | No |

## Reconciled contents

| Measure | Count |
| --- | ---: |
| Source rows | 12,936 |
| Canonical seed records retained | 12,936 |
| Duplicate candidates | 131 |
| Material identifier conflicts retained for review | 100 |
| Invalid identifiers | 0 |
| Invalid postcodes | 0 |
| Verified public non-NHS business emails | 7,211 |
| Actioned rows with no defensible new email | 5,725 |
| Marketing-eligible records | 0 |

Nation counts reconcile to the source:

| Nation | Records |
| --- | ---: |
| England | 10,454 |
| Scotland | 1,279 |
| Wales | 697 |
| Northern Ireland | 506 |
| **Total** | **12,936** |

## Identity rules

The implementation in `packages/medicines-intelligence/src/pharmacy-identity.ts` creates deterministic seed identities without treating an email address, name, or postcode as a definitive organisation key.

1. Preserve nation and all supplied source identifiers as strings.
2. Prefer an appropriately scoped regulator or contractor identifier where present.
3. Keep conflicting or repeated identifiers visible for review.
4. Never merge branches solely because they share an email address, trading name, owner, or postcode.
5. Never invent a missing regulator number, contractor code, telephone, email, website, or operational status.
6. Reconcile later authoritative regulator, contractor, ODS, and DoHS observations as source-period relationships rather than overwriting provenance.

The 100 conflicts are governed evidence. They are not silently resolved, discarded, or multiplied into invented premises.

## External authority boundaries

| Jurisdiction | Intended external cross-check | Current state |
| --- | --- | --- |
| England, Scotland, Wales | GPhC registered-premises subscription | Licence and owner approval required |
| Northern Ireland | PSNI live and monthly premises registers | Adapter and source validation pending |
| England | NHSBSA contractor and consolidated-pharmacy sources | Discovery/parser work varies by source; full reconciliation pending |
| England | ODS and DoHS | Clients complete; production keys/onboarding pending |
| Wales | NWSSP public pharmacy publications | Adapter pending |

The public GPhC search is not treated as permission for automated bulk scraping or reuse. Restricted NHS Wales databases are not accessed.

## Geography state

All 12,936 imported pharmacy records have locally validated ONS postcode-centroid coordinates. This supports bounded spatial analysis only. It does not prove that a premise is currently open, that a product is stocked, or that a branch dispensed a medicine.

See `docs/data/geography-postcode-postgis.md` and `docs/data/evidence/pharmacy-geography.json`.

## Use boundary

The master is protected operational intelligence:

- absent from `PUBLIC_ONLY`;
- available only through authorised server-side Portal paths;
- not a production customer or CRM master;
- not evidence of customer consent or legitimate marketing use;
- not a source of medicine sales, stock, price, or availability;
- not suitable for public download.

Any future regulator reconciliation must retain source, retrieval date, period, status, and conflicts. A record may become campaign-eligible only through the separate approved contact and legal-governance process.

## Production dependencies

- Obtain and approve any required regulator-data subscription and reuse terms.
- Complete nation-specific premise and contractor adapters.
- Resolve material identifier conflicts through auditable human review.
- Establish managed SQL deployment, access controls, retention, backup, and restore.
- Approve stewardship roles, update cadence, deletion/correction workflow, and export policy.
- Complete staging acceptance before any operational use.
