"""Offline synthetic checks: no licensed EPD source bytes, cloud access or secrets."""
import hashlib
import pathlib
import tempfile
import unittest
import zipfile

import reassemble_verified_epd_drive_parts as subject


def sha(value):
    return hashlib.sha256(value).hexdigest()


class DriveReassemblyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.parts = self.root / "parts"
        self.parts.mkdir()
        self.samples = [bytes([65 + i]) * 6 for i in range(7)] + [b"END"]
        raw = b"".join(self.samples)
        self.manifest = {
            "source_id": "nhsbsa_english_prescribing",
            "resource": "EPD_SNOMED_202608",
            "source_archive_sha256": sha(raw),
            "source_archive_bytes": len(raw),
            "publisher_csv_sha256": sha(b"synthetic"),
            "publisher_csv_bytes": 9,
            "parts": [
                {"order": i, "filename": f"epd_202608_verified_archive_part_{i:02d}.bin",
                 "bytes": len(data), "sha256": sha(data)}
                for i, data in enumerate(self.samples)
            ],
            "transfer_status": "private_archive_parts_verified_not_accepted",
            "customer_publish_approved": False,
            "accepted_observations": 0,
            "rights_grants_created": 0,
            "production_promoted": False,
        }
        # In-process override is for tiny fixtures only; the public CLI pins
        # the real 80 MiB segments and official August source checksums.
        original = subject.PART_BYTES
        subject.PART_BYTES = 6
        self.addCleanup(lambda: setattr(subject, "PART_BYTES", original))

    def wrapped(self):
        for i, content in enumerate(self.samples):
            with zipfile.ZipFile(self.parts / f"epd-202608-verified-part-{i:02d}.zip", "w") as z:
                z.writestr(self.manifest["parts"][i]["filename"], content)

    def test_valid_drive_zip_wrappers_reassemble_without_production_release(self):
        self.wrapped()
        target = self.root / "archive.zip"
        receipt = subject.reassemble(self.manifest, self.parts, target, pin_publisher=False)
        self.assertEqual(target.read_bytes(), b"".join(self.samples))
        self.assertEqual(receipt["archive_sha256_verified"], self.manifest["source_archive_sha256"])
        self.assertEqual(receipt["accepted_observations"], 0)
        self.assertFalse(receipt["customer_publish_approved"])

    def test_corruption_rejects_and_removes_incomplete_output(self):
        self.wrapped()
        with zipfile.ZipFile(self.parts / "epd-202608-verified-part-04.zip", "w") as z:
            z.writestr(self.manifest["parts"][4]["filename"], b"BROKEN")
        target = self.root / "archive.zip"
        with self.assertRaises(ValueError):
            subject.reassemble(self.manifest, self.parts, target, pin_publisher=False)
        self.assertFalse(target.exists())

    def test_missing_duplicate_and_symlinked_part_fail_closed(self):
        self.wrapped()
        wrapped = self.parts / "epd-202608-verified-part-03.zip"
        wrapped.unlink()
        with self.assertRaises(ValueError):
            subject.reassemble(self.manifest, self.parts, self.root / "missing.zip", pin_publisher=False)
        with zipfile.ZipFile(wrapped, "w") as z:
            z.writestr(self.manifest["parts"][3]["filename"], self.samples[3])
        raw = self.parts / self.manifest["parts"][3]["filename"]
        raw.write_bytes(self.samples[3])
        with self.assertRaises(ValueError):
            subject.reassemble(self.manifest, self.parts, self.root / "duplicate.zip", pin_publisher=False)
        raw.unlink()
        wrapped.unlink()
        wrapped.symlink_to(self.parts / "epd-202608-verified-part-02.zip")
        with self.assertRaises(ValueError):
            subject.reassemble(self.manifest, self.parts, self.root / "link.zip", pin_publisher=False)

    def test_rights_promotion_and_order_tampering_rejected(self):
        self.wrapped()
        for key, value in [
            ("customer_publish_approved", True),
            ("accepted_observations", 1),
            ("production_promoted", True),
            ("rights_grants_created", 1),
        ]:
            with self.assertRaises(ValueError):
                subject.reassemble({**self.manifest, key: value}, self.parts,
                                   self.root / f"{key}.zip", pin_publisher=False)
        corrupted = {**self.manifest, "parts": [dict(p) for p in self.manifest["parts"]]}
        corrupted["parts"][4]["order"] = 3
        with self.assertRaises(ValueError):
            subject.reassemble(corrupted, self.parts, self.root / "ordering.zip", pin_publisher=False)

    def test_synthetic_source_cannot_pass_official_publisher_pin(self):
        self.wrapped()
        with self.assertRaises(ValueError):
            subject.reassemble(self.manifest, self.parts, self.root / "fake-source.zip")


if __name__ == "__main__":
    unittest.main()
