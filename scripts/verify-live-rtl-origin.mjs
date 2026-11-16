import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const RTL_FOUNDATION_MERGE = "37980381f02e67ad83874770c096cb4e2d93414e";
const ORIGIN = "https://novapharmhealthcare.com";

export function inspectLiveRtl({ home, cookies, contact, script, bundle }) {
  const source = home.match(/<meta\s+name=["']novapharm-source-sha["']\s+content=["']([0-9a-f]{40})["']/i);
  assert.ok(source, "Public homepage must identify its exact source SHA");
  const main = home.match(/<main\b[^>]*>/i)?.[0] ?? "";
  assert.match(main, /\blang="en-GB"/, "Untranslated public main must remain identified as English");
  assert.match(main, /\bdata-np-untranslated\b/, "Do not imply published clinical/legal content was translated");
  assert.match(home, /src="\/assets\/js\/rtl-localization\.js"/, "Public RTL bootstrap must load");
  assert.match(cookies, /<code>np_locale<\/code>/, "Disclose the first-party functional language cookie");
  assert.match(cookies, /Up to 365 days after selection/, "Disclose its actual retention limit");
  assert.match(cookies, /right-to-left layout preview/, "Arabic/Hebrew must remain clearly described as previews");
  assert.match(cookies, /legal review pending/, "Do not claim legal sign-off");
  assert.match(script, /var key = "np_locale"/, "Serve the real locale preference handler");
  assert.match(script, /html\.dir = locale === "en-GB" \? "ltr" : "rtl"/, "Serve LTR and RTL direction handling");
  assert.match(script, /layout-preview/, "Expose preview status rather than full translation");
  assert.match(bundle, /--np-rtl-contract:\s*1/, "Ship RTL rules in the public CSS bundle");
  const footerCss = bundle.split("/* Source: rtl-localization.css */")[1] ?? "";
  assert.match(footerCss, /--np-locale-footer-contract:\s*1/, "Live release must contain the new footer language design");
  const controlStyle = footerCss.match(/\.np-locale-control\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(controlStyle, /background:\s*transparent;/, "Legacy language card fill is still published");
  assert.match(controlStyle, /border:\s*0;/, "Legacy language card outline is still published");
  assert.match(controlStyle, /box-shadow:\s*none;/, "Legacy language card shadow is still published");
  assert.match(script, /footerSelectors = \["\.np-contact-reference-footer-inner", "\.npd-footer-bottom",/, "Locale selector must prioritize Contact and shared utility rows");
  assert.match(script, /footerSelectors\.map\(function \(selector\) \{ return document\.querySelector\(selector\); \}\)/, "Priority order must control footer lookup");
  assert.match(script, /node && node\.getClientRects\(\)\.length > 0/, "Locale selector must ignore hidden legacy footers");
  assert.match(contact, /data-live-b2b-enquiry-form/, "Do not downgrade the verified live contact service");
  assert.doesNotMatch(contact, /data-email-enquiry-form/, "Public-only placeholder must not replace live contact");
  return source[1];
}

function verifySourceAncestry(sourceSha) {
  assert.match(sourceSha, /^[0-9a-f]{40}$/);
  try {
    execFileSync("git", ["cat-file", "-e", sourceSha + "^{commit}"], { stdio: "pipe" });
    execFileSync("git", ["merge-base", "--is-ancestor", RTL_FOUNDATION_MERGE, sourceSha], { stdio: "pipe" });
  } catch {
    throw new Error("Live source SHA is not a known descendant of the tested RTL foundation merge: " + sourceSha);
  }
}

async function request(path, attempt) {
  const url = new URL(path, ORIGIN);
  url.searchParams.set("rtl-release-proof", String(attempt) + "-" + Date.now());
  const response = await fetch(url, {
    headers: { "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(response.status, 200, path + " must return HTTP 200");
  assert.equal(new URL(response.url).origin, ORIGIN, path + " must remain on the approved public origin");
  return response.text();
}

async function main() {
  let lastError;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const [home, cookies, contact, script, bundle] = await Promise.all([
        request("/", attempt),
        request("/legal/cookies/", attempt),
        request("/contact/", attempt),
        request("/assets/js/rtl-localization.js", attempt),
        request("/assets/css/novapharm.bundle.css", attempt),
      ]);
      const sourceSha = inspectLiveRtl({ home, cookies, contact, script, bundle });
      verifySourceAncestry(sourceSha);
      console.log("Live public RTL layout-preview proof passed.");
      console.log("Verified live source:", sourceSha);
      console.log("Scope: public RTL assets, language-cookie disclosure and preserved live contact service.");
      console.log("Not a claim of reviewed Arabic/Hebrew clinical/legal translation or authenticated-portal acceptance.");
      return;
    } catch (error) {
      lastError = error;
      console.error("RTL public proof attempt " + attempt + "/12 failed:", error.message);
      if (attempt < 12) await new Promise((resolveWait) => setTimeout(resolveWait, 10_000));
    }
  }
  throw new Error("Live RTL release has not been verified: " + lastError?.message);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
