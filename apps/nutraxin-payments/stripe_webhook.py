"""Stripe classic Checkout webhook for approved NovaPharm Nutraxin payment attempts.

No checkout sessions are created here. Default-deny: an event can only
change a matching payment attempt that was previously written to the ledger.
Do not dispatch fulfilment directly from webhooks.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import time

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "eu-north-1")
LEDGER = os.environ["PAYMENT_LEDGER_TABLE"]
OUTBOX = os.environ["PAYMENT_OUTBOX_TABLE"]
SIGNING_SECRET_ID = os.environ["STRIPE_WEBHOOK_SECRET_ID"]
ddb = boto3.client("dynamodb", region_name=REGION)
secrets = boto3.client("secretsmanager", region_name=REGION)

ALLOWED = {
    "checkout.session.completed": "PAID",
    "checkout.session.async_payment_succeeded": "PAID",
    "checkout.session.async_payment_failed": "FAILED",
    "checkout.session.expired": "FAILED"
}
ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{5,99}$")
EVENT_ID = re.compile(r"^evt_[A-Za-z0-9]+$")
SESSION_ID = re.compile(r"^cs_live_[A-Za-z0-9]+$")


def response(status, body):
    return {"statusCode": status, "headers": {"content-type": "application/json",
            "cache-control": "no-store"}, "body": json.dumps(body, separators=(",", ":"))}


def signed_event(raw, signature, secret, now=None):
    if not isinstance(raw, bytes) or len(raw) > 1_000_000 or not raw:
        raise ValueError("Invalid payload")
    if not isinstance(secret, str) or not secret.startswith("whsec_") or len(secret) < 15:
        raise ValueError("Signing secret not configured")
    if not isinstance(signature, str) or len(signature) > 1500:
        raise ValueError("Missing signature")
    members = [part.strip().split("=", 1) for part in signature.split(",") if "=" in part]
    timestamps = [v for k, v in members if k == "t" and re.fullmatch(r"[0-9]{9,12}", v)]
    signatures = [v for k, v in members if k == "v1" and re.fullmatch(r"[a-fA-F0-9]{64}", v)]
    if len(timestamps) != 1 or not signatures:
        raise ValueError("Invalid signature components")
    timestamp = int(timestamps[0])
    instant = int(time.time() if now is None else now)
    if abs(instant - timestamp) > 300:
        raise ValueError("Signature timestamp outside tolerance")
    mac = hmac.new(secret.encode(), str(timestamp).encode() + b"." + raw, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(mac, supplied.lower()) for supplied in signatures):
        raise ValueError("Invalid signature")
    event = json.loads(raw.decode("utf-8"))
    if not isinstance(event, dict) or not EVENT_ID.fullmatch(str(event.get("id", ""))):
        raise ValueError("Invalid event")
    if event.get("livemode") is not True:
        raise ValueError("Wrong Stripe mode")
    return event


def attr_value(item, key, attr_type="S"):
    field = item.get(key, {})
    if not isinstance(field, dict) or attr_type not in field:
        raise ValueError("Missing durable attempt metadata")
    return field[attr_type]


def reconcile(event, stored):
    session = event.get("data", {}).get("object", {})
    if not isinstance(session, dict) or not SESSION_ID.fullmatch(str(session.get("id", ""))):
        raise ValueError("Invalid live Checkout session")
    sid = session["id"]
    attempt_id = attr_value(stored, "paymentAttemptId")
    order_id = attr_value(stored, "orderId")
    customer_id = attr_value(stored, "customerId")
    version = attr_value(stored, "quoteVersion")
    amount = int(attr_value(stored, "totalGrossMinor", "N"))
    if (session.get("id") != attr_value(stored, "sessionId") or
        session.get("client_reference_id") != order_id or
        session.get("metadata", {}).get("payment_attempt_id") != attempt_id or
        session.get("metadata", {}).get("quote_version") != version or
        session.get("metadata", {}).get("customer_id") != customer_id or
        session.get("currency") != "gbp" or
        type(session.get("amount_total")) is not int or
        session.get("amount_total") != amount or
        session.get("livemode") is not True):
        raise ValueError("Signed Checkout totals or owner do not reconcile")
    action = ALLOWED[event["type"]]
    if action == "PAID" and session.get("payment_status") != "paid":
        return None
    return {"action": action, "sessionId": sid, "attemptId": attempt_id,
            "orderId": order_id, "eventId": event["id"]}


def record_once(event, payment):
    event_key = {"pk": {"S": "STRIPE_EVENT#" + payment["eventId"]}, "sk": {"S": "META"}}
    attempt_key = {"pk": {"S": "ORDER#" + payment["orderId"]},
                   "sk": {"S": "ATTEMPT#" + payment["attemptId"]}}
    outbox_key = {"pk": {"S": "ORDER#" + payment["orderId"]},
                  "sk": {"S": "PAYMENT_EVENT#" + payment["eventId"]}}
    writes = [
        {"Put": {"TableName": LEDGER, "Item": {**event_key,
             "sessionId": {"S": payment["sessionId"]},
             "eventType": {"S": event["type"]}, "receivedAt": {"N": str(int(time.time()))}},
             "ConditionExpression": "attribute_not_exists(pk)"}},
        {"Update": {"TableName": LEDGER, "Key": attempt_key,
             "UpdateExpression": "SET paymentStatus = :status, lastStripeEventId = :event",
             "ConditionExpression": "attribute_exists(pk) AND paymentStatus = :pending",
             "ExpressionAttributeValues": {":status": {"S": payment["action"]},
                                           ":pending": {"S": "PENDING_STRIPE"},
                                           ":event": {"S": payment["eventId"]}}}},
        {"Put": {"TableName": OUTBOX, "Item": {**outbox_key,
             "eventType": {"S": "NUTRAXIN_PAYMENT_" + payment["action"]},
             "paymentAttemptId": {"S": payment["attemptId"]},
             "status": {"S": "PENDING_REVIEW"},
             "createdAt": {"N": str(int(time.time()))}},
             "ConditionExpression": "attribute_not_exists(pk)"}},
        {"Update": {"TableName": LEDGER,
             "Key": {"pk": {"S": "ORDER#" + payment["orderId"]},
                     "sk": {"S": "SUMMARY"}},
             "UpdateExpression": "SET #status = :updated, lastStripeEventId = :event",
             "ConditionExpression": "#status = :checkoutOpen AND stripeSessionId = :session",
             "ExpressionAttributeNames": {"#status": "status"},
             "ExpressionAttributeValues": {
                  ":checkoutOpen": {"S": "CHECKOUT_OPEN"},
                  ":updated": {"S": "PAID" if payment["action"] == "PAID" else "PAYMENT_FAILED"},
                  ":event": {"S": payment["eventId"]},
                  ":session": {"S": payment["sessionId"]}}}}
    ]
    try:
        ddb.transact_write_items(TransactItems=writes)
        return True
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") != "TransactionCanceledException":
            raise
        known = ddb.get_item(TableName=LEDGER, Key=event_key, ConsistentRead=True).get("Item")
        if known and attr_value(known, "sessionId") == payment["sessionId"]:
            return False
        # Stripe may send both checkout.session.completed and
        # checkout.session.async_payment_succeeded for the same paid attempt.
        # Reconcile these as one settled order, never write a second outbox
        # item or regress a PAID order back to CHECKOUT_OPEN. Only acknowledge
        # the second event when the durable attempt and summary agree.
        if payment["action"] == "PAID":
            attempt = ddb.get_item(TableName=LEDGER, Key=attempt_key,
                                   ConsistentRead=True).get("Item")
            summary = ddb.get_item(TableName=LEDGER, Key={
                "pk": {"S": "ORDER#" + payment["orderId"]},
                "sk": {"S": "SUMMARY"}}, ConsistentRead=True).get("Item")
            if (attempt and summary and
                attempt.get("paymentStatus") == {"S": "PAID"} and
                attempt.get("sessionId") == {"S": payment["sessionId"]} and
                summary.get("status") == {"S": "PAID"} and
                summary.get("stripeSessionId") == {"S": payment["sessionId"]}):
                return False
        raise


def handler(event, context):
    if (event.get("requestContext", {}).get("http", {}).get("method") or "").upper() != "POST":
        return response(405, {"error": "method_not_allowed"})
    try:
        headers = {str(k).lower(): v for k, v in (event.get("headers") or {}).items()}
        blob = event.get("body") or ""
        raw = base64.b64decode(blob, validate=True) if event.get("isBase64Encoded") else blob.encode("utf-8")
        signing = secrets.get_secret_value(SecretId=SIGNING_SECRET_ID)
        secret = signing.get("SecretString", "")
        signed = signed_event(raw, headers.get("stripe-signature"), secret)
    except (ValueError, TypeError, json.JSONDecodeError, UnicodeError):
        return response(400, {"error": "invalid_webhook_signature_or_payload"})
    except ClientError:
        return response(503, {"error": "webhook_not_configured"})
    if signed.get("type") not in ALLOWED:
        return response(200, {"acknowledged": True, "action": "ignored"})
    try:
        session_id = signed.get("data", {}).get("object", {}).get("id", "")
        if not SESSION_ID.fullmatch(str(session_id)):
            return response(400, {"error": "invalid_session_reference"})
        record = ddb.get_item(TableName=LEDGER, Key={
            "pk": {"S": "STRIPE_SESSION#" + session_id}, "sk": {"S": "META"}},
            ConsistentRead=True).get("Item")
        if not record:
            return response(503, {"error": "payment_attempt_not_available"})
        payment = reconcile(signed, record)
        if payment is None:
            return response(200, {"acknowledged": True, "action": "waiting_for_payment"})
        applied = record_once(signed, payment)
        return response(200, {"acknowledged": True, "applied": applied})
    except ValueError:
        return response(400, {"error": "payment_mismatch"})
    except ClientError:
        return response(503, {"error": "payment_reconciliation_unavailable"})
