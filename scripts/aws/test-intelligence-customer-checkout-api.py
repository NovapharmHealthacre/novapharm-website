"""Mock-only acceptance tests for the separate, default-off Intelligence Checkout Lambda."""
import importlib.util
import json
import pathlib
import unittest

PATH = pathlib.Path(__file__).resolve().parents[2] / "infra/aws/intelligence-customer-checkout-api.py"
SPEC = importlib.util.spec_from_file_location("npi_checkout_entry", PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
NOW = 1800000000
SUB = "d13906d5-f790-4091-98ff-873866bb31ad"
TENANT = "test-tenant-one"
CUSTOMER = "cus_CustomerSynthetic01"
PRICE = MODULE.PRICES[("starter", "monthly")]

def encode(record):
    out = {}
    for k, v in record.items():
        if isinstance(v, bool):
            out[k] = {"BOOL": v}
        elif isinstance(v, int):
            out[k] = {"N": str(v)}
        elif isinstance(v, str):
            out[k] = {"S": v}
        elif isinstance(v, list):
            out[k] = {"L": [{"S": z} for z in v]}
        else:
            raise AssertionError(k)
    return out

def fixture():
    base = {
        ("SUBJECT#" + SUB, "TENANT#" + TENANT):
            {"tenantId": TENANT, "subject": SUB, "status": "active",
             "approved": True, "approvedBy": SUB},
        ("TENANT#" + TENANT, "META"):
            {"tenantId": TENANT, "status": "active", "ownershipVerified": True,
             "contractAccepted": True, "ownerSubject": SUB},
        ("TENANT#" + TENANT, "SEAT#" + SUB):
            {"subject": SUB, "tenantId": TENANT, "status": "active",
             "role": "owner", "features": ["medicine-search"]},
        ("TENANT#" + TENANT, "BILLING#" + SUB):
            {"subject": SUB, "tenantId": TENANT, "status": "pending",
             "stripeCustomerId": CUSTOMER, "version": 1},
        ("TENANT#" + TENANT, "CONTRACT#" + SUB):
            {"subject": SUB, "tenantId": TENANT, "acceptedBy": SUB, "accepted": True,
             "stripeCustomerId": CUSTOMER, "plan": "starter", "cycle": "monthly",
             "stripePriceId": PRICE, "version": "contract-v1"},
        ("TENANT#" + TENANT, "OWNER#" + SUB):
            {"subject": SUB, "tenantId": TENANT, "stripeCustomerId": CUSTOMER,
             "verified": True},
        ("GOVERNANCE#PRODUCTION", "FEATURE#medicine-search"):
            {"customerLaunchAccepted": True, "sourceRightsApproved": True,
             "productionApproved": True},
        ("GOVERNANCE#PRODUCTION", "BILLING#CHECKOUT"):
            {"customerLaunchAccepted": True, "sourceRightsApproved": True,
             "productionRuntimeAccepted": True, "stripeWebhookAndLedgerAccepted": True,
             "billingLedgerWriteAndReplayAccepted": True,
             "taxCodeAndRegistrationsAccepted": True, "tenantIsolationAccepted": True,
             "serverSideContractAccepted": True, "revision": 5,
             "stripeAccountId": MODULE.LIVE_ACCOUNT},
    }
    return base

class FakeDb:
    def __init__(self, records=None):
        self.records = fixture() if records is None else records
        self.writes = []
        self.reads = 0
    def query(self, **_):
        self.reads += 1
        return {"Items": [encode(self.records[("SUBJECT#" + SUB, "TENANT#" + TENANT)])]}
    def get_item(self, **kwargs):
        self.reads += 1
        pk = kwargs["Key"]["PK"]["S"]
        sk = kwargs["Key"]["SK"]["S"]
        record = self.records.get((pk, sk))
        return {"Item": encode(record)} if record else {}
    def transact_write_items(self, **kwargs):
        self.writes.append(("reserve", kwargs))
    def update_item(self, **kwargs):
        self.writes.append(("deliver", kwargs))

def event(plan="starter", cycle="monthly", claims=None, extras=None):
    identity = {
        "iss": MODULE.ISSUER, "aud": MODULE.CLIENT_ID, "token_use": "id",
        # Cognito managed ID tokens typically do not include ACR or AMR;
        # enforced user-pool MFA + AdminGetUser are independently checked.
        "auth_time": str(NOW - 20), "email_verified": "true", "sub": SUB,
    }
    if claims:
        identity.update(claims)
    body = {"plan": plan, "cycle": cycle}
    if extras:
        body.update(extras)
    return {
        "version": "2.0",
        "headers": {"origin": "https://" + MODULE.HOST, "content-type": "application/json"},
        "body": json.dumps(body), "isBase64Encoded": False,
        "requestContext": {
            "apiId": MODULE.API_ID, "domainName": MODULE.HOST,
            "routeKey": "POST /customer/subscription/checkout",
            "http": {"path": "/customer/subscription/checkout", "method": "POST"},
            "authorizer": {"jwt": {"claims": identity}},
        },
    }

def transport_ok(_url, _body, _headers):
    return {"id": "cs_live_SyntheticSession12345", "livemode": True,
            "mode": "subscription", "customer": CUSTOMER, "currency": "gbp",
            "url": "https://checkout.stripe.com/c/pay/cs_live_SyntheticSession12345"}

class Checkout(unittest.TestCase):
    def invoke(self, db, incoming, **kwargs):
        return MODULE.handle(incoming, db=db, now=NOW, enabled=True,
                             secret_key=lambda: "sk_live_synthetic_mock_123456789",
                             transport=transport_ok,
                             mfa_check=kwargs.pop("mfa_check", lambda _sub: True),
                             **kwargs)

    def test_off_is_inert_even_with_fully_approved_fixture(self):
        db = FakeDb()
        called = []
        reply = MODULE.handle(event(), db=db, now=NOW, enabled=False,
                              secret_key=lambda: called.append("secret"),
                              transport=lambda *_: called.append("stripe"))
        self.assertEqual(reply["statusCode"], 503)
        self.assertEqual(db.reads, 0)
        self.assertEqual(db.writes, [])
        self.assertEqual(called, [])

    def test_bad_principal_and_mfa_never_read_or_charge(self):
        for claims in [
            {"aud": "wrong-client"}, {"token_use": "access"},
            {"email_verified": "false"}, {"auth_time": str(NOW - 350)},
            {"sub": "user@fake"}, {"iss": "https://untrusted.example"},
            {"sub": "x"},
        ]:
            db = FakeDb()
            result = self.invoke(db, event(claims=claims))
            self.assertEqual(result["statusCode"], 403)
            self.assertEqual(db.reads, 0)
            self.assertEqual(db.writes, [])

    def test_cognito_requires_enforced_pool_mfa_not_optional_jwt_acr_or_amr(self):
        class Identity:
            def __init__(self, *, enabled=True, enrolled=True, verified=True, pool_on=True):
                self.enabled, self.enrolled = enabled, enrolled
                self.verified, self.pool_on = verified, pool_on
            def describe_user_pool(self, **kwargs):
                assert kwargs["UserPoolId"] == MODULE.POOL_ID
                return {"UserPool": {"MfaConfiguration": "ON" if self.pool_on else "OFF"}}
            def admin_get_user(self, **kwargs):
                assert kwargs["UserPoolId"] == MODULE.POOL_ID
                assert kwargs["Username"] == SUB
                return {
                    "UserStatus": "CONFIRMED", "Enabled": self.enabled,
                    "UserMFASettingList": ["SOFTWARE_TOKEN_MFA"] if self.enrolled else [],
                    "UserAttributes": [
                        {"Name": "sub", "Value": SUB},
                        {"Name": "email_verified", "Value": "true" if self.verified else "false"},
                    ],
                }
        self.assertTrue(MODULE.verified_required_cognito_mfa(Identity(), SUB))
        for changes in [{"enabled": False}, {"enrolled": False},
                        {"verified": False}, {"pool_on": False}]:
            self.assertFalse(MODULE.verified_required_cognito_mfa(Identity(**changes), SUB))
        # Missing ACR and AMR is normal Cognito, so normal verified ID JWT
        # only passes if independent Cognito pool/user MFA also passes.
        normal = event()
        self.assertNotIn("acr", normal["requestContext"]["authorizer"]["jwt"]["claims"])
        self.assertNotIn("amr", normal["requestContext"]["authorizer"]["jwt"]["claims"])
        db = FakeDb()
        no_mfa = self.invoke(db, normal, mfa_check=lambda _sub: False)
        self.assertEqual(no_mfa["statusCode"], 403)
        self.assertEqual(db.reads, 0)
        self.assertEqual(db.writes, [])
        for mode in [None, lambda _sub: False, lambda _sub: None]:
            result = MODULE.handle(
                normal, db=db, secret_key=lambda: "sk_live_mock_123456789",
                now=NOW, enabled=True, mfa_check=mode, transport=transport_ok,
            )
            self.assertEqual(result["statusCode"], 403)
            self.assertEqual(db.reads, 0)
        good = self.invoke(FakeDb(), normal)
        self.assertEqual(good["statusCode"], 200)

    def test_bad_plan_and_extra_fields_never_read(self):
        for incoming in [
            event("enterprise", "monthly"), event("starter", "weekly"),
            event(extras={"stripePriceId": PRICE}), event(extras={"tenantId": TENANT}),
            event(plan={"nested": "value"}), event(cycle=["monthly"])
        ]:
            db = FakeDb()
            result = self.invoke(db, incoming)
            self.assertEqual(result["statusCode"], 400)
            self.assertEqual(db.reads, 0)
            self.assertEqual(db.writes, [])

    def test_unknown_tenant_contract_billing_or_rights_never_charge(self):
        fields = [
            (("TENANT#" + TENANT, "META"), "ownershipVerified", False),
            (("TENANT#" + TENANT, "BILLING#" + SUB), "status", "active"),
            (("TENANT#" + TENANT, "CONTRACT#" + SUB), "accepted", False),
            (("TENANT#" + TENANT, "CONTRACT#" + SUB), "plan", "professional"),
            (("GOVERNANCE#PRODUCTION", "FEATURE#medicine-search"), "sourceRightsApproved", False),
            (("GOVERNANCE#PRODUCTION", "BILLING#CHECKOUT"), "taxCodeAndRegistrationsAccepted", False),
            (("GOVERNANCE#PRODUCTION", "BILLING#CHECKOUT"), "stripeWebhookAndLedgerAccepted", False),
            (("GOVERNANCE#PRODUCTION", "BILLING#CHECKOUT"), "stripeAccountId", "acct_elsewhere"),
        ]
        for key, field, value in fields:
            entries = fixture()
            entries[key][field] = value
            db = FakeDb(entries)
            result = self.invoke(db, event())
            self.assertEqual(result["statusCode"], 403, (field, value))
            self.assertEqual(db.writes, [], field)

    def test_success_reserves_private_intent_and_only_returns_checkout_url(self):
        db = FakeDb()
        result = self.invoke(db, event())
        self.assertEqual(result["statusCode"], 200)
        body = json.loads(result["body"])
        self.assertEqual(body["code"], "checkout_session_created_no_entitlement")
        self.assertTrue(body["checkoutUrl"].startswith("https://checkout.stripe.com/"))
        self.assertNotIn("subscription", body)
        self.assertNotIn("accessToken", body)
        self.assertEqual(len(db.writes), 2)
        operation, data = db.writes[0]
        self.assertEqual(operation, "reserve")
        txn = data["TransactItems"]
        self.assertEqual(len(txn), 10)
        self.assertEqual(txn[0]["Put"]["Item"]["stripeCustomerId"]["S"], CUSTOMER)
        self.assertEqual(txn[0]["Put"]["Item"]["stripePriceId"]["S"], PRICE)
        self.assertIn("attribute_not_exists(PK)", txn[0]["Put"]["ConditionExpression"])
        self.assertIn("expiresEpoch < :now", txn[1]["Put"]["ConditionExpression"])
        self.assertIn("stripeWebhookAndLedgerAccepted = :yes",
                      txn[-1]["ConditionCheck"]["ConditionExpression"])
        self.assertEqual(db.writes[1][0], "deliver")

    def test_stripe_bad_response_never_releases_checkout_url(self):
        db = FakeDb()
        result = MODULE.handle(event(), db=db, now=NOW, enabled=True,
            secret_key=lambda: "sk_live_synthetic_mock_123456789",
            transport=lambda *_: {"id": "cs_live_ABC12345", "livemode": False},
            mfa_check=lambda _sub: True)
        self.assertEqual(result["statusCode"], 503)
        self.assertEqual([x[0] for x in db.writes], ["reserve"])
        self.assertNotIn("checkoutUrl", json.loads(result["body"]))

    def test_stripe_request_binds_customer_price_and_safe_redirects(self):
        calls = []
        def capture(url, body, headers):
            calls.append((url, dict(__import__("urllib.parse", fromlist=["parse_qsl"]).parse_qsl(body.decode())), headers))
            return transport_ok(url, body, headers)
        result = MODULE.handle(event(), db=FakeDb(), now=NOW, enabled=True,
            secret_key=lambda: "sk_live_synthetic_mock_123456789",
            transport=capture, mfa_check=lambda _sub: True)
        self.assertEqual(result["statusCode"], 200)
        api, params, headers = calls[0]
        self.assertEqual(api, "https://api.stripe.com/v1/checkout/sessions")
        self.assertEqual(params["mode"], "subscription")
        self.assertEqual(params["customer"], CUSTOMER)
        self.assertEqual(params["line_items[0][price]"], PRICE)
        self.assertEqual(params["automatic_tax[enabled]"], "true")
        self.assertEqual(params["expires_at"], str(NOW + 3600))
        self.assertEqual(params["tax_id_collection[enabled]"], "true")
        self.assertEqual(params["success_url"], "https://" + MODULE.HOST + "/account/billing/return?session_id={CHECKOUT_SESSION_ID}")
        self.assertNotIn("tenantId", params)
        self.assertTrue(headers["Idempotency-Key"].startswith("npi-live-subscription-"))

if __name__ == "__main__":
    unittest.main()
