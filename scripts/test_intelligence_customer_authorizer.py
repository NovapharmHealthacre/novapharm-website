import hashlib
import importlib.util
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
import unittest

FILE = Path(__file__).resolve().parents[1] / "infra" / "aws" / "intelligence-customer-authorizer.py"
spec = importlib.util.spec_from_file_location("npi_authorizer", FILE)
auth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auth)

NOW = datetime(2026, 11, 11, 6, 0, tzinfo=timezone.utc)
TOKEN = "a" * 43
HASH = hashlib.sha256(TOKEN.encode("ascii")).hexdigest()
SUB = "customer-12345678"
OWNER = "owner-123456789"
TENANT = "tenant-001"

def record_fixture():
    def item(**kw):
        return kw
    data = {}
    def add(pk, sk, row):
        data[(pk, sk)] = row
    add("SESSION#" + HASH, "META", item(tokenHash=HASH, status="active", revokedAt=None, identityProvider="cognito-oidc",
        mfaVerified=True, subject=SUB, tenantId=TENANT, sessionVersion=1, issuedAt="2026-11-11T05:00:00.000Z", expiresAt="2026-11-11T07:00:00.000Z", ttlEpoch=int((NOW + timedelta(hours=1)).timestamp())))
    add("TENANT#" + TENANT, "META", item(status="active", tenantId=TENANT, contractAccepted=True, ownershipVerified=True,
        ownerSubject=OWNER, seatLimit=4, activeSeatCount=1))
    add("SUBJECT#" + SUB, "TENANT#" + TENANT, item(status="active", tenantId=TENANT, subject=SUB, approved=True, approvedBy=OWNER))
    add("TENANT#" + TENANT, "SEAT#" + SUB, item(status="active", tenantId=TENANT, subject=SUB, sessionVersion=1, role="analyst", features=["medicine-search"]))
    add("TENANT#" + TENANT, "BILLING#" + SUB, item(status="active", tenantId=TENANT, subject=SUB, source="verified-stripe-webhook-ledger",
        webhookSignatureVerified=True, contractAccepted=True, stripeCustomerId="cus_synthetic12345", stripeSubscriptionId="sub_synthetic12345",
        periodStart="2026-11-01T00:00:00.000Z", periodEnd="2026-12-01T00:00:00.000Z", plan="starter", entitledFeatures=["medicine-search"]))
    add("TENANT#" + TENANT, "USAGE#" + SUB + "#2026-11", item(tenantId=TENANT, subject=SUB, period="2026-11", searchCount=0))
    add("GOVERNANCE#PRODUCTION", "FEATURE#medicine-search", item(productionApproved=True, sourceRightsApproved=True, approvedBy=OWNER))
    return data

class FakeTable:
    def __init__(self, rows):
        self.rows = rows
        self.calls = []
    def get_item(self, *, Key, ConsistentRead):
        assert ConsistentRead is True
        self.calls.append((Key["PK"], Key["SK"]))
        return {"Item": self.rows.get((Key["PK"], Key["SK"]))}

class AccessTests(unittest.TestCase):
    def setUp(self):
        self.data = record_fixture()
        self.table = FakeTable(self.data)
        self.event = {"action": "authorize", "sessionToken": TOKEN, "feature": "medicine-search"}
    def check(self, released=True):
        return auth.authorize(self.event, self.table, now=NOW, release_enabled=released)
    def test_all_synthetic_evidence_authorizes(self):
        result = self.check()
        self.assertTrue(result["allowed"])
        self.assertEqual(result["remainingSearches"], 25)
        self.assertEqual(len(self.table.calls), 7)
    def test_default_release_off(self):
        self.assertFalse(self.check(False)["allowed"])
        self.assertEqual(len(self.table.calls), 0)
    def test_user_supplied_tenant_rejected(self):
        self.event["tenantId"] = TENANT
        self.assertFalse(self.check()["allowed"])
        self.assertEqual(len(self.table.calls), 0)
    def test_absent_or_forged_token_denied(self):
        self.event["sessionToken"] = "b" * 43
        self.assertFalse(self.check()["allowed"])
        self.event["sessionToken"] = "fake.jwt.token"
        self.assertFalse(self.check()["allowed"])
    def test_revocation(self):
        self.data[("SESSION#" + HASH, "META")]["revokedAt"] = NOW.isoformat()
        self.assertFalse(self.check()["allowed"])
    def test_ttl_expiry(self):
        self.data[("SESSION#" + HASH, "META")]["ttlEpoch"] = int(NOW.timestamp())
        self.assertFalse(self.check()["allowed"])
    def test_cross_tenant_membership(self):
        self.data[("SUBJECT#" + SUB, "TENANT#" + TENANT)]["tenantId"] = "other-tenant"
        self.assertFalse(self.check()["allowed"])
    def test_unapproved_tenant(self):
        self.data[("TENANT#" + TENANT, "META")]["ownershipVerified"] = False
        self.assertFalse(self.check()["allowed"])
    def test_revoked_seat_version(self):
        self.data[("TENANT#" + TENANT, "SEAT#" + SUB)]["sessionVersion"] = 2
        self.assertFalse(self.check()["allowed"])
    def test_no_mfa(self):
        self.data[("SESSION#" + HASH, "META")]["mfaVerified"] = False
        self.assertFalse(self.check()["allowed"])
    def test_unpaid(self):
        self.data[("TENANT#" + TENANT, "BILLING#" + SUB)]["status"] = "past_due"
        self.assertFalse(self.check()["allowed"])
    def test_no_rights(self):
        self.data.pop(("GOVERNANCE#PRODUCTION", "FEATURE#medicine-search"))
        self.assertFalse(self.check()["allowed"])
    def test_quota(self):
        self.data[("TENANT#" + TENANT, "USAGE#" + SUB + "#2026-11")]["searchCount"] = 25
        self.assertFalse(self.check()["allowed"])
    def test_absent_records(self):
        self.table.rows = {}
        self.assertFalse(self.check()["allowed"])
    def test_database_error(self):
        self.table.get_item = lambda **kwargs: (_ for _ in ()).throw(RuntimeError("test"))
        self.assertEqual(self.check()["code"], "authorization_unavailable")
    def test_private_handler_fails_closed(self):
        old = os.environ.pop("NPI_CUSTOMER_ACCESS_ENABLED", None)
        try:
            self.assertFalse(auth.handler(self.event, None)["allowed"])
            self.assertFalse(auth.handler({"action": "unknown"}, None)["allowed"])
            self.assertEqual(auth.handler({"action": "health"}, None)["mode"], "private-read-only")
        finally:
            if old is not None:
                os.environ["NPI_CUSTOMER_ACCESS_ENABLED"] = old

if __name__ == "__main__":
    unittest.main()
