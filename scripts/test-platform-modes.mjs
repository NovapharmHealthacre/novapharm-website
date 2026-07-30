import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { platformModes, getPlatformCapabilities, resolvePlatformMode } from "../src/core/platform-mode.mjs";

const output = ".pages-test";

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

try {
  run(process.execPath, ["scripts/build-site.mjs"], platformModes.PUBLIC_ONLY);

  const portal = read("portal/index.html");
  const contact = read("contact/index.html");
  const account = read("account-application/index.html");
  const sitemap = read("sitemap.xml");

  for (const [name, html] of [["portal", portal], ["contact", contact], ["account application", account]]) {
    assert.doesNotMatch(html, /<form\b/i, `${name} must not contain a form in PUBLIC_ONLY mode`);
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

  run(process.execPath, ["scripts/stage-pages-artifact.mjs", output], platformModes.PUBLIC_ONLY);
  assert.equal(existsSync(`${output}/portal/index.html`), true);
  assert.equal(existsSync(`${output}/admin`), false);
  assert.equal(existsSync(`${output}/employee`), false);
} finally {
  rmSync(output, { recursive: true, force: true });
  run(process.execPath, ["scripts/build-site.mjs"], platformModes.FULL_PLATFORM);
}

assert.match(read("portal/index.html"), /data-login-form/);
assert.equal(existsSync("_secure/portal/dashboard/index.html"), true);

console.log("Platform mode contracts passed for PUBLIC_ONLY and FULL_PLATFORM.");
