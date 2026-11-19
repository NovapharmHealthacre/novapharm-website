"""Products-only hosted Stripe checkout boundary: offline, synthetic contract tests."""
import base64
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import time
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
    def transact_write_items(self, **kw):
        items=[x["Put"]["Item"] for x in kw["TransactItems"]]
        keys=[x["pk"]["S"] for x in items]
        if len(keys)!=len(set(keys)) or any(k in self.rows for k in keys):
            raise SyntheticClientError("TransactionCanceledException")
        for key,item in zip(keys,items):self.rows[key]=item
    def query(self, **kw):
        key=kw["ExpressionAttributeValues"][":subject"]["S"]
        result=[v for k,v in self.rows.items() if k==key]
        return {"Items":sorted(result,key=lambda v:v["sk"]["S"],reverse=True)}

class FakeSSM:
    def get_parameter(self, **kw):
        return {"Parameter":{"Value":json.dumps({
            "status":"owner_approved_provisional_for_authenticated_quotation_only",
            "binding_checkout_enabled":False,
            "owner_retail_sale_authorised":True,
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

class FakeCognito:
    def __init__(self):self.tokens={}
    def get_user(self, **kw):
        token=kw.get("AccessToken")
        if token not in self.tokens:raise SyntheticClientError("NotAuthorizedException")
        return {"UserAttributes":self.tokens[token]}

DB=FakeDB();SSM=FakeSSM();WORKER=FakeWorker();COGNITO=FakeCognito()
boto=types.ModuleType("boto3")
boto.client=lambda svc, **kw:DB if svc=="dynamodb" else SSM if svc=="ssm" else COGNITO if svc=="cognito-idp" else WORKER
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
        DB.rows.clear();WORKER.calls.clear();COGNITO.tokens.clear()
        API.SHOP_ENABLED=True
        API.CONSUMER_POOL_ID="eu-north-1_synthetic"
        API.CONSUMER_CLIENT_ID="synthetic-products-pkce"
    def event(self,route,method="GET",payload=None,origin="https://novapharmhealthcare.com"):
        event={"version":"2.0","rawPath":route,"requestContext":{"http":{"method":method}},
               "headers":{"origin":origin}}
        if payload is not None:event["body"]=json.dumps(payload)
        return event
    def basket(self,qty=1):
        return {"request_id":self.ID,"accept_terms":True,
                "lines":[{"sku":"NUT-UK-VD3-T120","quantity":qty}]}
    def consumer_token(self, pool="eu-north-1_synthetic", client="synthetic-products-pkce",
                       verified=True, subject="11111111-2222-4333-8444-555555555555"):
        claims={"iss":"https://cognito-idp.eu-north-1.amazonaws.com/"+pool,
                "client_id":client,"token_use":"access",
                "exp":int(time.time())+3600,"sub":subject}
        body=base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
        token="hdr."+body+".signature"
        COGNITO.tokens[token]=[
            {"Name":"sub","Value":subject},
            {"Name":"email_verified","Value":"true" if verified else "false"},
            {"Name":"email","Value":"verified-test@example.invalid"}]
        return token
    def account_event(self, route, method="GET", payload=None, token=None):
        event=self.event(route,method,payload)
        if token is not None:event["headers"]["authorization"]="Bearer "+token
        return event
    def test_account_requires_valid_token_from_exact_consumer_pool(self):
        self.assertEqual(API.handler(self.account_event("/account/me"),None)["statusCode"],401)
        for token in [
            self.consumer_token(pool="eu-north-1_wrong"),
            self.consumer_token(client="wrong-client"),
            self.consumer_token(verified=False)]:
            self.assertEqual(API.handler(self.account_event("/account/me",token=token),None)["statusCode"],401)
        good=self.consumer_token()
        response=API.handler(self.account_event("/account/me",token=good),None)
        self.assertEqual(response["statusCode"],200)
        self.assertTrue(json.loads(response["body"])["email_verified"])
        invalid=self.account_event("/account/me",token=good)
        invalid["headers"]["origin"]="https://attacker.invalid"
        self.assertEqual(API.handler(invalid,None)["statusCode"],401)
    def test_authenticated_order_is_owned_and_repeat_is_idempotent(self):
        token=self.consumer_token()
        event=self.account_event("/account/checkout","POST",self.basket(),token)
        first=API.handler(event,None)
        self.assertEqual(first["statusCode"],200,first["body"])
        second=API.handler(event,None)
        self.assertEqual(second["statusCode"],200,second["body"])
        self.assertEqual(len(DB.rows),2)
        index=[k for k in DB.rows if k.startswith("CONSUMER#")]
        self.assertEqual(len(index),1)
        orders=json.loads(API.handler(self.account_event("/account/orders",token=token),None)["body"])["orders"]
        self.assertEqual(len(orders),1)
        self.assertEqual(orders[0]["orderId"],"NUT-"+self.ID)
        other=self.consumer_token(subject="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee")
        orders_other=json.loads(API.handler(self.account_event("/account/orders",token=other),None)["body"])["orders"]
        self.assertEqual(orders_other,[])
        changed=self.account_event("/account/checkout","POST",self.basket(2),token)
        self.assertEqual(API.handler(changed,None)["statusCode"],409)
        self.assertEqual(len(DB.rows),2)

    def test_public_readiness_is_products_site_only(self):
        x=API.handler(self.event("/readiness"),None)
        self.assertEqual(x["statusCode"],200)
        self.assertEqual(json.loads(x["body"])["origin"],"novapharmhealthcare.com")
        API.SHOP_ENABLED=False
        self.assertFalse(json.loads(API.handler(self.event("/readiness"),None)["body"])["checkout_ready"])
        self.assertEqual(API.handler(self.event("/checkout","POST",self.basket()),None)["statusCode"],503)
    def test_per_unit_vat_rounding_aligns_with_portal_at_quantity_three(self):
        basket={**self.basket(),"lines":[{"sku":"NUT-UK-VD3-T120","quantity":3}]}
        response=API.handler(self.event("/checkout","POST",basket),None)
        self.assertEqual(response["statusCode"],200,response["body"])
        row=DB.rows["ORDER#NUT-"+self.ID]
        self.assertEqual(row["productNetMinor"]["N"],"2700")
        self.assertEqual(row["taxMinor"]["N"],"540")
        self.assertEqual(row["totalGrossMinor"]["N"],"3240")
        self.assertEqual(json.loads(row["approvedLinesJson"]["S"])[0]["grossMinor"],3240)

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
        DB.rows["ORDER#"+order_id]["status"]={"S":"CHECKOUT_EXPIRED"}
        expired=API.handler(self.event("/status/"+order_id),None)
        self.assertEqual(json.loads(expired["body"])["status"],"CHECKOUT_EXPIRED")
        self.assertFalse(json.loads(expired["body"])["paid"])
        DB.rows["ORDER#"+order_id]["status"]={"S":"PAID"}
        after=API.handler(self.event("/status/"+order_id),None)
        self.assertTrue(json.loads(after["body"])["paid"])
        self.assertNotIn("customerSub",after["body"])
        self.assertEqual(API.handler(self.event("/status/"+order_id,origin="https://malicious.invalid"),None)["statusCode"],403)

if __name__=="__main__":
    unittest.main()
