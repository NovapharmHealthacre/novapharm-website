#!/usr/bin/env python3
"""Build an isolated non-live candidate for public 392-product discovery + reference-only order tracking."""
from pathlib import Path
import hashlib,json,shutil,re,os
src=Path("_site");dst=Path("published");report=Path("artifacts/commerce-restoration/manifest.json")
assert (src/"CNAME").read_text().strip()=="novapharmhealthcare.com"
assert (dst/"CNAME").read_text().strip()=="novapharmhealthcare.com"
home=(dst/"index.html").read_text()
if "earth-reference-1400.jpg" not in home or "Better access begins with better decisions." not in home:raise RuntimeError("Must retain approved home")
if not (dst/"assets/css/products-editorial.css").is_file():raise RuntimeError("Approved November Products stylesheet must be published before staging derived Commerce pages")
for path in ("products/esco/index.html","products/esco/bag/index.html","products/nutraxin/index.html"):
 if not (dst/path).is_file():raise RuntimeError("Existing approved catalogue missing: "+path)
index=json.loads((src/"assets/data/commerce-marketplace.json").read_text())
items=index.get("products",[])
if index.get("notPaymentAuthority") is not True or index.get("sourceProductCount")!=392 or len(items)!=392:raise RuntimeError("Unverified combined product index")
if (sum(x.get("brand")=="Nutraxin" for x in items),sum(x.get("brand")=="ESCO" for x in items))!=(19,373):raise RuntimeError("392 SKU identity mismatch")
if any(x.get("cardCheckoutAuthority") is not False or x.get("availabilityQuantity") is not None for x in items):raise RuntimeError("Public marketplace cannot authorize payment or stock")
if "targetGrossMargin" in json.dumps(index):raise RuntimeError("Commercial margins must not be public")
market=(src/"products/marketplace/index.html").read_text()
track=(src/"products/track/index.html").read_text()
if market.count('class="mp-source-index-link"')!=392 or "data-commerce-marketplace" not in market:raise RuntimeError("392 public catalogue links not rendered")
if 'https://novapharmhealthcare.com/products/marketplace/' not in market or '"@type":"CollectionPage"' not in market:raise RuntimeError("Marketplace canonical/schema missing")
if 'data-np-order-lookup' not in track or 'https://novapharmhealthcare.com/products/track/' not in track:raise RuntimeError("Order status form/canonical missing")
trackingJs=(src/"assets/js/commerce-order-track.js").read_text()
if any(t not in trackingJs for t in ("const labels=","data.orderId!==ref","data.status","Object.hasOwn(labels,data.status)")):raise RuntimeError("Status-only response allowlist missing")
for p in ("assets/js/commerce-marketplace.js","assets/js/commerce-order-track.js","assets/css/commerce-marketplace.css","assets/css/commerce-order-track.css"):
 if not (src/p).is_file():raise RuntimeError("Commerce dependency missing: "+p)
allowedFiles={
 "products/marketplace/index.html","products/track/index.html",
 "assets/data/commerce-marketplace.json",
 "assets/js/commerce-marketplace.js","assets/js/commerce-order-track.js",
 "assets/css/commerce-marketplace.css","assets/css/commerce-order-track.css"
}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
before={p.relative_to(dst).as_posix():sha(p) for p in dst.rglob("*") if p.is_file() and ".git" not in p.parts}
changed=[]
for relative in sorted(allowedFiles):
 source=src/relative
 if not source.is_file():raise RuntimeError("Required commerce file absent: "+relative)
 destination=dst/relative
 if destination.exists() and sha(destination)==sha(source):continue
 destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,destination)
 changed.append(relative)
after={p.relative_to(dst).as_posix():sha(p) for p in dst.rglob("*") if p.is_file() and ".git" not in p.parts}
if any(after.get(p)!=v for p,v in before.items()):raise RuntimeError("An existing public website file was overwritten")
# A read-only PR verification may find the approved seven-file public namespace
# already present and byte-identical. Publishing/staging push jobs still fail closed
# on an empty release: they never set the PR-only opt-in.
if not changed and not (os.environ.get("NOVAPHARM_CI_ALLOW_NOOP") == "true" and os.environ.get("GITHUB_EVENT_NAME") == "pull_request"):
 raise RuntimeError("No new commerce public files staged")
if any(p not in allowedFiles for p in changed):raise RuntimeError("Stage escaped approved commerce paths")
for relative in ("products/marketplace/index.html","products/track/index.html"):
 content=(dst/relative).read_text()
 for url in re.findall(r'(?:href|src)\s*=\s*["\'](/assets/[^"\'?#]+)',content,re.I):
  if not (dst/url.lstrip("/")).is_file():raise RuntimeError("Broken commerce asset "+url)
out={"mode":"NON_LIVE_COMMERCE_RELEASE_CANDIDATE","parentPublicFileCount":len(before),"addedFiles":len(changed),"productCount":392,"nutraxinCount":19,"escoCount":373,"paymentAuthority":False,"customerData":False,"changedPaths":changed}
report.parent.mkdir(parents=True,exist_ok=True);report.write_text(json.dumps(out,indent=2)+"\n")
print("COMMERCE_SCOPED_STAGING_OK "+json.dumps({k:v for k,v in out.items() if k!="changedPaths"}))
