"""No-network tests for the IAM-only, commercially gated production checkout."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import time
import types
import unittest

ROOT = Path(__file__).resolve().parents[2]
os.environ.update({"PAYMENT_LEDGER_TABLE":"synthetic-ledger",
                   "STRIPE_API_KEY_SECRET_ID":"synthetic-live-key"})

class SyntheticClientError(Exception):
    response = {"Error": {"Code": "TransactionCanceledException"}}

class FakeDB:
    def __init__(self):
        self.items={}
        self.writes=[]
    def get_item(self, **kwargs):
        k=(kwargs["Key"]["pk"]["S"],kwargs["Key"]["sk"]["S"])
        return {"Item":self.items.get(k)}
    def transact_write_items(self, **kwargs):
        self.writes.append(kwargs["TransactItems"])

class FakeSecrets:
    def get_secret_value(self, **kwargs):
        return {"SecretString":"rk_live_synthetic_restricted_key_for_contracts"}

FAKE_DB=FakeDB()
boto=types.ModuleType("boto3")
boto.client=lambda service, **kw:FAKE_DB if service=="dynamodb" else FakeSecrets()
sys.modules["boto3"]=boto
sys.modules["botocore"]=types.ModuleType("botocore")
ce=types.ModuleType("botocore.exceptions")
ce.ClientError=SyntheticClientError
sys.modules["botocore.exceptions"]=ce
spec=importlib.util.spec_from_file_location("np_approved_checkout",
    ROOT/"apps/nutraxin-payments/approved_checkout.py")
CHECKOUT=importlib.util.module_from_spec(spec)
spec.loader.exec_module(CHECKOUT)

def approved_record():
    a={
        "orderId":CHECKOUT.s("NUT-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"),
        "customerSub":CHECKOUT.s("customer_123456"),
        "customerId":CHECKOUT.s("customer_123456"),
        "currency":CHECKOUT.s("GBP"),"destinationCountry":CHECKOUT.s("GB"),
        "quoteVersion":CHECKOUT.s("quote_123456"),
        "sellerApprovalReference":CHECKOUT.s("seller_approved_123456"),
        "deliveryQuoteReference":CHECKOUT.s("carrier_approved_123456"),
        "taxAssessmentReference":CHECKOUT.s("gb_vat_approved_123456"),
        "fulfilmentApprovalReference":CHECKOUT.s("fulfilment_approved_123456"),
        "expiresAtUnix":CHECKOUT.n(int(time.time())+3600),
        "productNetMinor":CHECKOUT.n(10000),
        "taxMinor":CHECKOUT.n(2000),
        "shippingGrossMinor":CHECKOUT.n(600),
        "totalGrossMinor":CHECKOUT.n(12600),
        "approvedLinesJson":CHECKOUT.s(json.dumps([
            {"sku":"NUT-UK-VD3-T120","quantity":1,"name":"Nutraxin Vitamin D3","grossMinor":12000},
            {"sku":"DELIVERY-APPROVED","quantity":1,"name":"Approved delivery and handling","grossMinor":600}
        ])),
        "status":CHECKOUT.s("APPROVED_FOR_PAYMENT")
    }
    for name in ("approvedForPayment","stockReserved","taxAndShippingVerified",
                 "customerAcceptedTerms","commerciallyApproved"):
        a[name]={"BOOL":True}
    return a

class PaymentContracts(unittest.TestCase):
    def setUp(self):
        FAKE_DB.items.clear()
        FAKE_DB.writes.clear()

    def test_portal_payment_returns_to_fixed_private_domain(self):
        previous=CHECKOUT.urllib.request.urlopen
        calls=[]
        class FakeResponse:
            def __enter__(self):return self
            def __exit__(self,*args):return False
            def read(self,n):
                return json.dumps({"id":"cs_live_"+"a"*18,
                    "url":"https://checkout.stripe.com/c/pay_synthetic",
                    "livemode":True,"mode":"payment","currency":"gbp",
                    "amount_total":12600}).encode()
        def fake_open(req,timeout=12):
            calls.append(CHECKOUT.urllib.parse.parse_qs(req.data.decode()))
            return FakeResponse()
        CHECKOUT.urllib.request.urlopen=fake_open
        try:
            record=approved_record()
            portal_record=dict(record)
            portal_record["checkoutChannel"]=CHECKOUT.s("PORTAL_RETAIL")
            portal=CHECKOUT.details(portal_record,record["orderId"]["S"],"customer_123456")
            self.assertEqual(portal["checkoutChannel"],"PORTAL_RETAIL")
            CHECKOUT.stripe_session(portal,"attempt_portal")
            x=calls[-1]
            self.assertEqual(x["success_url"][0],
                "https://portal.novapharmhealthcare.com/portal/products/?checkout=return&order_id="+record["orderId"]["S"])
            self.assertEqual(x["cancel_url"][0],
                "https://portal.novapharmhealthcare.com/portal/products/?checkout=cancelled&order_id="+record["orderId"]["S"])
            public=CHECKOUT.details(record,record["orderId"]["S"],"customer_123456")
            self.assertEqual(public["checkoutChannel"],"PUBLIC_STORE")
            CHECKOUT.stripe_session(public,"attempt_public")
            self.assertTrue(calls[-1]["success_url"][0].startswith(
                "https://novapharmhealthcare.com/products/nutraxin/bag/"))
            invalid=dict(record)
            invalid["checkoutChannel"]=CHECKOUT.s("https://malicious.invalid")
            with self.assertRaises(CHECKOUT.NotReady):
                CHECKOUT.details(invalid,record["orderId"]["S"],"customer_123456")
        finally:
            CHECKOUT.urllib.request.urlopen=previous

    def test_live_secret_trailing_crlf_normalized_and_bad_key_rejected(self):
        previous_secrets=CHECKOUT.sm
        previous_open=CHECKOUT.urllib.request.urlopen
        synthetic="rk_" + "live_" + "synthetic_header_contract"
        requests=[]
        class PastedSecret:
            def get_secret_value(self, **kw):
                return {"SecretString":synthetic+chr(13)+chr(10)}
        class FakeResponse:
            def __enter__(self):return self
            def __exit__(self,*args):return False
            def read(self,n):
                return json.dumps({"id":"cs_live_"+"a"*18,
                    "url":"https://checkout.stripe.com/c/pay_synthetic",
                    "livemode":True,"mode":"payment","currency":"gbp",
                    "amount_total":12600}).encode()
        def fake_open(req,timeout=12):
            requests.append(req)
            self.assertEqual(req.get_header("Authorization"),"Bearer "+synthetic)
            self.assertNotIn(b"payment_method_types",req.data)
            self.assertIn(b"mode=payment",req.data)
            return FakeResponse()
        CHECKOUT.sm=PastedSecret()
        CHECKOUT.urllib.request.urlopen=fake_open
        try:
            record=approved_record()
            quote=CHECKOUT.details(record,record["orderId"]["S"],"customer_123456")
            session=CHECKOUT.stripe_session(quote,"attempt_synthetic")
            self.assertEqual(session["amount_total"],12600)
            self.assertEqual(len(requests),1)
            class MalformedSecret:
                def get_secret_value(self, **kw):
                    return {"SecretString":synthetic+" invalid"}
            CHECKOUT.sm=MalformedSecret()
            with self.assertRaises(CHECKOUT.NotReady):
                CHECKOUT.stripe_session(quote,"attempt_synthetic")
            self.assertEqual(len(requests),1)
        finally:
            CHECKOUT.sm=previous_secrets
            CHECKOUT.urllib.request.urlopen=previous_open

    def test_no_unapproved_quote_can_charge(self):
        order=approved_record()
        for field in ("approvedForPayment","stockReserved","taxAndShippingVerified",
                      "customerAcceptedTerms","commerciallyApproved"):
            tampered=dict(order)
            tampered[field]={"BOOL":False}
            with self.subTest(field=field),self.assertRaises(CHECKOUT.NotReady):
                CHECKOUT.details(tampered,order["orderId"]["S"],"customer_123456")
        self.assertEqual(FAKE_DB.writes,[])

    def test_wrong_customer_and_final_amounts_fail_closed(self):
        r=approved_record()
        for subject in ("different_customer_123456", ""):
            with self.assertRaises(CHECKOUT.NotReady):
                CHECKOUT.details(r,r["orderId"]["S"],subject)
        invalid=dict(r);invalid["totalGrossMinor"]=CHECKOUT.n(12601)
        with self.assertRaises(CHECKOUT.NotReady):
            CHECKOUT.details(invalid,r["orderId"]["S"],"customer_123456")
        invalid=dict(r);invalid["expiresAtUnix"]=CHECKOUT.n(int(time.time())-10)
        with self.assertRaises(CHECKOUT.NotReady):
            CHECKOUT.details(invalid,r["orderId"]["S"],"customer_123456")
        invalid=dict(r);invalid["approvedLinesJson"]=CHECKOUT.s(json.dumps([
            {"sku":"NUT-UK-VD3-T120","quantity":10001,"name":"Vitamin D3","grossMinor":12600}
        ]))
        with self.assertRaises(CHECKOUT.NotReady):
            CHECKOUT.details(invalid,r["orderId"]["S"],"customer_123456")

    def test_approved_totals_and_one_unit_are_allowed(self):
        r=approved_record()
        v=CHECKOUT.details(r,r["orderId"]["S"],"customer_123456")
        self.assertEqual(v["totalGrossMinor"],12600)
        self.assertEqual(v["lines"][0]["quantity"],1)

    def test_owner_manufacture_to_order_commitment_without_fake_stock_reservation(self):
        order=approved_record()
        order["stockReserved"]={"BOOL":False}
        order["sellerProductionCommitment"]={"BOOL":True}
        order["buyerAcceptsThirtyDayDelivery"]={"BOOL":True}
        valid=CHECKOUT.details(order,order["orderId"]["S"],"customer_123456")
        self.assertEqual(valid["totalGrossMinor"],12600)
        invalid=dict(order);invalid["sellerProductionCommitment"]={"BOOL":False}
        with self.assertRaises(CHECKOUT.NotReady):
            CHECKOUT.details(invalid,order["orderId"]["S"],"customer_123456")
        invalid=dict(order);invalid["buyerAcceptsThirtyDayDelivery"]={"BOOL":False}
        with self.assertRaises(CHECKOUT.NotReady):
            CHECKOUT.details(invalid,order["orderId"]["S"],"customer_123456")

    def test_session_reservation_and_durable_mapping_never_trust_browser(self):
        r=approved_record()
        order_id=r["orderId"]["S"]
        FAKE_DB.items[("ORDER#"+order_id,"SUMMARY")]=r
        approved_session={"id":"cs_live_"+"a"*20,"url":"https://checkout.stripe.com/c/pay_synthetic",
                          "mode":"payment","livemode":True,"currency":"gbp","amount_total":12600}
        previous=CHECKOUT.stripe_session
        CHECKOUT.stripe_session=lambda order,attempt: approved_session
        try:
            out=CHECKOUT.handler({"action":"start_approved_checkout",
                                  "orderId":order_id,"subject":"customer_123456"},None)
            self.assertEqual(out["statusCode"],200)
            self.assertTrue(json.loads(out["body"])["checkoutUrl"].startswith("https://checkout.stripe.com/"))
            self.assertEqual(len(FAKE_DB.writes),2)
            self.assertEqual(FAKE_DB.writes[0][0]["Update"]["TableName"],"synthetic-ledger")
            self.assertIn("attribute_not_exists(activeAttemptId)",
                          FAKE_DB.writes[0][0]["Update"]["ConditionExpression"])
            self.assertEqual(FAKE_DB.writes[1][0]["Put"]["Item"]["sessionId"]["S"],approved_session["id"])
            self.assertEqual(FAKE_DB.writes[1][1]["Update"]["ExpressionAttributeValues"][":pending"]["S"],"PENDING_STRIPE")
        finally:
            CHECKOUT.stripe_session=previous

    def test_never_charge_unknown_order_or_unauthorised_identity(self):
        self.assertEqual(CHECKOUT.handler({"action":"other","orderId":"something"},None)["statusCode"],403)
        self.assertEqual(CHECKOUT.handler({"action":"start_approved_checkout",
            "orderId":"NUT-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
            "subject":"customer_123456"},None)["statusCode"],404)
        self.assertEqual(FAKE_DB.writes,[])

    def test_private_lambda_template_does_not_create_public_charge_endpoint(self):
        source=(ROOT/"apps/nutraxin-payments/approved_checkout.py").read_text()
        template=json.loads((ROOT/"infra/aws/nutraxin-approved-checkout-production.json").read_text())
        resources=template["Resources"]
        self.assertEqual(resources["CheckoutFunction"]["Properties"]["Code"]["ZipFile"],source)
        self.assertFalse(any("ApiGateway" in v.get("Type","") for v in resources.values()))
        policy=json.dumps(resources["CheckoutRole"]["Properties"]["Policies"])
        self.assertIn("secretsmanager:GetSecretValue",policy)
        self.assertNotIn("secretsmanager:PutSecretValue",policy)
        ledger_actions=resources["CheckoutRole"]["Properties"]["Policies"][0]["PolicyDocument"]["Statement"][2]["Action"]
        self.assertEqual(set(ledger_actions),{"dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem"})
        self.assertNotIn("dynamodb:TransactWriteItems",policy)

if __name__=="__main__":
    unittest.main()
