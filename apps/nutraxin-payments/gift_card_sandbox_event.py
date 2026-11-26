"""Isolated sandbox-only signed gift Checkout event boundary.

Not deployed. No live webhook secret, live Stripe requests, public route,
or merchandise mutation. The trusted caller supplies a sandbox-only provider,
ledger, and key resolver; fulfillment is never based on a browser return.
"""
import hashlib
import hmac
import json
import re
import time

from gift_card_contract import reference
from gift_card_purchase import validate_session_id
from gift_card_orchestration import settle_purchase

EVENT_ID = re.compile(r"^evt_[A-Za-z0-9]+$")
SUCCESS = frozenset(("checkout.session.completed", "checkout.session.async_payment_succeeded"))
OTHER_CHECKOUT = frozenset(("checkout.session.async_payment_failed", "checkout.session.expired"))


def verify_sandbox_event(raw, signature, secret, *, now=None):
    if not isinstance(raw, bytes) or not 0 < len(raw) <= 1_000_000:
        raise ValueError("invalid signed payload")
    if not isinstance(secret, str) or not re.fullmatch(r"whsec_[A-Za-z0-9_]{16,256}", secret):
        raise ValueError("sandbox signing secret unavailable")
    if not isinstance(signature, str) or len(signature) > 1500:
        raise ValueError("invalid signature")
    pieces = [v.strip().split("=", 1) for v in signature.split(",") if "=" in v]
    stamps = [v for k,v in pieces if k == "t"]
    digests = [v for k,v in pieces if k == "v1" and re.fullmatch(r"[A-Fa-f0-9]{64}",v)]
    if len(stamps) != 1 or not re.fullmatch(r"[0-9]{9,12}",stamps[0]) or not digests:
        raise ValueError("invalid signature components")
    instant = int(time.time() if now is None else now)
    if abs(instant - int(stamps[0])) > 300:
        raise ValueError("expired signature")
    expected = hmac.new(secret.encode("ascii"),stamps[0].encode("ascii")+b"."+raw,hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected,d.lower()) for d in digests):
        raise ValueError("invalid signature")
    event = json.loads(raw.decode("utf-8"))
    if (not isinstance(event,dict) or event.get("livemode") is not False or
        not EVENT_ID.fullmatch(str(event.get("id","")))):
        raise ValueError("invalid sandbox event")
    return event


def handle_sandbox_checkout(raw, signature, secret, *, store, ledger, provider,
                            key_loader, enabled=False, now=None):
    """Verify signature before routing. Independent provider retrieval verifies payment.

    A non-paid completion does not issue anything. Failed/expired checkouts
    require separate reconciliation and never release or issue a balance here.
    Refund/dispute event routing remains a separate deployment gate.
    """
    if enabled is not True:
        raise ValueError("sandbox gift webhook disabled")
    event = verify_sandbox_event(raw,signature,secret,now=now)
    kind = event.get("type")
    if kind not in SUCCESS | OTHER_CHECKOUT:
        return {"status":"IGNORED"}
    session = (event.get("data") or {}).get("object")
    if not isinstance(session,dict) or session.get("object") != "checkout.session" or session.get("livemode") is not False:
        raise ValueError("invalid signed sandbox Checkout object")
    meta = session.get("metadata")
    if not isinstance(meta,dict):
        raise ValueError("invalid Checkout metadata")
    pid = meta.get("gift_purchase_id")
    client = session.get("client_reference_id")
    related = (meta.get("purchase_type") == "novapharm_gift_card" or
               isinstance(pid,str) and pid.startswith("GIFT-") or
               isinstance(client,str) and client.startswith("GIFT-"))
    if not related:
        return {"status":"IGNORED"}
    reference(pid)
    if (not pid.startswith("GIFT-") or client != pid or
        meta != {"purchase_type":"novapharm_gift_card","gift_purchase_id":pid}):
        raise ValueError("gift event namespace mismatch")
    sid = session.get("id")
    validate_session_id(sid,False)
    if kind in OTHER_CHECKOUT:
        return {"status":"RECONCILE_UNPAID"}
    if session.get("payment_status") != "paid":
        if kind == "checkout.session.async_payment_succeeded":
            raise ValueError("contradictory payment state")
        return {"status":"AWAITING_PAYMENT"}
    return settle_purchase(store,ledger,pid,sid,provider=provider,key_loader=key_loader)
