/**
 * Source-only CloudTrail selector proposal for the private NHSBSA EPD archive.
 * This module never calls AWS, enables billing or deploys a policy.
 */
const TRAIL = "novapharm-staging-audit";
const EVIDENCE = "arn:aws:s3:::novapharm-intelligence-evidence-250675045172-eu-north-1/";
const QUARANTINE =
  "arn:aws:s3:::novapharm-staging-foundation-quarantinebucket-knggqkn5aqoq/governed-intake/nhsbsa/EPD_SNOMED_202608/";
const DATA = "AWS::S3::Object";

function deny(message) {
  throw new Error("Quarantine CloudTrail plan denied: " + message);
}
function same(x, y) { return JSON.stringify(x) === JSON.stringify(y); }
const management = Object.freeze({
  ReadWriteType: "All",
  IncludeManagementEvents: true,
  DataResources: [],
  ExcludeManagementEventSources: []
});
const existingEvidence = Object.freeze({
  ReadWriteType: "WriteOnly",
  IncludeManagementEvents: false,
  DataResources: [{ Type: DATA, Values: [EVIDENCE] }],
  ExcludeManagementEventSources: []
});
const proposedQuarantine = Object.freeze({
  ReadWriteType: "All",
  IncludeManagementEvents: false,
  DataResources: [{ Type: DATA, Values: [QUARANTINE] }],
  ExcludeManagementEventSources: []
});

/**
 * Preserve the two exact existing selectors and append one isolated
 * read/write data-event selector under the quarantine prefix. Any state drift,
 * untrusted input or ambiguous overlap is a hard stop: never overwrite a
 * changed management/security configuration.
 *
 * Output is an inspectable proposal, NEVER an AWS PutEventSelectors call.
 */
export function planPrivateEpdQuarantineCloudTrailSelectors({
  trailName, eventSelectors, advancedEventSelectors = []
} = {}) {
  if (trailName !== TRAIL) deny("wrong_trail");
  if (!Array.isArray(eventSelectors) || !Array.isArray(advancedEventSelectors) ||
      advancedEventSelectors.length !== 0) deny("unexpected_selector_mode");
  if (eventSelectors.length !== 2 && eventSelectors.length !== 3) {
    deny("unexpected_selector_count");
  }
  if (!same(eventSelectors[0], management) ||
      !same(eventSelectors[1], existingEvidence)) {
    deny("existing_audit_policy_drift");
  }
  if (eventSelectors.length === 3 && !same(eventSelectors[2], proposedQuarantine)) {
    deny("quarantine_selector_mismatch");
  }
  const alreadyPresent = eventSelectors.length === 3;
  // Deep copy every result so mutation by an operator UI cannot edit input.
  const selectors = JSON.parse(JSON.stringify(
    alreadyPresent ? eventSelectors : [...eventSelectors, proposedQuarantine]));
  return Object.freeze({
    mode: "proposal_not_applied",
    status: alreadyPresent ? "selector_present_requires_live_event_proof" :
      "independent_review_and_cost_approval_required",
    trailName: TRAIL,
    selectors,
    proposedArchivePrefix: QUARANTINE,
    preservesExistingEvidenceWriteEvents: true,
    preservesManagementEvents: true,
    archiveReadAndWriteEvents: true,
    customerAccessEnabled: false,
    approvedForExecution: false,
    addedSelectorCount: alreadyPresent ? 0 : 1
  });
}
export const privateEpdCloudTrailAuditScope = Object.freeze({
  trailName: TRAIL, existingEvidencePrefix: EVIDENCE,
  quarantineArchivePrefix: QUARANTINE, applied: false
});
