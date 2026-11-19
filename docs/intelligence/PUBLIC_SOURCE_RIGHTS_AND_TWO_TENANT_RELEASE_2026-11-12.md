# Medicines Terminal | official-source first release authority

**Owner policy recorded:** 12 November 2026.  
**Programme:** #176; six-workflow acceptance #497; first Apixaban evidence #454; commercial launch #433.  
**Status:** RESEARCH AND IMPLEMENTATION PLAN ONLY. **No legal rights, medicine evidence, customer accounts or public launch certified.**

## Owner-approved choices

1. Begin with official, publicly accessible datasets. Do not buy, activate, or imply licences for third-party terminology or proprietary clinical text. Escalate any required paid/non-standard licence for owner approval.
2. Exercise two separately scoped **internal test tenants** first. Synthetic fixtures and isolated staging can be used only as tests, with no production customer identity or source grants. An actual end-to-end two-tenant pilot requires independently accepted real internal identities, MFA, revocable session store and production-like API proof.
3. Final goal: fully customer-accessible release, **only after** independent data rights, customer identity, tenant, legal, privacy, security, backup/restore, live billing and deployed end-to-end acceptance. Development authority is not permission to activate customer access or billing.
4. Do not send customer/supplier emails or submit external requests without recipient/message-specific approval. Do not create live charges, synthetic customers, prescriptions, market numbers or entitlement grants.

## Source-by-source legal and data gate (11–12 November 2026 review)

| Source | Evidence from official publisher | What is safe to prepare | Hard launch gate |
| --- | --- | --- | --- |
| NHSBSA EPD with SNOMED | Dataset describes **OGL v3** and requires **NHSBSA Copyright 2021-2026** credit. Publisher explicitly warns third-party copyright must be cleared separately. It is monthly community prescribing, **not** wholesale sales, secondary care or patient demand. | Read source metadata, record resource ID, period, source/publisher terms, run bounded schema exploration and preflight. | Exact resource licence and attribution sign-off; separate BNF and SNOMED rights; immutable full-resource checksum, identity/time/units/geography, row reconciliation, documented approved customer use and AI-use rights. |
| ONS population/geography | ONS makes much of its content available under the OGL, with attribution, but identifies third-party geographic IP requiring separate notices/licences. | Choose and version an exact dataset and compatible geography; compare denominator dates and published methodology. | Data-specific licence and any third-party geometry/Ordnance Survey rights; valid geographic joins, denominator comparability, approved public/commercial reuse. |
| openFDA drug labels | FDA states data is *generally* public-domain / CC0 **unless otherwise noted**; terms and source-specific restrictions still apply. | Official GET-only metadata discovery with source IDs, FDA record dates, record-level copyright flags. | Record-level screening and source attribution; no implied product approval, supply, safety or prescribing recommendation; customer/LLM rights approval as applicable. |
| ClinicalTrials.gov registry | Official API offers public study records and points users to site terms. A study registry entry is not a marketing authorisation or validated clinical recommendation. | Source-backed read-only study metadata (NCT ID, version, timestamp), with honest study status. | Terms, attribution, record version and use-case review; approved customer publishing and AI processing, and no unsupported outcomes. |
| BNF / BNFC content | Pharmaceutical Press says **non-NHS bodies require licences** for BNF/BNFC content and flags separate AI integration rights. | Maintain *unresolved* terminology relationships; use no copied BNF clinical content as an unapproved product feature. | Explicit commercial digital integration licence and separate permitted AI use where relevant, recorded by reviewer, version, scope, dates and legal entity. |
| SNOMED CT / dm+d | SNOMED International operates affiliate licensing by territory and states web/browser deployments may require special permission/fees. dm+d contains SNOMED CT and BNF terminology; standard NHS use does not itself grant all third-party commercial rights. | Store publisher identifiers as source metadata pending determination; keep unresolved mappings visibly unresolved. | Country/territory affiliate terms, any web app licence, third-party and international redistribution rights, plus exact permitted field/derived-work/AI scopes. |

### Original publisher pages used for review

- NHSBSA dataset: https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code
- NHSBSA terms: https://opendata.nhsbsa.net/pages/terms-and-conditions
- ONS geographical licences: https://www.ons.gov.uk/methodology/geography/licences/
- openFDA licensing: https://open.fda.gov/license/
- openFDA terms: https://open.fda.gov/terms/
- ClinicalTrials.gov data-use notice: https://clinicaltrials.gov/data-api/how-download-study-records
- ClinicalTrials.gov terms: https://clinicaltrials.gov/about-site/terms-conditions
- Pharmaceutical Press BNF licensing: https://www.pharmaceuticalpress.com/services/content-licensing-and-integration/information-for-prospective-data-licensing-customers-about-bnf-and-bnfc-content-on-the-nice-website/
- Pharmaceutical Press AI policy: https://www.pharmaceuticalpress.com/content-licensing-and-integration/
- SNOMED International licence: https://www.snomed.org/licensing
- dm+d NHS guidance: https://digital.nhs.uk/services/terminology-and-classifications/dm-d

The pages above are evidence for *review*, not an executed licence agreement or automatically approved derivative/commercial/AI use. Preserve publisher terms, their version/hash and reviewer decision before advancing source-specific status.

## Verified infrastructure truth that this document must not override

As of the authenticated 12 November audit, Atlas production had **4 metadata-only source-register records**, **0 accepted medicine identities**, **0 medicine evidence records**, **0 source-rights grants**, **0 ingestion runs**, and **0 evidence manifests**. The production Cognito customer pool had **0 users** and MFA on; session and authorizer `NPI_CUSTOMER_ACCESS_ENABLED` flags were **false**. Preview ledger had four pending-review source grants, all marked inactive. This data is point-in-time; re-query before any release.

## Work order without prematurely promoting source rights

1. Preserve production admission and customer flags OFF, use exact-head CI and immutable artifacts.
2. For initial Apixaban investigation, identify exact publisher resource/version and clinical terminology mapping; start with **metadata/low-volume schema exploration**, not the ~17m-row monthly full ingest. Obtain accurate price/bandwidth/storage preflight for private immutable CSV/hash verification.
3. Compliance independently records source-specific rights and third-party terminology authorisations with `purpose`, `jurisdiction`, `customer_publish`, `AI_model_input`, `derived_analytics`, `redistribution`, `effective_at`, `expires_at`, `revoked_at`, `reviewer`, `approval_record`, and exact source version. **Default every permission to false**.
4. Only after rights gate, perform bounded non-sample ingestion, reconcile source grain/sums/period and provenance; require signed immutable manifest and active revocation-checkable source grant before admission.
5. Execute two isolated internal tenant negative/positive tests across session, identity, source rights, medicine object, analytics, reports and revocation. Synthetic CI does **not** satisfy the real deployed acceptance.
6. Complete API and UI six-workflow proof for the same real Apixaban medicine, including no-data and stale-data behavior and correctly labelled geography. Check mobile/browser/keyboard/accessibility.
7. Resolve image security #439, exact-head deployment and rollback, legal privacy/terms, billing/tax approval and human release authority before any customer launch.

## Owner approval requests that may become necessary

- BNF/BNFC integration and AI/data usage agreement, if clinical/terminology content is to be copied into the product.
- SNOMED CT affiliate or special web/mobile/territory terms, depending on customer geography and product behaviour.
- Third-party ONS basemap/boundary rights if the selected geography includes copyrighted source geometry.
- Any publisher-specific content exceptions or new commercial/AI publication agreement for the chosen source record.

**No approval is presumed.** These requests are to be presented with exact scope, official source terms, cost and expiry before any purchase or use.

## Evidence necessary to close the six-workflow acceptance

Exact git SHA; authorised source rights decision; real publisher resource and verified SHA-256; canonical Apixaban identity proof; ingestion/reconciliation and evidence-manifest IDs; two-tenant negative API logs; zero stale/unowned source leakage; browser/mobile results; AWS ECR security scan and deployment digest; rollback; and signed production approval. Until then the fully customer-accessible launch remains intentionally disabled.
