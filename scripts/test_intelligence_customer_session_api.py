import hashlib
import importlib.util
import json
import re
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "infra" / "aws" / "intelligence-customer-session-api.py"
spec = importlib.util.spec_from_file_location("customer_session_api", PATH)
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)

NOW = datetime(2026, 11, 11, 8, 0, tzinfo=timezone.utc)
SUBJECT = "cognito-user-12345678"
OWNER = "cognito-owner-12345678"
TENANT = "tenant-approved-001"
DATE = "2026-11"

def iso(value):
    return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")

def records():
    return {
        ("SUBJECT#" + SUBJECT, "TENANT#" + TENANT): {
            "PK": "SUBJECT#" + SUBJECT, "SK": "TENANT#" + TENANT,
            "status": "active", "subject": SUBJECT, "tenantId": TENANT,
            "approved": True, "approvedBy": OWNER,
        },
        ("TENANT#" + TENANT, "META"): {
            "status": "active", "tenantId": TENANT, "contractAccepted": True,
            "ownershipVerified": True, "ownerSubject": OWNER,
            "seatLimit": 3, "activeSeatCount": 1,
        },
        ("TENANT#" + TENANT, "SEAT#" + SUBJECT): {
            "status": "active", "tenantId": TENANT, "subject": SUBJECT,
            "sessionVersion": 1, "role": "analyst", "features": ["medicine-search"],
        },
        ("TENANT#" + TENANT, "BILLING#" + SUBJECT): {
            "status": "active", "tenantId": TENANT, "subject": SUBJECT,
            "source": "verified-stripe-webhook-ledger", "webhookSignatureVerified": True,
            "contractAccepted": True, "stripeCustomerId": "cus_synthetic1234",
            "stripeSubscriptionId": "sub_synthetic1234",
            "plan": "starter", "periodStart": "2026-11-01T00:00:00.000Z",
            "periodEnd": "2026-12-01T00:00:00.000Z",
            "entitledFeatures": ["medicine-search"],
        },
        ("TENANT#" + TENANT, "USAGE#" + SUBJECT + "#" + DATE): {
            "tenantId": TENANT, "subject": SUBJECT, "period": DATE, "searchCount": 0,
        },
        ("GOVERNANCE#PRODUCTION", "FEATURE#medicine-search"): {
            "customerLaunchAccepted": True, "sourceRightsApproved": True,
            "productionApproved": True, "approvedBy": OWNER,
        },
    }

class FakeDynamo:
    def __init__(self):
        self.rows = records()
        self.calls = []
        self.fail = False
        self.tx_fail = False

    def get_item(self, *, TableName, Key, ConsistentRead):
        assert TableName == api.TABLE
        assert ConsistentRead is True
        pk, sk = Key["PK"]["S"], Key["SK"]["S"]
        self.calls.append(("get", pk, sk))
        if self.fail:
            raise RuntimeError("synthetic database outage")
        row = self.rows.get((pk, sk))
        return {"Item": api.encode(row)} if row is not None else {}

    def query(self, *, TableName, ConsistentRead, KeyConditionExpression, ExpressionAttributeValues, Limit):
        assert TableName == api.TABLE and ConsistentRead is True and Limit == 2
        assert "begins_with" in KeyConditionExpression
        pk = ExpressionAttributeValues[":sub"]["S"]
        self.calls.append(("query", pk))
        if self.fail:
            raise RuntimeError("synthetic database outage")
        subset = [v for (k, sk), v in self.rows.items() if k == pk and sk.startswith("TENANT#")]
        return {"Items": [api.encode(x) for x in subset[:2]], **({"LastEvaluatedKey": {"PK": api.attr_s(pk)}} if len(subset) > 2 else {})}

    def transact_write_items(self, *, TransactItems, **kwargs):
        self.calls.append(("transact", TransactItems))
        if self.tx_fail:
            raise RuntimeError("synthetic transaction failure")
        # Capture the session row, allowing session status and revocation tests.
        for tx in TransactItems:
            if "Put" in tx:
                item = api.decode(tx["Put"]["Item"])
                self.rows[(item["PK"], item["SK"])] = item
            if "Update" in tx:
                target = tx["Update"]["Key"]
                pk, sk = target["PK"]["S"], target["SK"]["S"]
                row = self.rows[(pk, sk)]
                row["status"] = "revoked"
                row["revokedAt"] = tx["Update"]["ExpressionAttributeValues"][":when"]["S"]
        return {"ResponseMetadata": {"HTTPStatusCode": 200}}

def route(method="POST", path="/customer/session", *, claims=True):
    out = {
        "version": "2.0",
        "requestContext": {
            "apiId": api.API_ID, "domainName": api.HOST,
            "routeKey": method + " " + path,
            "http": {"method": method, "path": path},
        },
        "headers": {"origin": "https://" + api.HOST},
    }
    if claims:
        out["requestContext"]["authorizer"] = {"jwt": {"claims": {
            "iss": api.ISSUER, "aud": api.CLIENT_ID, "token_use": "id",
            "acr": "urn:cognito:loa:4", "amr": '["pwd","otp","mfa"]',
            "email_verified": "true", "auth_time": str(int(NOW.timestamp()) - 60),
            "sub": SUBJECT,
        }}}
    return out

def body(response):
    return json.loads(response["body"])

class SessionApiTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDynamo()
        self.request = route()

    def create(self, enabled=True):
        return api.handle(self.request, self.db, now=NOW, enabled=enabled)

    def cookie(self, response):
        match = re.search(r"__Host-npi_session=([A-Za-z0-9_-]{43})", response.get("headers", {}).get("Set-Cookie", ""))
        return match.group(1) if match else None

    def test_release_off_denies_without_read(self):
        response = self.create(False)
        self.assertEqual(response["statusCode"], 503)
        self.assertEqual(self.db.calls, [])
        self.assertNotIn("Set-Cookie", response["headers"])

    def test_valid_synthetic_approval_issues_secure_short_session(self):
        response = self.create()
        self.assertEqual(response["statusCode"], 200)
        cookie = response["headers"]["Set-Cookie"]
        for required in ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", "Max-Age="]:
            self.assertIn(required, cookie)
        self.assertNotIn("Domain=", cookie)
        self.assertIn("no-store", response["headers"]["Cache-Control"])
        token = self.cookie(response)
        self.assertEqual(len(token), 43)
        hash_value = hashlib.sha256(token.encode("ascii")).hexdigest()
        saved = self.db.rows[("SESSION#" + hash_value, "META")]
        self.assertEqual(saved["tokenHash"], hash_value)
        self.assertNotIn("sessionToken", saved)
        self.assertEqual(saved["tenantId"], TENANT)
        self.assertEqual(saved["status"], "active")
        self.assertEqual(saved["mfaVerified"], True)
        self.assertEqual(len([x for x in self.db.calls if x[0] == "transact"]), 1)
        actions = next(x[1] for x in self.db.calls if x[0] == "transact")
        self.assertEqual(len(actions), 8)
        self.assertEqual(len([x for x in actions if "ConditionCheck" in x]), 6)

    def test_gateway_identity_is_required(self):
        self.request = route(claims=False)
        self.assertEqual(self.create()["statusCode"], 401)
        self.assertEqual(len(self.db.calls), 0)
        self.request = route()
        self.request["requestContext"]["apiId"] = "forged"
        self.assertEqual(self.create()["statusCode"], 401)
        self.assertEqual(len(self.db.calls), 0)

    def test_no_totp_and_old_login_refused(self):
        self.request["requestContext"]["authorizer"]["jwt"]["claims"]["amr"] = '["pwd"]'
        self.assertEqual(self.create()["statusCode"], 401)
        self.request = route()
        self.request["requestContext"]["authorizer"]["jwt"]["claims"]["auth_time"] = str(int(NOW.timestamp()) - 301)
        self.assertEqual(self.create()["statusCode"], 401)

    def test_unverified_email_and_wrong_issuer_refused(self):
        self.request["requestContext"]["authorizer"]["jwt"]["claims"]["email_verified"] = "false"
        self.assertEqual(self.create()["statusCode"], 401)
        self.request = route()
        self.request["requestContext"]["authorizer"]["jwt"]["claims"]["iss"] = "https://evil.example"
        self.assertEqual(self.create()["statusCode"], 401)

    def test_no_approved_tenant_or_multiple_memberships(self):
        self.db.rows.pop(("SUBJECT#" + SUBJECT, "TENANT#" + TENANT))
        self.assertEqual(self.create()["statusCode"], 403)
        self.db = FakeDynamo()
        extra = dict(self.db.rows[("SUBJECT#" + SUBJECT, "TENANT#" + TENANT)])
        extra["tenantId"] = "other-tenant-001"
        extra["SK"] = "TENANT#other-tenant-001"
        self.db.rows[(extra["PK"],extra["SK"])] = extra
        self.assertEqual(self.create()["statusCode"], 403)

    def test_revoked_seat_or_unaccepted_tenant_refused(self):
        self.db.rows[("TENANT#" + TENANT, "SEAT#" + SUBJECT)]["status"] = "revoked"
        self.assertEqual(self.create()["statusCode"], 403)
        self.db = FakeDynamo()
        self.db.rows[("TENANT#" + TENANT, "META")]["ownershipVerified"] = False
        self.assertEqual(self.create()["statusCode"], 403)

    def test_inactive_subscription_and_missing_data_rights_refused(self):
        self.db.rows[("TENANT#" + TENANT, "BILLING#" + SUBJECT)]["status"] = "past_due"
        self.assertEqual(self.create()["statusCode"], 403)
        self.db = FakeDynamo()
        self.db.rows[("GOVERNANCE#PRODUCTION", "FEATURE#medicine-search")]["sourceRightsApproved"] = False
        self.assertEqual(self.create()["statusCode"], 403)

    def test_quota_and_expired_period_deny(self):
        self.db.rows[("TENANT#" + TENANT, "USAGE#" + SUBJECT + "#" + DATE)]["searchCount"] = 25
        self.assertEqual(self.create()["statusCode"], 403)
        self.db = FakeDynamo()
        self.db.rows[("TENANT#" + TENANT, "BILLING#" + SUBJECT)]["periodEnd"] = "2026-11-10T00:00:00.000Z"
        self.assertEqual(self.create()["statusCode"], 403)

    def test_failed_transaction_does_not_issue_cookie(self):
        self.db.tx_fail = True
        response = self.create()
        self.assertNotEqual(response["statusCode"], 200)
        self.assertNotIn("Set-Cookie", response["headers"])

    def test_storage_error_is_not_a_success(self):
        self.db.fail = True
        response = self.create()
        self.assertNotEqual(response["statusCode"], 200)
        self.assertNotIn("Set-Cookie", response["headers"])
        self.assertNotIn("synthetic", response["body"])

    def test_anonymous_session_check_denies(self):
        self.request = route("GET", "/customer/session", claims=False)
        self.assertEqual(self.create()["statusCode"], 401)

    def test_approved_session_rechecked_on_every_read(self):
        created = self.create()
        token = self.cookie(created)
        request = route("GET", "/customer/session", claims=False)
        request["cookies"] = [api.COOKIE + "=" + token]
        self.request = request
        self.assertEqual(self.create()["statusCode"], 200)
        self.assertEqual(body(self.create())["plan"], "starter")
        self.db.rows[("TENANT#" + TENANT, "SEAT#" + SUBJECT)]["sessionVersion"] = 2
        self.assertEqual(self.create()["statusCode"], 401)

    def test_cross_origin_logout_refused(self):
        self.request = route("POST", "/customer/logout", claims=False)
        self.request["headers"]["origin"] = "https://evil.example"
        self.assertEqual(self.create()["statusCode"], 403)

    def test_logout_revokes_with_audited_transaction(self):
        created = self.create()
        token = self.cookie(created)
        self.request = route("POST", "/customer/logout", claims=False)
        self.request["cookies"] = [api.COOKIE + "=" + token]
        response = self.create()
        self.assertEqual(response["statusCode"], 200)
        self.assertIn("Max-Age=0", response["headers"]["Set-Cookie"])
        self.request = route("GET", "/customer/session", claims=False)
        self.request["cookies"] = [api.COOKIE + "=" + token]
        self.assertEqual(self.create()["statusCode"], 401)

    def test_logout_storage_error_returns_unavailable_and_clears_cookie(self):
        created = self.create()
        token = self.cookie(created)
        self.db.tx_fail = True
        self.request = route("POST", "/customer/logout", claims=False)
        self.request["cookies"] = [api.COOKIE + "=" + token]
        response = self.create()
        self.assertEqual(response["statusCode"], 503)
        self.assertIn("Max-Age=0", response["headers"]["Set-Cookie"])

if __name__ == "__main__":
    unittest.main()
