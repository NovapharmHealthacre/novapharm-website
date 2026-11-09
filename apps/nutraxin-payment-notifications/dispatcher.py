"""Private, opt-in Nutraxin PAID-order receipt dispatcher.

Never invoked from a public URL. No customer emails are stored in DynamoDB.
Review-only deployment by default: NOTIFICATIONS_ENABLED is false until SES
production access, sender authentication and paid-order acceptance pass.
"""
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "eu-north-1")
ENABLED = os.environ.get("NOTIFICATIONS_ENABLED", "false") == "true"
LEDGER = os.environ["PAYMENT_LEDGER_TABLE"]
OUTBOX = os.environ["PAYMENT_OUTBOX_TABLE"]
STRIPE_SECRET = os.environ["STRIPE_API_KEY_SECRET_ID"]
SENDER = os.environ["EMAIL_SENDER"]
DDB = boto3.client("dynamodb", region_name=REGION)
SECRETS = boto3.client("secretsmanager", region_name=REGION)
SES = boto3.client("sesv2", region_name=REGION)
SESSION = re.compile(r"^cs_live_[A-Za-z0-9]+$")
ORDER = re.compile(r"^NUT-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
EVENT = re.compile(r"^evt_[A-Za-z0-9]+$")
EMAIL = re.compile(r"^[^\s@<>]{1,64}@[^\s@<>]{1,180}$")

def field(row, name, kind="S"):
    return (row.get(name) or {}).get(kind)

def response(status, **values):
    return {"statusCode": status, "body": json.dumps(values, separators=(",", ":"))}

def eligible(event):
    if field(event, "eventType") != "NUTRAXIN_PAYMENT_PAID":
        return None
    if field(event, "status") != "PENDING_REVIEW":
        return None
    key = event.get("pk", {}).get("S", "")
    order_id = key.removeprefix("ORDER#") if key.startswith("ORDER#") else ""
    sk = event.get("sk", {}).get("S", "")
    event_id = sk.removeprefix("PAYMENT_EVENT#") if sk.startswith("PAYMENT_EVENT#") else ""
    if not ORDER.fullmatch(order_id) or not EVENT.fullmatch(event_id):
        return None
    attempt_id = field(event, "paymentAttemptId")
    if not attempt_id or len(attempt_id) > 160:
        return None
    return order_id, event_id, attempt_id

def read_paid_order(order_id, event_id):
    row = DDB.get_item(TableName=LEDGER, Key={
        "pk": {"S": "ORDER#" + order_id}, "sk": {"S": "SUMMARY"}
    }, ConsistentRead=True).get("Item") or {}
    sid = field(row, "stripeSessionId")
    amount = field(row, "totalGrossMinor", "N")
    if (field(row, "orderId") != order_id or field(row, "status") != "PAID" or
        field(row, "lastStripeEventId") != event_id or
        not isinstance(sid, str) or not SESSION.fullmatch(sid) or
        not isinstance(amount, str) or not amount.isdecimal() or
        not 30 <= int(amount) <= 99999999 or field(row, "currency") != "GBP"):
        raise ValueError("Order is not a verified paid Nutraxin checkout")
    return row, sid, int(amount)

def stripe_session(sid):
    token = (SECRETS.get_secret_value(SecretId=STRIPE_SECRET).get("SecretString") or "").strip()
    if not token.startswith(("rk_live_", "sk_live_")) or "\n" in token or "\r" in token:
        raise ValueError("Stripe read credential not configured")
    url = "https://api.stripe.com/v1/checkout/sessions/" + urllib.parse.quote(sid, safe="")
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token,
                                             "Accept": "application/json"}, method="GET")
    with urllib.request.urlopen(req, timeout=8) as res:
        return json.loads(res.read(131072))

def verified_recipient(session, row, sid, order_id, attempt_id, amount):
    metadata = session.get("metadata") or {}
    if (session.get("id") != sid or session.get("livemode") is not True or
        session.get("mode") != "payment" or session.get("status") != "complete" or
        session.get("payment_status") != "paid" or
        session.get("currency") != "gbp" or
        session.get("amount_total") != amount or
        session.get("client_reference_id") != order_id or
        metadata.get("payment_attempt_id") != attempt_id or
        metadata.get("quote_version") != field(row, "quoteVersion") or
        metadata.get("customer_id") != field(row, "customerId")):
        raise ValueError("Stripe payment does not reconcile to the durable order")
    details = session.get("customer_details") or {}
    address = details.get("email") or session.get("customer_email")
    if not isinstance(address, str) or len(address) > 254 or not EMAIL.fullmatch(address):
        raise ValueError("Stripe confirmed email is unavailable")
    return address

def claim(order_id, event_id):
    DDB.update_item(TableName=OUTBOX,
        Key={"pk": {"S": "ORDER#" + order_id},
             "sk": {"S": "PAYMENT_EVENT#" + event_id}},
        UpdateExpression="SET #s = :claim, claimedAt = :now",
        ConditionExpression="#s = :pending",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={
            ":claim": {"S": "SENDING"}, ":pending": {"S": "PENDING_REVIEW"},
            ":now": {"N": str(int(time.time()))}})

def mark(order_id, event_id, status, message_id=None):
    values={":prev": {"S": "SENDING"}, ":status": {"S": status},
            ":when": {"N": str(int(time.time()))}}
    update="SET #s = :status, processedAt = :when"
    if message_id:
        values[":id"]={"S": message_id}
        update += ", sesMessageId = :id"
    DDB.update_item(TableName=OUTBOX,
        Key={"pk": {"S": "ORDER#" + order_id},
             "sk": {"S": "PAYMENT_EVENT#" + event_id}},
        UpdateExpression=update, ConditionExpression="#s = :prev",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues=values)

def send_receipt(address, order_id, amount):
    amount_gbp = "£" + format(amount / 100, ".2f")
    subject = "Your NovaPharm Nutraxin payment confirmation"
    body = ("Thank you for your Nutraxin order.\n\n"
            "Your payment has been confirmed.\n"
            "Order reference: " + order_id + "\n"
            "Amount received: " + amount_gbp + " (including UK VAT and delivery)\n\n"
            "We will communicate dispatch information separately. "
            "Please retain your order reference.\n\n"
            "NovaPharm Healthcare Ltd\nhttps://novapharmhealthcare.com/products/nutraxin/\n")
    return SES.send_email(
        FromEmailAddress=SENDER,
        Destination={"ToAddresses": [address]},
        Content={"Simple": {
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {"Text": {"Data": body, "Charset": "UTF-8"}}}})

def handler(event, context):
    if not ENABLED:
        return response(200, enabled=False, processed=0)
    if (not isinstance(event, dict) or event.get("source") != "aws.events" or
        event.get("detail-type") != "Scheduled Event"):
        return response(403, error="scheduler_only")
    status = SES.get_account()
    if status.get("ProductionAccessEnabled") is not True or status.get("SendingEnabled") is not True:
        return response(503, error="ses_production_access_not_approved")
    if SENDER.split("@")[-1].lower() != "novapharmhealthcare.com":
        return response(503, error="sender_domain_unapproved")
    records = []
    cursor = None
    scan_incomplete = False
    # DynamoDB applies Limit BEFORE FilterExpression, so paginate or new
    # paid events can be hidden behind older nonmatching outbox entries.
    for page in range(250):
        options = {"TableName": OUTBOX, "ConsistentRead": True, "Limit": 100,
            "FilterExpression": "#s = :pending AND eventType = :paid",
            "ExpressionAttributeNames": {"#s": "status"},
            "ExpressionAttributeValues": {":pending": {"S": "PENDING_REVIEW"},
                                          ":paid": {"S": "NUTRAXIN_PAYMENT_PAID"}}}
        if cursor:
            options["ExclusiveStartKey"] = cursor
        scanned = DDB.scan(**options)
        records.extend(scanned.get("Items", []))
        cursor = scanned.get("LastEvaluatedKey")
        if not cursor or len(records) >= 25:
            break
    else:
        scan_incomplete = bool(cursor)
    records = records[:25]
    sent = 0
    review = 0
    for outbox in records:
        ids = eligible(outbox)
        if not ids:
            continue
        order_id, event_id, attempt_id = ids
        try:
            row, sid, amount = read_paid_order(order_id, event_id)
            session = stripe_session(sid)
            recipient = verified_recipient(session, row, sid, order_id, attempt_id, amount)
        except (ClientError, urllib.error.HTTPError, urllib.error.URLError,
                TimeoutError, ValueError, KeyError, TypeError, json.JSONDecodeError):
            review += 1
            continue
        try:
            claim(order_id, event_id)
        except ClientError:
            continue  # Already claimed; never send again.
        try:
            delivered = send_receipt(recipient, order_id, amount)
        except ClientError:
            mark(order_id, event_id, "REVIEW_REQUIRED")
            review += 1
            continue
        # If marking SENT fails after SES success, SENDING is deliberately
        # stranded for manual reconciliation; automatic retries could duplicate mail.
        mark(order_id, event_id, "SENT", delivered.get("MessageId"))
        sent += 1
    return response(200, enabled=True, sent=sent, needs_review=review, scan_incomplete=scan_incomplete)
