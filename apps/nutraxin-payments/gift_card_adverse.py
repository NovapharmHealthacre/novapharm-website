"""Unwired adverse-payment reconciliation for an already issued gift card.

The signed-event dispatcher must authenticate the Stripe notification and
reconcile missing/unissued purchases separately. This module never changes
a Stripe payment or sends a refund. Frozen liabilities remain in the ledger
for manual financial reconciliation; no automatic unfreeze is available.
"""
from gift_card_purchase import PAYMENT_ID
from gift_card_ledger import S
from gift_card_contract import reference


def freeze_adverse_purchase(store, ledger, purchase_id, *, provider, evidence):
    reference(evidence)
    row = store.read(purchase_id)
    if not row or row["status"] != S("ISSUED"):
        raise ValueError("unissued purchase requires separate reconciliation")
    purchase = store.purchase(purchase_id,row)
    if purchase.livemode or not purchase.session_id:
        raise ValueError("sandbox issued purchase required")
    session,intent,charge = provider.get_payment_objects(purchase.session_id)
    payment = intent.get("id")
    meta = {"purchase_type":"novapharm_gift_card","gift_purchase_id":purchase_id}
    if (not isinstance(payment,str) or not PAYMENT_ID.fullmatch(payment) or
        row["paymentReference"] != S(payment) or
        session.get("id") != purchase.session_id or session.get("payment_intent") != payment or
        session.get("client_reference_id") != purchase_id or session.get("metadata") != meta or
        intent.get("metadata") != meta or intent.get("latest_charge") != charge.get("id") or
        charge.get("payment_intent") != payment or
        any(o.get("livemode") is not False or o.get("currency") != "gbp"
            for o in (session,intent,charge)) or
        session.get("amount_total") != purchase.denomination or
        intent.get("amount") != purchase.denomination or charge.get("amount") != purchase.denomination):
        raise ValueError("adverse evidence does not match original gift purchase")
    refunded = charge.get("amount_refunded")
    if type(refunded) is not int or not 0 <= refunded <= purchase.denomination:
        raise ValueError("invalid refund evidence")
    if charge.get("disputed") is not True and refunded == 0 and charge.get("refunded") is not True:
        raise ValueError("no adverse payment evidence")
    marker=ledger._read("GIFT_PURCHASE#"+payment)
    if not marker:
        raise ValueError("missing original issuance marker")
    digest=marker["cardDigest"]["S"]
    card=ledger._load(digest)
    if card.issue_reference != payment:
        raise ValueError("issuance reference mismatch")
    if card.frozen or card.void:
        return {"status":"BLOCKED"}
    ledger.transition(digest=digest,operation="giftfreeze_"+payment,action="freeze",
                      expected_version=card.version,evidence=evidence)
    return {"status":"BLOCKED"}
