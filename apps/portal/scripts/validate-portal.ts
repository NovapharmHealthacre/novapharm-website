import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { portalModules } from "@novapharm/portal-contracts";
import { resolvePortalView } from "../data/routes";

const applicationRoot = process.cwd();
const repositoryRoot = path.resolve(applicationRoot, "../..");
const sourceFiles = [
  "components/dashboard.tsx",
  "components/login-panel.tsx",
  "components/password-change.tsx",
  "lib/gateway.ts",
  "app/gateway/[...path]/route.ts",
  "proxy.ts",
];
const source = sourceFiles.map((file) => readFileSync(path.join(applicationRoot, file), "utf8")).join("\n");

assert.equal(portalModules.length, 54, "All 54 governed portal modules are required");
assert.equal(new Set(portalModules.map((module) => module.code)).size, portalModules.length, "Module codes must be unique");
assert.equal(new Set(portalModules.map((module) => module.route)).size, portalModules.length, "Module routes must be unique");
for (const module of portalModules) assert.equal(resolvePortalView(module.route)?.kind, "module", `Portal route does not resolve: ${module.route}`);

const logo = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
const approvedLogo = path.join(repositoryRoot, "assets/brand/novapharm-healthcare-logo.svg");
const portalLogo = path.join(applicationRoot, "public/assets/brand/novapharm-healthcare-logo.svg");
assert.ok(existsSync(portalLogo), "Portal logo is missing");
assert.equal(logo(approvedLogo), logo(portalLogo), "Portal logo must remain byte-identical to the approved SVG");

for (const prohibited of ["localStorage", "sessionStorage", "The string did not match the expected pattern", "Secure portal backend is not active", "PORTAL_PASSWORD="]) {
  assert.ok(!source.includes(prohibited), `Portal source contains prohibited pattern: ${prohibited}`);
}
assert.match(source, /X-CSRF-Token/);
assert.match(source, /noindex, nofollow, noarchive/);
assert.match(source, /Access-Control-Allow-Origin|portal gateway route|Portal gateway route/);
assert.match(source, /Customer/);
assert.match(source, /Employee/);
assert.match(source, /Board/);
assert.match(source, /Administrator/);

console.log(`Portal validation passed: ${portalModules.length} modules, four role areas and byte-identical official branding.`);
