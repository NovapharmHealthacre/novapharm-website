# NOVA accepted evidence and external-AI rights attestation (v2)

The server-only `answerGovernedMedicineQuestion` boundary is **not a public API, deployed model, rights grant, accepted source record or production certification**. This contract prevents a string labelled `accepted` or `active` from being sufficient to send medicine evidence to a third-party model.

## Required independently loaded record evidence

The trusted `loadAcceptedEvidence` adapter must load only same-workspace, exact-medicine, non-sample observed facts. Each row must include:

- `verifiedByEvidenceAuthority: true`: assertion from independently verified admission service, not from an upstream publisher, LLM, customer request or an untrusted MongoDB preview row.
- `acceptanceReceiptSha256`: SHA-256 identifier/digest of the **persisted** admission acknowledgement. A dummy digest does not constitute acceptance.
- `provenanceSha256`: separately verified upstream publisher provenance digest.
- `recordContentSha256`: SHA-256 of the exact UTF-8 JSON string formed in the fixed order `{workspaceId, medicineId, id, sourceId, sourceVersion, title, passage, sourceUrl}`. Any displayed title, answer passage, tenant/medicine identifier, source version or citation URL change must invalidate the record hash.
- `acceptanceStatus: "accepted"`, `isSample: false`, `evidenceType: "observed_fact"` and a safe HTTPS citation URL.

The stored acceptance record and its provenance must be verified against the transactional system before the adapter sets its authority flag. This pure function cannot verify durable signatures, publisher data licences, reality of source content, or a customer's eligibility on its own.

## Required independently reviewed rights grant

`resolveSourceRight` must obtain an independently reviewed version-matched grant whose `allowedPurposes` includes `external_ai_medicine_answer`. Also required:

- `verifiedByRightsAuthority: true`, `externalAiMedicineAnswerApproved: true`, `status: "active"`, no `revokedAt`, and a current validity window.
- `approvalRecordSha256`: digest of the actual signed/acknowledged rights decision and `reviewedBy`, `reviewedAt` identifying its accountable reviewer and date.
- `approvedPublisherHosts`: exact lower-case public publisher hostnames. The citation's HTTPS hostname must exactly equal one approved host; local, numeric IP and credential-bearing URLs are denied.

A legally reviewed grant is not created by populating the above flags. In addition, the private `verifyCurrentAuthority` adapter must atomically re-check session, tenant and all current source-rights revisions before egress and before release of the draft. Durable pre-egress and draft audits, success metrics, and human-review status remain mandatory.

## Release gates remain closed

As of the last independently checked preview inventory: zero accepted medicine rows, zero active rights grants, zero customer ownership rows, no production NOVA model service or approved key. The positive Node tests use synthetic receipts/digests to exercise *contract logic only*. They do not license, fetch or publish real observations. Do not turn on OpenAI inference or customer entitlements merely because tests pass.
