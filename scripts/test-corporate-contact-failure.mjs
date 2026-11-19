import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

// Synthetic, browser-local failure acceptance. Every AWS request is intercepted
// and non-GET mutations are denied, so no external recipient or ledger is touched.
const origin = "https://novapharmhealthcare.com";
const browser = await chromium.launch({ headless: true });
let intercepted = 0;
const evidence = { contactPath: "/contact/", forcedStatus: 503 };
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    serviceWorkers: "block"
  });
  try {
    const page = await context.newPage();
    await page.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.protocol === "https:" && url.hostname === "h4dc1e4u57.execute-api.eu-north-1.amazonaws.com") {
        const headers = {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "Content-Type,X-Novapharm-Intake",
          "content-type": "application/json"
        };
        if (request.method() === "OPTIONS") {
          await route.fulfill({ status: 204, headers, body: "" });
        } else if (request.method() === "POST" && url.pathname === "/contact") {
          intercepted += 1;
          await route.fulfill({ status: 503, headers, body: '{"error":"synthetic-receiver-unavailable"}' });
        } else await route.abort("blockedbyclient");
      } else if (url.origin !== origin || !["GET", "HEAD"].includes(request.method())) {
        await route.abort("blockedbyclient");
      } else await route.continue();
    });
    const response = await page.goto(origin + "/contact/?synthetic-failure-check=20261111", {
      waitUntil: "domcontentloaded", timeout: 45000
    });
    assert.equal(response?.status(), 200, "Public Contact page not available");
    const form = page.locator("[data-live-b2b-enquiry-form]");
    await form.waitFor({ state: "visible", timeout: 20000 });
    const ready = await form.evaluate((node) => {
      const defaults = {
        name: "Synthetic Corporate Test",
        email: "synthetic-acceptance@example.invalid",
        company: "Test Company - No Real Customer",
        role: "Compliance",
        country: "United Kingdom",
        telephone: "+440000000000",
        message: "This request is intercepted inside the browser and cannot reach AWS."
      };
      for (const element of [...node.elements]) {
        if (!(element instanceof HTMLElement)) continue;
        const key = element.getAttribute("name") || "";
        if (element instanceof HTMLInputElement && element.type === "checkbox") {
          element.checked = true;
          element.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (element instanceof HTMLSelectElement) {
          const choices = [...element.options].filter(o => o.value && !o.disabled);
          const yes = choices.find(o => /yes|agree|confirm|business|general/i.test(o.value) && !/no\b/i.test(o.value));
          element.value = (yes || choices[0])?.value ?? "";
          element.dispatchEvent(new Event("change", { bubbles: true }));
        } else if ("value" in element && Object.hasOwn(defaults, key)) {
          element.value = defaults[key];
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      return { valid: node.reportValidity(), action: node.getAttribute("action"), required: [...node.querySelectorAll("[required]")].map(x => x.name) };
    });
    assert.equal(ready.valid, true, "Synthetic form fixtures do not satisfy required fields: " + JSON.stringify(ready.required));
    const button = form.locator("button[type=submit]");
    await button.click();
    const status = page.locator("[data-live-contact-status]");
    await page.waitForFunction(
      () => document.querySelector("[data-live-contact-status]")?.textContent?.includes("We could not confirm that your enquiry was received."),
      null,
      { timeout: 16000 }
    );
    assert.equal(intercepted,1,"Browser did not intercept exactly one API mutation");
    assert.equal(await button.isEnabled(), true, "Submit button not restored after receiver failure");
    assert.ok((await status.locator('a[href="mailto:vishal@novapharmhealthcare.com"]').count()) === 1,
      "Safe business-email fallback missing");
    evidence.statusText = (await status.innerText()).slice(0,300);
    evidence.requestsIntercepted = intercepted;
    evidence.submitRestored = true;
    const dir = "artifacts/corporate-live-acceptance";
    await mkdir(dir, { recursive: true });
    await page.screenshot({ path: dir + "/contact-synthetic-receiver-failure.png", fullPage: true, animations:"disabled" });
    await writeFile(dir + "/contact-failure.json", JSON.stringify(evidence, null, 2));
    console.log("PASS: contact 503 is safely handled, with zero real POST requests or external email");
  } finally {await context.close();}
} finally {await browser.close();}
