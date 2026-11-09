"""Products-only hosted Stripe checkout boundary: offline, synthetic contract tests."""
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import types
import unittest

os.environ.update({
    "PRICES_PARAMETER":"/synthetic/nutraxin/prices",
    "PAYMENT_LEDGER_TABLE":"synthetic-ledger",
    "PRODUCTION_CHECKOUT_FUNCTION":"synthetic-stripe-worker",
    "SHOP_ENABLED":"true",
})

class SyntheticClientError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.response={"Error":{"Code":code}}

class FakeDB:
    def __init__(self):
        self.rows={}
    def put_item(self, **kw):
        item=kw["Item"]; key=item["pk"]["S"]
        if key in self.rows:raise SyntheticClientError("ConditionalCheckFailedException")
        self.rows[key]=item
    def get_item(self, **kw):
        return {"Item":self.rows.get(kw["Key"]["pk"]["S"])}

class FakeSSM:
    def get_parameter(self, **kw):
        return {"Parameter":{"Value":json.dumps({
            "status":"owner_approved_provisional_for_authenticated_quotation_only",
            "binding_checkout_enabled":False,
            "model_assumptions":{
                "uk_delivery_charge_pence":0,
                "uk_delivery_cost_borne_by_seller":True
            },
            "lines":[{"sku":sku,"qty48_price_pence":900} for sku in API.PRODUCTS]
        })}}

class FakeWorker:
    def __init__(self):self.calls=[]
    def invoke(self, **kw):
        self.calls.append(kw)
        return {"Payload":io.BytesIO(json.dumps({"statusCode":200,
            "body":json.dumps({"checkoutUrl":"https://checkout.stripe.com/c/pay_synthetic"})}).encode())}

DB=FakeDB();SSM=FakeSSM();WORKER=FakeWorker()
boto=types.ModuleType("boto3")
boto.client=lambda svc, **kw:DB if svc=="dynamodb" else SSM if svc=="ssm" else WORKER
sys.modules["boto3"]=boto
sys.modules["botocore"]=types.ModuleType("botocore")
ce=types.ModuleType("botocore.exceptions")
ce.ClientError=SyntheticClientError
sys.modules["botocore.exceptions"]=ce

src=Path(__file__).parent/"index.py"
spec=importlib.util.spec_from_file_location("np_products_checkout",src)
API=importlib.util.module_from_spec(spec)
spec.loader.exec_module(API)

class ProductsPaymentTests(unittest.TestCase):
    ID="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    def setUp(self):
        DB.rows.clear();WORKER.calls.clear()
        API.SHOP_ENABLED=True
    def event(self,route,method="GET",payload=None,origin="https://novapharmhealthcare.com"):
        event={"version":"2.0","rawPath":route,"requestContext":{"http":{"method":method}},
               "headers":{"origin":origin}}
        if payload is not None:event["body"]=json.dumps(payload)
        return event
    def basket(self,qty=1):
        return {"request_id":self.ID,"accept_terms":True,
                "lines":[{"sku":"NUT-UK-VD3-T120","quantity":qty}]}
    def test_public_readiness_is_products_site_only(self):
        x=API.handler(self.event("/readiness"),None)
        self.assertEqual(x["statusCode"],200)
        self.assertEqual(json.loads(x["body"])["origin"],"novapharmhealthcare.com")
        API.SHOP_ENABLED=False
        self.assertFalse(json.loads(API.handler(self.event("/readiness"),None)["body"])["checkout_ready"])
        self.assertEqual(API.handler(self.event("/checkout","POST",self.basket()),None)["statusCode"],503)
    def test_uk_owner_price_vat_delivery_and_guest_only_no_stock_claim(self):
        x=API.handler(self.event("/checkout","POST",self.basket()),None)
        self.assertEqual(x["statusCode"],200)
        record=DB.rows["ORDER#NUT-"+self.ID]
        self.assertEqual(record["productNetMinor"]["N"],"900")
        self.assertEqual(record["taxMinor"]["N"],"180")
        self.assertEqual(record["totalGrossMinor"]["N"],"1080")
        self.assertEqual(record["shippingGrossMinor"]["N"],"0")
        self.assertFalse(record["stockReserved"]["BOOL"])
        self.assertTrue(record["sellerProductionCommitment"]["BOOL"])
        self.assertTrue(record["buyerAcceptsThirtyDayDelivery"]["BOOL"])
        self.assertEqual(record["customerSub"]["S"],"guest_"+self.ID.replace("-",""))
        self.assertEqual(len(WORKER.calls),1)
        payload=json.loads(WORKER.calls[0]["Payload"].decode())
        self.assertEqual(set(payload),{"action","orderId","subject"})
        self.assertNotIn("price",json.dumps(payload).lower())
    def test_wont_accept_external_origin_forged_money_or_without_terms(self):
        data=self.basket()
        for body,origin in [
            (data,"https://malicious.invalid"),
            ({**data,"accept_terms":False},"https://novapharmhealthcare.com"),
            ({**data,"lines":[{"sku":"NUT-UK-VD3-T120","quantity":10001}]},"https://novapharmhealthcare.com"),
            ({**data,"lines":[{"sku":"NUT-UK-VD3-T120","quantity":1,"grossMinor":1}]},"https://novapharmhealthcare.com")
        ]:
            if "grossMinor" in body["lines"][0]:
                response=API.handler(self.event("/checkout","POST",body,origin),None)
                self.assertEqual(response["statusCode"],200)
                self.assertEqual(DB.rows["ORDER#NUT-"+self.ID]["totalGrossMinor"]["N"],"1080")
                continue
            response=API.handler(self.event("/checkout","POST",body,origin),None)
            self.assertIn(response["statusCode"],(400,403))
        self.assertEqual(len(WORKER.calls),1)
    def test_idempotent_repeat_and_changed_basket_rejected(self):
        first=API.direct_checkout(self.event("/checkout","POST",self.basket()))
        self.assertEqual(first["statusCode"],200)
        again=API.direct_checkout(self.event("/checkout","POST",self.basket()))
        self.assertEqual(again["statusCode"],200)
        modified=API.direct_checkout(self.event("/checkout","POST",self.basket(2)))
        self.assertEqual(modified["statusCode"],409)
    def test_payment_status_never_leaks_personal_or_payment_data(self):
        API.direct_checkout(self.event("/checkout","POST",self.basket()))
        order_id="NUT-"+self.ID
        before=API.handler(self.event("/status/"+order_id),None)
        self.assertEqual(before["statusCode"],200)
        self.assertFalse(json.loads(before["body"])["paid"])
        DB.rows["ORDER#"+order_id]["status"]={"S":"PAID"}
        after=API.handler(self.event("/status/"+order_id),None)
        self.assertTrue(json.loads(after["body"])["paid"])
        self.assertNotIn("customerSub",after["body"])
        self.assertEqual(API.handler(self.event("/status/"+order_id,origin="https://malicious.invalid"),None)["statusCode"],403)

if __name__=="__main__":
    unittest.main()
