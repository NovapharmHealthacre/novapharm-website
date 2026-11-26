"""Regression tests: additive Connective pages never roll existing site files back."""
from __future__ import annotations
import importlib.util
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('connective_stage', HERE / 'stage-connective-source-only-release.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class StageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='np-source-additive-')
        root = Path(self.tmp.name)
        self.site, self.live = root / 'site', root / 'published'
        self.site.mkdir(); self.live.mkdir()
        for gtin in range(1000000000000,1000000000395):
            path = self.site / f'products/health-and-wellbeing/{gtin}/index.html'
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(f'<meta name="robots" content="noindex, follow">{gtin} <p data-npr-order-notice>Full ingredients, directions, warnings</p><div data-npr-retail-sku="NP-CP-{gtin}"></div><script type="module" src="/assets/js/nutraxin-retail-store.js"></script>', encoding='utf-8')
        collection = self.site / 'products/health-and-wellbeing/index.html'
        collection.write_text('<meta name="robots" content="index, follow"><input data-npr-collection-query>'+('class="npr-card"'*395), encoding='utf-8')
        for asset in module.ASSETS:
            path = self.site / asset
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('approved test asset', encoding='utf-8')
        products = self.live / 'products/index.html'
        products.parent.mkdir(parents=True, exist_ok=True)
        products.write_text('<html><main>Existing Nutraxin, ESCO, AK design</main><footer>Keep me intact</footer></html>', encoding='utf-8')
        self.before = products.read_bytes()
        existing = self.live / 'products/nutraxin/index.html'
        existing.parent.mkdir(parents=True, exist_ok=True)
        existing.write_text('This is the live Nutraxin checkout', encoding='utf-8')

    def tearDown(self):
        self.tmp.cleanup()

    def test_first_release_stages_only_new_scoped_pages(self):
        report = module.stage(self.site, self.live)
        self.assertEqual(report['productPages'],395)
        self.assertEqual(report['newPaths'],398)
        self.assertTrue(report['productsLandingChanged'])
        products = (self.live / 'products/index.html').read_bytes()
        self.assertEqual(products.replace(b'<section class="npr-wrap npr-section" data-npr-source-live-entry aria-label="Health and wellbeing collection"><p>Health and wellbeing</p><h2>Discover our extended collection.</h2><a href="/products/health-and-wellbeing/">Explore 395 product references</a></section>', b''), self.before)
        self.assertEqual((self.live / 'products/nutraxin/index.html').read_text(), 'This is the live Nutraxin checkout')
        second = module.stage(self.site,self.live)
        self.assertEqual(second['newPaths'],0)
        self.assertFalse(second['productsLandingChanged'])

    def test_refuses_to_replace_any_existing_page(self):
        existing = self.live / 'products/health-and-wellbeing/1000000000000/index.html'
        existing.parent.mkdir(parents=True,exist_ok=True)
        existing.write_text('LIVE DIFFERENT VERSION')
        with self.assertRaisesRegex(AssertionError,'Existing published path changed'):
            module.stage(self.site, self.live)

    def test_exact_existing_page_receives_only_inert_offer_bridge(self):
        path = self.live / 'products/health-and-wellbeing/1000000000000/index.html'
        path.parent.mkdir(parents=True, exist_ok=True)
        source = (self.site / 'products/health-and-wellbeing/1000000000000/index.html').read_text()
        path.write_text(module.without_offer_bridge(source, '1000000000000'))
        previous = path.read_text()
        report = module.stage(self.site, self.live)
        self.assertEqual(report['existingDetailsUpgraded'], 1)
        self.assertEqual(path.read_text(), source)
        self.assertEqual(module.without_offer_bridge(path.read_text(), '1000000000000'), previous)
        self.assertEqual((self.live / 'products/nutraxin/index.html').read_text(), 'This is the live Nutraxin checkout')

    def test_unrelated_existing_live_change_remains_protected(self):
        path = self.live / 'products/health-and-wellbeing/1000000000000/index.html'
        path.parent.mkdir(parents=True, exist_ok=True)
        source = (self.site / 'products/health-and-wellbeing/1000000000000/index.html').read_text()
        path.write_text(module.without_offer_bridge(source, '1000000000000') + '<!-- unrelated modification -->')
        with self.assertRaisesRegex(AssertionError, 'Existing published path changed'):
            module.stage(self.site, self.live)

    def test_refuses_fake_checkout_and_price_in_staged_pages(self):
        page = self.site / 'products/health-and-wellbeing/1000000000000/index.html'
        page.write_text(page.read_text()+'data-npr-retail-sku="NP-CP-1000000000000"')
        with self.assertRaisesRegex(AssertionError,'Unverified offer leaked'):
            module.stage(self.site,self.live)

if __name__=='__main__': unittest.main()
