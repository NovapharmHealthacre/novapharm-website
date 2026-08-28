# Medicine Identity and BNF/SNOMED Governance

Status date: 2026-08-24

## Identity rule

Names are searchable labels, not primary keys. Medicine identity is versioned by source code system, code level, and effective period.

The model supports:

- BNF chapter, section, paragraph, chemical substance, product, and presentation
- SNOMED CT identifiers stored as strings
- dm+d VTM, VMP, AMP, VMPP, and AMPP levels when an approved dm+d source is available
- Supplier, formulation, route, strength, unit, and source-effective aliases where supplied
- Historic code observations and parent-child hierarchy changes

Leading zeroes and identifier precision must never be lost. A SNOMED identifier is not converted to a JavaScript number or floating-point database value.

## Current validated catalogue

The July 2026 NHSBSA BNF current release, version 90, produced:

| Measure | Count |
| --- | ---: |
| Current presentation identities | 55,427 |
| Current hierarchy nodes | 68,858 |
| Search aliases | 332,562 |
| Current code-history observations | 55,427 |
| Rejected current rows | 0 |

The temporal import also preserves:

| Measure | Count |
| --- | ---: |
| 2025 historic source rows | 54,792 |
| Historic accepted rows | 54,791 |
| Historic governed rejections | 1 |
| Monthly change rows through 2026-07 | 1,134 |
| Add events | 776 |
| Change events | 218 |
| Remove events | 140 |
| Ended medicine identities | 139 |

The rejected historic row remains evidence; it is not silently repaired.

## Temporal model

`dim_medicine` identifies the canonical analytical entity. `medicine_aliases` preserves source labels and searchable forms. `medicine_code_history` retains code-system observations with validity. `dim_bnf` and `bnf_hierarchy_history` retain source-effective hierarchy.

Current BNF does not overwrite historic coding. A remove event can close an earlier observation only when the code is absent from the accepted current catalogue. Display-name changes become versioned aliases rather than identity changes.

## Search behaviour

The protected search normalises human text while preserving source values. It can match current BNF presentation name/code, product name/code, chemical substance name/code, and aliases. It returns identity and hierarchy only.

A search result does not assert:

- Prescribing volume
- Community or hospital dispensing
- NovaPharm stock or availability
- Manufacturer or supplier status
- Commercial opportunity
- Clinical suitability

SNOMED and dm+d fields remain absent where their separately governed mapping has not been ingested.

## BNF/SNOMED and dm+d boundaries

The current BNF/SNOMED mapping is still a publisher ZIP/workbook adapter dependency. The dm+d Terminology Server or TRUD release requires approved access. No mapping is inferred from similar names.

When enabled, mapping ingestion must retain:

- Source release and checksum
- Entity level
- Code system and code
- Valid-from and valid-to dates
- Mapping status and correction history
- Unresolved and one-to-many relationships

## Evidence

- `docs/data/evidence/bnf-current-import.json`
- `docs/data/evidence/bnf-temporal-import.json`
- `packages/medicines-intelligence/src/bnf-current.ts`
- `packages/medicines-intelligence/src/bnf-temporal.ts`
- `src/core/medicines-intelligence-service.mjs`
