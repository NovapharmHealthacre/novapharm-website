import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { assetManifest, comparePublicAsset, safeAssetPath } from "./audit-published-critical-assets-parity.mjs";

const bytes = value => Buffer.from(value, "utf8");
const requiredJS = [
  "novapharm.js", "contact-production.js", "nutraxin-retail-store.js",
  "commerce-marketplace.js", "commerce-order-track.js", "esco-catalogue.js",
  "esco-bag.js", "cookie-consent.js"
];
const requiredCSS = [
  "novapharm.bundle.css", "nutraxin-retail-store.css",
  "commerce-marketplace.css", "commerce-order-track.css",
  "esco-catalogue.css", "quantum-research.css"
];

test("asset URL mapping rejects traversal, private paths, query aliases and foreign origins", () => {
  for (const good of ["assets/js/novapharm.js", "assets/css/novapharm.bundle.css",
    "assets/media/home/earth-reference-1400.jpg", "shopping/nutraxin-uk.tsv", "sitemap.xml"])
    assert.equal(safeAssetPath(good), good);
  for (const bad of ["../index.html", "assets/js/../../portal/index.html",
    "assets/js/novapharm.js?x=1", "/assets/js/novapharm.js",
    "https://evil.example/js/app.js", "portal/session.json",
    "assets/css/stolen.env", "assets/media/home/supply-network-hero.jpg"])
    assert.throws(() => safeAssetPath(bad), /Unsafe|unapproved/);
});

test("live asset must be direct HTTP 200 with exactly matching original bytes", () => {
  const base = { path: "assets/js/contact-production.js", checkedInBytes: bytes("approved"),
    liveBytes: bytes("approved"), status: 200, mime: "text/javascript" };
  const good = comparePublicAsset(base);
  assert.equal(good.exactByteMatch, true);
  assert.deepEqual(good.errors, []);
  assert.equal(good.checkedInSha256, good.liveSha256);
  const mismatched = comparePublicAsset({...base, liveBytes:bytes("old release")});
  assert.equal(mismatched.exactByteMatch, false);
  assert.ok(mismatched.errors.some(error => error.includes("differ")));
  for (const bad of [
    { status: 302 },
    { status: 404, liveBytes:null },
    { mime:"text/html" },
    { checkedInBytes:null },
    { liveBytes:bytes("") }
  ]) assert.ok(comparePublicAsset({...base, ...bad}).errors.length > 0,
    "Unsafe response passed: " + JSON.stringify(bad));
});

test("manifest covers every published JS/CSS, with non-shrinking 22/23 baselines and fixed assets", () => {
  const tree = mkdtempSync(join(tmpdir(), "novapharm-critical-asset-test-"));
  try {
    const js = [...requiredJS, ...Array.from({length:22-requiredJS.length}, (_,i)=>"test-"+i+".js")];
    const css = [...requiredCSS, ...Array.from({length:23-requiredCSS.length}, (_,i)=>"test-"+i+".css")];
    const fileNames = [...js.map(n=>"assets/js/"+n), ...css.map(n=>"assets/css/"+n),
      "assets/media/home/earth-reference-1400.jpg", "shopping/nutraxin-uk.tsv", "sitemap.xml"];
    for (const path of fileNames) {
      const file=join(tree,path);
      mkdirSync(dirname(file),{recursive:true});
      writeFileSync(file,bytes(path));
    }
    const manifest=assetManifest(tree);
    assert.equal(manifest.length,48);
    assert.equal(new Set(manifest).size,48);
    for (const path of fileNames) assert.ok(manifest.includes(path), "Missing: "+path);
    unlinkSync(join(tree,"assets/js/contact-production.js"));
    assert.throws(()=>assetManifest(tree), /scope unexpectedly shrank/);
  } finally { rmSync(tree,{recursive:true,force:true}); }
});

test("the asset report carries no false HIG, WCAG, medical or protected-portal approvals",()=>{
  const row=comparePublicAsset({path:"sitemap.xml",checkedInBytes:bytes("<urlset/>"),
    liveBytes:bytes("<urlset/>"),status:200,mime:"application/xml"});
  for(const unsupported of ["independentHigAcceptance","wcagCertified","portalTenantAccepted","clinicalApproved"])
    assert.equal(unsupported in row,false);
});
