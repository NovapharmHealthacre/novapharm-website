#!/usr/bin/env python3
"""Download the eight reviewed original PNGs; fail closed on unexpected hosts or bytes."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import struct
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler

ROOT = Path(__file__).resolve().parents[1]
REGISTER = ROOT / "docs/retail/brand-logo-source-register-20261127.json"
TARGET = ROOT / "assets/media/brands"
EXPECTED = {
    "nutraxin": {"nutraxin.com.tr", "www.nutraxin.com.tr"},
    "biogaia": {"upload.wikimedia.org"},
    "bioglan": {"www.pharmacarenz.co.nz", "pharmacarenz.co.nz"},
    "centrum": {"upload.wikimedia.org"},
    "salus": {"thumb.wikimedia.org", "upload.wikimedia.org"},
    "seven-seas": {"upload.wikimedia.org"},
    "vicks": {"upload.wikimedia.org"},
    "vitabiotics": {"cdn.brandfetch.io"},
}
MAX_BYTES = 1_000_000
PNG_MAGIC = bytes.fromhex("89504e470d0a1a0a")

def check_url(url, hosts):
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in hosts or parsed.username or parsed.password or parsed.port not in (None,443):
        raise ValueError(f"Unreviewed HTTPS origin: {parsed.hostname}")

class ReviewedRedirect(HTTPRedirectHandler):
    max_redirections = 4
    def __init__(self, hosts):
        self.hosts = hosts
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        check_url(newurl, self.hosts)
        print(f"  HTTP {code}: {urlparse(req.full_url).hostname} -> {urlparse(newurl).hostname}", flush=True)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def validate_png(data, name):
    if len(data) < 33 or not data.startswith(PNG_MAGIC) or data[12:16] != b"IHDR":
        raise ValueError(f"{name} did not return PNG bytes")
    w,h = struct.unpack(">II",data[16:24])
    if not (20 <= w <= 4096 and 20 <= h <= 4096):
        raise ValueError(f"{name} invalid dimensions {w}x{h}")
    return w,h

def main():
    register=json.loads(REGISTER.read_text())
    entries=register["brands"]
    if len(entries)!=8 or {e["id"] for e in entries}!=set(EXPECTED):
        raise ValueError("Eight exact brand identifiers required")
    downloaded={}
    failures=[]
    for entry in entries:
        name=entry["id"]
        try:
            url=entry["remoteSourceUrl"]
            check_url(url,EXPECTED[name])
            print(f"Checking {name}: {urlparse(url).hostname}",flush=True)
            opener=build_opener(ReviewedRedirect(EXPECTED[name]))
            request=Request(url,headers={"User-Agent":"NovaPharm-BrandAssetReview/1.1 (https://novapharmhealthcare.com/contact/)","Accept":"image/png"})
            with opener.open(request,timeout=25) as response:
                check_url(response.geturl(),EXPECTED[name])
                data=response.read(MAX_BYTES+1)
            if len(data)>MAX_BYTES:
                raise ValueError("Image exceeds byte limit")
            w,h=validate_png(data,name)
            downloaded[name]=data
            entry["retrievedWidth"]=w
            entry["retrievedHeight"]=h
            entry["sha256"]=hashlib.sha256(data).hexdigest()
            print(f"PASS {name}: {w}x{h}, {len(data)} bytes",flush=True)
        except Exception as error:
            failures.append(name)
            print(f"FAIL {name}: {type(error).__name__}: {error}",flush=True)
    if failures:
        raise SystemExit(f"Not committing a partial logo grid; failed: {', '.join(failures)}")
    TARGET.mkdir(parents=True,exist_ok=True)
    for name,data in downloaded.items():
        (TARGET / f"{name}.png").write_bytes(data)
    REGISTER.write_text(json.dumps(register,indent=2,ensure_ascii=False)+"\n")
    print("All eight source PNGs retrieved and hashed.")

if __name__=="__main__":
    main()
