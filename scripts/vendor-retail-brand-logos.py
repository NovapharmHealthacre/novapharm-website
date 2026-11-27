#!/usr/bin/env python3
"""Copy eight source-identified manufacturer marks into immutable, local catalogue assets.

This script only downloads the fixed HTTPS source URLs listed in the reviewed
register. It never executes downloaded bytes or modifies existing images.
"""
from __future__ import annotations
import json
from pathlib import Path
import struct
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler

ROOT = Path(__file__).resolve().parents[1]
REGISTER = ROOT / "docs/retail/brand-logo-source-register-20261127.json"
TARGET = ROOT / "assets/media/brands"
EXPECTED = {
    "nutraxin": "cdn.brandfetch.io",
    "biogaia": "www.biogaiagroup.com",
    "bioglan": "www.pharmacarenz.co.nz",
    "centrum": "upload.wikimedia.org",
    "salus": "thumb.wikimedia.org",
    "seven-seas": "seven-seas.co.uk",
    "vicks": "upload.wikimedia.org",
    "vitabiotics": "cdn.brandfetch.io",
}
MAX_BYTES = 1_000_000
PNG_MAGIC = bytes.fromhex("89504e470d0a1a0a")

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError("Unapproved redirect while copying brand mark")

def validate_png(data: bytes, name: str):
    if not data.startswith(PNG_MAGIC) or data[12:16] != b"IHDR":
        raise ValueError(f"{name} was not an original PNG")
    w, h = struct.unpack(">II", data[16:24])
    if w < 20 or h < 20 or w > 4096 or h > 4096:
        raise ValueError(f"{name} invalid image dimensions: {w}x{h}")
    return (w, h)

def main():
    entries = json.loads(REGISTER.read_text())["brands"]
    if len(entries) != 8 or set(x["id"] for x in entries) != set(EXPECTED):
        raise ValueError("The eight reviewed brand entries must remain complete")
    opener = build_opener(NoRedirect)
    TARGET.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        name = entry["id"]
        url = entry["remoteSourceUrl"]
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname != EXPECTED[name] or parsed.username or parsed.password:
            raise ValueError(f"Unreviewed origin: {name}")
        req = Request(url, headers={"User-Agent":"NovaPharm-Retail-BrandAsset-Review/1.0", "Accept":"image/png"})
        with opener.open(req, timeout=25) as response:
            data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError(f"Brand mark too large: {name}")
        w, h = validate_png(data, name)
        path = TARGET / f"{name}.png"
        path.write_bytes(data)
        print(f"{name}: copied source PNG ({w}x{h}, {len(data)} bytes)")
    print("Eight manufacturer marks copied unchanged into local site assets")

if __name__ == "__main__":
    main()
