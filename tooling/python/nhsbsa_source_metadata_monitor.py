"""Read-only NHSBSA publisher metadata monitor with private, immutable S3 receipts.

NO archive downloads, medicine rows, Atlas writes, rights grants, automated
approval, production promotion, customer publication, emails or model egress.
A new period is a review candidate only.
"""
import hashlib
import json
import os
import re
import urllib.request
from datetime import datetime, timezone

API_URL = ("https://opendata.nhsbsa.net/api/3/action/package_show"
           "?id=english-prescribing-dataset-epd-with-snomed-code")
DATASET = "english-prescribing-dataset-epd-with-snomed-code"
BUCKET = "novapharm-staging-foundation-quarantinebucket-knggqkn5aqoq"
REGION = "eu-north-1"
PREFIX = "governed-intake/nhsbsa/source-monitor/v1"
NAME_PATTERN = re.compile(r"^EPD_SNOMED_(20\d{2})(0[1-9]|1[0-2])$")
BASELINE = {
    "period": "2026-08",
    "resource_name": "EPD_SNOMED_202608",
    "resource_id": "30b74257-9912-4b54-8990-8eec2a4b7f14",
    "csv_sha256": "1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b",
    "csv_bytes": 7432815985,
}
MAX_BYTES = 2_000_000
MAX_RESOURCES = 800


def digest(payload):
    return hashlib.sha256(payload).hexdigest()


def _fail(reason):
    raise ValueError("NHSBSA metadata quarantine rejected: " + reason)


def collect_snapshot(payload, *, observed_at):
    """Validate a bounded metadata response; never accept medicine data."""
    if not isinstance(payload, bytes) or len(payload) > MAX_BYTES:
        _fail("metadata_too_large")
    try:
        package = json.loads(payload)
    except (ValueError, UnicodeDecodeError):
        _fail("invalid_metadata_json")
    if (not isinstance(package, dict) or package.get("success") is not True
        or not isinstance(package.get("result"), dict)):
        _fail("publisher_api_shape")
    item = package["result"]
    if item.get("name") != DATASET or item.get("license_id") != "OGL-UK-3.0":
        _fail("publisher_identity_or_license_changed")
    resources = item.get("resources")
    if not isinstance(resources, list) or not 1 <= len(resources) <= MAX_RESOURCES:
        _fail("publisher_resource_count")
    periods = {}
    for resource in resources:
        if not isinstance(resource, dict):
            _fail("non_object_resource")
        m = NAME_PATTERN.fullmatch(str(resource.get("name", "")))
        if not m:
            continue
        period = f"{m.group(1)}-{m.group(2)}"
        if period in periods:
            _fail("duplicate_reporting_period")
        resource_id = resource.get("id")
        checksum = resource.get("sha256") or resource.get("hash")
        size = resource.get("size")
        if (not isinstance(resource_id, str) or len(resource_id) > 80
            or not re.fullmatch(r"[0-9a-fA-F-]{32,80}", resource_id)):
            _fail("untrusted_resource_id")
        if (not isinstance(checksum, str)
            or not re.fullmatch(r"[a-f0-9]{64}", checksum)):
            _fail("missing_or_invalid_publisher_sha256")
        if isinstance(size, bool) or not str(size).isdigit() or not 1 <= int(size) <= 20_000_000_000:
            _fail("missing_or_invalid_publisher_csv_size")
        periods[period] = {
            "period": period,
            "resource_name": resource["name"],
            "resource_id": resource_id,
            "csv_sha256": checksum,
            "csv_bytes": int(size),
        }
    if not periods:
        _fail("no_epd_period_bearing_resources")
    latest = max(periods)
    actual_baseline = periods.get(BASELINE["period"])
    if actual_baseline != BASELINE:
        status = "BLOCKED_BASELINE_SOURCE_CHANGED_OR_MISSING"
    elif latest > BASELINE["period"]:
        status = "NEW_PERIOD_CANDIDATE_REQUIRES_HUMAN_REVIEW"
    else:
        status = "BASELINE_PRESENT_NO_NEWER_PERIOD_DISCOVERED"
    # No publisher ZIP/CSV/medicine rows are fetched, saved or published.
    return {
        "schema_version": "npi-publisher-metadata-check-v1",
        "source_id": "nhsbsa_english_prescribing",
        "source_dataset": DATASET,
        "publisher": "NHS Business Services Authority",
        "publisher_api": API_URL,
        "publisher_license_label": "OGL-UK-3.0_NOT_A_THIRD_PARTY_TERMINOLOGY_GRANT",
        "observed_at_utc": observed_at,
        "response_sha256": digest(payload),
        "response_bytes": len(payload),
        "periods_found": len(periods),
        "latest_period": latest,
        "latest_resource": periods[latest],
        "pinned_august_source_matches": actual_baseline == BASELINE,
        "status": status,
        "source_rights_approved": False,
        "third_party_terminology_approved": False,
        "independent_data_reconciliation_approved": False,
        "accepted_observations": 0,
        "ai_processing_approved": False,
        "customer_publish_approved": False,
        "production_promoted": False,
        "release_status": "BLOCKED_UNTIL_INDEPENDENT_SOURCE_RIGHTS_AND_DATA_RELEASE",
    }


def storage_key(snapshot):
    timestamp = snapshot["observed_at_utc"]
    if not isinstance(timestamp, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T", timestamp[:11]):
        _fail("bad_observation_timestamp")
    # One immutable per-day observation per distinct publisher response digest.
    return f"{PREFIX}/{timestamp[:10]}/{snapshot['response_sha256']}.json"


def record_snapshot(s3, snapshot):
    key = storage_key(snapshot)
    data = (json.dumps(snapshot, sort_keys=True, separators=(",", ":")) + "\n").encode()
    if snapshot["customer_publish_approved"] is not False or snapshot["accepted_observations"] != 0:
        _fail("production_or_customer_release_flag_detected")
    try:
        receipt = s3.put_object(
            Bucket=BUCKET, Key=key, Body=data, ContentType="application/json",
            ServerSideEncryption="AES256",
            Metadata={"data-stage": "publisher-metadata-only", "release-status": "blocked"},
            IfNoneMatch="*")
        version = receipt.get("VersionId")
        state = "immutable_metadata_receipt_written"
    except Exception as exc:
        code = getattr(exc, "response", {}).get("Error", {}).get("Code")
        if code not in ("PreconditionFailed", "412"):
            raise
        existing = s3.get_object(Bucket=BUCKET, Key=key)
        current = json.loads(existing["Body"].read())
        # Same source response on the same day; preserve original observation.
        if (current.get("response_sha256") != snapshot["response_sha256"]
            or current.get("release_status") != snapshot["release_status"]
            or current.get("accepted_observations") != 0
            or current.get("customer_publish_approved") is not False
            or current.get("status") != snapshot["status"]):
            _fail("existing_snapshot_conflicts")
        version = existing.get("VersionId")
        state = "already_recorded"
    head = s3.head_object(Bucket=BUCKET, Key=key)
    if (head.get("ServerSideEncryption") != "AES256"
        or head.get("Metadata", {}).get("release-status") != "blocked"
        or head.get("ContentLength") is None):
        _fail("receipt_readback_not_private_or_not_blocked")
    return {
        "state": state,
        "bucket": BUCKET,
        "key": key,
        "version": version or head.get("VersionId"),
        "status": snapshot["status"],
        "latest_period": snapshot["latest_period"],
        "accepted_observations": 0,
        "customer_publish_approved": False,
    }


def handler(event, context):
    """Invocation only by EventBridge, never public HTTP / Function URL."""
    if os.environ.get("AWS_REGION") != REGION:
        _fail("wrong_region")
    observed_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    request = urllib.request.Request(
        API_URL, headers={"Accept": "application/json",
                          "User-Agent": "NovaPharm-Private-Source-Metadata-Monitor/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status != 200 or response.geturl() != API_URL:
            _fail("unexpected_publisher_http_response")
        content = response.read(MAX_BYTES + 1)
    snapshot = collect_snapshot(content, observed_at=observed_at)
    import boto3
    s3 = boto3.client("s3", region_name=REGION)
    outcome = record_snapshot(s3, snapshot)
    print(json.dumps({**outcome, "source_revision": os.environ.get("SOURCE_COMMIT", ""),
                      "metadata_only": True, "rights_not_granted": True}, sort_keys=True))
    return outcome
