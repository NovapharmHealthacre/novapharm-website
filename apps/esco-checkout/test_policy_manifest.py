"""No-network tests for private 373-SKU approval manifest integrity."""
import hashlib
import io
import json
import unittest
from unittest.mock import patch

import index as backend


class ApprovalManifestTests(unittest.TestCase):
    def fixture(self, *, hash_override=None, overlap=False):
        manifest = json.dumps({
            "schema": "novapharm-esco-approved-skus-v1",
            "approved_skus": {"ESCO-CAT-0003" if overlap else "ESCO-CAT-0373": {
                "name": "test only"
            }}
        }, sort_keys=True).encode()
        digest = hashlib.sha256(manifest).hexdigest()
        ssm = type("SSM", (), {
            "get_parameter": lambda self, **kwargs: {"Parameter": {"Value": json.dumps({
                "enabled": True,
                "webhook_verified": True,
                "approved_skus": {"ESCO-CAT-0003": {"name": "original"}},
                "approval_manifest": {
                    "key": "policies/" + digest + ".json",
                    "sha256": hash_override or digest,
                }
            })}}
        })()
        s3 = type("S3", (), {
            "get_object": lambda self, **kwargs: {"Body": io.BytesIO(manifest)}
        })()
        return ssm, s3

    def test_sha_verified_s3_policy_merges_without_changing_original_sku(self):
        ssm, s3 = self.fixture()
        with patch.object(backend, "POLICY_PARAMETER", "/test/policy"), \
             patch.object(backend, "ESCO_APPROVAL_BUCKET", "test-private-bucket"), \
             patch.object(backend, "aws", side_effect=lambda service: s3 if service == "s3" else ssm):
            cfg = backend.policy()
        self.assertEqual(len(cfg["approved_skus"]), 2)
        self.assertEqual(cfg["approved_skus"]["ESCO-CAT-0003"]["name"], "original")
        self.assertIn("ESCO-CAT-0373", cfg["approved_skus"])

    def test_changed_object_hash_fails_closed(self):
        ssm, s3 = self.fixture(hash_override="0" * 64)
        with patch.object(backend, "POLICY_PARAMETER", "/test/policy"), \
             patch.object(backend, "ESCO_APPROVAL_BUCKET", "test-private-bucket"), \
             patch.object(backend, "aws", side_effect=lambda service: s3 if service == "s3" else ssm):
            with self.assertRaises(ValueError):
                backend.policy()

    def test_manifest_must_not_override_existing_checkout_price(self):
        ssm, s3 = self.fixture(overlap=True)
        with patch.object(backend, "POLICY_PARAMETER", "/test/policy"), \
             patch.object(backend, "ESCO_APPROVAL_BUCKET", "test-private-bucket"), \
             patch.object(backend, "aws", side_effect=lambda service: s3 if service == "s3" else ssm):
            with self.assertRaises(ValueError):
                backend.policy()

    def test_without_s3_pointer_existing_two_item_policy_keeps_working(self):
        ssm = type("SSM", (), {
            "get_parameter": lambda self, **kwargs: {"Parameter": {"Value": json.dumps({
                "enabled": True,
                "webhook_verified": True,
                "approved_skus": {"ESCO-CAT-0003": {"name": "original"}}
            })}}
        })()
        with patch.object(backend, "POLICY_PARAMETER", "/test/policy"), \
             patch.object(backend, "ESCO_APPROVAL_BUCKET", ""), \
             patch.object(backend, "aws", return_value=ssm):
            cfg = backend.policy()
        self.assertEqual(list(cfg["approved_skus"]), ["ESCO-CAT-0003"])


if __name__ == "__main__":
    unittest.main()
