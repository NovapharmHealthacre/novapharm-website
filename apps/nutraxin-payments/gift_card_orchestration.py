"""Private orchestration candidate. Not a deployed API.

The caller must supply the authenticated subject, encrypted recipient envelope,
server policy and trusted Stripe/key adapters. This module never accepts an
HTTP request or exposes gift codes. Live mode is intentionally prohibited
until production approval and provider integration are verified.
"""
import time
import re
from dataclasses import replace
from gift_card_contract import reference
from gift_card_ledger import key, S, N, fingerprint
from gift_card_purchase import (Purchase, checkout_parameters, validate_session_id,
                                verified_payment, issue_verified)

URL = re.compile(r"^https://checkout\.stripe\.com/c/pay/[^\s?#]+(?:#[^\s]*)?$")


class PurchaseStore:
    def __init__(self, client, table):
        self.client = client
        self.table = table

    def read(self, purchase_id):
        reference(purchase_id)
        return self.client.get_item(TableName=self.table,
            Key=key("GIFT_REQUEST#" + purchase_id), ConsistentRead=True).get("Item")

    def create(self, *, purchase, subject, recipient_envelope, issuance_version, lookup_version):
        if purchase.livemode or purchase.session_id:
            raise ValueError("sandbox unbound purchase required")
        for value in (subject, issuance_version, lookup_version):
            reference(value)
        if (not isinstance(recipient_envelope,str) or not 16 <= len(recipient_envelope) <= 8192
            or not re.fullmatch(r"[A-Za-z0-9+/=_-]+", recipient_envelope)):
            raise ValueError("encrypted recipient envelope required")
        fields = {"subject":S(subject),"recipientEnvelope":S(recipient_envelope),
                  "issuanceKeyVersion":S(issuance_version),"lookupKeyVersion":S(lookup_version),
                  "configurationId":S(purchase.configuration_id),
                  "denominationMinor":N(purchase.denomination)}
        row = {**key("GIFT_REQUEST#" + purchase.purchase_id),**fields,
               "status":S("CREATED"),"version":N(0),"requestHash":S(fingerprint(fields))}
        try:
            self.client.transact_write_items(TransactItems=[{"Put":{
                "TableName":self.table,"Item":row,"ConditionExpression":"attribute_not_exists(pk)"}}])
        except Exception:
            prior=self.read(purchase.purchase_id)
            if not prior or prior["requestHash"]!=row["requestHash"]:
                raise
            return prior
        return row

    def purchase(self, purchase_id, row):
        return Purchase(purchase_id,int(row["denominationMinor"]["N"]),
                        row["configurationId"]["S"],False,row.get("sessionId",{}).get("S",""))

    def advance(self, row, status, **fields):
        version=int(row["version"]["N"])
        updated=dict(row,**fields,status=S(status),version=N(version+1))
        try:
            self.client.transact_write_items(TransactItems=[{"Put":{
                "TableName":self.table,"Item":updated,
                "ConditionExpression":"#v = :prior AND #s = :status",
                "ExpressionAttributeNames":{"#v":"version","#s":"status"},
                "ExpressionAttributeValues":{":prior":N(version),":status":row["status"]}}}])
        except Exception:
            prior=self.client.get_item(TableName=self.table,Key={"pk":row["pk"],"sk":row["sk"]},
                                       ConsistentRead=True).get("Item")
            if prior != updated:
                raise
        return updated


def open_checkout(store, purchase_id, subject, *, provider, policy, clock=time.time):
    """Provider must enforce Stripe idempotency; never regenerate an uncertain session."""
    row=store.read(purchase_id)
    if not row or row["subject"]!=S(subject):
        raise ValueError("purchase unavailable")
    purchase=store.purchase(purchase_id,row)
    if row["status"]==S("OPEN"):
        return {"sessionId":purchase.session_id,"checkoutUrl":row["checkoutUrl"]["S"]}
    if row["status"] not in (S("CREATED"),S("OPENING")):
        raise ValueError("purchase not openable")
    config=provider.get_configuration(purchase.configuration_id)
    params=checkout_parameters(purchase,config,provider_approved=policy["providerApproved"],
                               voucher_tax_approved=policy["voucherTaxApproved"])
    # Store the exact request fingerprint before any provider call. The
    # private adapter must never retry an uncertain request beyond Stripe's
    # idempotency retention window; it must instead reconcile manually.
    request_hash=S(fingerprint(params))
    instant=int(clock())
    if row["status"]==S("CREATED"):
        row=store.advance(row,"OPENING",checkoutHash=request_hash,openingAt=N(instant))
    age=instant-int(row["openingAt"]["N"])
    if age<0 or age>=23*3600:
        raise ValueError("checkout requires manual reconciliation")
    if row["checkoutHash"]!=request_hash:
        raise ValueError("checkout parameters changed")
    session=provider.create_or_reconcile(params,idempotency_key="gift-checkout-"+purchase_id)
    sid=session.get("id")
    validate_session_id(sid,False)
    url=session.get("url")
    if (session.get("livemode") is not False or session.get("mode")!="payment" or
        session.get("client_reference_id")!=purchase_id or session.get("currency")!="gbp" or
        session.get("amount_total")!=purchase.denomination or session.get("status")!="open" or
        session.get("payment_status")!="unpaid" or
        session.get("metadata")!=params["metadata"] or
        (session.get("payment_method_configuration_details") or {}).get("id")!=purchase.configuration_id or
        not isinstance(url,str) or not URL.fullmatch(url)):
        raise ValueError("provider checkout mismatch")
    store.advance(row,"OPEN",sessionId=S(sid),checkoutUrl=S(url))
    return {"sessionId":sid,"checkoutUrl":url}


def settle_purchase(store, ledger, purchase_id, session_id, *, provider, key_loader):
    """Only a trusted signed-event dispatcher may invoke this private method."""
    row=store.read(purchase_id)
    if not row or row["status"] not in (S("OPEN"),S("ISSUED")):
        raise ValueError("purchase not ready for verification")
    purchase=store.purchase(purchase_id,row)
    if purchase.session_id!=session_id:
        raise ValueError("event session does not match durable purchase")
    session,intent,charge=provider.get_payment_objects(session_id)
    payment=verified_payment(purchase,session,intent,charge)
    issuance_version=row["issuanceKeyVersion"]["S"]
    lookup_version=row["lookupKeyVersion"]["S"]
    if row["status"]==S("ISSUED"):
        if row["paymentReference"]!=S(payment):
            raise ValueError("issued purchase payment mismatch")
        return {"status":"ISSUED"}
    issue_verified(ledger,purchase,session,intent,charge,
                   key_loader("issuance",issuance_version),key_loader("lookup",lookup_version),
                   issuance_key_version=issuance_version,lookup_key_version=lookup_version)
    # Issuance+delivery outbox is atomic and replay-safe. A crash before
    # this summary update is recovered by replay of the same payment.
    store.advance(row,"ISSUED",paymentReference=S(payment),checkoutUrl=S("closed"))
    return {"status":"ISSUED"}
