"""NovaPharm Nutraxin B2B customer portal. Staging, non-binding order requests only.

Cognito-managed sign-in with server-side PKCE exchange, opaque HttpOnly
DynamoDB sessions, explicit verified business-account approval and private
SSM provisional price list. No payment, stock or VAT-invoice authority.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import urllib.parse
import urllib.request

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

REGION = "eu-north-1"
POOL_ID = os.environ["CUSTOMER_USER_POOL_ID"]
CLIENT_ID = os.environ["CUSTOMER_CLIENT_ID"]
COGNITO_DOMAIN = os.environ["COGNITO_DOMAIN"]
BASE_URL = os.environ["BASE_URL"].rstrip("/")
PRICES_PARAMETER = os.environ["PRICES_PARAMETER"]
APPROVED_GROUP = "nutraxin-approved-business-customer"
TABLE = boto3.resource("dynamodb", region_name=REGION).Table(os.environ["DDB_TABLE"])
COGNITO = boto3.client("cognito-idp", region_name=REGION)
SSM = boto3.client("ssm", region_name=REGION)

PAGE = """<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nutraxin Business Ordering | NovaPharm Healthcare</title><meta name="robots" content="noindex,nofollow"><style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#18181b;background:#f5f5f7;font-synthesis:none}*{box-sizing:border-box}body{margin:0}nav{background:rgba(252,252,253,.94);border-bottom:1px solid #e6e6e9}nav div{max-width:1120px;margin:auto;padding:19px 24px;display:flex;justify-content:space-between;gap:16px;align-items:center}nav a{color:inherit;text-decoration:none;font-size:14px}nav b{letter-spacing:.06em;font-size:13px}main{max-width:920px;margin:auto;padding:80px 24px 100px}.eyebrow{font-size:12px;font-weight:700;color:#6e737d;letter-spacing:.08em;text-transform:uppercase}h1{font-size:clamp(42px,7vw,76px);line-height:1.06;letter-spacing:-.035em;margin:15px 0 20px}h2{font-size:26px;letter-spacing:-.02em;margin:0 0 14px}.lead{font-size:clamp(18px,2.5vw,23px);line-height:1.5;color:#5a6069;max-width:760px}.card{border:1px solid #e3e4e8;background:#fff;border-radius:23px;padding:30px;margin-top:32px}.fine{color:#717681;font-size:13px;line-height:1.65}.button{border:0;border-radius:999px;background:#0071e3;color:#fff;font-size:15px;font-weight:600;padding:14px 22px;display:inline-block;text-decoration:none;cursor:pointer}.button:disabled{background:#a5b1c2;cursor:not-allowed}.quiet{background:#eeeef2;color:#20232a}.row{display:grid;grid-template-columns:minmax(0,1fr) 115px;gap:24px;align-items:center;padding:18px 0;border-bottom:1px solid #e5e5e9}.name{font-weight:640;font-size:16px}.pack{display:block;color:#707580;font-size:13px;margin-top:4px}.price{display:block;color:#34363b;font-size:13px;margin-top:4px}.qty{border:1px solid #cbd0d8;border-radius:10px;background:#fcfcfd;padding:12px;width:100%;font:inherit;text-align:center}.actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:24px}.hide{display:none}#message{margin-top:18px;line-height:1.6;font-size:14px}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #0071e3;outline-offset:3px}@media(max-width:580px){main{padding:55px 18px}.card{padding:22px 18px;border-radius:18px}.row{grid-template-columns:minmax(0,1fr) 85px;gap:14px}.name{font-size:14px}}
</style><script defer src="/app.js"></script></head><body><nav><div><a href="https://novapharmhealthcare.com/products/nutraxin/"><b>NOVAPHARM / NUTRAXIN</b></a><a href="https://novapharmhealthcare.com/">NovaPharm Healthcare</a></div></nav><main><p class="eyebrow">NUTRAXIN / BUSINESS ACCOUNTS</p><h1>Business ordering.<br>Made simple.</h1><p class="lead">A private place to review your provisional prices and prepare a purchase request for NovaPharm.</p><section class="card" id="signed-out"><h2>Sign in to continue.</h2><p>New business customers can create and verify an account. NovaPharm approval is required before private pricing or order requests are available.</p><a class="button" href="/login">Sign in or create account</a></section><section class="card hide" id="pending"><h2>Business verification required.</h2><p id="pending-email"></p><p>Your email identity is verified. NovaPharm must qualify your business account before private prices and order requests can be enabled.</p><a class="button" href="https://novapharmhealthcare.com/contact/?enquiry=Pharmacy%20or%20wholesaler%20account">Request business approval</a><form action="/logout" method="post"><button type="submit" class="button quiet">Sign out</button></form></section><section id="approved" class="card hide"><h2>Prepare your order request.</h2><p id="welcome"></p><p class="fine">The prices shown are provisional B2B net prices for the stated quantity tiers. All products and availability remain subject to NovaPharm confirmation. This is not a binding order or a request for payment. VAT treatment, shipping and terms will be confirmed separately.</p><form id="order-form"><div id="products"></div><div class="actions"><button class="button" type="submit" id="send">Submit order request</button><a class="button quiet" href="https://novapharmhealthcare.com/products/nutraxin/">Browse products</a></div><p id="message" role="status" aria-live="polite"></p></form><form action="/logout" method="post"><button class="button quiet" type="submit">Sign out</button></form></section><p class="fine">NovaPharm Healthcare Ltd, United Kingdom. No payment cards are collected. Customer accounts do not automatically confer trading approval. <a href="https://novapharmhealthcare.com/legal/privacy/">Privacy</a>.</p></main></body></html>"""

APP = """(function(){"use strict";
const $=id=>document.getElementById(id);
function show(id){["signed-out","pending","approved"].forEach(x=>$(x).classList.toggle("hide",x!==id));}
function money(pence){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(pence/100);}
async function read(path){const r=await fetch(path,{credentials:"same-origin",cache:"no-store"});if(!r.ok)throw new Error("Request could not be completed ("+r.status+").");return r.json();}
function node(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function render(lines){const host=$("products");host.replaceChildren();for(const item of lines){const row=node("div","row");const info=node("div");const label=node("label","name",item.name);const id="quantity-"+item.sku;label.htmlFor=id;const pack=node("span","pack",item.pack);const price=node("span","price",money(item.price_24_net_pence)+" each at 24+; "+money(item.price_48_net_pence)+" at 48+ (ex VAT)");info.append(label,pack,price);const input=node("input","qty");input.type="number";input.id=id;input.name=item.sku;input.min="0";input.max="999";input.step="1";input.value="0";input.inputMode="numeric";input.setAttribute("aria-label","Requested units for "+item.name);row.append(info,input);host.append(row);}}
async function init(){try{const session=await read("/api/session");if(!session.authenticated){show("signed-out");return;}if(!session.approved){$("pending-email").textContent="Signed in as "+session.email+".";show("pending");return;}const cat=await read("/api/catalogue");$("welcome").textContent="Signed in as "+session.email+".";render(cat.products);show("approved");}catch(e){$("signed-out").append(node("p","fine","Could not load your secure account. Please retry sign-in."));}}
$("order-form").addEventListener("submit",async function(event){event.preventDefault();const lines=[...$("products").querySelectorAll("input")].filter(i=>Number(i.value)>0).map(i=>({sku:i.name,quantity:Number(i.value)}));if(!lines.length){$("message").textContent="Select at least one product and quantity.";return;}const button=$("send");button.disabled=true;$("message").textContent="Submitting your request securely…";try{const r=await fetch("/api/order-requests",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({lines:lines,request_id:crypto.randomUUID()})});const data=await r.json();if(!r.ok||!data.receipt_id)throw new Error(data.error||"No receipt confirmed.");$("message").textContent="Request received: "+data.receipt_id+". NovaPharm will confirm stock, prices, VAT, delivery and terms before accepting any order.";button.disabled=false;}catch(e){$("message").textContent="Submission not confirmed. "+(e.message||"Please retry.");button.disabled=false;}});
init();
})();"""

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

def h(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

def reply(status, body="", content_type="application/json", cookies=None, location=None):
    headers = {"content-type":content_type,"cache-control":"no-store",
        "x-content-type-options":"nosniff","referrer-policy":"no-referrer",
        "strict-transport-security":"max-age=31536000; includeSubDomains",
        "content-security-policy":"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"}
    if location: headers["location"] = location
    result={"statusCode":status,"headers":headers,"body":json.dumps(body,separators=(",",":")) if isinstance(body,(dict,list)) else str(body)}
    if cookies: result["cookies"]=cookies
    return result

def error(status, code):
    return reply(status,{"error":code,"financially_binding":False})

def redirect(url,cookies=None):
    return reply(302,"",cookies=cookies,location=url)

def cookies(event):
    result={}
    for line in event.get("cookies") or []:
        if "=" in line:
            key,value=line.strip().split("=",1)
            result[key]=value
    return result

def cookie(name,value,maxage):
    return name+"="+value+"; Path=/; Max-Age="+str(maxage)+"; Secure; HttpOnly; SameSite=Lax"

def checkout_source():
    payload=json.loads(SSM.get_parameter(Name=PRICES_PARAMETER,WithDecryption=True)["Parameter"]["Value"])
    if (payload.get("schema")!="novapharm.nutraxin.provisional_b2b_prices.v1" or
        payload.get("status")!="owner_approved_provisional_for_authenticated_quotation_only" or
        payload.get("binding_checkout_enabled") is not False or len(payload.get("lines",[]))!=19):
        raise ValueError("Provisional prices unavailable")
    prices={p["sku"]:p for p in payload["lines"]}
    if set(prices)!=set(PRODUCTS):
        raise ValueError("Unmatched product pricing")
    return prices

def session(event):
    raw=cookies(event).get("__Host-np_session","")
    if not (40<=len(raw)<=110 and re.fullmatch(r"[a-zA-Z0-9_\-]+",raw)):return None
    doc=TABLE.get_item(Key={"pk":"SESSION#"+h(raw),"sk":"META"},ConsistentRead=True).get("Item")
    if not doc or int(doc.get("expires_at",0))<=now():return None
    return doc

def approved(username):
    # Approval membership alone is not enough. A disabled, deleted or
    # unverified identity must lose private pricing and requests immediately,
    # even when an opaque browser session has not yet expired.
    try:
        principal=COGNITO.admin_get_user(Username=username,UserPoolId=POOL_ID)
        attributes={x["Name"]:x["Value"] for x in principal.get("UserAttributes",[])}
        if (principal.get("Enabled") is not True or
            principal.get("UserStatus")!="CONFIRMED" or
            attributes.get("email_verified")!="true"):
            return False
        response=COGNITO.admin_list_groups_for_user(Username=username,UserPoolId=POOL_ID,Limit=60)
        return APPROVED_GROUP in {g["GroupName"] for g in response.get("Groups",[])}
    except ClientError:
        return False

def request_base(event):
    host=(event.get("headers") or {}).get("host","")
    trusted={urllib.parse.urlsplit(BASE_URL).netloc,"portal.novapharmhealthcare.com"}
    return "https://"+host if host in trusted else BASE_URL

def login(event):
    state=secrets.token_urlsafe(32)
    verifier=secrets.token_urlsafe(48)
    challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    TABLE.put_item(Item={"pk":"TXN#"+h(state),"sk":"META","verifier":verifier,"expires_at":now()+600},
        ConditionExpression="attribute_not_exists(pk)")
    query=urllib.parse.urlencode({"response_type":"code","client_id":CLIENT_ID,
        "redirect_uri":request_base(event)+"/auth/callback","scope":"openid email profile",
        "state":state,"code_challenge":challenge,"code_challenge_method":"S256"})
    destination="https://"+COGNITO_DOMAIN+"/oauth2/authorize?"+query
    return redirect(destination,[cookie("__Host-np_txn",state,600)])

def callback(event):
    query=event.get("queryStringParameters") or {}
    state=query.get("state","")
    code=query.get("code","")
    txn=cookies(event).get("__Host-np_txn","")
    if not (state and code and len(code)<2048 and hmac.compare_digest(state,txn)):
        return error(400,"invalid_auth_state")
    old=TABLE.delete_item(Key={"pk":"TXN#"+h(state),"sk":"META"},ReturnValues="ALL_OLD").get("Attributes")
    if not old or int(old.get("expires_at",0))<=now():return error(400,"expired_or_reused_auth_state")
    values=urllib.parse.urlencode({"grant_type":"authorization_code","client_id":CLIENT_ID,
        "code":code,"redirect_uri":request_base(event)+"/auth/callback","code_verifier":old["verifier"]}).encode()
    req=urllib.request.Request("https://"+COGNITO_DOMAIN+"/oauth2/token",data=values,
        headers={"content-type":"application/x-www-form-urlencoded"},method="POST")
    try:
        with urllib.request.urlopen(req,timeout=10) as response:
            token=json.loads(response.read(32768).decode())
        principal=COGNITO.get_user(AccessToken=token["access_token"])
    except Exception:
        return error(401,"auth_exchange_failed")
    attributes={x["Name"]:x["Value"] for x in principal.get("UserAttributes",[])}
    if attributes.get("email_verified")!="true" or not attributes.get("sub"):
        return error(403,"verified_email_required")
    handle=secrets.token_urlsafe(48)
    TABLE.put_item(Item={"pk":"SESSION#"+h(handle),"sk":"META",
        "sub":attributes["sub"],"username":principal["Username"],
        "email":attributes.get("email",""),"expires_at":now()+3600},
        ConditionExpression="attribute_not_exists(pk)")
    return redirect(request_base(event)+"/",[cookie("__Host-np_session",handle,3600),cookie("__Host-np_txn","",0)])

def logout(event):
    if (event.get("headers") or {}).get("origin","")!=request_base(event):return error(403,"invalid_origin")
    raw=cookies(event).get("__Host-np_session","")
    if raw:TABLE.delete_item(Key={"pk":"SESSION#"+h(raw),"sk":"META"})
    query=urllib.parse.urlencode({"client_id":CLIENT_ID,"logout_uri":request_base(event)+"/"})
    return redirect("https://"+COGNITO_DOMAIN+"/logout?"+query,
        [cookie("__Host-np_session","",0)])

def submit(event,user):
    if (event.get("headers") or {}).get("origin","")!=request_base(event):return error(403,"invalid_origin")
    if event.get("isBase64Encoded"):return error(400,"invalid_payload")
    raw=event.get("body") or ""
    if len(raw)>4096:return error(413,"request_too_large")
    try: data=json.loads(raw)
    except ValueError:return error(400,"invalid_json")
    request_id=data.get("request_id","")
    lines=data.get("lines")
    if not isinstance(request_id,str) or not re.fullmatch(r"[0-9a-f-]{36}",request_id):
        return error(400,"invalid_request_id")
    if not isinstance(lines,list) or not 1<=len(lines)<=19:return error(400,"invalid_lines")
    prices=checkout_source()
    seen=set()
    accepted=[]
    all_priced=True
    net_total=0
    for line in lines:
        if not isinstance(line,dict):return error(400,"invalid_line")
        sku=line.get("sku")
        qty=line.get("quantity")
        if not isinstance(sku,str) or sku not in prices or sku in seen:
            return error(400,"invalid_or_duplicate_sku")
        if isinstance(qty,bool) or not isinstance(qty,int) or not 1<=qty<=999:
            return error(400,"invalid_quantity")
        seen.add(sku)
        product=prices[sku]
        tier=48 if qty>=48 else (24 if qty>=24 else None)
        unit=int(product["qty48_price_pence"] if tier==48 else product["qty24_price_pence"]) if tier else None
        subtotal=unit*qty if unit is not None else None
        if subtotal is None:all_priced=False
        else:net_total+=subtotal
        accepted.append({"sku":sku,"quantity":qty,"tier":tier,
            "unit_net_pence":unit,"line_net_pence":subtotal})
    receipt="NUT-"+request_id
    order={"pk":"USER#"+user["sub"],"sk":"RQ#"+request_id,"receipt_id":receipt,
        "created_at":now(),"expires_at":now()+30*86400,"status":"PENDING_MANUAL_CONFIRMATION",
        "financially_binding":False,"vat_invoice_created":False,"inventory_reserved":False,
        "currency":"GBP","net_total_pence":net_total if all_priced else None,"lines":accepted}
    try:
        TABLE.put_item(Item=order,ConditionExpression="attribute_not_exists(pk)")
    except ClientError as exc:
        if exc.response["Error"]["Code"]!="ConditionalCheckFailedException":raise
        previous=TABLE.get_item(Key={"pk":order["pk"],"sk":order["sk"]}).get("Item")
        if not previous:return error(409,"duplicate_request")
        order=previous
    return reply(201,{"receipt_id":order["receipt_id"],"status":order["status"],
        "financially_binding":False,"inventory_reserved":False,
        "vat_invoice_created":False,"net_total_pence":order.get("net_total_pence"),
        "notice":"This request awaits NovaPharm review. Prices, UK VAT, inventory and delivery require confirmation."})

def handler(event,context):
    method=(event.get("requestContext",{}).get("http",{}).get("method") or "GET").upper()
    path=event.get("rawPath") or "/"
    if method=="GET" and path=="/":return reply(200,PAGE,"text/html; charset=utf-8")
    if method=="GET" and path=="/app.js":return reply(200,APP,"text/javascript; charset=utf-8")
    if method=="GET" and path=="/login":return login(event)
    if method=="GET" and path=="/auth/callback":return callback(event)
    if method=="POST" and path=="/logout":return logout(event)
    if method=="GET" and path=="/health":
        return reply(200,{"status":"staging_healthy","binding_orders":False})
    if path.startswith("/api/"):
        customer=session(event)
        if method=="GET" and path=="/api/session":
            if not customer:return reply(200,{"authenticated":False,"approved":False})
            return reply(200,{"authenticated":True,"approved":approved(customer["username"]),
                "email":customer.get("email","")})
        if not customer:return error(401,"login_required")
        if not approved(customer["username"]):return error(403,"business_qualification_required")
        if method=="GET" and path=="/api/catalogue":
            prices=checkout_source()
            return reply(200,{"currency":"GBP","priced_for_b2b":True,
                "binding_offer":False,"vat_not_charged":True,"stock_unverified":True,
                "products":[{"sku":sku,"name":PRODUCTS[sku][0],"pack":PRODUCTS[sku][1],
                  "price_24_net_pence":int(prices[sku]["qty24_price_pence"]),
                  "price_48_net_pence":int(prices[sku]["qty48_price_pence"])}
                  for sku in PRODUCTS]})
        if method=="POST" and path=="/api/order-requests":
            return submit(event,customer)
        if method=="GET" and path=="/api/order-requests":
            response=TABLE.query(KeyConditionExpression=Key("pk").eq("USER#"+customer["sub"]),
                Limit=20,ScanIndexForward=False)
            return reply(200,{"requests":[{"receipt_id":o.get("receipt_id"),"status":o.get("status"),
                "created_at":int(o.get("created_at",0)),"financially_binding":False}
                for o in response.get("Items",[]) if o.get("sk","").startswith("RQ#")]})
    return error(404,"not_found")
