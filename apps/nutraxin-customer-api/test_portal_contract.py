"""Offline security and pricing-contract tests for the staging B2B portal."""
import base64
import importlib.util
import json
import os
import re
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
    authorized=False
    unit_price_pence=900
    def get_parameter(self, **kw):
        payload = {
            "schema": "novapharm.nutraxin.provisional_b2b_prices.v1",
            "status": "owner_approved_provisional_for_authenticated_quotation_only",
            "binding_checkout_enabled": False,
            "retail_sales_authorised": self.authorized,
            "vat_registration_verified": self.authorized,
            "food_business_registration_verified": self.authorized,
            "consumer_terms_verified": self.authorized,
            "manufacturer_fulfilment_commitment_verified": self.authorized,
            "uk_dispatch_service_verified": self.authorized,
            "model_assumptions": {"uk_delivery_charge_pence": 0, "uk_delivery_cost_borne_by_seller": True},
            "lines": [
                {"sku": sku, "qty24_price_pence": 1000, "qty48_price_pence": self.unit_price_pence}
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
        PORTAL.SSM.authorized = False
        PORTAL.SSM.unit_price_pence = 900

    def event(self, path, method="GET", body=None, origin="https://portal.example.invalid"):
        e = {"version": "2.0", "rawPath": path, "requestContext": {"http": {"method": method}},
             "headers": {"origin": origin}, "cookies": []}
        if body is not None:
            e["body"] = json.dumps(body)
        return e

    def test_unified_customer_routes_are_server_authenticated(self):
        self.assertEqual(len(PORTAL.CUSTOMER_WORKSPACE_MODULES),18)
        self.assertEqual(len(PORTAL.CUSTOMER_WORKSPACE_ROUTES),18)
        for _,route,_ in PORTAL.CUSTOMER_WORKSPACE_MODULES:
            response=PORTAL.handler(self.event(route),None)
            self.assertEqual(response["statusCode"],302,route)
            self.assertEqual(response["headers"]["location"],"https://portal.example.invalid/")
            self.assertNotIn("customer@example",response["body"])
        for route in ("/employee/dashboard/","/portal/executive-platform/","/admin/dashboard/"):
            response=PORTAL.handler(self.event(route),None)
            self.assertEqual(response["statusCode"],403,route)
            self.assertEqual(json.loads(response["body"])["error"],"workforce_or_admin_identity_required")

    def test_active_personal_identity_gets_18_module_navigation_without_trade_elevation(self):
        previous=PORTAL.session
        PORTAL.session=lambda event: {
            "username":"synthetic-personal","sub":"synthetic-personal-sub",
            "email":"customer+test@example.invalid","expires_at":PORTAL.now()+3600}
        try:
            for label,route,_ in PORTAL.CUSTOMER_WORKSPACE_MODULES:
                result=PORTAL.handler(self.event(route),None)
                self.assertEqual(result["statusCode"],200,(label,route))
                self.assertIn("no-store",result["headers"]["cache-control"])
                self.assertIn('name="robots" content="noindex,nofollow"',result["body"])
                self.assertIn(label,result["body"])
                self.assertNotIn("Stripe Checkout",result["body"])
            dashboard=PORTAL.handler(self.event("/portal/dashboard/"),None)
            self.assertEqual(dashboard["body"].count('class="tile"'),0)
            self.assertIn('class="editorial-customer"',dashboard["body"])
            self.assertIn('class="editorial-hero"',dashboard["body"])
            self.assertIn("Everything you need.",dashboard["body"])
            self.assertIn("The rest, within reach.",dashboard["body"])
            self.assertIn('class="editorial-topnav"',dashboard["body"])
            self.assertIn("novapharm-healthcare-logo.svg",dashboard["body"])
            for image in ("vitamin-d3-120-tablets-480.webp",
                          "vitamin-c-1000mg-30-tablets-480.webp",
                          "magnesium-complex-60-tablets-480.webp"):
                self.assertIn("https://novapharmhealthcare.com/assets/media/products/nutraxin/"+image,
                              dashboard["body"])
            for label,href,_ in PORTAL.CUSTOMER_WORKSPACE_MODULES:
                self.assertIn('href="'+href+'"',dashboard["body"],label)
            self.assertNotIn('data:image/',dashboard["body"])
            self.assertNotIn('<script',dashboard["body"])
            self.assertIn('name="signup_csrf"',dashboard["body"])
            self.assertIn("Product images are illustrative catalogue references",dashboard["body"])
            self.assertIn("frame-ancestors 'none'",dashboard["headers"]["content-security-policy"])
            self.assertIn("customer+test@example.invalid",dashboard["body"])
            products=PORTAL.handler(self.event("/portal/products/"),None)["body"]
            self.assertIn("Nutraxin",products)
            self.assertIn("ESCO Anand",products)
            self.assertIn("not approved saleable variants",products)
            history=PORTAL.handler(self.event("/portal/orders/"),None)["body"]
            self.assertIn("separately approved trade account",history)
            self.assertNotIn("APPROVED_FOR_PAYMENT",history)
        finally:
            PORTAL.session=previous

    def test_revoked_or_unverified_customer_cannot_open_private_modules(self):
        previous=PORTAL.session
        PORTAL.session=lambda event: {
            "username":"test-user","sub":"test-user-sub","email":"test@example.invalid"}
        try:
            for field,invalid in (
                ("enabled",False),
                ("user_status","UNCONFIRMED"),
                ("verified_email",False)):
                old=getattr(COGNITO,field)
                setattr(COGNITO,field,invalid)
                try:
                    response=PORTAL.handler(self.event("/portal/account/"),None)
                    self.assertEqual(response["statusCode"],403,field)
                    self.assertNotIn("test@example.invalid",response["body"])
                finally:setattr(COGNITO,field,old)
        finally:
            PORTAL.session=previous

    def test_customer_account_escapes_user_content_and_never_exposes_raw_html(self):
        previous=PORTAL.session
        PORTAL.session=lambda event: {
            "username":"test-user","sub":"test-sub",
            "email":'<img src=x onerror=alert("exfiltrate")>'}
        try:
            body=PORTAL.handler(self.event("/portal/account/"),None)["body"]
            self.assertNotIn('<img src=x',body)
            self.assertIn("&lt;img src=x",body)
            self.assertNotIn("window.location",body)
        finally:
            PORTAL.session=previous

    def test_business_request_history_is_scoped_by_signed_in_customer_sub(self):
        previous_session=PORTAL.session
        previous_table=PORTAL.TABLE
        COGNITO.groups=[PORTAL.APPROVED_GROUP]
        class AuditedTable:
            def query(self,**kwargs):
                self_args=kwargs.get("KeyConditionExpression")
                if self_args!=("eq","pk","USER#sub-owner"):
                    raise AssertionError("Wrong tenant query scope")
                return {"Items":[{"pk":"USER#sub-owner","sk":"RQ#111",
                    "receipt_id":"NUT-111","status":"PENDING_MANUAL_CONFIRMATION"}]}
        PORTAL.TABLE=AuditedTable()
        PORTAL.session=lambda event: {
            "username":"approved","sub":"sub-owner","email":"approved@example.invalid"}
        try:
            page=PORTAL.handler(self.event("/portal/orders/"),None)
            self.assertEqual(page["statusCode"],200)
            self.assertIn("NUT-111",page["body"])
            self.assertIn("Not financially binding",page["body"])
            self.assertNotIn("Pay securely",page["body"])
        finally:
            PORTAL.session=previous_session
            PORTAL.TABLE=previous_table

    def test_opaque_origin_logout_uses_fresh_host_only_csrf_token(self):
        previous=PORTAL.session
        PORTAL.session=lambda event: {"username":"synthetic","sub":"synthetic-sub",
            "email":"synthetic@example.invalid","expires_at":PORTAL.now()+3600}
        try:
            landing=PORTAL.handler(self.event("/portal/dashboard/"),None)
            token=re.search(r'name="signup_csrf" value="([A-Za-z0-9_-]{43})"',landing["body"])
            self.assertIsNotNone(token)
            proof=token.group(1)
            self.assertIn("Secure",landing["cookies"][0])
            event=self.event("/logout","POST",origin="null")
            event["cookies"]=["__Host-np_signup_csrf="+proof]
            event["headers"]["sec-fetch-site"]="same-origin"
            event["body"]="signup_csrf="+proof
            result=PORTAL.handler(event,None)
            self.assertEqual(result["statusCode"],302)
            self.assertIn("/logout?",result["headers"]["location"])
            event["body"]="signup_csrf=invalid"
            self.assertEqual(PORTAL.handler(event,None)["statusCode"],403)
            event["body"]="signup_csrf="+proof
            event["headers"]["origin"]="https://evil.example.invalid"
            self.assertEqual(PORTAL.handler(event,None)["statusCode"],403)
            event["headers"]["origin"]="null"
            event["headers"]["sec-fetch-site"]="cross-site"
            self.assertEqual(PORTAL.handler(event,None)["statusCode"],403)
        finally:
            PORTAL.session=previous

    def test_safari_base64_encoded_logout_is_accepted_only_with_host_csrf(self):
        # Match AWS HTTP API v2 form delivery, not only the synthetic plain
        # form used in the original logout regression test.
        token="A"*43
        form="signup_csrf="+token
        encoded=base64.b64encode(form.encode("utf-8")).decode("ascii")
        def request(origin="null", body=encoded, cookie=True, source="same-origin"):
            event=self.event("/logout","POST",origin=origin)
            event["headers"]["host"]="portal.novapharmhealthcare.com"
            event["headers"]["content-type"]="application/x-www-form-urlencoded"
            event["headers"]["sec-fetch-site"]=source
            event["isBase64Encoded"]=True
            event["body"]=body
            event["cookies"]=["__Host-np_signup_csrf="+token] if cookie else []
            return PORTAL.handler(event,None)
        for origin in ("null",""):
            successful=request(origin)
            self.assertEqual(successful["statusCode"],302)
            self.assertIn("/logout?",successful["headers"]["location"])
            self.assertTrue(any(c.startswith("__Host-np_session=;") for c in successful.get("cookies",[])))
        for origin in ("https://attacker.example.invalid",
                       "https://portal.novapharmhealthcare.com.attacker.invalid"):
            denied=request(origin)
            self.assertEqual(denied["statusCode"],403)
            self.assertEqual(json.loads(denied["body"])["error"],"invalid_origin")
        for change in (
            {"cookie":False}, {"body":"not-base64!!!"},
            {"body":base64.b64encode(b"\xff\xff").decode("ascii")},
            {"body":base64.b64encode(b"signup_csrf=wrong").decode("ascii")},
            {"body":"A"*600}, {"source":"cross-site"},
        ):
            denied=request(**change)
            self.assertEqual(denied["statusCode"],403,change)
        # A genuine HTTPS same-origin form remains compatible with existing
        # customer sessions, including API Gateway's encoded transport.
        allowed=request("https://portal.novapharmhealthcare.com")
        self.assertEqual(allowed["statusCode"],302)

    def test_root_signin_preserved_and_legacy_nutraxin_shop_not_portal_home(self):
        page=PORTAL.handler(self.event("/"),None)
        self.assertEqual(page["statusCode"],200)
        self.assertIn('<body class="unified-root">',page["body"])
        self.assertIn(".unified-root .retail-shop{display:none!important}",page["body"])
        self.assertIn('name="signup_csrf"',page["body"])
        self.assertIn("customer account, authorised products",page["body"])
        self.assertIn('window.location.replace("/portal/dashboard/")',PORTAL.APP)
        legacy=PORTAL.handler(self.event("/products/nutraxin/"),None)
        self.assertEqual(legacy["statusCode"],200)
        self.assertNotIn('<body class="unified-root">',legacy["body"])
        self.assertIn('id="retail-grid"',legacy["body"])
        self.assertIn('name="signup_csrf"',legacy["body"])

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
        self.assertIn("Indicative UK delivery charge: £0", PORTAL.APP)
        self.assertNotIn("api.stripe.com", PORTAL.APP)
        self.assertNotIn("rk_live_", PORTAL.APP)

    def test_customer_dashboard_shows_only_authenticated_request_history(self):
        self.assertIn('id="request-history"', PORTAL.PAGE)
        self.assertIn('id="history-status"', PORTAL.PAGE)
        self.assertIn('read("/api/order-requests")', PORTAL.APP)
        self.assertIn('host.replaceChildren()', PORTAL.APP)
        self.assertIn('void renderHistory()', PORTAL.APP)
        self.assertNotIn("innerHTML", PORTAL.APP)

    def test_approved_official_logo_and_earth_horizon(self):
        self.assertIn("novapharm-healthcare-logo.svg", PORTAL.PAGE)
        self.assertNotIn('<div class="account-navigation">', PORTAL.PAGE)
        self.assertIn("url('/assets/earth-horizon-approved.jpg')", PORTAL.PAGE)
        image=PORTAL.handler(self.event("/assets/earth-horizon-approved.jpg"),None)
        self.assertEqual(image["statusCode"],200)
        self.assertTrue(image["isBase64Encoded"])
        self.assertEqual(image["headers"]["content-type"],"image/jpeg")
        decoded=base64.b64decode(image["body"])
        self.assertTrue(decoded[:2]==bytes([255,216]))
        self.assertGreater(len(decoded),50000)

    def test_live_portal_origin_matches_deployed_cloudformation_template(self):
        template = json.loads((ROOT / "infra/aws/nutraxin-customer-staging-stack.json").read_text())
        values = template["Resources"]["AppFunction"]["Properties"]["Environment"]["Variables"]
        self.assertEqual(values["BASE_URL"], "https://portal.novapharmhealthcare.com")

        # A reverse proxy can forward the gateway Host rather than the
        # public browser Host. Accept our exact configured origin regardless.
        event = self.event("/login", "POST", origin="https://portal.example.invalid")
        event["headers"]["host"] = "wgy9p7ad0d.execute-api.eu-north-1.amazonaws.com"
        event["body"] = "mode=signup&email=invalid"
        response = PORTAL.handler(event, None)
        self.assertEqual(response["statusCode"], 400)
        self.assertEqual(json.loads(response["body"])["error"], "invalid_login_email")

        event["headers"]["origin"] = "https://untrusted.example.invalid"
        denied = PORTAL.handler(event, None)
        self.assertEqual(denied["statusCode"], 403)
        self.assertEqual(json.loads(denied["body"])["error"], "invalid_login_origin")

    def test_safari_opaque_origin_uses_host_only_csrf_proof(self):
        landing=PORTAL.handler(self.event("/"),None)
        self.assertEqual(landing["statusCode"],200)
        self.assertIn('name="signup_csrf"',landing["body"])
        match=re.search(r'name="signup_csrf" value="([A-Za-z0-9_-]{43})"',landing["body"])
        self.assertIsNotNone(match)
        token=match.group(1)
        self.assertTrue(any(c.startswith("__Host-np_signup_csrf=") and
                            "Secure" in c and "HttpOnly" in c and "SameSite=Lax" in c
                            for c in landing.get("cookies",[])))
        csrf_cookie=[c.split(";",1)[0] for c in landing["cookies"]
                     if c.startswith("__Host-np_signup_csrf=")]
        self.assertEqual(len(csrf_cookie),1)

        event=self.event("/login","POST",origin="null")
        event["headers"]["host"]="portal.novapharmhealthcare.com"
        event["headers"]["sec-fetch-site"]="same-origin"
        event["cookies"]=csrf_cookie
        event["body"]="mode=signup&email=invalid&signup_csrf="+token
        accepted=PORTAL.handler(event,None)
        self.assertEqual(accepted["statusCode"],400)
        self.assertEqual(json.loads(accepted["body"])["error"],"invalid_login_email")

        # The same proof works for privacy browsers omitting Origin.
        event["headers"].pop("origin")
        without_origin=PORTAL.handler(event,None)
        self.assertEqual(without_origin["statusCode"],400)
        self.assertEqual(json.loads(without_origin["body"])["error"],"invalid_login_email")

        # A forged, missing or stale token must never get past origin validation.
        event["headers"]["origin"]="null"
        event["cookies"]=[]
        missing=PORTAL.handler(event,None)
        self.assertEqual(missing["statusCode"],403)
        event["cookies"]=csrf_cookie
        event["body"]="mode=signup&email=invalid&signup_csrf="+"X"*43
        tampered=PORTAL.handler(event,None)
        self.assertEqual(tampered["statusCode"],403)
        event["body"]="mode=signup&email=invalid&signup_csrf="+token
        event["headers"]["origin"]="https://attacker.example.invalid"
        explicit_attack=PORTAL.handler(event,None)
        self.assertEqual(explicit_attack["statusCode"],403)
        event["headers"]["origin"]="null"
        event["headers"]["sec-fetch-site"]="cross-site"
        cross_site=PORTAL.handler(event,None)
        self.assertEqual(cross_site["statusCode"],403)
        event["headers"]["sec-fetch-site"]="same-origin"
        event["headers"]["referer"]="https://attacker.example.invalid/form"
        bad_referer=PORTAL.handler(event,None)
        self.assertEqual(bad_referer["statusCode"],403)

    def test_known_live_https_origins_are_allowed_without_trusting_lookalikes(self):
        accepted=(
            "https://portal.novapharmhealthcare.com",
            "https://PORTAL.NOVAPHARMHEALTHCARE.COM:443",
            "https://wgy9p7ad0d.execute-api.eu-north-1.amazonaws.com",
        )
        for origin in accepted:
            event=self.event("/login","POST",origin=origin)
            event["headers"]["host"]="wgy9p7ad0d.execute-api.eu-north-1.amazonaws.com"
            event["body"]="mode=signup&email=invalid"
            response=PORTAL.handler(event,None)
            self.assertEqual(response["statusCode"],400,origin)
            self.assertEqual(json.loads(response["body"])["error"],"invalid_login_email",origin)
        for origin in (
            "https://portal.novapharmhealthcare.com.attacker.example",
            "http://portal.novapharmhealthcare.com",
            "https://untrusted.example",
            "null",
            "https://portal.novapharmhealthcare.com.evil.invalid/",
            "https://portal.novapharmhealthcare.com:444",
        ):
            event=self.event("/login","POST",origin=origin)
            event["body"]="mode=signup&email=invalid"
            response=PORTAL.handler(event,None)
            self.assertEqual(response["statusCode"],403,origin)
            self.assertEqual(json.loads(response["body"])["error"],"invalid_login_origin",origin)

    def test_approved_account_landing_and_personal_signup(self):
        policy=PORTAL.reply(200,PORTAL.PAGE,"text/html")["headers"]["content-security-policy"]
        self.assertIn("form-action 'self' https://synthetic.auth.eu-north-1.amazoncognito.com",policy)
        self.assertIn("One account.<br>Every NovaPharm experience.", PORTAL.PAGE)
        self.assertIn('id="account-entry-form"', PORTAL.PAGE)
        self.assertIn('id="account-type-business"', PORTAL.PAGE)
        self.assertIn("https://novapharmhealthcare.com/account-application/", PORTAL.PAGE)
        self.assertIn("body:not(.account-authenticated) .retail-shop{display:none}", PORTAL.PAGE)
        event=self.event("/login","POST")
        event["body"]="mode=signup&email=buyer%40example.org"
        response=PORTAL.handler(event,None)
        self.assertEqual(response["statusCode"],302)
        from urllib.parse import urlsplit,parse_qs
        uri=urlsplit(response["headers"]["location"])
        self.assertEqual(uri.path,"/signup")
        fields=parse_qs(uri.query)
        self.assertEqual(fields["login_hint"],["buyer@example.org"])
        self.assertEqual(fields["code_challenge_method"],["S256"])
        self.assertTrue(any(x.startswith("__Host-np_txn=") for x in response.get("cookies",[])))
        event["body"]="mode=signup&email=invalid"
        self.assertEqual(PORTAL.handler(event,None)["statusCode"],400)

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
        self.assertTrue(all(p["retail_price_pence"] == 1080 for p in payload["products"]))
        self.assertTrue(all(p["sale_status"]=="owner_approved_price" for p in payload["products"]))
        self.assertIn("Continue to secure payment", PORTAL.PAGE)
        self.assertIn("retailStorageKey", PORTAL.APP)
        self.assertIn("Add to bag", PORTAL.APP)
        self.assertNotIn("qty48_price_pence", response["body"])
        self.assertEqual(PORTAL.handler(self.event("/api/catalogue"), None)["statusCode"], 401)

    def test_personal_account_does_not_require_trade_approval(self):
        self.assertIn("Your account is ready.", PORTAL.PAGE)
        self.assertIn("Business account approval is not required for personal shopping", PORTAL.PAGE)
        self.assertNotIn("Business verification required.", PORTAL.PAGE)
        self.assertIn("Apply for business access", PORTAL.PAGE)
        response = PORTAL.handler(self.event("/api/retail/catalogue"), None)
        self.assertEqual(response["statusCode"], 200)
        payload = json.loads(response["body"])
        self.assertTrue(payload["public_retail_prices_approved"])
        self.assertFalse(payload["checkout_enabled"])
        self.assertEqual(len(payload["products"]), 19)
        self.assertTrue(all(p["retail_price_pence"] == 1080 for p in payload["products"]))
        self.assertTrue(all(p["sale_status"] == "owner_approved_price" for p in payload["products"]))
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

    def test_provisional_uk_delivery_charge_is_zero_and_cost_is_seller_absorbed(self):
        self.assertIn("indicative UK delivery charge", PORTAL.PAGE)
        self.assertIn("Indicative UK delivery charge: £0", PORTAL.APP)
        payload = {"request_id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                   "lines": [{"sku": "NUT-UK-VD3-T120", "quantity": 1}]}
        response = PORTAL.submit(self.event("/api/order-requests", "POST", payload),
                                 {"sub": "test-sub"})
        self.assertEqual(response["statusCode"], 201)
        data = json.loads(response["body"])
        self.assertEqual(data["shipping_charge_pence"], 0)
        self.assertTrue(data["uk_delivery_cost_absorbed_by_seller"])
        self.assertEqual(DDB.items[0]["shipping_charge_pence"], 0)
        self.assertFalse(data["financially_binding"])
        self.assertFalse(data["inventory_reserved"])

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
        self.assertEqual(body["shipping_charge_pence"], 0)
        self.assertTrue(body["uk_delivery_cost_absorbed_by_seller"])
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

    def test_retail_sale_requires_verified_evidence_even_with_payment_switch_on(self):
        old=(PORTAL.PAYMENT_DDB, PORTAL.DIRECT_SHOP_PAYMENTS_ENABLED,PORTAL.CHECKOUT_LAMBDA)
        try:
            PORTAL.PAYMENT_DDB=object()
            PORTAL.DIRECT_SHOP_PAYMENTS_ENABLED=True
            PORTAL.CHECKOUT_LAMBDA=object()
            self.assertFalse(PORTAL.retail_readiness())
            valid=PORTAL.SSM.get_parameter()["Parameter"]["Value"]
            self.assertFalse(PORTAL.retail_sale_authorised(json.loads(valid)))
            for name in ("retail_sales_authorised","vat_registration_verified",
                         "food_business_registration_verified","consumer_terms_verified",
                         "manufacturer_fulfilment_commitment_verified","uk_dispatch_service_verified"):
                all_flags={k:True for k in ("retail_sales_authorised","vat_registration_verified",
                         "food_business_registration_verified","consumer_terms_verified",
                         "manufacturer_fulfilment_commitment_verified","uk_dispatch_service_verified")}
                all_flags.pop(name)
                all_flags["model_assumptions"]={"uk_delivery_charge_pence":0,"uk_delivery_cost_borne_by_seller":True}
                self.assertFalse(PORTAL.retail_sale_authorised(all_flags), name)
        finally:
            PORTAL.PAYMENT_DDB,PORTAL.DIRECT_SHOP_PAYMENTS_ENABLED,PORTAL.CHECKOUT_LAMBDA=old

    def test_nutraxin_public_site_credentials_cors_and_preflight(self):
        e=self.event("/api/retail/checkout","OPTIONS",origin="https://novapharmhealthcare.com")
        r=PORTAL.handler(e,None)
        self.assertEqual(r["statusCode"],204)
        self.assertEqual(r["headers"]["access-control-allow-origin"],"https://novapharmhealthcare.com")
        self.assertEqual(r["headers"]["access-control-allow-credentials"],"true")
        malicious=self.event("/api/retail/checkout","OPTIONS",origin="https://malicious.invalid")
        self.assertEqual(PORTAL.handler(malicious,None)["statusCode"],403)
        no_login=self.event("/api/retail/checkout","POST",{"lines":[]},origin="https://novapharmhealthcare.com")
        r=PORTAL.handler(no_login,None)
        self.assertEqual(r["statusCode"],401)
        self.assertIn("access-control-allow-origin",r["headers"])
        status=PORTAL.handler(self.event("/api/retail/readiness","GET",origin="https://novapharmhealthcare.com"),None)
        self.assertEqual(status["statusCode"],200)
        self.assertFalse(json.loads(status["body"])["checkout_ready"])

    def test_login_return_destination_is_fixed_and_allowlisted(self):
        event=self.event("/login")
        event["queryStringParameters"]={"next":"bag"}
        response=PORTAL.login(event)
        self.assertEqual(response["statusCode"],302)
        self.assertEqual(DDB.items[-1]["return_to"],"https://novapharmhealthcare.com/products/nutraxin/bag/")
        bad=self.event("/login")
        bad["queryStringParameters"]={"next":"https://malicious.invalid"}
        PORTAL.login(bad)
        self.assertEqual(DDB.items[-1]["return_to"],"")

    def test_bag_unit_gross_reconciles_at_quantity_3_and_10000(self):
        # £12.89 net + 20% unit VAT = £15.47. Three units must be
        # £46.41, not £46.40 from tax rounded on aggregate net.
        unit_net=1289
        unit_gross=unit_net+PORTAL.illustrative_uk_vat_pence(unit_net)
        self.assertEqual(unit_gross,1547)
        self.assertEqual(unit_gross*3,4641)
        self.assertEqual(unit_gross*10000,15470000)
        source=(ROOT/"apps/nutraxin-customer-api/index.py").read_text()
        self.assertIn("line_gross = unit_gross * quantity",source)
        self.assertIn('"grossMinor": line_gross',source)
        self.assertNotIn("gross = (net * 120 + 50) // 100",source)

    def test_live_checkout_contract_uses_exact_vat_inclusive_unit_price_at_quantity_3(self):
        # In-memory authenticated/approved test, never creates a Stripe charge.
        import io
        class TestLedger:
            item=None
            def put_item(self, **kw):
                self.item=kw["Item"]
            def get_item(self, **kw):
                return {"Item":self.item}
        class TestWorker:
            def invoke(self, **kw):
                return {"Payload":io.BytesIO(json.dumps({
                    "statusCode":200,"body":json.dumps({"checkoutUrl":"https://checkout.stripe.com/c/synthetic_no_charge"})
                }).encode())}
        previous=(PORTAL.PAYMENT_DDB,PORTAL.DIRECT_SHOP_PAYMENTS_ENABLED,PORTAL.CHECKOUT_LAMBDA,
                  PORTAL.PRODUCTION_CHECKOUT_FUNCTION)
        ledger=TestLedger()
        PORTAL.PAYMENT_DDB=ledger
        PORTAL.CHECKOUT_LAMBDA=TestWorker()
        PORTAL.PRODUCTION_CHECKOUT_FUNCTION="synthetic-worker"
        PORTAL.DIRECT_SHOP_PAYMENTS_ENABLED=True
        PORTAL.SSM.authorized=True
        PORTAL.SSM.unit_price_pence=1289
        try:
            request={"request_id":"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                     "accept_terms":True,"lines":[{"sku":"NUT-UK-VD3-T120","quantity":3}]}
            response=PORTAL.retail_checkout(self.event("/api/retail/checkout","POST",request),
                                            {"sub":"synthetic-customer","username":"synthetic-user"})
            self.assertEqual(response["statusCode"],200,response["body"])
            saved=ledger.item
            self.assertEqual(saved["productNetMinor"]["N"],"3867")
            self.assertEqual(saved["taxMinor"]["N"],"774")
            self.assertEqual(saved["shippingGrossMinor"]["N"],"0")
            self.assertEqual(saved["totalGrossMinor"]["N"],"4641")
            lines=json.loads(saved["approvedLinesJson"]["S"])
            self.assertEqual(lines[0]["quantity"],3)
            self.assertEqual(lines[0]["grossMinor"],4641)
        finally:
            PORTAL.PAYMENT_DDB,PORTAL.DIRECT_SHOP_PAYMENTS_ENABLED,PORTAL.CHECKOUT_LAMBDA,PORTAL.PRODUCTION_CHECKOUT_FUNCTION=previous
            PORTAL.SSM.authorized=False
            PORTAL.SSM.unit_price_pence=900

    def test_owner_self_service_checkout_prices_on_server_and_never_reserves_fake_stock(self):
        import io

        class PaymentDB:
            def __init__(self): self.records = {}
            def put_item(self, **kw):
                item = kw["Item"]
                key = item["pk"]["S"]
                if key in self.records:
                    class Error(Exception): pass
                    exc=Error("duplicate")
                    exc.response={"Error":{"Code":"ConditionalCheckFailedException"}}
                    raise exc
                self.records[key]=item
            def get_item(self, **kw):
                return {"Item":self.records.get(kw["Key"]["pk"]["S"])}
        class Worker:
            def __init__(self): self.calls=[]
            def invoke(self, **kw):
                self.calls.append(kw)
                return {"Payload": io.BytesIO(json.dumps({"statusCode":200,
                    "body":json.dumps({"checkoutUrl":"https://checkout.stripe.com/c/pay_synthetic"})}).encode())}

        ledger=PaymentDB();worker=Worker()
        old=(PORTAL.PAYMENT_DDB,PORTAL.DIRECT_SHOP_PAYMENTS_ENABLED,PORTAL.CHECKOUT_LAMBDA,PORTAL.PRODUCTION_CHECKOUT_FUNCTION)
        PORTAL.PAYMENT_DDB=ledger
        PORTAL.DIRECT_SHOP_PAYMENTS_ENABLED=True
        PORTAL.CHECKOUT_LAMBDA=worker
        PORTAL.PRODUCTION_CHECKOUT_FUNCTION="synthetic-worker"
        PORTAL.SSM.authorized=True
        req={"request_id":"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
             "accept_terms":True,
             "lines":[{"sku":"NUT-UK-VD3-T120","quantity":1}]}
        event=self.event("/api/retail/checkout","POST",req)
        customer={"sub":"test-sub","username":"test-user"}
        try:
            rejected=PORTAL.retail_checkout(self.event("/api/retail/checkout","POST",
                          {**req,"accept_terms":False}),customer)
            self.assertEqual(rejected["statusCode"],400)
            self.assertEqual(ledger.records,{})
            accepted=PORTAL.retail_checkout(event,customer)
            self.assertEqual(accepted["statusCode"],200)
            self.assertEqual(len(worker.calls),1)
            payload=json.loads(accepted["body"])
            self.assertEqual(payload["orderId"],"NUT-"+req["request_id"])
            record=ledger.records["ORDER#"+payload["orderId"]]
            self.assertEqual(record["productNetMinor"]["N"],"900")
            self.assertEqual(record["taxMinor"]["N"],"180")
            self.assertEqual(record["shippingGrossMinor"]["N"],"0")
            self.assertEqual(record["totalGrossMinor"]["N"],"1080")
            self.assertEqual(record["stockReserved"]["BOOL"],False)
            self.assertEqual(record["sellerProductionCommitment"]["BOOL"],True)
            self.assertEqual(record["buyerAcceptsThirtyDayDelivery"]["BOOL"],True)
            self.assertEqual(record["customerSub"]["S"],"test-sub")
            self.assertEqual(record["approvedForPayment"]["BOOL"],True)
            self.assertNotIn("secret",json.dumps(record).lower())
            COGNITO.verified_email=False
            denied=PORTAL.retail_checkout(self.event("/api/retail/checkout","POST",
                   {**req,"request_id":"bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee"}),customer)
            self.assertEqual(denied["statusCode"],403)
            self.assertEqual(len(ledger.records),1)
        finally:
            PORTAL.PAYMENT_DDB,PORTAL.DIRECT_SHOP_PAYMENTS_ENABLED,PORTAL.CHECKOUT_LAMBDA,PORTAL.PRODUCTION_CHECKOUT_FUNCTION=old
            COGNITO.verified_email=True
            PORTAL.SSM.authorized=False

    def test_retail_checkout_is_disabled_by_default_for_all_visitors(self):
        self.assertFalse(PORTAL.DIRECT_SHOP_PAYMENTS_ENABLED)
        self.assertIn('id="retail-checkout"',PORTAL.PAGE)
        self.assertTrue(callable(PORTAL.retail_checkout))
        self.assertIn('DIRECT_SHOP_PAYMENTS_ENABLED',PORTAL.__dict__)
        self.assertEqual(PORTAL.retail_checkout(self.event("/api/retail/checkout","POST"), {"sub":"test-sub","username":"test-user"})["statusCode"],503)

    def test_iac_scope_and_separate_private_price_store(self):
        template = json.loads((ROOT / "infra/aws/nutraxin-customer-staging-stack.json").read_text())
        role = template["Resources"]["AppRole"]["Properties"]
        statements = role["Policies"][0]["PolicyDocument"]["Statement"]
        sensitive = [s for s in statements if any(x in json.dumps(s["Action"]) for x in ("ssm:GetParameter", "dynamodb:PutItem", "cognito-idp:AdminListGroupsForUser"))]
        self.assertEqual(len(sensitive), 4)
        cognito_statement = next(s for s in statements if "cognito-idp:AdminListGroupsForUser" in s["Action"])
        self.assertIn("cognito-idp:AdminGetUser", cognito_statement["Action"])
        for statement in sensitive:
            self.assertNotEqual(statement["Resource"], "*")
        self.assertEqual(template["Resources"]["AppFunction"]["Properties"]["Code"]["ZipFile"].strip(),
                         (ROOT / "apps/nutraxin-customer-api/index.py").read_text().strip())
        self.assertIn("OFF", template["Outputs"]["CommercialCheckoutStatus"]["Value"])

    def test_unified_products_catalogue_has_no_inferred_sale_or_images(self):
        old_session=PORTAL.session
        old_groups=COGNITO.groups
        PORTAL.session=lambda _: {"username":"browsing","sub":"one-account","email":"browse@example.invalid"}
        COGNITO.groups=[]
        try:
            page=PORTAL.handler(self.event("/portal/products/"),None)
            self.assertEqual(page["statusCode"],200)
            self.assertIn("My Products.",page["body"])
            self.assertIn('src="/customer-products.js"',page["body"])
            self.assertIn("shop-basket",page["body"])
            self.assertIn("novapharm-healthcare-logo.svg",page["body"])
            script=PORTAL.handler(self.event("/customer-products.js"),None)
            self.assertEqual(script["statusCode"],200)
            self.assertIn("api/customer/quote-requests",script["body"])
            self.assertNotIn("innerHTML",script["body"])
            response=PORTAL.handler(self.event("/api/customer/products"),None)
            self.assertEqual(response["statusCode"],200)
            data=json.loads(response["body"])
            self.assertEqual(data["total"],392)
            self.assertEqual(data["collection_counts"],{"nutraxin":19,"esco":373})
            self.assertFalse(data["business_request_approved"])
            self.assertFalse(data["binding_checkout_enabled"])
            self.assertEqual(len({x["sku"] for x in data["products"]}),392)
            self.assertTrue(all(x["image_url"] is None for x in data["products"] if x["collection"]=="esco"))
            self.assertTrue(all(x["image_url"] for x in data["products"] if x["collection"]=="nutraxin"))
            self.assertTrue(all(x["ordering_status"]=="request_review_only" for x in data["products"]))
        finally:
            PORTAL.session=old_session
            COGNITO.groups=old_groups

    def test_unified_mixed_basket_is_scoped_nonbinding_and_no_email(self):
        old_session=PORTAL.session
        old_table=PORTAL.TABLE
        old_groups=COGNITO.groups
        class Ledger:
            def __init__(self):self.items=[]
            def put_item(self,**kw):self.items.append(kw["Item"])
        ledger=Ledger()
        PORTAL.TABLE=ledger
        PORTAL.session=lambda _: {"username":"approved","sub":"tenant-42","email":"approved@example.invalid"}
        request_id="c26d07da-7ed0-4c5b-8a94-0e2a8824ac41"
        def request(lines,origin="https://portal.example.invalid"):
            e=self.event("/api/customer/quote-requests","POST",origin=origin)
            e["headers"]["content-type"]="application/json"
            e["headers"]["sec-fetch-site"]="same-origin"
            e["body"]=json.dumps({"request_id":request_id,"lines":lines})
            return PORTAL.handler(e,None)
        lines=[{"sku":"NUT-UK-VD3-T120","quantity":2},{"sku":"ESCO-CAT-0001","quantity":3}]
        try:
            COGNITO.groups=[]
            self.assertEqual(request(lines)["statusCode"],403)
            COGNITO.groups=[PORTAL.APPROVED_GROUP]
            self.assertEqual(request(lines,"https://evil.invalid")["statusCode"],403)
            self.assertEqual(request([lines[0],lines[0]])["statusCode"],400)
            self.assertEqual(request([{"sku":"ESCO-CAT-9999","quantity":2}])["statusCode"],400)
            self.assertEqual(request([{"sku":"ESCO-CAT-0001","quantity":True}])["statusCode"],400)
            self.assertEqual(request([{"sku":"ESCO-CAT-0001","quantity":10001}])["statusCode"],400)
            self.assertEqual(len(ledger.items),0)
            accepted=request(lines)
            self.assertEqual(accepted["statusCode"],201)
            info=json.loads(accepted["body"])
            self.assertEqual(info["receipt_id"],"NPQ-"+request_id)
            self.assertFalse(info["financially_binding"])
            self.assertFalse(info["payment_enabled"])
            self.assertEqual(len(ledger.items),1)
            record=ledger.items[0]
            self.assertEqual(record["pk"],"USER#tenant-42")
            self.assertEqual(record["sk"],"RQ#"+request_id)
            self.assertEqual(record["status"],"PENDING_MANUAL_REVIEW")
            self.assertFalse(record["inventory_reserved"])
            self.assertFalse(record["vat_invoice_created"])
            self.assertEqual({x["collection"] for x in record["lines"]},{"esco","nutraxin"})
            self.assertTrue(record["no_sns_or_customer_email"])
            self.assertNotIn("payment_intent",str(record))
        finally:
            PORTAL.session=old_session
            PORTAL.TABLE=old_table
            COGNITO.groups=old_groups

if __name__ == "__main__":
    unittest.main()
