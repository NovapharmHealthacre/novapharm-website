"""Private purchase boundary; deliberately not connected to a live endpoint.

The caller must load a durable, authenticated purchase record, retrieve the
Stripe payment-method configuration and expanded payment objects directly
from Stripe, verify signed event authenticity and use a durable delivery outbox.
No browser fields or unverified event payloads are accepted as evidence.
"""
import hashlib
import hmac
import re
from dataclasses import dataclass

from gift_card_contract import DENOMINATIONS, code_digest, reference

ORIGIN = "https://novapharmhealthcare.com"
CARD_METHODS = frozenset(("card", "apple_pay", "google_pay"))
CONFIG_ID = re.compile(r"^pmc_[A-Za-z0-9]+$")
PAYMENT_ID = re.compile(r"^pi_[A-Za-z0-9]+$")
SESSION_ID = re.compile(r"^cs_(test|live)_[A-Za-z0-9]+$")


@dataclass(frozen=True)
class Purchase:
    purchase_id: str
    denomination: int
    configuration_id: str
    livemode: bool
    session_id: str = ""

    def __post_init__(self):
        reference(self.purchase_id)
        if not self.purchase_id.startswith("GIFT-"):
            raise ValueError("invalid gift purchase namespace")
        if type(self.denomination) is not int or self.denomination not in DENOMINATIONS:
            raise ValueError("unsupported denomination")
        if not CONFIG_ID.fullmatch(self.configuration_id):
            raise ValueError("dedicated payment configuration required")
        if type(self.livemode) is not bool:
            raise ValueError("invalid mode")
        if self.session_id:
            validate_session_id(self.session_id, self.livemode)


def validate_session_id(value, live):
    if not isinstance(value, str) or not SESSION_ID.fullmatch(value):
        raise ValueError("invalid checkout session")
    if not value.startswith("cs_live_" if live else "cs_test_"):
        raise ValueError("wrong checkout environment")


def validate_configuration(purchase, config):
    """Fail closed for every enabled method outside card-based payment."""
    if (config.get("id") != purchase.configuration_id or
        config.get("object") != "payment_method_configuration" or
        config.get("active") is not True or
        config.get("livemode") is not purchase.livemode or
        config.get("is_default") is not False):
        raise ValueError("dedicated gift payment configuration unavailable")
    if config.get("card", {}).get("available") is not True:
        raise ValueError("card payments unavailable")
    for name, value in config.items():
        if isinstance(value, dict) and "display_preference" in value:
            preference = value["display_preference"]
            if not isinstance(preference, dict) or preference.get("value") not in ("on", "off"):
                raise ValueError("unknown payment configuration state")
            if name not in CARD_METHODS and preference["value"] != "off":
                raise ValueError("non-card method enabled in gift configuration")
    if config["card"].get("display_preference", {}).get("value") != "on":
        raise ValueError("card payments not enabled")


def checkout_parameters(purchase, config, *, provider_approved, voucher_tax_approved):
    if provider_approved is not True or voucher_tax_approved is not True:
        raise ValueError("gift purchase not approved for payment")
    if purchase.session_id:
        raise ValueError("reuse the durable checkout session")
    validate_configuration(purchase, config)
    # Use only for the separately approved voucher tax treatment. Do not
    # override existing merchandise VAT policy or infer a tax registration.
    return {
        "mode": "payment",
        "ui_mode": "hosted_page",
        "payment_method_configuration": purchase.configuration_id,
        "excluded_payment_method_types": ["klarna","afterpay_clearpay","affirm","billie"],
        "client_reference_id": purchase.purchase_id,
        "metadata": {"purchase_type":"novapharm_gift_card", "gift_purchase_id":purchase.purchase_id},
        "payment_intent_data": {"metadata":{"purchase_type":"novapharm_gift_card",
                                           "gift_purchase_id":purchase.purchase_id}},
        "line_items": [{"price_data":{"currency":"gbp","unit_amount":purchase.denomination,
                         "product_data":{"name":"NovaPharm digital gift card"}},"quantity":1}],
        "success_url": ORIGIN + "/products/nutraxin/gift-cards/?checkout=return",
        "cancel_url": ORIGIN + "/products/nutraxin/gift-cards/?checkout=cancelled",
        "billing_address_collection": "required",
        "allow_promotion_codes": False,
        "automatic_tax": {"enabled": False},
        "integration_identifier": "novapharm-giftcard-hqtnwzax",
    }


def verified_payment(purchase, session, intent, charge):
    """Inputs are independently retrieved Stripe objects, never client data."""
    if not purchase.session_id:
        raise ValueError("durable session binding missing")
    validate_session_id(purchase.session_id, purchase.livemode)
    pid = intent.get("id")
    expected = {"purchase_type":"novapharm_gift_card","gift_purchase_id":purchase.purchase_id}
    configuration = session.get("payment_method_configuration_details") or {}
    if (session.get("id") != purchase.session_id or session.get("livemode") is not purchase.livemode or
        session.get("status") != "complete" or session.get("payment_status") != "paid" or
        session.get("mode") != "payment" or session.get("currency") != "gbp" or
        session.get("amount_total") != purchase.denomination or
        session.get("client_reference_id") != purchase.purchase_id or
        session.get("metadata") != expected or configuration.get("id") != purchase.configuration_id or
        not isinstance(pid,str) or not PAYMENT_ID.fullmatch(pid) or session.get("payment_intent") != pid):
        raise ValueError("gift checkout does not reconcile")
    if (intent.get("livemode") is not purchase.livemode or intent.get("status") != "succeeded" or
        intent.get("currency") != "gbp" or intent.get("amount") != purchase.denomination or
        intent.get("amount_received") != purchase.denomination or intent.get("metadata") != expected or
        not isinstance(charge.get("id"), str) or not charge["id"].startswith("ch_") or
        intent.get("latest_charge") != charge.get("id")):
        raise ValueError("gift payment intent does not reconcile")
    if (charge.get("livemode") is not purchase.livemode or charge.get("payment_intent") != pid or
        charge.get("paid") is not True or charge.get("captured") is not True or
        charge.get("status") != "succeeded" or charge.get("currency") != "gbp" or
        charge.get("amount") != purchase.denomination or charge.get("amount_refunded") != 0 or
        charge.get("disputed") is not False or charge.get("refunded") is not False or
        charge.get("payment_method_details",{}).get("type") != "card"):
        raise ValueError("gift charge is not an eligible settled card payment")
    return pid


def issuance_code(payment_reference, issuance_key):
    """Stable pseudorandom 128-bit code for retries; use a separate KMS-held key.

    Persist the issuance-key version with the purchase before payment. Never
    expose this function to a browser or log its return value. Key rotation
    must preserve retryability for pending deliveries.
    """
    if not isinstance(payment_reference,str) or not PAYMENT_ID.fullmatch(payment_reference):
        raise ValueError("invalid verified payment reference")
    if not isinstance(issuance_key,bytes) or len(issuance_key)<32:
        raise ValueError("strong dedicated issuance key required")
    return "NP-" + hmac.new(issuance_key, b"gift-issuance-v1:" + payment_reference.encode(),
                            hashlib.sha256).hexdigest()[:32].upper()


def issue_verified(ledger, purchase, session, intent, charge, issuance_key, lookup_key,
                   *, issuance_key_version=None, lookup_key_version=None):
    """Return only ledger outcome. Separate private delivery worker retrieves code."""
    if issuance_key == lookup_key:
        raise ValueError("separate issuance and lookup keys required")
    payment = verified_payment(purchase, session, intent, charge)
    digest = code_digest(issuance_code(payment, issuance_key), lookup_key)
    delivery = None
    if issuance_key_version is not None or lookup_key_version is not None:
        delivery = {"purchaseId":purchase.purchase_id,"issuanceKeyVersion":issuance_key_version,
                    "lookupKeyVersion":lookup_key_version}
        for value in delivery.values():
            reference(value)
    return ledger.issue_paid(digest=digest, denomination=purchase.denomination,
        verified_paid_minor=purchase.denomination, payment_reference=payment,
        operation="giftissue_" + payment, delivery=delivery)
