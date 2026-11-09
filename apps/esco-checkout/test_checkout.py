"""Safe-release contracts for isolated ESCO checkout; no live charges."""
import hashlib
import hmac
import importlib.util
import json
import pathlib
import time
import unittest
from unittest.mock import patch

MODULE = pathlib.Path(__file__).with_name("index.py")
spec = importlib.util.spec_from_file_location("esco_production_checkout", MODULE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
UUID = "11111111-1111-4111-8111-111111111111"

def fixture(kind="general_goods"):
    data = dict(
        commercial_approved=True, supplier_cost_verified=True,
        uk_product_classification_verified=True, uk_product_safety_verified=True,
        tax_classification_verified=True, delivery_verified=True,
        stock_allocatable_verified=True, manufacturer_supply_authorised=True,
        variants_resolved=True, regulatory_type=kind,
        unit_price_pence=10000, actual_variable_cost_pence=7400,
        available_to_promise_units=10000, currency="gbp", tax_behavior="exclusive",
        stripe_price_id="price_0123456789", stripe_tax_code="txcd_99999999",
        name="Verified approved catalogue item")
    if kind == "medical_device":
        data.update(mhra_registration_verified=True,
                    conformity_documents_verified=True,
                    uk_responsible_person_verified=True)
    return data

def event(path, method="GET", body=None):
    return dict(rawPath=path, requestContext={"http": {"method":method}},
                headers={"origin":"https://novapharmhealthcare.com"},
                body=json.dumps(body) if body is not None else None)

def status(response):
    return response["statusCode"],json.loads(response["body"] or "{}")

class CheckoutSecurity(unittest.TestCase):

    def test_webhook_secret_trims_console_whitespace_without_accepting_invalid_format(self):
        class FakeSecrets:
            def __init__(self, raw):
                self.raw = raw
            def get_secret_value(self, SecretId):
                return {"SecretString": self.raw}
        with patch.object(mod, "WEBHOOK_SECRET_ID", "esco-test-secret"), patch.object(
            mod, "aws", return_value=FakeSecrets("whsec_" + "A"*40 + "\n")
        ):
            self.assertEqual(mod.secret("esco-test-secret"), "whsec_" + "A"*40)
        with patch.object(mod, "WEBHOOK_SECRET_ID", "esco-test-secret"), patch.object(
            mod, "aws", return_value=FakeSecrets("wrong-signature-value")
        ):
            with self.assertRaises(ValueError):
                mod.secret("esco-test-secret")

    def test_unapproved_catalogue_has_no_checkout(self):
        with patch.object(mod, "policy", return_value={"enabled":False,
                "webhook_verified":False, "approved_skus":{}}):
            http, result = status(mod.handler(event("/readiness")))
            self.assertEqual(http, 200)
            self.assertFalse(result["checkout_ready"])
            self.assertEqual(result["approved_catalogue_ids"], [])
            attempt=event("/checkout","POST", {"request_id":UUID,
                   "accept_terms":True, "lines":[{"id":"ESCO-CAT-0001","quantity":1}]})
            self.assertEqual(status(mod.handler(attempt))[0],503)

    def test_uk_product_release_needs_exact_sku_evidence(self):
        self.assertFalse(mod.eligible({}))
        commercial=fixture()
        self.assertTrue(mod.eligible(commercial))
        for field in ("commercial_approved","supplier_cost_verified",
            "uk_product_classification_verified","uk_product_safety_verified",
            "tax_classification_verified","delivery_verified",
            "stock_allocatable_verified","manufacturer_supply_authorised",
            "variants_resolved"):
            p=dict(commercial, **{field:False})
            self.assertFalse(mod.eligible(p),field)
        self.assertFalse(mod.eligible(dict(commercial, available_to_promise_units=0)))
        self.assertFalse(mod.eligible(dict(commercial, actual_variable_cost_pence=7501)))
        self.assertFalse(mod.eligible(dict(commercial, stripe_price_id="price_bad")))
        self.assertFalse(mod.eligible(dict(commercial, regulatory_type="unknown")))
        device=fixture("medical_device")
        self.assertTrue(mod.eligible(device))
        for k in ("mhra_registration_verified","conformity_documents_verified",
                  "uk_responsible_person_verified"):
            self.assertFalse(mod.eligible(dict(device, **{k:False})),k)

    def test_unknown_sku_cannot_create_session(self):
        with patch.object(mod,"policy",return_value={"enabled":True,
              "webhook_verified":True,"approved_skus":{}}):
            req=event("/checkout","POST",{"request_id":UUID,"accept_terms":True,
                  "lines":[{"id":"ESCO-CAT-0373","quantity":1}]})
            self.assertEqual(status(mod.handler(req))[0],422)

    def test_browser_amount_or_approval_flags_rejected(self):
        req=event("/checkout","POST",{"request_id":UUID,"accept_terms":True,
              "lines":[{"id":"ESCO-CAT-0001","quantity":1}],
              "unit_price_pence": 1})
        self.assertEqual(status(mod.handler(req))[0],400)
        req["headers"]["origin"]="https://evil.example"
        self.assertEqual(status(mod.handler(req))[0],403)

    def test_bad_webhook_signature_never_updates_order(self):
        req=event("/stripe/webhook","POST",{"type":"checkout.session.completed"})
        req["headers"]["stripe-signature"]="t=1000000000,v1=0000"
        with patch.object(mod,"secret",return_value="whsec_"+"x"*36):
            self.assertEqual(status(mod.handler(req))[0],400)

    def test_verified_signature_and_tamper_prevention(self):
        message={"id":"evt_Abc123456","livemode":True,"type":"unrelated"}
        raw=json.dumps(message).encode()
        ts=int(time.time())
        secret="whsec_"+"test"*10
        mac=hmac.new(secret.encode(),str(ts).encode()+b"."+raw,hashlib.sha256).hexdigest()
        signed=f"t={ts},v1={mac}"
        self.assertEqual(mod.parse_signature(raw,signed,secret),message)
        with self.assertRaises(ValueError):
            mod.parse_signature(raw+b"!",signed,secret)

if __name__=="__main__":
    unittest.main()
