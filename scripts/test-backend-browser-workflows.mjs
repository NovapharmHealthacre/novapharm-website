import { randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, webkit } from "playwright";

const baseUrl = new URL(process.env.VISUAL_BASE_URL || "http://127.0.0.1:4178").origin;
const credentialsPath = resolve(process.env.VISUAL_CREDENTIALS_PATH || "");

if (!process.env.VISUAL_CREDENTIALS_PATH) throw new Error("VISUAL_CREDENTIALS_PATH is required.");
if ((statSync(credentialsPath).mode & 0o077) !== 0) throw new Error("Browser-workflow credentials must not be readable by group or other users.");

const credentials = JSON.parse(readFileSync(credentialsPath, "utf8"));
if (!credentials.username || !credentials.password) throw new Error("Synthetic browser-workflow credentials are incomplete.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function rejectOptionalCookies(page) {
  const reject = page.locator("[data-consent-action='reject']:visible").first();
  if (await reject.isVisible().catch(() => false)) await reject.click();
}

async function submitContact(page, marker) {
  await page.goto(`${baseUrl}/contact/`, { waitUntil: "domcontentloaded" });
  await rejectOptionalCookies(page);

  await page.locator("[data-submit-button]").click();
  await page.locator("[data-error-summary]").waitFor({ state: "visible" });

  await page.locator("#contact-name").fill("Synthetic Validation Contact");
  await page.locator("#contact-email").fill(`validation-${marker}@example.com`);
  await page.locator("#contact-company").fill(`Validation Company ${marker}`);
  await page.locator("#contact-role").fill("Quality Manager");
  await page.locator("#contact-country").fill("United Kingdom");
  await page.locator("#contact-type").selectOption({ label: "Regulatory services" });
  await page.locator("#contact-message").fill(`Synthetic validation enquiry ${marker} concerning a controlled business regulatory workflow.`);
  await page.locator("input[name='safetyConfirmation']").check();
  await page.locator("input[name='privacyAcknowledgement']").check();
  await page.locator("[data-submit-button]").click();

  const status = page.locator("[data-form-status]");
  await status.waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelector("[data-form-status]")?.textContent?.includes("NP-LEAD-"));
  const statusText = await status.textContent();
  assert(statusText?.includes("securely recorded"), "Contact success message was not presented.");
  assert(!statusText?.includes("The string did not match the expected pattern"), "A raw browser error was exposed after contact submission.");
}

async function submitAccountApplication(page, marker) {
  await page.goto(`${baseUrl}/account-application/`, { waitUntil: "domcontentloaded" });
  await rejectOptionalCookies(page);

  await page.locator("#legalName").fill(`Synthetic Healthcare ${marker} Ltd`);
  await page.locator("#companyNumber").fill(`VAL${marker.replace(/\W/g, "").slice(-8).toUpperCase()}`);
  await page.locator("#customerType").selectOption("wholesaler");
  await page.locator("[data-step-next]:visible").click();

  await page.locator("#responsiblePerson").fill("Synthetic Responsible Person");
  await page.locator("#responsibleRole").fill("Responsible Person");
  await page.locator("#responsibleEmail").fill(`responsible-${marker}@example.com`);
  await page.locator("#registeredAddress").fill("1 Validation Way, Test City");
  await page.locator("#registeredPostcode").fill("AB1 2CD");
  await page.locator("[data-step-next]:visible").click();

  await page.locator("#gdpStatus").selectOption("in_progress");
  await page.locator("#insuranceStatus").fill("Synthetic evidence under controlled validation review");
  await page.locator("#creditReferences").fill("Synthetic validation credit reference");
  await page.locator("#tradeReferences").fill("Synthetic validation trade reference");
  await page.locator("#email").fill(`applicant-${marker}@example.com`);
  await page.locator("[data-step-next]:visible").click();

  const fileName = `validation-licence-${marker}.pdf`;
  await page.locator("#licenceFiles").setInputFiles({
    name: fileName,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% Synthetic non-confidential validation evidence\n%%EOF\n")
  });
  await page.locator("input[name='bankConfirmation']").check();
  await page.locator("input[name='applicantDeclaration']").check();
  await page.locator("input[name='privacyAcknowledgement']").check();
  await page.locator("button[type='submit']:visible").click();

  const status = page.locator("[data-application-status]");
  await page.waitForFunction(() => document.querySelector("[data-application-status]")?.textContent?.includes("Application APP-"));
  const statusText = await status.textContent();
  assert(statusText?.includes("securely recorded"), "Account-application success message was not presented.");
  assert(!statusText?.includes("The string did not match the expected pattern"), "A raw browser error was exposed after account submission.");
  const applicationNumber = statusText?.match(/APP-\d{4}-\d{6}/)?.[0];
  assert(applicationNumber, "Account-application reference was not presented.");
  return { fileName, applicationNumber };
}

async function verifyAdministratorReview(page, marker, fileName, applicationNumber) {
  await page.goto(`${baseUrl}/portal/`, { waitUntil: "domcontentloaded" });
  await rejectOptionalCookies(page);
  await page.locator("input[name='accessType'][value='admin']").check();
  await page.locator("#username").fill(credentials.username);
  await page.locator("#password").fill(credentials.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/admin/dashboard/", { timeout: 15000 }),
    page.locator("button[type='submit']").click()
  ]);

  const leadRow = page.locator("[data-leads] tr").filter({ hasText: `Validation Company ${marker}` });
  await leadRow.waitFor({ state: "visible" });
  await leadRow.locator("button").click();
  const leadMessage = page.locator(".admin-submitted-message");
  await leadMessage.waitFor({ state: "visible" });
  assert((await leadMessage.textContent())?.includes(marker), "Administrator lead review did not show the exact submitted message.");
  await page.locator("[data-admin-detail-close]").click();

  const applicationRow = page.locator("[data-applications] tr").filter({ hasText: applicationNumber });
  await applicationRow.waitFor({ state: "visible" });
  const applicationResponse = page.waitForResponse((response) => response.url().includes("/api/admin/applications/") && response.request().method() === "GET");
  await applicationRow.locator("button").click();
  assert((await applicationResponse).ok(), "Administrator application-detail request failed.");
  const detail = page.locator("[data-admin-detail-body]");
  await detail.waitFor({ state: "visible" });
  assert((await detail.textContent())?.includes(fileName), "Administrator application review did not show the uploaded document record.");

  const previewButton = page.locator("[data-email-deliveries] [data-admin-action='preview-email']").first();
  await previewButton.waitFor({ state: "visible" });
  await previewButton.click();
  const previewDialog = page.locator("[data-email-preview]");
  await previewDialog.waitFor({ state: "visible" });
  assert((await previewDialog.locator("[data-email-preview-html]").textContent())?.trim().length > 0, "Rendered email preview was empty.");
  assert((await previewDialog.locator("[data-email-preview-text]").textContent())?.trim().length > 0, "Plain-text email preview was empty.");
  await page.locator("[data-email-preview-close]").click();
}

for (const [engineName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    const marker = `${engineName}-${randomUUID().slice(0, 8)}`;
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-GB", reducedMotion: "reduce" });
    const page = await context.newPage();
    await submitContact(page, marker);
    const { fileName, applicationNumber } = await submitAccountApplication(page, marker);
    await verifyAdministratorReview(page, marker, fileName, applicationNumber);
    await context.close();
    console.log(`${engineName} contact, account application, upload, email preview and administrator review passed.`);
  } finally {
    await browser.close();
  }
}

console.log("Backend browser workflows passed in Chromium and WebKit using synthetic non-confidential data.");
