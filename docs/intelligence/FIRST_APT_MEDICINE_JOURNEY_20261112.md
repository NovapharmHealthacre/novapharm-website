# First medicine journey: Apixaban (private acceptance plan)

Owner: NovaPharm Intelligence. Parent: #517, #497, #454. Scope: exact-identity, source-rights-first production staging. Customer publication, billing, AI egress and customer notifications remain OFF.

## Verified baseline (12 November 2026)

- The founder Cognito password + TOTP login to the private read-only shell is operational, but the founder-only session does **not** grant restricted medicine evidence access.
- MongoDB Atlas production cluster \`npi-bootstrap\`, database \`novapharm_intelligence_production\`, has seven declared collections and their source/identity/evidence/manifest/audit indexes. The current source registry contains four **metadata-only** sources: NHSBSA EPD, ONS, openFDA and ClinicalTrials.gov.
- \`npi_source_rights\`, \`npi_ingestion_runs\`, \`npi_medicine_identity\`, \`npi_medicine_evidence\`, \`npi_evidence_manifests\` and \`npi_audit_events\` have **zero admitted records** at the baseline. Do not turn static workspace links or synthetic CI fixtures into source evidence.
- Google Drive's governed medicines intake and quarantined source review exist; raw FDA NDC Apixaban and EMA shortage examples are **unapproved**, and are not evidence of a licensed, authoritative cross-country medicine mapping.
- Existing G1 \`prepareOfficialMedicineEvidenceCandidate\` validates NHSBSA EPD, source file/row hashes, independently reconciled partition totals, exact code-to-medicine identity proof, BNF/SNOMED term rights and private-only scope. Its output remains \`candidate_not_accepted\`.

## G2 implementation in this pull request

\`src/core/medicine-evidence-atomic-admission.mjs\` implements a server-injected, fail-closed adapter contract for the **next** step after G1. It requires:

1. Current board/admin authority on \`novapharm-internal-staging\`, checked both before and after commit. A founder-shell-only role is insufficient.
2. Independent active dataset and third-party terminology rights, exact source/resource/version/sha/purpose, checked just before and after commit; a historical owner assertion alone is not an approval.
3. One trusted atomic write of the complete validated partition **plus** immutable manifest **plus** append-only audit receipt. The adapter must enforce status transitions, idempotency and transaction durability.
4. An independent readback matching transaction ID, event ID, manifest digest, committed row count and audit status. A separate server-owned quarantine adapter is mandatory: if authority or rights are revoked after commit, it must atomically quarantine the committed rows and append a matching audit receipt before the function returns a denial. Database/network integrations are intentionally **not** embedded; use approved, narrowly permissioned server adapters.
5. No accepted customer data, automatic AI, forecast, clinical conclusion, business recommendation or customer release from this function. The result is private admission pending a separate human and production gate.

The new test suite explicitly exercises synthetic positive flow, stale/revoked/incorrect rights, wrong tenant, customer/founder-only session denial, patient text, unresolved identity, source-hash/total mismatches, unreliable audit, and revocation races.

## Exact Apixaban first-journey release sequence

| Step | Evidence to record | Current |
|---|---|---|
| Resource-rights review | Publisher source version, exact URL, terms digest, reuse/AI/commercial scope, third-party BNF/SNOMED grants, reviewer and validity | **Not approved** |
| Source manifest | Immutable publisher resource, SHA-256, period/jurisdiction, row count and reconciliation | **Missing** |
| Canonical identity | One exact Apixaban formulation/strength/pack/source code with valid dates, unresolved match queue | **Missing** |
| Staging transaction | G1 source proof + G2 independent live rights/tenant check + atomic evidence/manifest/audit and durable readback | **Adapter implemented; not executed** |
| First private search | Exact identity search returns one admitted record with versioned citation and as-of semantics | **Not wired** |
| NOVA explanation | Source-cited comparison only from committed evidence, abstention on absent/conflicting evidence, no external egress without scope approval | **Not wired** |
| Reproducible report | Identity, metric, source digest, source period, rights revision and audit receipt reconstructed deterministically | **Not wired** |
| Human acceptance | Independent scientific, security, rights and tenant proof with restore/revocation tests | **Pending** |

**Do not treat "Apixaban" as sufficient to resolve products.** Country, active ingredient, formulation, strength, pack, approval status and exact source identity need separate versioned evidence. UK NHSBSA prescribing observations are not US FDA authorisations. Pricing, trials, tenders and shortage signals cannot be joined by free-text name alone.

## Operator handoff

- Use the existing Drive quarantine and rights-review register. Do not copy raw sample records into \`npi_medicine_identity\` or \`npi_medicine_evidence\` until accepted.
- Choose one exact NHSBSA EPD resource and verify publisher terms plus **BNF/SNOMED terminology rights** before any commit.
- Implement a narrowly scoped Atlas staging transaction adapter with official resource hash, current rights service, independent session-authority service, append-only audit, readback and revocation/quarantine.
- Validate one accepted identity/evidence pair in private staging before designing observed-market views and NOVA citations. Preserve the zero-billing, no-emails and fail-closed production flags.
