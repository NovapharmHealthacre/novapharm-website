"""Manufacturer-direct Vitabiotics packshot discovery; review only.
Never infer a variant from the product name or a generic image.
"""
import hashlib,json,re,time
from pathlib import Path
from urllib.parse import urlsplit,urljoin
from urllib.request import Request,build_opener,HTTPRedirectHandler
from urllib.robotparser import RobotFileParser
from xml.etree import ElementTree
import runpy
ROOT="https://www.vitabiotics.com"
AGENT="NovaPharm product asset review/1.0"
SITE={"www.vitabiotics.com","vitabiotics.com"}
CDN={"cdn.shopify.com"}
MAX=12*1024*1024
last=0.0
def trusted(url):
    p=urlsplit(url)
    return p.scheme=="https" and p.hostname in SITE|CDN and p.username is None and p.password is None and p.port in (None,443) and (p.hostname not in CDN or p.path.startswith("/s/files/1/0027/7263/1621/"))
class Redirect(HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if not trusted(newurl):raise ValueError("untrusted redirect")
        return super().redirect_request(req,fp,code,msg,headers,newurl)
def fetch(url,limit=MAX,check=True):
    global last
    if not trusted(url):raise ValueError("untrusted URL")
    if check and not robots.can_fetch(AGENT,url):raise ValueError("robots policy excludes URL")
    time.sleep(max(0,0.8-(time.monotonic()-last)));last=time.monotonic()
    with build_opener(Redirect()).open(Request(url,headers={"User-Agent":AGENT,"Accept":"*/*"}),timeout=12) as res:
        data=res.read(limit+1)
        if len(data)>limit:raise ValueError("oversized response")
        return data,res.geturl()
robots=RobotFileParser()
def locs(raw):
    root=ElementTree.fromstring(raw)
    return [e.text for e in root.findall("./*/{*}loc") if e.text]
def main():
    out=Path("review-output/vitabiotics");out.mkdir(parents=True,exist_ok=True)
    register=json.loads(Path("docs/retail/vitabiotics-image-review-gtins.json").read_text())
    wanted=set(register["gtins"]);assert len(wanted)==95 and register["publicationApproved"] is False
    helper=runpy.run_path("scripts/collect-connective-image-candidates.py")
    assert all(helper["gtin_ok"](g) for g in wanted)
    rows=[]; errors=[]; matches={g:[] for g in wanted};checked=0
    def consider(product):
        nonlocal checked
        checked+=1
        handle=product.get("handle","")
        if not re.fullmatch(r"[a-zA-Z0-9-]+",handle):return
        variants=product.get("variants") or []
        images={str(i.get("id")):i for i in product.get("images",[]) if isinstance(i,dict)}
        for v in variants:
            g=str(v.get("barcode") or "").strip()
            if g not in wanted:continue
            image=images.get(str(v.get("image_id")))
            if image is None and len(variants)==1:
                image=next(iter(images.values()),None)
            matches[g].append({"gtin":g,"name":product.get("title"),"variant":v.get("title"),"sourcePage":ROOT+"/products/"+handle,"image":image.get("src") if image else None})
    try:
        raw,_=fetch(ROOT+"/robots.txt",check=False);robots.parse(raw.decode("utf8",errors="replace").splitlines())
        # Public product catalogue JSON, no account or privileged endpoints.
        # If unsupported, fall back to individual official sitemap product pages.
        try:
            for page in range(1,5):
                raw,_=fetch(ROOT+f"/products.json?limit=250&page={page}")
                batch=json.loads(raw)["products"]
                if not batch:break
                for p in batch:consider(p)
                if len(batch)<250:break
        except Exception as exc:errors.append({"stage":"public catalogue","error":str(exc)[:180]})
        if not any(matches.values()):
            raw,_=fetch(ROOT+"/sitemap.xml")
            sitemaps=[u for u in locs(raw) if "sitemap_products" in u and trusted(u)]
            urls=set()
            for sitemap in sitemaps[:8]:
                raw,_=fetch(sitemap)
                urls.update(u for u in locs(raw) if trusted(u) and re.fullmatch(r"/products/[a-zA-Z0-9-]+",urlsplit(u).path))
            for url in sorted(urls)[:350]:
                try:
                    raw,_=fetch(url+".json",3*1024*1024)
                    consider(json.loads(raw)["product"])
                except Exception as exc:errors.append({"stage":"product","url":url,"error":str(exc)[:120]})
        for g in sorted(wanted):
            candidates=matches[g]
            # Deduplicate the same variant evidence, never select between different variants.
            candidates=list({json.dumps(c,sort_keys=True):c for c in candidates}.values())
            r={"gtin":g,"candidates":candidates,"assets":[],"usageRightsConfirmed":False,"visualVariantConfirmed":False,"publicationApproved":False}
            if len(candidates)!=1:r["status"]="unmatched_or_ambiguous"
            else:
                c=candidates[0];r["status"]="barcode_match_no_variant_image"
                if isinstance(c["image"],str):
                    try:
                        url=urljoin(ROOT,c["image"])
                        data,final=fetch(url)
                        ext=helper["extension"](data);target=out/g/("candidate."+ext)
                        target.parent.mkdir(exist_ok=True);target.write_bytes(data)
                        r["assets"].append({"path":str(target.relative_to(out)),"sourceImage":final,"sha256":hashlib.sha256(data).hexdigest(),"bytes":len(data)})
                        r["status"]="candidate_downloaded"
                    except Exception as exc:r["imageError"]=str(exc)[:180]
            rows.append(r)
    except Exception as exc:errors.append({"stage":"discovery","error":str(exc)[:180]})
    result={"requested":len(wanted),"checkedManufacturerProducts":checked,"barcodeMatches":sum(len(r["candidates"])==1 for r in rows),"downloadedProducts":sum(bool(r["assets"]) for r in rows),"published":0,"errors":errors,"results":rows}
    (out/"report.json").write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({k:v for k,v in result.items() if k not in ("results","errors")}))
if __name__=="__main__":main()
