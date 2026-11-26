import unittest
from gift_card_orchestration import PurchaseStore, open_checkout, settle_purchase
from gift_card_ledger import GiftLedger, S
from test_gift_card_ledger import MemoryDynamo, Conflict
from test_gift_card_purchase import GiftPurchaseTests


class StoreDynamo(MemoryDynamo):
    def transact_write_items(self, TransactItems):
        if len(TransactItems)==1 and TransactItems[0]["Put"]["ConditionExpression"]=="#v = :prior AND #s = :status":
            p=TransactItems[0]["Put"]
            row=p["Item"]
            old=self.rows.get(row["pk"]["S"])
            v=p["ExpressionAttributeValues"]
            if not old or old["version"]!=v[":prior"] or old["status"]!=v[":status"]:
                raise Conflict("purchase state")
            self.rows[row["pk"]["S"]]=dict(row)
            return
        return super().transact_write_items(TransactItems)


class Provider:
    def __init__(self,fixture):
        self.fixture=fixture
        self.calls=[]
        self.fail=False

    def get_configuration(self, config_id):
        return self.fixture.config

    def create_or_reconcile(self, params, idempotency_key):
        self.calls.append(idempotency_key)
        if self.fail:
            raise TimeoutError("synthetic")
        return dict(self.fixture.session,status="open",payment_status="unpaid",
                    url="https://checkout.stripe.com/c/pay/cs_test_synthetic")

    def get_payment_objects(self, session_id):
        return self.fixture.session,self.fixture.intent,self.fixture.charge


class OrchestrationTests(unittest.TestCase):
    def setUp(self):
        self.fixture=GiftPurchaseTests()
        self.fixture.setUp()
        self.db=StoreDynamo()
        self.store=PurchaseStore(self.db,"synthetic")
        self.ledger=GiftLedger(self.db,"synthetic")
        self.provider=Provider(self.fixture)
        self.pid=self.fixture.purchase.purchase_id
        self.subject="customer_123"
        self.policy={"providerApproved":True,"voucherTaxApproved":True}
        self.args=dict(purchase=self.fixture.purchase,subject=self.subject,
                       recipient_envelope="synthetic_encrypted_envelope",
                       issuance_version="issuance_v1",lookup_version="lookup_v1")
        self.store.create(**self.args)

    def open(self, clock=lambda:1000, subject=None):
        return open_checkout(self.store,self.pid,subject or self.subject,
                             provider=self.provider,policy=self.policy,clock=clock)

    def settle(self):
        return settle_purchase(self.store,self.ledger,self.pid,self.fixture.bound.session_id,
            provider=self.provider,key_loader=lambda kind,version:b"a"*32 if kind=="issuance" else b"b"*32)

    def test_purchase_to_issued_with_replay(self):
        self.assertEqual(self.store.create(**self.args)["status"],S("CREATED"))
        with self.assertRaises(Conflict):
            self.store.create(**dict(self.args,subject="customer_456"))
        with self.assertRaises(ValueError):
            self.open(subject="customer_456")
        self.assertEqual(self.open()["sessionId"],self.fixture.bound.session_id)
        self.assertEqual(self.open()["sessionId"],self.fixture.bound.session_id)
        self.assertEqual(len(self.provider.calls),1)
        self.assertEqual(self.settle(),{"status":"ISSUED"})
        self.assertEqual(self.settle(),{"status":"ISSUED"})
        self.assertEqual(len(self.db.rows),5)
        self.assertEqual(self.db.rows["GIFT_DELIVERY#pi_synthetic"]["status"],S("PENDING"))

    def test_uncertain_retry_reuses_key_and_expires(self):
        self.provider.fail=True
        with self.assertRaises(TimeoutError):
            self.open()
        self.assertEqual(self.store.read(self.pid)["status"],S("OPENING"))
        with self.assertRaises(ValueError):
            self.open(clock=lambda:1000+23*3600)
        self.assertEqual(len(self.provider.calls),1)
        self.provider.fail=False
        self.open(clock=lambda:1100)
        self.assertEqual(self.provider.calls[0],self.provider.calls[1])

    def test_payment_not_ready_or_unapproved(self):
        with self.assertRaises(ValueError):
            self.settle()
        self.policy["providerApproved"]=False
        with self.assertRaises(ValueError):
            self.open()
        self.assertEqual(self.provider.calls,[])


if __name__ == "__main__":
    unittest.main()
