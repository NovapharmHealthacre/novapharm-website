"""Unwired, private gift ledger adapter. No public route or AWS resource created.

Callers MUST authenticate the customer, independently verify purchase/payment/
refund evidence and authorise the order before using this adapter. The order
tender record is not the authoritative merchandise order status. Production
integration must atomically reconcile that status and the external cash tender.
"""
import hashlib
import json
import re
from dataclasses import asdict

from gift_card_contract import (GiftCard, Redemption, issue, reserve, settle,
                                refund, void_unused, reference, split_tender)

DIGEST = re.compile(r"^[a-f0-9]{64}$")
MAX_REDEMPTIONS = 500


def S(value):
    return {"S": value}


def N(value):
    return {"N": str(value)}


def key(pk, sk="META"):
    return {"pk": S(pk), "sk": S(sk)}


def digest_id(value):
    if not isinstance(value, str) or not DIGEST.fullmatch(value):
        raise ValueError("invalid protected gift identifier")
    return value


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def fingerprint(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


class GiftLedger:
    def __init__(self, client, table):
        if not isinstance(table, str) or not table:
            raise ValueError("private ledger table required")
        self.client = client
        self.table = table

    def _read(self, pk):
        return self.client.get_item(TableName=self.table, Key=key(pk),
                                    ConsistentRead=True).get("Item")

    def _put(self, item, condition="attribute_not_exists(pk)", values=None):
        data = {"TableName": self.table, "Item": item,
                "ConditionExpression": condition}
        if values:
            data["ExpressionAttributeValues"] = values
        return {"Put": data}

    def _card_row(self, digest, card):
        if len(card.redemptions) > MAX_REDEMPTIONS:
            raise ValueError("card requires reconciliation before further activity")
        return {**key("GIFT_CARD#" + digest), "version": N(card.version),
                "state": S(canonical(asdict(card))), "availableMinor": N(card.available)}

    def _load(self, digest):
        row = self._read("GIFT_CARD#" + digest)
        if row is None:
            raise ValueError("gift card unavailable")
        state = json.loads(row["state"]["S"])
        state["redemptions"] = tuple(Redemption(**r) for r in state["redemptions"])
        card = GiftCard(**state)
        if (card.version != int(row["version"]["N"]) or
                card.available != int(row["availableMinor"]["N"]) or card.available < 0):
            raise ValueError("gift ledger reconciliation required")
        return card

    def _replay(self, operation, request_hash):
        row = self._read("GIFT_OP#" + operation)
        if row is None:
            return None
        if row["fingerprint"]["S"] != request_hash:
            raise ValueError("operation reference already used for a different request")
        return json.loads(row["result"]["S"])

    def _commit(self, operation, request_hash, result, writes, audit):
        journal = {**key("GIFT_OP#" + operation), "fingerprint": S(request_hash),
                   "result": S(canonical(result)), "audit": S(canonical(audit))}
        try:
            self.client.transact_write_items(TransactItems=[
                *writes, self._put(journal)])
        except Exception:
            # A network error may follow a successful atomic commit.
            # Never infer success from an exception or current balance alone.
            replay = self._replay(operation, request_hash)
            if replay is not None:
                return replay
            raise
        return result

    def issue_paid(self, *, digest, denomination, verified_paid_minor,
                   payment_reference, operation):
        digest_id(digest)
        reference(operation)
        reference(payment_reference)
        request_hash = fingerprint(["issue", digest, denomination,
                                    verified_paid_minor, payment_reference])
        existing = self._replay(operation, request_hash)
        if existing is not None:
            return existing
        card = issue(denomination, verified_paid_minor, payment_reference)
        result = {"version": card.version, "availableMinor": card.available}
        # Separate uniqueness marker prevents issuing a second card from the
        # same verified payment even when a different event/operation ID arrives.
        marker = {**key("GIFT_PURCHASE#" + payment_reference), "cardDigest": S(digest)}
        return self._commit(operation, request_hash, result,
                            [self._put(self._card_row(digest, card)), self._put(marker)],
                            {"action":"issue","cardDigest":digest,"paymentReference":payment_reference,
                             "issuedMinor":denomination})

    def transition(self, *, digest, operation, action, expected_version,
                   order=None, amount=None, sale_total=None, evidence=None):
        digest_id(digest)
        reference(operation)
        if type(expected_version) is not int or expected_version < 0:
            raise ValueError("expected version required")
        # Evidence is a reference to independently checked payment/approval,
        # not proof by itself. Never accept this method directly from a browser.
        reference(evidence)
        if action not in ("reserve", "capture", "release", "refund", "void"):
            raise ValueError("unknown gift action")
        if action != "void":
            reference(order)
        elif order is not None or amount is not None or sale_total is not None:
            raise ValueError("void has no order or tender")
        if action != "reserve" and sale_total is not None:
            raise ValueError("sale total is only supplied at reservation")
        if action not in ("reserve", "refund") and amount is not None:
            raise ValueError("amount not supported for action")
        request_hash = fingerprint([digest, action, expected_version, order,
                                    amount, sale_total, evidence])
        existing = self._replay(operation, request_hash)
        if existing is not None:
            return existing
        card = self._load(digest)
        writes = []
        if action == "reserve":
            gift, cash = split_tender(sale_total, card.available)
            if type(amount) is not int or gift <= 0 or amount != gift:
                raise ValueError("gift tender differs from approved split")
            updated = reserve(card, order, amount, expected_version)
            tender = {**key("GIFT_TENDER#" + order), "cardDigest": S(digest),
                      "giftMinor": N(gift), "cashMinor": N(cash),
                      "saleMinor": N(sale_total), "status": S("reserved"),
                      "refundedMinor": N(0)}
            writes.append(self._put(tender))
        elif action == "void":
            updated = void_unused(card, expected_version)
        else:
            tender = self._read("GIFT_TENDER#" + order)
            if tender is None or tender["cardDigest"]["S"] != digest:
                raise ValueError("order gift tender unavailable")
            prior_status = tender["status"]["S"]
            prior_refunded = int(tender["refundedMinor"]["N"])
            if action == "refund":
                updated = refund(card, order, amount, expected_version)
                if prior_status != "captured":
                    raise ValueError("order tender not captured")
                tender["refundedMinor"] = N(prior_refunded + amount)
            else:
                updated = settle(card, order, "captured" if action == "capture" else "released",
                                 expected_version)
                if prior_status != "reserved":
                    raise ValueError("order tender not reserved")
                tender["status"] = S("captured" if action == "capture" else "released")
            writes.append(self._put(tender,
                "cardDigest = :digest AND #status = :prior AND refundedMinor = :refund",
                {":digest": S(digest), ":prior": S(prior_status), ":refund": N(prior_refunded)}))
            writes[-1]["Put"]["ExpressionAttributeNames"] = {"#status": "status"}
        writes.append(self._put(self._card_row(digest, updated),
                                "#version = :expected", {":expected": N(expected_version)}))
        writes[-1]["Put"]["ExpressionAttributeNames"] = {"#version":"version"}
        result = {"version": updated.version, "availableMinor": updated.available}
        return self._commit(operation, request_hash, result, writes,
                            {"action":action,"cardDigest":digest,"order":order,"amount":amount,
                             "saleTotal":sale_total,"evidence":evidence,"priorVersion":expected_version})
