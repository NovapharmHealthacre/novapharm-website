"""Private grant issuance contract, not a public HTTP route or deployed worker.

The approval record must originate in a separately authenticated, authorised
administrator workflow. This module cannot create approvals, send emails,
change pricing, or derive personal occasion evidence. No automatic invocation.
"""
import hashlib
import json
import re

APPROVAL_ID = re.compile(r"^[a-f0-9]{32}$")
SUBJECT = re.compile(r"^consumer_[a-f0-9]{32}$")
REFERENCE = re.compile(r"^[A-Za-z0-9_-]{8,96}$")
OCCASIONS = {"birthday", "replenishment", "comeback", "seasonal"}


def S(value):
    return {"S": value}


def N(value):
    return {"N": str(value)}


def field(row, name):
    return row.get(name, {}).get("S")


def issue_approved_grant(api, approval_id, *, instant, release_enabled=False):
    """Consume one approved review and create one stable per-account grant.

    Use only inside a private administrative execution boundary. The caller
    must separately prove operator entitlement and control approval writes.
    Never pass browser input directly. Return only a non-PII grant status.
    """
    if release_enabled is not True or not APPROVAL_ID.fullmatch(approval_id or ""):
        raise ValueError("grant issuance unavailable")
    db, table = api.PAYMENT_DDB, api.PAYMENT_LEDGER_TABLE
    approval_key = {"pk": S("PROMO_APPROVAL#" + approval_id), "sk": S("META")}
    approval = db.get_item(TableName=table, Key=approval_key, ConsistentRead=True).get("Item") or {}
    if field(approval, "status") != "APPROVED":
        raise ValueError("approval unavailable")
    subject, code, campaign_id, revision, prior_id = (
        field(approval, k) for k in ("customerSub", "promotionCode", "campaignId",
                                     "promotionRevision", "priorOrderId"))
    if not SUBJECT.fullmatch(subject or ""):
        raise ValueError("invalid account binding")
    if (not REFERENCE.fullmatch(field(approval, "commercialReviewRef") or "") or
        not REFERENCE.fullmatch(field(approval, "operatorReviewRef") or "") or
        approval.get("commercialApproved") != {"BOOL": True}):
        raise ValueError("commercial approval missing")
    try:
        approval_expires = int(approval["expiresAtUnix"]["N"])
        grant_expires = int(approval["grantExpiresAtUnix"]["N"])
    except (KeyError, ValueError, TypeError):
        raise ValueError("invalid approval expiry") from None
    if not instant < approval_expires or not instant < grant_expires <= instant + 31*86400:
        raise ValueError("approval expired or invalid grant duration")
    pricing = json.loads(api.SSM.get_parameter(Name=api.PRICES_PARAMETER,
        WithDecryption=True)["Parameter"]["Value"])
    promotion = api.retail_promotion(pricing, code, instant)
    if (not promotion or promotion["audience"] == "public_reusable"
        or promotion["code"] != code or promotion["campaign_id"] != campaign_id
        or promotion["revision"] != revision):
        raise ValueError("campaign unavailable or changed")
    campaign = pricing["retail_promotions"]["campaigns"][code]
    if grant_expires > campaign["ends_at"]:
        raise ValueError("grant outlives campaign")
    kind = promotion["kind"]
    prior_condition = None
    if promotion["audience"] == "first_account_once":
        if prior_id != "NONE" or api.account_purchase_stage(subject) != "no_recorded_paid_orders":
            raise ValueError("welcome eligibility not established")
    else:
        if not api.ORDER_ID.fullmatch(prior_id or ""):
            raise ValueError("prior order unavailable")
        prior_key = {"pk": S("ORDER#" + prior_id), "sk": S("SUMMARY")}
        prior = db.get_item(TableName=table, Key=prior_key, ConsistentRead=True).get("Item") or {}
        if (prior.get("customerSub") != S(subject) or prior.get("status") != S("PAID")
            or prior.get("ownerCommercialPolicy") != S("nutraxin_uk_direct_v1")):
            raise ValueError("paid order unavailable")
        expected = {"second": "one_paid_order", "loyalty": "three_or_more_paid_orders"}.get(kind)
        if expected and api.account_purchase_stage(subject) != expected:
            raise ValueError("purchase stage changed")
        prior_condition = {"ConditionCheck": {"TableName": table, "Key": prior_key,
            "ConditionExpression": "customerSub = :subject AND #st = :paid AND ownerCommercialPolicy = :policy",
            "ExpressionAttributeNames": {"#st": "status"},
            "ExpressionAttributeValues": {":subject": S(subject), ":paid": S("PAID"),
                                          ":policy": S("nutraxin_uk_direct_v1")}}}
    if kind in OCCASIONS:
        if (approval.get("occasionKind") != S(kind) or approval.get("occasionReviewed") != {"BOOL": True}
            or not REFERENCE.fullmatch(field(approval, "occasionReviewRef") or "")):
            raise ValueError("occasion review missing")
        if kind == "birthday" and approval.get("occasionYear") != N(promotion["occasion_year"]):
            raise ValueError("birthday year invalid")
    digest = hashlib.sha256(json.dumps([campaign_id, subject], separators=(",", ":")).encode()).hexdigest()
    grant = {"pk": S("PROMO_GRANT#" + digest), "sk": S("META"), "status": S("APPROVED"),
        "customerSub": S(subject), "campaignId": S(campaign_id), "promotionCode": S(code),
        "promotionRevision": S(revision), "priorOrderId": S(prior_id),
        "expiresAtUnix": N(grant_expires), "approvalId": S(approval_id), "issuedAtUnix": N(instant)}
    if kind in OCCASIONS:
        grant.update(occasionKind=S(kind), occasionReviewed={"BOOL": True})
        if kind == "birthday":
            grant["occasionYear"] = N(promotion["occasion_year"])
    # Bind all fields used for review. Preserve the original evidence in the
    # consumed approval. No overwrite of an existing grant, including CLAIMED.
    fields = ["customerSub", "promotionCode", "campaignId", "promotionRevision",
              "priorOrderId", "commercialReviewRef", "operatorReviewRef",
              "commercialApproved", "expiresAtUnix", "grantExpiresAtUnix"]
    if kind in OCCASIONS:
        fields += ["occasionKind", "occasionReviewed", "occasionReviewRef"]
        if kind == "birthday":
            fields += ["occasionYear"]
    names = {"#st": "status"}
    values = {":approved": S("APPROVED"), ":issued": S("ISSUED"),
              ":now": N(instant), ":grant": S(digest)}
    clauses = ["#st = :approved"]
    for i, name in enumerate(fields):
        names["#f"+str(i)] = name
        values[":f"+str(i)] = approval[name]
        clauses.append("#f"+str(i)+" = :f"+str(i))
    # Same table, no new resources. Conditional consume + insert + prior
    # ownership check are atomic. On an ambiguous response, inspect privately;
    # never blindly reissue or reset a claimed coupon.
    writes = [{"Update": {"TableName": table, "Key": approval_key,
        "UpdateExpression": "SET #st = :issued, issuedAtUnix = :now, grantDigest = :grant",
        "ConditionExpression": " AND ".join(clauses),
        "ExpressionAttributeNames": names, "ExpressionAttributeValues": values}},
        {"Put": {"TableName": table, "Item": grant,
                 "ConditionExpression": "attribute_not_exists(pk)"}}]
    if prior_condition:
        writes.append(prior_condition)
    db.transact_write_items(TransactItems=writes)
    return {"status": "ISSUED", "approvalId": approval_id}
