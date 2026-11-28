# NovaPharm Intelligence — estate closure register, 26 November 2026

Owner-supplied 14-section audit, 21 closure items; this is a source-control execution baseline, not a production acceptance certificate. Parent programme #176; first-medicine pilot #497. Snapshot base `b373f43abed2bf3ea00fb713991dce6f48cbb8e2`. No item is marked production accepted.

| ID | Requirement | Existing work | Required closure evidence |
|---|---|---|---|
| P0-01 | PANDORA transactional ledger | #495 | Rebase/review; verify unique indexes, MFA, tenant isolation, atomic audit and independent approval |
| P0-02 | ASTRA scope and source evidence | New ASTRA offline planning candidate | Source tests; separate protected service, web/iOS/Android integration and human review remain |
| P0-03 | First medicine: Apixaban | #497 | Rights-approved exact source, immutable manifest, identity, six live read-only workflows |
| P0-04 | Production source rights and evidence | #497 / #176 | Signed lawful-purpose receipts; reconciled private ingestion; no fabricated rights or records |
| P0-05 | Protected FDA integration | #1119 / #1053 / #1106 | Reconcile conflicting candidate on current main; exact-head checks, authenticated deployed API and quota proof |
| P0-06 | UK four-nation integration | #1131 | Exact-head merge, source periods, rights, archive quality, actual protected release |
| P0-07 | AWS runtime and deployed revisions | #176 G0/G7 | Inventory, exact image digest, route, origin, config, smoke and rollback evidence |
| P0-08 | Two-tenant security/revocation | #176 G2 | Two distinct MFA identities; authorized and denied cross-tenant requests, revocation |
| P1-01 | All 22 workspaces | #176 G6 | Per-workspace real-data journey on web/iOS/Android or explicit justified platform disposition |
| P1-02 | NOVA inference/retrieval/evaluation | #176 G5 | Approved model access, source rights, citations, abstention, redaction, evaluations |
| P1-03 | Offline AI research | #888 | Reconcile source without undoing public AI publication hold |
| P1-04 | iOS accessibility/iPad | #988 | Reconcile conflict; current SwiftUI tests, device VoiceOver and iPad acceptance |
| P1-05 | Android auth/navigation | #1106 / #1020 | Integrate FDA stacked candidate, secure storage, OAuth, TalkBack, Back and device checks |
| P1-06 | Native app branding | #1046 / #1099 | Reconcile current official asset palette, native icons and platform screenshots |
| P1-07 | Signed iOS/Android releases | Native release engineering | Approved IDs, signed binary provenance, secure distribution, rollback |
| P1-08 | Independent Apple HIG evidence | #991 | 172 topics / six surfaces; independent platform-appropriate receipts |
| P1-09 | Billing and entitlements | #646 | Approved plans, verified Stripe events, StoreKit policy and tenant entitlement tests |
| P2-01 | International publishers and freshness | 101-candidate register | 77 candidate countries plus 24 geography-only scopes; rights and freshness per source |
| P2-02 | Science/multimodal programmes | #819 / #822 / #823 / #826 / #828 | Reconcile unmerged research; reproducible independent tests, model access and rights |
| P2-03 | Disaster recovery and restore | #176 G7 | Approved isolated restore drill, recovery objectives, logs and rollback |
| P2-04 | TestFlight/Google Play | Native release engineering | Signed device builds, accessibility, store review and release receipts |

## Scope inventory — retain all, including non-production research

- 22 Medicine workspaces: Search, Medicine Overview, Identity, Evidence, Observed Market, Geography, Market Structure, Forecasting, Signals, Medicine Tape, Supply Intelligence, Regulatory Intelligence, Pricing & Reimbursement, Tender Intelligence, Portfolio, Biotech Intelligence, Capital Intelligence, Decision Workspace, Watchlists, Alerts, Reports, Private Commercial. Five read-only source foundations, 17 gated at baseline. Canonical catalogue: apps/portal/data/intelligence-workspaces.ts.
- NOVA: retrieval, evidence, citations, semantic search, privacy/redaction, model registry/policy, human review, evaluation, multi-agent research, approved inference. Nova ML Studio, Core Runtime, Device Intelligence, Generative Assist.
- PANDORA: evidence-bound decisions, separation of duties, verified human final authority, atomic ledger, audit chain and rights revocation. ASTRA: proposed advanced research planning, technical architecture, debugging, security and decision review; no autonomous authority.
- International: 101 source candidates, 77 named countries, 24 additional geography-only scopes; distinguish the EU/EEA and Global groups from national countries. England EPD/PCA/SNOMED, Scotland, Wales, Northern Ireland, MHRA, BNF/dm+d, ONS and pharmacy geography. FDA Drugs@FDA, labels, NDC, FAERS and enforcement. Canada, Australia, Spain, EMA, Singapore, ClinicalTrials.gov, PubMed, Europe PMC, ChEMBL, PubChem and WHO.
- Research: CLIP, multimodal, Model Microscope, sparse circuits, L0 sparse models, reward-overoptimization, critiques, instruction following, multi-agent simulation, OpenAI Science, restricted-access Rosalind reference only, Whisper, Triton, Signals, language/speech/document intelligence, Foundation Models, Core ML, Create ML, quantum and computational science, discoverability. No unapproved model/clinical claim.
- Web (Next.js), native Swift/SwiftUI iOS/iPadOS (SwiftData, Charts, Testing, MapKit, App Intents, StoreKit, Keychain), Android (Kotlin and Expo candidate; architecture decision pending), signed distribution and real-device acceptance. Common governed backend.
- Brand: #FFFFFF, #F8F7F3, #0B0B0E, #DEDCD5, #2546D8, #9D1B32, #3D0B13. Typography, motion, media, chart accessibility, light/dark, 172 HIG topics and six-surface acceptance.
- Infrastructure: Atlas, AWS Lambda/API Gateway/Cognito/S3/ECR/VPC/DynamoDB/CloudWatch/CloudTrail, Stripe, SharePoint, Entra, CodeQL, backup and restore. Palantir/Bloomberg/Palo Alto/Prisma Cloud are unverified connections, not activated by this programme.
- Portal 54 registered modules, Distribution 16 prototype capabilities, native Portal 10 and Distribution 9 planning entries. These counts overlap; no claim of live services.
- Preserve corporate and retail site, official branding, checkout and existing newer code. AK Online Services excluded. No outbound emails, paid infrastructure, new credentials, DNS changes or publication from this branch.

## ASTRA first implementation

`src/core/ai/astra-research-plan.mjs` is a deterministic offline plan contract with five proposed research modes, bounded opaque evidence references, immutable negative-authority receipts and explicit unexecuted steps. It does not query data, invoke models, authenticate, route to PANDORA, or execute decisions. `node --test scripts/test-astra-research-plan.mjs` exercises the source contract. A future protected integration needs authorization, verified evidence, model evaluation, UI journeys and separate release acceptance.

## Release discipline

All nine audited referenced PRs (#495, #1119, #1131, #888, #988, #1106, #1046, #991, #646) were still open at the 26 November recheck. #1119, #988 and #1046 returned merge conflicts; #1106 and #1046 are stacked. Do not replay old whole trees or copy older green checks to new heads. Merge only after current-base reconciliation and applicable exact-head checks, then independently verify deployed versions. Source tests never satisfy a production evidence gate by themselves.
