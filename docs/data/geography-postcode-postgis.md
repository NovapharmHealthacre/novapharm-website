# Geography, Postcode, and Spatial Governance

Status date: 2026-08-24

## Purpose

Geography supports protected medicines-intelligence analysis by locating governed pharmacy and practice organisations against official postcode geography. It does not identify a patient, establish patient residence, prove that a pharmacy dispensed a medicine, or establish a commercial territory.

## Approved authority path

The repository uses the Office for National Statistics Open Geography Portal as the postcode-geography authority:

1. Query the live ONS Postcode Directory service for current records.
2. Query the May 2026 quarterly ONSPD table only as a temporal fallback for terminated postcodes.
3. Preserve the publisher's postcode, geography codes, termination state, and coordinate availability.
4. Record unmatched, non-UK, and coordinate-less results rather than inventing a location.

The controlled client is `packages/medicines-intelligence/src/ons-postcode-client.ts`. The import and reconciliation evidence is `docs/data/evidence/pharmacy-geography.json`.

## Validated local coverage

| Measure | Result |
| --- | ---: |
| Unique postcodes requested | 18,277 |
| Unique postcodes matched | 18,273 |
| Unique postcodes missing | 4 |
| Pharmacy postcodes requested | 12,532 |
| Practice postcodes requested | 7,879 |
| Non-UK practice identifiers excluded from ONS lookup | 12 |
| Terminated postcodes retained through temporal fallback | 101 |
| Recognised postcodes without published coordinates | 49 |
| Pharmacies with coordinates | 12,936 / 12,936 |
| Practices with coordinates | 11,710 / 11,787 |

These figures are from an isolated local validation database. They are not evidence of production ingestion or a deployed spatial service.

## Coordinate meaning

Published coordinates are postcode centroids. They are not premises surveys, entrances, delivery points, patient locations, or proof of physical distance along a road network. A recognised postcode with no published coordinate remains a matched record with null coordinates.

Distance-based analysis must therefore:

- identify its coordinate source and period;
- state that distances are centroid-derived;
- use an appropriate UK coordinate transformation or geodesic calculation;
- avoid false precision in labels and exports;
- retain missing geography rather than imputing a point; and
- remain an opportunity signal, never evidence of dispensing or demand capture.

## Temporal and identifier rules

- Normalised postcodes are matching keys; the source display value is retained where required.
- Terminated postcodes remain visible as source observations and do not automatically close an organisation.
- BFPO and other non-UK practice identifiers remain in the practice master but receive no invented UK geography.
- Geography code names remain absent until an authoritative code-name lookup is ingested.
- Practice postcodes represent organisation addresses, not the residence distribution of registered patients.
- Changes in postcode, boundary, or organisation identity are period-effective facts rather than destructive updates.

## Spatial database decision

The managed architecture uses Azure SQL `geography` because Azure SQL is already the approved relational authority for the platform. PostgreSQL/PostGIS is not introduced as a second spatial system of record.

PostGIS remains a technically capable alternative, but adding it now would duplicate identity, migration, backup, access-control, and operational responsibilities without a demonstrated workload that Azure SQL cannot support. This is an explicit architecture decision, not an omitted requirement. Reconsideration requires a measured query or analytical need, a migration plan, security review, and an authority decision.

## Access and privacy

Geographic facts are available only through the protected Medicines Intelligence service. `PUBLIC_ONLY` exposes none of the pharmacy contact intelligence, practice population links, spatial joins, or proximity outputs.

No patient-level location, patient postcode, household coordinate, prescribing clinician identity, or individual journey is ingested. Small-number disclosure controls must be defined before any future granular aggregate is exported.

## Production dependencies

- Deploy and validate the Azure SQL spatial schema.
- Schedule ONSPD refreshes and record source-version history.
- Establish private raw-object retention and checksum controls.
- Add production query-performance, timeout, and row-limit evidence.
- Complete backup and restore rehearsal for spatial facts.
- Approve any external geography export and small-number policy.

## Primary sources

- [ONS Open Geography Portal](https://geoportal.statistics.gov.uk/)
- [ONS Postcode Directory](https://geoportal.statistics.gov.uk/search?collection=Dataset&sort=name&tags=all(PRD_ONSPD))
