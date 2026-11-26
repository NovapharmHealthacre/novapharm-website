"""Discover supplier product identifiers from public brand catalogue pages.
No prices or private supplier data are retrieved into the output. This report
is evidence for later intersection with the private NovaPharm SKU register.
"""
import concurrent.futures
import json
import re
import runpy
import threading
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, parse_qs, urlencode
from urllib.robotparser import RobotFileParser

helper=runpy.run_path(str(Path(__file__).with_name("collect-connective-image-candidates.py")))
fetch=helper["fetch"];trusted=helper["trusted"];ProductPage=helper["ProductPage"];gtin_ok=helper["gtin_ok"]
ROOT="https://www.connectivepharma.com"
BRANDS=["vitabiotics","valupak","sebamed","floradix","seven seas","bioglan","haliborange","skin doctors","sambucol","centrum","equazen","minadex","healthbiotics","califig","efamol","promensil","biogaia","wassen","lansinoh","vicks"]
USER_AGENT="NovaPharm product asset review/1.0"
class Links(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.links=[]
    def handle_starttag(self,tag,attrs):
        if tag=="a":
            href=dict(attrs).get("href")
            if href:self.links.append(href)
lock=threading.Lock()
last_request=0.0
def paced_fetch(url):
    global last_request
    with lock:
        time.sleep(max(0,0.75-(time.monotonic()-last_request)))
        last_request=time.monotonic()
    return fetch(url,helper["MAX_PAGE"])
robots=RobotFileParser()
def allowed_fetch(url):
    if not robots.can_fetch(USER_AGENT,url):raise ValueError("supplier robots policy disallows retrieval")
    return paced_fetch(url)
def index_brand(brand):
    first=ROOT+"/en/products?"+urlencode({"brand":brand,"order_by":"","order_by_type":"asc","perPage":48,"search":"","search_field":"all"})
    pending=[first];visited=set();products=set();errors=[]
    while pending and len(visited)<8:
        url=pending.pop(0)
        if url in visited:continue
        visited.add(url)
        try:
            raw,final=allowed_fetch(url);parser=Links();parser.feed(raw.decode("utf-8",errors="replace"))
            for link in parser.links:
                full=urljoin(final,link);p=urlsplit(full)
                if not trusted(full):continue
                if re.fullmatch(r"/en/product/[0-9]+/[^/]+/?",p.path):
                    products.add(p.scheme+"://"+p.netloc+p.path.rstrip("/"))
                elif p.path.rstrip("/") == "/en/products" and parse_qs(p.query).get("brand")==[brand] and ("page" in parse_qs(p.query)) and full not in visited and full not in pending:
                    pending.append(full)
        except Exception as exc:errors.append({"url":url,"error":type(exc).__name__+": "+str(exc)[:160]})
    return {"brand":brand,"listingPages":len(visited),"urls":sorted(products),"paginationIncomplete":bool(pending),"errors":errors}
def product(url):
    try:
        raw,final=allowed_fetch(url);p=ProductPage();p.feed(raw.decode("utf-8",errors="replace"))
        text=" ".join(p.text)
        found=re.search(r"Barcode\s*:\s*([0-9]{8,14})(?![0-9])",text,re.I)
        pack=re.search(r"Pack size\s*:\s*(.*?)\s*(?:Case size|Pallet quantity|Brand|Barcode)\s*:",text,re.I|re.S)
        name=" ".join(" ".join(p.title).split())
        if not found or not gtin_ok(found.group(1)) or not name or not pack:
            return {"sourcePage":final,"status":"barcode_or_pack_unreconciled"}
        return {"sourcePage":final,"gtin":found.group(1),"name":name,"pack":" ".join(pack.group(1).split()),"status":"supplier_identity_candidate"}
    except Exception as exc:return {"sourcePage":url,"status":"unavailable","error":type(exc).__name__+": "+str(exc)[:160]}
def main():
    out=Path("review-output/connective-discovery");out.mkdir(parents=True,exist_ok=True)
    try:
        raw,_=paced_fetch(ROOT+"/robots.txt");robots.parse(raw.decode("utf-8",errors="replace").splitlines())
    except Exception as exc:
        (out/"report.json").write_text(json.dumps({"status":"robots_unavailable","error":str(exc)[:160]}))
        print("Discovery withheld: robots policy could not be verified");return
    indexes=[index_brand(brand) for brand in BRANDS]
    all_urls=sorted(set(u for index in indexes for u in index["urls"]))
    # Keep one bounded run, never loop over the supplier's entire website.
    urls=all_urls[:650]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(product,urls))
    report={"brandIndexes":indexes,"discoveredPages":len(all_urls),"checkedPages":len(rows),"validIdentityCandidates":sum(r.get("status")=="supplier_identity_candidate" for r in rows),"truncated":len(all_urls)>len(urls),"results":rows,"published":0}
    (out/"report.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({k:v for k,v in report.items() if k not in ("brandIndexes","results")}))
if __name__=="__main__":main()
