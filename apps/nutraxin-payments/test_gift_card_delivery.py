import copy
import unittest
from gift_card_delivery import deliver_once
from gift_card_purchase import issue_verified
from gift_card_ledger import GiftLedger, N, S
from test_gift_card_ledger import MemoryDynamo, Conflict
from test_gift_card_purchase import GiftPurchaseTests


class DeliveryDynamo(MemoryDynamo):
    def transact_write_items(self, TransactItems):
        if not any("ConditionCheck" in e or e["Put"]["ConditionExpression"].startswith("#s ")
                   for e in TransactItems):
            return super().transact_write_items(TransactItems)
        rows=copy.deepcopy(self.rows)
        for e in TransactItems:
            if "ConditionCheck" in e:
                c=e["ConditionCheck"]
                old=rows.get(c["Key"]["pk"]["S"])
                v=c["ExpressionAttributeValues"]
                if not old or old["version"]!=v[":zero"] or old["availableMinor"]!=v[":amount"]:
                    raise Conflict("card condition")
            else:
                p=e["Put"]; item=p["Item"]; pk=item["pk"]["S"]; old=rows.get(pk)
                v=p["ExpressionAttributeValues"]
                if ":pending" in v:
                    ok=old and old["status"]==v[":pending"] and old["version"]==v[":zero"]
                else:
                    ok=old and old["status"]==v[":claimed"] and old["version"]==v[":one"] and old["claimId"]==v[":claim"]
                if not ok:
                    raise Conflict("delivery condition")
                rows[pk]=copy.deepcopy(item)
        self.rows=rows


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        fixture=GiftPurchaseTests()
        fixture.setUp()
        self.purchase=fixture.bound
        self.objects=(fixture.session,fixture.intent,fixture.charge)
        self.db=DeliveryDynamo()
        self.ledger=GiftLedger(self.db,"synthetic")
        self.payment="pi_synthetic"
        self.calls=[]
        self.versions=("issuance_v1","lookup_v1")
        self.issue_args=(self.ledger,self.purchase,*self.objects,b"a"*32,b"b"*32)
        self.issue()

    def issue(self):
        return issue_verified(*self.issue_args,issuance_key_version=self.versions[0],
                              lookup_key_version=self.versions[1])

    def sender(self,recipient,code,amount):
        self.calls.append((recipient,code,amount))
        return "message_123"

    def deliver(self,**overrides):
        kwargs=dict(claim_id="claim_123",
            purchase_loader=lambda _: (self.purchase,"recipient@example.test",*self.versions),
            payment_loader=lambda _: self.objects,
            key_loader=lambda kind,version: b"a"*32 if kind=="issuance" else b"b"*32,
            sender=self.sender)
        kwargs.update(overrides)
        return deliver_once(self.db,"synthetic",self.payment,**kwargs)

    def test_atomic_outbox_and_duplicate_issue(self):
        self.assertEqual(self.issue()["availableMinor"],5000)
        self.assertEqual(len(self.db.rows),4)
        outbox=self.db.rows["GIFT_DELIVERY#"+self.payment]
        self.assertEqual(outbox["status"],S("PENDING"))
        self.assertNotIn("recipient",outbox)
        self.assertNotIn("code",outbox)
        self.assertEqual(self.deliver(),"SENT")
        self.assertEqual(self.deliver(),"SENT")
        self.assertEqual(len(self.calls),1)
        self.assertEqual(self.calls[0][2],5000)
        self.assertNotIn(self.calls[0][1],str(self.db.rows))

    def test_uncertain_send_is_not_repeated(self):
        def uncertain(*args):
            self.calls.append(args)
            raise TimeoutError("synthetic")
        self.assertEqual(self.deliver(sender=uncertain),"REVIEW")
        self.assertEqual(self.deliver(),"REVIEW")
        self.assertEqual(len(self.calls),1)

    def test_wrong_key_and_disputed_charge_fail_closed(self):
        with self.assertRaises(ValueError):
            self.deliver(key_loader=lambda kind,version:b"x"*32)
        s,i,c=self.objects
        with self.assertRaises(ValueError):
            self.deliver(payment_loader=lambda _:(s,i,dict(c,disputed=True)))
        self.assertEqual(self.calls,[])
        self.assertEqual(self.db.rows["GIFT_DELIVERY#"+self.payment]["status"],S("PENDING"))


if __name__ == "__main__":
    unittest.main()
