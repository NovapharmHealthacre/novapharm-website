"""No-dependency negative tests: rights must fail closed before CLIP imports."""
import hashlib
import os
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

from rights import validate_public_asset, valid_expiry
from serve import approved_file, prepare

BASE = {
    "assetId": "public-pack-1",
    "title": "Approved public product artwork",
    "sourceUrl": "https://novapharmhealthcare.com/products/",
    "rightsReference": "rights-register:public:1",
    "rightsApproved": True,
    "publicAssetOnly": True,
    "rightsStatus": "active",
    "rightsExpiryDate": "2099-12-31",
    "imageSha256": "a" * 64,
    "sourceImageSha256": "a" * 64,
}


class RightsTests(unittest.TestCase):
    def test_no_implicit_date_or_expired_rights(self):
        self.assertTrue(valid_expiry("2027-04-18", date(2027, 4, 18)))
        self.assertFalse(valid_expiry("2027-04-17", date(2027, 4, 18)))
        for value in (None, "", "tomorrow", "2026-02-30", "2026-W45-3"):
            self.assertFalse(valid_expiry(value))

    def test_only_explicit_approved_public_rights(self):
        self.assertEqual(validate_public_asset(BASE)["assetId"], "public-pack-1")
        for change in (
            {"rightsStatus": "revoked"},
            {"rightsStatus": "pending"},
            {"rightsApproved": False},
            {"publicAssetOnly": False},
            {"rightsExpiryDate": "2000-01-01"},
            {"rightsReference": ""},
            {"assetId": "../secrets"},
            {"imageSha256": "wrong"},
            {"sourceUrl": "http://novapharmhealthcare.com/"},
            {"sourceUrl": "https://attacker@novapharmhealthcare.com/"},
            {"sourceUrl": "https://novapharmhealthcare.com/#fragment"},
            {"sourceUrl": "https://novapharmhealthcare.com:8443/"},
        ):
            with self.subTest(change=change):
                with self.assertRaises(ValueError):
                    validate_public_asset({**BASE, **change})

    def test_index_rights_are_bound_to_original_image_checksum(self):
        self.assertEqual(validate_public_asset(BASE, indexed=True)["sourceImageSha256"], "a" * 64)
        with self.assertRaises(ValueError):
            validate_public_asset({**BASE, "sourceImageSha256": ""}, indexed=True)

    def test_duplicate_asset_ids_rejected(self):
        seen = set()
        validate_public_asset(BASE, seen=seen)
        with self.assertRaises(ValueError):
            validate_public_asset(BASE, seen=seen)

    def test_hash_verified_without_model_imports(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / "checkpoint.bin"
            p.write_bytes(b"untrusted model fixture, never executed")
            digest = hashlib.sha256(p.read_bytes()).hexdigest()
            with patch.dict(os.environ, {"ASSET_PATH": str(p), "ASSET_SHA": digest}):
                self.assertEqual(approved_file("ASSET_PATH", "ASSET_SHA"), p.resolve())
            with patch.dict(os.environ, {"ASSET_PATH": str(p), "ASSET_SHA": "0" * 64}):
                with self.assertRaises(RuntimeError):
                    approved_file("ASSET_PATH", "ASSET_SHA")

    def test_disabled_process_never_attempts_model_load(self):
        with patch.dict(os.environ, {"NPI_CLIP_ENABLED": "false"}):
            with self.assertRaisesRegex(RuntimeError, "disabled"):
                prepare()


if __name__ == "__main__":
    unittest.main()
