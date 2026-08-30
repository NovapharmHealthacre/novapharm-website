# Medicines Intelligence Data Quality and Caveats

Status date: 2026-08-28

## Reading rule

Every number must be read with its source, period, unit, geography, coverage, validation state, and revision status. Similar labels across NHS datasets do not make facts interchangeable.

## Current evidence state

| Domain | Current repository evidence | Limitation |
| --- | --- | --- |
| Source discovery | 32 governed sources; 17 CKAN packages checked successfully | Discovery is not ingestion |
| BNF identity | Full current, historic, and monthly-change local imports | Identity is not demand, stock, or authorisation |
| EPD | Exact contract, 1,000-row parser sample, and the complete June 2026 national resource accepted locally: 18,374,449 facts with zero rejected or duplicate rows | One accepted period is not a historical backfill or production operation |
| PCA | Exact contract plus 1,000-row validation sample | No national monthly fact backfill |
| SCMD | Parser supports governed variants | Current full files not accepted |
| Practice master | 158,381 accepted source rows; 11,787 practices; seven rejected rows | Curated master excludes clinician identities and preserves ambiguity |
| Registered population | Full August 2026 local import; 63,237,908 people across 6,129 practices | Practice-list denominator, not patient residence; it cannot normalise June 2026 EPD |
| Pharmacy master | 12,936 owner-supplied seed records | Not a current regulator register or customer master |
| Geography | ONS postcode-centroid enrichment | Not premises survey coordinates or proof of dispensing |
| EPD source-scoped marts | June 2026 medicine, geography and presentation aggregates reconcile exactly to 109,213,199 items, 8,673,274,441.42 quantity, GBP 997,308,762.63 NIC and GBP 957,516,334.18546 actual cost | Practice mart intentionally omitted from this national one-period build; no historical trend is implied |
| Forecasts | Tested baseline code | One accepted month is insufficient; no accepted forecast run |
| Opportunities | Tested transparent scoring kernel | No eligible scores or approved weights |
| Campaigns | Governance design only | No approved target or sending integration |

All complete imports above are isolated local-private-cloud validation. They are not staging or production ingestion claims.

## Source-specific meaning

### EPD

English Prescribing Dataset facts relate to prescribing attributed through published organisational structures. They are not pharmacy dispensing, patient residence, NovaPharm sales, or product availability. The June 2026 resource contains 16,596 publisher-declared unidentified rows; these remain valid facts without a fabricated practice dimension. The accepted import has no identified row without its governed practice relationship.

### PCA

Prescription Cost Analysis is community-dispensing and reimbursement-oriented management information. It is distinct from EPD. EPD and PCA must not be naively summed.

### SCMD and hospital-community data

Secondary-care issue data and hospital prescriptions dispensed in the community cover different processes. SCMD indicative cost is not hospital acquisition cost. Coverage, units, provisional status, and revisions must remain visible.

### Pharmacy activity and flows

Contractor activity or practice-to-pharmacy item flows are not a complete national medicine-by-pharmacy sales dataset. An item count is not revenue, stock, or a NovaPharm order.

### BNF, SNOMED CT, and dm+d

Codes establish terminology identity only at their stated entity level and effective period. A mapping is never inferred from a similar name. Unavailable SNOMED or dm+d relationships remain absent.

### Registered population

Registered population supports practice-denominator metrics. It does not show where patients live, which pharmacy they use, or the population physically closest to a branch. Historical analysis must use the mapping supplied for the relevant publication month.

### QOF

QOF prevalence can be a contextual feature only where clinically defensible. It does not establish an individual diagnosis, prove causation, or explain a prescription by itself. The latest currently usable release must be resolved at ingestion time; a scheduled future release is not treated as available early.

### Deprivation and rurality

Area classifications describe a geography, not an individual or organisation. They must not be used to stereotype patients, practitioners, or pharmacies. Version and geography level must match the analytical join.

## Geography limitations

- ONS coordinates are postcode centroids.
- Four requested postcode values were unmatched in the local validation run.
- Forty-nine recognised postcodes had no published coordinate.
- Twelve non-UK practice postcode identifiers were excluded from UK lookup.
- Terminated postcodes remain temporal evidence and do not imply a closed premise.
- Nearby prescribing is an opportunity signal only; distance does not prove dispensing.

## Pharmacy and contact limitations

- The workbook preserves 131 duplicate candidates and 100 material identifier conflicts.
- Shared email addresses do not establish shared branch identity.
- A verified public business address does not prove ownership, current mailbox operation, legal marketing eligibility, or consent.
- Blank email values remain blank; no pattern-based addresses are generated.
- Every imported contact is currently marketing-ineligible.
- Pharmacy inclusion does not establish opening status, stock, availability, price, customer status, or medicine-level activity.

## Forecast and opportunity limitations

- Numerical baselines require accepted history and cannot turn one accepted month into a trend.
- Prediction intervals are uncertain estimates, not guarantees.
- Model quality can vary by horizon, volume, source revision, and structural break.
- NHS demand and NovaPharm obtainable sales are different forecasts.
- Opportunity weights are versioned assumptions that require outcome backtesting.
- No score can override product authorisation, availability, marketing, role, privacy, or human-approval gates.

## Privacy and disclosure

No patient-level data, patient identifier, patient postcode, clinical record, or prescribing-person identity is required for the implemented platform. The practice importer deliberately omits public prescriber names, titles, and codes from the curated master.

Published aggregates can still create disclosure risk when combined or filtered to small groups. No granular external export is approved until minimum-count, suppression, purpose, and role controls are defined and tested.

## Prohibited interpretations

Do not state or infer:

- that a named pharmacy dispensed a medicine from nearby prescribing alone;
- that NHS demand equals NovaPharm sales;
- that indicative or reimbursement cost equals acquisition price or margin;
- that a contact address authorises marketing;
- that QOF prevalence proves cause or diagnosis;
- that postcode proximity establishes patient behaviour;
- that a parser sample is a complete backfill;
- that one complete national month is a historical backfill or a production feed;
- that repository validation is staging or production operation; or
- that missing coverage has been filled with synthetic or fabricated data.

## Evidence and correction

Source hashes, schema fingerprints, accepted/rejected counts, reporting periods, and run states are retained in `docs/data/evidence/` and the governed ingestion tables. A correction must create new traceable evidence; it must not silently rewrite the prior source observation.
