import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = new URL(process.env.CRO_REVIEW_BASE_URL || "http://127.0.0.1:4178").origin;
const outputRoot = resolve(process.env.CRO_REVIEW_OUTPUT || "audit/evidence/cro-owner-review");
const beforePath = resolve(process.env.CRO_REVIEW_BEFORE || "audit/evidence/cro-browser/chromium/desktop-1440x900.png");
const manifestEntries = [];

mkdirSync(outputRoot, { recursive: true });

function record(path, kind, viewport = null) {
  const bytes = readFileSync(path);
  manifestEntries.push({
    path: relative(outputRoot, path),
    kind,
    viewport,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  });
}

function dataUrl(path) {
  const extension = path.endsWith(".png") ? "png" : "jpeg";
  return `data:image/${extension};base64,${readFileSync(path).toString("base64")}`;
}

async function settle(page) {
  await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    for (const image of document.images) image.loading = "eager";
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 10_000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function rejectConsent(page) {
  const reject = page.locator("[data-consent-action='reject']");
  if (await reject.count()) await reject.first().click().catch(() => {});
}

const browser = await chromium.launch({ headless: true });
try {
  const captures = [
    ["desktop-1920x1080", { width: 1920, height: 1080 }, true],
    ["desktop-1440x900", { width: 1440, height: 900 }, true],
    ["desktop-1280x800-header", { width: 1280, height: 800 }, false],
    ["tablet-768x1024", { width: 768, height: 1024 }, true],
    ["mobile-430x932", { width: 430, height: 932 }, true],
    ["mobile-390x844", { width: 390, height: 844 }, true],
    ["mobile-375x667", { width: 375, height: 667 }, true],
    ["mobile-320x568", { width: 320, height: 568 }, true]
  ];

  for (const [name, viewport, fullPage] of captures) {
    const context = await browser.newContext({ viewport, locale: "en-GB", reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/cro/`, { waitUntil: "networkidle" });
    await rejectConsent(page);
    await settle(page);
    const path = join(outputRoot, `${name}.jpg`);
    await page.screenshot({ path, type: "jpeg", quality: 82, fullPage, animations: "disabled" });
    record(path, fullPage ? "clean-full-page" : "clean-viewport", viewport);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "en-GB", reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/cro/`, { waitUntil: "networkidle" });
  await rejectConsent(page);
  await settle(page);
  await page.evaluate(() => {
    for (const element of document.querySelectorAll(".site-header,.skip-link")) element.style.display = "none";
  });
  const sections = [
    ["section-hero", ".cro-hero"],
    ["section-responsibility-architecture", ".cro-delivery"],
    ["section-development-navigator", ".cro-navigator"],
    ["section-service-architecture", ".cro-services"],
    ["section-quality-governance", ".cro-governance"],
    ["section-technology-oversight", ".cro-focus-tech"],
    ["section-development-continuity", ".cro-continuity"],
    ["section-final-cta", ".cro-final-cta"]
  ];
  for (const [name, selector] of sections) {
    const path = join(outputRoot, `${name}.jpg`);
    await page.locator(selector).screenshot({ path, type: "jpeg", quality: 86, animations: "disabled" });
    record(path, "clean-section", { width: 1440, height: 900 });
  }
  await context.close();

  const contactInputs = [
    ["Evidence architecture", resolve("assets/media/cro/cro-evidence-architecture-1600.jpg")],
    ["Oversight architecture", resolve("assets/media/cro/cro-delivery-architecture-1600.jpg")],
    ["Vishal Chakravarty", resolve("assets/media/cro/leadership/vishal-chakravarty-800.jpg")],
    ["Dr Girish Shantilal Achliya", resolve("assets/media/cro/leadership/girish-achliya-800.jpg")],
    ["Responsibility lanes", join(outputRoot, "section-responsibility-architecture.jpg")],
    ["Development navigator", join(outputRoot, "section-development-navigator.jpg")],
    ["Governance dependencies", join(outputRoot, "section-quality-governance.jpg")],
    ["Technology oversight", join(outputRoot, "section-technology-oversight.jpg")],
    ["Development continuity", join(outputRoot, "section-development-continuity.jpg")]
  ];
  const contactContext = await browser.newContext({ viewport: { width: 1800, height: 1320 }, deviceScaleFactor: 1 });
  const contactPage = await contactContext.newPage();
  await contactPage.setContent(`<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;padding:54px;background:#edf2f0;color:#101b28;font:16px Arial,sans-serif}header{display:flex;justify-content:space-between;align-items:end;margin-bottom:34px}h1{margin:0;font:48px Georgia,serif}header p{margin:0;color:#52616a}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}.item{background:white;border-top:4px solid #c62831}.item img{width:100%;height:300px;display:block;object-fit:cover;object-position:top}.item.graphic img{object-fit:contain;background:#f7f9f8}.item div{padding:16px 18px}.item strong{display:block}.item span{display:block;margin-top:4px;color:#65727a;font-size:13px}</style></head><body><header><div><h1>CRO media system</h1><p>Final owner-review contact sheet</p></div><p>NovaPharm Healthcare · 18 July 2026</p></header><main class="grid">${contactInputs.map(([label, path], index) => `<article class="item${index >= 4 ? " graphic" : ""}"><img src="${dataUrl(path)}" alt=""><div><strong>${label}</strong><span>${index < 4 ? "Registered media asset" : "Original information graphic"}</span></div></article>`).join("")}</main></body></html>`, { waitUntil: "load" });
  const contactPath = join(outputRoot, "media-contact-sheet.jpg");
  await contactPage.screenshot({ path: contactPath, type: "jpeg", quality: 88, fullPage: true });
  record(contactPath, "media-contact-sheet", { width: 1800, height: 1320 });
  await contactContext.close();

  const afterPath = join(outputRoot, "desktop-1440x900.jpg");
  if (beforePath.startsWith(outputRoot)) record(beforePath, "clean-before-full-page", { width: 1440, height: 900 });
  const comparisonContext = await browser.newContext({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
  const comparisonPage = await comparisonContext.newPage();
  await comparisonPage.setContent(`<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;padding:50px;background:#0b1923;color:#fff;font:16px Arial,sans-serif}h1{margin:0 0 30px;font:46px Georgia,serif}.compare{display:grid;grid-template-columns:1fr 1fr;gap:24px}.panel{background:#fff;color:#101b28}.panel header{padding:18px 22px;border-top:5px solid #c62831}.panel header strong{display:block;font-size:21px}.panel header span{color:#617078;font-size:13px}.hero{width:100%;height:430px;object-fit:cover;object-position:top}.rhythm{display:block;width:100%;height:520px;object-fit:contain;object-position:top;background:#f2f4f3}</style></head><body><h1>CRO experience · before and after</h1><main class="compare"><section class="panel"><header><strong>Before refinement</strong><span>1,996 visible words · 16,787 px at 1440</span></header><img class="hero" src="${dataUrl(beforePath)}" alt=""><img class="rhythm" src="${dataUrl(beforePath)}" alt=""></section><section class="panel"><header><strong>Final candidate</strong><span>1,478 visible words · 12,823 px at 1440</span></header><img class="hero" src="${dataUrl(afterPath)}" alt=""><img class="rhythm" src="${dataUrl(afterPath)}" alt=""></section></main></body></html>`, { waitUntil: "load" });
  const comparisonPath = join(outputRoot, "before-after-comparison.jpg");
  await comparisonPage.screenshot({ path: comparisonPath, type: "jpeg", quality: 88, fullPage: true });
  record(comparisonPath, "before-after-comparison", { width: 1800, height: 1200 });
  await comparisonContext.close();
} finally {
  await browser.close();
}

const manifest = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  publicDataOnly: true,
  browserChromeIncluded: false,
  credentialsIncluded: false,
  files: manifestEntries
};
writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`CRO owner-review pack written to ${relative(process.cwd(), outputRoot)} (${manifestEntries.length} clean images).`);
console.log(`Largest capture: ${basename(manifestEntries.sort((a, b) => b.bytes - a.bytes)[0].path)}.`);
