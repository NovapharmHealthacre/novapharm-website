"""Verify publisher ZIP's complete contained CSV against NHSBSA official hash.

Only reads private archive, writes a small audit receipt. Does not extract source
data, authorise terminology, publish customer data or admit medicine facts.
"""
import csv
import hashlib
import json
import pathlib
import sys
import zipfile

EXPECTED_SIZE = 7_432_815_985
EXPECTED_SHA = "1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b"
MAX_ARCHIVE = 650_000_000

def verify_archive(archive_path: pathlib.Path, receipt_path: pathlib.Path) -> dict:
    if not archive_path.is_file() or not (0 < archive_path.stat().st_size <= MAX_ARCHIVE):
        raise ValueError("missing or oversize source archive")
    archive_hash = hashlib.sha256()
    with archive_path.open("rb") as fp:
        while (block := fp.read(4 * 1024 * 1024)):
            archive_hash.update(block)
    with zipfile.ZipFile(archive_path, "r", allowZip64=True) as z:
        members = [m for m in z.infolist() if not m.is_dir()]
        if len(members) != 1:
            raise ValueError("unexpected archive member count")
        member = members[0]
        parts = pathlib.PurePosixPath(member.filename)
        if parts.is_absolute() or ".." in parts.parts or len(parts.parts) != 1:
            raise ValueError("unsafe archive member path")
        if not member.filename.lower().endswith(".csv"):
            raise ValueError("expected a CSV member")
        if member.file_size != EXPECTED_SIZE:
            raise ValueError("publisher CSV byte size mismatched")
        csv_hash = hashlib.sha256()
        csv_bytes = 0
        physical_newlines = 0
        header = b""
        with z.open(member, "r") as fp:
            while (block := fp.read(4 * 1024 * 1024)):
                csv_bytes += len(block)
                if csv_bytes > EXPECTED_SIZE:
                    raise ValueError("decompressed CSV exceeds expected bytes")
                csv_hash.update(block)
                physical_newlines += block.count(b"\n")
                if b"\n" not in header and len(header) < 4096:
                    header += block[: max(0, 4096 - len(header))]
        if csv_bytes != EXPECTED_SIZE or csv_hash.hexdigest() != EXPECTED_SHA:
            raise ValueError("decompressed CSV differs from publisher checksum")
        raw_header = header.split(b"\n", 1)[0].lstrip(b"\xef\xbb\xbf").decode("utf-8").strip()
        fields = [name.strip().strip('"').strip() for name in next(csv.reader([raw_header]))]
        if not set(("YEAR_MONTH", "PRACTICE_CODE", "BNF_PRESENTATION_CODE", "ITEMS", "NIC")).issubset(set(fields)):
            raise ValueError("unexpected EPD CSV header")
    report = {
        "source_id": "nhsbsa_english_prescribing",
        "resource_id": "30b74257-9912-4b54-8990-8eec2a4b7f14",
        "reporting_period": "2026-08",
        "archive_sha256": archive_hash.hexdigest(),
        "archive_bytes": archive_path.stat().st_size,
        "decompressed_csv_sha256": csv_hash.hexdigest(),
        "decompressed_csv_bytes": csv_bytes,
        "physical_newlines": physical_newlines,
        "csv_header_fields": len(fields),
        "archive_contents_match_publisher_csv": True,
        "status": "raw_publisher_archive_integrity_verified_private_quarantine",
        "accepted_observations": 0,
        "customer_publish_approved": False,
        "source_rights_grants_created": 0,
        "third_party_terminology_rights_accepted": False,
        "production_promoted": False,
    }
    receipt_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: verify_epd_zip_archive.py OFFICIAL_ZIP PRIVATE_RECEIPT")
    r = verify_archive(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]))
    print(json.dumps({"status":r["status"], "csv_verified_bytes":r["decompressed_csv_bytes"],
                      "archive_sha256":r["archive_sha256"], "customer_publish_approved":False}))
