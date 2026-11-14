"""No-network synthetic tests for governed publisher metadata monitoring."""
import copy
import hashlib
import json
import unittest
from unittest.mock import patch
import nhsbsa_source_metadata_monitor as m

NOW = "2026-11-14T04:30:00+00:00"


def fixture(extra=None):
    baseline = {
        "name": "EPD_SNOMED_202608",
        "id": m.BASELINE["resource_id"],
        "sha256": m.BASELINE["csv_sha256"],
        "size": m.BASELINE["csv_bytes"],
    }
    body = {"success": True, "result": {
        "name": m.DATASET, "license_id": "OGL-UK-3.0",
        "resources": [baseline, *list(extra or [])]}}
    return json.dumps(body, separators=(",", ":")).encode()


class RecordingS3:
    def __init__(self):
        self.objects = {}

    def put_object(self, **kw):
        key = kw["Key"]
        if key in self.objects:
            raise AlreadyThere()
        self.objects[key] = {
            "Body": kw["Body"], "ServerSideEncryption": kw["ServerSideEncryption"],
            "Metadata": kw["Metadata"], "VersionId": "synthetic-v1"}
        return {"VersionId": "synthetic-v1"}

    def head_object(self, **kw):
        obj = self.objects[kw["Key"]]
        return {k: obj[k] for k in ("ServerSideEncryption", "Metadata", "VersionId")} | {
            "ContentLength": len(obj["Body"])}

    def get_object(self, **kw):
        import io
        obj = self.objects[kw["Key"]]
        return {"Body": io.BytesIO(obj["Body"]), "VersionId": obj["VersionId"]}


class AlreadyThere(Exception):
    response = {"Error": {"Code": "PreconditionFailed"}}


class SourceMonitorTests(unittest.TestCase):
    def test_known_publisher_baseline_is_unapproved_metadata_only(self):
        raw = fixture()
        d = m.collect_snapshot(raw, observed_at=NOW)
        self.assertEqual(d["status"], "BASELINE_PRESENT_NO_NEWER_PERIOD_DISCOVERED")
        self.assertEqual(d["response_sha256"], hashlib.sha256(raw).hexdigest())
        self.assertEqual(d["periods_found"], 1)
        for field in ("accepted_observations", "ai_processing_approved",
                      "customer_publish_approved", "production_promoted",
                      "independent_data_reconciliation_approved", "source_rights_approved"):
            self.assertFalse(d[field])
        self.assertEqual(d["release_status"],
                         "BLOCKED_UNTIL_INDEPENDENT_SOURCE_RIGHTS_AND_DATA_RELEASE")

    def test_newer_month_requires_review_and_preserves_old_source(self):
        raw = fixture([{"name": "EPD_SNOMED_202609",
                        "id": "30b74257-9912-4b54-8990-8eec2a4b7f15",
                        "sha256": "a" * 64, "size": 1_000_000}])
        d = m.collect_snapshot(raw, observed_at=NOW)
        self.assertEqual(d["status"], "NEW_PERIOD_CANDIDATE_REQUIRES_HUMAN_REVIEW")
        self.assertEqual(d["latest_period"], "2026-09")
        self.assertFalse(d["customer_publish_approved"])

    def test_baseline_tampering_blocks_freshness_acceptance(self):
        raw = json.loads(fixture())
        raw["result"]["resources"][0]["sha256"] = "f" * 64
        got = m.collect_snapshot(json.dumps(raw).encode(), observed_at=NOW)
        self.assertEqual(got["status"], "BLOCKED_BASELINE_SOURCE_CHANGED_OR_MISSING")
        raw["result"]["resources"][0]["name"] = "other_dataset"
        with self.assertRaisesRegex(ValueError, "no_epd_period_bearing_resources"):
            m.collect_snapshot(json.dumps(raw).encode(), observed_at=NOW)

    def test_bad_package_duplicate_period_bad_hash_and_large_body_are_rejected(self):
        raw = json.loads(fixture())
        raw["result"]["license_id"] = "not-approved"
        with self.assertRaises(ValueError):
            m.collect_snapshot(json.dumps(raw).encode(), observed_at=NOW)
        raw = json.loads(fixture())
        raw["result"]["resources"].append(copy.deepcopy(raw["result"]["resources"][0]))
        with self.assertRaises(ValueError):
            m.collect_snapshot(json.dumps(raw).encode(), observed_at=NOW)
        raw = json.loads(fixture())
        raw["result"]["resources"][0]["sha256"] = "bad"
        with self.assertRaises(ValueError):
            m.collect_snapshot(json.dumps(raw).encode(), observed_at=NOW)
        with self.assertRaises(ValueError):
            m.collect_snapshot(b" " * (m.MAX_BYTES + 1), observed_at=NOW)

    def test_private_storage_idempotent_versioned_and_no_customer_release(self):
        s3 = RecordingS3()
        snap = m.collect_snapshot(fixture(), observed_at=NOW)
        first = m.record_snapshot(s3, snap)
        self.assertEqual(first["state"], "immutable_metadata_receipt_written")
        self.assertTrue(first["key"].startswith(m.PREFIX))
        self.assertEqual(len(s3.objects), 1)
        same = m.record_snapshot(s3, snap)
        self.assertEqual(same["state"], "already_recorded")
        self.assertEqual(len(s3.objects), 1)
        self.assertEqual(first["version"], "synthetic-v1")

    def test_customer_flag_or_bad_observation_date_blocks_write(self):
        s3 = RecordingS3()
        d = m.collect_snapshot(fixture(), observed_at=NOW)
        with self.assertRaises(ValueError):
            m.record_snapshot(s3, {**d, "customer_publish_approved": True})
        with self.assertRaises(ValueError):
            m.record_snapshot(s3, {**d, "observed_at_utc": "unsafe/path"})
        self.assertEqual(len(s3.objects), 0)


if __name__ == "__main__":
    unittest.main()
