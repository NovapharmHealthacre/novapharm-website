#!/usr/bin/env python3
"""Validate canonical NovaPharm discovery files with Python's XML parser."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
CANONICAL = "novapharmhealthcare.com"
S = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
I = "{http://www.google.com/schemas/sitemap-image/1.1}"

def read(name):
    path = ROOT / name
    assert path.exists(), f"Missing {name}"
    tree = ET.parse(path)
    assert tree.getroot().tag == S + "urlset", f"Invalid sitemap namespace in {name}"
    urls = []
    for item in tree.getroot().findall(S + "url"):
        node = item.find(S + "loc")
        assert node is not None and node.text, f"No canonical location in {name}"
        location = node.text
        parsed = urlsplit(location)
        assert parsed.scheme == "https" and parsed.netloc == CANONICAL, f"Wrong canonical host in {name}: {location}"
        assert not parsed.query and not parsed.fragment, f"Private/query URL in {name}: {location}"
        assert parsed.path.startswith("/"), f"Invalid path in {name}: {location}"
        assert "/portal/" not in parsed.path and "/admin/" not in parsed.path and "/api/" not in parsed.path, f"Protected route in {name}: {location}"
        assert location not in urls, f"Duplicate sitemap URL: {location}"
        urls.append(location)
    assert urls, f"Empty sitemap: {name}"
    return tree.getroot(), urls

main_root, main = read("sitemap.xml")
article_root, articles = read("sitemap-insights.xml")
image_root, images = read("sitemap-images.xml")
assert len(main) >= 40, f"Unexpected main sitemap shrinkage: {len(main)}"
assert len(articles) >= 6, f"Missing editorial articles: {len(articles)}"
assert all(url in main for url in articles), "Insight sitemap URLs must be in the main sitemap"
assert len(images) >= 20, f"Unexpected image-sitemap shrinkage: {len(images)}"
for entry in image_root.findall(S + "url"):
    for img in entry.findall(I + "image"):
        src = img.find(I + "loc")
        assert src is not None and src.text, "Image missing image:loc"
        url = urlsplit(src.text)
        assert url.scheme == "https" and url.netloc == CANONICAL, f"Off-domain image: {src.text}"
print(f"Sitemap checks passed: {len(main)} canonical pages, {len(articles)} articles, {len(images)} image-page entries; no legacy www, no private routes.")
