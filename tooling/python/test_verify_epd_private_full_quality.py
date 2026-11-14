"""Offline synthetic tests: never download or include private NHSBSA data."""
import csv
import hashlib
import io
import json
import pathlib
import tempfile
import unittest
import zipfile
from unittest.mock import patch

import verify_epd_private_full_quality as m


class FakeS3:
    def __init__(self):
        self.items = {}
    def put_object(self, **kw):
        self.items[kw["Key"]] = {"payload": kw["Body"], "metadata": kw["Metadata"],
                                 "sse": kw["ServerSideEncryption"], "version": "test-version"}
        return {"VersionId": "test-version"}
    def head_object(self, **kw):
        v = self.items[kw["Key"]]
        return {"ContentLength": len(v["payload"]), "ServerSideEncryption": v["sse"],
                "Metadata": v["metadata"], "VersionId": v["version"]}


class QualityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.path = self.root / "source.zip"
        self.headers = list(m.REQUIRED) + [f"EXTRA_{i:02d}" for i in range(27 - len(m.REQUIRED))]
        self.rows = [
            ["202608", "A1234", "0208020Z0AAAAAA", "34567", "2", "1.5", "1.25", "1.23456", "Apixaban"],
            ["202608", "A1234", "0208020Z0AAAAAA", "", "3", "2", "2.50", "2.50000", "Apixaban"],
            ["202608", "B2345", "0208020Z0AAABAB", "5566", "1", "3", "1.75", "1.76544", "Other"],
        ]
        self.rows = [r + ["x"] * (27 - len(r)) for r in self.rows]
        buf = io.StringIO(newline="")
        writer = csv.writer(buf, lineterminator="\n")
        writer.writerow(self.headers)
        writer.writerows(self.rows)
        self.data = buf.getvalue().encode()
        with zipfile.ZipFile(self.path, "w", compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr("test.csv", self.data)
        self.mocks = [
            patch.object(m, "ARCHIVE_SHA", hashlib.sha256(self.path.read_bytes()).hexdigest()),
            patch.object(m, "ARCHIVE_BYTES", self.path.stat().st_size),
            patch.object(m, "CSV_SHA", hashlib.sha256(self.data).hexdigest()),
            patch.object(m, "CSV_BYTES", len(self.data)),
            patch.object(m, "EXPECTED", self.expected()),
        ]
        for p in self.mocks:
            p.start()
            self.addCleanup(p.stop)

    def expected(self):
        stats = m.scan_rows(iter(self.rows), self.headers)
        return dict(stats)

    def test_valid_synthetic_source_matches_private_quality_without_admission(self):
        report = m.verify_private_quality(self.path)
        self.assertEqual(report["quality"]["records"], 3)
        self.assertEqual(report["quality"]["missing_snomed_codes"], 1)
        self.assertEqual(report["quality"]["items_total"], 6)
        self.assertTrue(report["matches_independent_private_drive_audit"])
        self.assertIs(report["customer_publish_approved"], False)
        self.assertIs(report["production_promoted"], False)
        self.assertEqual(report["accepted_observations"], 0)

    def test_missing_checksum_rejects_mutation(self):
        with self.path.open("ab") as fp:
            fp.write(b"tamper")
        with self.assertRaisesRegex(ValueError, "source archive integrity mismatch"):
            m.verify_private_quality(self.path)

    def test_independent_prior_qa_disagreement_is_a_failure(self):
        with patch.object(m, "EXPECTED", {**m.EXPECTED, "records": 99}):
            with self.assertRaisesRegex(ValueError, "independent private QA discrepancy"):
                m.verify_private_quality(self.path)

    def test_bad_source_period_and_missing_measure_rejected_by_prior_qa(self):
        wrong = [r.copy() for r in self.rows]
        wrong[0][0] = "202607"
        stats = m.scan_rows(wrong, self.headers)
        self.assertEqual(stats["unexpected_reporting_periods"], 1)
        wrong[0][4] = ""
        stats = m.scan_rows(wrong, self.headers)
        self.assertEqual(stats["invalid_items"], 1)

    def test_duplicate_or_short_schema_rejected(self):
        with self.assertRaisesRegex(ValueError, "27-column"):
            m.scan_rows(iter(self.rows), self.headers[:-1])
        with self.assertRaisesRegex(ValueError, "27-column"):
            m.scan_rows(iter(self.rows), self.headers[:-1] + [self.headers[0]])

    def test_private_receipt_rejects_release_flags_and_verifies_encryption(self):
        report = m.verify_private_quality(self.path)
        store = FakeS3()
        receipt = m.store_private_receipt(store, report)
        self.assertEqual(receipt["status"], "independent_private_csv_qa_matched_not_approved")
        self.assertEqual(store.items[m.RECEIPT_KEY]["sse"], "AES256")
        with self.assertRaisesRegex(ValueError, "release boundary"):
            m.store_private_receipt(store, {**report, "customer_publish_approved": True})


if __name__ == "__main__":
    unittest.main()
