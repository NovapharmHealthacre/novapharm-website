#!/usr/bin/env python3
"""Stage non-live ESCO public pages from reviewed public-only build, without shared overwrite."""
from pathlib import Path
import hashlib,json,shutil,re,os
src=Path("_site");dst=Path("published");manifest=Path("artifacts/esco-restoration/manifest.json")
if (src/"CNAME").read_text().strip()!="novapharmhealthcare.com" or (dst/"CNAME").read_text().strip()!="novapharmhealthcare.com":raise RuntimeError("Domain mismatch")
h=(dst/"index.html").read_text()
if "Better access begins with better decisions." not in h or "earth-reference-1400.jpg" not in h:raise RuntimeError("Restored homepage missing")
data=json.loads((src/"assets/data/esco-catalogue.json").read_text())
imgs=json.loads((src/"assets/data/esco-model-photo-map.json").read_text())
if data.get("entriesTotal")!=373 or len(data.get("categories",[]))!=12 or data.get("requestQuoteOnly") is not True or data.get("checkoutEnabled") is not False:raise RuntimeError("ESCO dataset or commercial status mismatch")
if imgs.get("mappedImagesCount")!=61 or len(imgs.get("images",{}))!=61:raise RuntimeError("ESCO supplier image match count mismatch")
for rel in ("products/esco/index.html","products/esco/bag/index.html"):
 p=src/rel
 if not p.is_file():raise RuntimeError("Generated route missing: "+rel)
 text=p.read_text()
 if "https://novapharmhealthcare.com/"+rel.removesuffix("index.html") not in text:raise RuntimeError("Canonical missing: "+rel)
if (src/"products/esco/index.html").read_text().count("data-esco-entry")<373:raise RuntimeError("373 catalogue entries not generated")
for rel in ("assets/js/esco-catalogue.js","assets/js/esco-bag.js","assets/css/esco-catalogue.css","assets/data/esco-checkout-config.json","assets/data/esco-uk-guide-prices.json","assets/data/esco-model-photo-map.json"):
 if not (src/rel).is_file():raise RuntimeError("Browser dependency missing: "+rel)
cfg=json.loads((src/"assets/data/esco-checkout-config.json").read_text())
if cfg.get("public_guide_prices_authorize_payment") is not False or cfg.get("payment_eligibility_from_server_only") is not True:raise RuntimeError("Public data must not enable payment")
def allowed(p):
 return p.startswith(("products/esco/","assets/media/esco/","assets/js/esco-","assets/css/esco-")) or p in (
  "assets/data/esco-catalogue.json","assets/data/esco-model-photo-map.json","assets/data/esco-checkout-config.json","assets/data/esco-uk-guide-prices.json")
def protected(p):
 return p=="index.html" or p in ("CNAME","robots.txt","sitemap.xml","llms.txt") or p.startswith(("contact/","account-application/","products/nutraxin/","legal/","portal/","shopping/","_next/"))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
before={p.relative_to(dst).as_posix():sha(p) for p in dst.rglob("*") if p.is_file() and ".git" not in p.parts and protected(p.relative_to(dst).as_posix())}
changed=[]
for source in src.rglob("*"):
 if not source.is_file():continue
 relative=source.relative_to(src).as_posix()
 if not allowed(relative):continue
 if source.suffix.lower() in (".env",".pem",".key",".db",".sqlite",".bak"):raise RuntimeError("Secret file rejected")
 destination=dst/relative
 if relative=="assets/data/esco-catalogue.json":
  public=dict(data);public.pop("targetGrossMargin",None)
  contents=(json.dumps(public,ensure_ascii=False,indent=2)+"\n").encode()
  if destination.exists() and destination.read_bytes()==contents:continue
  destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(contents)
 else:
  if destination.exists() and sha(destination)==sha(source):continue
  destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,destination)
 changed.append(relative)
after={p.relative_to(dst).as_posix():sha(p) for p in dst.rglob("*") if p.is_file() and ".git" not in p.parts and protected(p.relative_to(dst).as_posix())}
if before!=after:raise RuntimeError("Protected site files changed")
if not changed:raise RuntimeError("No ESCO files staged")
for rel in ("products/esco/index.html","products/esco/bag/index.html"):
 html=(dst/rel).read_text()
 for url in re.findall(r'(?:href|src)\s*=\s*["\'](/assets/[^"\'?#]+)',html,re.I):
  if not (dst/url.lstrip("/")).is_file():raise RuntimeError("Missing ESCO asset "+url+" on "+rel)
report={"kind":"NON_LIVE_ESCO_CANDIDATE","sourceCommit":os.getenv("GITHUB_SHA"),"unchangedProtectedFiles":len(before),"changedFileCount":len(changed),"entries":373,"categories":12,"modelMappedPhotos":61,"marginSanitised":True,"checkoutRemainsServerGated":True,"files":sorted(changed)}
manifest.parent.mkdir(parents=True,exist_ok=True);manifest.write_text(json.dumps(report,indent=2)+"\n")
print("SCOPE_OK "+json.dumps({k:v for k,v in report.items() if k!="files"}))
