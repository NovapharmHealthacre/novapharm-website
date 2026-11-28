# NHSBSA August 2026 — first-country source rights review
26 November 2026 · England only · Review incomplete

This is a read-only rights and source-identity **candidate**, NOT a permission or a country production release. The original private archive has an S3 full-byte hash validation receipt and matching Drive-manifest digest; it is not an independently accepted publisher release. The canonical JSON pins that observed ZIP SHA-256, while source-rights revision and licence evidence ID remain null; never synthesize either.

- Publisher dataset: https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code
- NHSBSA Terms: https://opendata.nhsbsa.net/pages/terms-and-conditions
- OGL: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
- Prior observed August CKAN resource UUID: `30b74257-9912-4b54-8990-8eec2a4b7f14`; API resource name `EPD_SNOMED_202608` (from existing November 12 source register, NOT independently redownloaded here)
- Historical EPD complete QA recorded 17,754,211 source rows and 50,593 Apixaban labelled rows; this is a historical QA report, not production acceptance.
- Publisher currently describes NHSBSA attribution as `NHSBSA Copyright 2021-2026` in current search indexing, while a cached older page shows `NHSBSA Copyright 2025`. Do not silently reconcile this discrepancy; review exact current terms and resource-version acknowledgement before publishing.
- The portal expressly warns about third-party rights. BNF, dm+d and SNOMED CT terminology are not automatically covered by NHSBSA copyright/OGL. Remove or license controlled fields before redistribution or AI use as independently required.
- Source is retrospective prescribing in **England**, not all UK nations or a stock/sales feed. Scotland, Wales and Northern Ireland remain separately gated.
- NHSBSA fair-use terms discourage rapid bulk API extraction; prefer official full-file download with bounded archival handling.

Independent source-specific legal acceptance, publisher-version confirmation, dated schema/identifier mapping, signed revocation-aware rights record, four actual Atlas unique indexes, authenticated two-tenant tests and an approved deployed API are still required.

No external message, vendor agreement, cloud writes or customer route is triggered by this document.

## Private archive verified on 26 November
Live S3 `HeadObject` inspection confirms the staging ZIP object `governed-intake/nhsbsa/EPD_SNOMED_202608/raw/EPD_SNOMED_202608-6b0b99e22968ac2f7eb730511fd3c3b9d59a1e47acd814053c573a8976ca5551.zip`, version `NvYYWOLeozSJLO72pYHk1Z5EVbHz6YTG`, 644,232,845 bytes, AES256 server-side encryption and matching object metadata `source-sha256=6b0b99e22968ac2f7eb730511fd3c3b9d59a1e47acd814053c573a8976ca5551`. Separate stored private archive receipt attests S3 full-byte hash readback and matched independent Drive source; compressed SHA-256 `6b0b99e22968ac2f7eb730511fd3c3b9d59a1e47acd814053c573a8976ca5551`, decompressed CSV SHA-256 `1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b`, 7,432,815,985 CSV bytes. The independently recorded full-row quality receipt counts **17,754,211** source rows and **50,593** Apixaban-labelled rows, with zero invalid numeric observations and zero missing SNOMED among those Apixaban rows. Its receipt independently lists **zero accepted observations** and rejects commercial/AI/customer publication. The new `NHSBSA_EPD_S3_AUG_2026_ARCHIVE_EVIDENCE.json` records this *staging* proof. No fresh 644MB rehash or publisher snapshot re-download was performed here; archive integrity relies on the previously verified full-byte receipt, not a fabricated recheck.

The actual source zip digest is now pinned in the terms review, but `sourceReleaseManifestVerified`, formal `releaseGates.fullResourceChecksumVerified` and all production/legal/tenant gates remain **false** pending independent release acceptance. Existing resource ID and issuer-derived terms need current publisher confirmation, and BNF/dm+d/SNOMED restrictions remain separate. Actual Atlas unique indexes: still absent.
