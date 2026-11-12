"""Apply a founder commercial attestation to a private ESCO release draft.

A commercial attestation is NOT proof of an exact manufacturer variant, UK
regulatory clearance, VAT treatment, warehouse reconciliation, or GB freight.
This module prepares a non-payment staging file; the protected merchant
release process remains the sole method of authorising live card collection.
"""
from __future__ import annotations

import argparse
import json
from copy import deepcopy
from pathlib import Path


SCHEMA = "novapharm-esco-owner-commercial-intent-v1"
MODE = "FIXED_PRICE_STRIPE_CHECKOUT_AFTER_EXACT_OFFER_APPROVAL"
PREVIOUSLY_LIVE = frozenset({"ESCO-CAT-0003", "ESCO-CAT-0048"})
EXPECTED = frozenset(f"ESCO-CAT-{i:04d}" for i in range(1, 374))
SOURCE_REF = "OWNER:ESCO-371-SUBMISSION-2026-11-12"

OWNER_CLAIMS = frozenset((
    "ownership_or_uk_supply_rights",
    "exact_product_configuration_pack_quantity",
    "applicable_uk_compliance_registration_or_nonaapplicability",
    "allocatable_stock_dispatch",
))
UNCONFIRMED = frozenset((
    "uk_delivery_charges_terms_and_lead_times",
    "uk_vat_tax_treatment_by_sku",
))

def check_attestation(submission):
    """Validate explicit yes/no statements without upgrading them into evidence."""
    if not isinstance(submission, dict) or submission.get("schema") != SCHEMA:
        raise ValueError("unrecognised owner attestation")
    if submission.get("payment_route_selected") != MODE:
        raise ValueError("fixed-price checkout selection is required")
    if submission.get("confirmed_quote_payment_route_selected") is not False:
        raise ValueError("do not enable a quotation flow for the selected fixed-price route")
    if submission.get("expected_remaining_count") != 371:
        raise ValueError("owner submission must cover 371 remaining references")
    if submission.get("owner_accepted_unverified_actual_cost_and_margin_risk") is not True:
        raise ValueError("cost risk was not authorised")
    if submission.get("supporting_documents_supplied_with_this_submission") is not False:
        raise ValueError("do not infer an uploaded document from the attestation")
    if submission.get("existing_approved_skus") != sorted(PREVIOUSLY_LIVE):
        raise ValueError("previous protected approvals changed")
    claims = submission.get("owner_confirmed_can_substantiate")
    pending = submission.get("owner_not_confirmed_can_substantiate")
    if not isinstance(claims, dict) or set(claims) != OWNER_CLAIMS or (
        any(claims[k] is not True for k in OWNER_CLAIMS)
    ):
        raise ValueError("owner claims missing or altered")
    if not isinstance(pending, dict) or set(pending) != UNCONFIRMED or (
        any(pending[k] is not False for k in UNCONFIRMED)
    ):
        raise ValueError("delivery and VAT must remain unconfirmed")
    if submission.get("authorises_external_email") is not False:
        raise ValueError("external email authorisation cannot be inferred")
    if submission.get("changes_to_live_checkout_policy") is not False:
        raise ValueError("owner attestation may not change the live checkout policy")
    if submission.get("authorises_live_credit_card_charge_for_unverified_sk_us") is not False:
        raise ValueError("attestation must not authorise unverified transactions")
    return True


def prepare_fixed_price_owner_draft(draft, submission):
    """Return a separately staged 373-row draft with the approved cost risk.

    This may mark commercial cost acceptance; it cannot populate missing
    delivery, VAT, registration, SKU identity, final price or merchant signoff.
    """
    check_attestation(submission)
    if not isinstance(draft, dict) or draft.get("schema") != "novapharm-esco-sale-evidence-v1":
        raise ValueError("unrecognised merchant evidence draft")
    rows = draft.get("records")
    if not isinstance(rows, list) or len(rows) != 373:
        raise ValueError("373 catalogue records required")
    actual = [row.get("catalogue_id") if isinstance(row, dict) else None for row in rows]
    if set(actual) != EXPECTED or len(set(actual)) != 373:
        raise ValueError("reconcile all 373 catalogue identities before applying owner intent")

    result = deepcopy(draft)
    prepared = 0
    for row in result["records"]:
        cid = row["catalogue_id"]
        if row.get("release_authorised") is not False:
            raise ValueError("never overwrite a payment-authorised or malformed evidence row")
        if cid in PREVIOUSLY_LIVE:
            # These exist in protected SSM. Never alter them in a draft.
            continue
        # Explicitly approved owner-level economics. Not a landed-cost
        # confirmation, exact SKU signoff, or customer price.
        row["owner_accepts_unverified_costs"] = True
        row["cost_risk_signoff_ref"] = SOURCE_REF
        row["pricing_basis"] = "MERCHANT_ACCEPTED_COST_RISK"
        row["owner_attested_can_supply_documents"] = {
            "supply_rights": True,
            "exact_saleable_variant": True,
            "applicable_uk_compliance": True,
            "stock_and_dispatch": True,
        }
        row["owner_selected_checkout_mode"] = MODE
        row["owner_attestation_is_documentary_verification"] = False
        # These remain empty: supplier/UK medical-device evidence, final
        # delivered price, VAT, stock allocation and per-item release.
        if (row.get("final_uk_delivered_selling_price_pence") is not None or
            row.get("stripe_tax_code") or
            row.get("gb_delivery_evidence_ref") or
            row.get("tax_treatment_evidence_ref")):
            raise ValueError("unexpected prefilled delivery, VAT or final price; review separately")
        prepared += 1
    if prepared != 371:
        raise ValueError("371 owner decisions not applied")
    result["status"] = "OWNER_COMMERCIALLY_ATTESTED_NONPAYMENT_DRAFT"
    result["founder_submission_reference"] = SOURCE_REF
    result["owner_commercial_cost_risk_accepted_count"] = prepared
    result["new_payment_approvals"] = 0
    result["live_checkout_policy_updated"] = False
    return result


def main():
    p = argparse.ArgumentParser(description="Prepare owner-attested ESCO fixed-price evidence, without payments")
    p.add_argument("--submission", type=Path, required=True, help="private owner submission JSON")
    p.add_argument("--draft", type=Path, required=True, help="373-row merchant release draft JSON")
    p.add_argument("--output", type=Path, required=True, help="private non-payment output file")
    args = p.parse_args()
    if args.output.resolve() in (args.submission.resolve(), args.draft.resolve()):
        raise ValueError("never overwrite the source attestation or original evidence draft")
    submitted = json.loads(args.submission.read_text(encoding="utf-8"))
    initial = json.loads(args.draft.read_text(encoding="utf-8"))
    final = prepare_fixed_price_owner_draft(initial, submitted)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(final, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "total_references": len(final["records"]),
        "commercial_cost_risk_accepted": final["owner_commercial_cost_risk_accepted_count"],
        "new_payment_approvals": 0,
        "output": str(args.output),
        "stripe_checkout_mode": MODE,
    }))


if __name__ == "__main__":
    main()
