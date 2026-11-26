import unittest
from gift_card_adverse import freeze_adverse_purchase
from gift_card_ledger import GiftLedger, N
from test_gift_card_ledger import MemoryDynamo, Conflict
from test_gift_card_orchestration import OrchestrationTests


class AdverseTests(unittest.TestCase):
    def test_verified_adverse_charge_blocks_spend(self):
        flow=OrchestrationTests()
        flow.setUp()
        flow.open()
        flow.settle()
        args=dict(provider=flow.provider,evidence="event_adverse123")
        with self.assertRaises(ValueError):
            freeze_adverse_purchase(flow.store,flow.ledger,flow.pid,**args)
        marker=flow.ledger._read("GIFT_PURCHASE#pi_synthetic")
        digest=marker["cardDigest"]["S"]
        flow.ledger.transition(digest=digest,operation="reserve_123",action="reserve",
            expected_version=0,order="order_123",amount=1000,sale_total=1000,evidence="approved_order")
        flow.fixture.charge["disputed"]=True
        self.assertEqual(freeze_adverse_purchase(flow.store,flow.ledger,flow.pid,**args),{"status":"BLOCKED"})
        self.assertEqual(freeze_adverse_purchase(flow.store,flow.ledger,flow.pid,**args),{"status":"BLOCKED"})
        card=flow.ledger._load(digest)
        self.assertTrue(card.frozen)
        self.assertEqual(card.available,0)
        self.assertEqual(card.issued_minor,5000)
        self.assertEqual(len(card.redemptions),1)
        for action,kwargs in (
            ("reserve",dict(order="order_456",amount=100,sale_total=100)),
            ("capture",dict(order="order_123"))
        ):
            with self.assertRaises(ValueError):
                flow.ledger.transition(digest=digest,operation="blocked_"+action,action=action,
                    expected_version=2,evidence="approved_order",**kwargs)
        flow.ledger.transition(digest=digest,operation="release_123",action="release",
            expected_version=2,order="order_123",evidence="verified_unpaid")
        self.assertEqual(flow.ledger._load(digest).available,0)

    def test_adverse_mismatched_charge_rejected(self):
        flow=OrchestrationTests()
        flow.setUp()
        flow.open()
        flow.settle()
        flow.fixture.charge.update(disputed=True,amount=1)
        with self.assertRaises(ValueError):
            freeze_adverse_purchase(flow.store,flow.ledger,flow.pid,
                provider=flow.provider,evidence="event_adverse123")

    def test_duplicate_refund_evidence_cannot_credit_twice(self):
        ledger=GiftLedger(MemoryDynamo(),"synthetic")
        digest="a"*64
        ledger.issue_paid(digest=digest,denomination=5000,verified_paid_minor=5000,
            payment_reference="payment_123",operation="issue_123")
        base=dict(digest=digest,order="order_123")
        ledger.transition(**base,operation="reserve_123",action="reserve",expected_version=0,
            amount=3000,sale_total=3000,evidence="order_approval")
        ledger.transition(**base,operation="capture_123",action="capture",expected_version=1,
            evidence="payment_approval")
        refund=dict(base,action="refund",amount=1000,evidence="refund_approval123")
        ledger.transition(**refund,operation="refund_123",expected_version=2)
        with self.assertRaises(Conflict):
            ledger.transition(**refund,operation="refund_456",expected_version=3)
        self.assertEqual(ledger._load(digest).available,3000)
        self.assertEqual(ledger._read("GIFT_REFUND_EVIDENCE#refund_approval123")["amountMinor"],N(1000))


if __name__=="__main__":
    unittest.main()
