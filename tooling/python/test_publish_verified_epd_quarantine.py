"""Synthetic, network-free tests of the private S3 landing release boundary."""
import hashlib
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch
import publish_verified_epd_quarantine as p


def sha256(b):
    return hashlib.sha256(b).hexdigest()


class ReceiptGateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = pathlib.Path(self.tmp.name)
        self.payload = b"SAFE-SYNTHETIC-BYTES-NOT-NHSBSA"
        self.archive = self.base / "private.zip"
        self.archive.write_bytes(self.payload)
        self.receipt = self.base / "publisher-receipt.json"
        self.grant = {
            "archive_contents_match_publisher_csv": True,
            "status": "raw_publisher_archive_integrity_verified_private_quarantine",
            "archive_sha256": sha256(self.payload),
            "archive_bytes": len(self.payload),
            "decompressed_csv_sha256": sha256(b"csv-synthetic"),
            "decompressed_csv_bytes": 10,
            "customer_publish_approved": False,
            "accepted_observations": 0,
            "production_promoted": False,
            "third_party_terminology_rights_accepted": False,
        }
        self.receipt.write_text(json.dumps(self.grant))
        patches = [
            patch.object(p, "EXPECTED_ZIP_SHA", sha256(self.payload)),
            patch.object(p, "EXPECTED_ZIP_BYTES", len(self.payload)),
            patch.object(p, "EXPECTED_CSV_SHA", sha256(b"csv-synthetic")),
            patch.object(p, "EXPECTED_CSV_BYTES", 10),
        ]
        for item in patches:
            item.start()
            self.addCleanup(item.stop)

    def test_verified_synthetic_archive_is_eligible_for_private_quarantine_only(self):
        self.assertEqual(p.require_verified_local_source(self.archive, self.receipt), self.archive)

    def test_fail_closed_on_rights_promotions_and_missing_evidence(self):
        for key, value in (
            ("customer_publish_approved", True),
            ("production_promoted", True),
            ("accepted_observations", 1),
            ("third_party_terminology_rights_accepted", True),
            ("archive_contents_match_publisher_csv", False),
            ("archive_sha256", "0" * 64),
            ("decompressed_csv_sha256", "0" * 64),
            ("status", "production"),
        ):
            modified = {**self.grant, key: value}
            self.receipt.write_text(json.dumps(modified))
            with self.subTest(key=key), self.assertRaises(ValueError):
                p.require_verified_local_source(self.archive, self.receipt)
        self.receipt.unlink()
        with self.assertRaises(FileNotFoundError):
            p.require_verified_local_source(self.archive, self.receipt)

    def test_reject_corrupt_or_symlink_archive(self):
        self.archive.write_bytes(b"tampered")
        with self.assertRaises(ValueError):
            p.require_verified_local_source(self.archive, self.receipt)
        self.archive.unlink()
        separate = self.base / "source.bin"
        separate.write_bytes(self.payload)
        self.archive.symlink_to(separate)
        with self.assertRaises(ValueError):
            p.require_verified_local_source(self.archive, self.receipt)

    def test_digest_and_destination_are_pinned_to_original_quarantine(self):
        self.assertTrue(p.SOURCE_KEY.startswith("governed-intake/nhsbsa/"))
        self.assertTrue(p.RECEIPT_KEY.endswith(".json"))
        self.assertEqual(p.EXPECTED_REGION, "eu-north-1")
        self.assertIn("quarantine", p.EXPECTED_BUCKET)
        self.assertNotIn("production", p.SOURCE_KEY)

    def test_refuse_non_immutable_source_commit(self):
        class NoNetworkS3:
            pass
        with self.assertRaises(ValueError):
            p.land_verified_private_archive(NoNetworkS3(), self.archive, self.receipt, commit="main")


if __name__ == "__main__":
    unittest.main()
