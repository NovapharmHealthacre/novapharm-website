"""Offline gift-card balance contract; NOT a payment handler or deployed ledger.

Storage must enforce version CAS, durable operation idempotency and atomic order
updates; payment/refund evidence must be independently verified by the caller.
No API, code issuance, email, or live payment path is enabled here.
"""
from dataclasses import dataclass, replace
import hashlib
import hmac
import re
import secrets

DENOMINATIONS = frozenset((1000, 2500, 5000, 10000, 25000))
CODE = re.compile(r"^NP-[A-F0-9]{32}$")
REFERENCE = re.compile(r"^[A-Za-z0-9_-]{8,128}$")


def positive(value):
    if type(value) is not int or value <= 0:
        raise ValueError("positive integer pence required")
    return value


def reference(value):
    if not isinstance(value, str) or not REFERENCE.fullmatch(value):
        raise ValueError("invalid durable reference")
    return value


def generate_code():
    return "NP-" + secrets.token_hex(16).upper()


def code_digest(code, key):
    if not isinstance(code, str) or not CODE.fullmatch(code):
        raise ValueError("invalid gift code")
    if not isinstance(key, bytes) or len(key) < 32:
        raise ValueError("server key must have at least 32 bytes")
    return hmac.new(key, code.encode("ascii"), hashlib.sha256).hexdigest()


@dataclass(frozen=True)
class Redemption:
    order: str
    minor: int
    status: str
    refunded: int = 0


@dataclass(frozen=True)
class GiftCard:
    issued_minor: int
    issue_reference: str
    version: int = 0
    redemptions: tuple = ()
    void: bool = False
    frozen: bool = False

    @property
    def available(self):
        if self.void or self.frozen:
            return 0
        return self.issued_minor - sum(
            r.minor - r.refunded for r in self.redemptions
            if r.status in ("reserved", "captured")
        )


def issue(denomination, verified_paid_minor, payment_reference):
    if type(denomination) is not int or denomination not in DENOMINATIONS:
        raise ValueError("unsupported denomination")
    if positive(verified_paid_minor) != denomination:
        raise ValueError("purchase amount mismatch")
    return GiftCard(denomination, reference(payment_reference))


def split_tender(total_minor, available_minor):
    """Never treat stored value as a discount to the sale or its VAT."""
    total = positive(total_minor)
    if type(available_minor) is not int or available_minor < 0:
        raise ValueError("invalid balance")
    gift = min(total, available_minor)
    cash = total - gift
    # Stripe GBP minimum for the existing checkout contract is 30p.
    # Do not round/overcharge or silently discard a residual balance.
    if 0 < cash < 30:
        if total < 30:
            raise ValueError("unsupported residual payment")
        cash = 30
        gift = total - cash
    return gift, cash


def reserve(card, order, amount, expected_version):
    reference(order)
    positive(amount)
    if card.void or card.frozen or expected_version != card.version:
        raise ValueError("stale, frozen or void card")
    if any(r.order == order for r in card.redemptions):
        raise ValueError("order reservation already exists")
    if amount > card.available:
        raise ValueError("insufficient available balance")
    return replace(card, version=card.version + 1,
                   redemptions=card.redemptions + (Redemption(order, amount, "reserved"),))


def settle(card, order, action, expected_version):
    """Capture only after verified external payment or atomic gift-only settlement.
    Release only after verified terminal unpaid checkout. Caller owns evidence.
    """
    if (card.void or expected_version != card.version or action not in ("captured", "released")
            or (card.frozen and action == "captured")):
        raise ValueError("invalid settlement")
    matches = [r for r in card.redemptions if r.order == order]
    if len(matches) != 1 or matches[0].status != "reserved":
        raise ValueError("no open reservation")
    return replace(card, version=card.version + 1, redemptions=tuple(
        replace(r, status=action) if r.order == order else r for r in card.redemptions))


def refund(card, order, amount, expected_version):
    """Refund only the original gift-funded tender, not the cash portion."""
    positive(amount)
    if card.void or expected_version != card.version:
        raise ValueError("stale or void card")
    matches = [r for r in card.redemptions if r.order == order]
    if len(matches) != 1 or matches[0].status != "captured" or amount > matches[0].minor - matches[0].refunded:
        raise ValueError("refund exceeds captured gift tender")
    return replace(card, version=card.version + 1, redemptions=tuple(
        replace(r, refunded=r.refunded + amount) if r.order == order else r
        for r in card.redemptions))


def void_unused(card, expected_version):
    if card.void or card.version != expected_version or any(
        r.status != "released" for r in card.redemptions
    ):
        raise ValueError("card has unresolved or captured redemption")
    return replace(card, version=card.version + 1, void=True)


def freeze(card, expected_version):
    """Block further spend after verified adverse purchase-payment evidence.

    Retain all prior reservation and refund history. A frozen card is not
    automatically reactivated even if a dispute is later resolved.
    """
    if card.void or card.frozen or type(expected_version) is not int or expected_version != card.version:
        raise ValueError("card cannot be frozen at this version")
    return replace(card, version=card.version + 1, frozen=True)
