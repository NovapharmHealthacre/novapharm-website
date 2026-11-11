"""Public read-only NovaPharm commerce inventory. No checkout or customer data."""
import json
import re
import boto3
from botocore.exceptions import ClientError

REGION="eu-north-1"
TABLES={"NUT":"novapharm-production-nutraxin-inventory","ESCO":"novapharm-production-esco-inventory"}
ddb=boto3.client("dynamodb",region_name=REGION)
NUT=re.compile(r"^NUT-UK-[A-Z0-9-]{3,64}$")
ESCO=re.compile(r"^NP-ESCO-[0-9]{4}$")

def reply(code,body):
    return {"statusCode":code,"headers":{"content-type":"application/json; charset=utf-8",
            "cache-control":"public, max-age=30" if code==200 else "no-store",
            "x-content-type-options":"nosniff"},"body":json.dumps(body,separators=(",",":"))}

def scalar(v,key,kind="S"):
    return (v.get(key) or {}).get(kind)

def handler(event,context):
    method=((event.get("requestContext") or {}).get("http") or {}).get("method","")
    path=event.get("rawPath","")
    if method!="GET":
        return reply(405,{"error":"method_not_allowed"})
    if path=="/health":
        return reply(200,{"service":"novapharm-commerce-owner-stock","status":"ready","authority":"owner_attestation_only"})
    if path!="/stock":
        return reply(404,{"error":"not_found"})
    query=event.get("queryStringParameters") or {}
    raw=query.get("skus","")
    if not isinstance(raw,str) or len(raw)>2300:
        return reply(400,{"error":"invalid_skus"})
    skus=raw.split(",")
    if not 1<=len(skus)<=24 or len(set(skus))!=len(skus):
        return reply(400,{"error":"invalid_sku_count"})
    names={}
    for sku in skus:
        if NUT.fullmatch(sku):
            names[sku]="NUT"
        elif ESCO.fullmatch(sku):
            names[sku]="ESCO"
        else:
            return reply(400,{"error":"invalid_sku"})
    request={}
    for label,table in TABLES.items():
        keys=[{"sku":{"S":sku}} for sku,kind in names.items() if kind==label]
        if keys:
            request[table]={"Keys":keys,"ConsistentRead":True,
                "ProjectionExpression":"sku,ownerConfirmedUnits,ownerConfirmedAvailableUnits,declaredOnHandUnits,reservedUnits,fulfilledUnits,reconciliationRequired"}
    try:
        results={}
        remaining=request
        for attempt in range(3):
            if not remaining:
                break
            data=ddb.batch_get_item(RequestItems=remaining)
            for table,items in (data.get("Responses") or {}).items():
                for item in items:
                    sku=scalar(item,"sku")
                    if sku in names:
                        declared=scalar(item,"declaredOnHandUnits","N")
                        owner=scalar(item,"ownerConfirmedUnits","N")
                        available=scalar(item,"ownerConfirmedAvailableUnits","N")
                        reserved=scalar(item,"reservedUnits","N")
                        fulfilled=scalar(item,"fulfilledUnits","N")
                        approved=(declared=="10000" and owner=="10000" and
                            available is not None and reserved is not None and fulfilled is not None)
                        count=max(0,min(int(available),int(owner)-int(reserved)-int(fulfilled))) if approved else None
                        results[sku]={"sku":sku,"ownerConfirmedUnits":int(owner) if approved else None,
                            "ownerConfirmedRemainingUnits":count,
                            "stockEvidence":"owner_confirmed_not_independently_audited",
                            "independentAudit":False,"checkoutAuthority":False}
            remaining=data.get("UnprocessedKeys") or {}
        if remaining:
            return reply(503,{"error":"stock_source_busy"})
        return reply(200,{"schema":"novapharm-commerce-stock-public-v1",
            "stockAuthority":"owner_confirmed_warehouse_attestation","notPaymentAuthority":True,
            "items":[results.get(sku,{"sku":sku,"ownerConfirmedUnits":None,
                     "ownerConfirmedRemainingUnits":None,"stockEvidence":"not_available",
                     "independentAudit":False,"checkoutAuthority":False}) for sku in skus]})
    except (ClientError,ValueError,TypeError):
        return reply(503,{"error":"stock_source_unavailable"})
