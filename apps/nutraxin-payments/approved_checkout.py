"""Private IAM-only live Stripe Checkout for explicitly approved Nutraxin orders.

This Lambda is not exposed directly by API Gateway. Its only caller is the
authenticated, business-approved customer portal. No browser-supplied prices,
taxes, dispatch flags or order approval fields are accepted. It cannot charge
an unapproved quotation. Stripe completion is only credited by the separate
signed production webhook.
"""
import hashlib
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
LEDGER = os.environ["PAYMENT_LEDGER_TABLE"]
KEY_ID = os.environ["STRIPE_API_KEY_SECRET_ID"]
SUCCESS_ORIGIN = "https://novapharmhealthcare.com"
PORTAL_ORIGIN = "https://portal.novapharmhealthcare.com"
MAX_PENCE = 99_999_999
ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{5,99}$")
SESSION = re.compile(r"^cs_live_[A-Za-z0-9]+$")
SKU = re.compile(r"^NUT-UK-[A-Z0-9-]{3,50}$")
db = boto3.client("dynamodb", region_name=REGION)
sm = boto3.client("secretsmanager", region_name=REGION)


class NotReady(ValueError):
    pass


def s(value):
    return {"S": value}


def n(value):
    return {"N": str(value)}


def string(item, name):
    a = (item or {}).get(name, {})
    if not isinstance(a, dict) or "S" not in a:
        raise NotReady("Commercial approval record is incomplete")
    return a["S"]


def number(item, name, allow_zero=False):
    a = (item or {}).get(name, {})
    try:
        val = a["N"]
        if not isinstance(val, str) or not re.fullmatch(r"(0|[1-9][0-9]{0,8})", val):
            raise ValueError()
        value = int(val)
        if not 0 <= value <= MAX_PENCE or (value == 0 and not allow_zero):
            raise ValueError()
        return value
    except (KeyError, TypeError, ValueError):
        raise NotReady("Financial approval amounts are incomplete")


def confirmed(item, name):
    if (item or {}).get(name) != {"BOOL": True}:
        raise NotReady("Commercial checks are incomplete")


def reference(item, name):
    ref = string(item, name)
    if not ID.fullmatch(ref):
        raise NotReady("Approval provenance is missing")
    return ref


def details(order, order_id, subject):
    if string(order, "orderId") != order_id or string(order, "customerSub") != subject:
        raise NotReady("Order does not belong to customer")
    if string(order, "currency") != "GBP" or string(order, "destinationCountry") != "GB":
        raise NotReady("Currency or destination requires approval")
    quote = reference(order, "quoteVersion")
    for field in ("sellerApprovalReference", "deliveryQuoteReference",
                  "taxAssessmentReference", "fulfilmentApprovalReference"):
        reference(order, field)
    for field in ("approvedForPayment", "taxAndShippingVerified",
                  "customerAcceptedTerms", "commerciallyApproved"):
        confirmed(order, field)
    # Owner-approved manufacturer fulfilment commitment is not a claim that
    # physical warehouse units have been reserved.
    if order.get("stockReserved") != {"BOOL": True}:
        confirmed(order, "sellerProductionCommitment")
        confirmed(order, "buyerAcceptsThirtyDayDelivery")
    raw_expiry = (order or {}).get("expiresAtUnix", {}).get("N", "")
    if not isinstance(raw_expiry, str) or not re.fullmatch(r"[1-9][0-9]{9,12}", raw_expiry):
        raise NotReady("Approved order has an invalid expiry")
    expires = int(raw_expiry)
    if expires <= int(time.time()) or expires > int(time.time()) + 31 * 86400:
        raise NotReady("Approved order has expired or has invalid expiry")
    product_net = number(order, "productNetMinor")
    tax = number(order, "taxMinor", allow_zero=True)
    shipping = number(order, "shippingGrossMinor", allow_zero=True)
    total = number(order, "totalGrossMinor")
    if total != product_net + tax + shipping or total < 30:
        raise NotReady("Final approved payable amount does not reconcile")
    try:
        lines = json.loads(string(order, "approvedLinesJson"))
    except (TypeError, ValueError):
        raise NotReady("Approved item lines missing")
    if not isinstance(lines, list) or not 1 <= len(lines) <= 20:
        raise NotReady("Approved item count invalid")
    seen = set()
    gross = 0
    has_delivery = False
    for line in lines:
        if not isinstance(line, dict):
            raise NotReady("Invalid item")
        sku = line.get("sku")
        qty = line.get("quantity")
        name = line.get("name")
        amount = line.get("grossMinor")
        if sku == "DELIVERY-APPROVED":
            if has_delivery or qty != 1 or shipping <= 0 or name != "Approved delivery and handling":
                raise NotReady("Delivery line not approved")
            has_delivery = True
        elif not isinstance(sku, str) or not SKU.fullmatch(sku) or sku in seen or type(qty) is not int or not 1 <= qty <= 10000:
            raise NotReady("Invalid or repeated SKU/quantity")
        if (not isinstance(name, str) or len(name) < 3 or len(name) > 120 or
            any(ord(c) < 32 for c in name) or type(amount) is not int or amount <= 0 or amount > MAX_PENCE):
            raise NotReady("Invalid approved line amount")
        seen.add(sku)
        gross += amount
    if (shipping > 0) != has_delivery or gross != total:
        raise NotReady("Final approved tax, shipping and line items do not reconcile")
    channel = order.get("checkoutChannel")
    if channel is not None and channel != s("PORTAL_RETAIL"):
        raise NotReady("Unknown checkout return channel")
    return {"orderId": order_id, "customerSub": subject, "customerId": subject,
            "quoteVersion": quote, "totalGrossMinor": total, "lines": lines,
            "checkoutChannel": "PORTAL_RETAIL" if channel else "PUBLIC_STORE"}


def stripe_session(order, attempt):
    secret = sm.get_secret_value(SecretId=KEY_ID).get("SecretString", "")
    # Secrets Manager can contain CR/LF pasted after the credential. Trim only
    # line terminators, never the actual Stripe key, and never print secrets.
    if isinstance(secret, str):
        secret = secret.rstrip("\r\n")
    if (not isinstance(secret, str) or len(secret) < 20 or
        not re.fullmatch(r"(?:rk|sk)_live_[A-Za-z0-9_]+", secret)):
        raise NotReady("Stripe live restricted credentials are unavailable")
    # Stripe API 2026-09-30.endive removed payment_method_types from Checkout Sessions.
    # Stripe now selects supported methods; the verified account has active card payments.
    # The return domain comes from the approved order record, never a browser
    # or API-supplied URL. Public storefront checkout remains unchanged.
    if order.get("checkoutChannel") == "PORTAL_RETAIL":
        redirect_base = PORTAL_ORIGIN + "/portal/products/"
        success_url = redirect_base + "?checkout=return&order_id=" + urllib.parse.quote(order["orderId"])
        cancel_url = redirect_base + "?checkout=cancelled&order_id=" + urllib.parse.quote(order["orderId"])
    else:
        success_url = SUCCESS_ORIGIN + "/products/nutraxin/bag/?checkout=return&session_id={CHECKOUT_SESSION_ID}&order_id=" + urllib.parse.quote(order["orderId"])
        cancel_url = SUCCESS_ORIGIN + "/products/nutraxin/bag/?checkout=cancelled"
    form = {
        "mode": "payment",
        "client_reference_id": order["orderId"],
        "billing_address_collection": "required",
        "shipping_address_collection[allowed_countries][0]": "GB",
        "phone_number_collection[enabled]": "true",
        "metadata[delivery_charge_minor]": "0",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "automatic_tax[enabled]": "false",
        "metadata[order_id]": order["orderId"],
        "metadata[customer_id]": order["customerId"],
        "metadata[quote_version]": order["quoteVersion"],
        "metadata[payment_attempt_id]": attempt,
    }
    for i, line in enumerate(order["lines"]):
        prefix = "line_items[" + str(i) + "]"
        form[prefix + "[price_data][currency]"] = "gbp"
        form[prefix + "[price_data][unit_amount]"] = str(line["grossMinor"])
        form[prefix + "[price_data][product_data][name]"] = line["name"] + " x " + str(line["quantity"])
        form[prefix + "[quantity]"] = "1"
    req = urllib.request.Request("https://api.stripe.com/v1/checkout/sessions",
        data=urllib.parse.urlencode(form).encode("utf-8"),
        headers={"Authorization": "Bearer " + secret,
                 "Content-Type": "application/x-www-form-urlencoded",
                 "Idempotency-Key": "np-" + attempt + "-" + order["quoteVersion"]},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            session = json.loads(resp.read(131072))
    except urllib.error.HTTPError as exc:
        # Never log keys, provider free text, buyer information or request bodies.
        code, param = "unknown", "none"
        try:
            error = json.loads(exc.read(8192)).get("error", {})
            value, field = error.get("code", ""), error.get("param", "")
            if isinstance(value, str) and re.fullmatch(r"[a-z_]{1,70}", value):
                code = value
            if isinstance(field, str) and re.fullmatch(r"[a-zA-Z0-9_\[\]]{1,90}", field):
                param = field
        except (ValueError, TypeError, AttributeError):
            pass
        print("STRIPE_CHECKOUT_REJECTED status=" + str(exc.code) + " code=" + code + " param=" + param)
        raise NotReady("Stripe could not create an approved Checkout session")
    except (urllib.error.URLError, TimeoutError):
        print("STRIPE_CHECKOUT_NETWORK_FAILURE")
        raise NotReady("Stripe could not create an approved Checkout session")
    except ValueError:
        print("STRIPE_CHECKOUT_INVALID_RESPONSE")
        raise NotReady("Stripe could not create an approved Checkout session")
    url = session.get("url")
    if (not SESSION.fullmatch(str(session.get("id", ""))) or
        not isinstance(url, str) or not url.startswith("https://checkout.stripe.com/") or
        session.get("livemode") is not True or session.get("mode") != "payment" or
        session.get("currency") != "gbp" or
        session.get("amount_total") != order["totalGrossMinor"]):
        raise NotReady("Unexpected Stripe payment session")
    return session


def transaction_reserve(order):
    order_id = order["orderId"]
    attempt_id = "a" + hashlib.sha256((order_id + "/" + order["quoteVersion"]).encode()).hexdigest()[:32]
    key = {"pk": s("ORDER#" + order_id), "sk": s("SUMMARY")}
    attempt_key = {"pk": s("ORDER#" + order_id), "sk": s("ATTEMPT#" + attempt_id)}
    writes = [
        {"Update": {"TableName": LEDGER, "Key": key,
            "UpdateExpression": "SET #status = :opening, activeAttemptId = :attempt",
            "ConditionExpression": "attribute_exists(pk) AND #status = :approved AND attribute_not_exists(activeAttemptId)",
            "ExpressionAttributeNames": {"#status": "status"},
            "ExpressionAttributeValues": {":approved": s("APPROVED_FOR_PAYMENT"), ":opening": s("OPENING_CHECKOUT"), ":attempt": s(attempt_id)}}},
        {"Put": {"TableName": LEDGER, "Item": {
            **attempt_key, "orderId": s(order_id), "customerId": s(order["customerId"]),
            "quoteVersion": s(order["quoteVersion"]), "paymentAttemptId": s(attempt_id),
            "totalGrossMinor": n(order["totalGrossMinor"]), "paymentStatus": s("CREATING")},
            "ConditionExpression": "attribute_not_exists(pk)"}}
    ]
    try:
        db.transact_write_items(TransactItems=writes)
    except ClientError:
        prior = db.get_item(TableName=LEDGER, Key=key, ConsistentRead=True).get("Item")
        if not prior or prior.get("activeAttemptId") != s(attempt_id):
            raise NotReady("Order checkout is already reserved or changed")
        if string(prior, "status") not in ("OPENING_CHECKOUT", "CHECKOUT_OPEN"):
            raise NotReady("Order cannot open another payment attempt")
    return attempt_id


def attach_session(order, attempt, session):
    order_id = order["orderId"]
    sid = session["id"]
    session_key = {"pk": s("STRIPE_SESSION#" + sid), "sk": s("META")}
    attempt_key = {"pk": s("ORDER#" + order_id), "sk": s("ATTEMPT#" + attempt)}
    meta = {
        **session_key, "sessionId": s(sid),
        "paymentAttemptId": s(attempt), "orderId": s(order_id),
        "customerId": s(order["customerId"]), "quoteVersion": s(order["quoteVersion"]),
        "totalGrossMinor": n(order["totalGrossMinor"]),
    }
    writes = [
        {"Put": {"TableName": LEDGER, "Item": meta,
            "ConditionExpression": "attribute_not_exists(pk)"}},
        {"Update": {"TableName": LEDGER, "Key": attempt_key,
            "UpdateExpression": "SET paymentStatus = :pending, sessionId = :sid, checkoutUrl = :url",
            "ConditionExpression": "attribute_exists(pk) AND paymentStatus = :creating",
            "ExpressionAttributeValues": {":creating": s("CREATING"), ":pending": s("PENDING_STRIPE"),
                                          ":sid": s(sid), ":url": s(session["url"])}}},
        {"Update": {"TableName": LEDGER,
            "Key": {"pk": s("ORDER#" + order_id), "sk": s("SUMMARY")},
            "UpdateExpression": "SET #status = :open, stripeSessionId = :sid",
            "ConditionExpression": "#status = :opening AND activeAttemptId = :attempt",
            "ExpressionAttributeNames": {"#status": "status"},
            "ExpressionAttributeValues": {":opening": s("OPENING_CHECKOUT"), ":open": s("CHECKOUT_OPEN"),
                                          ":attempt": s(attempt), ":sid": s(sid)}}}
    ]
    try:
        db.transact_write_items(TransactItems=writes)
    except ClientError:
        existing = db.get_item(TableName=LEDGER, Key=attempt_key, ConsistentRead=True).get("Item")
        if not existing or existing.get("sessionId") != s(sid) or existing.get("checkoutUrl") != s(session["url"]):
            raise NotReady("Checkout session could not be durably linked")


def response(status, body):
    return {"statusCode": status, "body": json.dumps(body, separators=(",", ":"))}


def handler(event, context):
    # Called with AWS IAM permissions by the verified customer-portal Lambda,
    # not via a public HTTP API. No customer approval fields can be supplied.
    if not isinstance(event, dict) or event.get("action") != "start_approved_checkout":
        return response(403, {"error": "not_authorised"})
    order_id, subject = event.get("orderId"), event.get("subject")
    if (not isinstance(order_id, str) or not ID.fullmatch(order_id) or
        not isinstance(subject, str) or not ID.fullmatch(subject)):
        return response(400, {"error": "invalid_identifiers"})
    try:
        stored = db.get_item(TableName=LEDGER,
            Key={"pk": s("ORDER#" + order_id), "sk": s("SUMMARY")}, ConsistentRead=True).get("Item")
        if not stored:
            return response(404, {"error": "order_not_approved"})
        if string(stored, "customerSub") != subject:
            return response(403, {"error": "order_not_authorised"})
        if string(stored, "status") not in ("APPROVED_FOR_PAYMENT", "OPENING_CHECKOUT", "CHECKOUT_OPEN"):
            return response(409, {"error": "order_awaiting_approval"})
        order = details(stored, order_id, subject)
        attempt = transaction_reserve(order)
        prior = db.get_item(TableName=LEDGER,
            Key={"pk": s("ORDER#" + order_id), "sk": s("ATTEMPT#" + attempt)},
            ConsistentRead=True).get("Item")
        if prior and prior.get("paymentStatus") == s("PENDING_STRIPE"):
            url = string(prior, "checkoutUrl")
            if url.startswith("https://checkout.stripe.com/"):
                return response(200, {"checkoutUrl": url, "orderId": order_id})
        session = stripe_session(order, attempt)
        attach_session(order, attempt, session)
        return response(200, {"checkoutUrl": session["url"], "orderId": order_id})
    except NotReady:
        return response(409, {"error": "approved_checkout_unavailable"})
    except ClientError:
        return response(503, {"error": "payment_ledger_unavailable"})
