"""IAM-only WMS price revision worker. Existing approved Connective offers only."""
import hashlib
import json
import os
import re
import time

def verified_retail_offer(row, instant):
    """Allowlisted customer-facing fields only; private ledger approval is authoritative."""
    try:
        p=json.loads(row["offerJson"]["S"])
        sku=row["sk"]["S"]
        gtin=p["gtin"]
        if not isinstance(gtin,str) or not re.fullmatch(r"(?:\d{8}|\d{12}|\d{13}|\d{14})",gtin):
            return None
        if (10-sum(int(c)*(3 if i%2==0 else 1) for i,c in enumerate(reversed(gtin[:-1])))%10)%10!=int(gtin[-1]):
            return None
        if sku!="NP-CP-"+gtin or p.get("sku")!=sku:
            return None
        if any(p.get(k) is not True for k in ("identityConfirmed","imageRightsConfirmed","ukRetailApproved","priceApproved","vatTreatmentVerified","fulfilmentVerified","orderingEnabled","sellerDeliveryCommitment","labelInformationVerified")):
            return None
        supply_model=p.get("supplyModel","stock_verified")
        if supply_model=="supplier_backed":
            if (p.get("stockVerified") is not False or
                p.get("supplierBackedOrdering") is not True or
                p.get("orderingCapacityOnly") is not True):
                return None
        elif supply_model=="stock_verified":
            if p.get("stockVerified") is not True:
                return None
        else:
            return None
        if p.get("productClass") not in ("food_supplement","cosmetic","consumer_non_medicinal"):
            return None
        if type(p.get("expiresAt")) is not int or not instant < p["expiresAt"] <= instant+31*86400:
            return None
        for key in ("name","pack","brand","category"):
            if not isinstance(p.get(key),str) or not 1<=len(p[key])<=90 or any(ord(c)<32 for c in p[key]):
                return None
        if not isinstance(p.get("image"),str) or not re.fullmatch(r"/assets/media/products/[a-zA-Z0-9/_-]+\.(?:avif|webp|png|jpg)",p["image"]):
            return None
        net,vat,qty=p.get("netMinor"),p.get("vatBasisPoints"),p.get("availableQuantity")
        if type(net) is not int or not 1<=net<=99999999 or type(vat) is not int or vat not in (0,500,2000) or type(qty) is not int or not 1<=qty<=10000:
            return None
        gross=net+(net*vat+5000)//10000
        if gross>99999999 or p.get("grossMinor")!=gross:
            return None
        public={k:p[k] for k in ("sku","gtin","name","pack","brand","category","image","netMinor","vatBasisPoints","grossMinor","availableQuantity","productClass")}
        public["supplyModel"]=supply_model
        return public
    except (KeyError,ValueError,TypeError,AttributeError):
        return None

PARTITION = "RETAIL#APPROVED"
AUDIT = "WMS#PRICE-AUDIT"

class Rejected(Exception):
    pass

def digest(raw):
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def key(pk, sk):
    return {"pk":{"S":pk},"sk":{"S":sk}}

def gross_for(net, vat):
    return net + (net * vat + 5000) // 10000

def net_for(gross, vat):
    if type(gross) is not int or not 1 <= gross <= 99999999:
        raise Rejected("invalid_gross")
    # Some gross-pence values cannot be represented at a fixed per-unit tax rate.
    candidate = gross * 10000 // (10000 + vat)
    for net in range(max(1, candidate - 1), candidate + 3):
        if gross_for(net, vat) == gross:
            return net
    raise Rejected("gross_not_representable_at_verified_vat")

def get(ddb, table, pk, sk):
    return ddb.get_item(TableName=table, Key=key(pk,sk), ConsistentRead=True).get("Item")

def current(ddb, table, sku, instant):
    row = get(ddb, table, PARTITION, sku)
    offer = verified_retail_offer(row,instant) if row else None
    if not offer:
        raise Rejected("existing_eligible_offer_required")
    raw = row["offerJson"]["S"]
    return row, offer, raw

def result_state(ddb, table, sku, instant, audit):
    row = get(ddb, table, PARTITION, sku)
    raw = row.get("offerJson",{}).get("S","") if row else ""
    visible = verified_retail_offer(row,instant) if row else None
    return {"status":"ledger_revision_confirmed" if visible and digest(raw)==audit["afterHash"] else "recorded_revision_not_current",
            "sku":sku,"requestId":audit["requestId"],"grossMinor":audit["grossMinor"],
            "currentGrossMinor":visible["grossMinor"] if visible else None,"websiteVerified":False,"stripeVerified":False}

def execute(event, ddb, table, instant, enabled=False):
    if not isinstance(event,dict):
        raise Rejected("invalid_request")
    action=event.get("action")
    sku=event.get("sku")
    if not isinstance(sku,str) or not re.fullmatch(r"NP-CP-[0-9]{8,14}",sku):
        raise Rejected("unsupported_sku")
    if action=="inspect":
        if set(event)!={"action","sku"}:
            raise Rejected("unexpected_fields")
        _,offer,raw=current(ddb,table,sku,instant)
        return {"status":"eligible_existing_offer","sku":sku,"grossMinor":offer["grossMinor"],
                "vatBasisPoints":offer["vatBasisPoints"],"availableQuantity":offer["availableQuantity"],
                "supplyModel":offer["supplyModel"],"expectedHash":digest(raw)}
    if action!="publish_price" or set(event)!={"action","sku","grossMinor","expectedHash","requestId","actor","draftRevision"}:
        raise Rejected("unexpected_fields")
    if not enabled:
        raise Rejected("publisher_disabled")
    request_id,actor,expected,revision=event["requestId"],event["actor"],event["expectedHash"],event["draftRevision"]
    gross=event["grossMinor"]
    if (not isinstance(request_id,str) or not re.fullmatch(r"[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}",request_id)
        or not isinstance(actor,str) or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._@-]{2,159}",actor)
        or not isinstance(expected,str) or not re.fullmatch(r"[a-f0-9]{64}",expected)
        or type(revision) is not int or not 1<=revision<=2147483647
        or type(gross) is not int or not 1<=gross<=99999999):
        raise Rejected("invalid_revision_request")
    fingerprint=digest(json.dumps(event,sort_keys=True,separators=(",",":")))
    prior=get(ddb,table,AUDIT,request_id)
    if prior:
        record=json.loads(prior["revisionJson"]["S"])
        if record["fingerprint"]!=fingerprint:
            raise Rejected("idempotency_conflict")
        return result_state(ddb,table,sku,instant,record)
    _,offer,raw=current(ddb,table,sku,instant)
    if digest(raw)!=expected:
        raise Rejected("stale_offer_reload")
    updated=json.loads(raw)
    updated["netMinor"]=net_for(gross,offer["vatBasisPoints"])
    updated["grossMinor"]=gross
    after=json.dumps(updated,separators=(",",":"),ensure_ascii=False)
    if not verified_retail_offer({"sk":{"S":sku},"offerJson":{"S":after}},instant):
        raise Rejected("updated_offer_invalid")
    record={"requestId":request_id,"sku":sku,"actor":actor,"draftRevision":revision,
            "fingerprint":fingerprint,"beforeHash":expected,"afterHash":digest(after),
            "beforeGrossMinor":offer["grossMinor"],"grossMinor":gross,"vatBasisPoints":offer["vatBasisPoints"],"recordedAt":instant}
    # Conditional on exact prior bytes; preserve every other attribute and offer field.
    # Audit and price change commit together or neither commits.
    ddb.transact_write_items(TransactItems=[
        {"Update":{"TableName":table,"Key":key(PARTITION,sku),"UpdateExpression":"SET offerJson = :after",
                   "ConditionExpression":"offerJson = :before","ExpressionAttributeValues":{":before":{"S":raw},":after":{"S":after}}}},
        {"Put":{"TableName":table,"Item":{**key(AUDIT,request_id),"revisionJson":{"S":json.dumps(record,separators=(",",":"))}},
                "ConditionExpression":"attribute_not_exists(pk)"}}
    ])
    return result_state(ddb,table,sku,instant,record)

def handler(event,context):
    import boto3
    from botocore.exceptions import ClientError
    table=os.environ["PAYMENT_LEDGER_TABLE"]
    try:
        return execute(event,boto3.client("dynamodb"),table,int(time.time()),os.environ.get("WMS_PRICE_PUBLISH_ENABLED")=="true")
    except Rejected as e:
        return {"status":"rejected","reason":str(e)}
    except ClientError as e:
        code=e.response.get("Error",{}).get("Code")
        return {"status":"retry_or_reload" if code in ("TransactionCanceledException","ConditionalCheckFailedException") else "unavailable"}
