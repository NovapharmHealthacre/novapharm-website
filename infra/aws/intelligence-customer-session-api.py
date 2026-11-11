"""
NovaPharm Intelligence customer session API (AWS Lambda + API Gateway HTTP API).

Release gate is OFF by default. Requires Gateway-validated Cognito JWT and
preapproved DynamoDB tenant, member, seat, signed billing, quota and governance.
Never provisions users, creates subscriptions or sends emails. Only the private
server stores application-session hashes. A session cannot authorize medicines
data without a separate, scoped medicine-evidence authorizer.
"""
import hashlib
import json
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

REGION = "eu-north-1"
API_ID = "q2e6ztf8ic"
HOST = "intelligence.novapharmhealthcare.com"
ISSUER = "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_jBL6hCUE2"
CLIENT_ID = "7c76122stt76k4d8cjvd7tf6ck"
TABLE = "novapharm-intelligence-customer-access"
COOKIE = "__Host-npi_session"
TTL_SECONDS = 43200
SUBJECT = re.compile(r"^[A-Za-z0-9-]{8,128}$")
TENANT = re.compile(r"^[a-z0-9][a-z0-9-]{2,63}$")
OPAQUE = re.compile(r"^[A-Za-z0-9_-]{43}$")
PLANS = {"starter": 25, "professional": 250, "enterprise": None}

def attr_s(v):
    return {"S": v}

def attr_n(v):
    return {"N": str(v)}

def attr_b(v):
    return {"BOOL": bool(v)}

def attr_l(items):
    return {"L": [attr_s(x) for x in items]}

def encode(data):
    out = {}
    for name, value in data.items():
        if isinstance(value, str):
            out[name] = attr_s(value)
        elif type(value) is bool:
            out[name] = attr_b(value)
        elif isinstance(value, int) and type(value) is not bool:
            out[name] = attr_n(value)
        elif isinstance(value, Decimal) and value.is_finite() and value == value.to_integral_value():
            out[name] = attr_n(int(value))
        elif isinstance(value, list) and all(isinstance(x, str) for x in value):
            out[name] = attr_l(value)
        elif value is None:
            out[name] = {"NULL": True}
        else:
            raise ValueError("Unsupported attribute")
    return out

def decode(item):
    if not isinstance(item, dict):
        return None
    out = {}
    for key, value in item.items():
        if not isinstance(value, dict) or len(value) != 1:
            raise ValueError("Unexpected DynamoDB attribute")
        typ, raw = next(iter(value.items()))
        if typ == "S" and isinstance(raw, str):
            out[key] = raw
        elif typ == "N" and re.fullmatch(r"-?(?:0|[1-9]\d*)(?:\.\d+)?", str(raw)):
            out[key] = Decimal(raw)
        elif typ == "BOOL" and type(raw) is bool:
            out[key] = raw
        elif typ == "NULL" and raw is True:
            out[key] = None
        elif typ == "L" and isinstance(raw, list) and all(isinstance(x, dict) and isinstance(x.get("S"), str) for x in raw):
            out[key] = [x["S"] for x in raw]
        else:
            raise ValueError("Unsupported DynamoDB attribute")
    return out

def instant(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z", value):
        return None
    try:
        v = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return v if v.isoformat(timespec="milliseconds").replace("+00:00", "Z") == value else None
    except ValueError:
        return None

def whole(value, minimum=0):
    if type(value) is bool or not isinstance(value, (int, Decimal)) or value < minimum:
        return None
    if isinstance(value, Decimal) and (not value.is_finite() or value != value.to_integral_value()):
        return None
    return int(value)

def http(status, code, *, cookie=None, info=None):
    headers = {"Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive",
               "Content-Type": "application/json; charset=utf-8", "Referrer-Policy": "no-referrer"}
    if cookie is not None:
        headers["Set-Cookie"] = cookie
    body = {"ok": status == 200, "code": code}
    if info and status == 200:
        body.update(info)
    return {"statusCode": status, "headers": headers, "body": json.dumps(body, separators=(",", ":"))}

def clear_cookie():
    return COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"

def new_cookie(token, seconds):
    return COOKIE + "=" + token + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + str(seconds)

def request_cookie(event):
    raw = event.get("cookies", [])
    if isinstance(raw, list):
        raw = "; ".join(s for s in raw if isinstance(s, str))
    elif not isinstance(raw, str):
        raw = event.get("headers", {}).get("cookie", "")
    if not isinstance(raw, str) or len(raw) > 8192:
        return None
    found = []
    for item in raw.split(";"):
        left, sep, right = item.strip().partition("=")
        if sep and left == COOKIE:
            found.append(right)
    return found[0] if len(found) == 1 and OPAQUE.fullmatch(found[0]) else None

def get(client, pk, sk):
    response = client.get_item(TableName=TABLE, Key={"PK": attr_s(pk), "SK": attr_s(sk)}, ConsistentRead=True)
    return decode(response.get("Item"))

def membership(client, subject):
    response = client.query(TableName=TABLE, ConsistentRead=True,
        KeyConditionExpression="PK = :sub AND begins_with(SK, :prefix)",
        ExpressionAttributeValues={":sub": attr_s("SUBJECT#" + subject), ":prefix": attr_s("TENANT#")},
        Limit=2)
    if response.get("LastEvaluatedKey") or len(response.get("Items", [])) != 1:
        return None
    return decode(response["Items"][0])

def gateway_event(event, route, method):
    if not isinstance(event, dict) or event.get("version") != "2.0":
        return False
    ctx = event.get("requestContext")
    return (isinstance(ctx, dict) and ctx.get("apiId") == API_ID and
            ctx.get("domainName") == HOST and ctx.get("routeKey") == method + " " + route and
            ctx.get("http", {}).get("method") == method and
            ctx.get("http", {}).get("path") == route)

def cognito_subject(event, now):
    jwt = event.get("requestContext", {}).get("authorizer", {}).get("jwt")
    if not isinstance(jwt, dict):
        return None
    claims = jwt.get("claims")
    if not isinstance(claims, dict):
        return None
    try:
        amr = claims.get("amr")
        if isinstance(amr, str):
            amr = json.loads(amr) if amr.startswith("[") else [x.strip() for x in amr.split(",")]
        auth_time = int(claims.get("auth_time", "0"))
    except (ValueError, TypeError):
        return None
    if (claims.get("iss") != ISSUER or claims.get("aud") != CLIENT_ID or
        claims.get("token_use") != "id" or claims.get("acr") != "urn:cognito:loa:4" or
        claims.get("email_verified") not in ("true", True) or
        not isinstance(amr, list) or not {"pwd", "otp", "mfa"}.issubset(set(str(x) for x in amr)) or
        auth_time <= 0 or auth_time > int(now.timestamp()) + 60 or int(now.timestamp()) - auth_time > 300):
        return None
    subject = claims.get("sub")
    return subject if isinstance(subject, str) and SUBJECT.fullmatch(subject) else None

def approved_records(client, subject, now):
    member = membership(client, subject)
    if (not member or member.get("status") != "active" or member.get("approved") is not True or
        member.get("subject") != subject or
        not SUBJECT.fullmatch(str(member.get("approvedBy", ""))) or
        not TENANT.fullmatch(str(member.get("tenantId", "")))):
        return None
    tenant_id = member["tenantId"]
    tenant = get(client, "TENANT#" + tenant_id, "META")
    seat = get(client, "TENANT#" + tenant_id, "SEAT#" + subject)
    billing = get(client, "TENANT#" + tenant_id, "BILLING#" + subject)
    usage = get(client, "TENANT#" + tenant_id, "USAGE#" + subject + "#" + now.strftime("%Y-%m"))
    governance = get(client, "GOVERNANCE#PRODUCTION", "FEATURE#medicine-search")
    if (not tenant or tenant.get("tenantId") != tenant_id or tenant.get("status") != "active" or
        tenant.get("contractAccepted") is not True or tenant.get("ownershipVerified") is not True or
        not SUBJECT.fullmatch(str(tenant.get("ownerSubject", ""))) or
        whole(tenant.get("seatLimit"), 1) is None or whole(tenant.get("activeSeatCount"), 1) is None or
        int(tenant["activeSeatCount"]) > int(tenant["seatLimit"])):
        return None
    if (not seat or seat.get("status") != "active" or seat.get("tenantId") != tenant_id or
        seat.get("subject") != subject or whole(seat.get("sessionVersion"), 1) is None or
        seat.get("role") not in ("owner", "admin", "analyst", "viewer") or
        "medicine-search" not in (seat.get("features") if isinstance(seat.get("features"), list) else [])):
        return None
    if (not billing or billing.get("tenantId") != tenant_id or billing.get("subject") != subject or
        billing.get("status") != "active" or billing.get("contractAccepted") is not True or
        billing.get("webhookSignatureVerified") is not True or billing.get("source") != "verified-stripe-webhook-ledger" or
        not re.fullmatch(r"cus_[A-Za-z0-9]{6,}", str(billing.get("stripeCustomerId", ""))) or
        not re.fullmatch(r"sub_[A-Za-z0-9]{6,}", str(billing.get("stripeSubscriptionId", ""))) or
        billing.get("plan") not in PLANS or
        "medicine-search" not in (billing.get("entitledFeatures") if isinstance(billing.get("entitledFeatures"), list) else [])):
        return None
    start, end = instant(billing.get("periodStart")), instant(billing.get("periodEnd"))
    if not start or not end or not start <= now < end:
        return None
    if not usage or usage.get("tenantId") != tenant_id or usage.get("subject") != subject or usage.get("period") != now.strftime("%Y-%m"):
        return None
    used = whole(usage.get("searchCount"))
    quota = PLANS[billing["plan"]]
    if billing["plan"] == "enterprise":
        quota = whole(billing.get("monthlySearchLimit"), 1)
    if used is None or quota is None or used >= quota:
        return None
    if (not governance or governance.get("customerLaunchAccepted") is not True or
        governance.get("sourceRightsApproved") is not True or governance.get("productionApproved") is not True or
        not SUBJECT.fullmatch(str(governance.get("approvedBy", "")))):
        return None
    return {"member": member, "tenant": tenant, "seat": seat, "billing": billing, "usage": usage,
            "governance": governance, "subject": subject, "tenantId": tenant_id, "periodEnd": end,
            "quota": quota, "used": used}

def transacted_session(client, records, now):
    subject, tenant_id = records["subject"], records["tenantId"]
    secret = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(secret.encode("ascii")).hexdigest()
    end = min(records["periodEnd"], now + timedelta(seconds=TTL_SECONDS))
    if (end - now).total_seconds() < 60:
        return None
    issued, expires = now.isoformat(timespec="milliseconds").replace("+00:00", "Z"), end.isoformat(timespec="milliseconds").replace("+00:00", "Z")
    session = {"PK": "SESSION#" + token_hash, "SK": "META", "tokenHash": token_hash,
        "tenantId": tenant_id, "subject": subject, "status": "active", "identityProvider": "cognito-oidc",
        "mfaVerified": True, "sessionVersion": int(records["seat"]["sessionVersion"]),
        "issuedAt": issued, "expiresAt": expires, "ttlEpoch": int(end.timestamp())}
    audit = {"PK": "AUDIT#" + uuid.uuid4().hex, "SK": "SESSION_CREATED",
        "subject": subject, "tenantId": tenant_id, "tokenHash": token_hash, "eventAt": issued}
    active = {":active": attr_s("active"), ":yes": attr_b(True)}
    def check(pk, sk, expr, values):
        statement = {"TableName": TABLE, "Key": {"PK": attr_s(pk), "SK": attr_s(sk)},
                     "ConditionExpression": expr, "ExpressionAttributeValues": values}
        expression_names = {}
        if "#st" in expr:
            expression_names["#st"] = "status"
        if "#role" in expr:
            expression_names["#role"] = "role"
        if "#src" in expr:
            expression_names["#src"] = "source"
        if "#plan" in expr:
            expression_names["#plan"] = "plan"
        if expression_names:
            statement["ExpressionAttributeNames"] = expression_names
        return {"ConditionCheck": statement}
    tx = [
        check("TENANT#" + tenant_id, "META", "#st = :active AND contractAccepted = :yes AND ownershipVerified = :yes AND ownerSubject = :owner AND activeSeatCount = :seats AND seatLimit = :limit",
            {**active, ":owner": attr_s(records["tenant"]["ownerSubject"]),
             ":seats": attr_n(int(records["tenant"]["activeSeatCount"])),
             ":limit": attr_n(int(records["tenant"]["seatLimit"]))}),
        check("SUBJECT#" + subject, "TENANT#" + tenant_id, "#st = :active AND approved = :yes AND approvedBy = :by AND subject = :subject AND tenantId = :tenant",
            {**active, ":by": attr_s(records["member"]["approvedBy"]), ":subject": attr_s(subject), ":tenant": attr_s(tenant_id)}),
        check("TENANT#" + tenant_id, "SEAT#" + subject,
            "#st = :active AND sessionVersion = :version AND contains(features, :feature) AND tenantId = :tenant AND subject = :subject AND #role = :role",
            {":active": attr_s("active"), ":version": attr_n(int(records["seat"]["sessionVersion"])), ":feature": attr_s("medicine-search"),
             ":tenant": attr_s(tenant_id), ":subject": attr_s(subject), ":role": attr_s(records["seat"]["role"])}),
        check("TENANT#" + tenant_id, "BILLING#" + subject,
            "#st = :active AND webhookSignatureVerified = :yes AND contractAccepted = :yes AND periodStart = :start AND periodEnd = :end AND stripeSubscriptionId = :sub AND stripeCustomerId = :customer AND #src = :src AND #plan = :plan AND tenantId = :tenant AND subject = :subject",
            {**active, ":start": attr_s(records["billing"]["periodStart"]),
             ":end": attr_s(records["billing"]["periodEnd"]), ":sub": attr_s(records["billing"]["stripeSubscriptionId"]),
             ":customer": attr_s(records["billing"]["stripeCustomerId"]), ":src": attr_s("verified-stripe-webhook-ledger"),
             ":plan": attr_s(records["billing"]["plan"]), ":tenant": attr_s(tenant_id), ":subject": attr_s(subject)}),
        check("TENANT#" + tenant_id, "USAGE#" + subject + "#" + now.strftime("%Y-%m"),
            "searchCount = :used AND tenantId = :tenant AND subject = :subject",
            {":used": attr_n(records["used"]), ":tenant": attr_s(tenant_id), ":subject": attr_s(subject)}),
        check("GOVERNANCE#PRODUCTION", "FEATURE#medicine-search",
            "customerLaunchAccepted = :yes AND sourceRightsApproved = :yes AND productionApproved = :yes AND approvedBy = :by",
            {":yes": attr_b(True), ":by": attr_s(records["governance"]["approvedBy"])}),
        {"Put": {"TableName": TABLE, "Item": encode(session), "ConditionExpression": "attribute_not_exists(PK)"}},
        {"Put": {"TableName": TABLE, "Item": encode(audit), "ConditionExpression": "attribute_not_exists(PK)"}},
    ]
    try:
        client.transact_write_items(TransactItems=tx, ClientRequestToken=uuid.uuid4().hex)
    except Exception:
        return None
    return secret, max(1, int((end - now).total_seconds()))

def verified_session(client, secret, now):
    h = hashlib.sha256(secret.encode("ascii")).hexdigest()
    item = get(client, "SESSION#" + h, "META")
    if (not item or item.get("tokenHash") != h or item.get("status") != "active" or
        item.get("revokedAt") or item.get("mfaVerified") is not True or
        item.get("identityProvider") != "cognito-oidc" or
        not TENANT.fullmatch(str(item.get("tenantId", ""))) or
        not SUBJECT.fullmatch(str(item.get("subject", ""))) or
        whole(item.get("sessionVersion"), 1) is None):
        return None
    issued, expires = instant(item.get("issuedAt")), instant(item.get("expiresAt"))
    if not issued or not expires or not issued <= now < expires or (expires - issued).total_seconds() > TTL_SECONDS:
        return None
    if whole(item.get("ttlEpoch"), 1) is None or int(item["ttlEpoch"]) <= int(now.timestamp()):
        return None
    records = approved_records(client, item["subject"], now)
    if not records or records["tenantId"] != item["tenantId"] or int(records["seat"]["sessionVersion"]) != int(item["sessionVersion"]):
        return None
    return records, item

def handle(event, client, now=None, enabled=False):
    now = now or datetime.now(timezone.utc)
    if not isinstance(now, datetime) or now.tzinfo is None:
        return http(503, "service_unavailable")
    now = now.astimezone(timezone.utc)
    ctx = event.get("requestContext", {}) if isinstance(event, dict) else {}
    route = ctx.get("routeKey", "")
    if route == "POST /customer/session":
        if not gateway_event(event, "/customer/session", "POST"):
            return http(401, "authentication_required")
        if not enabled:
            return http(503, "customer_access_not_launched")
        subject = cognito_subject(event, now)
        if not subject:
            return http(401, "mfa_identity_required")
        try:
            records = approved_records(client, subject, now)
            created = transacted_session(client, records, now) if records else None
        except Exception:
            return http(503, "customer_session_service_unavailable")
        if not records:
            return http(403, "customer_approval_required")
        if not created:
            return http(503, "session_commit_unavailable")
        secret, age = created
        return http(200, "approved_customer_session", cookie=new_cookie(secret, age))
    if route == "GET /customer/session":
        if not gateway_event(event, "/customer/session", "GET") or not enabled:
            return http(401, "session_not_available")
        secret = request_cookie(event)
        if not secret:
            return http(401, "session_required")
        try:
            record = verified_session(client, secret, now)
        except Exception:
            record = None
        if not record:
            return http(401, "session_not_authorised")
        data, _ = record
        return http(200, "active", info={"role": data["seat"]["role"], "plan": data["billing"]["plan"]})
    if route == "POST /customer/logout":
        if not gateway_event(event, "/customer/logout", "POST"):
            return http(401, "session_not_available")
        origin = (event.get("headers") or {}).get("origin")
        if origin != "https://" + HOST:
            return http(403, "invalid_origin")
        secret = request_cookie(event)
        if not secret:
            return http(200, "signed_out", cookie=clear_cookie())
        try:
            h = hashlib.sha256(secret.encode("ascii")).hexdigest()
            session = get(client, "SESSION#" + h, "META")
            if session and session.get("status") == "active" and session.get("tokenHash") == h:
                timestamp = now.isoformat(timespec="milliseconds").replace("+00:00", "Z")
                audit = {"PK": "AUDIT#" + uuid.uuid4().hex, "SK": "SESSION_REVOKED",
                    "subject": session["subject"], "tenantId": session["tenantId"],
                    "tokenHash": h, "eventAt": timestamp}
                client.transact_write_items(TransactItems=[
                    {"Update": {"TableName": TABLE, "Key": encode({"PK": "SESSION#" + h, "SK": "META"}),
                        "ConditionExpression": "#st = :active AND tokenHash = :hash",
                        "UpdateExpression": "SET #st = :revoked, revokedAt = :when",
                        "ExpressionAttributeNames": {"#st": "status"},
                        "ExpressionAttributeValues": {":active": attr_s("active"), ":revoked": attr_s("revoked"),
                            ":hash": attr_s(h), ":when": attr_s(timestamp)}}},
                    {"Put": {"TableName": TABLE, "Item": encode(audit),
                        "ConditionExpression": "attribute_not_exists(PK)"}}
                ])
        except Exception:
            # Never claim durable revocation if storage is unavailable.
            return http(503, "revocation_unavailable", cookie=clear_cookie())
        return http(200, "signed_out", cookie=clear_cookie())
    return http(404, "route_not_found")

def handler(event, _context):
    if os.environ.get("NPI_CUSTOMER_ACCESS_TABLE") != TABLE:
        return http(503, "customer_access_not_launched")
    enabled = os.environ.get("NPI_CUSTOMER_ACCESS_ENABLED") == "true"
    if not enabled and (not isinstance(event, dict) or event.get("requestContext", {}).get("routeKey") != "POST /customer/logout"):
        return http(503, "customer_access_not_launched")
    try:
        import boto3
        client = boto3.client("dynamodb", region_name=REGION)
        return handle(event, client, enabled=enabled)
    except Exception:
        return http(503, "customer_session_service_unavailable")
