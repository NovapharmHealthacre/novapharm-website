"""Private reconciliation observer regression tests with no real credentials."""
import importlib.util
import pathlib
import unittest

SOURCE = pathlib.Path(__file__).resolve().parents[1] / "infra/aws/intelligence-billing-reconciliation-observer.py"
SPEC = importlib.util.spec_from_file_location("observer", SOURCE)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


def s(v):
    return {"S": v}


EVENT = "evt_NovaVerifiedA1234567"
INVOICE = "in_ABCDE987654321"
SUB = "sub_ABCDE987654321"
CUSTOMER = "cus_ABCDE987654321"


def receipt(kind="invoice.paid"):
    return {"event_id": s(EVENT), "event_type": s(kind),
            "status": s("quarantined_unmapped"), "synthetic": {"BOOL": False}}


def example(kind="invoice.paid"):
    return {
        ("events", EVENT): {
            "object": "event", "id": EVENT, "type": kind,
            "livemode": True, "account": None,
            "data": {"object": {"id": INVOICE, "object": "invoice", "customer": CUSTOMER}},
        },
        ("invoices", INVOICE): {
            "object": "invoice", "id": INVOICE, "livemode": True, "status": "paid",
            "customer": CUSTOMER, "subscription": SUB, "amount_paid": 2499900,
            "currency": "inr",
        },
        ("subscriptions", SUB): {
            "object": "subscription", "id": SUB, "livemode": True, "status": "active",
            "customer": CUSTOMER, "latest_invoice": INVOICE,
            "items": {"data": [{"price": {
                "id": "price_1Ua7M92U9Y3sX5I2tVhCoFaq", "currency": "inr"
            }, "quantity": 1}]},
        },
    }


class ObserverTests(unittest.TestCase):
    def test_signed_quarantine_only(self):
        self.assertTrue(M.approved_quarantine(receipt()))
        for field, value in [("synthetic", {"BOOL": True}), ("event_id", s("bad")),
                             ("status", s("unknown"))]:
            x = receipt()
            x[field] = value
            self.assertFalse(M.approved_quarantine(x))

    def test_paid_event_is_not_a_grant(self):
        data = example()
        owner = lambda c: {"PK": s("STRIPE_CUSTOMER#" + c), "SK": s("OWNER"),
                           "status": s("approved"), "stripeCustomerId": s(c)}
        self.assertEqual(M.classify_event(receipt(), lambda r, i: data[r, i], owner),
                         "verified_paid_event_pending_full_release")

    def test_no_mapping_or_foreign_owner(self):
        data = example()
        fetch = lambda r, i: data[r, i]
        self.assertEqual(M.classify_event(receipt(), fetch, lambda _: None),
                         "customer_owner_not_approved")
        bad = lambda _: {"PK": s("STRIPE_CUSTOMER#cus_Attacker000000"),
                         "SK": s("OWNER"), "status": s("approved"),
                         "stripeCustomerId": s("cus_Attacker000000")}
        self.assertEqual(M.classify_event(receipt(), fetch, bad),
                         "customer_owner_not_approved")

    def test_cross_account_and_test_mode_rejected(self):
        data = example()
        data["events", EVENT]["account"] = "acct_other"
        self.assertEqual(M.classify_event(receipt(), lambda r, i: data[r, i], lambda _: None),
                         "live_event_mismatch")
        data["events", EVENT]["account"] = None
        data["events", EVENT]["livemode"] = False
        self.assertEqual(M.classify_event(receipt(), lambda r, i: data[r, i], lambda _: None),
                         "live_event_mismatch")

    def test_unpaid_invoice_and_cross_customer_rejected(self):
        data = example()
        data["invoices", INVOICE]["status"] = "open"
        self.assertEqual(M.classify_event(receipt(), lambda r, i: data[r, i], lambda _: None),
                         "paid_invoice_not_verified")
        data = example()
        data["subscriptions", SUB]["customer"] = "cus_Attacker000000"
        self.assertEqual(M.classify_event(receipt(), lambda r, i: data[r, i], lambda _: None),
                         "subscription_or_price_not_verified")

    def test_refunds_or_cancellations_not_paid_grants(self):
        data = example("customer.subscription.deleted")
        self.assertEqual(M.classify_event(receipt("customer.subscription.deleted"),
                         lambda r, i: data[r, i], lambda _: None),
                         "risk_event_requires_authoritative_reconciliation")

    def test_private_scan_never_writes(self):
        class FakeDB:
            def scan(self, **kwargs):
                return {"Items": [receipt()], "Count": 1}
            def get_item(self, **kwargs):
                return {}
            def put_item(self, **kwargs):
                raise AssertionError("unexpected mutation")
            def update_item(self, **kwargs):
                raise AssertionError("unexpected mutation")
        data = example()
        result = M.run_observer(FakeDB(), lambda r, i: data[r, i])
        self.assertEqual(result["outcomes"], {"customer_owner_not_approved": 1})
        self.assertEqual(result["grants_created"], 0)
        self.assertEqual(result["subscriptions_created"], 0)
        self.assertEqual(result["external_emails_sent"], 0)

    def test_live_account_checked_before_any_quarantine_scan(self):
        from inspect import getsource
        source = getsource(M.handler)
        self.assertLess(source.index('account = fetch("account")'), source.index('run_observer(ddb, fetch)'))
        self.assertIn("stripe_account_mismatch", source)
        self.assertIn("except ReconciliationUnavailable as exc:", source)
        self.assertIn("stripe_http_", getsource(M.read_live_stripe))

    def test_shared_secret_linebreak_is_stripped_without_leaking_key(self):
        fake = "rk_" + "live_" + ("x" * 48)
        self.assertEqual(M.normalize_live_key(fake + "\n"), fake)
        self.assertEqual(M.normalize_live_key("  " + fake + "  "), fake)
        for bad in (None, "", "invalid", fake[:14] + "\n" + fake[14:]):
            with self.assertRaises(M.ReconciliationUnavailable):
                M.normalize_live_key(bad)

    def test_stripe_resource_allowlist(self):
        # Join harmless fragments at runtime; never commit real or complete API keys.
        fake = "rk_" + "live_" + ("x" * 48)
        for resource in ("customers", "checkout/sessions", "payment_intents", "../account", "events"):
            with self.assertRaises(M.ReconciliationUnavailable):
                M.read_live_stripe(fake, resource, EVENT)


if __name__ == "__main__":
    unittest.main()
