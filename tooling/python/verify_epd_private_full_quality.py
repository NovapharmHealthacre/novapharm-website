"""Independent PRIVATE full-row QA of pinned August 2026 NHSBSA EPD.

Streams an encrypted S3-quarantined ZIP locally, verifies ZIP and uncompressed
publisher SHA-256, CSV structure, Decimal totals and expected private QA control
figures. Never writes prescribing rows to S3/Atlas or approves source rights,
medicine identity, AI use or customer publication.
"""
import csv
import hashlib
import io
import json
import pathlib
import re
import sys
import zipfile
from decimal import Decimal, InvalidOperation

SOURCE = "nhsbsa_english_prescribing"
PERIOD = "2026-08"
ARCHIVE_SHA = "6b0b99e22968ac2f7eb730511fd3c3b9d59a1e47acd814053c573a8976ca5551"
ARCHIVE_BYTES = 644_232_845
CSV_SHA = "1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b"
CSV_BYTES = 7_432_815_985
BUCKET = "novapharm-staging-foundation-quarantinebucket-knggqkn5aqoq"
PREFIX = "governed-intake/nhsbsa/EPD_SNOMED_202608"
SOURCE_KEY = f"{PREFIX}/raw/EPD_SNOMED_202608-{ARCHIVE_SHA}.zip"
RECEIPT_KEY = f"{PREFIX}/receipts/private-full-row-qa-{ARCHIVE_SHA}-v1.json"
REQUIRED = ("YEAR_MONTH", "PRACTICE_CODE", "BNF_PRESENTATION_CODE", "SNOMED_CODE",
            "ITEMS", "QUANTITY", "NIC", "ACTUAL_COST", "BNF_CHEMICAL_SUBSTANCE")
EXPECTED = {
    "records": 17_754_211,
    "columns": 27,
    "unexpected_reporting_periods": 0,
    "row_length_mismatches": 0,
    "missing_practice_codes": 0,
    "missing_bnf_presentation_codes": 0,
    "missing_snomed_codes": 10_972,
    "invalid_items": 0,
    "invalid_quantity": 0,
    "invalid_nic": 0,
    "invalid_actual_cost": 0,
    "items_total": 102_050_994,
    "nic_total": "943194933.77",
    "actual_cost_total": "904525399.92187",
    "apixaban_rows": 50_593,
    "apixaban_missing_snomed": 0,
    "apixaban_presentations": {
        "0208020Z0AAAAAA": 25298,
        "0208020Z0AAABAB": 24175,
        "0208020Z0AAACAC": 71,
        "0208020Z0BBAAAA": 394,
        "0208020Z0BBABAB": 655,
    },
}

def bytes_sha(path):
    digest = hashlib.sha256()
    with open(path, "rb") as fp:
        while chunk := fp.read(4 * 1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


class DigestReader(io.RawIOBase):
    def __init__(self, source):
        super().__init__()
        self.source = source
        self.sha = hashlib.sha256()
        self.bytes = 0

    def readable(self):
        return True

    def readinto(self, b):
        n = self.source.readinto(b)
        if n:
            self.sha.update(memoryview(b)[:n])
            self.bytes += n
            if self.bytes > CSV_BYTES:
                raise ValueError("CSV exceeds pinned publisher size")
        return n


def numeric(value, *, integer=False):
    if value is None or not isinstance(value, str) or not value.strip():
        raise ValueError("missing numeric value")
    raw = value.strip()
    if integer:
        if not re.fullmatch(r"\d+", raw):
            raise ValueError("invalid nonnegative integer")
        return int(raw)
    try:
        number = Decimal(raw)
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("invalid source decimal") from exc
    if not number.is_finite() or number < 0:
        raise ValueError("negative or nonfinite source decimal")
    return number


def scan_rows(iterator, headers):
    if len(headers) != 27 or len(set(headers)) != len(headers) or not set(REQUIRED).issubset(headers):
        raise ValueError("EPD full source header differs from expected 27-column schema")
    positions = {field: headers.index(field) for field in REQUIRED}
    stats = {key: 0 for key in (
        "records", "unexpected_reporting_periods", "row_length_mismatches",
        "missing_practice_codes", "missing_bnf_presentation_codes", "missing_snomed_codes",
        "invalid_items", "invalid_quantity", "invalid_nic", "invalid_actual_cost",
        "items_total", "apixaban_rows", "apixaban_missing_snomed")}
    stats.update(columns=len(headers), nic_total=Decimal("0"),
                 actual_cost_total=Decimal("0"), apixaban_presentations={})
    for row in iterator:
        stats["records"] += 1
        if len(row) != len(headers):
            stats["row_length_mismatches"] += 1
            continue
        value = lambda name: row[positions[name]].strip()
        if value("YEAR_MONTH") not in ("202608", "2026-08"):
            stats["unexpected_reporting_periods"] += 1
        if not value("PRACTICE_CODE"):
            stats["missing_practice_codes"] += 1
        if not value("BNF_PRESENTATION_CODE"):
            stats["missing_bnf_presentation_codes"] += 1
        if not value("SNOMED_CODE"):
            stats["missing_snomed_codes"] += 1
        for key, field, name, integer in (
            ("invalid_items", "ITEMS", "items_total", True),
            ("invalid_quantity", "QUANTITY", None, False),
            ("invalid_nic", "NIC", "nic_total", False),
            ("invalid_actual_cost", "ACTUAL_COST", "actual_cost_total", False),
        ):
            try:
                parsed = numeric(value(field), integer=integer)
            except ValueError:
                stats[key] += 1
            else:
                if name:
                    stats[name] += parsed
        if value("BNF_CHEMICAL_SUBSTANCE") == "Apixaban":
            stats["apixaban_rows"] += 1
            if not value("SNOMED_CODE"):
                stats["apixaban_missing_snomed"] += 1
            code = value("BNF_PRESENTATION_CODE")
            stats["apixaban_presentations"][code] = stats["apixaban_presentations"].get(code, 0) + 1
    stats["nic_total"] = format(stats["nic_total"], "f")
    stats["actual_cost_total"] = format(stats["actual_cost_total"], "f")
    return stats


def verify_private_quality(archive_path):
    archive_path = pathlib.Path(archive_path)
    if (not archive_path.is_file() or archive_path.is_symlink()
        or archive_path.stat().st_size != ARCHIVE_BYTES
        or bytes_sha(archive_path) != ARCHIVE_SHA):
        raise ValueError("source archive integrity mismatch")
    with zipfile.ZipFile(archive_path, "r", allowZip64=True) as z:
        members = [m for m in z.infolist() if not m.is_dir()]
        if (len(members) != 1 or members[0].file_size != CSV_BYTES
            or pathlib.PurePosixPath(members[0].filename).name != members[0].filename
            or not members[0].filename.lower().endswith(".csv")):
            raise ValueError("unexpected publisher ZIP layout")
        with z.open(members[0], "r") as stream:
            raw = DigestReader(stream)
            with io.TextIOWrapper(io.BufferedReader(raw, buffer_size=256*1024),
                                  encoding="utf-8-sig", errors="strict", newline="") as txt:
                reader = csv.reader(txt, strict=True)
                headers = [x.strip() for x in next(reader)]
                stats = scan_rows(reader, headers)
            actual_bytes = raw.bytes
            actual_sha = raw.sha.hexdigest()
    if actual_bytes != CSV_BYTES or actual_sha != CSV_SHA:
        raise ValueError("publisher decompressed CSV integrity mismatch")
    failures = {
        name: {"prior_private_qa": expected, "rescan": stats.get(name)}
        for name, expected in EXPECTED.items() if stats.get(name) != expected
    }
    if failures:
        raise ValueError("independent private QA discrepancy: " + json.dumps(failures, sort_keys=True))
    return {
        "schema_version": "npi-private-nhsbsa-epd-full-row-quality-v1",
        "source_id": SOURCE, "resource": "EPD_SNOMED_202608", "period": PERIOD,
        "zip_sha256": ARCHIVE_SHA, "zip_bytes": ARCHIVE_BYTES,
        "csv_sha256": actual_sha, "csv_bytes": actual_bytes,
        "quality": stats, "matches_independent_private_drive_audit": True,
        "independently_publisher_certified_totals": False,
        "source_rights_approved": False, "third_party_terminology_rights_approved": False,
        "commercial_redistribution_approved": False, "ai_processing_approved": False,
        "accepted_observations": 0, "customer_publish_approved": False,
        "production_promoted": False, "release_state": "BLOCKED_PENDING_RIGHTS_AND_INDEPENDENT_RELEASE",
        "receipt_kind": "private_source_quality_only_not_medicine_admission",
    }


def store_private_receipt(s3, report):
    if (report.get("accepted_observations") != 0
        or report.get("customer_publish_approved") is not False
        or report.get("production_promoted") is not False):
        raise ValueError("release boundary unexpectedly changed")
    payload = (json.dumps(report, sort_keys=True, separators=(",", ":")) + "\n").encode()
    try:
        resp = s3.put_object(Bucket=BUCKET, Key=RECEIPT_KEY, Body=payload,
                             ContentType="application/json", ServerSideEncryption="AES256",
                             Metadata={"release-status": "blocked", "source-sha256": ARCHIVE_SHA},
                             IfNoneMatch="*")
        version = resp.get("VersionId")
    except Exception as exc:
        code = getattr(exc, "response", {}).get("Error", {}).get("Code")
        if code not in ("PreconditionFailed", "412"):
            raise
        existing = s3.get_object(Bucket=BUCKET, Key=RECEIPT_KEY)
        try:
            previous = existing["Body"].read()
        finally:
            existing["Body"].close()
        if previous != payload:
            raise ValueError("private immutable quality receipt differs on retry")
        version = existing.get("VersionId")
    head = s3.head_object(Bucket=BUCKET, Key=RECEIPT_KEY)
    if (head.get("ContentLength") != len(payload)
        or head.get("ServerSideEncryption") != "AES256"
        or head.get("Metadata", {}).get("release-status") != "blocked"):
        raise ValueError("private receipt S3 readback failure")
    return {"bucket": BUCKET, "key": RECEIPT_KEY, "version": version or head.get("VersionId"),
            "status": "independent_private_csv_qa_matched_not_approved",
            "accepted_observations": 0, "customer_publish_approved": False}


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: verify_epd_private_full_quality.py LOCAL_VERIFIED_SOURCE_ZIP")
    report = verify_private_quality(sys.argv[1])
    import boto3
    result = store_private_receipt(boto3.client("s3", region_name="eu-north-1"), report)
    print(json.dumps({"status": result["status"], "receipt_key": result["key"],
                      "receipt_version": result["version"], "records": report["quality"]["records"],
                      "missing_snomed": report["quality"]["missing_snomed_codes"],
                      "accepted_observations": 0, "customer_publish_approved": False}))


if __name__ == "__main__":
    main()
