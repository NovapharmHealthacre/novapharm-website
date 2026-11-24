"""Private, unwired gift delivery worker. No automatic emails or AWS deployment.

Dependencies are trusted server adapters: purchase_loader loads the immutable
authorised recipient and key versions, payment_loader retrieves provider
objects, key_loader resolves protected key versions, and sender sends the
message without logging the bearer code. Never take these from an HTTP body.
A crashed/ambiguous send remains CLAIMED or REVIEW; never blindly resend.
"""
import hmac
import re
from gift_card_contract import code_digest, reference
from gift_card_ledger import key, S, N
from gift_card_purchase import issuance_code, verified_payment, PAYMENT_ID


def deliver_once(client, table, payment_reference, *, claim_id, purchase_loader,
                 payment_loader, key_loader, sender):
    reference(claim_id)
    if not isinstance(payment_reference,str) or not PAYMENT_ID.fullmatch(payment_reference):
        raise ValueError("invalid payment reference")
    pk = key("GIFT_DELIVERY#" + payment_reference)
    row = client.get_item(TableName=table, Key=pk, ConsistentRead=True).get("Item")
    if not row:
        raise ValueError("no durable delivery")
    status = row["status"]["S"]
    if status in ("SENT","CLAIMED","REVIEW"):
        return status
    if status != "PENDING" or row["version"] != N(0):
        raise ValueError("invalid delivery state")
    if row["paymentReference"] != S(payment_reference):
        raise ValueError("delivery reference mismatch")
    purchase, recipient, issuance_version, lookup_version = purchase_loader(row["purchaseId"]["S"])
    if (purchase.purchase_id != row["purchaseId"]["S"] or
        purchase.denomination != int(row["denominationMinor"]["N"]) or
        row["issuanceKeyVersion"] != S(issuance_version) or
        row["lookupKeyVersion"] != S(lookup_version)):
        raise ValueError("delivery purchase binding mismatch")
    if (not isinstance(recipient,str) or len(recipient)>254 or
        not re.fullmatch(r"[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+",recipient)):
        raise ValueError("invalid approved recipient")
    session,intent,charge = payment_loader(purchase)
    if verified_payment(purchase,session,intent,charge) != payment_reference:
        raise ValueError("delivery payment mismatch")
    issuance_key = key_loader("issuance",issuance_version)
    lookup_key = key_loader("lookup",lookup_version)
    if issuance_key == lookup_key:
        raise ValueError("separate keys required")
    code = issuance_code(payment_reference,issuance_key)
    digest = code_digest(code,lookup_key)
    if not hmac.compare_digest(digest,row["cardDigest"]["S"]):
        raise ValueError("delivery gift digest mismatch")
    card = client.get_item(TableName=table, Key=key("GIFT_CARD#"+digest),
                           ConsistentRead=True).get("Item")
    if not card or card["version"] != N(0) or card["availableMinor"] != row["denominationMinor"]:
        raise ValueError("card no longer in original issued state")
    claimed = dict(row,status=S("CLAIMED"),version=N(1),claimId=S(claim_id))
    # Atomic claim checks that the card has not been altered before claiming.
    # Do not send after an ambiguous transaction response: operator review.
    client.transact_write_items(TransactItems=[
        {"ConditionCheck":{"TableName":table,"Key":key("GIFT_CARD#"+digest),
            "ConditionExpression":"#v = :zero AND availableMinor = :amount",
            "ExpressionAttributeNames":{"#v":"version"},
            "ExpressionAttributeValues":{":zero":N(0),":amount":row["denominationMinor"]}}},
        {"Put":{"TableName":table,"Item":claimed,
            "ConditionExpression":"#s = :pending AND #v = :zero",
            "ExpressionAttributeNames":{"#s":"status","#v":"version"},
            "ExpressionAttributeValues":{":pending":S("PENDING"),":zero":N(0)}}}])
    try:
        message_id = sender(recipient, code, purchase.denomination)
        if not isinstance(message_id,str) or not re.fullmatch(r"[A-Za-z0-9_-]{8,200}",message_id):
            raise ValueError("invalid provider response")
        final = dict(claimed,status=S("SENT"),version=N(2),messageId=S(message_id))
    except Exception:
        # No exception body or recipient/code in logs or persisted state.
        final = dict(claimed,status=S("REVIEW"),version=N(2))
    client.transact_write_items(TransactItems=[{"Put":{
        "TableName":table,"Item":final,
        "ConditionExpression":"#s = :claimed AND #v = :one AND claimId = :claim",
        "ExpressionAttributeNames":{"#s":"status","#v":"version"},
        "ExpressionAttributeValues":{":claimed":S("CLAIMED"),":one":N(1),":claim":S(claim_id)}}}])
    return final["status"]["S"]
