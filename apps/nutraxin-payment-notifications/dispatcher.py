"""Private, opt-in Nutraxin PAID-order receipt dispatcher.

Never invoked from a public URL. No customer emails are stored in DynamoDB.
Review-only deployment by default: NOTIFICATIONS_ENABLED is false until SES
production access, sender authentication and paid-order acceptance pass.
"""
import json
from html import escape
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

LOGO_URL = "https://novapharmhealthcare.com/assets/brand/novapharm-healthcare-logo.png"
TRACK_URL = "https://novapharmhealthcare.com/products/track/"
SUPPORT = "support@novapharmhealthcare.com"

def gbp(minor):
    return f"£{minor // 100:,}.{minor % 100:02d}"

def receipt_lines(row, amount):
    lines = json.loads(field(row, "approvedLinesJson") or "[]")
    shipping_raw = field(row, "shippingGrossMinor", "N")
    if not isinstance(shipping_raw, str) or not shipping_raw.isdecimal():
        raise ValueError("Verified shipping amount missing")
    shipping = int(shipping_raw)
    if not isinstance(lines, list) or not 1 <= len(lines) <= 100:
        raise ValueError("Verified order lines missing")
    cleaned = []
    for line in lines:
        if not isinstance(line, dict):
            raise ValueError("Invalid order line")
        name, qty, gross = line.get("name"), line.get("quantity"), line.get("grossMinor")
        if (not isinstance(name, str) or not 1 <= len(name) <= 200 or
            any(ord(c) < 32 for c in name) or type(qty) is not int or
            not 1 <= qty <= 10000 or type(gross) is not int or not 0 <= gross <= amount):
            raise ValueError("Invalid approved order line")
        cleaned.append((name, qty, gross))
    if sum(line[2] for line in cleaned) + shipping != amount:
        raise ValueError("Order lines do not reconcile to payment")
    return cleaned, shipping

def receipt_content(order_id, amount, lines, shipping):
    subject = "Thank you for your order."
    intro = "Your payment has been received. Thank you for choosing NovaPharm."
    follow = "We will be in touch when your order is ready for dispatch. Payment confirmation does not mean your order has been dispatched."
    plain_lines = [f"{name} | Quantity: {qty} | {gbp(gross)}" for name, qty, gross in lines]
    body = "\n".join(["NovaPharm Healthcare", "", "Your order is confirmed.", "", intro,
        follow, "", "Order reference: " + order_id, "", *plain_lines,
        "Delivery: " + gbp(shipping), "Total paid (including applicable VAT): " + gbp(amount),
        "", "Check order status (no account required): " + TRACK_URL,
        "Enter the complete order reference above. This service shows status only.",
        "", "At your service.", "For assistance, reply to this email or contact " + SUPPORT + ".",
        "With care,", "NovaPharm Healthcare Ltd"])
    rows = "".join(
        f'<tr><td style="padding:18px 0;border-bottom:1px solid #DEDCD5;vertical-align:top">'
        f'{escape(name)}<br><span style="font-size:13px;color:#525252">Quantity: {qty}</span></td>'
        f'<td align="right" style="padding:18px 0 18px 12px;border-bottom:1px solid #DEDCD5;vertical-align:top;white-space:nowrap">{gbp(gross)}</td></tr>'
        for name, qty, gross in lines)
    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{subject}</title></head>
<body style="margin:0;padding:0;background:#FFFFFF;color:#0B0B0E;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:16px;line-height:1.6">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FFFFFF"><tr><td align="center">
<!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#FFFFFF">
<tr><td style="padding:40px 28px 32px"><img src="{LOGO_URL}" alt="NovaPharm Healthcare" width="240" style="display:block;width:240px;max-width:100%;height:auto;border:0"></td></tr>
<tr><td style="padding:0 28px 28px"><h1 style="font-size:30px;line-height:1.25;font-weight:400;margin:0 0 24px">Your order is confirmed.</h1><p style="margin:0 0 16px">{intro}</p><p style="margin:0">{follow}</p></td></tr>
<tr><td style="padding:0 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8F7F3"><tr><td style="padding:20px"><p style="font-size:13px;color:#525252;margin:0 0 6px">Order reference</p><p style="font-size:14px;margin:0;overflow-wrap:anywhere;word-break:break-all">{escape(order_id)}</p></td></tr></table></td></tr>
<tr><td style="padding:30px 28px"><h2 style="font-size:22px;font-weight:400;margin:0 0 8px">Your selection.</h2>
<table width="100%" cellspacing="0" cellpadding="0" style="font-size:15px;line-height:1.5" aria-label="Order summary">{rows}
<tr><td style="padding:16px 0 6px">Delivery</td><td align="right">{gbp(shipping)}</td></tr>
<tr><td style="padding:8px 0;font-weight:bold">Total paid</td><td align="right" style="font-weight:bold">{gbp(amount)}</td></tr></table>
<p style="font-size:13px;color:#525252;margin:8px 0 24px">Includes applicable VAT.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="border:1px solid #0B0B0E"><a href="{TRACK_URL}" style="display:block;padding:16px;color:#0B0B0E;font-weight:500;text-decoration:none">Check your order status &#8594;</a></td></tr></table>
<p style="font-size:13px;color:#525252;margin:12px 0 0">No account required. Enter your complete order reference to view the recorded status.</p></td></tr>
<tr><td style="padding:0 28px 36px"><h2 style="font-size:22px;font-weight:400;margin:0 0 14px;border-top:1px solid #DEDCD5;padding-top:24px">At your service.</h2><p style="margin:0 0 16px">If you have any questions about your order, simply reply to this email. We would be pleased to assist.</p><p style="margin:0">With care,<br>NovaPharm Healthcare</p></td></tr>
<tr><td style="background:#0B0B0E;color:#FFFFFF;padding:28px;font-size:14px"><h2 style="font-size:20px;font-weight:400;margin:0 0 16px">Customer care</h2><p style="margin:0 0 16px"><a href="mailto:{SUPPORT}" style="color:#FFFFFF;text-decoration:underline">{SUPPORT}</a></p><p style="margin:0 0 16px"><a href="{TRACK_URL}" style="color:#FFFFFF;text-decoration:underline">Order status</a></p><p style="margin:0;font-size:12px">NovaPharm Healthcare Ltd<br>United Kingdom</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>"""
    return subject, body, html

def send_receipt(address, order_id, amount, lines, shipping):
    subject, body, html = receipt_content(order_id, amount, lines, shipping)
    return SES.send_email(
        FromEmailAddress="NovaPharm Healthcare <" + SENDER + ">",
        ReplyToAddresses=[SUPPORT],
        Destination={"ToAddresses": [address]},
        Content={"Simple": {
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {"Text": {"Data": body, "Charset": "UTF-8"},
                     "Html": {"Data": html, "Charset": "UTF-8"}}}})


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
            lines, shipping = receipt_lines(row, amount)
        except (ClientError, urllib.error.HTTPError, urllib.error.URLError,
                TimeoutError, ValueError, KeyError, TypeError, json.JSONDecodeError):
            review += 1
            continue
        try:
            claim(order_id, event_id)
        except ClientError:
            continue  # Already claimed; never send again.
        try:
            delivered = send_receipt(recipient, order_id, amount, lines, shipping)
        except ClientError:
            mark(order_id, event_id, "REVIEW_REQUIRED")
            review += 1
            continue
        # If marking SENT fails after SES success, SENDING is deliberately
        # stranded for manual reconciliation; automatic retries could duplicate mail.
        mark(order_id, event_id, "SENT", delivered.get("MessageId"))
        sent += 1
    return response(200, enabled=True, sent=sent, needs_review=review, scan_incomplete=scan_incomplete)
