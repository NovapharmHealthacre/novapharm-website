"""
NovaPharm Intelligence private, read-only DynamoDB customer authorizer.

No HTTP/API Gateway route. Invoke only from an IAM-authorized, server-side
workload. Never use this as a Cognito callback or allow it to mint sessions.
Until an operator-approved release switch is true, all customers are denied.
"""
import hashlib
import os
import re
from datetime import datetime, timezone
from decimal import Decimal

TABLE = "novapharm-intelligence-customer-access"
COOKIE = re.compile(r"^[A-Za-z0-9_-]{43}$")
SUBJECT = re.compile(r"^[A-Za-z0-9-]{8,128}$")
TENANT = re.compile(r"^[a-z0-9][a-z0-9-]{2,63}$")
FEATURE = re.compile(r"^[a-z][a-z-]{2,63}$")
CUSTOMER = re.compile(r"^cus_[A-Za-z0-9]{6,}$")
SUBSCRIPTION = re.compile(r"^sub_[A-Za-z0-9]{6,}$")
PLANS = {
    "starter": (25, {"medicine-search", "medicine-identity", "us-fda-labels"}),
    "professional": (250, {"medicine-search", "medicine-identity", "us-fda-labels", "observed-market", "geography"}),
    "enterprise": (None, {"medicine-search", "medicine-identity", "us-fda-labels", "observed-market", "geography", "evidence", "reports", "watchlists", "nova", "forecasting", "tenders", "biotech", "capital"}),
}


def _deny(reason):
    return {"allowed": False, "code": reason}


def _iso(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z", value):
        return None
    try:
        x = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return x if x.tzinfo == timezone.utc else None
    except ValueError:
        return None


def _read(table, pk, sk):
    record = table.get_item(Key={"PK": pk, "SK": sk}, ConsistentRead=True)
    if not isinstance(record, dict):
        raise ValueError("Unexpected database result")
    return record.get("Item")


def _is_active(record):
    return isinstance(record, dict) and record.get("status") == "active"


def authorize(event, table, now=None, release_enabled=False):
    """Every positive decision relies on *consistent* server-side ledger reads."""
    if not release_enabled:
        return _deny("production_release_not_approved")
    if not isinstance(event, dict) or set(event) - {"action", "sessionToken", "feature"}:
        # Caller-selected tenant, role, owner or billing must never be used.
        return _deny("request_not_approved")
    token = event.get("sessionToken")
    feature = event.get("feature")
    if not isinstance(token, str) or not COOKIE.fullmatch(token) or not isinstance(feature, str) or not FEATURE.fullmatch(feature):
        return _deny("session_or_feature_invalid")
    now = now if now is not None else datetime.now(timezone.utc)
    if not isinstance(now, datetime) or now.tzinfo is None:
        return _deny("clock_invalid")
    now = now.astimezone(timezone.utc)
    try:
        token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
        session = _read(table, "SESSION#" + token_hash, "META")
        if not _is_active(session) or session.get("tokenHash") != token_hash or session.get("revokedAt") or session.get("identityProvider") != "cognito-oidc" or session.get("mfaVerified") is not True:
            return _deny("session_not_authorised")
        subject, tenant_id = session.get("subject"), session.get("tenantId")
        version = session.get("sessionVersion")
        if not isinstance(subject, str) or not SUBJECT.fullmatch(subject) or not isinstance(tenant_id, str) or not TENANT.fullmatch(tenant_id):
            return _deny("session_identity_invalid")
        if not isinstance(version, int) or isinstance(version, bool) or version < 1:
            return _deny("session_version_invalid")
        issued, expires = _iso(session.get("issuedAt")), _iso(session.get("expiresAt"))
        if not issued or not expires or not issued <= now < expires or (expires - issued).total_seconds() > 43200:
            return _deny("session_expired")
        ttl = session.get("ttlEpoch")
        if not isinstance(ttl, (int, Decimal)) or isinstance(ttl, bool) or int(ttl) <= int(now.timestamp()):
            return _deny("session_expired")

        tenant = _read(table, "TENANT#" + tenant_id, "META")
        member = _read(table, "SUBJECT#" + subject, "TENANT#" + tenant_id)
        seat = _read(table, "TENANT#" + tenant_id, "SEAT#" + subject)
        if not _is_active(tenant) or tenant.get("tenantId") != tenant_id or tenant.get("contractAccepted") is not True or tenant.get("ownershipVerified") is not True or not SUBJECT.fullmatch(str(tenant.get("ownerSubject", ""))):
            return _deny("tenant_not_approved")
        limit, active = tenant.get("seatLimit"), tenant.get("activeSeatCount")
        if not isinstance(limit, int) or not isinstance(active, int) or any(isinstance(x, bool) for x in (limit, active)) or limit < 1 or not 1 <= active <= limit:
            return _deny("tenant_seats_invalid")
        if not _is_active(member) or member.get("tenantId") != tenant_id or member.get("subject") != subject or member.get("approved") is not True or not SUBJECT.fullmatch(str(member.get("approvedBy", ""))):
            return _deny("membership_not_approved")
        if not _is_active(seat) or seat.get("tenantId") != tenant_id or seat.get("subject") != subject or seat.get("sessionVersion") != version or seat.get("role") not in {"owner", "admin", "analyst", "viewer"} or feature not in (seat.get("features") if isinstance(seat.get("features"), list) else []):
            return _deny("seat_not_authorised")

        bill = _read(table, "TENANT#" + tenant_id, "BILLING#" + subject)
        usage = _read(table, "TENANT#" + tenant_id, "USAGE#" + subject + "#" + now.strftime("%Y-%m"))
        governance = _read(table, "GOVERNANCE#PRODUCTION", "FEATURE#" + feature)
        if not _is_active(bill) or bill.get("tenantId") != tenant_id or bill.get("subject") != subject or bill.get("source") != "verified-stripe-webhook-ledger" or bill.get("webhookSignatureVerified") is not True or bill.get("contractAccepted") is not True:
            return _deny("billing_not_verified")
        if not CUSTOMER.fullmatch(str(bill.get("stripeCustomerId", ""))) or not SUBSCRIPTION.fullmatch(str(bill.get("stripeSubscriptionId", ""))):
            return _deny("billing_not_verified")
        from_date, to_date = _iso(bill.get("periodStart")), _iso(bill.get("periodEnd"))
        if not from_date or not to_date or not from_date <= now < to_date:
            return _deny("billing_period_invalid")
        plan = bill.get("plan")
        if plan not in PLANS:
            return _deny("plan_not_approved")
        quota, features = PLANS[plan]
        if feature not in features or feature not in (bill.get("entitledFeatures") if isinstance(bill.get("entitledFeatures"), list) else []):
            return _deny("feature_not_granted")
        if not isinstance(governance, dict) or governance.get("productionApproved") is not True or governance.get("sourceRightsApproved") is not True or not SUBJECT.fullmatch(str(governance.get("approvedBy", ""))):
            return _deny("source_rights_not_approved")
        if not isinstance(usage, dict) or usage.get("tenantId") != tenant_id or usage.get("subject") != subject or usage.get("period") != now.strftime("%Y-%m"):
            return _deny("usage_not_verified")
        used = usage.get("searchCount")
        if not isinstance(used, int) or isinstance(used, bool) or used < 0:
            return _deny("usage_not_verified")
        if plan == "enterprise":
            quota = bill.get("monthlySearchLimit")
            if not isinstance(quota, int) or isinstance(quota, bool) or quota < 1:
                return _deny("contract_quota_missing")
        if feature == "medicine-search" and used >= quota:
            return _deny("search_quota_reached")
        return {"allowed": True, "code": "authorised", "tenantId": tenant_id, "subject": subject, "role": seat["role"], "plan": plan, "remainingSearches": max(0, quota - used)}
    except Exception:
        # Database and SDK failures must not cause permissive fallback.
        return _deny("authorization_unavailable")


def handler(event, _context):
    """Direct IAM Invoke only; no unauthenticated Lambda URL or API route."""
    if isinstance(event, dict) and event.get("action") == "health" and set(event) == {"action"}:
        return {"service": "novapharm-intelligence-customer-authorizer", "mode": "private-read-only", "customerAccessEnabled": os.environ.get("NPI_CUSTOMER_ACCESS_ENABLED") == "true"}
    if not isinstance(event, dict) or event.get("action") != "authorize":
        return _deny("action_not_approved")
    if os.environ.get("NPI_CUSTOMER_ACCESS_ENABLED") != "true":
        return _deny("production_release_not_approved")
    table_name = os.environ.get("NPI_CUSTOMER_ACCESS_TABLE")
    if table_name != TABLE:
        return _deny("authoritative_store_unavailable")
    try:
        import boto3
        table = boto3.resource("dynamodb", region_name="eu-north-1").Table(table_name)
        return authorize(event, table, release_enabled=True)
    except Exception:
        return _deny("authorization_unavailable")
