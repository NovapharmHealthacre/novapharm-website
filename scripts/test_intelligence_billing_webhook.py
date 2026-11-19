import importlib.util
import json
import os
import sys
import time
import hmac
import hashlib
import types
import unittest

class FakeClientError(Exception):
 def __init__(self, code):
  self.response = {"Error": {"Code": code}}

class FakeDynamo:
 def __init__(self):
  self.ids = set()
  self.rows = []
 def put_item(self, TableName, Item, ConditionExpression):
  assert TableName == "novapharm-intelligence-billing-webhook-events"
  assert ConditionExpression == "attribute_not_exists(event_id)"
  event_id = Item["event_id"]["S"]
  if event_id in self.ids:
   raise FakeClientError("ConditionalCheckFailedException")
  self.ids.add(event_id)
  self.rows.append(Item)

class FakeSecrets:
 def get_secret_value(self, SecretId):
  assert SecretId == "arn:aws:secretsmanager:eu-north-1:123456789012:secret:intelligence-test"
  return {"SecretString": "whsec_test_1234567890123456789"}

dynamo = FakeDynamo()
def client(name):
 if name == "dynamodb": return dynamo
 if name == "secretsmanager": return FakeSecrets()
 raise AssertionError(name)

boto3 = types.ModuleType("boto3")
boto3.client = client
botocore = types.ModuleType("botocore")
exceptions = types.ModuleType("botocore.exceptions")
exceptions.ClientError = FakeClientError
sys.modules["boto3"] = boto3
sys.modules["botocore"] = botocore
sys.modules["botocore.exceptions"] = exceptions

os.environ["STRIPE_WEBHOOK_SECRET_ARN"] = "arn:aws:secretsmanager:eu-north-1:123456789012:secret:intelligence-test"
os.environ["EXPECTED_STRIPE_ACCOUNT_ID"] = "acct_1UZUNv2U9Y3sX5I2"
os.environ["BILLING_EVENT_TABLE"] = "novapharm-intelligence-billing-webhook-events"
spec = importlib.util.spec_from_file_location("intelligence_billing_webhook","deployment/aws/intelligence_billing_webhook.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def payload(event_id, event_type="customer.subscription.created", mode=None, account=None):
 data = {"id":event_id, "livemode":True, "type":event_type,"data":{"object":{"object":"subscription","customer":"cus_example12345","id":"sub_example12345"}}}
 if mode is not None: data["data"]["object"]["mode"] = mode
 if account is not None: data["account"] = account
 return json.dumps(data,separators=(",",":"),sort_keys=True)

def invoke(raw, secret="whsec_test_1234567890123456789", t=None, altered=None):
 t = str(int(time.time()) if t is None else t)
 digest = hmac.new(secret.encode(),(t+"."+raw).encode(),hashlib.sha256).hexdigest()
 return json.loads(mod.handler({"headers":{"stripe-signature":"t="+t+",v1="+(altered or digest)},"body":raw,"isBase64Encoded":False},None)["body"])

class BillingWebhookTests(unittest.TestCase):
 def test_valid_live_event_is_quarantined_not_granted(self):
  out=invoke(payload("evt_NovaSynthetic000001"))
  self.assertEqual(out["status"],"received_unmapped_no_entitlement")
  row=dynamo.rows[-1]
  self.assertEqual(row["status"]["S"],"quarantined_unmapped")
  self.assertTrue(row["synthetic"]["BOOL"])
  self.assertNotIn("tenant_id",row)
  self.assertNotIn("entitlement",row)

 def test_idempotent_replay(self):
  raw=payload("evt_NovaSynthetic000002")
  self.assertEqual(invoke(raw)["status"],"received_unmapped_no_entitlement")
  self.assertEqual(invoke(raw)["status"],"duplicate_event")
  self.assertEqual(len([r for r in dynamo.rows if r["event_id"]["S"]=="evt_NovaSynthetic000002"]),1)

 def test_invalid_signature_never_writes(self):
  count=len(dynamo.rows)
  self.assertEqual(invoke(payload("evt_NovaSynthetic000003"),altered="0"*64)["status"],"invalid_signature")
  self.assertEqual(len(dynamo.rows),count)

 def test_old_signature_denied(self):
  self.assertEqual(invoke(payload("evt_NovaSynthetic000004"),t=int(time.time())-400)["status"],"invalid_signature")

 def test_unrelated_payment_checkout_ignored(self):
  self.assertEqual(invoke(payload("evt_NovaSynthetic000005","checkout.session.completed","payment"))["status"],"ignored_non_subscription")

 def test_wrong_account_rejected(self):
  self.assertEqual(invoke(payload("evt_NovaSynthetic000006",account="acct_other"))["status"],"wrong_account")

 def test_unapproved_event_ignored(self):
  self.assertEqual(invoke(payload("evt_NovaSynthetic000007","customer.deleted"))["status"],"ignored_type")

if __name__ == "__main__":
 unittest.main()
