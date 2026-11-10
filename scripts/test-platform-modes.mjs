import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { platformModes, getPlatformCapabilities, resolvePlatformMode } from "../src/core/platform-mode.mjs";

const output = ".pages-test";
const protectedDashboard = "_secure/portal/dashboard/index.html";

function run(command, args, mode) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, PLATFORM_MODE: mode },
    encoding: "utf8",
    stdio: "pipe"
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
}

function read(path) {
  return readFileSync(path, "utf8");
}

assert.equal(resolvePlatformMode("public_only"), platformModes.PUBLIC_ONLY);
assert.equal(getPlatformCapabilities(platformModes.PUBLIC_ONLY).portal, false);
assert.equal(getPlatformCapabilities(platformModes.FULL_PLATFORM).portal, true);
assert.throws(() => resolvePlatformMode("unknown"), /Unsupported PLATFORM_MODE/);

const initialMode = existsSync(protectedDashboard)
  && existsSync("portal/index.html")
  && /data-login-form/.test(read("portal/index.html"))
  ? platformModes.FULL_PLATFORM
  : platformModes.PUBLIC_ONLY;

try {
  run(process.execPath, ["scripts/build-site.mjs"], platformModes.PUBLIC_ONLY);

  const portal = read("portal/index.html");
  const contact = read("contact/index.html");
  const account = read("account-application/index.html");
  const sitemap = read("sitemap.xml");

  for (const [name, html] of [["portal", portal], ["contact", contact], ["account application", account]]) {
    if (name === "contact") {
      const openingTags = [...html.matchAll(/<form\b[^>]*>/gi)].map(([tag]) => tag);
      assert.equal(openingTags.length, 1, "PUBLIC_ONLY contact must contain exactly one email-draft form");
      assert.match(openingTags[0], /\bdata-email-enquiry-form\b/, "PUBLIC_ONLY contact may only use the email-draft workflow");
      assert.match(openingTags[0], /\baction=["']mailto:vishal@novapharmhealthcare\.com["']/i, "PUBLIC_ONLY contact email draft must target the verified corporate address");
      assert.doesNotMatch(openingTags[0], /\baction=["'](?:https?:|\/api\/)/i, "PUBLIC_ONLY contact must not submit data to an API");
    } else {
      assert.doesNotMatch(html, /<form\b/i, `${name} must not contain a form in PUBLIC_ONLY mode`);
    }
    assert.doesNotMatch(html, /type=["'](?:password|file)["']/i, `${name} must not collect credentials or files`);
    assert.doesNotMatch(html, /data-(?:login-form|contact-form|account-application)/i, `${name} must not expose server controls`);
  }
  assert.match(portal, /This public website never asks for a portal username, password or confidential company record/);
  assert.match(contact, /does not collect or transmit enquiry details/);
  assert.match(account, /does not accept account applications or business documents/);
  assert.doesNotMatch(sitemap, /account-application/);

  for (const path of ["admin", "employee", "entra-complete", "_secure", "portal/dashboard", "portal/change-password", "portal/executive-platform"]) {
    assert.equal(existsSync(path), false, `${path} must not exist in a PUBLIC_ONLY build`);
  }

  // A generated protected route must NEVER cross the Pages boundary even if
  // it accidentally remains on disk. Test actual copying, not only a filename
  // pattern check against a clean PUBLIC_ONLY build.
  const syntheticProtectedRoute = "portal/change-password/index.html";
  try {
    mkdirSync("portal/change-password", { recursive: true });
    writeFileSync(syntheticProtectedRoute, "<!doctype html><title>Non-secret synthetic protected route</title>\n");
    run(process.execPath, ["scripts/stage-pages-artifact.mjs", output], platformModes.PUBLIC_ONLY);
    assert.equal(existsSync(`${output}/portal/index.html`), true, "Public portal landing must remain available");
    assert.equal(existsSync(`${output}/portal/change-password`), false, "Protected route must not enter Pages output");
    assert.equal(existsSync(`${output}/admin`), false);
    assert.equal(existsSync(`${output}/employee`), false);
  } finally {
    rmSync("portal/change-password", { recursive: true, force: true });
  }

  run(process.execPath, ["scripts/build-site.mjs"], platformModes.FULL_PLATFORM);
  assert.match(read("portal/index.html"), /data-login-form/);
  assert.equal(existsSync(protectedDashboard), true);
} finally {
  rmSync(output, { recursive: true, force: true });
  run(process.execPath, ["scripts/build-site.mjs"], initialMode);
}

console.log("Platform mode contracts passed for PUBLIC_ONLY and FULL_PLATFORM.");
