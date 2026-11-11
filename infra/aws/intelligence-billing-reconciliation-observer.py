"""
Read-only NovaPharm Intelligence live Stripe reconciliation observer.

No checkout, customer creation, subscriptions, emails, entitlement changes,
medical data reads or mutation calls are performed. The existing webhook
validates Stripe signatures before writing each minimal event to quarantine.
This observer *independently re-fetches* events, invoices and subscriptions
from the live Stripe account before reporting status. It is suitable for a
private, fail-closed readiness gate; NEVER count it as a paid customer launch.
"""
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone

ACCOUNT_ID = "acct_1UZUNv2U9Y3sX5I2"
EVENT_TABLE = "novapharm-intelligence-billing-webhook-events"
ACCESS_TABLE = "novapharm-intelligence-customer-access"
STRIPE_KEY_SECRET = "novapharm/production/stripe/secret-key"
EVENT_RE = re.compile(r"^evt_[A-Za-z0-9]{8,}$")
INVOICE_RE = re.compile(r"^in_[A-Za-z0-9]{6,}$")
CUSTOMER_RE = re.compile(r"^cus_[A-Za-z0-9]{6,}$")
SUB_RE = re.compile(r"^sub_[A-Za-z0-9]{6,}$")
APPROVED_PRICES = {
    "price_1Ua7M92U9Y3sX5I2tVhCoFaq",
    "price_1Ua7NF2U9Y3sX5I2NFDDO3WE",
    "price_1Ua7MB2U9Y3sX5I2UL1Ljxeb",
    "price_1Ua7NH2U9Y3sX5I2bx8WI6wO",
    "price_1Ua7MD2U9Y3sX5I2v7MQm0HS",
}
WATCHED_TYPES = frozenset({
    "invoice.paid", "invoice.payment_failed",
    "customer.subscription.created", "customer.subscription.updated",
    "customer.subscription.deleted", "charge.dispute.created",
    "charge.refunded", "radar.early_fraud_warning.created",
})
MAX_SCANNED = 60
MAX_RESPONSE_BYTES = 350_000


class ReconciliationUnavailable(Exception):
    pass


def _attr_s(item, name):
    value = (item or {}).get(name, {})
    return value.get("S") if isinstance(value, dict) and isinstance(value.get("S"), str) else None


def _attr_bool(item, name):
    value = (item or {}).get(name, {})
    return value.get("BOOL") if isinstance(value, dict) and type(value.get("BOOL")) is bool else None


def _ref(value):
    return value if isinstance(value, str) else value.get("id") if isinstance(value, dict) else None


def invoice_subscription(invoice):
    direct = _ref(invoice.get("subscription"))
    if direct:
        return direct
    parent = invoice.get("parent")
    details = (parent or {}).get("subscription_details") if isinstance(parent, dict) else None
    return _ref((details or {}).get("subscription")) if isinstance(details, dict) else None


def approved_quarantine(item):
    return bool(
        EVENT_RE.fullmatch(_attr_s(item, "event_id") or "") and
        _attr_s(item, "status") == "quarantined_unmapped" and
        _attr_s(item, "event_type") in WATCHED_TYPES and
        _attr_bool(item, "synthetic") is False
    )


def _json_object(value):
    if not isinstance(value, dict):
        raise ReconciliationUnavailable("invalid_stripe_object")
    return value


def normalize_live_key(raw):
    # Secrets Manager's shared key currently has a terminal line break.
    # Normalize only at this private HTTP boundary. Do not change the
    # shared secret that other commerce services may be using.
    if not isinstance(raw, str):
        raise ReconciliationUnavailable("live_key_unavailable")
    key = raw.strip()
    if (not key.startswith(("sk_live_", "rk_live_")) or len(key) < 24 or
            any(ord(char) < 33 or ord(char) > 126 for char in key)):
        raise ReconciliationUnavailable("live_key_unavailable")
    return key


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ReconciliationUnavailable("stripe_redirect_rejected")


def read_live_stripe(key, resource, stripe_id=None):
    if not isinstance(key, str) or not key.startswith(("sk_live_", "rk_live_")) or len(key) < 24:
        raise ReconciliationUnavailable("live_key_unavailable")
    if resource == "account":
        path = "/v1/account"
    elif resource == "events" and EVENT_RE.fullmatch(stripe_id or ""):
        path = "/v1/events/" + stripe_id
    elif resource == "invoices" and INVOICE_RE.fullmatch(stripe_id or ""):
        path = "/v1/invoices/" + stripe_id
    elif resource == "subscriptions" and SUB_RE.fullmatch(stripe_id or ""):
        path = "/v1/subscriptions/" + stripe_id
    else:
        raise ReconciliationUnavailable("stripe_resource_denied")
    request = urllib.request.Request(
        "https://api.stripe.com" + path,
        headers={"Authorization": "Bearer " + key, "Accept": "application/json"},
        method="GET",
    )
    try:
        opener = urllib.request.build_opener(_NoRedirect())
        with opener.open(request, timeout=7) as response:
            if response.status != 200:
                raise ReconciliationUnavailable("live_stripe_unavailable")
            raw = response.read(MAX_RESPONSE_BYTES + 1)
            if len(raw) > MAX_RESPONSE_BYTES:
                raise ReconciliationUnavailable("stripe_response_too_large")
            return _json_object(json.loads(raw))
    except urllib.error.HTTPError as exc:
        # An HTTP status alone is safe to report from a private health probe.
        # Never propagate response bodies, API keys or customer identifiers.
        raise ReconciliationUnavailable("stripe_http_" + str(exc.code)) from exc
    except (urllib.error.URLError, TimeoutError, UnicodeError, ValueError) as exc:
        raise ReconciliationUnavailable("live_stripe_unavailable") from exc


def classify_event(item, fetch, lookup_owner, now_epoch=None):
    """Return a code, never a grant, without trusting Stripe metadata for tenants."""
    if not approved_quarantine(item):
        return "not_verified_quarantine"
    event_id = _attr_s(item, "event_id")
    kind = _attr_s(item, "event_type")
    evt = _json_object(fetch("events", event_id))
    if evt.get("id") != event_id or evt.get("livemode") is not True or (
        evt.get("account") is not None and evt.get("account") != ACCOUNT_ID
    ) or evt.get("type") != kind:
        return "live_event_mismatch"
    obj = ((evt.get("data") or {}).get("object") or {})
    if not isinstance(obj, dict):
        return "invalid_event_object"
    if kind != "invoice.paid":
        # Revocation is separately governed by the fail-closed suspension
        # transaction. Never infer a tenant or grant from invoice metadata.
        return "risk_event_requires_authoritative_reconciliation"

    invoice_id = obj.get("id")
    if not INVOICE_RE.fullmatch(str(invoice_id or "")) or obj.get("object") != "invoice":
        return "paid_invoice_not_verified"
    paid = _json_object(fetch("invoices", invoice_id))
    customer_id = _ref(paid.get("customer"))
    subscription_id = invoice_subscription(paid)
    if (paid.get("id") != invoice_id or paid.get("object") != "invoice" or
            paid.get("livemode") is not True or paid.get("status") != "paid" or
            paid.get("currency") != "inr" or
            type(paid.get("amount_paid")) is not int or paid["amount_paid"] <= 0 or
            not CUSTOMER_RE.fullmatch(str(customer_id or "")) or
            not SUB_RE.fullmatch(str(subscription_id or ""))):
        return "paid_invoice_not_verified"
    subscription = _json_object(fetch("subscriptions", subscription_id))
    items = ((subscription.get("items") or {}).get("data") or [])
    line = items[0] if isinstance(items, list) and len(items) == 1 else {}
    price = line.get("price") if isinstance(line, dict) else None
    price_id = _ref(price)
    latest = _ref(subscription.get("latest_invoice"))
    if (subscription.get("object") != "subscription" or subscription.get("id") != subscription_id or
            subscription.get("livemode") is not True or
            _ref(subscription.get("customer")) != customer_id or
            subscription.get("status") != "active" or latest != invoice_id or
            not isinstance(line, dict) or line.get("quantity") != 1 or
            price_id not in APPROVED_PRICES or
            not isinstance(price, dict) or price.get("currency") != "inr"):
        return "subscription_or_price_not_verified"

    # Owner binding is a unique, independently accepted row in our own ledger;
    # a verified Stripe event, invoice, email or metadata can never create it.
    owner = lookup_owner(customer_id)
    if not isinstance(owner, dict):
        return "customer_owner_not_approved"
    if (_attr_s(owner, "PK") != "STRIPE_CUSTOMER#" + customer_id or
            _attr_s(owner, "SK") != "OWNER" or
            _attr_s(owner, "status") != "approved" or
            _attr_s(owner, "stripeCustomerId") != customer_id):
        return "customer_owner_not_approved"
    # Deliberately no route to a grant. Requires signed contract,
    # entitlement, approval of source rights and transactional worker.
    return "verified_paid_event_pending_full_release"


def run_observer(ddb, stripe_fetch, *, max_events=MAX_SCANNED):
    checked = 0
    codes = {}
    pages = 0
    cursor = None
    while checked < max_events and pages < 4:
        params = {
            "TableName": EVENT_TABLE,
            "Limit": min(60, max_events - checked),
            "ConsistentRead": True,
            "FilterExpression": "#st = :quarantine",
            "ExpressionAttributeNames": {"#st": "status"},
            "ExpressionAttributeValues": {":quarantine": {"S": "quarantined_unmapped"}},
        }
        if cursor:
            params["ExclusiveStartKey"] = cursor
        response = ddb.scan(**params)
        pages += 1
        for item in response.get("Items", []):
            if not approved_quarantine(item):
                continue
            checked += 1
            try:
                code = classify_event(
                    item, stripe_fetch,
                    lambda customer_id: ddb.get_item(
                        TableName=ACCESS_TABLE,
                        Key={"PK": {"S": "STRIPE_CUSTOMER#" + customer_id}, "SK": {"S": "OWNER"}},
                        ConsistentRead=True,
                    ).get("Item"),
                )
            except Exception:
                code = "stripe_or_ledger_temporarily_unavailable"
            codes[code] = codes.get(code, 0) + 1
        cursor = response.get("LastEvaluatedKey")
        if not cursor:
            break
    return {"inspected_events": checked, "outcomes": codes,
            "pagination_remaining": bool(cursor), "grants_created": 0,
            "subscriptions_created": 0, "external_emails_sent": 0}


def handler(event, _context):
    import boto3
    if os.environ.get("NPI_BILLING_RECONCILIATION_MODE") != "observe_only" or (
        os.environ.get("NPI_CUSTOMER_ACCESS_ENABLED") != "false"
    ):
        return {"ok": False, "code": "billing_observer_disabled", "grants_created": 0}
    if not isinstance(event, dict) or event.get("mode", "scan") not in ("scan", "health"):
        return {"ok": False, "code": "invalid_private_invocation", "grants_created": 0}
    if (os.environ.get("BILLING_EVENT_TABLE") != EVENT_TABLE or
            os.environ.get("CUSTOMER_ACCESS_TABLE") != ACCESS_TABLE or
            os.environ.get("STRIPE_KEY_SECRET_ID") != STRIPE_KEY_SECRET):
        return {"ok": False, "code": "billing_observer_configuration_mismatch", "grants_created": 0}
    try:
        secrets = boto3.client("secretsmanager", region_name="eu-north-1")
        secret = normalize_live_key(
            secrets.get_secret_value(SecretId=STRIPE_KEY_SECRET).get("SecretString", "")
        )
        fetch = lambda resource, identifier=None: read_live_stripe(secret, resource, identifier)
        # A live key's account is verified BEFORE interpreting even one event.
        # An empty quarantine must never produce false "connected" confidence.
        account = fetch("account")
        if account.get("id") != ACCOUNT_ID:
            return {"ok": False, "code": "stripe_account_mismatch", "grants_created": 0}
        if event.get("mode") == "health":
            return {"ok": True, "code": "stripe_live_account_verified",
                    "customer_access_enabled": False, "grants_created": 0}
        ddb = boto3.client("dynamodb", region_name="eu-north-1")
        batch = run_observer(ddb, fetch)
        return {"ok": True, "code": "observation_only", **batch}
    except ReconciliationUnavailable as exc:
        # The exception has a fixed, non-sensitive status code; no stack traces.
        return {"ok": False, "code": str(exc), "grants_created": 0}
    except Exception:
        return {"ok": False, "code": "billing_observer_unavailable", "grants_created": 0}
