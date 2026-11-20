#!/usr/bin/env python3
"""Read-only compare of approved staged public build and live gh-pages source."""
from pathlib import Path
import json,hashlib,re,collections,os

source=Path("_site")
live=Path("published")
assert (source/"index.html").is_file(), "Missing staged public homepage"
assert (live/"index.html").is_file(), "Missing current published homepage"
assert (source/"CNAME").read_text().strip()=="novapharmhealthcare.com"
assert (live/"CNAME").read_text().strip()=="novapharmhealthcare.com"
approved=json.loads(Path("seo/generated/page-metadata-register.json").read_text())
def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()
def text(file):
    return file.read_text(errors="replace")
def h1(s):
    m=re.search(r"<h1\b[^>]*>([\s\S]*?)</h1>",s,re.I)
    if not m:return ""
    return re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",m.group(1))).strip()
def title(s):
    m=re.search(r"<title[^>]*>([\s\S]*?)</title>",s,re.I)
    return m.group(1).strip() if m else ""
def grouping(path):
    if path.startswith("products/") or path.startswith("shopping/"): return "preserve-commerce"
    if path.startswith("contact/") or path.startswith("portal/") or path.startswith("account-application/"): return "preserve-customer-service"
    if path.startswith("assets/"): return "asset"
    if path.startswith("_next/"): return "preserve-current-next-bundle"
    if path.startswith("legal/"): return "legal-review"
    if path.startswith("quantum-research/"):return "research-review"
    return "editorial-review"

candidate_files=sorted(p for p in source.rglob("*") if p.is_file())
existing_files=sorted(p for p in live.rglob("*") if p.is_file() and ".git" not in p.parts)
html_files=sorted(p for p in candidate_files if p.name=="index.html" or p.name=="404.html")
rows=[]
for p in html_files:
    path=p.relative_to(source).as_posix()
    previous=live/path
    current=text(p)
    before=text(previous) if previous.exists() else ""
    group=grouping(path)
    rows.append({"file":path,"group":group,"existsOnPages":previous.exists(),"identical":previous.exists() and digest(p)==digest(previous),"stagedH1":h1(current),"publishedH1":h1(before),"stagedTitle":title(current),"publishedTitle":title(before),"bytes":p.stat().st_size})
paths={p.relative_to(source).as_posix():p for p in candidate_files}
missing_assets=[]
changed_assets=[]
for name,p in paths.items():
    if not name.startswith("assets/"):continue
    old=live/name
    if not old.exists(): missing_assets.append(name)
    elif digest(p)!=digest(old):changed_assets.append(name)

# Stop a page rollout that could silently regress a secured flow.
preserved=("contact/index.html","portal/index.html","account-application/index.html","products/index.html","products/nutraxin/index.html")
for path in preserved:
    assert (live/path).is_file(), "Missing live protected/commerce surface: "+path
    assert (source/path).is_file(), "Missing candidate surface: "+path
sku_pages = sorted((source/"products/nutraxin").glob("*/index.html"))
assert len(sku_pages)>=19, f"Approved public build must stage at least 19 Nutraxin product references and may include protected bag/account pages; found {len(sku_pages)}"

home=text(source/"index.html")
for marker in ['nph-earth-hero-landscape','earth-reference-1400.jpg','A better way to understand, access and move medicine.','data-mega-trigger="intelligence"']:
    assert marker in home, "Owner-approved homepage missing "+marker
assert 'data-mega-trigger="company"' in home
assert 'data-contact-form' not in home

# Verify generated HTML title/H1 vs source register without rewriting any staged file.
registrations={}
for entry in approved:
    route=entry.get("route","")
    path="index.html" if route=="/" else route.strip("/")+"/index.html"
    html=source/path
    registrations[path]={"registered":bool(html.exists()),"expectedTitle":entry.get("title"),"stagedTitle":title(text(html)) if html.exists() else None}
missing_registered=[p for p,v in registrations.items() if not v["registered"]]

report={
  "reviewStage":"NO_DEPLOYMENT",
  "candidateSourceSha":os.getenv("GITHUB_SHA"),
  "summary":{
    "sourceRegisteredRoutes":len(approved),"stagedHtmlFiles":len(html_files),"stagedNutraxinRoutesIncludingBagAndAccounts":len(sku_pages),
    "livePagesFiles":len(existing_files),"candidateFiles":len(candidate_files),
    "editorialChanged":sum(x["group"]=="editorial-review" and not x["identical"] for x in rows),
    "legalChanged":sum(x["group"]=="legal-review" and not x["identical"] for x in rows),
    "commercePreserveChanged":sum(x["group"]=="preserve-commerce" and not x["identical"] for x in rows),
    "customerServicePreserveChanged":sum(x["group"]=="preserve-customer-service" and not x["identical"] for x in rows),
    "missingReferencedRouteFiles":len(missing_registered),"assetsMissingFromPublishedBranch":len(missing_assets),
    "assetsDifferingFromPublishedBranch":len(changed_assets)
  },
  "protectedPreservePaths":list(preserved),
  "changedHtml":[row for row in rows if not row["identical"]],
  "stagedHtml":rows,
  "candidateMissingAssets":missing_assets,
  "candidateDifferentAssets":changed_assets,
  "missingRegisteredPaths":missing_registered,
}
Path("artifacts/restore-preview").mkdir(parents=True,exist_ok=True)
Path("artifacts/restore-preview/manifest.json").write_text(json.dumps(report,indent=2))
print("RESTORATION PREVIEW SUMMARY",json.dumps(report["summary"]))
print("EDITORIAL DIFFERENCES",json.dumps([{"file":r["file"],"before":r["publishedH1"],"candidate":r["stagedH1"]} for r in rows if r["group"]=="editorial-review" and not r["identical"]][:50]))
print("PROTECTED DIFFERENCES",json.dumps([r["file"] for r in rows if r["group"] in ("preserve-commerce","preserve-customer-service") and not r["identical"]][:50]))
print("ASSET CHANGES",json.dumps({"missing":missing_assets[:80],"different":changed_assets[:80]}))
if missing_registered:raise SystemExit("Candidate missing registered canonical HTML routes: "+str(missing_registered))
