"""ESCO 373-SKU commercial release preparation and protected policy promotion.

No catalogue estimate, merchant declaration, missing supplier model or draft
evidence grants payment authorisation. This utility may prepare all 373 rows,
but --apply requires item-level evidence and an expected protected SSM version.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import os
import importlib.util
import json
import re
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MATRIX = ROOT / "docs/commerce/esco-2026-merchant-release-matrix.csv"
DEFAULT_DRAFT = ROOT / "docs/commerce/esco-2026-release-evidence-draft.json"
CAT = re.compile(r"^ESCO-CAT-\d{4}$")
TAX = re.compile(r"^txcd_\d{8}$")
EVIDENCE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/#@-]{7,255}$")
POLICY = "/novapharm/production/esco/checkout-policy"


def pence(value):
    amount = Decimal(str(value))
    if not amount.is_finite() or amount <= 0:
        raise ValueError("positive price required")
    pennies = int((amount * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    if not 1 <= pennies <= 99999999:
        raise ValueError("price outside permitted GBP checkout range")
    return pennies


def read_matrix(path=MATRIX):
    with open(path, encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    ids = [r["catalogue_id"] for r in rows]
    if len(rows) != 373 or len(set(ids)) != 373 or not all(CAT.fullmatch(k) for k in ids):
        raise ValueError("373 unique model catalogue references required")
    return rows


def prepare_evidence(rows):
    records = []
    for row in rows:
        # The owner approved base unit amounts excluding delivery; the delivery
        # figures in this draft are UNVERIFIED sensitivity allocations.
        base = pence(row["owner_approved_catalogue_unit_price_ex_vat_gbp"])
        delivery = pence(row["illustrative_delivery_budget_gbp"])
        records.append({
            "catalogue_id": row["catalogue_id"],
            "internal_novapharm_sku": "NP-ESCO-" + row["catalogue_id"][-4:],
            "manufacturer": "Eastern Surgical Company (ESCO)",
            "owner_declared_stock_units": 10000,
            "stock_declaration_basis": "OWNER_DECLARED_NOT_ALLOCATED",
            "category": row["category"],
            "name": row["product"],
            "catalogue_model": row["supplier_model"],
            "supplier_saleable_variant": "",
            "specification_evidence_ref": "",
            "merchant_base_price_pence": base,
            "illustrative_delivery_budget_pence": delivery,
            "suggested_delivered_price_pence": base + delivery,
            "final_uk_delivered_selling_price_pence": None,
            "pricing_basis": "OWNER_BASE_APPROVED_DELIVERY_ESTIMATED",
            "merchant_price_signoff_ref": "",
            "supplier_rights_evidence_ref": "",
            "warehouse_stock_evidence_ref": "",
            "available_to_promise_units": None,
            "gb_delivery_evidence_ref": "",
            "tax_treatment_evidence_ref": "",
            "stripe_tax_code": "",
            "regulatory_type": "",
            "uk_product_classification_evidence_ref": "",
            "uk_safety_evidence_ref": "",
            "mhra_registration_evidence_ref": "",
            "conformity_evidence_ref": "",
            "uk_responsible_person_evidence_ref": "",
            "confirmed_variable_cost_pence": None,
            "owner_accepts_unverified_costs": False,
            "cost_risk_signoff_ref": "",
            "release_authorised": False,
        })
    return {"schema": "novapharm-esco-sale-evidence-v1",
            "status": "NON_PAYMENT_DRAFT",
            "currency": "GBP",
            "catalogue_reference_count": 373,
            "records": records}


def evidence_ref(record, field):
    value = record.get(field)
    if not isinstance(value, str) or not EVIDENCE.fullmatch(value):
        raise ValueError(field + " missing or invalid")
    return value


def load_eligible():
    spec = importlib.util.spec_from_file_location("esco_checkout_core", ROOT / "apps/esco-checkout/index.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.eligible


def release_record(record, eligible):
    """Validate actual product authority; fail before producing a chargeable item."""
    catalogue_id = record.get("catalogue_id")
    if not isinstance(catalogue_id, str) or not CAT.fullmatch(catalogue_id):
        raise ValueError("invalid catalogue ID")
    if record.get("manufacturer") != "Eastern Surgical Company (ESCO)":
        raise ValueError("manufacturer must match the ESCO product master")
    if record.get("internal_novapharm_sku") != "NP-ESCO-" + catalogue_id[-4:]:
        raise ValueError("internal product SKU does not match its catalogue reference")
    if record.get("release_authorised") is not True:
        raise ValueError("merchant release not approved")
    model = record.get("catalogue_model")
    # All 300 references missing an exact supplier model need their own
    # manufacturer-confirmed variant, not a fabricated supplier code.
    variant = evidence_ref(record, "supplier_saleable_variant")
    if not isinstance(model, str):
        raise ValueError("catalogue model invalid")
    for field in (
        "specification_evidence_ref", "merchant_price_signoff_ref",
        "supplier_rights_evidence_ref", "warehouse_stock_evidence_ref",
        "gb_delivery_evidence_ref", "tax_treatment_evidence_ref",
        "uk_product_classification_evidence_ref", "uk_safety_evidence_ref",
    ):
        evidence_ref(record, field)
    kind = record.get("regulatory_type")
    if kind not in ("medical_device", "general_goods"):
        raise ValueError("specific product regulatory classification required")
    if kind == "medical_device":
        for field in ("mhra_registration_evidence_ref", "conformity_evidence_ref",
                      "uk_responsible_person_evidence_ref"):
            evidence_ref(record, field)
    tax = record.get("stripe_tax_code")
    if not isinstance(tax, str) or not TAX.fullmatch(tax):
        raise ValueError("Stripe tax code requires specific reviewed category")
    units = record.get("available_to_promise_units")
    if type(units) is not int or not 1 <= units <= 10000:
        raise ValueError("verified allocatable stock required, planning units not sufficient")
    amount = record.get("final_uk_delivered_selling_price_pence")
    if type(amount) is not int or not 1 <= amount <= 99999999:
        raise ValueError("firm UK delivered ex-VAT price required")
    if record.get("pricing_basis") not in ("VERIFIED_SUPPLIER_COST", "MERCHANT_ACCEPTED_COST_RISK"):
        raise ValueError("unverified suggested price is not a final price")
    out = {
        "name": "ESCO " + record["name"] + " " + variant,
        "currency": "gbp",
        "unit_price_pence": amount,
        "tax_behavior": "exclusive",
        "stripe_tax_code": tax,
        "pricing_mode": "approved_inline",
        "price_includes_gb_delivery": True,
        "available_to_promise_units": units,
        "commercial_approved": True,
        "uk_product_classification_verified": True,
        "uk_product_safety_verified": True,
        "tax_classification_verified": True,
        "delivery_verified": True,
        "stock_allocatable_verified": True,
        "manufacturer_supply_authorised": True,
        "variants_resolved": True,
        "regulatory_type": kind,
        "mhra_registration_verified": kind == "medical_device",
        "conformity_documents_verified": kind == "medical_device",
        "uk_responsible_person_verified": kind == "medical_device",
        "merchant_signoff_source": evidence_ref(record, "merchant_price_signoff_ref"),
        "exact_variant_reference": variant,
    }
    if record["pricing_basis"] == "VERIFIED_SUPPLIER_COST":
        cost = record.get("confirmed_variable_cost_pence")
        if type(cost) is not int or not 0 <= cost <= amount:
            raise ValueError("verified all-in variable cost missing")
        if cost * 4 > 3 * amount:
            raise ValueError("25% target gross margin is not met")
        out.update(supplier_cost_verified=True, actual_variable_cost_pence=cost,
                   commercial_basis="verified_supplier_cost")
    else:
        if record.get("owner_accepts_unverified_costs") is not True:
            raise ValueError("owner must specifically accept unknown actual costs")
        evidence_ref(record, "cost_risk_signoff_ref")
        base = record.get("merchant_base_price_pence")
        freight = record.get("illustrative_delivery_budget_pence")
        if any(type(v) is not int or v <= 0 for v in (base, freight)):
            raise ValueError("cost sensitivity budget missing")
        # Explicit assumptions only, never asserted actual.
        fee = (amount * 25 + 999) // 1000 + 20
        storage = (amount + 99) // 100
        ceiling = amount * 3 // 4 - freight - fee - storage
        if ceiling <= 0:
            raise ValueError("illustrative cost ceiling is not viable")
        out.update(commercial_basis="owner_authorised_estimate",
                   owner_authorised_release=True,
                   owner_accepts_unverified_landed_cost=True,
                   regulatory_evidence_basis="merchant_attestation",
                   supplier_cost_verified=False,
                   outbound_delivery_budget_pence=freight,
                   processing_fee_budget_pence=fee,
                   storage_budget_pence=storage,
                   supplier_inbound_cost_ceiling_pence=ceiling,
                   cost_risk_signoff_source=record["cost_risk_signoff_ref"])
    if not eligible(out):
        raise ValueError("failed protected Lambda eligibility contract")
    return out


def evaluate(document, eligible):
    if document.get("schema") != "novapharm-esco-sale-evidence-v1":
        raise ValueError("unrecognised evidence schema")
    rows = document.get("records")
    if not isinstance(rows, list) or len(rows) != 373:
        raise ValueError("all 373 catalogue references must be present")
    expected = {x["catalogue_id"] for x in read_matrix()}
    actual = [x.get("catalogue_id") for x in rows]
    if len(set(actual)) != 373 or set(actual) != expected:
        raise ValueError("catalogue reconciliation failed")
    released, blocked = {}, {}
    for record in rows:
        key = record["catalogue_id"]
        try:
            released[key] = release_record(record, eligible)
        except (ValueError, KeyError, TypeError) as exc:
            blocked[key] = str(exc)
    return released, blocked


def promote(document, *, policy_version, approve_live, ssm, s3, bucket):
    """Store approvals in an immutable, private S3 manifest, not a 4/8 KB SSM value.

    The protected SSM parameter points to the exact SHA256 of the immutable
    manifest. Existing two inline SSM SKUs are preserved unchanged.
    """
    if approve_live is not True or type(policy_version) is not int or policy_version <= 0:
        raise ValueError("exact SSM version and explicit live approval required")
    if not isinstance(bucket, str) or not re.fullmatch(
            r"novapharm-esco-approved-skus-[0-9]{12}-eu-north-1", bucket):
        raise ValueError("use only the isolated private ESCO approval bucket")
    approved, blocked = evaluate(document, load_eligible())
    if not approved:
        raise ValueError("no individually approved SKUs; nothing can be activated")
    current = ssm.get_parameter(Name=POLICY, WithDecryption=True)["Parameter"]
    if current["Version"] != policy_version:
        raise ValueError("SSM version changed; inspect and rerun instead of overwriting")
    cfg = json.loads(current["Value"])
    if cfg.get("enabled") is not True or cfg.get("webhook_verified") is not True:
        raise ValueError("existing payment service is not released")
    existing = cfg["approved_skus"]
    if not isinstance(existing, dict):
        raise ValueError("protected policy malformed")
    from_s3 = {}
    pointer = cfg.get("approval_manifest")
    if pointer:
        if (not isinstance(pointer, dict) or
            not re.fullmatch(r"policies/[a-f0-9]{64}\.json", str(pointer.get("key", ""))) or
            not re.fullmatch(r"[a-f0-9]{64}", str(pointer.get("sha256", "")))):
            raise ValueError("existing manifest pointer invalid")
        obj = s3.get_object(Bucket=bucket, Key=pointer["key"])
        raw = obj["Body"].read(2000001)
        if len(raw) > 2000000 or hashlib.sha256(raw).hexdigest() != pointer["sha256"]:
            raise ValueError("existing approval manifest failed integrity verification")
        prior = json.loads(raw.decode("utf-8"))
        if prior.get("schema") != "novapharm-esco-approved-skus-v1" or not isinstance(
                prior.get("approved_skus"), dict):
            raise ValueError("existing approval manifest schema invalid")
        from_s3 = prior["approved_skus"]
    all_existing = set(existing) | set(from_s3)
    collisions = all_existing & set(approved)
    if collisions:
        raise ValueError("existing live SKUs cannot be overwritten: " + ",".join(sorted(collisions)))
    rows = {**from_s3, **approved}
    if len(rows) + len(existing) > 373:
        raise ValueError("policy exceeds 373 catalogue identities")
    encoded = json.dumps({"schema": "novapharm-esco-approved-skus-v1",
                          "approved_skus": rows}, sort_keys=True,
                         separators=(",", ":")).encode("utf-8")
    if len(encoded) > 2000000:
        raise ValueError("manifest exceeds Lambda download limit")
    digest = hashlib.sha256(encoded).hexdigest()
    key = "policies/" + digest + ".json"
    s3.put_object(Bucket=bucket, Key=key, Body=encoded,
                  ServerSideEncryption="AES256", ContentType="application/json",
                  IfNoneMatch="*")
    cfg["approval_manifest"] = {"key": key, "sha256": digest}
    if len(json.dumps(cfg).encode("utf-8")) > 8000:
        raise ValueError("SSM pointer policy exceeds advanced parameter capacity")
    updated = ssm.put_parameter(Name=POLICY, Type="SecureString",
                                Value=json.dumps(cfg, separators=(",", ":")), Overwrite=True)
    return {"promoted": len(approved), "still_blocked": len(blocked),
            "total_live_policy_skus": len(existing) + len(rows),
            "ssm_version": updated.get("Version"),
            "manifest_sha256": digest}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bootstrap", action="store_true", help="create a nonpayable 373-row evidence draft")
    parser.add_argument("--input", type=Path, default=DEFAULT_DRAFT)
    parser.add_argument("--output", type=Path, default=DEFAULT_DRAFT)
    parser.add_argument("--check", action="store_true", help="audit item readiness without payments")
    parser.add_argument("--apply", action="store_true", help="append only fully supported rows to protected SSM")
    parser.add_argument("--expected-policy-version", type=int)
    parser.add_argument("--approve-live", action="store_true")
    parser.add_argument("--bucket", default=os.environ.get("ESCO_APPROVAL_BUCKET", ""))
    args = parser.parse_args()
    if args.bootstrap:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        doc = prepare_evidence(read_matrix())
        args.output.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"prepared": len(doc["records"]), "ready_for_payment": 0,
                          "output": str(args.output)}))
        return
    doc = json.loads(args.input.read_text(encoding="utf-8"))
    released, blocked = evaluate(doc, load_eligible())
    if args.apply:
        import boto3
        result = promote(doc, policy_version=args.expected_policy_version,
                         approve_live=args.approve_live, ssm=boto3.client("ssm", region_name="eu-north-1"),
                         s3=boto3.client("s3", region_name="eu-north-1"), bucket=args.bucket)
        print(json.dumps(result))
        return
    print(json.dumps({"prepared": len(doc["records"]), "ready_for_promotion": len(released),
                      "not_ready_for_payment": len(blocked),
                      "blocking_reasons": {k: sum(1 for v in blocked.values() if v == k)
                                           for k in sorted(set(blocked.values()))}},
                     indent=2))


if __name__ == "__main__":
    main()
