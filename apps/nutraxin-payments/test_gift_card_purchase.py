import copy
import unittest
from dataclasses import replace
from gift_card_purchase import (Purchase, checkout_parameters, verified_payment,
                                issuance_code, issue_verified)
from gift_card_ledger import GiftLedger
from test_gift_card_ledger import MemoryDynamo


class GiftPurchaseTests(unittest.TestCase):
    def setUp(self):
        self.purchase = Purchase("GIFT-purchase123",5000,"pmc_synthetic",False)
        self.config = {"id":"pmc_synthetic","object":"payment_method_configuration",
                       "active":True,"livemode":False,"is_default":False,
                       "card":{"available":True,"display_preference":{"value":"on"}},
                       "klarna":{"available":False,"display_preference":{"value":"off"}}}
        self.bound = replace(self.purchase,session_id="cs_test_synthetic")
        meta = {"purchase_type":"novapharm_gift_card","gift_purchase_id":self.purchase.purchase_id}
        self.session = {"id":self.bound.session_id,"livemode":False,"status":"complete",
                        "payment_status":"paid","mode":"payment","currency":"gbp",
                        "amount_total":5000,"client_reference_id":self.purchase.purchase_id,
                        "metadata":meta.copy(),"payment_intent":"pi_synthetic",
                        "payment_method_configuration_details":{"id":"pmc_synthetic"}}
        self.intent = {"id":"pi_synthetic","livemode":False,"status":"succeeded",
                       "currency":"gbp","amount":5000,"amount_received":5000,
                       "metadata":meta.copy(),"latest_charge":"ch_synthetic"}
        self.charge = {"id":"ch_synthetic","payment_intent":"pi_synthetic",
                       "livemode":False,"paid":True,"captured":True,"status":"succeeded",
                       "currency":"gbp","amount":5000,"amount_refunded":0,
                       "disputed":False,"refunded":False,"payment_method_details":{"type":"card"}}

    def params(self,config=None,**kw):
        flags = {"provider_approved":True,"voucher_tax_approved":True}
        flags.update(kw)
        return checkout_parameters(self.purchase,config or self.config,**flags)

    def test_purchase_requires_provider_and_tax_approval(self):
        for flags in ({"provider_approved":False},{"voucher_tax_approved":False}):
            with self.assertRaises(ValueError):
                self.params(**flags)
        params=self.params()
        self.assertFalse(params["allow_promotion_codes"])
        self.assertEqual(params["line_items"][0]["price_data"]["unit_amount"],5000)
        self.assertIn("klarna",params["excluded_payment_method_types"])
        self.assertNotIn("payment_method_types",params)
        self.assertNotIn("shipping_address_collection",params)
        with self.assertRaises(ValueError):
            checkout_parameters(self.bound,self.config,provider_approved=True,voucher_tax_approved=True)

    def test_dedicated_configuration_rejects_noncard(self):
        for name in ("klarna","billie","afterpay_clearpay","link","unknown_credit"):
            cfg=copy.deepcopy(self.config)
            cfg[name]={"available":True,"display_preference":{"value":"on"}}
            with self.assertRaises(ValueError):
                self.params(cfg)
        with self.assertRaises(ValueError):
            self.params(dict(self.config,is_default=True))
        with self.assertRaises(ValueError):
            self.params(dict(self.config,livemode=True))

    def test_verified_payment_and_idempotent_issue(self):
        self.assertEqual(verified_payment(self.bound,self.session,self.intent,self.charge),"pi_synthetic")
        ledger=GiftLedger(MemoryDynamo(),"synthetic")
        args=(ledger,self.bound,self.session,self.intent,self.charge,b"a"*32,b"b"*32)
        self.assertEqual(issue_verified(*args)["availableMinor"],5000)
        self.assertEqual(issue_verified(*args)["availableMinor"],5000)
        self.assertEqual(len(ledger.client.rows),3)
        self.assertEqual(issuance_code("pi_synthetic",b"a"*32),issuance_code("pi_synthetic",b"a"*32))
        self.assertNotEqual(issuance_code("pi_synthetic",b"a"*32),issuance_code("pi_synthetic2",b"a"*32))
        with self.assertRaises(ValueError):
            issue_verified(*args[:-1],b"a"*32)

    def test_reject_unpaid_mismatched_or_bnpl_charge(self):
        for field,value in (("payment_status","unpaid"),("amount_total",4999),("livemode",True),
                            ("client_reference_id","GIFT-other123"),("payment_intent","pi_other")):
            with self.subTest(field=field),self.assertRaises(ValueError):
                verified_payment(self.bound,dict(self.session,**{field:value}),self.intent,self.charge)
        with self.assertRaises(ValueError):
            verified_payment(self.purchase,self.session,self.intent,self.charge)
        with self.assertRaises(ValueError):
            verified_payment(self.bound,self.session,dict(self.intent,amount_received=4999),self.charge)
        for patch in ({"payment_method_details":{"type":"klarna"}},{"disputed":True},
                      {"amount_refunded":100},{"captured":False}):
            with self.assertRaises(ValueError):
                verified_payment(self.bound,self.session,self.intent,dict(self.charge,**patch))


if __name__ == "__main__":
    unittest.main()
