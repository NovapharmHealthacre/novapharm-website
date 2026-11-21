# US FDA extended evidence — source-only controlled implementation (21 November 2026)

## Explicit stage
Repository candidate for internal board-only US FDA public-source research. Existing label adapter and public AWS research Lambda are separate. This change is NOT FDA data licensing, authenticated production deployment, mobile live integration, a legal or medical decision, or permission to sell medicine.

## Four additional official upstream research datasets
| Dataset key | Fixed HTTPS upstream | What is returned |
| --- | --- | --- |
| approvals | https://api.fda.gov/drug/drugsfda.json | Up to three source-native applications, bounded product/submission metadata |
| ndc | https://api.fda.gov/drug/ndc.json | Up to three labeler-submitted product listings and capped package IDs |
| adverse-events | https://api.fda.gov/drug/event.json | Only publisher-reported matching count; **zero** patient, report or reaction rows |
| recalls | https://api.fda.gov/drug/enforcement.json | Up to three source-reported enforcement/recall observations |

Drug-label discovery remains in the existing `/api/v1/intelligence/regulatory/us/fda-labels` integration.

## Access contract
- Node GET `/api/v1/intelligence/regulatory/us/fda-evidence?kind=ndc&drug=apixaban` authenticates board access before checking `NPI_OPENFDA_EVIDENCE_ENABLED === "true"` (default OFF), then rate limits to 5 calls/minute, then validates fixed dataset and medicine term.
- Next.js exact gateway GET `v1/intelligence/regulatory/us/fda-evidence` uses the existing trusted protected session; no browser FDA API keys, no direct FDA browser calls.
- Static source allowlist `api.fda.gov`; untrusted URLs, redirects, unauthorized roles, malformed terms, source failure and oversized payloads fail closed.
- No source record persistence, no billing, no raw FDA payload or patient-level FAERS data returned. FAERS counts are reports, not incidence or causality. NDC assignment is not FDA approval; application/submission and recall status are source-observed only.
- This feature adds no background scheduler, AWS resource, Atlas insert, SharePoint publication or customer role entitlement.

## Mobile integration boundary
The existing SwiftUI iOS and Expo/Kotlin Android directories still expose **offline source metadata only**. Native OIDC/PKCE, MFA, secure token custody, independently tested rights grants, approved bundle/package IDs and device QA are prerequisites to any mobile API calls. Do not add API host URLs or credentials to either prototype or declare it live. The same versioned server contract can later support both native clients with dedicated approved authentication.

## Verified baseline environment inspection
On 21 November 2026: AWS CloudFormation `novapharm-intelligence-public-official-research` CREATE_COMPLETE; the existing public FDA/ClinicalTrials Lambda is Active (separate service). AWS Glue catalogues are explicitly source-review / staging only, not accepted medicine observations. MongoDB Atlas staging database `novapharm_staging` had 153 quarantined source projections, with 4 manifests, including FDA NDC and EMA. This PR does not modify those observations.

## Release criteria (fail closed)
1. Dedicated exact-head CI source and negative tests pass; Next.js portal typecheck, security, Chromium/WebKit accessibility and regression tests pass on exact head.
2. Independent review confirms source-specific terms and third-party restrictions; official publisher-live probes demonstrate schema/availability without retaining raw source records.
3. Approved native sign-in, role/tenant isolation, safe display, privacy, App Store/Play device checks and signed release IDs before mobile activation.
4. Separate accepted staging ingestion with source versions, record identity, data quality and publishing grants before promoting any FDA medicine facts into commercially usable data.
5. Explicit owner production signoff, AWS rights/permissions review, mapped API ingress and deployment verification. Never automatically merge or deploy this PR.
