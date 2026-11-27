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
        puts=[x["Put"] for x in kw["TransactItems"]]
        items=[x["Item"] for x in puts]
        keys=[x["pk"]["S"] for x in items]
        if len(keys)!=len(set(keys)):
            raise SyntheticClientError("TransactionCanceledException")
        for key,put in zip(keys,puts):
            old=self.rows.get(key)
            if put["ConditionExpression"]=="attribute_not_exists(pk)":
                ok=old is None
            else:
                assert put["ConditionExpression"]=="#state = :approved AND customerSub = :subject AND campaignId = :campaign AND promotionCode = :code AND priorOrderId = :prior AND expiresAtUnix = :expiry AND expiresAtUnix > :now"
                v=put["ExpressionAttributeValues"]
                ok=(old is not None and all(old.get(k)==v[a] for k,a in (
                    ("status",":approved"),("customerSub",":subject"),("campaignId",":campaign"),
                    ("promotionCode",":code"),("priorOrderId",":prior"),("expiresAtUnix",":expiry")))
                    and int(old["expiresAtUnix"]["N"])>int(v[":now"]["N"]))
            if not ok:
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
        API.REPRICE_ENABLED=False
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
    def promotion_policy(self, **overrides):
        policy=json.loads(SSM.get_parameter()["Parameter"]["Value"])
        campaign={"approved":True,"starts_at":int(time.time())-60,
                  "ends_at":int(time.time())+3600,"discount_bps":1000,
                  "sku_min_net_minor":{"NUT-UK-VD3-T120":800},
                  "revision":"synthetic-1","minimum_gross_minor":1000}
        campaign.update(overrides)
        policy["retail_promotions"]={"enabled":True,"campaigns":{"TEST10":campaign}}
        return {"Parameter":{"Value":json.dumps(policy)}}

    def test_multibrand_vat_and_checkout_gate(self):
        from unittest.mock import patch
        sku="NP-CP-4006381333931"
        offer={"sku":sku,"gtin":"4006381333931","name":"Synthetic supplement","pack":"30 tablets",
               "brand":"Synthetic brand","category":"Supplements","productClass":"food_supplement",
               "image":"/assets/media/products/synthetic/pack.webp","netMinor":1000,
               "vatBasisPoints":2000,"grossMinor":1200,"availableQuantity":4,
               "expiresAt":int(time.time())+600,"supplierCost":111}
        for k in ("identityConfirmed","imageRightsConfirmed","ukRetailApproved","priceApproved","vatTreatmentVerified","stockVerified","fulfilmentVerified","orderingEnabled","sellerDeliveryCommitment","labelInformationVerified"):
            offer[k]=True
        row={"sk":{"S":sku},"offerJson":{"S":json.dumps(offer)}}
        basket=self.basket()
        basket["lines"].append({"sku":sku,"quantity":2})
        event=self.event("/checkout","POST",basket)
        with patch.object(API,"MULTIBRAND_ENABLED",False):
            self.assertEqual(API.direct_checkout(event)["statusCode"],422)
        with patch.object(API,"MULTIBRAND_ENABLED",True),patch.object(DB,"query",return_value={"Items":[row]}):
            published=json.loads(API.handler(self.event("/retail/offers"),None)["body"])
            self.assertEqual(published["products"][0]["grossMinor"],1200)
            self.assertNotIn("supplierCost",published["products"][0])
            quote=json.loads(API.handler(self.event("/quote","POST",basket),None)["body"])
            self.assertEqual(quote["totalGrossMinor"],3480)
            self.assertEqual(quote["taxMinor"],580)
            self.assertEqual(API.direct_checkout(event)["statusCode"],200)
            record=DB.rows["ORDER#NUT-"+self.ID]
            self.assertEqual(record["ownerCommercialPolicy"]["S"],"multibrand_uk_direct_v1")
            self.assertEqual(record["totalGrossMinor"]["N"],"3480")
            self.assertEqual(API.order_status(self.event("/status/NUT-"+self.ID),"NUT-"+self.ID)["statusCode"],200)
        with patch.object(API,"MULTIBRAND_ENABLED",True),patch.object(DB,"query",return_value={"Items":[{"sk":{"S":sku},"offerJson":{"S":json.dumps({**offer,"vatTreatmentVerified":False})}}]}):
            self.assertEqual(API.direct_checkout(event)["statusCode"],400)

    def test_promo_exact_server_total_and_replay(self):
        from unittest.mock import patch
        basket=dict(self.basket(),promo_code="test10")
        with patch.object(SSM,"get_parameter",return_value=self.promotion_policy()):
            preview=API.handler(self.event("/quote","POST",basket),None)
            self.assertEqual(preview["statusCode"],200)
            quote=json.loads(preview["body"])
            self.assertEqual(quote["totalGrossMinor"],972)
            self.assertEqual(quote["discountGrossMinor"],108)
            self.assertFalse(DB.rows)
            self.assertFalse(WORKER.calls)
            self.assertEqual(API.direct_checkout(self.event("/checkout","POST",basket))["statusCode"],422)
            self.assertFalse(DB.rows)
            basket["basket_version"]=quote["basketVersion"]
            result=API.direct_checkout(self.event("/checkout","POST",basket))
            self.assertEqual(result["statusCode"],200)
            record=DB.rows["ORDER#NUT-"+self.ID]
            self.assertEqual(record["productNetMinor"]["N"],"810")
            self.assertEqual(record["taxMinor"]["N"],"162")
            self.assertEqual(record["totalGrossMinor"]["N"],"972")
            self.assertEqual(record["discountGrossMinor"]["N"],"108")
            self.assertEqual(record["promotionCode"]["S"],"TEST10")
            self.assertEqual(json.loads(record["approvedLinesJson"]["S"])[0]["grossMinor"],972)
            self.assertEqual(API.direct_checkout(self.event("/checkout","POST",basket))["statusCode"],200)
            self.assertEqual(API.direct_checkout(self.event("/checkout","POST",self.basket()))["statusCode"],409)

    def test_promo_invalid_expired_or_below_floor_creates_no_order(self):
        from unittest.mock import patch
        for overrides in ({"approved":False},{"ends_at":int(time.time())-1},
                          {"sku_min_net_minor":{"NUT-UK-VD3-T120":850}},
                          {"minimum_gross_minor":2000},
                          {"sku_min_net_minor":{"NUT-UK-VD3-S30":800}}):
            with self.subTest(overrides=overrides):
                with patch.object(SSM,"get_parameter",return_value=self.promotion_policy(**overrides)):
                    result=API.direct_checkout(self.event("/checkout","POST",dict(self.basket(),promo_code="TEST10")))
                    self.assertEqual(result["statusCode"],422)
        self.assertEqual(API.direct_checkout(self.event("/checkout","POST",dict(self.basket(),promo_code="TEST10")))["statusCode"],422)
        self.assertFalse(DB.rows)
        self.assertFalse(WORKER.calls)

    def test_promo_minimum_uses_only_eligible_merchandise(self):
        from unittest.mock import patch
        basket=dict(self.basket(),promo_code="TEST10")
        basket["lines"].append({"sku":"NUT-UK-VD3-S30","quantity":2})
        with patch.object(SSM,"get_parameter",return_value=self.promotion_policy(minimum_gross_minor=2000)):
            rejected=API.handler(self.event("/quote","POST",basket),None)
            self.assertEqual(rejected["statusCode"],422)
            basket["lines"][0]["quantity"]=2
            accepted=API.handler(self.event("/quote","POST",basket),None)
            self.assertEqual(accepted["statusCode"],200,accepted["body"])
            quote=json.loads(accepted["body"])
            self.assertEqual(quote["discountGrossMinor"],216)
            self.assertFalse(DB.rows)
            self.assertFalse(WORKER.calls)

    def test_unimplemented_gift_card_never_silently_charges_full_price(self):
        result=API.direct_checkout(self.event("/checkout","POST",dict(self.basket(),gift_card_code="TESTGIFT")))
        self.assertEqual(result["statusCode"],422)
        self.assertFalse(DB.rows)
        self.assertFalse(WORKER.calls)

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
    def returning_fixture(self):
        import hashlib
        subject="consumer_11111111222243338444555555555555"
        campaign="RETURN-2026"
        prior="NUT-bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee"
        digest=hashlib.sha256(json.dumps([campaign,subject],separators=(",",":")).encode()).hexdigest()
        grant="PROMO_GRANT#"+digest
        DB.rows["ORDER#"+prior]={"customerSub":{"S":subject},"status":{"S":"PAID"},
            "ownerCommercialPolicy":{"S":"nutraxin_uk_direct_v1"}}
        DB.rows[grant]={"pk":{"S":grant},"sk":{"S":"META"},"status":{"S":"APPROVED"},
            "customerSub":{"S":subject},"campaignId":{"S":campaign},"promotionCode":{"S":"TEST10"},
            "priorOrderId":{"S":prior},"expiresAtUnix":{"N":str(int(time.time())+1800)}}
        return grant,prior,self.promotion_policy(audience="returning_account_once",campaign_id=campaign)

    def test_returning_coupon_requires_verified_account_grant_and_single_use(self):
        from unittest.mock import patch
        grant,prior,policy=self.returning_fixture()
        token=self.consumer_token()
        basket=dict(self.basket(),promo_code="TEST10")
        with patch.object(SSM,"get_parameter",return_value=policy):
            self.assertEqual(API.handler(self.event("/quote","POST",basket),None)["statusCode"],422)
            self.assertEqual(API.handler(self.account_event("/account/quote","POST",basket,self.consumer_token(subject="99999999-2222-4333-8444-555555555555")),None)["statusCode"],422)
            quote=API.handler(self.account_event("/account/quote","POST",basket,token),None)
            self.assertEqual(quote["statusCode"],200,quote["body"])
            self.assertEqual(DB.rows[grant]["status"]["S"],"APPROVED")
            self.assertFalse(WORKER.calls)
            basket["basket_version"]=json.loads(quote["body"])["basketVersion"]
            event=self.account_event("/account/checkout","POST",basket,token)
            self.assertEqual(API.handler(event,None)["statusCode"],200)
            self.assertEqual(DB.rows[grant]["status"]["S"],"CLAIMED")
            self.assertEqual(DB.rows[grant]["claimedOrderId"]["S"],"NUT-"+self.ID)
            self.assertEqual(API.handler(event,None)["statusCode"],200)
            duplicate=dict(basket,request_id="cccccccc-bbbb-4ccc-8ddd-eeeeeeeeeeee")
            self.assertEqual(API.handler(self.account_event("/account/checkout","POST",duplicate,token),None)["statusCode"],422)
            self.assertNotIn("ORDER#NUT-"+duplicate["request_id"],DB.rows)
            self.assertEqual(len(WORKER.calls),2)
            self.assertEqual(API.handler(self.account_event("/account/quote","POST",basket,token),None)["statusCode"],422)

    def test_returning_coupon_requires_prior_paid_order_and_unexpired_grant(self):
        from unittest.mock import patch
        grant,prior,policy=self.returning_fixture()
        token=self.consumer_token()
        event=self.account_event("/account/quote","POST",dict(self.basket(),promo_code="TEST10"),token)
        with patch.object(SSM,"get_parameter",return_value=policy):
            DB.rows["ORDER#"+prior]["status"]={"S":"PAYMENT_FAILED"}
            self.assertEqual(API.handler(event,None)["statusCode"],422)
            DB.rows["ORDER#"+prior]["status"]={"S":"PAID"}
            DB.rows[grant]["expiresAtUnix"]={"N":"1"}
            self.assertEqual(API.handler(event,None)["statusCode"],422)
            self.assertFalse(WORKER.calls)

    def test_privileges_discovery_only_verified_discoverable_grants(self):
        from unittest.mock import patch
        grant,prior,_=self.returning_fixture()
        subject=DB.rows[grant]["customerSub"]["S"]
        idx="CONSUMER#"+subject
        DB.rows[idx]={"pk":{"S":idx},"sk":{"S":"ORDER#000000000001#"+prior},
                      "orderId":{"S":prior},"customerSub":{"S":subject}}
        policy=self.promotion_policy(audience="returning_account_once",campaign_id="RETURN-2026",
                                     privilege_kind="second",discoverable=True)
        token=self.consumer_token()
        with patch.object(SSM,"get_parameter",return_value=policy):
            self.assertEqual(API.handler(self.event("/account/privileges"),None)["statusCode"],401)
            other=self.consumer_token(subject="99999999-2222-4333-8444-555555555555")
            denied=json.loads(API.handler(self.account_event("/account/privileges",token=other),None)["body"])
            self.assertEqual(denied["offers"],[])
            good=API.handler(self.account_event("/account/privileges",token=token),None)
            self.assertEqual(good["statusCode"],200,good["body"])
            data=json.loads(good["body"])
            self.assertEqual(data["stage"],"one_paid_order")
            self.assertEqual(data["offers"],[{"code":"TEST10","title":"Second purchase privilege",
                "discountBps":1000,"minimumGrossMinor":1000}])
            self.assertEqual(DB.rows[grant]["status"]["S"],"APPROVED")
            self.assertFalse(WORKER.calls)
            DB.rows[grant]["status"]={"S":"CLAIMED"}
            self.assertEqual(json.loads(API.handler(self.account_event("/account/privileges",token=token),None)["body"])["offers"],[])

    def test_welcome_privilege_requires_explicit_grant_and_no_recorded_paid_order(self):
        import hashlib
        from unittest.mock import patch
        subject="consumer_11111111222243338444555555555555"
        campaign="WELCOME-ONCE-V1"
        digest=hashlib.sha256(json.dumps([campaign,subject],separators=(",",":")).encode()).hexdigest()
        grant="PROMO_GRANT#"+digest
        policy=self.promotion_policy(audience="first_account_once",campaign_id=campaign,
                                     privilege_kind="welcome",discoverable=True)
        token=self.consumer_token()
        event=self.account_event("/account/privileges",token=token)
        with patch.object(SSM,"get_parameter",return_value=policy):
            self.assertEqual(json.loads(API.handler(event,None)["body"])["offers"],[])
            DB.rows[grant]={"pk":{"S":grant},"sk":{"S":"META"},"status":{"S":"APPROVED"},
                "customerSub":{"S":subject},"campaignId":{"S":campaign},"promotionCode":{"S":"TEST10"},
                "priorOrderId":{"S":"NONE"},"expiresAtUnix":{"N":str(int(time.time())+1800)}}
            data=json.loads(API.handler(event,None)["body"])
            self.assertEqual(data["stage"],"no_recorded_paid_orders")
            self.assertEqual(data["offers"][0]["title"],"Welcome privilege")
            prior="NUT-bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee"
            idx="CONSUMER#"+subject
            DB.rows[idx]={"pk":{"S":idx},"sk":{"S":"ORDER#000000000001#"+prior},
                          "orderId":{"S":prior},"customerSub":{"S":subject}}
            DB.rows["ORDER#"+prior]={"customerSub":{"S":subject},"status":{"S":"PAID"},
                "ownerCommercialPolicy":{"S":"nutraxin_uk_direct_v1"}}
            self.assertEqual(json.loads(API.handler(event,None)["body"])["offers"],[])

    def test_welcome10_automatic_quote_claim_and_replay(self):
        from unittest.mock import patch
        policy=self.promotion_policy(audience="first_account_once",
            campaign_id="WELCOME-ONCE-V1",privilege_kind="welcome",
            automatic_welcome=True,discoverable=True,minimum_gross_minor=4000)
        data=json.loads(policy["Parameter"]["Value"])
        campaigns=data["retail_promotions"]["campaigns"]
        campaigns["WELCOME10"]=campaigns.pop("TEST10")
        policy["Parameter"]["Value"]=json.dumps(data)
        token=self.consumer_token()
        basket=dict(self.basket(qty=4),promo_code="WELCOME10")
        with patch.object(SSM,"get_parameter",return_value=policy):
            self.assertEqual(API.handler(self.event("/quote","POST",basket),None)["statusCode"],422)
            small=dict(self.basket(qty=1),promo_code="WELCOME10")
            self.assertEqual(API.handler(self.account_event("/account/quote","POST",small,token),None)["statusCode"],422)
            offers=API.handler(self.account_event("/account/privileges",token=token),None)
            self.assertEqual(json.loads(offers["body"])["offers"][0]["code"],"WELCOME10")
            q=API.handler(self.account_event("/account/quote","POST",basket,token),None)
            self.assertEqual(q["statusCode"],200,q["body"])
            self.assertEqual(json.loads(q["body"])["discountGrossMinor"],432)
            self.assertFalse(DB.rows)
            self.assertFalse(WORKER.calls)
            basket["basket_version"]=json.loads(q["body"])["basketVersion"]
            event=self.account_event("/account/checkout","POST",basket,token)
            self.assertEqual(API.handler(event,None)["statusCode"],200)
            grants=[v for k,v in DB.rows.items() if k.startswith("PROMO_GRANT#")]
            self.assertEqual(len(grants),1)
            self.assertEqual(grants[0]["status"]["S"],"CLAIMED")
            self.assertEqual(API.handler(event,None)["statusCode"],200)
            duplicate=dict(basket,request_id="cccccccc-bbbb-4ccc-8ddd-eeeeeeeeeeee")
            self.assertEqual(API.handler(self.account_event("/account/checkout","POST",duplicate,token),None)["statusCode"],422)
            self.assertEqual(API.handler(self.account_event("/account/quote","POST",basket,token),None)["statusCode"],422)

    def test_automatic_welcome_does_not_override_existing_paid_order(self):
        from unittest.mock import patch
        subject="consumer_11111111222243338444555555555555"
        prior="NUT-bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee"
        idx="CONSUMER#"+subject
        DB.rows[idx]={"pk":{"S":idx},"sk":{"S":"ORDER#000000000001#"+prior},
                      "orderId":{"S":prior},"customerSub":{"S":subject}}
        DB.rows["ORDER#"+prior]={"customerSub":{"S":subject},"status":{"S":"PAID"},
            "ownerCommercialPolicy":{"S":"nutraxin_uk_direct_v1"}}
        policy=self.promotion_policy(audience="first_account_once",campaign_id="WELCOME-ONCE-V1",
                                      privilege_kind="welcome",automatic_welcome=True)
        data=json.loads(policy["Parameter"]["Value"])
        campaigns=data["retail_promotions"]["campaigns"]
        campaigns["WELCOME10"]=campaigns.pop("TEST10")
        policy["Parameter"]["Value"]=json.dumps(data)
        with patch.object(SSM,"get_parameter",return_value=policy):
            result=API.handler(self.account_event("/account/quote","POST",
                  dict(self.basket(),promo_code="WELCOME10"),self.consumer_token()),None)
            self.assertEqual(result["statusCode"],422)
            self.assertFalse(WORKER.calls)

    def test_birthday_privilege_requires_reviewed_occasion_and_current_year(self):
        import hashlib
        from unittest.mock import patch
        grant,prior,_=self.returning_fixture()
        row=DB.rows.pop(grant)
        subject=row["customerSub"]["S"]
        year=time.gmtime().tm_year
        campaign="BIRTHDAY-"+str(year)
        digest=hashlib.sha256(json.dumps([campaign,subject],separators=(",",":")).encode()).hexdigest()
        grant="PROMO_GRANT#"+digest
        row.update(pk={"S":grant},campaignId={"S":campaign})
        DB.rows[grant]=row
        policy=self.promotion_policy(audience="returning_account_once",campaign_id=campaign,
                                     privilege_kind="birthday",occasion_year=year,discoverable=True)
        event=self.account_event("/account/privileges",token=self.consumer_token())
        with patch.object(SSM,"get_parameter",return_value=policy):
            self.assertEqual(json.loads(API.handler(event,None)["body"])["offers"],[])
            row.update(occasionKind={"S":"birthday"},occasionReviewed={"BOOL":True},occasionYear={"N":str(year)})
            self.assertEqual(json.loads(API.handler(event,None)["body"])["offers"][0]["title"],"Birthday privilege")
            row["occasionYear"]={"N":str(year-1)}
            self.assertEqual(json.loads(API.handler(event,None)["body"])["offers"],[])
            self.assertFalse(WORKER.calls)

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

    def test_reprice_all_19_gross_prices_and_one_delivery(self):
        API.REPRICE_ENABLED=True
        for sku, expected in API.REPRICE_GROSS.items():
            payload=dict(self.basket(),lines=[{"sku":sku,"quantity":1}],retail_price_revision=API.REPRICE_REVISION)
            q=json.loads(API.handler(self.event("/quote","POST",payload),None)["body"])
            self.assertEqual(q["totalGrossMinor"],expected+449,sku)
            self.assertEqual(q["shippingGrossMinor"],449,sku)
        payload=dict(self.basket(),lines=[{"sku":"NUT-UK-LCAR-T60","quantity":2},{"sku":"NUT-UK-CCX-T90","quantity":1}],retail_price_revision=API.REPRICE_REVISION)
        result=API.handler(self.event("/checkout","POST",payload),None)
        self.assertEqual(result["statusCode"],200,result["body"])
        row=DB.rows["ORDER#NUT-"+self.ID]
        self.assertEqual(row["totalGrossMinor"]["N"],str(999*2+1749+449))
        self.assertEqual(row["shippingGrossMinor"]["N"],"449")
        self.assertEqual(sum(x["grossMinor"] for x in json.loads(row["approvedLinesJson"]["S"])),999*2+1749+449)
    def test_reprice_rejects_revised_client_when_server_is_legacy(self):
        payload=dict(self.basket(),retail_price_revision=API.REPRICE_REVISION)
        result=API.handler(self.event("/checkout","POST",payload),None)
        self.assertEqual(result["statusCode"],422)
        self.assertFalse(DB.rows)
        self.assertFalse(WORKER.calls)

    def test_reprice_rejects_cached_client_without_revision(self):
        API.REPRICE_ENABLED=True
        result=API.handler(self.event("/checkout","POST",self.basket()),None)
        self.assertEqual(result["statusCode"],422)
        self.assertFalse(DB.rows)
        self.assertFalse(WORKER.calls)

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
