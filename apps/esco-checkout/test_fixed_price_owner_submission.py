import importlib.util
import unittest
from unittest.mock import patch
from copy import deepcopy
from pathlib import Path

HERE = Path(__file__).parent


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


owner = load("fixed_price_owner_submission", "fixed_price_owner_submission.py")
merchant = load("esco_merchant_release", "merchant_release.py")


def owner_decisions():
    return {
        "schema": "novapharm-esco-owner-commercial-intent-v1",
        "payment_route_selected": "FIXED_PRICE_STRIPE_CHECKOUT_AFTER_EXACT_OFFER_APPROVAL",
        "confirmed_quote_payment_route_selected": False,
        "expected_remaining_count": 371,
        "owner_accepted_unverified_actual_cost_and_margin_risk": True,
        "supporting_documents_supplied_with_this_submission": False,
        "existing_approved_skus": ["ESCO-CAT-0003", "ESCO-CAT-0048"],
        "owner_confirmed_can_substantiate": {
            "ownership_or_uk_supply_rights": True,
            "exact_product_configuration_pack_quantity": True,
            "applicable_uk_compliance_registration_or_nonaapplicability": True,
            "allocatable_stock_dispatch": True,
        },
        "owner_not_confirmed_can_substantiate": {
            "uk_delivery_charges_terms_and_lead_times": False,
            "uk_vat_tax_treatment_by_sku": False,
        },
        "authorises_external_email": False,
        "changes_to_live_checkout_policy": False,
        "authorises_live_credit_card_charge_for_unverified_sk_us": False,
    }


def catalogue_draft():
    rows = [{
        "catalogue_id": f"ESCO-CAT-{i:04d}",
        "category": "Hospital Furniture",
        "product": f"Test product family {i}",
        "supplier_model": "EHF 106" if i <= 73 else "",
        "owner_approved_catalogue_unit_price_ex_vat_gbp": "120.00",
        "illustrative_delivery_budget_gbp": "12.00",
    } for i in range(1, 374)]
    return merchant.prepare_evidence(rows)


class FixedPriceSubmissionContract(unittest.TestCase):
    def test_371_commercial_cost_risk_decisions_without_false_uk_approvals(self):
        original = catalogue_draft()
        saved = owner.prepare_fixed_price_owner_draft(original, owner_decisions())
        self.assertEqual(saved["owner_commercial_cost_risk_accepted_count"], 371)
        self.assertEqual(saved["new_payment_approvals"], 0)
        self.assertEqual(saved["live_checkout_policy_updated"], False)
        self.assertEqual(len(saved["records"]), 373)
        self.assertEqual(original["records"][0]["owner_accepts_unverified_costs"], False)
        self.assertEqual(saved["records"][2], original["records"][2])
        self.assertEqual(saved["records"][47], original["records"][47])
        for row in saved["records"]:
            self.assertIs(row["release_authorised"], False)
            self.assertIsNone(row["final_uk_delivered_selling_price_pence"])
            self.assertEqual(row["stripe_tax_code"], "")
            self.assertEqual(row["supplier_saleable_variant"], "")
            self.assertEqual(row["gb_delivery_evidence_ref"], "")
            self.assertEqual(row["uk_product_classification_evidence_ref"], "")
            self.assertEqual(row["warehouse_stock_evidence_ref"], "")
            if row["catalogue_id"] not in owner.PREVIOUSLY_LIVE:
                self.assertTrue(row["owner_accepts_unverified_costs"])
                self.assertEqual(row["pricing_basis"], "MERCHANT_ACCEPTED_COST_RISK")
                self.assertEqual(row["cost_risk_signoff_ref"], owner.SOURCE_REF)
                self.assertFalse(row["owner_attestation_is_documentary_verification"])

    def test_commercial_cost_risk_does_not_enable_payment(self):
        original = catalogue_draft()
        saved = owner.prepare_fixed_price_owner_draft(original, owner_decisions())
        # All 373 are draft rows: two existing protected approvals remain in SSM,
        # neither acquires payment authority from this preparation.
        expected_matrix = [
            {"catalogue_id": row["catalogue_id"],
             "owner_approved_catalogue_unit_price_ex_vat_gbp": "120.00"}
            for row in saved["records"]
        ]
        with patch.object(merchant, "read_matrix", return_value=expected_matrix):
            released, blocked = merchant.evaluate(saved, lambda item: True)
        self.assertEqual(released, {})
        self.assertEqual(len(blocked), 373)

    def test_inconsistent_flags_cannot_be_promoted(self):
        att = owner_decisions()
        for section, field, value in (
            ("root", "payment_route_selected", "CONFIRMED_QUOTE_FIRST"),
            ("root", "confirmed_quote_payment_route_selected", True),
            ("root", "supporting_documents_supplied_with_this_submission", True),
            ("root", "owner_accepted_unverified_actual_cost_and_margin_risk", False),
            ("root", "expected_remaining_count", 373),
            ("root", "authorises_external_email", True),
            ("root", "authorises_live_credit_card_charge_for_unverified_sk_us", True),
            ("owner_not_confirmed_can_substantiate", "uk_vat_tax_treatment_by_sku", True),
            ("owner_confirmed_can_substantiate", "allocatable_stock_dispatch", False),
        ):
            altered = deepcopy(att)
            if section == "root":
                altered[field] = value
            else:
                altered[section][field] = value
            with self.subTest(section=section, field=field), self.assertRaises(ValueError):
                owner.prepare_fixed_price_owner_draft(catalogue_draft(), altered)

    def test_missing_sku_or_attempted_release_are_rejected(self):
        att = owner_decisions()
        draft = catalogue_draft()
        draft["records"][0]["release_authorised"] = True
        with self.assertRaisesRegex(ValueError, "payment-authorised"):
            owner.prepare_fixed_price_owner_draft(draft, att)
        draft = catalogue_draft()
        draft["records"][10]["catalogue_id"] = draft["records"][11]["catalogue_id"]
        with self.assertRaisesRegex(ValueError, "reconcile all 373"):
            owner.prepare_fixed_price_owner_draft(draft, att)

    def test_does_not_smuggle_in_fabricated_tax_or_delivery_values(self):
        att = owner_decisions()
        draft = catalogue_draft()
        draft["records"][4]["stripe_tax_code"] = "txcd_99999999"
        with self.assertRaisesRegex(ValueError, "unexpected prefilled delivery"):
            owner.prepare_fixed_price_owner_draft(draft, att)
        draft = catalogue_draft()
        draft["records"][5]["final_uk_delivered_selling_price_pence"] = 12345
        with self.assertRaisesRegex(ValueError, "unexpected prefilled delivery"):
            owner.prepare_fixed_price_owner_draft(draft, att)


if __name__ == "__main__":
    unittest.main()
