"""Collect supplier-hosted image candidates for review, not publication.
No external image, seller price, or approval is accepted from browser input.
Run with the public candidate register; output is a review-only artifact.
"""
import argparse
import concurrent.futures
import hashlib
import html
import json
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen, HTTPRedirectHandler, build_opener

HOSTS={"www.connectivepharma.com","connectivepharma.com","www.connectivepharma.co.uk","connectivepharma.co.uk"}
MAX_IMAGE=12*1024*1024
MAX_PAGE=3*1024*1024

def trusted(url):
    p=urlsplit(url)
    return p.scheme=="https" and p.hostname in HOSTS and p.username is None and p.password is None and p.port in (None,443)

class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not trusted(newurl):
            raise ValueError("untrusted redirect")
        return super().redirect_request(req,fp,code,msg,headers,newurl)

def fetch(url, limit):
    if not trusted(url):
        raise ValueError("untrusted source")
    opener=build_opener(SafeRedirect())
    with opener.open(Request(url,headers={"User-Agent":"NovaPharm product asset review/1.0","Accept":"*/*"}),timeout=15) as res:
        if not trusted(res.geturl()):
            raise ValueError("untrusted final host")
        data=res.read(limit+1)
        if len(data)>limit:
            raise ValueError("response too large")
        return data,res.geturl()

def norm(value):
    return re.sub(r"[^a-z0-9]","",value.lower())

def gtin_ok(gtin):
    return bool(re.fullmatch(r"(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})",gtin)) and (10-sum(int(c)*(3 if i%2==0 else 1) for i,c in enumerate(reversed(gtin[:-1])))%10)%10==int(gtin[-1])

class ProductPage(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text=[];self.title=[];self.h1=False;self.images=[];self.anchor=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="h1":self.h1=True
        if tag=="a":self.anchor=a.get("href")
        if tag=="img":
            self.images.append((a.get("alt",""),self.anchor,a.get("src"),a.get("data-src")))
    def handle_endtag(self,tag):
        if tag=="h1":self.h1=False
        if tag=="a":self.anchor=None
    def handle_data(self,data):
        self.text.append(data)
        if self.h1:self.title.append(data)

def extension(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n") and b"IEND" in data[-32:]:return "png"
    if data.startswith(b"\xff\xd8\xff") and data.endswith(b"\xff\xd9"):return "jpg"
    if data.startswith(b"RIFF") and data[8:12]==b"WEBP" and int.from_bytes(data[4:8],"little")+8==len(data):return "webp"
    raise ValueError("unrecognised or incomplete raster image")

def collect(p, root):
    result={"gtin":p["gtin"],"sourcePage":p["sourcePage"],"imageRightsConfirmed":False,"visualVariantConfirmed":False,"publicationApproved":False,"assets":[]}
    try:
        assert gtin_ok(p["gtin"]),"invalid GTIN"
        raw,url=fetch(p["sourcePage"],MAX_PAGE)
        parser=ProductPage();parser.feed(raw.decode("utf-8",errors="replace"))
        text=" ".join(parser.text)
        found=re.search(r"Barcode\s*:\s*([0-9][0-9 ]{6,22})",text,re.I)
        pack=re.search(r"Pack size\s*:\s*(.*?)\s*(?:Case size|Pallet quantity|Brand|Barcode)\s*:",text,re.I|re.S)
        if not found or re.sub(r"\s","",found.group(1))!=p["gtin"] or not pack or norm(pack.group(1))!=norm(p["pack"]):
            raise ValueError("live supplier barcode or pack not reconciled")
        title=norm(" ".join(parser.title))
        if not title:
            raise ValueError("missing product title")
        candidates=[]
        for alt,*links in parser.images:
            if norm(alt)!=title:
                continue
            for link in links:
                if not link:continue
                absolute=urljoin(url,link)
                if trusted(absolute) and "/userfiles/images/" in urlsplit(absolute).path and absolute not in candidates:
                    candidates.append(absolute)
        seed=p.get("candidateImage")
        # Even a previously seen URL must still be linked on the matching page.
        if seed in candidates:
            candidates.remove(seed);candidates.insert(0,seed)
        if not candidates:
            raise ValueError("no product-title-matched image URL")
        hashes=set()
        for candidate in candidates[:8]:
            try:
                data,final=fetch(candidate,MAX_IMAGE)
                ext=extension(data)
                digest=hashlib.sha256(data).hexdigest()
                if digest in hashes:continue
                hashes.add(digest)
                rel=f'{p["gtin"]}/{len(result["assets"])+1}.{ext}'
                target=root/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
                result["assets"].append({"path":rel,"sourceImage":final,"sha256":digest,"bytes":len(data),"status":"downloaded_candidate_pending_visual_and_rights_review"})
            except Exception as exc:
                result.setdefault("imageErrors",[]).append(type(exc).__name__+": "+str(exc)[:140])
        result["status"]="candidate_downloaded" if result["assets"] else "no_download"
    except Exception as exc:
        result["status"]="source_unavailable_or_unmatched"
        result["error"]=type(exc).__name__+": "+str(exc)[:160]
    return result

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--register",default="docs/retail/connective-image-candidates.json")
    ap.add_argument("--out",default="review-output/connective-images")
    args=ap.parse_args()
    register=json.loads(Path(args.register).read_text())
    assert register["schema"]=="novapharm-connective-image-candidate-v1"
    products=register["products"];assert len({p["gtin"] for p in products})==len(products)
    root=Path(args.out);root.mkdir(parents=True,exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        rows=list(pool.map(lambda p:collect(p,root),products))
    report={"requested":len(products),"downloadedProducts":sum(bool(r["assets"]) for r in rows),"downloadedImages":sum(len(r["assets"]) for r in rows),"published":0,"results":rows}
    (root/"report.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({k:v for k,v in report.items() if k!="results"}))
if __name__=="__main__":main()
