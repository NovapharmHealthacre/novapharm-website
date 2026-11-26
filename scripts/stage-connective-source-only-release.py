#!/usr/bin/env python3
"""Stage additive-only Connective source pages against actual live gh-pages.

Never rewrites the live site's existing pages or checkout. The only permitted
existing HTML change is a fixed collection link inserted in Products overview.
This script stages a CANDIDATE tree, not a production deployment.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path('products/health-and-wellbeing')
ASSETS = [Path('assets/css/retail-expansion.css'), Path('assets/js/connective-collection-search.js')]
MARKER = 'data-npr-source-live-entry'


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stage(site: Path, live: Path) -> dict:
    site, live = site.resolve(), live.resolve()
    assert site.is_dir() and live.is_dir(), 'Expected checked-out public site and published gh-pages tree'
    staged = site / ROOT
    assert staged.is_dir(), 'Connective source directory not generated'
    pages = sorted(staged.rglob('index.html'))
    assert len(pages) == 396, f'Expected 395 details plus collection; received {len(pages)}'
    collection = staged / 'index.html'
    html = collection.read_text()
    assert html.count('class="npr-card"') == 395, 'Incomplete product card grid'
    assert 'data-npr-collection-query' in html, 'Collection search missing'
    assert '<meta name="robots" content="index, follow">' in html, 'Collection must remain discoverable'
    detail_pages = [p for p in pages if p != collection]
    assert len({p.parent.name for p in detail_pages}) == 395, 'Duplicate directory names'
    for page in detail_pages:
        gtin = page.parent.name
        assert re.fullmatch(r'\d{13}', gtin), f'Invalid GTIN path: {gtin}'
        text = page.read_text()
        assert gtin in text and '<meta name="robots" content="noindex, follow">' in text
        assert 'data-npr-retail-sku' not in text and '"offers"' not in text, 'Unverified offer leaked into public page'
        assert 'Full ingredients, directions, warnings' in text, 'Product disclosure missing'
    # Never overwrite an existing public page with an older main artifact.
    added = []
    for source in pages:
        relative = source.relative_to(site)
        target = live / relative
        if target.exists():
            assert target.is_file() and sha(target) == sha(source), f'Existing published path changed: {relative}'
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        added.append(str(relative))
    for relative in ASSETS:
        source, target = site / relative, live / relative
        assert source.is_file(), f'Approved source CSS/JS missing: {relative}'
        if target.exists():
            assert target.is_file() and sha(target) == sha(source), f'Existing shared asset differs: {relative}'
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            added.append(str(relative))
    products = live / 'products/index.html'
    assert products.is_file(), 'Current live Products landing page missing'
    before = products.read_text()
    if MARKER not in before:
        # Strictly append the link to the *existing* public page; never replace
        # the current live header, footer, DOM or earlier Product changes.
        assert before.count('</main>') == 1, 'Unexpected live Products DOM'
        notice = (
            '<section class="npr-wrap npr-section" '+MARKER+' aria-label="Health and wellbeing collection">'
            '<p>Health and wellbeing</p><h2>Discover our extended collection.</h2>'
            '<a href="/products/health-and-wellbeing/">Explore 395 product references</a>'
            '</section>'
        )
        after = before.replace('</main>', notice + '</main>')
        assert after.replace(notice, '', 1) == before, 'Non-additive Products page modification'
        products.write_text(after)
    else:
        assert before.count(MARKER) == 1, 'Duplicate live Products entry'
    result = {
        'scope': 'additive Connective source pages only',
        'productPages': len(detail_pages),
        'collectionPages': 1,
        'newPaths': len(added),
        'newSharedAssets': [str(p) for p in ASSETS if str(p) in added],
        'productsLandingChanged': MARKER not in before,
        'checkoutChanged': False,
        'sourcePricingPublished': False,
        'outcome': 'staged_candidate_not_live',
    }
    print(json.dumps(result, indent=2))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', required=True)
    parser.add_argument('--published', required=True)
    args = parser.parse_args()
    stage(Path(args.site), Path(args.published))
