#!/usr/bin/env python3
"""Create a nonproduction editorial candidate from a validated public-only build."""
from pathlib import Path
import os,hashlib,json,shutil,re

source=Path("_site")
published=Path("published")
assert (source/"CNAME").read_text().strip()=="novapharmhealthcare.com"
assert (published/"CNAME").read_text().strip()=="novapharmhealthcare.com"
EDITORIAL_ROOTS={
"about","capabilities","careers","cro","distribution","investor-information",
"leadership","market-access","markets","news-insights","oncology",
"partner-with-us","regulatory-services","services","technology","trust-centre"
}
PROTECTED_PREFIXES=("contact/","portal/","account-application/","products/","shopping/","legal/","_next/")
SHARED_SAFE_UPDATES={
"assets/css/novapharm.bundle.css",
"assets/js/novapharm.js",
"assets/js/cookie-consent.js",
"assets/js/visual-refinement.js",
"assets/js/marketing-attribution.js"
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def safe_path(p):
    return p.replace("\\","/")
def path_is_protected(p):
    return p=="index.html" or p.startswith(PROTECTED_PREFIXES) or p in ("CNAME","robots.txt","sitemap.xml","sitemap-images.xml","sitemap-insights.xml","shopping/nutraxin-uk.tsv")
def collect_inventory():
    return {
        p.relative_to(published).as_posix():sha(p)
        for p in published.rglob("*") if p.is_file() and ".git" not in p.parts
        and (path_is_protected(p.relative_to(published).as_posix()))
    }

before=collect_inventory()
if not (published/"index.html").read_text(errors="replace").count("novapharm-scoped-homepage-restore"):
    raise RuntimeError("Owner-restored homepage not found in checked-out gh-pages; stop")
pageChanges=[]
needs=set()
pages=[p for p in source.rglob("index.html") if p.is_file()]
for p in pages:
    rel=p.relative_to(source).as_posix()
    bits=rel.split("/")
    if bits[0] not in EDITORIAL_ROOTS:continue
    if rel.startswith("technology/") and rel!="technology/index.html":continue
    text=p.read_text(errors="replace")
    if 'name="novapharm-source-sha"' not in text:
        raise RuntimeError("Unstamped source provenance: "+rel)
    if re.search(r'<input\b[^>]*type=["\']password',text,re.I) or 'data-login-form' in text:
        raise RuntimeError("Protected login marker in editorial candidate: "+rel)
    dest=published/rel
    same=dest.exists() and sha(dest)==sha(p)
    if same:continue
    dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(p,dest)
    pageChanges.append(rel)
    for raw in re.findall(r'(?:href|src|srcset|data-src)\s*=\s*["\']([^"\']+)["\']',text,re.I):
        for piece in raw.split(","):
            value=piece.strip().split(" ")[0].split("?")[0].split("#")[0]
            if value.startswith("/assets/"):needs.add(value.lstrip("/"))
# The global source bundle is the owner-approved visual and mega-menu implementation.
needs.add("assets/css/novapharm.bundle.css")
processed=set()
assetWrites=[]
assetPreserved=[]
while needs:
    rel=needs.pop()
    if rel in processed:continue
    processed.add(rel)
    approved=source/rel
    dest=published/rel
    if not approved.is_file():
        if dest.is_file():continue
        raise RuntimeError("Staged editorial page references absent asset: "+rel)
    if dest.is_file() and sha(approved)==sha(dest):
        continue
    if dest.is_file() and rel not in SHARED_SAFE_UPDATES:
        assetPreserved.append(rel)
        continue
    dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(approved,dest)
    assetWrites.append(rel)
    if rel.endswith(".css"):
        css=approved.read_text(errors="replace")
        for m in re.findall(r'url\(\s*["\']?(/assets/[^)"\']+)',css,re.I):
            needs.add(m.split("?")[0].strip().lstrip("/"))
        for m in re.findall(r'@import\s+["\'](/assets/[^"\']+)',css,re.I):
            needs.add(m.split("?")[0].lstrip("/"))

after=collect_inventory()
if before!=after:
    changed={x:{"before":before.get(x),"after":after.get(x)} for x in set(before)|set(after) if before.get(x)!=after.get(x)}
    raise RuntimeError("Protected public data changed: "+json.dumps(changed)[:500])
for rel in pageChanges:
    html=(published/rel).read_text(errors="replace")
    if 'data-mega-trigger="company"' not in html or 'data-mega-trigger="intelligence"' not in html:
        raise RuntimeError("Approved global navigation missing from "+rel)
    for raw in re.findall(r'(?:href|src|srcset|data-src)\s*=\s*["\']([^"\']+)["\']',html,re.I):
        for piece in raw.split(","):
            url=piece.strip().split(" ")[0].split("?")[0].split("#")[0]
            if url.startswith("/assets/") and not (published/url.lstrip("/")).is_file():
                raise RuntimeError("Broken staged asset "+url+" at "+rel)

report={
  "kind":"STAGED_EDITORIAL_ONLY_NOT_LIVE",
  "mainSource":os.getenv("GITHUB_SHA"),
  "protectedFilesVerifiedUnchanged":len(before),
  "editorialChanged":len(pageChanges),
  "changedPages":pageChanges,
  "assetsAddedOrUpdated":assetWrites,
  "conflictingAssetsPreserved":assetPreserved,
  "homePreserved":True,
  "contactPortalCommercePreserved":True
}
Path("artifacts/editorial-candidate").mkdir(parents=True,exist_ok=True)
Path("artifacts/editorial-candidate/manifest.json").write_text(json.dumps(report,indent=2))
print("SAFE EDITORIAL RESTORATION CANDIDATE "+json.dumps(report))
assert pageChanges, "No editorial content differences: review whether candidate already deployed"
