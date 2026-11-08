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
ALERT_TOPIC = os.environ.get("ORDER_ALERT_TOPIC_ARN", "")
SNS = boto3.client("sns", region_name=REGION) if ALERT_TOPIC else None
PRODUCTION_CHECKOUT_FUNCTION = os.environ.get("PRODUCTION_CHECKOUT_FUNCTION", "")
CHECKOUT_LAMBDA = boto3.client("lambda", region_name=REGION) if PRODUCTION_CHECKOUT_FUNCTION else None

PAGE = """<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nutraxin | Customer Account | NovaPharm Healthcare</title><meta name="robots" content="noindex,nofollow"><style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#18181b;background:#f5f5f7;font-synthesis:none}*{box-sizing:border-box}body{margin:0}nav{background:rgba(252,252,253,.94);border-bottom:1px solid #e6e6e9}nav div{max-width:1120px;margin:auto;padding:19px 24px;display:flex;justify-content:space-between;gap:16px;align-items:center}nav a{color:inherit;text-decoration:none;font-size:14px}nav b{letter-spacing:.06em;font-size:13px}main{max-width:920px;margin:auto;padding:80px 24px 100px}.eyebrow{font-size:12px;font-weight:700;color:#6e737d;letter-spacing:.08em;text-transform:uppercase}h1{font-size:clamp(42px,7vw,76px);line-height:1.06;letter-spacing:-.035em;margin:15px 0 20px}h2{font-size:26px;letter-spacing:-.02em;margin:0 0 14px}.lead{font-size:clamp(18px,2.5vw,23px);line-height:1.5;color:#5a6069;max-width:760px}.card{border:1px solid #e3e4e8;background:#fff;border-radius:23px;padding:30px;margin-top:32px}.fine{color:#717681;font-size:13px;line-height:1.65}.button{border:0;border-radius:999px;background:#0071e3;color:#fff;font-size:15px;font-weight:600;padding:14px 22px;display:inline-block;text-decoration:none;cursor:pointer}.button:disabled{background:#a5b1c2;cursor:not-allowed}.quiet{background:#eeeef2;color:#20232a}.row{display:grid;grid-template-columns:minmax(0,1fr) 115px;gap:24px;align-items:center;padding:18px 0;border-bottom:1px solid #e5e5e9}.name{font-weight:640;font-size:16px}.pack{display:block;color:#707580;font-size:13px;margin-top:4px}.price{display:block;color:#34363b;font-size:13px;margin-top:4px}.qty{border:1px solid #cbd0d8;border-radius:10px;background:#fcfcfd;padding:12px;width:100%;font:inherit;text-align:center}.actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:24px}.business-option{border-top:1px solid #e3e4e8;margin-top:30px;padding-top:22px}.business-option h3{font-size:18px;letter-spacing:-.02em;margin:0 0 8px}.business-option a{font-size:14px;color:#0066cc}.retail-shop{margin-top:60px}.retail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;margin:24px 0}.retail-card{background:#fff;padding:18px;border-radius:18px;border:1px solid #e3e4e8}.retail-card img{width:100%;aspect-ratio:1;object-fit:contain}.retail-card h3{font-size:15px;line-height:1.4;margin:12px 0 4px;min-height:2.8em}.retail-card p{margin:6px 0}.retail-card button{font-size:13px;padding:10px 14px;margin-top:10px}.retail-card a{font-size:13px;color:#0066cc}.retail-card .retail-muted{color:#737985;font-size:12px}.bag-summary{border:1px solid #e3e4e8;border-radius:18px;background:white;padding:22px}.bag-summary button{border:0;background:none;color:#0066cc;padding:4px;cursor:pointer;font:inherit;text-decoration:underline}.hide{display:none}#message{margin-top:18px;line-height:1.6;font-size:14px}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #0071e3;outline-offset:3px}@media(max-width:580px){main{padding:55px 18px}.card{padding:22px 18px;border-radius:18px}.row{grid-template-columns:minmax(0,1fr) 85px;gap:14px}.name{font-size:14px}}
</style><script defer src="/app.js"></script></head><body><nav><div><a href="https://novapharmhealthcare.com/products/nutraxin/"><b>NOVAPHARM / NUTRAXIN</b></a><a href="https://novapharmhealthcare.com/">NovaPharm Healthcare</a></div></nav><main><p class="eyebrow">NUTRAXIN / CUSTOMER ACCOUNT</p><h1>Welcome to Nutraxin.</h1><p class="lead">Explore the collection, sign in to your account and return whenever you like. Personal shopping and business trading are separate experiences.</p><section class="card" id="signed-out"><h2>Your Nutraxin account.</h2><p>Browse the product collection without registering. Sign in when you want to manage your account. You do not need a business account for personal shopping.</p><div class="actions"><a class="button" href="https://novapharmhealthcare.com/products/nutraxin/">Browse the collection</a><a class="button quiet" href="/login">Sign in or create account</a></div></section><section class="card hide" id="pending"><h2>Your account is ready.</h2><p id="pending-email"></p><p>Your email is verified. Personal shoppers do not need business approval to explore Nutraxin. Retail prices, delivery and payment checkout are being prepared; no purchase or payment can be completed from this page yet.</p><div class="actions"><a class="button" href="https://novapharmhealthcare.com/products/nutraxin/">Explore Nutraxin products</a><form action="/logout" method="post"><button type="submit" class="button quiet">Sign out</button></form></div><div class="business-option"><h3>Buying for a pharmacy or wholesale business?</h3><p class="fine">Only trade accounts need additional checks before private wholesale prices and business order requests are available.</p><a href="https://novapharmhealthcare.com/account-application/">Apply for business access</a></div></section><section id="approved" class="card hide"><h2>Your verified business account.</h2><p class="fine">Business account access is separate from Nutraxin retail shopping. You can also <a href="https://novapharmhealthcare.com/products/nutraxin/">browse the public collection</a>.</p><h3>Prepare a business order request.</h3><p id="welcome"></p><p class="fine">Minimum 1 unit per selected product; you may request up to 10,000 units per SKU. The existing 48-unit reference price applies to every quantity from 1 to 10,000. This is an order request, not proof of 10,000 units physically in stock. The prices shown are provisional B2B net prices for the stated quantity tiers. All products and availability remain subject to NovaPharm confirmation. This is not a binding order or a request for payment. VAT treatment, shipping and terms will be confirmed separately.</p><form id="order-form"><div id="products"></div><p id="indicative-totals" class="fine" aria-live="polite">Select product quantities to see an illustrative 20% UK VAT estimate. Shipping is not included. This is not a VAT invoice or an offer to pay.</p><div class="actions"><button class="button" type="submit" id="send">Submit order request</button><a class="button quiet" href="https://novapharmhealthcare.com/products/nutraxin/">Browse products</a></div><p id="message" role="status" aria-live="polite"></p></form><section aria-labelledby="request-history-heading"><h3 id="request-history-heading">Your requests</h3><p class="fine" id="history-status" role="status">Loading recent requests…</p><div id="request-history"></div></section><form action="/logout" method="post"><button class="button quiet" type="submit">Sign out</button></form></section><section class="retail-shop" aria-labelledby="retail-shop-title"><p class="eyebrow">NUTRAXIN / THE COLLECTION</p><h2 id="retail-shop-title">Explore and save your favourites.</h2><p class="fine">Choose products for your bag. Retail prices, availability and checkout are not yet active. A saved bag is not an order.</p><div class="retail-grid" id="retail-grid"><p>Loading the collection...</p></div><div class="bag-summary"><h3>Your bag</h3><p role="status" id="retail-bag-status">Your bag is empty.</p><ol id="retail-bag-items"></ol><button type="button" id="retail-bag-clear">Clear bag</button><p class="fine">Checkout is currently unavailable; no payment is collected or stock reserved.</p></div></section><p class="fine">NovaPharm Healthcare Ltd, United Kingdom. No payment cards are collected. Customer accounts do not automatically confer trading approval. <a href="https://novapharmhealthcare.com/legal/privacy/">Privacy</a>.</p></main></body></html>"""

APP = """(function(){"use strict";
const $=id=>document.getElementById(id);
function show(id){["signed-out","pending","approved"].forEach(x=>$(x).classList.toggle("hide",x!==id));}
function money(pence){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(pence/100);}
const indicativeVatRateBps=2000;
const indicativePrices=new Map();
function estimatedVatPence(netPence){return Math.round(netPence*indicativeVatRateBps/10000);}
function updateIndicativeTotals(){
 let netPence=0;
 for(const input of $("products").querySelectorAll("input")){
  const quantity=Number(input.value),unitPence=indicativePrices.get(input.name);
  if(!Number.isSafeInteger(quantity)||quantity<0||quantity>10000||(quantity>0&&quantity<1)||!Number.isSafeInteger(unitPence)||unitPence<1){
   $("indicative-totals").textContent="Enter a whole-unit quantity of 1 to 10,000 for each selected product.";
   return;
  }
  netPence+=quantity*unitPence;
 }
 if(!Number.isSafeInteger(netPence)){
  $("indicative-totals").textContent="Please request smaller quantities for a reviewed quotation.";return;
 }
 if(netPence===0){
  $("indicative-totals").textContent="Select 1 to 10,000 units per product to view provisional totals. UK VAT at 20% is illustrative only.";return;
 }
 const estimatedVat=estimatedVatPence(netPence);
 $("indicative-totals").textContent="Provisional product subtotal: "+money(netPence)+" (ex VAT). Illustrative UK VAT at 20% (only if legally applicable): "+money(estimatedVat)+". Provisional total: "+money(netPence+estimatedVat)+". Excludes shipping; not a VAT invoice, binding offer or payment request.";
}
async function read(path){const r=await fetch(path,{credentials:"same-origin",cache:"no-store"});if(!r.ok)throw new Error("Request could not be completed ("+r.status+").");return r.json();}
function node(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function render(lines){const host=$("products");host.replaceChildren();indicativePrices.clear();for(const item of lines){indicativePrices.set(item.sku,Number(item.price_48_net_pence));const row=node("div","row");const info=node("div");const label=node("label","name",item.name);const id="quantity-"+item.sku;label.htmlFor=id;const pack=node("span","pack",item.pack);const price=node("span","price",money(item.price_48_net_pence)+" per unit (ex VAT). The 48-unit reference price applies to all quantities, even 1 unit. Order request range 1–10,000. UK VAT at 20% is indicative only where legally applicable.");info.append(label,pack,price);const input=node("input","qty");input.type="number";input.id=id;input.name=item.sku;input.min="0";input.max="10000";input.step="1";input.value="0";input.inputMode="numeric";input.setAttribute("aria-label","Requested units for "+item.name);input.addEventListener("input",updateIndicativeTotals);row.append(info,input);host.append(row);}updateIndicativeTotals();}
async function renderHistory(){
 const host=$("request-history"),status=$("history-status");
 host.replaceChildren();
 try {
  const data=await read("/api/order-requests");
  const items=Array.isArray(data.requests)?data.requests.slice(0,20):[];
  if(!items.length){status.textContent="No requests yet.";return;}
  status.textContent="Purchase requests are reviewed by NovaPharm. Secure payment is offered only after a final order, delivery and taxes have been approved.";
  for(const item of items){
   const line=node("div","row");
   const information=node("div");
   const reference=node("span","name",String(item.receipt_id||"Request"));
   const stamp=Number(item.created_at||0);
   const date=stamp>0?new Date(stamp*1000).toLocaleDateString("en-GB"):"Date unavailable";
   const label=node("span","pack",date+" · "+String(item.status||"Awaiting review").replaceAll("_"," ").toLowerCase());
   information.append(reference,label);line.append(information);
   if(item.status==="APPROVED_FOR_PAYMENT"&&typeof item.receipt_id==="string"){
    const pay=node("button","button","Pay securely");pay.type="button";pay.setAttribute("aria-label","Pay approved order "+item.receipt_id);
    pay.addEventListener("click",async()=>{
     pay.disabled=true;status.textContent="Opening secure payment for your approved order…";
     try{
      const orderId=String(item.receipt_id);
      const r=await fetch("/api/order-requests/"+encodeURIComponent(orderId)+"/checkout",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:""});
      const data=await r.json();
      if(!r.ok||typeof data.checkoutUrl!=="string"||!data.checkoutUrl.startsWith("https://checkout.stripe.com/"))throw new Error("Your final order is not yet available for payment.");
      window.location.assign(data.checkoutUrl);
     }catch(e){status.textContent=e.message||"Checkout unavailable. Please contact NovaPharm.";pay.disabled=false;}
    });
    line.append(pay);
   }
   host.append(line);
  }
 } catch {
  status.textContent="Request history is temporarily unavailable. Please try again later.";
 }
}
async function init(){try{const session=await read("/api/session");if(!session.authenticated){show("signed-out");return;}if(!session.approved){$("pending-email").textContent="Signed in as "+session.email+".";show("pending");return;}const cat=await read("/api/catalogue");$("welcome").textContent="Signed in as "+session.email+".";render(cat.products);show("approved");void renderHistory();}catch(e){$("signed-out").append(node("p","fine","Could not load your secure account. Please retry sign-in."));}}
$("order-form").addEventListener("submit",async function(event){event.preventDefault();const lines=[...$("products").querySelectorAll("input")].filter(i=>Number(i.value)>0).map(i=>({sku:i.name,quantity:Number(i.value)}));if(!lines.length){$("message").textContent="Select at least one product and quantity.";return;}const button=$("send");button.disabled=true;$("message").textContent="Submitting your request securely…";try{const r=await fetch("/api/order-requests",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({lines:lines,request_id:crypto.randomUUID()})});const data=await r.json();if(!r.ok||!data.receipt_id)throw new Error(data.error||"No receipt confirmed.");$("message").textContent="Request received: "+data.receipt_id+". Provisional products "+money(data.net_total_pence)+" + illustrative UK VAT at 20% "+money(data.indicative_vat_pence)+" = "+money(data.indicative_gross_total_pence)+". Shipping excluded. No payment taken or VAT charged; NovaPharm will confirm availability and terms.";button.disabled=false;void renderHistory();}catch(e){$("message").textContent="Submission not confirmed. "+(e.message||"Please retry.");button.disabled=false;}});
// A saved bag is a local selection, not a paid or accepted order.
const retailStorageKey="novapharm.nutraxin.bag.v1";
const retailBag=new Map();let retailProducts=[];
function retailLoad(){try{const data=JSON.parse(localStorage.getItem(retailStorageKey)||"[]");if(Array.isArray(data))for(const item of data){if(typeof item?.sku==="string"&&Number.isSafeInteger(item.quantity)&&item.quantity>=1&&item.quantity<=99)retailBag.set(item.sku,item.quantity);}}catch{}}
function retailPersist(){try{localStorage.setItem(retailStorageKey,JSON.stringify([...retailBag].map(([sku,quantity])=>({sku,quantity}))));}catch{}}
function retailSummary(){
 const valid=new Set(retailProducts.map(p=>p.sku));
 for(const sku of [...retailBag.keys()])if(!valid.has(sku))retailBag.delete(sku);
 const list=$("retail-bag-items");list.replaceChildren();let total=0;
 for(const product of retailProducts){const count=retailBag.get(product.sku)||0;if(!count)continue;total+=count;list.append(node("li",null,product.name+" — "+count+" unit"+(count===1?"":"s")));}
 $("retail-bag-status").textContent=total?total+" item"+(total===1?"":"s")+" saved. Prices and checkout are not yet enabled.":"Your bag is empty.";
 retailPersist();
}
async function retailCollection(){
 const host=$("retail-grid");
 try{
  const data=await read("/api/retail/catalogue");
  if(!Array.isArray(data.products)||data.products.length!==19||data.checkout_enabled!==false||data.public_retail_prices_approved!==false)throw new Error("Retail catalogue not ready");
  retailProducts=data.products;host.replaceChildren();
  for(const product of retailProducts){
   if(typeof product.sku!=="string"||typeof product.name!=="string"||typeof product.slug!=="string"||!/^[a-z0-9-]+$/.test(product.slug))continue;
   const card=node("article","retail-card"),picture=node("img");picture.src="https://novapharmhealthcare.com/assets/media/products/nutraxin/"+product.slug+".png";picture.alt=product.name+" pack";picture.loading="lazy";picture.width=180;picture.height=180;
   const name=node("h3",null,product.name),pack=node("p","retail-muted",product.pack),price=node("p","retail-muted","Retail price pending confirmation");
   const detail=node("a",null,"Product details");detail.href="https://novapharmhealthcare.com/products/nutraxin/"+product.slug+"/";
   const add=node("button","button quiet","Add to bag");add.type="button";
   add.addEventListener("click",()=>{retailBag.set(product.sku,Math.min(99,(retailBag.get(product.sku)||0)+1));retailSummary();});
   const actions=node("div","actions");actions.append(add,detail);card.append(picture,name,pack,price,actions);host.append(card);
  }
  retailSummary();
 }catch{host.replaceChildren(node("p","fine","The collection is temporarily unavailable. Browse the product pages on the main website."));}
}
retailLoad();
$("retail-bag-clear").addEventListener("click",()=>{retailBag.clear();retailSummary();});
void retailCollection();
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

PUBLIC_SLUGS = {
  "NUT-UK-VD3-T120": "vitamin-d3-120-tablets",
  "NUT-UK-VD3-S30": "vitamin-d3-spray-30ml",
  "NUT-UK-VD3K2-T120": "vitamin-d3-k2-120-tablets",
  "NUT-UK-VD3K2-S30": "vitamin-d3-k2-spray-30ml",
  "NUT-UK-VC1000-T30": "vitamin-c-1000mg-30-tablets",
  "NUT-UK-VC500-C30": "vitamin-c-500mg-chewable-30-tablets",
  "NUT-UK-VMAX-T60": "vitamin-max-60-tablets",
  "NUT-UK-VMAX-E15": "vitamin-max-15-effervescent-tablets",
  "NUT-UK-MGCX-T60": "magnesium-complex-60-tablets",
  "NUT-UK-MGDL-T60": "magnesium-daily-60-tablets",
  "NUT-UK-MVE-T60": "multivitamin-mineral-energy-60-tablets",
  "NUT-UK-MVW-T60": "womens-multivitamin-complex-60-tablets",
  "NUT-UK-MVM-T60": "mens-multivitamin-complex-60-tablets",
  "NUT-UK-CG-T30": "collagen-gold-30-tablets",
  "NUT-UK-CG-S30": "collagen-gold-30-sachets",
  "NUT-UK-CCX-T90": "collagen-complex-90-tablets",
  "NUT-UK-ART-T90": "artoflex-90-tablets",
  "NUT-UK-LCAR-T60": "l-carnitine-60-tablets",
  "NUT-UK-B12-SL60": "vitamin-b12-60-sublingual-tablets"
}

def now():
    return int(time.time())

def h(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

def reply(status, body="", content_type="application/json", cookies=None, location=None):
    headers = {"content-type":content_type,"cache-control":"no-store",
        "x-content-type-options":"nosniff","referrer-policy":"no-referrer",
        "strict-transport-security":"max-age=31536000; includeSubDomains",
        "content-security-policy":"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' https://novapharmhealthcare.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"}
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
        "redirect_uri":request_base(event)+"/auth/callback","scope":"openid email profile aws.cognito.signin.user.admin",
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
    except Exception as exc:
        # Log only the exception class and provider error code, never tokens or PII.
        if isinstance(exc, ClientError):
            kind=exc.response.get("Error",{}).get("Code","cognito_error")
        else:
            kind=getattr(exc,"code",type(exc).__name__)
        print("auth_exchange_failed",str(kind)[:60])
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

def illustrative_uk_vat_pence(net_pence):
    """Illustrative standard rate; not a tax charge or VAT invoice."""
    if type(net_pence) is not int or net_pence < 0:
        raise ValueError("A valid net subtotal in GBP pence is required")
    return (net_pence * 20 + 50) // 100

def submit(event,user):
    if (event.get("headers") or {}).get("origin","")!=request_base(event):return error(403,"invalid_origin")
    if event.get("isBase64Encoded"):return error(400,"invalid_payload")
    raw=event.get("body") or ""
    if len(raw)>4096:return error(413,"request_too_large")
    try: data=json.loads(raw)
    except ValueError:return error(400,"invalid_json")
    request_id=data.get("request_id","")
    lines=data.get("lines")
    if not isinstance(request_id,str) or not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",request_id):
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
        if isinstance(qty,bool) or not isinstance(qty,int) or not 1<=qty<=10000:
            return error(400,"invalid_quantity")
        seen.add(sku)
        product=prices[sku]
        tier=48
        unit=int(product["qty48_price_pence"])
        subtotal=unit*qty if unit is not None else None
        if subtotal is None:all_priced=False
        else:net_total+=subtotal
        accepted.append({"sku":sku,"quantity":qty,"tier":tier,
            "price_basis":"48_unit_reference_applied_to_all_quantities_1_to_10000",
            "unit_net_pence":unit,"line_net_pence":subtotal})
    # Bind an idempotency key to the canonical basket, not merely the ID.
    canonical_lines=sorted((item["sku"],item["quantity"]) for item in accepted)
    request_hash=hashlib.sha256(json.dumps(canonical_lines,separators=(",",":")).encode()).hexdigest()
    receipt="NUT-"+request_id
    order={"pk":"USER#"+user["sub"],"sk":"RQ#"+request_id,"receipt_id":receipt,
        "created_at":now(),"expires_at":now()+30*86400,"status":"PENDING_MANUAL_CONFIRMATION",
        "financially_binding":False,"vat_invoice_created":False,"inventory_reserved":False,
        "currency":"GBP","net_total_pence":net_total if all_priced else None,
        "illustrative_uk_vat_rate_bps":2000,
        "indicative_vat_pence":illustrative_uk_vat_pence(net_total) if all_priced else None,
        "indicative_gross_total_pence":net_total+illustrative_uk_vat_pence(net_total) if all_priced else None,
        "vat_charged_pence":0,"shipping_excluded":True,
        "request_hash":request_hash,"lines":accepted}
    created=False
    try:
        TABLE.put_item(Item=order,ConditionExpression="attribute_not_exists(pk)")
        created=True
    except ClientError as exc:
        if exc.response["Error"]["Code"]!="ConditionalCheckFailedException":raise
        previous=TABLE.get_item(Key={"pk":order["pk"],"sk":order["sk"]},ConsistentRead=True).get("Item")
        if not previous:return error(409,"duplicate_request")
        if previous.get("request_hash")!=request_hash:
            return error(409,"request_id_reused_with_different_basket")
        order=previous
    # A duplicate request does not produce another staff notification.
    # The request stays durably recorded even if SNS is temporarily unavailable.
    if created and SNS is not None:
        try:
            SNS.publish(TopicArn=ALERT_TOPIC,
                Subject="NovaPharm: New Nutraxin B2B quotation request",
                Message=json.dumps({"event":"NUTRAXIN_QUOTATION_REQUEST","receipt_id":receipt,
                    "customer_sub":user["sub"],"sku_count":len(accepted),"requires_manual_confirmation":True}))
        except ClientError as exc:
            print("staff_alert_failed",exc.response.get("Error",{}).get("Code","sns_error"))
    total=order.get("net_total_pence")
    net=int(total) if total is not None else None
    vat=illustrative_uk_vat_pence(net) if net is not None else None
    return reply(201,{"receipt_id":order["receipt_id"],"status":order["status"],
        "financially_binding":False,"inventory_reserved":False,
        "vat_invoice_created":False,"vat_charged_pence":0,"shipping_excluded":True,
        "net_total_pence":net,"illustrative_uk_vat_rate_bps":2000,
        "indicative_vat_pence":vat,
        "indicative_gross_total_pence":net+vat if net is not None else None,
        "notice":"This is a non-binding quote. The 20% UK VAT figure is illustrative, not a tax charge. Confirm stock, actual VAT treatment and shipping before payment."})

def start_approved_payment(event, customer, receipt_id):
    # Same-origin, authenticated approved-business action. No browser prices.
    if (event.get("headers") or {}).get("origin", "") != request_base(event):
        return error(403, "invalid_origin")
    if event.get("body") not in (None, "") or event.get("isBase64Encoded"):
        return error(400, "invalid_checkout_payload")
    if not CHECKOUT_LAMBDA or not PRODUCTION_CHECKOUT_FUNCTION:
        return error(503, "checkout_not_configured")
    if not re.fullmatch(r"NUT-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", receipt_id):
        return error(400, "invalid_order_reference")
    quote_id = receipt_id[4:]
    quote = TABLE.get_item(Key={"pk":"USER#" + customer["sub"], "sk":"RQ#" + quote_id},
                           ConsistentRead=True).get("Item")
    if (not quote or quote.get("receipt_id") != receipt_id or
        quote.get("status") != "APPROVED_FOR_PAYMENT"):
        return error(409, "awaiting_approved_final_order")
    payload = {"action":"start_approved_checkout","orderId":receipt_id,"subject":customer["sub"]}
    try:
        invoked = CHECKOUT_LAMBDA.invoke(
            FunctionName=PRODUCTION_CHECKOUT_FUNCTION,
            InvocationType="RequestResponse",
            Payload=json.dumps(payload).encode("utf-8"))
        if invoked.get("FunctionError"):
            return error(503, "checkout_service_unavailable")
        returned = json.loads(invoked["Payload"].read().decode("utf-8"))
        status = returned.get("statusCode")
        body = json.loads(returned.get("body") or "{}")
        url = body.get("checkoutUrl", "")
        if status != 200 or not isinstance(url, str) or not url.startswith("https://checkout.stripe.com/"):
            return error(409 if status in (400, 403, 404, 409) else 503, "approved_checkout_unavailable")
        return reply(200, {"checkoutUrl": url, "orderId":receipt_id})
    except (ClientError, ValueError, TypeError, KeyError):
        return error(503, "checkout_service_unavailable")

def handler(event,context):
    method=(event.get("requestContext",{}).get("http",{}).get("method") or "GET").upper()
    path=event.get("rawPath") or "/"
    if method=="GET" and path=="/":return reply(200,PAGE,"text/html; charset=utf-8")
    if method=="GET" and path=="/app.js":return reply(200,APP,"text/javascript; charset=utf-8")
    if method=="GET" and path=="/login":return login(event)
    if method=="GET" and path=="/auth/callback":return callback(event)
    if method=="POST" and path=="/logout":return logout(event)
    if method=="GET" and path=="/api/retail/catalogue":
        # Public catalogue data only; personal shoppers never need wholesale approval.
        # Do not expose the private B2B quotation register as consumer retail prices.
        return reply(200,{"currency":"GBP","public_retail_prices_approved":False,
            "checkout_enabled":False,"payment_collection_enabled":False,
            "products":[{"sku":sku,"name":item[0],"pack":item[1],"slug":PUBLIC_SLUGS[sku],
                "retail_price_pence":None,"sale_status":"not_offered"}
                for sku,item in PRODUCTS.items()]})
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
                  "reference_quantity":48,
                  "price_basis":"48_unit_reference_applied_to_all_quantities_1_to_10000",
                  "price_48_net_pence":int(prices[sku]["qty48_price_pence"])}
                  for sku in PRODUCTS]})
        if method=="POST" and re.fullmatch(r"/api/order-requests/NUT-[0-9a-f-]{36}/checkout",path):
            return start_approved_payment(event,customer,path.split("/")[-2])
        if method=="POST" and path=="/api/order-requests":
            return submit(event,customer)
        if method=="GET" and path=="/api/order-requests":
            response=TABLE.query(KeyConditionExpression=Key("pk").eq("USER#"+customer["sub"]),
                Limit=20,ScanIndexForward=False)
            return reply(200,{"requests":[{"receipt_id":o.get("receipt_id"),"status":o.get("status"),
                "created_at":int(o.get("created_at",0)),"financially_binding":False}
                for o in response.get("Items",[]) if o.get("sk","").startswith("RQ#")]})
    return error(404,"not_found")
