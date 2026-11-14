"""Land a *verified* August 2026 NHSBSA archive in private AWS quarantine.

The caller must first run archive-epd-official-zip.mjs and
verify_epd_zip_archive.py. This script refuses anything but the exact
publisher/Drive SHA-256 and never writes to the medicines production database.

Source acquisition occurs from the official publisher over HTTPS in CodeBuild;
matching the previously verified Drive archive hash proves byte equivalence,
but is NOT a Google Drive connector/synchronisation claim.
"""
import hashlib
import json
import os
import pathlib
import sys
from datetime import datetime, timezone

EXPECTED_ZIP_SHA = "6b0b99e22968ac2f7eb730511fd3c3b9d59a1e47acd814053c573a8976ca5551"
EXPECTED_ZIP_BYTES = 644_232_845
EXPECTED_CSV_SHA = "1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b"
EXPECTED_CSV_BYTES = 7_432_815_985
EXPECTED_RESOURCE = "EPD_SNOMED_202608"
EXPECTED_REGION = "eu-north-1"
EXPECTED_BUCKET = "novapharm-staging-foundation-quarantinebucket-knggqkn5aqoq"
PREFIX = "governed-intake/nhsbsa/EPD_SNOMED_202608"
SOURCE_KEY = f"{PREFIX}/raw/{EXPECTED_RESOURCE}-{EXPECTED_ZIP_SHA}.zip"
RECEIPT_KEY = f"{PREFIX}/receipts/private-archive-{EXPECTED_ZIP_SHA}.json"

def sha256_file(path):
    h = hashlib.sha256()
    with pathlib.Path(path).open("rb") as source:
        while chunk := source.read(4 * 1024 * 1024):
            h.update(chunk)
    return h.hexdigest()

def require_verified_local_source(archive_path, receipt_path):
    archive_path, receipt_path = map(pathlib.Path, (archive_path, receipt_path))
    receipt = json.loads(receipt_path.read_text("utf-8"))
    checks = (
        receipt.get("archive_contents_match_publisher_csv") is True
        and receipt.get("status") == "raw_publisher_archive_integrity_verified_private_quarantine"
        and receipt.get("archive_sha256") == EXPECTED_ZIP_SHA
        and receipt.get("archive_bytes") == EXPECTED_ZIP_BYTES
        and receipt.get("decompressed_csv_sha256") == EXPECTED_CSV_SHA
        and receipt.get("decompressed_csv_bytes") == EXPECTED_CSV_BYTES
        and receipt.get("customer_publish_approved") is False
        and receipt.get("accepted_observations") == 0
        and receipt.get("production_promoted") is False
        and receipt.get("third_party_terminology_rights_accepted") is False
    )
    if not checks:
        raise ValueError("Publisher receipt is absent, mismatched or attempts production acceptance")
    if not archive_path.is_file() or archive_path.is_symlink() or archive_path.stat().st_size != EXPECTED_ZIP_BYTES:
        raise ValueError("Private source archive missing or wrong length")
    if sha256_file(archive_path) != EXPECTED_ZIP_SHA:
        raise ValueError("Private source archive SHA-256 differs from verified Drive digest")
    return archive_path

def _get_or_none(s3, key):
    from botocore.exceptions import ClientError
    try:
        return s3.head_object(Bucket=EXPECTED_BUCKET, Key=key)
    except ClientError as exc:
        code = str(exc.response.get("Error", {}).get("Code", ""))
        if code in ("404", "NotFound", "NoSuchKey"):
            return None
        raise

def land_verified_private_archive(s3, archive_path, receipt_path, *, commit):
    archive_path = require_verified_local_source(archive_path, receipt_path)
    if not (len(commit) == 40 and all(c in "0123456789abcdef" for c in commit)):
        raise ValueError("Immutable source Git commit SHA required")
    h = _get_or_none(s3, SOURCE_KEY)
    if h is not None:
        if (h.get("ContentLength") != EXPECTED_ZIP_BYTES
            or h.get("ServerSideEncryption") != "AES256"
            or h.get("Metadata", {}).get("source-sha256") != EXPECTED_ZIP_SHA):
            raise ValueError("Immutable private S3 key already contains conflicting source")
    else:
        from boto3.s3.transfer import TransferConfig
        s3.upload_file(
            str(archive_path), EXPECTED_BUCKET, SOURCE_KEY,
            ExtraArgs={"ServerSideEncryption": "AES256",
                       "ContentType": "application/zip",
                       "Metadata": {"source-sha256": EXPECTED_ZIP_SHA,
                                    "data-stage": "quarantine-unapproved"}},
            Config=TransferConfig(multipart_threshold=64 * 1024 * 1024,
                                  multipart_chunksize=32 * 1024 * 1024,
                                  max_concurrency=3))
    head = s3.head_object(Bucket=EXPECTED_BUCKET, Key=SOURCE_KEY)
    if (head.get("ContentLength") != EXPECTED_ZIP_BYTES
        or head.get("ServerSideEncryption") != "AES256"
        or head.get("Metadata", {}).get("source-sha256") != EXPECTED_ZIP_SHA):
        raise ValueError("S3 archive upload did not read back with expected integrity metadata")

    actual = hashlib.sha256()
    count = 0
    obj = s3.get_object(Bucket=EXPECTED_BUCKET, Key=SOURCE_KEY)
    try:
        for block in obj["Body"].iter_chunks(chunk_size=4 * 1024 * 1024):
            if block:
                count += len(block)
                if count > EXPECTED_ZIP_BYTES:
                    raise ValueError("S3 source length exceeds immutable cap")
                actual.update(block)
    finally:
        obj["Body"].close()
    if count != EXPECTED_ZIP_BYTES or actual.hexdigest() != EXPECTED_ZIP_SHA:
        raise ValueError("S3 source readback SHA-256 mismatch; release must remain blocked")

    output = {
        "schema_version": "npi-private-source-s3-verified-v1",
        "verified_utc": datetime.now(timezone.utc).isoformat(),
        "source_id": "nhsbsa_english_prescribing",
        "resource": EXPECTED_RESOURCE,
        "reporting_period": "2026-08",
        "source_transport": "publisher_https_acquired_digest_equal_to_drive_private_archive",
        "source_drive_folder_id": "1II0aPPFlA97N68Bksa0BsUT3QYVET7Z5",
        "source_sha256": EXPECTED_ZIP_SHA,
        "source_bytes": EXPECTED_ZIP_BYTES,
        "decompressed_csv_sha256": EXPECTED_CSV_SHA,
        "decompressed_csv_bytes": EXPECTED_CSV_BYTES,
        "s3_bucket": EXPECTED_BUCKET,
        "s3_region": EXPECTED_REGION,
        "s3_key": SOURCE_KEY,
        "s3_version_id": head.get("VersionId"),
        "s3_integrity_readback": "full_bytes_sha256_pass",
        "execution_commit": commit,
        "accepted_observations": 0,
        "rights_grants_created": 0,
        "independent_terminology_rights_approved": False,
        "commercial_redistribution_approved": False,
        "ai_processing_approved": False,
        "customer_publish_approved": False,
        "production_promoted": False,
        "production_release_status": "BLOCKED_PENDING_RIGHTS_RECONCILIATION_AND_INDEPENDENT_ACCEPTANCE",
    }
    receipt_bytes = (json.dumps(output, sort_keys=True, indent=2) + "\n").encode("utf-8")
    existing = _get_or_none(s3, RECEIPT_KEY)
    if existing is None:
        s3.put_object(Bucket=EXPECTED_BUCKET, Key=RECEIPT_KEY, Body=receipt_bytes,
                      ServerSideEncryption="AES256", ContentType="application/json",
                      Metadata={"source-sha256": EXPECTED_ZIP_SHA,
                                "release-status": "blocked"})
    else:
        present = s3.get_object(Bucket=EXPECTED_BUCKET, Key=RECEIPT_KEY)
        try:
            previous = json.loads(present["Body"].read())
        finally:
            present["Body"].close()
        if (previous.get("source_sha256") != EXPECTED_ZIP_SHA
            or previous.get("s3_integrity_readback") != "full_bytes_sha256_pass"
            or previous.get("production_promoted") is not False
            or previous.get("customer_publish_approved") is not False):
            raise ValueError("Existing private receipt conflicts with verified source or release gates")
        output = previous
        receipt_bytes = (json.dumps(output, sort_keys=True, indent=2) + "\n").encode("utf-8")
    receipt_head = s3.head_object(Bucket=EXPECTED_BUCKET, Key=RECEIPT_KEY)
    if (receipt_head.get("ServerSideEncryption") != "AES256"
        or receipt_head.get("Metadata", {}).get("release-status") != "blocked"):
        raise ValueError("S3 receipt is not verified as private and release-blocked")
    return {"status": "private_raw_archive_s3_verified_not_accepted",
            "s3_bucket": EXPECTED_BUCKET, "archive_key": SOURCE_KEY,
            "archive_version_id": head.get("VersionId"),
            "receipt_key": RECEIPT_KEY,
            "receipt_version_id": receipt_head.get("VersionId"),
            "source_sha256": EXPECTED_ZIP_SHA,
            "s3_verified_bytes": count,
            "accepted_observations": 0,
            "production_promoted": False,
            "customer_publish_approved": False}

def main(argv):
    if len(argv) != 2:
        raise SystemExit("usage: publish_verified_epd_quarantine.py PRIVATE_SOURCE_ZIP PRIVATE_SOURCE_RECEIPT_JSON")
    if (os.environ.get("RUN_PRIVATE_ARCHIVE") != "1"
        or os.environ.get("AWS_DEFAULT_REGION") != EXPECTED_REGION):
        raise ValueError("Explicit private archive command and pinned AWS region required")
    import boto3
    from botocore.config import Config
    client = boto3.client("s3", region_name=EXPECTED_REGION,
                          config=Config(connect_timeout=10, read_timeout=240,
                                        retries={"max_attempts":4, "mode":"standard"}))
    proof = land_verified_private_archive(client, argv[0], argv[1],
                                          commit=os.environ.get("EXPECTED_SHA", ""))
    print(json.dumps(proof, sort_keys=True))

if __name__ == "__main__":
    main(sys.argv[1:])
