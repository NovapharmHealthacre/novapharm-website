"""Fail-closed NHSBSA candidate metadata review. No bulk download or production admission."""
import datetime
import json
import uuid

import boto3

REGION = "eu-north-1"
BUCKET = "novapharm-intelligence-analytics-review-250675045172-eu-north-1"
KEY = "source-review/candidates/v1/nhsbsa-epd-apixaban-2026-08.ndjson"
s3 = boto3.client("s3", region_name=REGION)

body = s3.get_object(Bucket=BUCKET, Key=KEY)["Body"].read()
if len(body) > 8192:
    raise RuntimeError("Candidate metadata exceeds the bounded 8 KiB limit")
lines = [line for line in body.decode("utf-8").splitlines() if line.strip()]
if len(lines) != 1:
    raise RuntimeError("Exactly one candidate metadata record is required")
record = json.loads(lines[0])
expected = {
    "source_id": "nhsbsa.epd",
    "reporting_period": "2026-08",
    "resource_id": "30b74257-9912-4b54-8990-8eec2a4b7f14",
    "rights_status": "pending_independent_review",
    "identity_status": "unresolved",
    "data_status": "not_downloaded",
    "accepted_observation_count": 0,
    "snapshot_verified": False,
    "independent_sha256": "",
    "reviewer_id": "",
}
for field, value in expected.items():
    if type(record.get(field)) is not type(value) or record[field] != value:
        raise RuntimeError("Candidate review status deviates from rights-pending contract: " + field)
if any(field not in {
    "source_id", "publisher", "reporting_period", "resource_id",
    "discovery_manifest_key", "publisher_hash_unverified",
    "independent_sha256", "rights_status", "identity_status",
    "data_status", "accepted_observation_count", "reviewer_id",
    "snapshot_verified", "last_reviewed_at"
} for field in record):
    raise RuntimeError("Unexpected candidate metadata field; review data minimisation")
now = datetime.datetime.now(datetime.timezone.utc)
report = {
    "review_schema": "novapharm.analytics.candidate-preflight.v1",
    "checked_at": now.isoformat(),
    "candidate_source": record["source_id"],
    "period": record["reporting_period"],
    "status": "BLOCKED_PENDING_INDEPENDENT_RIGHTS_AND_SOURCE_PROOF",
    "source_downloaded": False,
    "source_sha256_independently_verified": False,
    "accepted_observation_count": 0,
    "production_eligible": False,
    "blockers": [
        "independent_rights_approval",
        "complete_source_hash_and_size",
        "date_effective_apixaban_identity",
        "partition_reconciliation",
        "independent_final_admission",
        "tenant_and_data_egress_validation"
    ],
}
key = "source-review/preflight/v1/" + now.strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex + ".json"
# Glue Python 3.9 includes an older botocore without PutObject IfNoneMatch.
# A high-entropy unique key and bucket versioning avoid intentional overwrites.
s3.put_object(
    Bucket=BUCKET, Key=key, Body=(json.dumps(report, sort_keys=True)+"\n").encode("utf-8"),
    ContentType="application/json", ServerSideEncryption="AES256",
    Metadata={"review-state": "blocked-not-accepted"}
)
print(json.dumps({"audit_key": key, "status": report["status"], "production_eligible": False}))
