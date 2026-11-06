/** Deliberate fail-closed provider for AWS migration before malware-scanned S3
 * quarantine/promotion and authorised document read policies are verified.
 * Business contact APIs can start; uploads must never silently fall back to disk. */
export class DisabledDocumentStore {
  constructor() {
    this.requiresMalwareScan = true;
    this.providerName = "disabled-pending-aws-acceptance";
  }
  async initialize() {}
  async putQuarantine() { throw new Error("Secure document uploads are not activated in this AWS environment."); }
  async read() { throw new Error("Secure document reads are not activated in this AWS environment."); }
  async remove() { throw new Error("Secure document operations are not activated in this AWS environment."); }
  async scanStatus() { return { state: "error", result: "aws_scan_not_activated", scannedAt: null }; }
  async promote() { throw new Error("AWS malware scan and promotion are not authorised."); }
  status() { return "aws_document_storage_disabled"; }
}
