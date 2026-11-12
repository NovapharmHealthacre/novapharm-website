"""NovaPharm private founder-shell session. This is NOT a customer-access API.

Source of truth: Cognito-authorized OAuth code flow, live enforced PASSWORD
+ SOFTWARE_TOKEN_MFA policy, token-scoped GetUser, and revocable DynamoDB
sessions. Sessions grant ONLY the founder-shell scope, never medicines data,
customer seats, subscriptions, tender actions or billing.
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import uuid
from datetime import datetime, timezone

REGION = "eu-north-1"
API_ID = "q2e6ztf8ic"
DOMAIN = "intelligence.novapharmhealthcare.com"
POOL = "eu-north-1_jBL6hCUE2"
CLIENT = "7c76122stt76k4d8cjvd7tf6ck"
ISSUER = "https://cognito-idp.eu-north-1.amazonaws.com/" + POOL
FOUNDER_EMAIL = "vishal@novapharmhealthcare.com"
TABLE = "novapharm-intelligence-customer-access"
COOKIE = "__Host-npi_founder"
TTL = 1800
SUBJECT = re.compile(r"^[A-Za-z0-9-]{8,128}$")
OPAQUE = re.compile(r"^[A-Za-z0-9_-]{43}$")
BASE = "https://" + DOMAIN
SCOPE = "founder-shell-read-only"


def deny(status, code, clear=False):
    headers = {
        "Cache-Control": "no-store", "Pragma": "no-cache",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Referrer-Policy": "no-referrer",
    }
    if clear:
        headers["Set-Cookie"] = COOKIE + "=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0"
    return {"statusCode": status, "headers": headers,
            "body": json.dumps({"ok": False, "code": code}, separators=(",", ":"))}


def success(code, fields=None, cookie=None):
    response = deny(200, code)
    response["body"] = json.dumps({"ok": True, "code": code, **(fields or {})}, separators=(",", ":"))
    if cookie:
        response["headers"]["Set-Cookie"] = cookie
    return response


def s(value):
    return {"S": str(value)}


def n(value):
    return {"N": str(value)}


def b(value):
    return {"BOOL": value is True}


def key(pk, sk="META"):
    return {"PK": s(pk), "SK": s(sk)}


def gateway(event, route, method):
    if not isinstance(event, dict) or event.get("version") != "2.0":
        return False
    context = event.get("requestContext")
    if not isinstance(context, dict):
        return False
    http = context.get("http") or {}
    return (context.get("apiId") == API_ID and context.get("domainName") == DOMAIN
            and context.get("routeKey") == method + " " + route
            and http.get("method") == method and http.get("path") == route)


def cookie_token(event):
    cookies = event.get("cookies", [])
    if isinstance(cookies, list):
        text = ";".join(x for x in cookies if isinstance(x, str))
    else:
        text = (event.get("headers") or {}).get("cookie", "")
    if not isinstance(text, str) or len(text) > 8192:
        return None
    pairs = [row.strip().partition("=") for row in text.split(";")]
    values = [v for k, eq, v in pairs if k == COOKIE and eq]
    return values[0] if len(values) == 1 and OPAQUE.fullmatch(values[0]) else None


def cognito_policy(cognito):
    """Live policy check; config drift denies all issuance and reads."""
    pool = cognito.describe_user_pool(UserPoolId=POOL)["UserPool"]
    methods = cognito.get_user_pool_mfa_config(UserPoolId=POOL)
    client = cognito.describe_user_pool_client(UserPoolId=POOL, ClientId=CLIENT)["UserPoolClient"]
    if (pool.get("MfaConfiguration") != "ON"
            or (pool.get("Policies") or {}).get("SignInPolicy", {}).get("AllowedFirstAuthFactors") != ["PASSWORD"]
            or (pool.get("LambdaConfig") or {}) != {}
            or pool.get("DeviceConfiguration")
            or methods.get("MfaConfiguration") != "ON"
            or (methods.get("SoftwareTokenMfaConfiguration") or {}).get("Enabled") is not True
            or methods.get("EmailMfaConfiguration")
            or methods.get("SmsMfaConfiguration")
            or client.get("SupportedIdentityProviders") != ["COGNITO"]
            or client.get("AllowedOAuthFlows") != ["code"]
            or client.get("CallbackURLs") != [BASE + "/auth/callback"]
            or "aws.cognito.signin.user.admin" not in (client.get("AllowedOAuthScopes") or [])):
        raise ValueError("Cognito mandatory MFA policy drift")
    return True


def user_matches(user, subject):
    if not SUBJECT.fullmatch(str(subject or "")):
        return False
    attrs = {x.get("Name"): x.get("Value") for x in user.get("UserAttributes", [])}
    return (user.get("Enabled") is not False
            and user.get("UserStatus") in (None, "CONFIRMED")
            and attrs.get("sub") == subject
            and attrs.get("email") == FOUNDER_EMAIL
            and attrs.get("email_verified") == "true"
            and "SOFTWARE_TOKEN_MFA" in (user.get("UserMFASettingList") or [])
            and user.get("PreferredMfaSetting") == "SOFTWARE_TOKEN_MFA")


def bridge_valid(event, id_token, access_token, secret, now):
    """Reject raw browser POSTs even with a stolen bearer token."""
    if not isinstance(secret, str) or len(secret) < 40:
        return False
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    timestamp = headers.get("x-npi-founder-time", "")
    nonce = headers.get("x-npi-founder-nonce", "")
    signature = headers.get("x-npi-founder-proof", "")
    if (not timestamp.isdigit() or len(timestamp) > 12
            or abs(int(timestamp) - now) > 60
            or not re.fullmatch(r"[A-Za-z0-9_-]{22,64}", nonce)
            or not re.fullmatch(r"[a-f0-9]{64}", signature)):
        return False
    message = ".".join([
        timestamp, nonce, hashlib.sha256(id_token.encode("ascii")).hexdigest(),
        hashlib.sha256(access_token.encode("ascii")).hexdigest()
    ]).encode("ascii")
    expected = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def verified_jwt(event, now):
    """API Gateway JWT authorizer is the cryptographic signature authority."""
    authorizer = (event.get("requestContext") or {}).get("authorizer") or {}
    claims = (authorizer.get("jwt") or {}).get("claims") or {}
    if not isinstance(claims, dict):
        return None
    try:
        auth_time = int(claims.get("auth_time", "0"))
        iat = int(claims.get("iat", "0"))
        exp = int(claims.get("exp", "0"))
    except (TypeError, ValueError):
        return None
    sub = claims.get("sub")
    if (claims.get("iss") != ISSUER or claims.get("aud") != CLIENT
            or claims.get("token_use") != "id"
            or claims.get("email") != FOUNDER_EMAIL
            or claims.get("email_verified") not in ("true", True)
            or not SUBJECT.fullmatch(str(sub or ""))
            or auth_time < now - 180 or auth_time > now + 60
            or iat < auth_time or iat > now + 60
            or exp <= now or exp > now + 3600):
        return None
    # Explicit weak/unknown signed MFA claims must never be overridden.
    acr, amr = claims.get("acr"), claims.get("amr")
    if (acr is None) != (amr is None):
        return None
    if acr is not None:
        if acr != "urn:cognito:loa:4":
            return None
        if isinstance(amr, str):
            try:
                amr = json.loads(amr) if amr.startswith("[") else amr.split(",")
            except (ValueError, TypeError):
                return None
        if not isinstance(amr, list) or not {"pwd", "otp", "mfa"}.issubset(set(amr)):
            return None
    return sub


def mint(event, now, cognito, dynamodb, secret):
    if not gateway(event, "/founder/session", "POST"):
        return deny(401, "unauthorised_gateway")
    if (event.get("headers") or {}).get("origin"):
        # The private Next.js Lambda callback initiates POST server-side.
        return deny(403, "browser_issuance_denied")
    claims = (event.get("requestContext", {}).get("authorizer") or {}).get("jwt", {}).get("claims", {})
    subject = verified_jwt(event, now)
    if not subject:
        return deny(401, "signed_founder_identity_required")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    id_token = str(headers.get("authorization", "")).removeprefix("Bearer ")
    try:
        request = json.loads(event.get("body", "{}"))
    except (ValueError, TypeError):
        return deny(400, "request_invalid")
    access_token = request.get("accessToken") if isinstance(request, dict) else None
    if (not isinstance(id_token, str) or len(id_token) < 100
            or not isinstance(access_token, str) or not 100 <= len(access_token) <= 8192
            or not bridge_valid(event, id_token, access_token, secret, now)):
        return deny(401, "server_bridge_required")
    try:
        cognito_policy(cognito)
        current = cognito.get_user(AccessToken=access_token)
        admin = cognito.admin_get_user(UserPoolId=POOL, Username=FOUNDER_EMAIL)
        if not user_matches(current, subject) or not user_matches(admin, subject):
            return deny(401, "founder_factor_not_verified")
        token = secrets.token_urlsafe(32)
        if not OPAQUE.fullmatch(token):
            return deny(503, "session_unavailable")
        digest = hashlib.sha256(token.encode("ascii")).hexdigest()
        expires = now + TTL
        nonce = headers.get("x-npi-founder-nonce")
        ddb_rows = [
            {"Put": {
                "TableName": TABLE, "Item": {
                    **key("FOUNDER_NONCE#" + nonce),
                    "ttlEpoch": n(now + 180), "status": s("consumed"),
                }, "ConditionExpression": "attribute_not_exists(PK)",
            }},
            {"Put": {
                "TableName": TABLE, "Item": {
                    **key("FOUNDER_SESSION#" + digest),
                    "subject": s(subject), "tokenHash": s(digest),
                    "scope": s(SCOPE), "status": s("active"), "issuedEpoch": n(now),
                    "ttlEpoch": n(expires), "identityProvider": s("cognito-oidc"),
                    "mfaAssurance": s("live-mandatory-password-totp-policy"),
                }, "ConditionExpression": "attribute_not_exists(PK)",
            }},
            {"Put": {
                "TableName": TABLE, "Item": {
                    **key("FOUNDER_AUDIT#" + uuid.uuid4().hex),
                    "event": s("session-issued"), "createdEpoch": n(now),
                    "tokenHash": s(digest),
                }, "ConditionExpression": "attribute_not_exists(PK)",
            }},
        ]
        dynamodb.transact_write_items(TransactItems=ddb_rows, ClientRequestToken=uuid.uuid4().hex)
        return success("founder_session_active", {
            "role": "founder", "scope": SCOPE,
            "customerAccess": False, "medicinesDataAccess": False
        }, cookie=COOKIE + "=" + token + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + str(TTL))
    except Exception:
        # No issuer, event, secret, token or personal details in response/logs.
        return deny(503, "founder_session_unavailable")


def active(event, now, cognito, dynamodb):
    if not gateway(event, "/founder/session", "GET"):
        return deny(401, "unauthorised_gateway")
    secret = cookie_token(event)
    if not secret:
        return deny(401, "founder_session_required")
    digest = hashlib.sha256(secret.encode("ascii")).hexdigest()
    try:
        item = dynamodb.get_item(TableName=TABLE,
            Key=key("FOUNDER_SESSION#" + digest), ConsistentRead=True).get("Item")
        if not item:
            return deny(401, "founder_session_not_found")
        status = item.get("status", {}).get("S")
        issued = int(item.get("issuedEpoch", {}).get("N", "0"))
        expiry = int(item.get("ttlEpoch", {}).get("N", "0"))
        subject = item.get("subject", {}).get("S")
        if (status != "active" or item.get("tokenHash", {}).get("S") != digest
                or item.get("scope", {}).get("S") != SCOPE
                or item.get("identityProvider", {}).get("S") != "cognito-oidc"
                or item.get("mfaAssurance", {}).get("S") != "live-mandatory-password-totp-policy"
                or not SUBJECT.fullmatch(str(subject or ""))
                or issued > now or expiry <= now or expiry - issued > TTL):
            return deny(401, "founder_session_revoked_or_expired")
        cognito_policy(cognito)
        user = cognito.admin_get_user(UserPoolId=POOL, Username=FOUNDER_EMAIL)
        if user.get("Enabled") is not True or user.get("UserStatus") != "CONFIRMED" or not user_matches(user, subject):
            return deny(401, "founder_account_not_active")
        return success("founder_session_active", {
            "role": "founder", "scope": SCOPE, "expiresAt": expiry,
            "customerAccess": False, "medicinesDataAccess": False,
        })
    except Exception:
        return deny(503, "founder_session_unavailable")


def logout(event, now, dynamodb):
    if not gateway(event, "/founder/logout", "POST"):
        return deny(401, "unauthorised_gateway", clear=True)
    origin = (event.get("headers") or {}).get("origin")
    if origin != BASE:
        return deny(403, "origin_denied")
    token = cookie_token(event)
    if token is None:
        return success("signed_out", cookie=COOKIE + "=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0")
    digest = hashlib.sha256(token.encode("ascii")).hexdigest()
    try:
        dynamodb.transact_write_items(TransactItems=[
            {"Update": {
                "TableName": TABLE,
                "Key": key("FOUNDER_SESSION#" + digest),
                "UpdateExpression": "SET #status = :revoked, revokedEpoch = :now",
                "ConditionExpression": "#status = :active AND tokenHash = :hash",
                "ExpressionAttributeNames": {"#status": "status"},
                "ExpressionAttributeValues": {
                    ":revoked": s("revoked"), ":now": n(now),
                    ":active": s("active"), ":hash": s(digest),
                },
            }},
            {"Put": {
                "TableName": TABLE,
                "Item": {**key("FOUNDER_AUDIT#" + uuid.uuid4().hex),
                         "event": s("session-revoked"), "tokenHash": s(digest),
                         "createdEpoch": n(now)},
                "ConditionExpression": "attribute_not_exists(PK)",
            }},
        ])
        return success("signed_out", cookie=COOKIE + "=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0")
    except Exception:
        return deny(503, "logout_unavailable", clear=True)


def handle(event, *, now, cognito, dynamodb, bridge_secret):
    ctx = event.get("requestContext") if isinstance(event, dict) else None
    route = ctx.get("routeKey") if isinstance(ctx, dict) else None
    if route == "POST /founder/session":
        return mint(event, now, cognito, dynamodb, bridge_secret)
    if route == "GET /founder/session":
        return active(event, now, cognito, dynamodb)
    if route == "POST /founder/logout":
        return logout(event, now, dynamodb)
    return deny(404, "route_not_found")


def handler(event, _context):
    secret = os.environ.get("NPI_FOUNDER_BRIDGE_KEY", "")
    if len(secret) < 40:
        return deny(503, "service_unavailable")
    try:
        import boto3
        return handle(event, now=int(time.time()),
            cognito=boto3.client("cognito-idp", region_name=REGION),
            dynamodb=boto3.client("dynamodb", region_name=REGION),
            bridge_secret=secret)
    except Exception:
        return deny(503, "service_unavailable")
