import os, json, base64, re, hmac, hashlib, time
import boto3
from botocore.exceptions import ClientError

secrets = boto3.client("secretsmanager")
dynamodb = boto3.client("dynamodb")
TYPES = frozenset({
 "checkout.session.completed", "checkout.session.async_payment_succeeded",
 "checkout.session.async_payment_failed", "customer.subscription.created",
 "customer.subscription.updated", "customer.subscription.deleted",
 "invoice.paid", "invoice.payment_failed", "charge.dispute.created",
 "charge.refunded", "radar.early_fraud_warning.created"
})
EVENT_ID = re.compile(r"^evt_[A-Za-z0-9]{8,}$")
HEX = re.compile(r"^[0-9a-f]{64}$")

def response(status, code):
 return {"statusCode":status,"headers":{"content-type":"application/json","cache-control":"no-store","x-robots-tag":"noindex"},"body":json.dumps({"status":code},separators=(",",":"))}

def handler(event, context):
 try:
  headers = {str(k).lower():v for k,v in (event.get("headers") or {}).items()}
  signature = headers.get("stripe-signature", "")
  raw = event.get("body", "")
  body = base64.b64decode(raw,validate=True) if event.get("isBase64Encoded") else raw.encode("utf-8")
  if len(body)>262144 or not body or not isinstance(signature,str):
   return response(400,"invalid_payload")
  parts = [x.strip().split("=",1) for x in signature.split(",") if "=" in x]
  timestamp = next((v for k,v in parts if k=="t"),None)
  signatures = [v for k,v in parts if k=="v1" and HEX.fullmatch(v)]
  if not timestamp or not timestamp.isdigit() or abs(int(time.time())-int(timestamp))>300 or not signatures:
   return response(400,"invalid_signature")
  secret = secrets.get_secret_value(SecretId=os.environ["STRIPE_WEBHOOK_SECRET_ARN"]).get("SecretString","")
  if not secret.startswith("whsec_"):
   return response(503,"signing_secret_not_ready")
  digest = hmac.new(secret.encode("utf-8"),timestamp.encode("ascii")+b"."+body,hashlib.sha256).hexdigest()
  if not any(hmac.compare_digest(digest,value) for value in signatures):
   return response(400,"invalid_signature")
  data=json.loads(body.decode("utf-8"))
  if not isinstance(data,dict) or not EVENT_ID.fullmatch(str(data.get("id",""))) or data.get("livemode") is not True:
   return response(400,"invalid_live_event")
  account=data.get("account")
  if account is not None and account!=os.environ["EXPECTED_STRIPE_ACCOUNT_ID"]:
   return response(400,"wrong_account")
  kind=data.get("type")
  if kind not in TYPES:
   return response(200,"ignored_type")
  obj=(data.get("data") or {}).get("object") or {}
  if kind.startswith("checkout.session.") and (not isinstance(obj,dict) or obj.get("mode")!="subscription"):
   return response(200,"ignored_non_subscription")
  now=int(time.time())
  synthetic=str(data["id"]).startswith("evt_NovaSynthetic")
  item={
   "event_id":{"S":data["id"]},
   "event_type":{"S":kind},
   "status":{"S":"quarantined_unmapped"},
   "received_at":{"N":str(now)},
   "expires_at":{"N":str(now+7776000)},
   "synthetic":{"BOOL":synthetic}
  }
  try:
   dynamodb.put_item(TableName=os.environ["BILLING_EVENT_TABLE"],Item=item,ConditionExpression="attribute_not_exists(event_id)")
   return response(200,"received_unmapped_no_entitlement")
  except ClientError as err:
   if err.response.get("Error",{}).get("Code")=="ConditionalCheckFailedException":
    return response(200,"duplicate_event")
   return response(503,"ledger_unavailable")
 except (ValueError,TypeError,UnicodeError,KeyError,base64.binascii.Error):
  return response(400,"invalid_payload")
 except Exception:
  return response(503,"temporarily_unavailable")
