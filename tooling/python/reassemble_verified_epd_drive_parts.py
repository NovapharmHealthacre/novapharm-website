"""Verify and reassemble the eight private Drive parts for NHSBSA EPD 202608.

Input: source-reassembly-manifest.json extracted from its manifest ZIP, plus
the eight Drive part ZIPs (or their extracted .bin members). The result is a
byte-verified private ZIP and a separate publisher-CSV integrity receipt.
Neither operation grants rights, admits medicines or publishes analytics.
"""
import hashlib
import json
import pathlib
import re
import sys
import zipfile
from contextlib import contextmanager

from verify_epd_zip_archive import verify_archive

EXPECTED_ARCHIVE_SHA256 = "6b0b99e22968ac2f7eb730511fd3c3b9d59a1e47acd814053c573a8976ca5551"
EXPECTED_ARCHIVE_BYTES = 644232845
EXPECTED_CSV_SHA256 = "1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b"
EXPECTED_CSV_BYTES = 7432815985
PART_BYTES = 80 * 1024 * 1024
PART_COUNT = 8
BLOCK_BYTES = 4 * 1024 * 1024


def _check_manifest(m, *, pin_publisher=True):
    if m.get("source_id") != "nhsbsa_english_prescribing" or m.get("resource") != "EPD_SNOMED_202608":
        raise ValueError("unexpected EPD dataset/version")
    if (m.get("transfer_status") != "private_archive_parts_verified_not_accepted"
            or m.get("customer_publish_approved") is not False
            or m.get("production_promoted") is not False
            or m.get("accepted_observations") != 0
            or m.get("rights_grants_created") != 0):
        raise ValueError("source rights / production release boundary violated")
    for key in ("source_archive_sha256", "publisher_csv_sha256"):
        if not isinstance(m.get(key), str) or not re.fullmatch(r"[a-f0-9]{64}", m[key]):
            raise ValueError("invalid archive or publisher SHA-256")
    parts = m.get("parts")
    if not isinstance(parts, list) or len(parts) != PART_COUNT:
        raise ValueError("expected eight ordered private archive parts")
    total = 0
    for idx, item in enumerate(parts):
        if (not isinstance(item, dict) or type(item.get("order")) is not int
                or item["order"] != idx
                or item.get("filename") != f"epd_202608_verified_archive_part_{idx:02d}.bin"
                or type(item.get("bytes")) is not int
                or item["bytes"] != (PART_BYTES if idx < PART_COUNT - 1 else m.get("source_archive_bytes") - PART_BYTES * (PART_COUNT - 1))
                or not isinstance(item.get("sha256"), str)
                or not re.fullmatch(r"[a-f0-9]{64}", item["sha256"])):
            raise ValueError(f"invalid archive part metadata at index {idx}")
        total += item["bytes"]
    if total != m.get("source_archive_bytes") or not (PART_BYTES * 7 < total <= PART_BYTES * 8):
        raise ValueError("archive parts do not reconcile to source size")
    if pin_publisher and (m["source_archive_sha256"] != EXPECTED_ARCHIVE_SHA256
                          or m["source_archive_bytes"] != EXPECTED_ARCHIVE_BYTES
                          or m["publisher_csv_sha256"] != EXPECTED_CSV_SHA256
                          or m["publisher_csv_bytes"] != EXPECTED_CSV_BYTES):
        raise ValueError("source receipt differs from the pinned 2026-08 publisher capture")


@contextmanager
def _read_part(folder, item):
    idx = item["order"]
    raw = folder / item["filename"]
    wrapped = folder / f"epd-202608-verified-part-{idx:02d}.zip"
    present = [p for p in (raw, wrapped) if p.exists() or p.is_symlink()]
    if len(present) != 1 or present[0].is_symlink() or not present[0].is_file():
        raise ValueError(f"part {idx}: expected exactly one regular private part file")
    path = present[0]
    if path == raw:
        with path.open("rb") as stream:
            yield stream
    else:
        with zipfile.ZipFile(path) as archive:
            members = archive.infolist()
            if (len(members) != 1 or members[0].is_dir()
                    or members[0].filename != item["filename"]
                    or members[0].file_size != item["bytes"]):
                raise ValueError(f"part {idx}: unsafe or mismatched ZIP wrapper")
            with archive.open(members[0], "r") as stream:
                yield stream


def reassemble(manifest, folder, destination, *, pin_publisher=True):
    """Verify every part and fail without leaving an archive on any mismatch."""
    _check_manifest(manifest, pin_publisher=pin_publisher)
    folder = pathlib.Path(folder)
    destination = pathlib.Path(destination)
    if destination.is_symlink() or destination.exists() or not destination.parent.is_dir():
        raise ValueError("archive output must be a new, non-symlink file")
    total = 0
    digest = hashlib.sha256()
    try:
        with destination.open("xb") as out:
            for part in manifest["parts"]:
                part_hash = hashlib.sha256()
                part_size = 0
                with _read_part(folder, part) as src:
                    while block := src.read(BLOCK_BYTES):
                        part_size += len(block)
                        if part_size > part["bytes"]:
                            raise ValueError("part has excess bytes")
                        out.write(block)
                        part_hash.update(block)
                        digest.update(block)
                if part_size != part["bytes"] or part_hash.hexdigest() != part["sha256"]:
                    raise ValueError(f"part {part['order']}: source bytes or SHA mismatch")
                total += part_size
        if total != manifest["source_archive_bytes"] or digest.hexdigest() != manifest["source_archive_sha256"]:
            raise ValueError("reassembled source ZIP checksum mismatch")
        return {"archive_bytes_verified": total, "archive_sha256_verified": digest.hexdigest(),
                "status": "private_archive_bytes_verified_not_accepted", "accepted_observations": 0,
                "customer_publish_approved": False, "production_promoted": False}
    except BaseException:
        destination.unlink(missing_ok=True)
        raise


def main(args):
    if len(args) != 4:
        raise SystemExit("usage: reassemble_verified_epd_drive_parts.py MANIFEST_JSON PARTS_DIR NEW_ARCHIVE_ZIP NEW_PRIVATE_RECEIPT_JSON")
    manifest_path, parts_dir, output_path, receipt_path = map(pathlib.Path, args)
    if output_path.resolve() == receipt_path.resolve() or receipt_path.exists() or receipt_path.is_symlink():
        raise ValueError("receipt must be a separate, new file")
    manifest = json.loads(manifest_path.read_text("utf-8"))
    proof = reassemble(manifest, parts_dir, output_path)
    try:
        receipt = verify_archive(output_path, receipt_path)
        if (receipt["archive_sha256"] != proof["archive_sha256_verified"]
                or receipt["archive_bytes"] != proof["archive_bytes_verified"]
                or receipt["decompressed_csv_sha256"] != EXPECTED_CSV_SHA256
                or receipt["customer_publish_approved"] is not False):
            raise ValueError("publisher CSV or rights-boundary verification failed")
    except BaseException:
        output_path.unlink(missing_ok=True)
        receipt_path.unlink(missing_ok=True)
        raise
    print(json.dumps({"status": "private_publisher_archive_and_csv_verified_not_accepted",
                      "archive_sha256": proof["archive_sha256_verified"],
                      "customer_publish_approved": False, "accepted_observations": 0,
                      "production_promoted": False}))


if __name__ == "__main__":
    main(sys.argv[1:])
