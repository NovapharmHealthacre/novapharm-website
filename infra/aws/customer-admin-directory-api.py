"""Dedicated owner customer directory candidate. OFF unless explicitly released.
Existing founder sessions alone confer no customer directory permission.
Deploy as a separate Lambda behind the exact HTTPS route with no CORS/cache.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import time
import uuid

ROUTE = "/founder/customer-directory"
GROUP = "novapharm-customer-directory-admin"
MAX_AUTH_AGE = 300

def load(name):
    path = Path(__file__).with_name(name + ".py")
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def response(status, code, data=None):
    return {"statusCode": status, "headers": {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "private, no-store", "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    }, "body": json.dumps({"ok": status == 200, "code": code,
                            **({"directory": data} if status == 200 else {})})}

def group_allowed(cognito, founder):
    groups = cognito.admin_list_groups_for_user(UserPoolId=founder.POOL,
                                                 Username=founder.FOUNDER_EMAIL, Limit=60)
    return (not groups.get("NextToken") and isinstance(groups.get("Groups"), list)
            and any(g.get("GroupName") == GROUP for g in groups["Groups"]))

def get_s(item, name):
    return item.get(name, {}).get("S")

def get_n(item, name):
    return int(item.get(name, {}).get("N", "0"))

def handle(event, *, now, cognito, dynamodb, founder, reader, enabled=False, expected_subject=""):
    if not founder.gateway(event, ROUTE, "GET"):
        return response(401, "directory_authentication_required")
    if enabled is not True or not founder.SUBJECT.fullmatch(expected_subject):
        return response(503, "directory_unavailable")
    token = founder.cookie_token(event)
    if not token:
        return response(401, "directory_authentication_required")
    digest = hashlib.sha256(token.encode("ascii")).hexdigest()
    session_key = founder.key("FOUNDER_SESSION#" + digest)
    try:
        row = dynamodb.get_item(TableName=founder.TABLE, Key=session_key,
                                ConsistentRead=True).get("Item") or {}
        issued, expiry = get_n(row, "issuedEpoch"), get_n(row, "ttlEpoch")
        if (get_s(row, "status") != "active" or get_s(row, "tokenHash") != digest
                or get_s(row, "scope") != founder.SCOPE
                or get_s(row, "subject") != expected_subject
                or get_s(row, "identityProvider") != "cognito-oidc"
                or get_s(row, "mfaAssurance") != "live-mandatory-password-totp-policy"
                or not now - MAX_AUTH_AGE <= issued <= now
                or expiry <= now or expiry - issued > founder.TTL):
            return response(401, "directory_fresh_authentication_required")
        founder.cognito_policy(cognito)
        user = cognito.admin_get_user(UserPoolId=founder.POOL, Username=founder.FOUNDER_EMAIL)
        if (user.get("Enabled") is not True or user.get("UserStatus") != "CONFIRMED"
                or not founder.user_matches(user, expected_subject)
                or not group_allowed(cognito, founder)):
            return response(403, "directory_administrator_required")
        data = reader.read_customer_identities(cognito)
        # Recheck the independently granted group after the directory read.
        if not group_allowed(cognito, founder):
            return response(403, "directory_administrator_required")
        # Condition-check the unchanged active session and record a private audit
        # atomically before any directory records can be returned.
        dynamodb.transact_write_items(TransactItems=[
            {"ConditionCheck": {"TableName": founder.TABLE, "Key": session_key,
                "ConditionExpression": "#st = :active AND tokenHash = :digest AND #sub = :subject AND issuedEpoch = :issued AND ttlEpoch = :expiry",
                "ExpressionAttributeNames": {"#st": "status", "#sub": "subject"},
                "ExpressionAttributeValues": {":active": founder.s("active"),
                    ":digest": founder.s(digest), ":subject": founder.s(expected_subject),
                    ":issued": founder.n(issued), ":expiry": founder.n(expiry)}}},
            {"Put": {"TableName": founder.TABLE,
                "Item": {**founder.key("CUSTOMER_DIRECTORY_AUDIT#" + uuid.uuid4().hex),
                    "event": founder.s("customer-directory-read"),
                    "actorSubject": founder.s(expected_subject),
                    "createdEpoch": founder.n(now)},
                "ConditionExpression": "attribute_not_exists(PK)"}}
        ])
        return response(200, "directory_read", data)
    except Exception:
        # Never log an exception, user attribute, cookie or directory row.
        return response(503, "directory_unavailable")

def handler(event, _context):
    try:
        import boto3
        founder = load("intelligence-founder-session-api")
        reader = load("customer-admin-directory-reader")
        return handle(event, now=int(time.time()), founder=founder, reader=reader,
                      cognito=boto3.client("cognito-idp", region_name=founder.REGION),
                      dynamodb=boto3.client("dynamodb", region_name=founder.REGION),
                      enabled=os.environ.get("CUSTOMER_DIRECTORY_RELEASE_ENABLED") == "true",
                      expected_subject=os.environ.get("CUSTOMER_DIRECTORY_OWNER_SUBJECT", ""))
    except Exception:
        return response(503, "directory_unavailable")
