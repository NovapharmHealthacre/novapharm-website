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
from unittest.mock import patch

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

    def test_two_distinct_paid_events_same_session_are_idempotent(self):
        details=WH.reconcile(event(),durable())
        order=details["orderId"]
        sid=details["sessionId"]
        aid=details["attemptId"]
        DDB.items[("ORDER#"+order,"ATTEMPT#"+aid)]={
            "paymentStatus":{"S":"PAID"},"sessionId":{"S":sid}}
        DDB.items[("ORDER#"+order,"SUMMARY")]={
            "status":{"S":"PAID"},"stripeSessionId":{"S":sid}}
        with patch.object(DDB,"transact_write_items",side_effect=DummyError()):
            self.assertFalse(WH.record_once(event(),details))
        # No additional paid outbox writes or paid-order side effects.
        self.assertEqual(DDB.transacted,[])

    def test_paid_replay_with_inconsistent_ledger_must_not_be_acked(self):
        details=WH.reconcile(event(),durable())
        order=details["orderId"]
        aid=details["attemptId"]
        sid=details["sessionId"]
        DDB.items[("ORDER#"+order,"ATTEMPT#"+aid)]={
            "paymentStatus":{"S":"PAID"},"sessionId":{"S":sid}}
        DDB.items[("ORDER#"+order,"SUMMARY")]={
            "status":{"S":"PAID"},"stripeSessionId":{"S":"cs_live_"+"x"*15}}
        with patch.object(DDB,"transact_write_items",side_effect=DummyError()):
            with self.assertRaises(DummyError):
                WH.record_once(event(),details)

    def test_expired_checkout_is_abandoned_not_failed_card_payment(self):
        expiry=event()
        expiry["type"]="checkout.session.expired"
        expiry["data"]["object"]["payment_status"]="unpaid"
        details=WH.reconcile(expiry,durable())
        self.assertEqual(details["action"],"EXPIRED")
        self.assertTrue(WH.record_once(expiry,details))
        writes=DDB.transacted[0]
        self.assertEqual(writes[1]["Update"]["ExpressionAttributeValues"][":status"]["S"],"EXPIRED")
        self.assertEqual(writes[3]["Update"]["ExpressionAttributeValues"][":updated"]["S"],"CHECKOUT_EXPIRED")
        self.assertEqual(writes[2]["Put"]["Item"]["eventType"]["S"],"NUTRAXIN_PAYMENT_EXPIRED")
        self.assertEqual(writes[2]["Put"]["Item"]["status"]["S"],"PENDING_REVIEW")
        failed=event()
        failed["type"]="checkout.session.async_payment_failed"
        failed["data"]["object"]["payment_status"]="unpaid"
        self.assertEqual(WH.reconcile(failed,durable())["action"],"FAILED")
        DDB.transacted.clear()
        WH.record_once(failed,{"action":"FAILED",**{k:v for k,v in details.items() if k!="action"}})
        self.assertEqual(DDB.transacted[0][3]["Update"]["ExpressionAttributeValues"][":updated"]["S"],"PAYMENT_FAILED")

    def test_non_paid_event_cannot_reverse_paid_session(self):
        for kind in ("checkout.session.expired","checkout.session.async_payment_failed"):
            e=event()
            e["type"]=kind
            # A signed but contradictory lifecycle event must never be settled.
            with self.assertRaises(ValueError):
                WH.reconcile(e,durable())
        self.assertEqual(DDB.transacted,[])

    def test_late_failed_event_cannot_reverse_already_paid_order(self):
        e=event()
        e["type"]="checkout.session.expired"
        e["data"]["object"]["payment_status"]="unpaid"
        details=WH.reconcile(e,durable())
        order=details["orderId"]
        aid=details["attemptId"]
        sid=details["sessionId"]
        DDB.items[("ORDER#"+order,"ATTEMPT#"+aid)]={
            "paymentStatus":{"S":"PAID"},"sessionId":{"S":sid}}
        DDB.items[("ORDER#"+order,"SUMMARY")]={
            "status":{"S":"PAID"},"stripeSessionId":{"S":sid}}
        with patch.object(DDB,"transact_write_items",side_effect=DummyError()):
            with self.assertRaises(DummyError):
                WH.record_once(e,details)

    def test_refunds_and_disputes_not_claimed_as_reconciled(self):
        # No real refund/dispute event is handled by this checkout-only
        # webhook; separate signed event correlation is a release gate.
        for kind in ("charge.refunded","refund.created","refund.updated",
                     "charge.dispute.created","charge.dispute.closed"):
            e=event()
            e["type"]=kind
            e["data"]["object"]={"id":"re_"+"d"*16,"object":"refund",
                                  "livemode":True,"payment_intent":"pi_"+"e"*16}
            raw,signature=signed_payload(e)
            self.assertEqual(WH.signed_event(raw,signature,
                "whsec_"+"z"*32,now=1794151250)["type"],kind)
            self.assertNotIn(kind,WH.ALLOWED)
        self.assertEqual(DDB.transacted,[])

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
