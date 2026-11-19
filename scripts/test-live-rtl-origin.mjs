import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { inspectLiveRtl, RTL_FOUNDATION_MERGE } from "./verify-live-rtl-origin.mjs";

const fixture = () => {
  const sample = {
    home: '<html lang="en-GB"><head><meta name="novapharm-source-sha" content="' +
      RTL_FOUNDATION_MERGE + '"><script src="/assets/js/rtl-localization.js?v=__SCRIPT_VERSION__"></script></head>' +
      '<body><main id="main" lang="en-GB" data-np-untranslated>English content</main></body></html>',
    cookies: '<article><code>np_locale</code> First-party cookie. Up to 365 days after selection. ' +
      'Arabic/Hebrew right-to-left layout preview; legal review pending.</article>',
    contact: '<main><form data-live-b2b-enquiry-form>Business enquiry</form></main>',
    script: 'var key = "np_locale"; html.dir = locale === "en-GB" ? "ltr" : "rtl"; ' +
      'html.dataset.npLocaleStatus = "layout-preview"; ' +
      'var footerSelectors = [".np-contact-reference-footer-inner", ".npd-footer-bottom", ".site-footer"]; ' +
      'footerSelectors.map(function (selector) { return document.querySelector(selector); }); ' +
      'node && node.getClientRects().length > 0;',
    bundle: '/* Source: rtl-localization.css */\n:root { --np-rtl-contract: 1; --np-locale-footer-contract: 1; } ' +
      '.np-locale-control { position: static; background: transparent; border: 0; box-shadow: none; } ' +
      'html[dir="rtl"] { direction: rtl; }',
  };
  const version = createHash("sha256").update(sample.script).digest("hex").slice(0, 16);
  sample.home = sample.home.replace("__SCRIPT_VERSION__", version);
  return sample;
};

test("live proof accepts only full public layout-preview evidence and returns provenance", () => {
  assert.equal(inspectLiveRtl(fixture()), RTL_FOUNDATION_MERGE);
});

for (const [name, change] of [
  ["untranslated legal copy not disclosed", (x) => { x.cookies = x.cookies.replace("<code>np_locale</code>", ""); }],
  ["English editorial boundary missing", (x) => { x.home = x.home.replace(" data-np-untranslated", ""); }],
  ["public RTL JavaScript missing", (x) => { x.home = x.home.replace(/rtl-localization\.js\?v=[0-9a-f]{16}/, "legacy.js"); }],
  ["cached pre-redesign script URL", (x) => { x.home = x.home.replace(/v=[0-9a-f]{16}/, "v=0000000000000000"); }],
  ["pre-redesign boxed selector script", (x) => { x.script += "Language / RTL layout preview"; }],
  ["fake translated experience claimed", (x) => { x.script = x.script.replace("layout-preview", "full-translation"); }],
  ["unshipped RTL CSS", (x) => { x.bundle = ":root { color: black; }"; }],
  ["old boxed language panel", (x) => { x.bundle = x.bundle.replace("border: 0", "border: 1px solid #aaa"); }],
  ["missing footer design version", (x) => { x.bundle = x.bundle.replace("--np-locale-footer-contract: 1;", ""); }],
  ["language selector placed after footer", (x) => { x.script = x.script.replace(".np-contact-reference-footer-inner", ".unrelated"); }],
  ["footer row lookup out of order", (x) => { x.script = x.script.replace('".np-contact-reference-footer-inner", ".npd-footer-bottom"', '".npd-footer-bottom", ".np-contact-reference-footer-inner"'); }],
  ["hidden footer selection unsafe", (x) => { x.script = x.script.replace("node.getClientRects().length > 0", "true"); }],
  ["live business contact downgraded", (x) => { x.contact = '<div data-email-enquiry-form></div>'; }],
  ["cookie retention not disclosed", (x) => { x.cookies = x.cookies.replace("365 days", "30 days"); }],
  ["unknown publication provenance", (x) => { x.home = x.home.replace(RTL_FOUNDATION_MERGE, "invalid"); }],
]) {
  test("live proof fails closed: " + name, () => {
    const x = fixture();
    change(x);
    assert.throws(() => inspectLiveRtl(x));
  });
}
