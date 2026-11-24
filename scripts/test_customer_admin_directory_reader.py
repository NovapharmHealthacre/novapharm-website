"""Synthetic contract tests. No cloud calls, no real customer data."""
import importlib.util
from datetime import datetime, timezone
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "directory", Path(__file__).resolve().parents[1] / "infra/aws/customer-admin-directory-reader.py"
)
directory = importlib.util.module_from_spec(spec)
spec.loader.exec_module(directory)
NOW = datetime(2026, 11, 24, tzinfo=timezone.utc)

def identity(subject, verified="true", enabled=True):
    return {"Attributes": [{"Name": "sub", "Value": subject},
                           {"Name": "email", "Value": subject + "@example.invalid"},
                           {"Name": "email_verified", "Value": verified},
                           {"Name": "custom:private", "Value": "never-return"}],
            "Enabled": enabled, "UserStatus": "CONFIRMED", "UserCreateDate": NOW}

class Fake:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = []
    def list_users(self, **params):
        self.calls.append(params)
        response = next(self.responses)
        if isinstance(response, Exception):
            raise response
        return response

class DirectoryTests(unittest.TestCase):
    def test_separate_sources_complete_pagination_minimised_fields(self):
        client = Fake([{"Users": [identity("one")], "PaginationToken": "next"},
                       {"Users": [identity("two", "false", False)]},
                       {"Users": [identity("one")]}])
        result = directory.read_customer_identities(client, now=NOW)
        self.assertEqual([s["identityCount"] for s in result["sources"]], [2, 1])
        self.assertEqual(result["sources"][0]["verifiedCount"], 1)
        self.assertEqual(result["sources"][0]["enabledCount"], 1)
        self.assertIsNone(result["uniquePeopleCount"])
        self.assertNotIn("never-return", repr(result))
        keys = [row["rowKey"] for source in result["sources"] for row in source["records"]]
        self.assertEqual(len(set(keys)), 3)
        self.assertTrue(all(len(key) == 32 for key in keys))
        self.assertNotIn("subject", repr(result))
        self.assertEqual(client.calls[1]["PaginationToken"], "next")
        self.assertEqual(client.calls[0]["UserPoolId"], directory.SOURCES[0][1])
        self.assertEqual(client.calls[2]["UserPoolId"], directory.SOURCES[1][1])
    def test_failure_is_not_zero(self):
        with self.assertRaises(RuntimeError):
            directory.read_customer_identities(Fake([{"Users": []}, RuntimeError("denied")]))
    def test_repeated_token_rejected(self):
        with self.assertRaises(ValueError):
            directory.read_customer_identities(Fake([{"Users": [], "PaginationToken": "same"}]*2))
    def test_repeated_subject_rejected(self):
        with self.assertRaises(ValueError):
            directory.read_customer_identities(Fake([{"Users": [identity("one"), identity("one")]}]))
    def test_empty_complete_sources(self):
        result = directory.read_customer_identities(Fake([{"Users": []}, {"Users": []}]), now=NOW)
        self.assertEqual([s["identityCount"] for s in result["sources"]], [0, 0])

if __name__ == "__main__":
    unittest.main()
