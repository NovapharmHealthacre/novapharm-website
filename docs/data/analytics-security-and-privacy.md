# Medicines Intelligence Security and Privacy

Status date: 2026-08-24

## Security posture

Medicines Intelligence is a protected, server-authoritative, read-only executive capability. The current repository classification is `informational_only`: the read model and controls are repository validated, but managed analytics storage, production identity, scheduled ingestion, and owner acceptance are not connected.

## Access boundary

- Governed Portal module: `executive.nhs-data`.
- Authorised scopes: `board` and `admin`.
- Customer and ordinary employee scopes are denied by the server service.
- Nine view routes are subordinate views, not additional Portal modules.
- Navigation visibility is not authorisation.
- The gateway and server re-evaluate identity and access; client state cannot grant scope.
- The current module has no write action.

`PUBLIC_ONLY` contains no Portal dataset, contact intelligence, source credential, analytical query, forecast, opportunity, campaign, export, or confidential upload path.

## Data minimisation

The platform does not require or ingest:

- NHS number or other patient identifier;
- patient name, date of birth, address, postcode, or record;
- prescription-level patient linkage;
- clinician identity in the curated practice master;
- private clinical document;
- inferred patient diagnosis; or
- synthetic patient data represented as real.

Registered-population and age/sex inputs are published aggregates. Practice postcode is an organisation address, never patient residence.

The owner pharmacy workbook is held outside Git. Repository evidence contains the file digest and aggregate controls, not the 7,211 addresses themselves.

## Credential and upstream controls

ODS FHIR R4 and DoHS v3 clients in `packages/medicines-intelligence/src/nhs-api-clients.ts`:

- use sandbox without a production key only where the publisher permits;
- fail closed in integration/production when the server-side key is absent;
- send the key in the `apikey` header, not the URL;
- restrict requests to the configured HTTPS origin and service path;
- reject redirects;
- enforce bounded input, result, timeout, content type, and 10 MB response size;
- avoid response bodies and secret values in operational errors; and
- return a configuration-required state rather than simulating connectivity.

Required secrets are `NHS_ODS_API_KEY` and `NHS_DOHS_API_KEY`. They must be resolved from managed server-side secret storage in production and must never enter a browser bundle, Git, evidence JSON, query string, screenshot, or log.

CKAN and ONS clients similarly use bounded downloads, timeouts, validated origins/content, row or byte limits, and explicit failures.

## Storage boundary

| Zone | Security expectation |
| --- | --- |
| Raw source | Private, immutable, encrypted managed object storage; publisher metadata and digest; no public web path |
| Curated SQL | Least-privilege managed identity; row/role authority; versioned lineage; encrypted transport and managed storage |
| Analytical marts | Rebuildable from accepted curated facts; protected queries; bounded results |
| Repository evidence | Metadata, digests, counts, schema and caveats only; no secret or raw contact list |
| Browser | Minimum authorised response only; no source key or bulk raw data |

Local SQLite is an isolated validation mechanism, not production authority.

## Query and service controls

- Search text is normalised and bounded from 2 to 120 characters.
- Result limits are bounded from 1 to 50.
- SQL uses parameters; user input is not interpolated into statements.
- Medicine identifiers use a bounded canonical shape.
- Not-found, invalid, and forbidden states expose professional messages without stack traces.
- Source-health responses distinguish sample validation, partial ingestion, complete ingestion, failure, and external blockers.
- Empty forecasts, opportunities, and campaigns are returned as explicit unavailable states, not fabricated rows.

Before production, API-level rate limits, request timeouts, concurrency limits, audit correlation, and query-cost controls require managed-environment evidence.

## Contact and campaign privacy

- A verified address is not equivalent to marketing eligibility.
- All 12,936 imported pharmacy contacts are currently marketing-ineligible.
- The current UI does not expose actual address values.
- No campaign sending integration exists.
- No bulk export is implemented or approved.
- Future access must separate organisation identity, contact visibility, compliance review, suppression, campaign approval, and send authority.
- Global objection and suppression state must be checked immediately before an approved send.
- Named personal business addresses require appropriate data-protection treatment even in a B2B context.

## Export and disclosure boundary

External analytics exports are currently absent. Before adding one, define:

- authorised role and stated purpose;
- allowed columns and maximum rows;
- small-number and re-identification controls;
- contact-data treatment;
- file encryption and expiry;
- watermark or release identity where appropriate;
- download audit and revocation;
- retention and deletion; and
- incident response.

No public map or downloadable table may expose protected contact intelligence, patient-like granular data, customer status, opportunity ranking, or campaign state.

## Logging and audit

Required audit events include source discovery, download, schema decision, run start/finish/failure, publish, data-quality override, identity/role denial, search, record view, future export, model run, score configuration, campaign approval, suppression, and correction.

Logs must not contain API keys, session tokens, raw files, full email lists, patient data, or uncontrolled query responses. Operational errors use bounded classifications and correlation identifiers.

## Threat controls

| Risk | Repository control | Production evidence still required |
| --- | --- | --- |
| Unauthorised module access | Server-side board/admin scope check and tests | Entra assignments, Conditional Access, MFA, PIM, live role tests |
| Client credential leakage | Server-only clients and secret names | Key Vault references and bundle/runtime verification |
| SSRF or hostile redirects | Fixed service origins/paths and redirect rejection | Egress restrictions and WAF/monitoring evidence |
| Oversized upstream response | Timeout and 10 MB NHS API response cap; bounded bulk downloads | Managed resource and alert thresholds |
| SQL injection | Parameterised protected queries and bounded identifiers | Production database permissions and telemetry |
| Data poisoning/schema drift | Source registry, digest, schema fingerprint, reconciliation, atomic publish | Operator approval and alert routing |
| Cross-role/contact disclosure | Least-data read model; contacts not rendered | End-to-end production role and export tests |
| False analytical certainty | Source-health states, caveats, null outputs, model gates | Accepted backfills and model governance |
| Loss/corruption | Versioned migrations and repository backup/restore tests | Azure backup, point-in-time restore and rehearsal |

## Privacy assessment triggers

A formal privacy/security review is required before introducing patient-level or linkable granular data, named personal contacts, automated outreach, external exports, customer sales joins, profiling, new licensed data, AI-generated recommendations, or materially new purposes.

The preferred design remains aggregate, purpose-limited, role-restricted, explainable, and human governed.

## Production truth

No Azure analytics resource, Entra production identity path, production database, private Blob store, Key Vault binding, scheduled ingestion, campaign sender, penetration test, or production backup/restore is claimed by this record. These remain owner-controlled or external gates until exact-environment evidence exists.
