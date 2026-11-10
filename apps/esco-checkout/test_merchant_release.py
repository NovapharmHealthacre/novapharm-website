import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("merchant_release", Path(__file__).with_name("merchant_release.py"))
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def synthetic_matrix():
    rows = []
    for i in range(1, 374):
        rows.append({
            "catalogue_id": f"ESCO-CAT-{i:04d}",
            "category": "Hospital Furniture",
            "product": f"Test instrument family {i}",
            "supplier_model": "EHF-TEST" if i <= 73 else "",
            "owner_approved_catalogue_unit_price_ex_vat_gbp": "120.00",
            "illustrative_delivery_budget_gbp": "12.00",
        })
    return rows


def full_record(template):
    record = dict(template)
    record.update({
        "supplier_saleable_variant": "EHF-TEST-001",
        "specification_evidence_ref": "DOC:SPEC-2026-TEST-001",
        "merchant_price_signoff_ref": "DOC:PRICE-2026-TEST-001",
        "supplier_rights_evidence_ref": "DOC:RIGHTS-2026-TEST-001",
        "warehouse_stock_evidence_ref": "DOC:WAREHOUSE-2026-TEST-001",
        "available_to_promise_units": 3,
        "gb_delivery_evidence_ref": "DOC:SHIP-2026-TEST-001",
        "tax_treatment_evidence_ref": "DOC:VAT-2026-TEST-001",
        "stripe_tax_code": "txcd_99999999",
        "regulatory_type": "medical_device",
        "uk_product_classification_evidence_ref": "DOC:CLASS-2026-TEST-001",
        "uk_safety_evidence_ref": "DOC:SAFETY-2026-TEST-001",
        "mhra_registration_evidence_ref": "DOC:MHRA-2026-TEST-001",
        "conformity_evidence_ref": "DOC:CONFORMITY-2026-TEST-001",
        "uk_responsible_person_evidence_ref": "DOC:UKRP-2026-TEST-001",
        "final_uk_delivered_selling_price_pence": 15600,
        "pricing_basis": "VERIFIED_SUPPLIER_COST",
        "confirmed_variable_cost_pence": 11000,
        "release_authorised": True
    })
    return record


class MerchantReleaseContract(unittest.TestCase):
    def test_373_records_include_distinct_internal_skus_but_not_fabricated_models(self):
        draft = mod.prepare_evidence(synthetic_matrix())
        self.assertEqual(draft["catalogue_reference_count"], 373)
        self.assertEqual(len(draft["records"]), 373)
        self.assertEqual(len({v["internal_novapharm_sku"] for v in draft["records"]}), 373)
        self.assertEqual(sum(not v["catalogue_model"] for v in draft["records"]), 300)
        self.assertTrue(all(v["release_authorised"] is False for v in draft["records"]))
        self.assertTrue(all(v["final_uk_delivered_selling_price_pence"] is None for v in draft["records"]))
        self.assertTrue(all(v["pricing_basis"] == "OWNER_BASE_APPROVED_DELIVERY_ESTIMATED"
                            for v in draft["records"]))

    def test_all_draft_rows_are_blocked_from_payment(self):
        draft = mod.prepare_evidence(synthetic_matrix())
        with patch.object(mod, "read_matrix", return_value=synthetic_matrix()):
            released, blocked = mod.evaluate(draft, lambda item: True)
        self.assertEqual(len(released), 0)
        self.assertEqual(len(blocked), 373)

    def test_one_qualified_sku_promotes_without_guessing_other_372(self):
        draft = mod.prepare_evidence(synthetic_matrix())
        draft["records"][0] = full_record(draft["records"][0])
        with patch.object(mod, "read_matrix", return_value=synthetic_matrix()):
            from index import eligible
            released, blocked = mod.evaluate(draft, eligible)
        self.assertEqual(list(released), ["ESCO-CAT-0001"])
        self.assertEqual(len(blocked), 372)
        self.assertEqual(released["ESCO-CAT-0001"]["unit_price_pence"], 15600)
        self.assertEqual(released["ESCO-CAT-0001"]["actual_variable_cost_pence"], 11000)
        self.assertTrue(released["ESCO-CAT-0001"]["supplier_cost_verified"])

    def test_unconfirmed_model_tax_stock_safety_and_margin_cannot_launch(self):
        good = full_record(mod.prepare_evidence(synthetic_matrix())["records"][0])
        for key, invalid in (
            ("supplier_saleable_variant", ""),
            ("gb_delivery_evidence_ref", ""),
            ("warehouse_stock_evidence_ref", ""),
            ("stripe_tax_code", "txcd_fake"),
            ("uk_safety_evidence_ref", ""),
            ("mhra_registration_evidence_ref", ""),
            ("available_to_promise_units", 0),
            ("final_uk_delivered_selling_price_pence", None),
            ("confirmed_variable_cost_pence", 13000),
            ("release_authorised", False),
        ):
            bad = dict(good, **{key: invalid})
            with self.assertRaises(ValueError, msg=key):
                mod.release_record(bad, lambda item: True)

    def test_existing_live_skus_cannot_be_overwritten_and_no_approval_means_no_mutation(self):
        draft = mod.prepare_evidence(synthetic_matrix())
        draft["records"][0] = full_record(draft["records"][0])
        fake = type("FakeSSM", (), {
            "calls": [],
            "get_parameter": lambda self, **kwargs: {
                "Parameter": {"Version": 4, "Value": json.dumps({
                    "enabled": True, "webhook_verified": True,
                    "approved_skus": {"ESCO-CAT-0001": {"name": "original protected record"}}
                })}
            },
            "put_parameter": lambda self, **kwargs: self.calls.append(kwargs) or {"Version": 5},
        })()
        with patch.object(mod, "read_matrix", return_value=synthetic_matrix()), \
             patch.object(mod, "load_eligible", return_value=lambda x: True):
            with self.assertRaises(ValueError):
                mod.promote(draft, policy_version=4, approve_live=False, ssm=fake)
            with self.assertRaises(ValueError):
                mod.promote(draft, policy_version=3, approve_live=True, ssm=fake)
            with self.assertRaises(ValueError):
                mod.promote(draft, policy_version=4, approve_live=True, ssm=fake)
        self.assertEqual(fake.calls, [])

    def test_policy_merge_adds_only_authorised_item_and_preserves_existing(self):
        draft = mod.prepare_evidence(synthetic_matrix())
        draft["records"][2] = full_record(draft["records"][2])
        fake = type("FakeSSM", (), {
            "calls": [],
            "get_parameter": lambda self, **kwargs: {
                "Parameter": {"Version": 7, "Value": json.dumps({
                    "enabled": True, "webhook_verified": True,
                    "approved_skus": {"ESCO-CAT-0048": {"name": "keep original"}}
                })}
            },
            "put_parameter": lambda self, **kwargs: self.calls.append(kwargs) or {"Version": 8},
        })()
        with patch.object(mod, "read_matrix", return_value=synthetic_matrix()), \
             patch.object(mod, "load_eligible", return_value=lambda x: True):
            result = mod.promote(draft, policy_version=7, approve_live=True, ssm=fake)
        self.assertEqual(result["promoted"], 1)
        after = json.loads(fake.calls[0]["Value"])
        self.assertEqual(after["approved_skus"]["ESCO-CAT-0048"]["name"], "keep original")
        self.assertIn("ESCO-CAT-0003", after["approved_skus"])
        self.assertEqual(len(after["approved_skus"]), 2)


if __name__ == "__main__":
    unittest.main()
