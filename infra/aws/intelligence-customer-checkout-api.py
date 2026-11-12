"""Private NovaPharm Intelligence subscription Checkout entry point.

This HTTP API Lambda is inert unless an independently accepted release flag,
real verified MFA principal, live customer owner/tenant/seat/contract, source
governance, and atomic pre-Checkout intent reservation all pass. A Stripe
Checkout Session is NOT payment or medicine access. Signed invoice reconciliation
and a separate atomic entitlement transaction remain mandatory.
"""
import base64
import json
import os
import re
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urlparse

API_ID = "q2e6ztf8ic"
HOST = "intelligence.novapharmhealthcare.com"
ISSUER = "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_jBL6hCUE2"
CLIENT_ID = "7c76122stt76k4d8cjvd7tf6ck"
ACCESS_TABLE = "novapharm-intelligence-customer-access"
LIVE_ACCOUNT = "acct_1UZUNv2U9Y3sX5I2"
FEATURE = "medicine-search"
PRICES = {
    ("starter", "monthly"): "price_1Uati52U9Y3sX5I2RJuYixR9",
    ("starter", "annual"): "price_1UatiF2U9Y3sX5I2mv1a22VN",
    ("professional", "monthly"): "price_1UatiH2U9Y3sX5I2Pyqz3SpW",
    ("professional", "annual"): "price_1UatiJ2U9Y3sX5I2CfJFkUnC",
}
SUBJECT = re.compile(r"^[a-zA-Z0-9-]{8,128}$")
TENANT = re.compile(r"^[a-z0-9][a-z0-9-]{2,63}$")
CUSTOMER = re.compile(r"^cus_[A-Za-z0-9]{6,}$")
SESSION = re.compile(r"^cs_live_[A-Za-z0-9]+$")
CONTRACT_VERSION = re.compile(r"^[a-zA-Z0-9._:-]{3,80}$")

def s(v):
    return {"S": v}

def n(v):
    return {"N": str(v)}

def b(v):
    return {"BOOL": v}

def key(pk, sk):
    return {"PK": s(pk), "SK": s(sk)}

def decode(row):
    values = {}
    for k, value in (row or {}).items():
        if "S" in value:
            values[k] = value["S"]
        elif "N" in value:
            values[k] = int(value["N"])
        elif "BOOL" in value:
            values[k] = value["BOOL"]
        elif "L" in value and all("S" in item for item in value["L"]):
            values[k] = [item["S"] for item in value["L"]]
        else:
            values[k] = None
    return values

def reply(status, code, checkout_url=None):
    body = {"ok": status == 200, "code": code}
    if status == 200 and checkout_url:
        body["checkoutUrl"] = checkout_url
    return {"statusCode": status, "headers": {
        "Cache-Control": "no-store", "Pragma": "no-cache",
        "Content-Type": "application/json; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
    }, "body": json.dumps(body, separators=(",", ":"))}

def verified_principal(event, now):
    context = event.get("requestContext", {})
    if (event.get("version") != "2.0" or context.get("apiId") != API_ID or
        context.get("domainName") != HOST or
        context.get("routeKey") != "POST /customer/subscription/checkout" or
        context.get("http", {}).get("method") != "POST" or
        context.get("http", {}).get("path") != "/customer/subscription/checkout"):
        return None
    jwt = context.get("authorizer", {}).get("jwt", {})
    claims = jwt.get("claims") if isinstance(jwt, dict) else None
    if not isinstance(claims, dict):
        return None
    try:
        amr = claims.get("amr")
        if isinstance(amr, str):
            amr = json.loads(amr) if amr.startswith("[") else [v.strip() for v in amr.split(",")]
        auth_time = int(claims.get("auth_time", "0"))
    except (TypeError, ValueError):
        return None
    if (claims.get("iss") != ISSUER or claims.get("aud") != CLIENT_ID or
        claims.get("token_use") != "id" or
        claims.get("acr") != "urn:cognito:loa:4" or
        claims.get("email_verified") not in (True, "true") or
        not isinstance(amr, list) or
        not all(isinstance(method, str) for method in amr) or
        not {"pwd", "otp", "mfa"}.issubset(set(amr)) or
        auth_time <= 0 or auth_time > now + 60 or now - auth_time > 300):
        return None
    sub = claims.get("sub")
    return sub if isinstance(sub, str) and SUBJECT.fullmatch(sub) else None

def payload(event):
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    if headers.get("origin") != "https://" + HOST:
        return None
    if not re.fullmatch(r"application/json(?:;\s*charset=utf-8)?", headers.get("content-type", ""), re.I):
        return None
    body = event.get("body")
    if not isinstance(body, str):
        return None
    try:
        raw = base64.b64decode(body, validate=True) if event.get("isBase64Encoded") else body.encode("utf-8")
        if len(raw) > 512:
            return None
        data = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeError):
        return None
    if not isinstance(data, dict) or set(data) != {"plan", "cycle"}:
        return None
    if not isinstance(data["plan"], str) or not isinstance(data["cycle"], str):
        return None
    selection = (data["plan"], data["cycle"])
    return selection if selection in PRICES else None

def one_membership(db, subject):
    r = db.query(TableName=ACCESS_TABLE, ConsistentRead=True,
        KeyConditionExpression="PK = :sub AND begins_with(SK, :prefix)",
        ExpressionAttributeValues={":sub": s("SUBJECT#" + subject), ":prefix": s("TENANT#")}, Limit=2)
    if r.get("LastEvaluatedKey") or len(r.get("Items", [])) != 1:
        return None
    return decode(r["Items"][0])

def read(db, pk, sk):
    return decode(db.get_item(TableName=ACCESS_TABLE, Key=key(pk, sk),
                              ConsistentRead=True).get("Item"))

def accepted_records(db, sub, plan, cycle):
    member = one_membership(db, sub)
    tenant_id = (member or {}).get("tenantId")
    if (not member or not isinstance(tenant_id, str) or not TENANT.fullmatch(tenant_id) or
        member.get("subject") != sub or member.get("status") != "active" or
        member.get("approved") is not True or
        not SUBJECT.fullmatch(str(member.get("approvedBy", "")))):
        return None
    pk = "TENANT#" + tenant_id
    tenant = read(db, pk, "META")
    seat = read(db, pk, "SEAT#" + sub)
    billing = read(db, pk, "BILLING#" + sub)
    contract = read(db, pk, "CONTRACT#" + sub)
    owner = read(db, pk, "OWNER#" + sub)
    governance = read(db, "GOVERNANCE#PRODUCTION", "FEATURE#medicine-search")
    release = read(db, "GOVERNANCE#PRODUCTION", "BILLING#CHECKOUT")
    records = (tenant, seat, billing, contract, owner, governance, release)
    if any(not x for x in records):
        return None
    customer = billing.get("stripeCustomerId")
    if (not isinstance(customer, str) or not CUSTOMER.fullmatch(customer) or
        tenant.get("tenantId") != tenant_id or tenant.get("status") != "active" or
        tenant.get("ownershipVerified") is not True or tenant.get("contractAccepted") is not True or
        not SUBJECT.fullmatch(str(tenant.get("ownerSubject", ""))) or
        seat.get("subject") != sub or seat.get("tenantId") != tenant_id or
        seat.get("status") != "active" or seat.get("role") not in ("owner", "admin") or
        "medicine-search" not in (seat.get("features") or []) or
        billing.get("status") != "pending" or billing.get("tenantId") != tenant_id or
        billing.get("subject") != sub or billing.get("stripeCustomerId") != customer or
        not isinstance(billing.get("version"), int) or billing["version"] < 1 or
        owner.get("subject") != sub or owner.get("tenantId") != tenant_id or
        owner.get("stripeCustomerId") != customer or owner.get("verified") is not True or
        contract.get("subject") != sub or contract.get("tenantId") != tenant_id or
        contract.get("accepted") is not True or contract.get("acceptedBy") != sub or
        contract.get("stripeCustomerId") != customer or
        contract.get("plan") != plan or contract.get("cycle") != cycle or
        contract.get("stripePriceId") != PRICES[(plan, cycle)] or
        not isinstance(contract.get("version"), str) or
        not CONTRACT_VERSION.fullmatch(contract["version"]) or
        governance.get("customerLaunchAccepted") is not True or
        governance.get("sourceRightsApproved") is not True or
        governance.get("productionApproved") is not True or
        release.get("customerLaunchAccepted") is not True or
        release.get("sourceRightsApproved") is not True or
        release.get("productionRuntimeAccepted") is not True or
        release.get("stripeWebhookAndLedgerAccepted") is not True or
        release.get("billingLedgerWriteAndReplayAccepted") is not True or
        release.get("tenantIsolationAccepted") is not True or
        release.get("taxCodeAndRegistrationsAccepted") is not True or
        release.get("serverSideContractAccepted") is not True or
        release.get("stripeAccountId") != LIVE_ACCOUNT or
        not isinstance(release.get("revision"), int) or release["revision"] < 1):
        return None
    return {"sub": sub, "tenantId": tenant_id, "customer": customer,
            "plan": plan, "cycle": cycle, "price": PRICES[(plan, cycle)],
            "member": member, "tenant": tenant, "seat": seat,
            "billing": billing, "contract": contract, "owner": owner,
            "governance": governance, "release": release}

def condition(pk, sk, expr, values):
    check = {"TableName": ACCESS_TABLE, "Key": key(pk, sk),
             "ConditionExpression": expr,
             "ExpressionAttributeValues": values}
    if "#status" in expr:
        check["ExpressionAttributeNames"] = {"#status": "status"}
    return {"ConditionCheck": check}

def reserve(db, accepted, now):
    tenant_id, sub = accepted["tenantId"], accepted["sub"]
    tpk = "TENANT#" + tenant_id
    intent_id = "intent_" + secrets.token_urlsafe(24)
    expiry = now + 600
    items = [
      {"Put": {"TableName": ACCESS_TABLE, "Item": {
          **key("CHECKOUT#" + intent_id, "META"), "status": s("reserved"),
          "tenantId": s(tenant_id), "subject": s(sub), "stripeCustomerId": s(accepted["customer"]),
          "stripePriceId": s(accepted["price"]), "plan": s(accepted["plan"]),
          "cycle": s(accepted["cycle"]), "contractVersion": s(accepted["contract"]["version"]),
          "createdEpoch": n(now), "expiresEpoch": n(expiry), "ttlEpoch": n(expiry + 86400)},
          "ConditionExpression": "attribute_not_exists(PK)"}},
      {"Put": {"TableName": ACCESS_TABLE, "Item": {
          **key(tpk, "CHECKOUT_LOCK#" + sub), "intentId": s(intent_id),
          "expiresEpoch": n(expiry), "ttlEpoch": n(expiry + 3600)},
          "ConditionExpression": "attribute_not_exists(PK) OR expiresEpoch < :now",
          "ExpressionAttributeValues": {":now": n(now)}}},
      condition(tpk, "META", "#status = :active AND contractAccepted = :yes AND ownershipVerified = :yes AND ownerSubject = :owner",
        {":active": s("active"), ":yes": b(True), ":owner": s(accepted["tenant"]["ownerSubject"])}),
      condition("SUBJECT#" + sub, "TENANT#" + tenant_id,
        "#status = :active AND approved = :yes AND subject = :sub AND tenantId = :tenant",
        {":active": s("active"), ":yes": b(True), ":sub": s(sub), ":tenant": s(tenant_id)}),
      condition(tpk, "SEAT#" + sub,
        "#status = :active AND contains(features, :medicine) AND #role = :role",
        {":active": s("active"), ":medicine": s(FEATURE),
         ":role": s(accepted["seat"]["role"])}),
      condition(tpk, "BILLING#" + sub,
        "#status = :pending AND stripeCustomerId = :customer AND version = :revision",
        {":pending": s("pending"), ":customer": s(accepted["customer"]),
         ":revision": n(accepted["billing"]["version"])}),
      condition(tpk, "CONTRACT#" + sub,
        "accepted = :yes AND acceptedBy = :sub AND #plan = :plan AND #cycle = :cycle AND stripePriceId = :price AND stripeCustomerId = :customer AND version = :contractVersion",
        {":yes": b(True), ":sub": s(sub), ":plan": s(accepted["plan"]), ":cycle": s(accepted["cycle"]),
         ":price": s(accepted["price"]), ":customer": s(accepted["customer"]),
         ":contractVersion": s(accepted["contract"]["version"])}),
      condition(tpk, "OWNER#" + sub,
        "verified = :yes AND stripeCustomerId = :customer",
        {":yes": b(True), ":customer": s(accepted["customer"])}),
      condition("GOVERNANCE#PRODUCTION", "FEATURE#medicine-search",
        "customerLaunchAccepted = :yes AND sourceRightsApproved = :yes AND productionApproved = :yes",
        {":yes": b(True)}),
      condition("GOVERNANCE#PRODUCTION", "BILLING#CHECKOUT",
        "customerLaunchAccepted = :yes AND sourceRightsApproved = :yes AND stripeWebhookAndLedgerAccepted = :yes AND billingLedgerWriteAndReplayAccepted = :yes AND taxCodeAndRegistrationsAccepted = :yes AND productionRuntimeAccepted = :yes AND tenantIsolationAccepted = :yes AND serverSideContractAccepted = :yes AND revision = :revision AND stripeAccountId = :account",
        {":yes": b(True), ":revision": n(accepted["release"]["revision"]),
         ":account": s(LIVE_ACCOUNT)}),
    ]
    # Expression attribute names must be supplied for #plan/#cycle in contract.
    items[4]["ConditionCheck"]["ExpressionAttributeNames"].update({"#role": "role"})
    items[6]["ConditionCheck"].setdefault("ExpressionAttributeNames", {}).update({"#plan": "plan", "#cycle": "cycle"})
    db.transact_write_items(TransactItems=items, ClientRequestToken=secrets.token_hex(16))
    return intent_id

def make_checkout(intent_id, accepted, live_key, stripe_post):
    if not (isinstance(live_key, str) and live_key.startswith(("sk_live_", "rk_live_")) and len(live_key) >= 20):
        raise RuntimeError("stripe_credential_unavailable")
    params = {
        "mode": "subscription", "customer": accepted["customer"],
        "client_reference_id": intent_id, "line_items[0][price]": accepted["price"],
        "line_items[0][quantity]": "1", "automatic_tax[enabled]": "true",
        "tax_id_collection[enabled]": "true", "customer_update[address]": "auto",
        "success_url": "https://" + HOST + "/account/billing/return?session_id={CHECKOUT_SESSION_ID}",
        "cancel_url": "https://" + HOST + "/plans/?checkout=cancelled",
    }
    response = stripe_post("https://api.stripe.com/v1/checkout/sessions",
                           urllib.parse.urlencode(params).encode("ascii"),
                           {"Authorization": "Bearer " + live_key,
                            "Content-Type": "application/x-www-form-urlencoded",
                            "Idempotency-Key": "npi-live-subscription-" + intent_id})
    if (not isinstance(response, dict) or
        response.get("livemode") is not True or response.get("mode") != "subscription" or
        response.get("customer") != accepted["customer"] or
        response.get("currency") != "gbp" or
        not isinstance(response.get("id"), str) or not SESSION.fullmatch(response["id"])):
        raise RuntimeError("stripe_checkout_response_invalid")
    url = response.get("url")
    if not isinstance(url, str) or len(url) > 3000:
        raise RuntimeError("stripe_checkout_response_invalid")
    parsed = urlparse(url)
    if (parsed.scheme != "https" or parsed.hostname != "checkout.stripe.com" or
        parsed.username or parsed.password or parsed.fragment):
        raise RuntimeError("stripe_checkout_response_invalid")
    return response["id"], url

def stripe_post(url, body, headers):
    req = urllib.request.Request(url, body, headers, method="POST")
    with urllib.request.urlopen(req, timeout=10) as res:
        if res.status not in (200, 201):
            raise RuntimeError("stripe_checkout_request_failed")
        raw = res.read(24000)
        return json.loads(raw.decode("utf-8"))

def deliver(db, intent_id, session_id):
    db.update_item(TableName=ACCESS_TABLE,
        Key=key("CHECKOUT#" + intent_id, "META"),
        ConditionExpression="#status = :reserved AND attribute_not_exists(checkoutSessionId)",
        UpdateExpression="SET #status = :open, checkoutSessionId = :session",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={":reserved": s("reserved"), ":open": s("open"), ":session": s(session_id)})

def handle(event, *, db, secret_key, transport=stripe_post, now=None, enabled=False):
    # This is first, BEFORE any DynamoDB or Stripe operation.
    if not enabled:
        return reply(503, "subscription_checkout_not_released")
    now = int(time.time()) if now is None else now
    if not isinstance(event, dict):
        return reply(403, "identity_not_verified")
    sub = verified_principal(event, now)
    if not sub:
        return reply(403, "identity_not_verified")
    selected = payload(event)
    if not selected:
        return reply(400, "plan_or_cycle_invalid")
    try:
        accepted = accepted_records(db, sub, *selected)
        if not accepted:
            return reply(403, "customer_contract_or_tenant_not_accepted")
        intent = reserve(db, accepted, now)
        session_id, url = make_checkout(intent, accepted, secret_key(), transport)
        deliver(db, intent, session_id)
        # This URL is NOT a payment receipt. The webhook reconciling a paid
        # Stripe invoice is the ONLY route to a customer subscription grant.
        return reply(200, "checkout_session_created_no_entitlement", url)
    except Exception:
        # No sensitive DB, Stripe, token, or error details in a public response.
        return reply(503, "subscription_checkout_unavailable")

def handler(event, _context):
    import boto3
    enabled = os.environ.get("NPI_SUBSCRIPTION_CHECKOUT_ENABLED") == "true"
    if not enabled:
        return reply(503, "subscription_checkout_not_released")
    arn = os.environ.get("NPI_STRIPE_SECRET_ARN", "")
    if not arn.startswith("arn:aws:secretsmanager:eu-north-1:"):
        return reply(503, "subscription_checkout_not_released")
    db = boto3.client("dynamodb", region_name="eu-north-1")
    def secret_key():
        return boto3.client("secretsmanager", region_name="eu-north-1").get_secret_value(SecretId=arn)["SecretString"]
    return handle(event, db=db, secret_key=secret_key, enabled=True)
