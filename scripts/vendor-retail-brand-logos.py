#!/usr/bin/env python3
"""Retrieve only reviewed original brand image sources; fail closed."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler

ROOT=Path(__file__).resolve().parents[1]
REGISTER=ROOT/"docs/retail/brand-logo-source-register-20261127.json"
EXPECTED={
 "nutraxin":{"nutraxin.com.tr","www.nutraxin.com.tr"},
 "biogaia":{"upload.wikimedia.org"},
 "bioglan":{"www.pharmacarenz.co.nz","pharmacarenz.co.nz"},
 "centrum":{"upload.wikimedia.org"},
 "salus":{"thumb.wikimedia.org","upload.wikimedia.org"},
 "seven-seas":{"upload.wikimedia.org"},
 "vicks":{"upload.wikimedia.org"},
 "vitabiotics":{"pbs.twimg.com","cdn.tgdd.vn"},
}
MAX_BYTES=1_000_000
def check_url(url,hosts):
    p=urlparse(url)
    if p.scheme!="https" or p.hostname not in hosts or p.username or p.password or p.port not in (None,443):
        raise ValueError("Unreviewed HTTPS origin: "+str(p.hostname))
class ReviewedRedirect(HTTPRedirectHandler):
    max_redirections=4
    def __init__(self,hosts):
        self.hosts=hosts
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        check_url(newurl,self.hosts)
        return super().redirect_request(req,fp,code,msg,headers,newurl)
def raster_format(data):
    if len(data)>=33 and data.startswith(bytes.fromhex("89504e470d0a1a0a")) and data[12:16]==b"IHDR":
        return "png"
    if len(data)>20 and data.startswith(bytes.fromhex("ffd8ff")):
        return "jpeg"
    if len(data)>20 and data[:4]==b"RIFF" and data[8:12]==b"WEBP":
        return "webp"
    raise ValueError(f"Unsupported raster: length={len(data)}, signature={data[:12].hex()}")
def main():
    register=json.loads(REGISTER.read_text())
    entries=register["brands"]
    if len(entries)!=8 or {e["id"] for e in entries}!=set(EXPECTED):
        raise ValueError("Eight exact brand identifiers required")
    stage=Path(os.environ["RUNNER_TEMP"])/"retail-logo-originals"
    stage.mkdir(parents=True,exist_ok=True)
    failures=[]
    for entry in entries:
        name=entry["id"]
        candidates=entry.get("candidateSources") if name=="vitabiotics" else [{"url":entry["remoteSourceUrl"],"page":entry["sourcePage"],"kind":"reviewed source"}]
        passed=False
        for candidate in candidates:
            try:
                url=candidate["url"]
                check_url(url,EXPECTED[name])
                print(f"Checking {name}: {url}",flush=True)
                opener=build_opener(ReviewedRedirect(EXPECTED[name]))
                request=Request(url,headers={"User-Agent":"NovaPharm-BrandAssetReview/1.2 (https://novapharmhealthcare.com/contact/)","Accept":"image/png,image/jpeg,image/webp"})
                with opener.open(request,timeout=25) as response:
                    check_url(response.geturl(),EXPECTED[name])
                    data=response.read(MAX_BYTES+1)
                if len(data)>MAX_BYTES:
                    raise ValueError("Asset exceeds limit")
                kind=raster_format(data)
                if name!="vitabiotics" and kind!="png":
                    raise ValueError("Expected original PNG")
                (stage/f"{name}.source").write_bytes(data)
                entry.update(selectedSourceUrl=url,selectedSourcePage=candidate["page"],selectedSourceKind=candidate["kind"],originalFormat=kind,originalSha256=hashlib.sha256(data).hexdigest())
                print(f"PASS {name}: {kind}, {len(data)} bytes",flush=True)
                passed=True
                break
            except Exception as error:
                print(f"FAIL {name}: {type(error).__name__}: {error}",flush=True)
        if not passed:
            failures.append(name)
    if failures:
        raise SystemExit("No partial logo release; failed: "+", ".join(failures))
    REGISTER.write_text(json.dumps(register,indent=2,ensure_ascii=False)+"\n")
if __name__=="__main__":
    main()
