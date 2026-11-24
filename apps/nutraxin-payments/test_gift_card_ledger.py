"""Synthetic DynamoDB contract tests. No AWS calls or real gift cards."""
import copy
import unittest
from gift_card_ledger import GiftLedger


class Conflict(Exception):
    pass


class MemoryDynamo:
    def __init__(self):
        self.rows = {}
        self.lose_response = False

    def get_item(self, TableName, Key, ConsistentRead):
        return {"Item": copy.deepcopy(self.rows.get(Key["pk"]["S"]))}

    def transact_write_items(self, TransactItems):
        next_rows = copy.deepcopy(self.rows)
        for entry in TransactItems:
            p = entry["Put"]
            row = p["Item"]
            pk = row["pk"]["S"]
            old = next_rows.get(pk)
            expr = p["ConditionExpression"]
            v = p.get("ExpressionAttributeValues", {})
            if expr == "attribute_not_exists(pk)":
                ok = old is None
            elif expr == "version = :expected":
                ok = old is not None and old["version"] == v[":expected"]
            elif expr == "cardDigest = :digest AND #status = :prior AND refundedMinor = :refund":
                ok = (old is not None and old["cardDigest"] == v[":digest"]
                      and old["status"] == v[":prior"] and old["refundedMinor"] == v[":refund"])
            else:
                raise AssertionError(expr)
            if not ok:
                raise Conflict(pk)
            next_rows[pk] = copy.deepcopy(row)
        self.rows = next_rows
        if self.lose_response:
            self.lose_response = False
            raise TimeoutError("response lost after transaction commit")


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.db = MemoryDynamo()
        self.ledger = GiftLedger(self.db, "synthetic")
        self.digest = "a" * 64
        self.purchase = dict(digest=self.digest, denomination=5000,
                             verified_paid_minor=5000, payment_reference="payment_123",
                             operation="issue_123")

    def issue(self):
        return self.ledger.issue_paid(**self.purchase)

    def transition(self, action, version, operation, **kwargs):
        return self.ledger.transition(digest=self.digest, operation=operation,
            action=action, expected_version=version, evidence="verified_evidence",
            **kwargs)

    def test_purchase_replay_and_unique_payment(self):
        self.assertEqual(self.issue(), {"version": 0, "availableMinor": 5000})
        self.assertEqual(self.issue(), {"version": 0, "availableMinor": 5000})
        with self.assertRaises(ValueError):
            self.ledger.issue_paid(**dict(self.purchase, denomination=2500))
        with self.assertRaises(Conflict):
            self.ledger.issue_paid(**dict(self.purchase, digest="b"*64, operation="issue_456"))
        self.assertEqual(len(self.db.rows), 3)

    def test_reserve_capture_and_refund(self):
        self.issue()
        args = dict(order="order_123", amount=1838, sale_total=1838)
        self.assertEqual(self.transition("reserve",0,"reserve_123",**args)["availableMinor"],3162)
        self.assertEqual(self.transition("reserve",0,"reserve_123",**args)["availableMinor"],3162)
        with self.assertRaises(ValueError):
            self.transition("reserve",0,"reserve_456",order="order_456",amount=100,sale_total=100)
        self.assertEqual(self.transition("capture",1,"capture_123",order="order_123")["availableMinor"],3162)
        self.assertEqual(self.transition("refund",2,"refund_123",order="order_123",amount=1000)["availableMinor"],4162)
        self.assertEqual(self.transition("refund",2,"refund_123",order="order_123",amount=1000)["availableMinor"],4162)
        with self.assertRaises(ValueError):
            self.transition("refund",3,"refund_456",order="order_123",amount=839)
        tender=self.db.rows["GIFT_TENDER#order_123"]
        self.assertEqual(tender["giftMinor"]["N"],"1838")
        self.assertEqual(tender["cashMinor"]["N"],"0")
        self.assertEqual(tender["refundedMinor"]["N"],"1000")

    def test_lost_response_reconciles_journal_and_release(self):
        self.issue()
        self.db.lose_response=True
        args=dict(order="order_123",amount=5000,sale_total=6000)
        result=self.transition("reserve",0,"reserve_123",**args)
        self.assertEqual(result["availableMinor"],0)
        self.assertEqual(self.transition("reserve",0,"reserve_123",**args),result)
        self.assertEqual(self.transition("release",1,"release_123",order="order_123")["availableMinor"],5000)
        self.assertEqual(self.transition("void",2,"void_123")["availableMinor"],0)

    def test_second_card_cannot_reserve_same_order(self):
        self.issue()
        self.ledger.issue_paid(**dict(self.purchase,digest="b"*64,
            payment_reference="payment_456",operation="issue_456"))
        self.transition("reserve",0,"reserve_123",order="order_123",amount=100,sale_total=100)
        with self.assertRaises(Conflict):
            self.ledger.transition(digest="b"*64,operation="reserve_456",action="reserve",
                expected_version=0,evidence="verified_evidence",order="order_123",
                amount=100,sale_total=100)
        self.assertEqual(self.db.rows["GIFT_CARD#"+"b"*64]["availableMinor"]["N"],"5000")
        self.assertNotIn("GIFT_OP#reserve_456",self.db.rows)


if __name__ == "__main__":
    unittest.main()
