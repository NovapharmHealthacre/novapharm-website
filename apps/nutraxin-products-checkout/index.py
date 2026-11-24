"""Public Products → Nutraxin checkout API. No secure-portal dependency.

The static public website owns the basket. AWS independently calculates
live-session totals from owner-approved server-only SSM unit prices, enforces
a UK-only 20% VAT policy and £0 additional UK delivery, durably records a
guest order, then invokes the IAM-only Stripe Checkout worker. A browser
never supplies net prices, stock reservations, approval flags or Stripe keys.
Stripe collects card details, customer email and UK delivery address.
"""
import base64
import hashlib
import json
import os
import re
import time
import urllib.parse

import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "eu-north-1")
PRICES_PARAMETER = os.environ["PRICES_PARAMETER"]
PAYMENT_LEDGER_TABLE = os.environ["PAYMENT_LEDGER_TABLE"]
PRODUCTION_CHECKOUT_FUNCTION = os.environ["PRODUCTION_CHECKOUT_FUNCTION"]
SHOP_ENABLED = os.environ.get("SHOP_ENABLED", "false") == "true"
ALLOWED_ORIGINS = frozenset((
    "https://novapharmhealthcare.com",
    "https://www.novapharmhealthcare.com",
))
PAYMENT_DDB = boto3.client("dynamodb",region_name=REGION)
SSM = boto3.client("ssm",region_name=REGION)
CHECKOUT_LAMBDA = boto3.client("lambda",region_name=REGION)
COGNITO = boto3.client("cognito-idp",region_name=REGION)
CONSUMER_POOL_ID = os.environ.get("CONSUMER_USER_POOL_ID","")
CONSUMER_CLIENT_ID = os.environ.get("CONSUMER_CLIENT_ID","")

ORDER_ID = re.compile(r"^NUT-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
PRODUCTS = {
"NUT-UK-VD3-T120":("Nutraxin Vitamin D3","120 tablets"),
"NUT-UK-VD3-S30":("Nutraxin Vitamin D3 Spray","30 ml"),
"NUT-UK-VD3K2-T120":("Nutraxin Vitamin D3 + K2","120 tablets"),
"NUT-UK-VD3K2-S30":("Nutraxin Vitamin D3 + K2 Spray","30 ml"),
"NUT-UK-VC1000-T30":("Nutraxin Vitamin C 1000 mg","30 tablets"),
"NUT-UK-VC500-C30":("Nutraxin Vitamin C 500 mg Chewable","30 chewable tablets"),
"NUT-UK-VMAX-T60":("Nutraxin Vitamin MAX C + D + Zinc","60 tablets"),
"NUT-UK-VMAX-E15":("Nutraxin Vitamin MAX Effervescent","15 tablets"),
"NUT-UK-MGCX-T60":("Nutraxin Magnesium Complex + Vitamin B6","60 tablets"),
"NUT-UK-MGDL-T60":("Nutraxin Magnesium Daily","60 tablets"),
"NUT-UK-MVE-T60":("Nutraxin Multivitamin Mineral Energy","60 tablets"),
"NUT-UK-MVW-T60":("Nutraxin Women's Multivitamin Complex","60 tablets"),
"NUT-UK-MVM-T60":("Nutraxin Men's Multivitamin Complex","60 tablets"),
"NUT-UK-CG-T30":("Nutraxin Gold Quality Collagen","30 tablets"),
"NUT-UK-CG-S30":("Nutraxin Gold Quality Collagen Sachets","30 sachets"),
"NUT-UK-CCX-T90":("Nutraxin Collagen Complex","90 tablets"),
"NUT-UK-ART-T90":("Nutraxin Artoflex","90 tablets"),
"NUT-UK-LCAR-T60":("Nutraxin L-Carnitine","60 tablets"),
"NUT-UK-B12-SL60":("Nutraxin Vitamin B12 Methylcobalamin","60 sublingual tablets")
}


def now():
    return int(time.time())

def valid_origin(event):
    headers = {str(k).lower(): str(v) for k,v in (event.get("headers") or {}).items()}
    return headers.get("origin", "") in ALLOWED_ORIGINS

def reply(status, body):
    return {"statusCode":status,"headers":{
        "content-type":"application/json; charset=utf-8",
        "cache-control":"no-store",
        "x-content-type-options":"nosniff",
        "referrer-policy":"no-referrer",
        "strict-transport-security":"max-age=31536000; includeSubDomains",
    },"body":json.dumps(body,separators=(",",":"))}

def error(status, code):
    return reply(status, {"error":code})

def retail_promotion(pricing, raw_code, instant):
    """Only owner-approved, time-bounded, reusable retail campaigns.
    Per-SKU net price floors include the owner's commercial cost policy.
    No client supplied monetary values, unrestricted discounts or gift balance.
    """
    if raw_code is None or raw_code == "":
        return None
    if not isinstance(raw_code, str) or not re.fullmatch(r"[A-Za-z0-9_-]{3,32}", raw_code):
        raise ValueError("invalid_promo_code")
    code = raw_code.upper()
    policy = pricing.get("retail_promotions")
    if not isinstance(policy, dict) or policy.get("enabled") is not True:
        raise ValueError("promo_code_unavailable")
    campaigns = policy.get("campaigns")
    campaign = campaigns.get(code) if isinstance(campaigns, dict) else None
    if not isinstance(campaign, dict) or campaign.get("approved") is not True:
        raise ValueError("promo_code_unavailable")
    start, end = campaign.get("starts_at"), campaign.get("ends_at")
    bps = campaign.get("discount_bps")
    floors = campaign.get("sku_min_net_minor")
    revision = campaign.get("revision")
    minimum = campaign.get("minimum_gross_minor")
    if (type(start) is not int or type(end) is not int or not start <= instant < end or
        type(bps) is not int or not 1 <= bps <= 5000 or
        type(minimum) is not int or minimum < 0 or
        not isinstance(revision, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,48}", revision) or
        not isinstance(floors, dict) or not floors or
        any(k not in PRODUCTS or type(v) is not int or v <= 0 for k,v in floors.items())):
        raise ValueError("promo_code_unavailable")
    audience = campaign.get("audience", "public_reusable")
    kind = campaign.get("privilege_kind", "return")
    campaign_id = campaign.get("campaign_id")
    if audience not in ("public_reusable", "returning_account_once", "first_account_once") or kind not in PRIVILEGE_TITLES:
        raise ValueError("promo_code_unavailable")
    if (audience == "first_account_once" and (kind != "welcome" or campaign_id != "WELCOME-ONCE-V1")) or (audience == "returning_account_once" and kind == "welcome"):
        raise ValueError("promo_code_unavailable")
    if audience == "public_reusable" and (kind not in ("return","seasonal") or campaign.get("discoverable") is True):
        raise ValueError("promo_code_unavailable")
    if kind == "birthday" and (campaign.get("occasion_year") != time.gmtime(instant).tm_year or campaign_id != "BIRTHDAY-"+str(campaign.get("occasion_year"))):
        raise ValueError("promo_code_unavailable")
    if audience != "public_reusable" and (not isinstance(campaign_id,str)
        or not re.fullmatch(r"[A-Za-z0-9_-]{8,64}",campaign_id)):
        raise ValueError("promo_code_unavailable")
    return {"code":code,"revision":revision,"bps":bps,"floors":floors,"minimum":minimum,
            "audience":audience,"campaign_id":campaign_id,"kind":kind,
            "occasion_year":campaign.get("occasion_year")}


PRIVILEGE_TITLES={"welcome":"Welcome privilege","return":"Returning customer privilege",
    "second":"Second purchase privilege","loyalty":"Established customer privilege",
    "birthday":"Birthday privilege","replenishment":"Replenishment privilege",
    "comeback":"Welcome back privilege","seasonal":"Seasonal privilege"}


def account_purchase_stage(subject):
    """Recorded direct-retail account orders only; guest history is unknown."""
    refs=PAYMENT_DDB.query(TableName=PAYMENT_LEDGER_TABLE,
        KeyConditionExpression="pk = :subject",
        ExpressionAttributeValues={":subject":{"S":"CONSUMER#"+subject}},
        ConsistentRead=True,ScanIndexForward=False,Limit=40)
    if refs.get("LastEvaluatedKey") or not isinstance(refs.get("Items"),list):
        return "unknown"
    paid=0
    pending=False
    seen=set()
    for ref in refs["Items"]:
        oid=ref.get("orderId",{}).get("S","")
        if not ORDER_ID.fullmatch(oid) or oid in seen or ref.get("customerSub")!={"S":subject}:
            return "unknown"
        seen.add(oid)
        row=PAYMENT_DDB.get_item(TableName=PAYMENT_LEDGER_TABLE,
            Key={"pk":{"S":"ORDER#"+oid},"sk":{"S":"SUMMARY"}},ConsistentRead=True).get("Item") or {}
        if row.get("customerSub")!={"S":subject} or row.get("ownerCommercialPolicy")!={"S":"nutraxin_uk_direct_v1"}:
            return "unknown"
        state=row.get("status",{}).get("S")
        if state=="PAID":
            paid+=1
        elif state not in ("PAYMENT_FAILED","CHECKOUT_EXPIRED"):
            pending=True
    if paid==0:
        return "unknown" if pending else "no_recorded_paid_orders"
    return "one_paid_order" if paid==1 else "two_paid_orders" if paid==2 else "three_or_more_paid_orders"


def returning_grant(promotion, subject, receipt, basket_hash):
    """An account-bound, manually reviewed grant; never issued by this API.

    A claim consumes the grant once when the durable order is created, not
    when a browser previews it. An unpaid/expired claim remains held for
    authorised reconciliation; do not automatically create a second credit.
    """
    if not isinstance(subject,str) or not re.fullmatch(r"consumer_[0-9a-f]{32}",subject):
        raise ValueError("promo_code_unavailable")
    campaign_id=promotion["campaign_id"]
    digest=hashlib.sha256(json.dumps([campaign_id,subject],separators=(",",":")).encode()).hexdigest()
    key={"pk":{"S":"PROMO_GRANT#"+digest},"sk":{"S":"META"}}
    row=PAYMENT_DDB.get_item(TableName=PAYMENT_LEDGER_TABLE,Key=key,
                             ConsistentRead=True).get("Item") or {}
    if (row.get("customerSub")!={"S":subject} or row.get("campaignId")!={"S":campaign_id}
        or row.get("promotionCode")!={"S":promotion["code"]}):
        raise ValueError("promo_code_unavailable")
    state=row.get("status",{}).get("S")
    if state=="CLAIMED" and receipt and row.get("claimedOrderId")=={"S":receipt} and row.get("claimedBasketHash")=={"S":basket_hash}:
        return None
    if state!="APPROVED":
        raise ValueError("promo_code_unavailable")
    prior_id=row.get("priorOrderId",{}).get("S","")
    try:
        expires=int(row.get("expiresAtUnix",{}).get("N",""))
    except (ValueError,TypeError):
        raise ValueError("promo_code_unavailable") from None
    if expires<=now() or prior_id==receipt:
        raise ValueError("promo_code_unavailable")
    kind=promotion["kind"]
    if promotion["audience"]=="first_account_once":
        if prior_id!="NONE" or account_purchase_stage(subject)!="no_recorded_paid_orders":
            raise ValueError("promo_code_unavailable")
    else:
        if not ORDER_ID.fullmatch(prior_id):
            raise ValueError("promo_code_unavailable")
        prior=PAYMENT_DDB.get_item(TableName=PAYMENT_LEDGER_TABLE,
            Key={"pk":{"S":"ORDER#"+prior_id},"sk":{"S":"SUMMARY"}},
            ConsistentRead=True).get("Item") or {}
        if (prior.get("customerSub")!={"S":subject} or prior.get("status")!={"S":"PAID"}
            or prior.get("ownerCommercialPolicy")!={"S":"nutraxin_uk_direct_v1"}):
            raise ValueError("promo_code_unavailable")
        if kind in ("second","loyalty"):
            expected="one_paid_order" if kind=="second" else "three_or_more_paid_orders"
            if account_purchase_stage(subject)!=expected:
                raise ValueError("promo_code_unavailable")
    occasion=kind in ("birthday","replenishment","comeback","seasonal")
    if occasion and (row.get("occasionKind")!={"S":kind} or row.get("occasionReviewed")!={"BOOL":True}):
        raise ValueError("promo_code_unavailable")
    if kind=="birthday" and row.get("occasionYear")!={"N":str(promotion["occasion_year"])}:
        raise ValueError("promo_code_unavailable")
    if receipt is None:
        return None
    claimed=dict(row,status={"S":"CLAIMED"},claimedOrderId={"S":receipt},
                 claimedBasketHash={"S":basket_hash},claimedAtUnix={"N":str(now())})
    # Compare every binding used to validate eligibility. The order/index
    # and claim are written in one DynamoDB transaction.
    condition="#state = :approved AND customerSub = :subject AND campaignId = :campaign AND promotionCode = :code AND priorOrderId = :prior AND expiresAtUnix = :expiry AND expiresAtUnix > :now"
    values={":approved":{"S":"APPROVED"},":subject":{"S":subject},
        ":campaign":{"S":campaign_id},":code":{"S":promotion["code"]},":prior":{"S":prior_id},
        ":expiry":{"N":str(expires)},":now":{"N":str(now())}}
    if occasion:
        condition+=" AND occasionKind = :kind AND occasionReviewed = :reviewed"
        values.update({":kind":{"S":kind},":reviewed":{"BOOL":True}})
    if kind=="birthday":
        condition+=" AND occasionYear = :year"
        values[":year"]={"N":str(promotion["occasion_year"])}
    return {"Put":{"TableName":PAYMENT_LEDGER_TABLE,"Item":claimed,
        "ConditionExpression":condition,"ExpressionAttributeNames":{"#state":"status"},
        "ExpressionAttributeValues":values}}



def direct_checkout(event, customer_subject=None, preview=False):
    # Merchant owner authorised the existing 48-unit-tier price for 1-10000
    # units, 20% UK VAT and no separately charged UK shipping. This business
    # decision does not represent physical warehouse stock as reserved.
    if not SHOP_ENABLED or PAYMENT_DDB is None or CHECKOUT_LAMBDA is None:
        return error(503, "checkout_not_active")
    if not valid_origin(event):
        return error(403, "invalid_origin")
    if event.get("isBase64Encoded"):
        return error(400, "invalid_payload")
    raw = event.get("body") or ""
    if len(raw) > 4096:
        return error(413, "basket_too_large")
    try:
        body = json.loads(raw)
        request_id = body.get("request_id")
        lines = body.get("lines")
        accepts = body.get("accept_terms")
        promo_code = body.get("promo_code")
        gift_card_code = body.get("gift_card_code")
    except (ValueError, AttributeError):
        return error(400, "invalid_basket")
    # Never silently ignore a requested stored-value payment.
    if gift_card_code is not None and gift_card_code != "":
        return error(422, "gift_card_redemption_not_available")
    if not preview and accepts is not True:
        return error(400, "delivery_and_sale_terms_required")
    if not preview and (not isinstance(request_id, str) or not re.fullmatch(
        r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", request_id)):
        return error(400, "invalid_request_id")
    if not isinstance(lines, list) or not 1 <= len(lines) <= 19:
        return error(400, "invalid_order_lines")
    try:
        pricing = json.loads(SSM.get_parameter(Name=PRICES_PARAMETER,WithDecryption=True)["Parameter"]["Value"])
        if pricing.get("status") != "owner_approved_provisional_for_authenticated_quotation_only":
            return error(503, "owner_price_policy_unavailable")
        if pricing.get("owner_retail_sale_authorised") is not True:
            return error(503, "retail_sale_not_authorised")
        assumptions = pricing.get("model_assumptions", {})
        if assumptions.get("uk_delivery_charge_pence") != 0 or assumptions.get("uk_delivery_cost_borne_by_seller") is not True:
            return error(503, "uk_delivery_policy_unavailable")
        if pricing.get("binding_checkout_enabled") is not False:
            return error(503, "private_quote_policy_changed")
        # This direct Products storefront follows the owner-approved public
        # 48-unit reference price and seller-funded UK delivery policy.
        # Do not copy private trade-account approval flags into retail.
        # Do not assert HMRC registration or physically reserved inventory.
        price_by_sku = {item["sku"]: int(item["qty48_price_pence"]) for item in pricing.get("lines", [])}
    except (ClientError, KeyError, ValueError, TypeError):
        return error(503, "owner_price_policy_unavailable")
    if set(price_by_sku) != set(PRODUCTS):
        return error(503, "incomplete_retail_catalogue")
    try:
        promotion = retail_promotion(pricing, promo_code, now())
    except ValueError as exc:
        return error(422, str(exc))
    seen = set()
    ordered = []
    net = 0
    gross = 0
    original_gross = 0
    eligible_original_gross = 0
    for line in lines:
        if not isinstance(line, dict):
            return error(400, "invalid_order_line")
        sku = line.get("sku")
        quantity = line.get("quantity")
        if (not isinstance(sku, str) or sku not in price_by_sku or sku in seen or
            type(quantity) is not int or not 1 <= quantity <= 10000):
            return error(400, "invalid_sku_or_quantity")
        seen.add(sku)
        unit = price_by_sku[sku]
        if unit <= 0 or unit > 99999999:
            return error(503, "invalid_seller_price")
        # Consumer catalogue, portal and Stripe all charge exactly the same
        # published unit price, including VAT rounded per unit.
        line_original_gross = (unit + (unit * 20 + 50) // 100) * quantity
        original_gross += line_original_gross
        if promotion and sku in promotion["floors"]:
            eligible_original_gross += line_original_gross
            discounted = unit - (unit * promotion["bps"]) // 10000
            # Reject the campaign rather than quietly exceeding its margin floor.
            if discounted < promotion["floors"][sku]:
                return error(422, "promo_code_unavailable")
            unit = discounted
        unit_gross = unit + (unit * 20 + 50) // 100
        net += unit * quantity
        gross += unit_gross * quantity
        if gross > 99999999:
            return error(422, "basket_exceeds_stripe_payment_limit")
        ordered.append({"sku": sku, "quantity": quantity,
                        "name": PRODUCTS[sku][0] + " (UK VAT included)",
                        "grossMinor": unit_gross * quantity})
    if promotion and (eligible_original_gross < promotion["minimum"] or original_gross <= gross or gross < 30):
        return error(422, "promo_code_not_applicable")
    tax = gross - net
    if tax < 0 or gross != net + tax:
        return error(503, "failed_total_reconciliation")
    basket_hash = hashlib.sha256(json.dumps(
        sorted((item["sku"], item["quantity"]) for item in ordered),
        separators=(",", ":")).encode()).hexdigest()
    if promotion:
        basket_hash = hashlib.sha256(json.dumps({
            "basket":basket_hash, "code":promotion["code"], "revision":promotion["revision"],
            "original":original_gross, "discounted":gross, "lines":ordered,
            **({"campaignId":promotion["campaign_id"],"audience":promotion["audience"],"kind":promotion["kind"]} if promotion["audience"]!="public_reusable" else {})
        },sort_keys=True,separators=(",",":")).encode()).hexdigest()
    grant_write=None
    if promotion and promotion["audience"]!="public_reusable":
        try:
            grant_write=returning_grant(promotion,customer_subject,
                None if preview else "NUT-"+request_id,basket_hash)
        except ValueError as exc:
            return error(422,str(exc))
        except ClientError:
            return error(503,"promotion_eligibility_unavailable")
    if preview:
        return reply(200, {"currency":"GBP","originalGrossMinor":original_gross,
                          "discountGrossMinor":original_gross-gross,"totalGrossMinor":gross,
                          "taxMinor":tax,"basketVersion":basket_hash,
                          "promotionCode":promotion["code"] if promotion else None})
    if promotion and (body.get("basket_version") != basket_hash):
        return error(422, "promo_quote_changed")
    receipt = "NUT-" + request_id
    subject = customer_subject or ("guest_" + request_id.replace("-", ""))
    quote_version = "ownerprice_v7_unitvat_" + basket_hash[:20]
    item = {
        "pk": {"S": "ORDER#" + receipt}, "sk": {"S": "SUMMARY"},
        "orderId": {"S": receipt}, "customerSub": {"S": subject},
        "customerId": {"S": subject},
        "status": {"S": "APPROVED_FOR_PAYMENT"},
        "currency": {"S": "GBP"}, "destinationCountry": {"S": "GB"},
        "quoteVersion": {"S": quote_version},
        "basketHash": {"S": basket_hash},
        "sellerApprovalReference": {"S": "owner_direct_sale_20261108"},
        "deliveryQuoteReference": {"S": "owner_uk_delivery_included_20261108"},
        "taxAssessmentReference": {"S": "owner_uk_supplement_vat20_20261108"},
        "fulfilmentApprovalReference": {"S": "owner_manufacturer_supply_20261108"},
        "approvedForPayment": {"BOOL": True},
        "stockReserved": {"BOOL": False},
        "sellerProductionCommitment": {"BOOL": True},
        "buyerAcceptsThirtyDayDelivery": {"BOOL": True},
        "taxAndShippingVerified": {"BOOL": True},
        "customerAcceptedTerms": {"BOOL": True},
        "commerciallyApproved": {"BOOL": True},
        "expiresAtUnix": {"N": str(now() + 1800)},
        "productNetMinor": {"N": str(net)},
        "taxMinor": {"N": str(tax)},
        "shippingGrossMinor": {"N": "0"},
        "totalGrossMinor": {"N": str(gross)},
        "approvedLinesJson": {"S": json.dumps(ordered, separators=(",", ":"))},
        "ownerCommercialPolicy": {"S": "nutraxin_uk_direct_v1"}
    }
    if promotion:
        item.update({"promotionCode":{"S":promotion["code"]},
                     "promotionRevision":{"S":promotion["revision"]},
                     "preDiscountGrossMinor":{"N":str(original_gross)},
                     "discountGrossMinor":{"N":str(original_gross-gross)}})
        if promotion["audience"]!="public_reusable":
            item["promotionCampaignId"]={"S":promotion["campaign_id"]}
    prior=None
    try:
        if customer_subject:
            # A consumer-only index item is created atomically with the order.
            # No public request can set the subject: it comes from Cognito GetUser.
            index = {"pk":{"S":"CONSUMER#"+subject},
                     "sk":{"S":"ORDER#"+str(now()).zfill(12)+"#"+receipt},
                     "orderId":{"S":receipt},"customerSub":{"S":subject}}
            # If a previously claimed grant is retried, never create a fresh
            # order in the absence of the original durable summary.
            if promotion and promotion["audience"]!="public_reusable" and grant_write is None:
                prior=PAYMENT_DDB.get_item(TableName=PAYMENT_LEDGER_TABLE,
                    Key={"pk":{"S":"ORDER#"+receipt},"sk":{"S":"SUMMARY"}},
                    ConsistentRead=True).get("Item")
                if not prior:
                    return error(503,"promotion_reconciliation_required")
            else:
                writes=[
                    {"Put":{"TableName":PAYMENT_LEDGER_TABLE,"Item":item,
                            "ConditionExpression":"attribute_not_exists(pk)"}},
                    {"Put":{"TableName":PAYMENT_LEDGER_TABLE,"Item":index,
                            "ConditionExpression":"attribute_not_exists(pk)"}}
                ]
                if grant_write is not None:
                    writes.append(grant_write)
                PAYMENT_DDB.transact_write_items(TransactItems=writes)
        else:
            PAYMENT_DDB.put_item(TableName=PAYMENT_LEDGER_TABLE, Item=item,
                                ConditionExpression="attribute_not_exists(pk)")
    except ClientError as exc:
        # Transactional order + consumer-index writes report a different
        # conditional-conflict exception from a single PutItem.
        code = exc.response.get("Error", {}).get("Code")
        if code not in ("ConditionalCheckFailedException", "TransactionCanceledException"):
            return error(503, "order_creation_unavailable")
        try:
            prior = PAYMENT_DDB.get_item(TableName=PAYMENT_LEDGER_TABLE,
                      Key={"pk": {"S": "ORDER#" + receipt}, "sk": {"S": "SUMMARY"}},
                      ConsistentRead=True).get("Item")
        except ClientError:
            return error(503, "order_creation_unavailable")
        # A transaction conflict with no durable summary is a retryable
        # infrastructure condition, not proof that a buyer reused an ID.
        if not prior:
            return error(503, "order_creation_unavailable")
    if prior:
        if (prior.get("customerSub") != item["customerSub"] or
            prior.get("basketHash") != item["basketHash"] or
            prior.get("quoteVersion") != item["quoteVersion"] or
            prior.get("totalGrossMinor") != item["totalGrossMinor"]):
            return error(409, "request_id_already_used")
        if prior.get("status", {}).get("S") == "PAID":
            return reply(200, {"orderId": receipt, "status": "PAID", "already_paid": True})
    payload = {"action": "start_approved_checkout", "orderId": receipt, "subject": subject}
    try:
        response = CHECKOUT_LAMBDA.invoke(FunctionName=PRODUCTION_CHECKOUT_FUNCTION,
                      InvocationType="RequestResponse",
                      Payload=json.dumps(payload).encode("utf-8"))
        if response.get("FunctionError"):
            return error(503, "stripe_checkout_unavailable")
        wrapped = json.loads(response["Payload"].read().decode("utf-8"))
        checkout = json.loads(wrapped.get("body") or "{}")
        url = checkout.get("checkoutUrl")
        if wrapped.get("statusCode") == 200 and isinstance(url, str) and url.startswith("https://checkout.stripe.com/"):
            return reply(200, {"orderId": receipt, "checkoutUrl": url})
        return error(503, "stripe_checkout_unavailable")
    except (ClientError, ValueError, TypeError, KeyError):
        return error(503, "stripe_checkout_unavailable")


def verified_consumer(event):
    """Cognito validates the access-token signature, lifetime and revocation.
    Decode claims only for binding to the exact consumer pool and web client.
    A token from any other pool, including workforce, is rejected.
    """
    if not valid_origin(event) or not CONSUMER_POOL_ID or not CONSUMER_CLIENT_ID:
        return None
    headers = {str(k).lower():str(v) for k,v in (event.get("headers") or {}).items()}
    bearer=headers.get("authorization","")
    if not bearer.startswith("Bearer ") or len(bearer)>8192:
        return None
    token=bearer[7:]
    if not re.fullmatch(r"[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+",token):
        return None
    try:
        payload=token.split(".")[1]
        claims=json.loads(base64.urlsafe_b64decode(payload+"="*(-len(payload)%4)))
        if (claims.get("iss")!="https://cognito-idp."+REGION+".amazonaws.com/"+CONSUMER_POOL_ID or
            claims.get("client_id")!=CONSUMER_CLIENT_ID or
            claims.get("token_use")!="access" or
            not isinstance(claims.get("exp"),int) or claims["exp"]<=now()):
            return None
        user=COGNITO.get_user(AccessToken=token)
        attrs={v["Name"]:v["Value"] for v in user.get("UserAttributes",[])}
        sub=attrs.get("sub","")
        if (not re.fullmatch(r"[0-9a-fA-F-]{36}",sub) or
            sub!=claims.get("sub") or attrs.get("email_verified")!="true" or
            not isinstance(attrs.get("email"),str)):
            return None
        return {"subject":"consumer_"+sub.replace("-","").lower(),
                "email":attrs["email"],"email_verified":True}
    except (ClientError,ValueError,TypeError,KeyError,UnicodeError):
        return None


def account_orders(customer):
    # A caller can query only its own server-derived partition key.
    try:
        rows=PAYMENT_DDB.query(
            TableName=PAYMENT_LEDGER_TABLE,
            KeyConditionExpression="pk = :subject",
            ExpressionAttributeValues={":subject":{"S":"CONSUMER#"+customer["subject"]}},
            ScanIndexForward=False,Limit=40).get("Items",[])
        orders=[]
        for ref in rows:
            order_id=ref.get("orderId",{}).get("S","")
            if not ORDER_ID.fullmatch(order_id):
                continue
            summary=PAYMENT_DDB.get_item(
                TableName=PAYMENT_LEDGER_TABLE,
                Key={"pk":{"S":"ORDER#"+order_id},"sk":{"S":"SUMMARY"}},
                ConsistentRead=True).get("Item")
            if not summary or summary.get("customerSub")!={"S":customer["subject"]}:
                continue
            state=summary.get("status",{}).get("S","PROCESSING")
            if state not in ("PAID","CHECKOUT_OPEN","OPENING_CHECKOUT","APPROVED_FOR_PAYMENT","PAYMENT_FAILED","CHECKOUT_EXPIRED"):
                state="PROCESSING"
            orders.append({"orderId":order_id,"status":state})
        return reply(200,{"orders":orders})
    except ClientError:
        return error(503,"account_orders_temporarily_unavailable")

def order_status(event, order_id):
    # A random UUIDv4 order reference acts as the lookup capability. Return
    # only payment state, never addresses, email, prices, or payment details.
    if not SHOP_ENABLED:
        return error(503, "checkout_not_active")
    if not valid_origin(event):
        return error(403, "invalid_origin")
    if not ORDER_ID.fullmatch(order_id):
        return error(400, "invalid_order_id")
    try:
        row = PAYMENT_DDB.get_item(
            TableName=PAYMENT_LEDGER_TABLE,
            Key={"pk":{"S":"ORDER#"+order_id},"sk":{"S":"SUMMARY"}},
            ConsistentRead=True).get("Item")
    except ClientError:
        return error(503, "payment_status_unavailable")
    if not row or row.get("ownerCommercialPolicy") != {"S":"nutraxin_uk_direct_v1"}:
        return error(404, "order_not_found")
    state = row.get("status", {}).get("S", "AWAITING_STRIPE")
    return reply(200, {"orderId":order_id,
                       "status":state if state in ("PAID","CHECKOUT_OPEN","PAYMENT_FAILED","CHECKOUT_EXPIRED","APPROVED_FOR_PAYMENT","OPENING_CHECKOUT") else "PROCESSING",
                       "paid":state=="PAID"})

def account_privileges(customer):
    """Discover only explicitly approved, discoverable, account-bound grants."""
    if not SHOP_ENABLED:
        return error(503,"privileges_unavailable")
    subject=customer["subject"]
    try:
        stage=account_purchase_stage(subject)
        pricing=json.loads(SSM.get_parameter(Name=PRICES_PARAMETER,WithDecryption=True)["Parameter"]["Value"])
        policy=pricing.get("retail_promotions")
        campaigns=policy.get("campaigns",{}) if isinstance(policy,dict) and policy.get("enabled") is True else {}
        if not isinstance(campaigns,dict) or len(campaigns)>12:
            return error(503,"privileges_unavailable")
        offers=[]
        for code,campaign in campaigns.items():
            if not isinstance(campaign,dict) or campaign.get("discoverable") is not True:
                continue
            try:
                promo=retail_promotion(pricing,code,now())
                if not promo or promo["audience"]=="public_reusable":
                    continue
                returning_grant(promo,subject,None,None)
            except ValueError:
                continue
            offers.append({"code":promo["code"],"title":PRIVILEGE_TITLES[promo["kind"]],
                "discountBps":promo["bps"],"minimumGrossMinor":promo["minimum"]})
        return reply(200,{"coverage":"recorded_account_paid_orders_only","stage":stage,"offers":offers[:8]})
    except (ClientError,ValueError,TypeError,KeyError):
        return error(503,"privileges_unavailable")


def handler(event, context):
    path = event.get("rawPath") or "/"
    method = (event.get("requestContext",{}).get("http",{}).get("method") or "GET").upper()
    if method == "OPTIONS":
        return reply(204,{})
    if method == "GET" and path == "/readiness":
        return reply(200, {"checkout_ready":SHOP_ENABLED,
                           "payment_collection_active":SHOP_ENABLED,
                           "origin":"novapharmhealthcare.com",
                           "promotion_preview_supported":True,
                           "account_promotion_preview_supported":True,
                           "account_privileges_supported":True,
                           "checkout_path":"/products/nutraxin/bag/"})
    if path in ("/account/me","/account/orders","/account/checkout","/account/quote","/account/privileges"):
        customer=verified_consumer(event)
        if not customer:
            return error(401,"account_sign_in_required")
        if path=="/account/me" and method=="GET":
            return reply(200,{"email":customer["email"],"email_verified":True,
                              "customer_type":"personal"})
        if path=="/account/orders" and method=="GET":
            return account_orders(customer)
        if path=="/account/privileges" and method=="GET":
            return account_privileges(customer)
        if path=="/account/quote" and method=="POST":
            return direct_checkout(event,customer["subject"],preview=True)
        if path=="/account/checkout" and method=="POST":
            return direct_checkout(event,customer["subject"])
        return error(405,"method_not_allowed")
    if method == "POST" and path == "/quote":
        return direct_checkout(event, preview=True)
    if method == "POST" and path == "/checkout":
        return direct_checkout(event)
    if method == "GET" and path.startswith("/status/"):
        return order_status(event,path.removeprefix("/status/"))
    return error(404,"not_found")
