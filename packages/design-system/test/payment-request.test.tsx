import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentRequestSummary, designSystemCss } from "../src/index.ts";

test("web payment request remains read-only, accessible and currency aware", () => {
  const html = renderToStaticMarkup(
    <PaymentRequestSummary
      merchantName="NovaPharm Healthcare"
      amountMinor={1725}
      currency="GBP"
      reference="INV-1024"
      state="requested"
      actions={<a href="/invoices/">View invoice</a>}
    />,
  );
  assert.match(html, /aria-labelledby=/);
  assert.match(html, /aria-label="Amount requested: £17\.25"/);
  assert.match(html, /NovaPharm Healthcare/);
  assert.match(html, /Awaiting payment/);
  assert.match(html, /role="status"/);
  assert.match(html, /data-payment-ui="summary-only"/);
  assert.match(html, /View invoice/);
  assert.doesNotMatch(html, /Hold Here to Pay|<input[^>]+type="card"/);
});

test("unavailable amounts are not represented as valid prices", () => {
  const html = renderToStaticMarkup(
    <PaymentRequestSummary merchantName="NovaPharm" amountMinor={Number.NaN} currency="GBP" />,
  );
  assert.match(html, /Amount unavailable/);
  assert.doesNotMatch(html, /£0\.00/);
});

test("minor unit formatting uses currency rules", () => {
  const html = renderToStaticMarkup(
    <PaymentRequestSummary merchantName="NovaPharm" amountMinor={1725} currency="JPY" state="paid" />,
  );
  assert.match(html, /¥1,725/);
  assert.match(html, /Payment confirmed/);
});

test("both website roots load the platform stylesheet", () => {
  const corporate = readFileSync(new URL("../../../apps/corporate/app/layout.tsx", import.meta.url), "utf8");
  const portal = readFileSync(new URL("../../../apps/portal/app/layout.tsx", import.meta.url), "utf8");
  const platformCss = readFileSync(new URL("../../../assets/css/novapharm-apple-27-web-adaptation.css", import.meta.url), "utf8");
  const publicBundleBuilder = readFileSync(new URL("../../../scripts/build-css-bundle.mjs", import.meta.url), "utf8");
  const publicPublisher = readFileSync(new URL("../../../.github/workflows/publish-aws-contact-production.yml", import.meta.url), "utf8");
  const dispatchGuard = readFileSync(new URL("../../../.github/workflows/dispatch-approved-aws-contact-release.yml", import.meta.url), "utf8");
  for (const layout of [corporate, portal]) {
    assert.match(layout, /novapharm-apple-27-web-adaptation\.css/);
  }
  assert.match(publicBundleBuilder, /novapharm-apple-27-web-adaptation\.css/);
  assert.match(publicPublisher, /novapharm-apple-27-web-adaptation\.css/);
  assert.match(dispatchGuard, /novapharm-apple-27-web-adaptation\.css/);
  assert.match(platformCss, /44px/);
  assert.match(platformCss, /prefers-reduced-transparency/);
  assert.match(platformCss, /prefers-contrast: more/);
  assert.match(platformCss, /:lang\(ar\)/);
  assert.match(platformCss, /:lang\(he\)/);
  assert.match(platformCss, /:lang\(hy\)/);
  assert.match(platformCss, /:lang\(ka\)/);
  assert.match(designSystemCss, /\.np-payment-request__card/);
});
