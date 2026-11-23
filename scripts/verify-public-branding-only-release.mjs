import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SHA = /^[0-9a-f]{40}$/;
export const APPROVED_CONTACT_ORIGIN = "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com";
export const REVIEWED_CONTACT_BLOBS = Object.freeze({
  "src/content/contact-managed-release.html": "14591f43ff0ec6674b026a7bec629495f18fa50f",
  "assets/js/contact-production.js": "d405d459e089c3a696bd0ed6b2fb84bf529787bc",
  "assets/css/novapharm-unified-20261107.css": "9631537b380551b5dd3f8dbee81d93c3098bab54"
});
const BLOCKED_PERMISSIONS = Object.freeze([
  "activatePublicCustomerAccess", "enableCustomerSubscriptions", "enableCustomerBilling",
  "cutOverPortalDnsOrApiMapping", "sendExternalEmail", "provisionNewPaidInfrastructure",
  "purchaseVendorLicenses", "admitUnapprovedMedicineData"
]);

export function gitBlobSha(contents) {
  const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
  return createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
}

export function evaluateBrandingOnlyRelease({
  config, eventName, brandingOnly, expectedSha, checkedOutSha, contactApiOrigin, sourceBlobs
}) {
  const issues = [];
  if (eventName !== "workflow_dispatch" || brandingOnly !== "true")
    issues.push("Brand-only approval is valid exclusively for an explicit manual release request");
  if (!SHA.test(expectedSha || "") || checkedOutSha !== expectedSha)
    issues.push("Requested source SHA must be an exact 40-character checked-out commit");
  if (contactApiOrigin !== APPROVED_CONTACT_ORIGIN)
    issues.push("The existing AWS Contact API origin must remain exactly pinned");
  const scope = config?.publicBrandingRelease;
  if (scope?.enabled !== true || scope?.signoff !== "granted" ||
      scope?.scope !== "public-static-with-preserved-contact")
    issues.push("Separate branding-only production signoff is not granted");
  // This route must NOT approve Portal login, subscriptions, payments or any email.
  if (config?.productionSignoff !== "not_granted")
    issues.push("General customer production signoff must remain separate");
  const permissions = config?.productionPermissions;
  for (const permission of BLOCKED_PERMISSIONS)
    if (permissions?.[permission] !== false)
      issues.push("Customer/regulated operation permission is not explicitly disabled: " + permission);
  for (const [path, expected] of Object.entries(REVIEWED_CONTACT_BLOBS))
    if (sourceBlobs?.[path] !== expected)
      issues.push("Reviewed live Contact source asset changed: " + path);
  return { approved: issues.length === 0, issues };
}

function checkCurrentCheckout() {
  const config = JSON.parse(readFileSync(resolve("config/intelligence/owner-production-constraints.json"), "utf8"));
  const sourceBlobs = Object.fromEntries(
    Object.keys(REVIEWED_CONTACT_BLOBS).map(path => [path, gitBlobSha(readFileSync(resolve(path)))])
  );
  const checkedOutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding:"utf8" }).trim();
  return evaluateBrandingOnlyRelease({
    config, sourceBlobs, checkedOutSha,
    eventName: process.env.RELEASE_EVENT || "",
    brandingOnly: process.env.BRANDING_ONLY || "",
    expectedSha: process.env.EXPECTED_SHA || "",
    contactApiOrigin: process.env.CONTACT_API_ORIGIN || ""
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = checkCurrentCheckout();
  if (!result.approved) {
    for (const issue of result.issues) console.error("::error::Branding release denied: " + issue);
    process.exitCode = 1;
  } else {
    console.log("Separate, exact-SHA public branding scope approved; customer permissions remain disabled.");
  }
}
