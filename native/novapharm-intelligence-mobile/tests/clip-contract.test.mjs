import assert from "node:assert/strict";
import test from "node:test";
import { CLIP_CONTRACT, CLIP_MOBILE_RELEASE, parseClipResearchResponse } from "../clip-research.ts";

const good = {
  contract: CLIP_CONTRACT,
  query: "approved public carton",
  humanReviewRequired: true,
  similarityIsNotEvidence: true,
  regulatoryStatusVerified: false,
  productIdentityVerified: false,
  results: [{
    rank: 1,
    assetId: "public-asset-1",
    title: "Licensed public carton",
    rightsReference: "rights:public:1",
    sourceUrl: "https://novapharmhealthcare.com/products/",
    status: "unverified_visual_match"
  }]
};

test("Expo visual research stays disabled with no model, sign-in or verified catalogue", () => {
  assert.equal(CLIP_MOBILE_RELEASE.contract, "novapharm.intelligence.visual-search.v1");
  assert.equal(CLIP_MOBILE_RELEASE.enabled, false);
  assert.equal(CLIP_MOBILE_RELEASE.sessionConnected, false);
  assert.equal(CLIP_MOBILE_RELEASE.modelRuntimeConnected, false);
  assert.equal(CLIP_MOBILE_RELEASE.licensedIndexConnected, false);
  assert.equal(CLIP_MOBILE_RELEASE.productIdentityVerified, false);
});

test("public-image metadata is strictly evidence bounded", () => {
  const result = parseClipResearchResponse(good);
  assert.equal(result.contract, CLIP_CONTRACT);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].rank, 1);
  assert.equal(result.results[0].status, "unverified_visual_match");
  assert.equal(result.humanReviewRequired, true);
  assert.equal(result.regulatoryStatusVerified, false);
  assert.equal("confidence" in result.results[0], false);
});

test("untrusted, revoked, locally attributed or malformed responses fail closed", () => {
  for (const altered of [
    { ...good, contract: "unexpected" },
    { ...good, humanReviewRequired: false },
    { ...good, similarityIsNotEvidence: false },
    { ...good, productIdentityVerified: true },
    { ...good, query: "" },
    { ...good, query: "x" },
    { ...good, query: "a".repeat(241) },
    { ...good, query: "bad\u0000query" },
    { ...good, regulatoryStatusVerified: true },
    { ...good, results: [good.results[0], good.results[0]] },
    { ...good, results: [{ ...good.results[0], rank: 2 }] },
    { ...good, results: [{ ...good.results[0], assetId: "../private" }] },
    { ...good, results: [{ ...good.results[0], title: " " }] },
    { ...good, results: [{ ...good.results[0], rightsReference: "" }] },
    { ...good, results: [{ ...good.results[0], status: "verified_identity" }] },
    ...[
      "http://novapharmhealthcare.com/products/",
      "https://127.0.0.1/private",
      "https://[::1]/private",
      "https://warehouse.internal/records",
      "https://docs.local/records",
      "https://user@novapharmhealthcare.com/products/",
      "https://novapharmhealthcare.com:8443/products/",
      "https://novapharmhealthcare.com/products/#fragment"
    ].map((sourceUrl) => ({ ...good, results: [{ ...good.results[0], sourceUrl }] }))
  ]) {
    assert.throws(() => parseClipResearchResponse(altered));
  }
});

test("extra model-confidence claims cannot cross the native metadata boundary", () => {
  const payload = { ...good, results: [{ ...good.results[0], confidence: 0.999, identity: "verified" }] };
  const parsed = parseClipResearchResponse(payload);
  assert.equal("confidence" in parsed.results[0], false);
  assert.equal("identity" in parsed.results[0], false);
});
