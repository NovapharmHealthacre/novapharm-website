import assert from "node:assert/strict";
import test from "node:test";
import catalogue from "../data/nutraxin-product-register.json";
import destinations from "../data/nutraxin-uk-links.json";

test("all 19 catalogue entries have safe publisher disposition, including one temporarily unavailable official detail page", () => {
  assert.equal(catalogue.products.length, 19);
  const slugs = catalogue.products.map((product) => product.slug);
  const values = Object.entries(destinations.products);
  assert.equal(values.length, 19);
  assert.deepEqual(new Set(slugs), new Set(values.map(([slug]) => slug)));
  const urls = new Set<string>();
  let unavailable = 0;
  for (const [slug, href] of values) {
    assert.ok(slugs.includes(slug), `Unknown Nutraxin slug: ${slug}`);
    if (href === null) {
      assert.equal(slug, "vitamin-c-500mg-chewable-30-tablets");
      unavailable += 1;
      continue;
    }
    const parsed = new URL(href);
    assert.equal(parsed.protocol, "https:");
    assert.equal(parsed.hostname, "nutraxin.uk.com");
    assert.ok(parsed.pathname.startsWith("/product/"));
    assert.equal(parsed.username, "");
    assert.equal(parsed.password, "");
    assert.equal(parsed.hash, "");
    assert.equal(parsed.search, "");
    assert.ok(!urls.has(parsed.href), `Duplicate product URL: ${slug}`);
    urls.add(parsed.href);
  }
  assert.equal(unavailable, 1);
  assert.equal(urls.size, 18);
  assert.match(destinations.unavailableProductNotes["vitamin-c-500mg-chewable-30-tablets"], /HTTP 404/);
  assert.match(destinations.scope, /not stock, sale, regulatory or approved-label verification/i);
});
