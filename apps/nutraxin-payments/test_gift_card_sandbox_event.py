import hashlib
import hmac
import json
import unittest
from gift_card_sandbox_event import handle_sandbox_checkout
from gift_card_orchestration import PurchaseStore,open_checkout
from gift_card_ledger import GiftLedger
from test_gift_card_orchestration import StoreDynamo,Provider
from test_gift_card_purchase import GiftPurchaseTests


class SignedGiftEventTests(unittest.TestCase):
    def setUp(self):
        fixture=GiftPurchaseTests()
        fixture.setUp()
        self.fixture=fixture
        self.db=StoreDynamo()
        self.store=PurchaseStore(self.db,"synthetic")
        self.ledger=GiftLedger(self.db,"synthetic")
        self.provider=Provider(fixture)
        self.pid=fixture.purchase.purchase_id
        self.store.create(purchase=fixture.purchase,subject="customer_123",
            recipient_envelope="synthetic_encrypted_envelope",issuance_version="issuance_v1",lookup_version="lookup_v1")
        open_checkout(self.store,self.pid,"customer_123",provider=self.provider,
            policy={"providerApproved":True,"voucherTaxApproved":True},clock=lambda:1000)
        self.secret="whsec_synthetic_sandbox_key"
        self.now=1700000000
        self.event={"id":"evt_synthetic","type":"checkout.session.completed","livemode":False,
                    "data":{"object":dict(fixture.session,object="checkout.session")}}

    def send(self,event=None,*,timestamp=None,enabled=True,invalid=False):
        raw=json.dumps(self.event if event is None else event,separators=(",",":")).encode()
        stamp=str(self.now if timestamp is None else timestamp)
        mac=hmac.new(self.secret.encode(),stamp.encode()+b"."+raw,hashlib.sha256).hexdigest()
        return handle_sandbox_checkout(raw,"t="+stamp+",v1="+("0"*64 if invalid else mac),self.secret,
            store=self.store,ledger=self.ledger,provider=self.provider,
            key_loader=lambda kind,version:b"a"*32 if kind=="issuance" else b"b"*32,
            enabled=enabled,now=self.now)

    def test_signed_success_is_idempotent(self):
        self.assertEqual(self.send(),{"status":"ISSUED"})
        self.assertEqual(self.send(),{"status":"ISSUED"})
        self.assertEqual(len(self.db.rows),5)

    def test_disabled_invalid_stale_and_live_events_do_not_issue(self):
        for options in ({"enabled":False},{"invalid":True},{"timestamp":self.now-301},
                        {"event":dict(self.event,livemode=True)}):
            with self.subTest(options=options),self.assertRaises(ValueError):
                self.send(**options)
        self.assertEqual(len(self.db.rows),1)

    def test_unpaid_and_foreign_events_never_issue(self):
        obj=self.event["data"]["object"]
        self.assertEqual(self.send(dict(self.event,data={"object":dict(obj,payment_status="unpaid")})),
                         {"status":"AWAITING_PAYMENT"})
        self.assertEqual(self.send(dict(self.event,data={"object":dict(obj,metadata={},client_reference_id="NUT-other")})),
                         {"status":"IGNORED"})
        self.assertEqual(self.send(dict(self.event,type="checkout.session.expired")),{"status":"RECONCILE_UNPAID"})
        self.assertEqual(len(self.db.rows),1)

    def test_signed_event_cannot_replace_provider_evidence(self):
        self.fixture.charge["payment_method_details"]={"type":"klarna"}
        with self.assertRaises(ValueError):
            self.send()
        self.assertEqual(len(self.db.rows),1)
        self.fixture.charge["payment_method_details"]={"type":"card"}
        obj=self.event["data"]["object"]
        with self.assertRaises(ValueError):
            self.send(dict(self.event,data={"object":dict(obj,id="cs_test_other")}))
        self.assertEqual(len(self.db.rows),1)


if __name__=="__main__":
    unittest.main()
