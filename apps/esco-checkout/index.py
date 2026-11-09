"""ESCO Anand isolated server-authoritative Stripe Checkout with zero default saleable SKUs.

Public catalog references and browser guide prices have no payment authority.
Commercial and regulatory approvals must be present in protected SSM policy for
exact variant SKU before this Lambda creates a Checkout Session.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "eu-north-1")
POLICY_PARAMETER = os.environ.get("POLICY_PARAMETER", "")
ORDERS_TABLE = os.environ.get("ORDERS_TABLE", "")
STRIPE_SECRET_ID = os.environ.get("STRIPE_SECRET_ID", "")
WEBHOOK_SECRET_ID = os.environ.get("WEBHOOK_SECRET_ID", "")
STORE_ORIGIN = "https://novapharmhealthcare.com"
ALLOWED_ORIGINS = {STORE_ORIGIN, "https://www.novapharmhealthcare.com"}
UUID4 = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
CAT_ID = re.compile(r"^ESCO-CAT-[0-9]{4}$")
PRICE_ID = re.compile(r"^price_[A-Za-z0-9]{8,}$")
SESSION_ID = re.compile(r"^cs_live_[A-Za-z0-9]+$")
MAX_LINES = 12
MAX_QTY = 1000
MAX_SUBTOTAL = 99999999

def aws(service):
    return boto3.client(service, region_name=REGION)

def respond(status, data):
    return {"statusCode": status, "headers": {"content-type": "application/json",
        "cache-control": "no-store", "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer"}, "body": json.dumps(data, separators=(",", ":"))}

def fail(status, code):
    return respond(status, {"error": code})

def policy():
    if not POLICY_PARAMETER:
        raise ValueError("policy missing")
    raw = aws("ssm").get_parameter(Name=POLICY_PARAMETER, WithDecryption=True)["Parameter"]["Value"]
    cfg = json.loads(raw)
    if not isinstance(cfg, dict) or not isinstance(cfg.get("approved_skus"), dict):
        raise ValueError("invalid policy")
    return cfg

def secret(name):
    if not name:
        raise ValueError("secret name missing")
    value = aws("secretsmanager").get_secret_value(SecretId=name)["SecretString"]
    if not isinstance(value, str):
        raise ValueError("secret payload invalid")
    # AWS Console plaintext saves can include an accidental final newline.
    # Strip only transport whitespace, not the cryptographic key's content.
    value = value.strip(" \t\r\n")
    if name == WEBHOOK_SECRET_ID and not re.fullmatch(r"whsec_[A-Za-z0-9]+", value):
        raise ValueError("webhook signing secret invalid")
    if name == STRIPE_SECRET_ID and not re.fullmatch(r"(?:sk|rk)_live_[A-Za-z0-9]+", value):
        raise ValueError("Stripe live key invalid")
    return value

def eligible(item):
    if not isinstance(item, dict):
        return False
    owner_estimate = item.get("commercial_basis") == "owner_authorised_estimate"
    required = ("commercial_approved", "uk_product_classification_verified",
        "uk_product_safety_verified", "tax_classification_verified", "delivery_verified",
        "stock_allocatable_verified", "manufacturer_supply_authorised", "variants_resolved")
    if any(item.get(k) is not True for k in required):
        return False
    kind = item.get("regulatory_type")
    if kind == "medical_device":
        if any(item.get(k) is not True for k in ("mhra_registration_verified",
            "conformity_documents_verified", "uk_responsible_person_verified")):
            return False
    elif kind != "general_goods":
        return False
    amount, stock = item.get("unit_price_pence"), item.get("available_to_promise_units")
    if any(type(v) is not int for v in (amount, stock)):
        return False
    if not (1 <= amount <= MAX_SUBTOTAL and 1 <= stock <= 10000):
        return False
    if owner_estimate:
        # Explicit merchant-authorised estimate mode. Never label projected costs
        # as actual; the 25% margin is conditional on true costs being below caps.
        if (item.get("owner_authorised_release") is not True or
            item.get("owner_accepts_unverified_landed_cost") is not True or
            item.get("regulatory_evidence_basis") != "merchant_attestation" or
            item.get("pricing_mode") != "approved_inline" or
            item.get("price_includes_gb_delivery") is not True):
            return False
        projected = tuple(item.get(k) for k in (
            "outbound_delivery_budget_pence", "processing_fee_budget_pence",
            "storage_budget_pence", "supplier_inbound_cost_ceiling_pence"))
        if any(type(x) is not int or x < 0 for x in projected):
            return False
        if not projected[3] or 4 * sum(projected) > 3 * amount:
            return False
    else:
        if item.get("supplier_cost_verified") is not True:
            return False
        cost = item.get("actual_variable_cost_pence")
        if type(cost) is not int or not 0 <= cost <= amount:
            return False
        if cost * 4 > amount * 3:
            return False
    pricing_mode = item.get("pricing_mode", "precreated")
    tax_code = str(item.get("stripe_tax_code", ""))
    price_configured = (pricing_mode == "approved_inline" and
        bool(re.fullmatch(r"txcd_[0-9]{8}", tax_code)) and
        item.get("price_includes_gb_delivery") is True) or (
        pricing_mode == "precreated" and
        bool(PRICE_ID.fullmatch(str(item.get("stripe_price_id", "")))))
    return bool(price_configured and
        isinstance(item.get("name"), str) and 2 <= len(item["name"]) <= 180 and
        item.get("currency") == "gbp" and item.get("tax_behavior") == "exclusive")

def stripe_request(method, path, api_key, params=None, idempotency=None):
    if not isinstance(api_key, str) or not (api_key.startswith("rk_live_") or api_key.startswith("sk_live_")):
        raise ValueError("no live Stripe key")
    url = "https://api.stripe.com/v1/" + path
    data = urllib.parse.urlencode(params).encode("utf-8") if params is not None else None
    if method == "GET" and data is not None:
        url += "?" + data.decode("utf-8")
        data = None
    headers = {"Authorization": "Bearer " + api_key,
               "Stripe-Version": "2026-09-30.endive",
               "Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    if idempotency:
        headers["Idempotency-Key"] = idempotency
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(request, timeout=12) as response:
        return json.loads(response.read(1000000).decode("utf-8"))

def verified_stripe_prices(lines, approved, key):
    subtotal = 0
    for line in lines:
        record = approved[line["id"]]
        if record.get("pricing_mode") == "approved_inline":
            # The private SKU approval record is the price authority. The client is not.
            subtotal += record["unit_price_pence"] * line["quantity"]
            if subtotal > MAX_SUBTOTAL:
                raise ValueError("basket exceeds limit")
            continue
        price = stripe_request("GET", "prices/" + record["stripe_price_id"], key)
        if (price.get("id") != record["stripe_price_id"] or price.get("active") is not True or
            price.get("currency") != "gbp" or price.get("unit_amount") != record["unit_price_pence"] or
            price.get("tax_behavior") != "exclusive" or not isinstance(price.get("product"), str)):
            raise ValueError("Stripe price does not match approved SKU")
        product = stripe_request("GET", "products/" + price["product"], key)
        if (product.get("active") is not True or not re.fullmatch(
                r"txcd_[0-9]{8}", str(product.get("tax_code", "")))):
            raise ValueError("product tax classification missing")
        if product.get("tax_code") != record.get("stripe_tax_code"):
            raise ValueError("product tax code differs from approval")
        subtotal += record["unit_price_pence"] * line["quantity"]
        if subtotal > MAX_SUBTOTAL:
            raise ValueError("basket exceeds limit")
    return subtotal

def checkout(event):
    headers = {str(k).lower(): str(v) for k, v in (event.get("headers") or {}).items()}
    if headers.get("origin") not in ALLOWED_ORIGINS:
        return fail(403, "invalid_origin")
    raw = event.get("body") or ""
    if event.get("isBase64Encoded") or not isinstance(raw, str) or len(raw) > 8192:
        return fail(400, "invalid_payload")
    try:
        request = json.loads(raw)
        request_id, lines = request["request_id"], request["lines"]
    except (ValueError, TypeError, KeyError):
        return fail(400, "invalid_basket")
    if (not isinstance(request, dict) or request.get("accept_terms") is not True or
        not isinstance(request_id, str) or not UUID4.fullmatch(request_id) or
        not isinstance(lines, list) or not 1 <= len(lines) <= MAX_LINES):
        return fail(400, "invalid_basket")
    if set(request) != {"request_id", "lines", "accept_terms"}:
        return fail(400, "unexpected_client_fields")
    try:
        cfg = policy()
    except (ClientError, ValueError, KeyError, TypeError):
        return fail(503, "checkout_policy_unavailable")
    if cfg.get("enabled") is not True or cfg.get("webhook_verified") is not True:
        return fail(503, "esco_payment_not_released")
    approved = cfg["approved_skus"]
    seen = set()
    for row in lines:
        if (not isinstance(row, dict) or set(row) != {"id", "quantity"} or
            not isinstance(row["id"], str) or not CAT_ID.fullmatch(row["id"]) or
            row["id"] in seen or type(row["quantity"]) is not int or
            not 1 <= row["quantity"] <= MAX_QTY):
            return fail(400, "invalid_sku_or_quantity")
        record = approved.get(row["id"])
        if not eligible(record):
            return fail(422, "item_not_authorised_for_uk_checkout")
        if row["quantity"] > record["available_to_promise_units"]:
            return fail(422, "insufficient_allocatable_stock")
        seen.add(row["id"])
    if not ORDERS_TABLE:
        return fail(503, "order_ledger_unavailable")
    order_id = "ESCO-" + request_id
    canonical = sorted((r["id"], r["quantity"]) for r in lines)
    basket_hash = hashlib.sha256(json.dumps(canonical, separators=(",", ":")).encode()).hexdigest()
    ledger = aws("dynamodb")
    key = {"pk": {"S": "ORDER#" + order_id}, "sk": {"S": "SUMMARY"}}
    try:
        existing = ledger.get_item(TableName=ORDERS_TABLE, Key=key, ConsistentRead=True).get("Item")
    except ClientError:
        return fail(503, "order_ledger_unavailable")
    if existing:
        if existing.get("basketHash", {}).get("S") != basket_hash:
            return fail(409, "request_id_already_used")
        previous = existing.get("checkoutUrl", {}).get("S", "")
        if previous.startswith("https://checkout.stripe.com/"):
            return respond(200, {"orderId": order_id, "checkoutUrl": previous})
        return fail(409, "checkout_request_in_progress")
    try:
        api_key = secret(STRIPE_SECRET_ID)
        subtotal = verified_stripe_prices(lines, approved, api_key)
        entry = {**key, "orderId": {"S": order_id}, "brand": {"S": "ESCO"},
            "basketHash": {"S": basket_hash}, "state": {"S": "INITIALISING"},
            "currency": {"S": "GBP"}, "subtotalMinor": {"N": str(subtotal)},
            "createdAtUnix": {"N": str(int(time.time()))},
            "linesJson": {"S": json.dumps(canonical, separators=(",", ":"))}}
        ledger.put_item(TableName=ORDERS_TABLE, Item=entry,
                        ConditionExpression="attribute_not_exists(pk)")
        params = {"mode": "payment", "automatic_tax[enabled]": "true",
            "shipping_address_collection[allowed_countries][0]": "GB",
            "customer_creation": "always", "client_reference_id": order_id,
            "success_url": STORE_ORIGIN + "/products/esco/bag/?checkout=return&order_id=" + order_id + "&session_id={CHECKOUT_SESSION_ID}",
            "cancel_url": STORE_ORIGIN + "/products/esco/bag/?checkout=cancelled",
            "metadata[brand]": "ESCO", "metadata[order_id]": order_id,
            "metadata[basket_hash]": basket_hash,
            "integration_identifier": "novapharm-esco-" + "".join(chr(97 + int(ch, 16)) for ch in hashlib.sha256(request_id.encode()).hexdigest()[:8])}
        for i, row in enumerate(lines):
            record = approved[row["id"]]
            if record.get("pricing_mode") == "approved_inline":
                prefix = "line_items[%d][price_data]" % i
                params[prefix + "[currency]"] = "gbp"
                params[prefix + "[unit_amount]"] = record["unit_price_pence"]
                params[prefix + "[tax_behavior]"] = "exclusive"
                params[prefix + "[product_data][name]"] = record["name"]
                params[prefix + "[product_data][tax_code]"] = record["stripe_tax_code"]
                params[prefix + "[product_data][metadata][catalogue_id]"] = row["id"]
            else:
                params["line_items[%d][price]" % i] = record["stripe_price_id"]
            params["line_items[%d][quantity]" % i] = row["quantity"]
        created = stripe_request("POST", "checkout/sessions", api_key,
                                 params=params, idempotency="esco-" + request_id)
        sid, url = created.get("id", ""), created.get("url", "")
        if not SESSION_ID.fullmatch(str(sid)) or not str(url).startswith("https://checkout.stripe.com/"):
            return fail(503, "checkout_session_unavailable")
        ledger.update_item(TableName=ORDERS_TABLE, Key=key,
            UpdateExpression="SET #s=:open, sessionId=:sid, checkoutUrl=:url",
            ConditionExpression="#s=:initial",
            ExpressionAttributeNames={"#s": "state"},
            ExpressionAttributeValues={":open": {"S": "CHECKOUT_OPEN"}, ":sid": {"S": sid},
                                       ":url": {"S": url}, ":initial": {"S": "INITIALISING"}})
        return respond(200, {"orderId": order_id, "checkoutUrl": url})
    except (ClientError, ValueError, KeyError, TypeError, urllib.error.URLError):
        return fail(503, "secure_checkout_unavailable")

def parse_signature(body, header, signing_secret):
    if not isinstance(signing_secret, str) or not signing_secret.startswith("whsec_"):
        raise ValueError("signing secret missing")
    if not isinstance(header, str) or len(header) > 1500:
        raise ValueError("signature missing")
    pairs = [part.strip().split("=", 1) for part in header.split(",") if "=" in part]
    timestamps = [v for k, v in pairs if k == "t" and re.fullmatch(r"[0-9]{9,12}", v)]
    sigs = [v for k, v in pairs if k == "v1" and re.fullmatch(r"[a-fA-F0-9]{64}", v)]
    if len(timestamps) != 1 or not sigs:
        raise ValueError("invalid signature header")
    stamp = int(timestamps[0])
    if abs(time.time() - stamp) > 300:
        raise ValueError("signature expired")
    expected = hmac.new(signing_secret.encode(), str(stamp).encode() + b"." + body,
                        hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, sig.lower()) for sig in sigs):
        raise ValueError("bad signature")
    event = json.loads(body.decode("utf-8"))
    if event.get("livemode") is not True or not re.fullmatch(r"evt_[A-Za-z0-9]+", str(event.get("id", ""))):
        raise ValueError("invalid mode or event id")
    return event

def webhook(event):
    headers = {str(k).lower(): str(v) for k, v in (event.get("headers") or {}).items()}
    try:
        raw = event.get("body") or ""
        body = base64.b64decode(raw) if event.get("isBase64Encoded") else raw.encode("utf-8")
        if not body or len(body) > 1000000:
            return fail(400, "invalid_event")
        signed = parse_signature(body, headers.get("stripe-signature", ""),
                                 secret(WEBHOOK_SECRET_ID))
    except (ValueError, TypeError, UnicodeError, KeyError, ClientError):
        return fail(400, "invalid_signature")
    if signed.get("type") not in ("checkout.session.completed",
        "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed",
        "checkout.session.expired"):
        return respond(200, {"ignored": True})
    session = signed.get("data", {}).get("object", {})
    if session.get("metadata", {}).get("brand") != "ESCO":
        return respond(200, {"ignored": True})
    sid = str(session.get("id", ""))
    order_id = str(session.get("metadata", {}).get("order_id", ""))
    if not SESSION_ID.fullmatch(sid) or not re.fullmatch(
        r"ESCO-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", order_id):
        return fail(422, "unmatched_session")
    if not ORDERS_TABLE:
        return fail(503, "ledger_unavailable")
    db = aws("dynamodb")
    key = {"pk": {"S": "ORDER#" + order_id}, "sk": {"S": "SUMMARY"}}
    try:
        stored = db.get_item(TableName=ORDERS_TABLE, Key=key, ConsistentRead=True).get("Item")
        if not stored:
            return fail(503, "unknown_order")
        if (stored.get("sessionId", {}).get("S") != sid or
            stored.get("basketHash", {}).get("S") != session.get("metadata", {}).get("basket_hash") or
            stored.get("subtotalMinor", {}).get("N") != str(session.get("amount_subtotal")) or
            session.get("currency") != "gbp" or session.get("client_reference_id") != order_id or
            session.get("livemode") is not True or
            type(session.get("amount_total")) is not int or
            session["amount_total"] < int(stored["subtotalMinor"]["N"])):
            return fail(422, "stripe_reconciliation_failed")
        type_ = signed["type"]
        if type_ in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
            if session.get("payment_status") != "paid":
                return respond(200, {"pending": True})
            new_state = "PAID"
        else:
            new_state = "PAYMENT_FAILED"
        current = stored.get("state", {}).get("S", "")
        if current == new_state or current == "PAID":
            return respond(200, {"duplicate": True})
        if current != "CHECKOUT_OPEN":
            return fail(503, "payment_state_not_ready")
        db.update_item(TableName=ORDERS_TABLE, Key=key,
            UpdateExpression="SET #s=:new, stripeEventId=:eid, chargedAmountMinor=:amt",
            ConditionExpression="#s=:open AND sessionId=:sid",
            ExpressionAttributeNames={"#s": "state"},
            ExpressionAttributeValues={":new": {"S": new_state}, ":eid": {"S": signed["id"]},
                ":amt": {"N": str(session["amount_total"])},
                ":open": {"S": "CHECKOUT_OPEN"}, ":sid": {"S": sid}})
        return respond(200, {"processed": True})
    except (ClientError, KeyError, ValueError, TypeError):
        return fail(503, "payment_ledger_unavailable")

def order_status(event, order_id):
    headers = {str(k).lower(): str(v) for k, v in (event.get("headers") or {}).items()}
    if headers.get("origin") not in ALLOWED_ORIGINS:
        return fail(403, "invalid_origin")
    if not isinstance(order_id, str) or not UUID4.fullmatch(order_id.removeprefix("ESCO-")):
        return fail(400, "invalid_order_id")
    try:
        found = aws("dynamodb").get_item(
            TableName=ORDERS_TABLE,
            Key={"pk": {"S": "ORDER#" + order_id}, "sk": {"S": "SUMMARY"}},
            ConsistentRead=True).get("Item")
    except ClientError:
        return fail(503, "order_status_unavailable")
    if not found or found.get("brand") != {"S": "ESCO"}:
        return fail(404, "order_not_found")
    state = found.get("state", {}).get("S", "PROCESSING")
    return respond(200, {"orderId": order_id, "status": state if state in
        ("PAID", "PAYMENT_FAILED", "CHECKOUT_OPEN") else "PROCESSING", "paid": state == "PAID"})

def handler(event, context=None):
    path = event.get("rawPath") or "/"
    method = (event.get("requestContext") or {}).get("http", {}).get("method", "GET")
    if method == "OPTIONS":
        return respond(204, {})
    if method == "GET" and path == "/readiness":
        try:
            cfg = policy()
            approved = [id for id, value in cfg["approved_skus"].items()
                        if CAT_ID.fullmatch(str(id)) and eligible(value)]
            ready = bool(cfg.get("enabled") is True and cfg.get("webhook_verified") is True and approved)
            return respond(200, {"checkout_ready": ready, "approved_catalogue_ids": approved if ready else [],
                "approved_unit_prices_pence": {id: cfg["approved_skus"][id]["unit_price_pence"] for id in approved} if ready else {},
                "currency": "GBP", "checkout_path": "/products/esco/bag/",
                "payment_collection_active": ready})
        except (ClientError, KeyError, ValueError, TypeError):
            return respond(200, {"checkout_ready": False, "approved_catalogue_ids": [],
                "currency": "GBP", "payment_collection_active": False})
    if method == "GET" and path.startswith("/status/"):
        return order_status(event, path.removeprefix("/status/"))
    if method == "POST" and path == "/checkout":
        return checkout(event)
    if method == "POST" and path == "/stripe/webhook":
        return webhook(event)
    return fail(404, "not_found")
