"""No-network regression tests for the fail-closed AWS Glue metadata preflight."""
import contextlib
import io
import json
import runpy
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "infrastructure" / "aws" / "glue_review_candidate_preflight.py"
CANDIDATE = ROOT / "docs" / "data" / "evidence" / "nhsbsa-epd-apixaban-2026-08-candidate.ndjson"

BUCKET = "novapharm-intelligence-analytics-review-250675045172-eu-north-1"
CANDIDATE_KEY = "source-review/candidates/v1/nhsbsa-epd-apixaban-2026-08.ndjson"
AUDIT_PREFIX = "source-review/preflight/v1/"


class FakeBody:
    def __init__(self, content):
        self.content = content

    def read(self):
        return self.content


class FakeS3:
    def __init__(self, content):
        self.content = content
        self.gets = []
        self.puts = []

    def get_object(self, **kwargs):
        self.gets.append(kwargs)
        return {"Body": FakeBody(self.content)}

    def put_object(self, **kwargs):
        self.puts.append(kwargs)
        return {"VersionId": "fake-version"}


def run_preflight(body):
    fake = FakeS3(body)
    boto3 = types.ModuleType("boto3")

    def client(service, region_name):
        if service != "s3" or region_name != "eu-north-1":
            raise AssertionError("Unexpected AWS client")
        return fake

    boto3.client = client
    with patch.dict(sys.modules, {"boto3": boto3}):
        with contextlib.redirect_stdout(io.StringIO()) as out:
            runpy.run_path(str(SCRIPT), run_name="__main__")
    return fake, out.getvalue()


class PreflightContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = json.loads(CANDIDATE.read_text(encoding="utf-8"))

    @staticmethod
    def encode(record):
        return (json.dumps(record) + "\n").encode("utf-8")

    def test_pending_record_produces_only_blocked_audit(self):
        fake, output = run_preflight(self.encode(self.base))
        self.assertEqual(fake.gets, [{"Bucket": BUCKET, "Key": CANDIDATE_KEY}])
        self.assertEqual(len(fake.puts), 1)
        put = fake.puts[0]
        self.assertEqual(put["Bucket"], BUCKET)
        self.assertTrue(put["Key"].startswith(AUDIT_PREFIX))
        self.assertEqual(put["ServerSideEncryption"], "AES256")
        self.assertEqual(put["Metadata"]["review-state"], "blocked-not-accepted")
        report = json.loads(put["Body"])
        self.assertEqual(report["status"], "BLOCKED_PENDING_INDEPENDENT_RIGHTS_AND_SOURCE_PROOF")
        self.assertFalse(report["production_eligible"])
        self.assertFalse(report["source_downloaded"])
        self.assertFalse(report["source_sha256_independently_verified"])
        self.assertEqual(report["accepted_observation_count"], 0)
        self.assertEqual(len(report["blockers"]), 6)
        self.assertFalse(json.loads(output)["production_eligible"])

    def assert_rejected(self, field, value):
        record = dict(self.base)
        record[field] = value
        with self.assertRaisesRegex(RuntimeError, "rights-pending contract"):
            run_preflight(self.encode(record))

    def test_rejects_rights_approval_without_independent_admission(self):
        self.assert_rejected("rights_status", "approved")

    def test_rejects_published_or_accepted_candidate(self):
        self.assert_rejected("accepted_observation_count", 1)

    def test_rejects_false_count_as_boolean(self):
        self.assert_rejected("accepted_observation_count", False)

    def test_rejects_alleged_verified_snapshot(self):
        self.assert_rejected("snapshot_verified", True)

    def test_rejects_unverified_hash_stated_as_verified(self):
        self.assert_rejected("independent_sha256", "a" * 64)

    def test_rejects_unreviewed_identity_change(self):
        self.assert_rejected("identity_status", "resolved")

    def test_rejects_another_publisher_resource(self):
        self.assert_rejected("resource_id", "substituted-resource")

    def test_rejects_unexpected_personal_field(self):
        record = dict(self.base)
        record["patient_name"] = "not allowed"
        with self.assertRaisesRegex(RuntimeError, "Unexpected candidate metadata"):
            run_preflight(self.encode(record))

    def test_rejects_duplicate_rows(self):
        data = self.encode(self.base)
        with self.assertRaisesRegex(RuntimeError, "Exactly one candidate"):
            run_preflight(data + data)

    def test_rejects_oversized_input(self):
        with self.assertRaisesRegex(RuntimeError, "bounded 8 KiB"):
            run_preflight(b" " * 8193)

    def test_infrastructure_remains_isolated_and_unexposed(self):
        text = (ROOT / "infrastructure" / "aws" / "novapharm-intelligence-analytics-review.yaml").read_text(encoding="utf-8")
        self.assertIn("EnforceWorkGroupConfiguration: true", text)
        self.assertIn("BytesScannedCutoffPerQuery: 26214400", text)
        self.assertIn("MaxCapacity: 0.0625", text)
        self.assertIn("MaxRetries: 0", text)
        self.assertIn("aws:SecureTransport: 'false'", text)
        self.assertNotIn("AWS::Glue::Crawler", text)
        self.assertNotIn("AWS::Events::Rule", text)
        self.assertNotIn("AWS::ApiGateway", text)
        self.assertNotIn("s3:DeleteObject", text)
        self.assertNotIn("s3:PutBucketPolicy", text)


    def test_official_publisher_metadata_is_unapproved_and_bounded(self):
        metadata = json.loads(
            (ROOT / "docs" / "data" / "evidence" / "nhsbsa-epd-publisher-metadata-202608.json")
            .read_text(encoding="utf-8")
        )
        self.assertEqual(metadata["source_id"], "nhsbsa.epd")
        self.assertEqual(metadata["reporting_period"], "2026-08")
        self.assertEqual(metadata["resource_id"], "30b74257-9912-4b54-8990-8eec2a4b7f14")
        self.assertEqual(metadata["resource_size_bytes"], 7432815985)
        self.assertEqual(metadata["publisher_license_id"], "OGL-UK-3.0")
        self.assertFalse(metadata["publisher_hash_independently_verified"])
        self.assertFalse(metadata["source_file_downloaded"])
        self.assertFalse(metadata["terminology_rights_approved"])
        self.assertEqual(metadata["production_observations_accepted"], 0)
        self.assertEqual(metadata["production_admission_status"], "blocked_pending_independent_review")
        self.assertEqual(len(metadata["publisher_advertised_sha256"]), 64)
        self.assertEqual(len(metadata["publisher_metadata_response_sha256"]), 64)

    def test_publisher_catalog_separates_metadata_from_medicine_facts(self):
        manifest = (ROOT / "infrastructure" / "aws" / "novapharm-intelligence-analytics-review.yaml").read_text(encoding="utf-8")
        self.assertIn("PublisherMetadataTable:", manifest)
        self.assertIn("Name: publisher_resource_metadata_v1", manifest)
        self.assertIn("source-review/publisher-metadata-query/v1/", manifest)
        self.assertIn("data_state: unverified_publisher_metadata", manifest)
        self.assertIn("customer_publication: prohibited", manifest)
        self.assertIn("Name: resource_size_bytes, Type: bigint", manifest)
        self.assertNotIn("AWS::Glue::Crawler", manifest)
        self.assertNotIn("AWS::Events::Rule", manifest)

if __name__ == "__main__":
    unittest.main()
