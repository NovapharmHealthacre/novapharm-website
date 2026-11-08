"""Offline security and pricing-contract tests for the staging B2B portal."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import types
import unittest

ROOT = Path(__file__).resolve().parents[2]
os.environ.update({
    "CUSTOMER_USER_POOL_ID": "synthetic-pool",
    "CUSTOMER_CLIENT_ID": "synthetic-client",
    "COGNITO_DOMAIN": "synthetic.auth.eu-north-1.amazoncognito.com",
    "BASE_URL": "https://portal.example.invalid",
    "PRICES_PARAMETER": "/synthetic",
    "DDB_TABLE": "synthetic",
})

class DummyTable:
    def __init__(self):
        self.items = []
    def put_item(self, **kw):
        self.items.append(kw["Item"])
        return {}
    def get_item(self, **kw):
        return {}
    def delete_item(self, **kw):
        return {}
    def query(self, **kw):
        return {"Items": []}

class DummyCognito:
    groups = []
    enabled = True
    user_status = "CONFIRMED"
    verified_email = True
    def admin_get_user(self, **kw):
        return {"Enabled": self.enabled, "UserStatus": self.user_status,
                "UserAttributes": [{"Name": "email_verified", "Value": "true" if self.verified_email else "false"}]}
    def admin_list_groups_for_user(self, **kw):
        return {"Groups": [{"GroupName": x} for x in self.groups]}

class DummySSM:
    def get_parameter(self, **kw):
        payload = {
            "schema": "novapharm.nutraxin.provisional_b2b_prices.v1",
            "status": "owner_approved_provisional_for_authenticated_quotation_only",
            "binding_checkout_enabled": False,
            "lines": [
                {"sku": sku, "qty24_price_pence": 1000, "qty48_price_pence": 900}
                for sku in PORTAL.PRODUCTS
            ],
        }
        return {"Parameter": {"Value": json.dumps(payload)}}

DDB = DummyTable()
COGNITO = DummyCognito()
BOTO3 = types.ModuleType("boto3")
BOTO3.resource = lambda *args, **kw: types.SimpleNamespace(Table=lambda name: DDB)
BOTO3.client = lambda name, **kw: COGNITO if name == "cognito-idp" else DummySSM()
KEY_MOD = types.ModuleType("boto3.dynamodb.conditions")
KEY_MOD.Key = lambda name: types.SimpleNamespace(eq=lambda value: ("eq", name, value))
sys.modules["boto3"] = BOTO3
sys.modules["boto3.dynamodb"] = types.ModuleType("boto3.dynamodb")
sys.modules["boto3.dynamodb.conditions"] = KEY_MOD
sys.modules["botocore"] = types.ModuleType("botocore")
ERROR_MOD = types.ModuleType("botocore.exceptions")
ERROR_MOD.ClientError = type("ClientError", (Exception,), {})
sys.modules["botocore.exceptions"] = ERROR_MOD

spec = importlib.util.spec_from_file_location("nutraxin_staging_portal", ROOT / "apps/nutraxin-customer-api/index.py")
PORTAL = importlib.util.module_from_spec(spec)
spec.loader.exec_module(PORTAL)

class PortalSecurityTests(unittest.TestCase):
    def setUp(self):
        DDB.items.clear()
        COGNITO.groups = []
        COGNITO.enabled = True
        COGNITO.user_status = "CONFIRMED"
        COGNITO.verified_email = True

    def event(self, path, method="GET", body=None, origin="https://portal.example.invalid"):
        e = {"version": "2.0", "rawPath": path, "requestContext": {"http": {"method": method}},
             "headers": {"origin": origin}, "cookies": []}
        if body is not None:
            e["body"] = json.dumps(body)
        return e

    def test_19_product_catalogue_has_no_public_wholesale_prices(self):
        self.assertEqual(len(PORTAL.PRODUCTS), 19)
        self.assertNotIn("qty24_price_pence", PORTAL.PAGE)
        self.assertNotIn("supplier_purchase", PORTAL.PAGE)
        self.assertNotIn("supplier_purchase", PORTAL.APP)
        self.assertIn("not a binding order", PORTAL.PAGE.lower())
        self.assertIn("https://novapharmhealthcare.com/account-application/", PORTAL.PAGE)
        self.assertNotIn("contact/?enquiry=Pharmacy", PORTAL.PAGE)

    def test_20_percent_uk_vat_is_illustrative_and_never_collected(self):
        self.assertIn('id="indicative-totals"', PORTAL.PAGE)
        self.assertIn("indicativeVatRateBps=2000", PORTAL.APP)
        self.assertIn("estimatedVatPence(netPence)", PORTAL.APP)
        self.assertIn("netPence+estimatedVat", PORTAL.APP)
        self.assertIn("not a VAT invoice", PORTAL.APP)
        self.assertIn("Excludes shipping", PORTAL.APP)
        self.assertNotIn("api.stripe.com", PORTAL.APP)
        self.assertNotIn("rk_live_", PORTAL.APP)

    def test_customer_dashboard_shows_only_authenticated_request_history(self):
        self.assertIn('id="request-history"', PORTAL.PAGE)
        self.assertIn('id="history-status"', PORTAL.PAGE)
        self.assertIn('read("/api/order-requests")', PORTAL.APP)
        self.assertIn('host.replaceChildren()', PORTAL.APP)
        self.assertIn('void renderHistory()', PORTAL.APP)
        self.assertNotIn("innerHTML", PORTAL.APP)

    def test_oauth_scope_allows_cognito_get_user_after_verified_email(self):
        from urllib.parse import urlsplit, parse_qs
        response = PORTAL.login(self.event("/login"))
        self.assertEqual(response["statusCode"], 302)
        params = parse_qs(urlsplit(response["headers"]["location"]).query)
        self.assertEqual(params["response_type"], ["code"])
        self.assertEqual(params["code_challenge_method"], ["S256"])
        scopes = params["scope"][0].split()
        self.assertEqual(set(scopes), {"openid", "email", "profile", "aws.cognito.signin.user.admin"})

    def test_retail_bag_and_catalogue_do_not_enable_sale(self):
        response=PORTAL.handler(self.event("/api/retail/catalogue"), None)
        self.assertEqual(response["statusCode"], 200)
        payload=json.loads(response["body"])
        self.assertFalse(payload["checkout_enabled"])
        self.assertFalse(payload["payment_collection_enabled"])
        self.assertEqual(set(p["sku"] for p in payload["products"]), set(PORTAL.PRODUCTS))
        self.assertEqual(set(p["slug"] for p in payload["products"]), set(PORTAL.PUBLIC_SLUGS.values()))
        self.assertTrue(all(p["retail_price_pence"] is None for p in payload["products"]))
        self.assertTrue(all(p["sale_status"]=="not_offered" for p in payload["products"]))
        self.assertIn("A saved bag is not an order.", PORTAL.PAGE)
        self.assertIn("retailStorageKey", PORTAL.APP)
        self.assertIn("Add to bag", PORTAL.APP)
        self.assertNotIn("qty48_price_pence", response["body"])
        self.assertEqual(PORTAL.handler(self.event("/api/catalogue"), None)["statusCode"], 401)

    def test_personal_account_does_not_require_trade_approval(self):
        self.assertIn("Your account is ready.", PORTAL.PAGE)
        self.assertIn("Personal shoppers do not need business approval", PORTAL.PAGE)
        self.assertNotIn("Business verification required.", PORTAL.PAGE)
        self.assertIn("Apply for business access", PORTAL.PAGE)
        response = PORTAL.handler(self.event("/api/retail/catalogue"), None)
        self.assertEqual(response["statusCode"], 200)
        payload = json.loads(response["body"])
        self.assertFalse(payload["public_retail_prices_approved"])
        self.assertFalse(payload["checkout_enabled"])
        self.assertEqual(len(payload["products"]), 19)
        self.assertTrue(all(p["retail_price_pence"] is None for p in payload["products"]))
        self.assertTrue(all(p["sale_status"] == "not_offered" for p in payload["products"]))
        self.assertNotIn("qty48_price_pence", response["body"])
        self.assertEqual(PORTAL.handler(self.event("/api/catalogue"), None)["statusCode"], 401)

    def test_public_prices_and_order_requests_require_login(self):
        for route in ("/api/catalogue", "/api/order-requests"):
            result = PORTAL.handler(self.event(route), None)
            self.assertEqual(result["statusCode"], 401)

    def test_group_enforcement(self):
        self.assertFalse(PORTAL.approved("test-cognito-user"))
        COGNITO.groups = [PORTAL.APPROVED_GROUP]
        self.assertTrue(PORTAL.approved("test-cognito-user"))

    def test_disabled_unconfirmed_or_unverified_customer_never_approves(self):
        COGNITO.groups = [PORTAL.APPROVED_GROUP]
        self.assertTrue(PORTAL.approved("synthetic-user"))
        COGNITO.enabled = False
        self.assertFalse(PORTAL.approved("synthetic-user"))
        COGNITO.enabled = True
        COGNITO.user_status = "RESET_REQUIRED"
        self.assertFalse(PORTAL.approved("synthetic-user"))
        COGNITO.user_status = "CONFIRMED"
        COGNITO.verified_email = False
        self.assertFalse(PORTAL.approved("synthetic-user"))
        COGNITO.verified_email = True
        COGNITO.groups = []
        self.assertFalse(PORTAL.approved("synthetic-user"))

    def test_server_reprices_tiers_and_never_accepts_binding_order(self):
        payload = {"request_id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                   "lines": [
                       {"sku": "NUT-UK-VD3-T120", "quantity": 48},
                       {"sku": "NUT-UK-MGCX-T60", "quantity": 48},
                   ]}
        answer = PORTAL.submit(self.event("/api/order-requests", "POST", payload), {"sub": "test-sub"})
        self.assertEqual(answer["statusCode"], 201)
        body = json.loads(answer["body"])
        self.assertEqual(body["net_total_pence"], 48*900 + 48*900)
        self.assertFalse(body["financially_binding"])
        self.assertFalse(body["inventory_reserved"])
        self.assertFalse(body["vat_invoice_created"])
        self.assertEqual(len(DDB.items), 1)

    def test_minimum_one_unit_and_48_reference_price_for_every_quantity(self):
        # The owner explicitly approves the existing 48-unit-tier unit price
        # for every requested quantity, including a single unit.
        self.assertIn("Minimum 1 unit per selected product", PORTAL.PAGE)
        self.assertIn("48-unit reference price applies to all quantities", PORTAL.APP)
        self.assertIn('input.min="0"', PORTAL.APP)  # zero deselects a SKU
        self.assertIn('input.max="10000"', PORTAL.APP)
        self.assertNotIn("Quotation required", PORTAL.APP)
        for quantity in (1, 2, 23, 24, 47, 48, 10000):
            with self.subTest(quantity=quantity):
                DDB.items.clear()
                payload = {"request_id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                           "lines": [{"sku": "NUT-UK-VD3-T120", "quantity": quantity}]}
                response = PORTAL.submit(
                    self.event("/api/order-requests", "POST", payload), {"sub": "test-sub"})
                self.assertEqual(response["statusCode"], 201)
                body = json.loads(response["body"])
                self.assertEqual(body["net_total_pence"], quantity*900)
                self.assertEqual(body["indicative_vat_pence"],
                                 PORTAL.illustrative_uk_vat_pence(quantity*900))
                self.assertEqual(DDB.items[0]["lines"][0]["unit_net_pence"], 900)
                self.assertEqual(DDB.items[0]["lines"][0]["tier"], 48)
                self.assertEqual(
                    DDB.items[0]["lines"][0]["price_basis"],
                    "48_unit_reference_applied_to_all_quantities_1_to_10000")
                self.assertFalse(body["financially_binding"])
                self.assertEqual(body["vat_charged_pence"], 0)

    def test_illustrative_20pct_vat_is_server_reconciled_and_not_charged(self):
        self.assertEqual(PORTAL.illustrative_uk_vat_pence(0), 0)
        self.assertEqual(PORTAL.illustrative_uk_vat_pence(101), 20)
        self.assertEqual(PORTAL.illustrative_uk_vat_pence(103), 21)
        self.assertEqual(PORTAL.illustrative_uk_vat_pence(43200), 8640)
        self.assertRaises(ValueError, PORTAL.illustrative_uk_vat_pence, -1)
        payload = {"request_id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                   "lines": [{"sku": "NUT-UK-VD3-T120", "quantity": 48}]}
        response = PORTAL.submit(self.event("/api/order-requests", "POST", payload),
                                 {"sub": "test-sub"})
        self.assertEqual(response["statusCode"], 201)
        body = json.loads(response["body"])
        self.assertEqual(body["net_total_pence"], 43200)
        self.assertEqual(body["illustrative_uk_vat_rate_bps"], 2000)
        self.assertEqual(body["indicative_vat_pence"], 8640)
        self.assertEqual(body["indicative_gross_total_pence"], 51840)
        self.assertEqual(body["vat_charged_pence"], 0)
        self.assertTrue(body["shipping_excluded"])
        self.assertFalse(body["vat_invoice_created"])
        self.assertFalse(body["financially_binding"])
        self.assertFalse(body["inventory_reserved"])
        self.assertEqual(DDB.items[0]["indicative_vat_pence"], 8640)
        self.assertEqual(DDB.items[0]["vat_charged_pence"], 0)

    def test_large_10000_unit_b2b_request_is_nonbinding(self):
        payload = {"request_id": "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
                   "lines": [{"sku": "NUT-UK-VD3-T120", "quantity": 10000}]}
        response = PORTAL.submit(self.event("/api/order-requests", "POST", payload), {"sub": "test-sub"})
        self.assertEqual(response["statusCode"], 201)
        body = json.loads(response["body"])
        self.assertEqual(body["net_total_pence"], 10000*900)
        self.assertFalse(body["financially_binding"])
        self.assertFalse(body["inventory_reserved"])

    def test_bad_sku_quantity_duplication_and_csrf_fail_closed(self):
        bad_lines = [
            [{"sku": "FAKE-SKU", "quantity": 24}],
            [{"sku": "NUT-UK-VD3-T120", "quantity": 0}],
            [{"sku": "NUT-UK-VD3-T120", "quantity": 10001}],
            [{"sku": "NUT-UK-VD3-T120", "quantity": 24.5}],
            [{"sku": "NUT-UK-VD3-T120", "quantity": True}],
            [{"sku": "NUT-UK-VD3-T120", "quantity": 48},
             {"sku": "NUT-UK-VD3-T120", "quantity": 48}],
        ]
        for lines in bad_lines:
            with self.subTest(lines=lines):
                body = {"request_id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", "lines": lines}
                self.assertEqual(
                    PORTAL.submit(self.event("/api/order-requests", "POST", body), {"sub": "test-sub"})["statusCode"],
                    400,
                )
        valid = {"request_id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                 "lines": [{"sku": "NUT-UK-VD3-T120", "quantity": 48}]}
        self.assertEqual(PORTAL.submit(self.event("/api/order-requests", "POST", valid, "https://evil.invalid"), {"sub": "test-sub"})["statusCode"], 403)
        self.assertEqual(DDB.items, [])

    def test_idempotent_receipt_stays_stable_and_staff_notified_once(self):
        from decimal import Decimal

        class DuplicateAwareTable:
            def __init__(self):
                self.items = {}

            def put_item(self, **kwargs):
                item = kwargs["Item"]
                key = (item["pk"], item["sk"])
                if key in self.items:
                    error = PORTAL.ClientError("duplicate")
                    error.response = {"Error": {"Code": "ConditionalCheckFailedException"}}
                    raise error
                self.items[key] = item

            def get_item(self, **kwargs):
                key = (kwargs["Key"]["pk"], kwargs["Key"]["sk"])
                saved = dict(self.items[key])
                if saved.get("net_total_pence") is not None:
                    saved["net_total_pence"] = Decimal(saved["net_total_pence"])
                return {"Item": saved}

        class AlertRecorder:
            def __init__(self):
                self.sent = []
            def publish(self, **kwargs):
                self.sent.append(kwargs)
                return {"MessageId": "test-msg"}

        table = DuplicateAwareTable()
        alert = AlertRecorder()
        previous_table, previous_sns, previous_topic = PORTAL.TABLE, PORTAL.SNS, PORTAL.ALERT_TOPIC
        PORTAL.TABLE = table
        PORTAL.SNS = alert
        PORTAL.ALERT_TOPIC = "arn:aws:sns:eu-north-1:example:test"
        try:
            original = {"request_id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                        "lines": [{"sku": "NUT-UK-VD3-T120", "quantity": 48}]}
            first = PORTAL.submit(self.event("/api/order-requests", "POST", original), {"sub": "test-sub"})
            replay = PORTAL.submit(self.event("/api/order-requests", "POST", original), {"sub": "test-sub"})
            self.assertEqual(first["statusCode"], 201)
            self.assertEqual(replay["statusCode"], 201)
            first_body, replay_body = json.loads(first["body"]), json.loads(replay["body"])
            self.assertEqual(first_body["receipt_id"], replay_body["receipt_id"])
            self.assertEqual(replay_body["net_total_pence"], 43200)
            self.assertEqual(len(table.items), 1)
            self.assertEqual(len(alert.sent), 1, "A duplicate submission must not re-alert staff")
            self.assertNotIn("net_total_pence", alert.sent[0]["Message"])
            self.assertNotIn("email", alert.sent[0]["Message"])
            self.assertEqual(json.loads(alert.sent[0]["Message"])["customer_sub"], "test-sub")
            changed = {"request_id": original["request_id"],
                       "lines": [{"sku": "NUT-UK-VD3-T120", "quantity": 96}]}
            conflict = PORTAL.submit(self.event("/api/order-requests", "POST", changed), {"sub": "test-sub"})
            self.assertEqual(conflict["statusCode"], 409)
            self.assertEqual(len(alert.sent), 1)
        finally:
            PORTAL.TABLE, PORTAL.SNS, PORTAL.ALERT_TOPIC = previous_table, previous_sns, previous_topic

    def test_production_checkout_stays_customer_approved_and_server_only(self):
        import io

        self.assertIn("Pay securely", PORTAL.APP)
        self.assertIn("APPROVED_FOR_PAYMENT", PORTAL.APP)
        self.assertIn("/checkout", PORTAL.APP)
        self.assertNotIn("rk_live_", PORTAL.APP)
        self.assertIn("PRODUCTION_CHECKOUT_FUNCTION", PORTAL.__dict__)
        template = json.loads((ROOT / "infra/aws/nutraxin-customer-staging-stack.json").read_text())
        env = template["Resources"]["AppFunction"]["Properties"]["Environment"]["Variables"]
        self.assertEqual(env["PRODUCTION_CHECKOUT_FUNCTION"],
                         "novapharm-production-nutraxin-approved-checkout")
        role = template["Resources"]["AppRole"]["Properties"]["Policies"][0]["PolicyDocument"]["Statement"]
        scope = next(x for x in role if "lambda:InvokeFunction" in x["Action"])
        self.assertIn("novapharm-production-nutraxin-approved-checkout",
                      json.dumps(scope["Resource"]))
        self.assertNotIn("secretsmanager:GetSecretValue",
                         json.dumps(role))

        class ApprovedQuoteTable:
            def __init__(self, status):
                self.status = status
            def get_item(self, **kw):
                return {"Item": {"receipt_id":"NUT-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                                 "status":self.status}}
        class FakeWorker:
            def __init__(self):
                self.calls = []
            def invoke(self, **kw):
                self.calls.append(kw)
                return {"Payload":io.BytesIO(json.dumps({"statusCode":200,
                    "body":json.dumps({"checkoutUrl":"https://checkout.stripe.com/c/pay_example"})}).encode())}

        receipt = "NUT-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
        event = self.event("/api/order-requests/" + receipt + "/checkout", "POST")
        old_table,old_worker,old_name = PORTAL.TABLE,PORTAL.CHECKOUT_LAMBDA,PORTAL.PRODUCTION_CHECKOUT_FUNCTION
        worker = FakeWorker()
        PORTAL.CHECKOUT_LAMBDA = worker
        PORTAL.PRODUCTION_CHECKOUT_FUNCTION = "synthetic"
        try:
            PORTAL.TABLE = ApprovedQuoteTable("PENDING_MANUAL_CONFIRMATION")
            blocked = PORTAL.start_approved_payment(event,{"sub":"synthetic_customer"},receipt)
            self.assertEqual(blocked["statusCode"],409)
            self.assertEqual(len(worker.calls),0)
            PORTAL.TABLE = ApprovedQuoteTable("APPROVED_FOR_PAYMENT")
            bad = self.event("/api/order-requests/" + receipt + "/checkout", "POST",
                             origin="https://malicious.invalid")
            self.assertEqual(PORTAL.start_approved_payment(bad,{"sub":"synthetic_customer"},receipt)["statusCode"],403)
            self.assertEqual(len(worker.calls),0)
            good = PORTAL.start_approved_payment(event,{"sub":"synthetic_customer"},receipt)
            self.assertEqual(good["statusCode"],200)
            self.assertEqual(len(worker.calls),1)
            source = json.loads(worker.calls[0]["Payload"].decode())
            self.assertEqual(set(source),{"action","orderId","subject"})
            self.assertNotIn("price", source)
            self.assertNotIn("vat", source)
        finally:
            PORTAL.TABLE,PORTAL.CHECKOUT_LAMBDA,PORTAL.PRODUCTION_CHECKOUT_FUNCTION = old_table,old_worker,old_name

    def test_iac_scope_and_separate_private_price_store(self):
        template = json.loads((ROOT / "infra/aws/nutraxin-customer-staging-stack.json").read_text())
        role = template["Resources"]["AppRole"]["Properties"]
        statements = role["Policies"][0]["PolicyDocument"]["Statement"]
        sensitive = [s for s in statements if any(x in json.dumps(s["Action"]) for x in ("ssm:GetParameter", "dynamodb:PutItem", "cognito-idp:AdminListGroupsForUser"))]
        self.assertEqual(len(sensitive), 3)
        cognito_statement = next(s for s in statements if "cognito-idp:AdminListGroupsForUser" in s["Action"])
        self.assertIn("cognito-idp:AdminGetUser", cognito_statement["Action"])
        for statement in sensitive:
            self.assertNotEqual(statement["Resource"], "*")
        self.assertEqual(template["Resources"]["AppFunction"]["Properties"]["Code"]["ZipFile"].strip(),
                         (ROOT / "apps/nutraxin-customer-api/index.py").read_text().strip())
        self.assertIn("DISABLED", template["Outputs"]["CommercialCheckoutStatus"]["Value"])

if __name__ == "__main__":
    unittest.main()
