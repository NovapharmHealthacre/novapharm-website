# NovaPharm Intelligence — global source ingestion quarantine

**Status: candidate-only, 17 November 2026.** This specification describes the first bounded source-snapshot evidence contract. It neither downloads any data nor creates cloud resources, data rights, production access or a mobile app release.

## Problem being solved

NovaPharm's global source registry includes official national medicine identifiers, regulatory records, prescribing observations, price schedules, trial records and commercial datasets. Their payloads can change without a stable update notification. The ingestion layer must detect mismatched source identities, revisions, periods and geographic coverage before records can be compared or displayed.

## Implemented source-only contract

- The module src/core/intelligence-source-snapshot-quarantine.mjs accepts only Uint8Array samples up to 256 KiB supplied by a separately approved internal caller. No HTTP, filesystem, S3, database or external-service API call occurs.
- Require pinned HTTPS source origin and original source URL; no embedded credentials, fragments, HTTP downgrade or redirect mechanism.
- Require stable source, dataset, resource and schema identifiers, country or subcountry jurisdiction, original publisher, declared format and observation/publication/retrieval timestamps.
- Compute SHA-256 of the original sample bytes and a deterministic snapshot identity. The result contains metadata only, never source content.
- Source rights, medicine matching and commercial release remain false/unknown in every result. This is not a signature or permission verifier.
- Unchanged snapshots are identified as duplicates. Different bytes for the same source, resource, period, publication and schema become a conflicting revision that requires review.
- assertSourceSnapshotPublishable unconditionally rejects. No customer API can use this module to self-promote an internal candidate.

## England prescribing discovery

The NHS Business Services Authority confirms that the former non-SNOMED English Prescribing Dataset is retired. The EPD with SNOMED is the continuing monthly release; the NHSBSA release calendar reviewed on 7 October 2026 lists a typical publication date of the 20th. Source identifiers such as SNOMED_CODE must remain strings, preserving leading zeroes and any changes to upstream schema.

Primary NHSBSA sources:
- https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code
- https://www.nhsbsa.nhs.uk/access-our-data-products/open-data-portal-odp
- https://www.nhsbsa.nhs.uk/cy/node/9362

EPD captures a defined population of NHS prescription records and does not establish all-UK pharmaceutical sales, hospital stock or manufacturer market share.

## Enterprise release gates still outstanding

1. Independent written publisher/terminology rights for extraction, storing, commercial analysis, AI input/output, app distribution, user export, geography, expiry and revocation.
2. A source inventory authority tied to independently verified original datasets and provider-accepted schema versions, not URLs alone.
3. A real streaming download path with file byte limits, checksums, antivirus/decompression controls, storage encryption, audit logs, least-privilege service identity, retention and budget approval.
4. Bounded parsing, malformed-row quarantine, source-level reconciliation, historical corrections, publication-time validity and missing-data logic.
5. Medicine identity crosswalk with national product identifiers, accepted reference data, pack/strength/route matching and ambiguity rejections.
6. Protected Cognito/TOTP and tenant isolation, source-level attribution and revocation checks at query time, no protected keys in the iOS/Android apps.
7. Independent customer release gates: data-admission ledger, full CI, browser/native device acceptance, immutable signed deployment SHA, rollback and owner approval.

## Local verification

Run node --test scripts/test-intelligence-source-snapshot-quarantine.mjs under Node 24.

The corresponding GitHub workflow tests sample digest stability, date/origin/size constraints, replay conflicts, country separation and refusal of publication. Passing these tests does not prove a real dataset was licensed, downloaded, ingested, reconciled or made available.

## Relationship with PR #807

This PR is independent of the mobile/global API foundation in PR #807. It avoids changing the main site or protected AWS and Atlas deployments. Following code review, use the same central rights authority, candidate keys and provenance contracts in the combined Intelligence ingestion service rather than creating a parallel customer data path.
