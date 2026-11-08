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
                       {"sku": "NUT-UK-VD3-T120", "quantity": 24},
                       {"sku": "NUT-UK-MGCX-T60", "quantity": 48},
                   ]}
        answer = PORTAL.submit(self.event("/api/order-requests", "POST", payload), {"sub": "test-sub"})
        self.assertEqual(answer["statusCode"], 201)
        body = json.loads(answer["body"])
        self.assertEqual(body["net_total_pence"], 24*1000 + 48*900)
        self.assertFalse(body["financially_binding"])
        self.assertFalse(body["inventory_reserved"])
        self.assertFalse(body["vat_invoice_created"])
        self.assertEqual(len(DDB.items), 1)

    def test_less_than_24_units_has_no_approved_net_total(self):
        payload = {"request_id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                   "lines": [{"sku": "NUT-UK-VD3-T120", "quantity": 1}]}
        body = json.loads(PORTAL.submit(self.event("/api/order-requests", "POST", payload), {"sub": "test-sub"})["body"])
        self.assertIsNone(body["net_total_pence"])

    def test_bad_sku_quantity_duplication_and_csrf_fail_closed(self):
        bad_lines = [
            [{"sku": "FAKE-SKU", "quantity": 24}],
            [{"sku": "NUT-UK-VD3-T120", "quantity": 0}],
            [{"sku": "NUT-UK-VD3-T120", "quantity": 1000}],
            [{"sku": "NUT-UK-VD3-T120", "quantity": 24.5}],
            [{"sku": "NUT-UK-VD3-T120", "quantity": True}],
            [{"sku": "NUT-UK-VD3-T120", "quantity": 24},
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
                 "lines": [{"sku": "NUT-UK-VD3-T120", "quantity": 24}]}
        self.assertEqual(PORTAL.submit(self.event("/api/order-requests", "POST", valid, "https://evil.invalid"), {"sub": "test-sub"})["statusCode"], 403)
        self.assertEqual(DDB.items, [])

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
