"""Offline checks for production webhook signature and reconciliation boundaries."""
import base64
import hashlib
import hmac
import importlib.util
import json
import os
from pathlib import Path
import sys
import types
import unittest

ROOT = Path(__file__).resolve().parents[2]
os.environ["PAYMENT_LEDGER_TABLE"] = "synthetic-ledger"
os.environ["PAYMENT_OUTBOX_TABLE"] = "synthetic-outbox"
os.environ["STRIPE_WEBHOOK_SECRET_ID"] = "synthetic-secret-name"

class DummyError(Exception):
    response = {"Error": {"Code": "TransactionCanceledException"}}

class DummySecrets:
    def get_secret_value(self, **kw):
        return {"SecretString": "whsec_" + "z" * 32}

class DummyDdb:
    def __init__(self):
        self.items = {}
        self.transacted = []
    def get_item(self, **kw):
        return {"Item": self.items.get((kw["Key"]["pk"]["S"], kw["Key"]["sk"]["S"]))}
    def transact_write_items(self, **kw):
        self.transacted.append(kw["TransactItems"])
        return {}

DDB=DummyDdb()
SECRET=DummySecrets()
boto3_mod=types.ModuleType("boto3")
boto3_mod.client=lambda name, **kw: DDB if name=="dynamodb" else SECRET
sys.modules["boto3"]=boto3_mod
sys.modules["botocore"]=types.ModuleType("botocore")
botocore_exc=types.ModuleType("botocore.exceptions")
botocore_exc.ClientError=DummyError
sys.modules["botocore.exceptions"]=botocore_exc
spec=importlib.util.spec_from_file_location("np_nutraxin_webhook", ROOT / "apps/nutraxin-payments/stripe_webhook.py")
WH=importlib.util.module_from_spec(spec)
spec.loader.exec_module(WH)

def session():
    return {"id":"cs_live_"+"a"*15,"client_reference_id":"order_1234567",
        "metadata":{"payment_attempt_id":"attempt_123456","quote_version":"quote_123456","customer_id":"cust_123456"},
        "currency":"gbp","amount_total":12900,"livemode":True,"payment_status":"paid"}

def event():
    return {"id":"evt_"+"b"*16,"type":"checkout.session.completed","livemode":True,
        "data":{"object":session()}}

def durable():
    return {"sessionId":{"S":session()["id"]},"orderId":{"S":"order_1234567"},
        "paymentAttemptId":{"S":"attempt_123456"},"customerId":{"S":"cust_123456"},
        "quoteVersion":{"S":"quote_123456"},"totalGrossMinor":{"N":"12900"}}

def signed_payload(data, ts=1794151250):
    raw=json.dumps(data,separators=(",",":")).encode()
    value=hmac.new(("whsec_"+"z"*32).encode(),str(ts).encode()+b"."+raw,hashlib.sha256).hexdigest()
    return raw, "t="+str(ts)+",v1="+value

class WebhookTests(unittest.TestCase):
    def setUp(self):
        DDB.items.clear()
        DDB.transacted.clear()

    def test_valid_signed_event_uses_raw_bytes_only(self):
        raw,sig=signed_payload(event())
        self.assertEqual(WH.signed_event(raw,sig,"whsec_"+"z"*32,now=1794151250)["id"],event()["id"])
        with self.assertRaises(ValueError):
            WH.signed_event(raw+b" ",sig,"whsec_"+"z"*32,now=1794151250)
        with self.assertRaises(ValueError):
            WH.signed_event(raw,sig,"whsec_wrong",now=1794151250)
        with self.assertRaises(ValueError):
            WH.signed_event(raw,sig,"whsec_"+"z"*32,now=1794152000)
        with self.assertRaises(ValueError):
            WH.signed_event(raw,sig,"whsec_"+"z"*32,now=1794151250+301)

    def test_event_reconciles_all_durable_amount_and_ownership_fields(self):
        p=WH.reconcile(event(),durable())
        self.assertEqual(p["action"],"PAID")
        self.assertEqual(p["orderId"],"order_1234567")
        mismatch=event()
        mismatch["data"]["object"]["amount_total"]=13000
        with self.assertRaises(ValueError):
            WH.reconcile(mismatch,durable())
        missing=durable()
        missing["customerId"]={"S":"someone_else"}
        with self.assertRaises(ValueError):
            WH.reconcile(event(),missing)
        pending=event()
        pending["data"]["object"]["payment_status"]="unpaid"
        self.assertIsNone(WH.reconcile(pending,durable()))

    def test_atomic_event_and_outbox_are_pending_manual_review(self):
        details=WH.reconcile(event(),durable())
        self.assertTrue(WH.record_once(event(),details))
        self.assertEqual(len(DDB.transacted),1)
        writes=DDB.transacted[0]
        self.assertEqual(len(writes),4)
        self.assertEqual(writes[0]["Put"]["TableName"],"synthetic-ledger")
        self.assertEqual(writes[1]["Update"]["TableName"],"synthetic-ledger")
        self.assertEqual(writes[2]["Put"]["TableName"],"synthetic-outbox")
        self.assertEqual(writes[2]["Put"]["Item"]["status"]["S"],"PENDING_REVIEW")
        self.assertIn("attribute_not_exists(pk)",writes[0]["Put"]["ConditionExpression"])
        self.assertIn("paymentStatus = :pending",writes[1]["Update"]["ConditionExpression"])
        self.assertEqual(writes[3]["Update"]["TableName"],"synthetic-ledger")
        self.assertEqual(writes[3]["Update"]["ExpressionAttributeValues"][":updated"]["S"],"PAID")
        self.assertIn("stripeSessionId = :session",writes[3]["Update"]["ConditionExpression"])

    def test_handler_does_not_accept_unsigned_or_non_post(self):
        self.assertEqual(WH.handler({"requestContext":{"http":{"method":"GET"}}},None)["statusCode"],405)
        self.assertEqual(WH.handler({"requestContext":{"http":{"method":"POST"}},
            "body":"{}","headers":{}},None)["statusCode"],400)

    def test_cloudformation_isolates_noncharging_endpoint_and_source(self):
        path=ROOT/"infra/aws/nutraxin-stripe-webhook-production.json"
        template=json.loads(path.read_text())
        resource=template["Resources"]
        self.assertEqual(template["Outputs"]["CheckoutActivated"]["Value"],"false")
        self.assertEqual(resource["WebhookLambda"]["Properties"]["Code"]["ZipFile"].strip(),
                         (ROOT/"apps/nutraxin-payments/stripe_webhook.py").read_text().strip())
        self.assertEqual(resource["WebhookRoute"]["Properties"]["RouteKey"],"POST /stripe/webhook")
        self.assertNotIn("stripe.com/v1/checkout",template["Resources"]["WebhookLambda"]["Properties"]["Code"]["ZipFile"])
        pol=json.dumps(resource["WebhookRole"]["Properties"]["Policies"])
        self.assertIn("secretsmanager:GetSecretValue",pol)
        stmts=resource["WebhookRole"]["Properties"]["Policies"][0]["PolicyDocument"]["Statement"]
        self.assertEqual(set(stmts[2]["Action"]),{"dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem"})
        self.assertEqual(stmts[3]["Action"],["dynamodb:PutItem"])
        self.assertNotIn("dynamodb:TransactWriteItems",pol)
        self.assertNotIn("secretsmanager:PutSecretValue",pol)

if __name__=="__main__":
    unittest.main()
