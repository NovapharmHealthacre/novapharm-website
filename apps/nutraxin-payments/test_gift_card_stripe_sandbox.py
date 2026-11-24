import json
import unittest
import urllib.parse
from gift_card_stripe_sandbox import StripeSandbox, ProviderUnavailable
from gift_card_purchase import checkout_parameters
from test_gift_card_purchase import GiftPurchaseTests


class Response:
    def __init__(self,obj): self.body=json.dumps(obj).encode()
    def __enter__(self): return self
    def __exit__(self,*args): return False
    def read(self,size): return self.body[:size]


class Opener:
    def __init__(self,fixture):
        self.calls=[]
        self.fixtures={
            "/v1/account":{"id":"acct_synthetic"},
            "/v1/payment_method_configurations/pmc_synthetic":fixture.config,
            "/v1/checkout/sessions":dict(fixture.session,status="open",payment_status="unpaid"),
            "/v1/checkout/sessions/cs_test_synthetic":fixture.session,
            "/v1/payment_intents/pi_synthetic":fixture.intent,
            "/v1/charges/ch_synthetic":fixture.charge,
        }

    def open(self,request,timeout):
        self.calls.append(request)
        url=urllib.parse.urlsplit(request.full_url)
        assert url.scheme=="https" and url.netloc=="api.stripe.com"
        return Response(self.fixtures[url.path])


class StripeSandboxTests(unittest.TestCase):
    def setUp(self):
        self.fixture=GiftPurchaseTests()
        self.fixture.setUp()
        self.opener=Opener(self.fixture)
        self.provider=StripeSandbox("rk_test_synthetic","acct_synthetic",opener=self.opener)

    def test_test_only_and_correct_account(self):
        with self.assertRaises(ValueError):
            StripeSandbox("sk_live_synthetic","acct_synthetic",opener=self.opener)
        wrong=StripeSandbox("rk_test_synthetic","acct_other",opener=self.opener)
        with self.assertRaises(ProviderUnavailable):
            wrong.get_configuration("pmc_synthetic")
        with self.assertRaises(ValueError):
            self.provider.get_payment_objects("cs_live_synthetic")

    def test_checkout_and_payment_reads(self):
        cfg=self.provider.get_configuration("pmc_synthetic")
        params=checkout_parameters(self.fixture.purchase,cfg,provider_approved=True,voucher_tax_approved=True)
        key="gift-checkout-"+self.fixture.purchase.purchase_id
        self.assertEqual(self.provider.create_or_reconcile(params,key)["id"],"cs_test_synthetic")
        req=self.opener.calls[-1]
        form=urllib.parse.parse_qs(req.data.decode())
        self.assertEqual(form["line_items[0][price_data][unit_amount]"],["5000"])
        self.assertEqual(form["allow_promotion_codes"],["false"])
        self.assertEqual(req.get_header("Idempotency-key"),key)
        self.assertEqual(self.provider.get_payment_objects("cs_test_synthetic"),
                         (self.fixture.session,self.fixture.intent,self.fixture.charge))
        with self.assertRaises(ValueError):
            self.provider.create_or_reconcile(params,"arbitrary")

    def test_reject_malformed_provider_reference(self):
        self.opener.fixtures["/v1/checkout/sessions/cs_test_synthetic"]=dict(
            self.fixture.session,payment_intent="https://other.example")
        with self.assertRaises(ProviderUnavailable):
            self.provider.get_payment_objects("cs_test_synthetic")


if __name__=="__main__":
    unittest.main()
