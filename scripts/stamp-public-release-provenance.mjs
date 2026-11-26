import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { stampPinnedPublicHtml } from "./lib/stamp-pinned-public-html.mjs";
import { resolve } from "node:path";

const root = process.cwd();
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
assert.match(sha, /^[0-9a-f]{40}$/, "Release identity must be a 40-character Git commit SHA");
const register = JSON.parse(readFileSync(resolve(root, "seo/generated/page-metadata-register.json"), "utf8"));
assert.ok(register.length >= 60, "Canonical page register is incomplete");

let stamped = 0;
for (const record of register) {
  stampPinnedPublicHtml(root, record.file, sha);
  stamped += 1;
}
// These public HTML routes are generated after SEO's canonical register.
// Preserve provenance on every released public shell without indexing or
// authenticating the Portal, basket, tracking or error pages.
const latePublicPages = [
  "products/marketplace/index.html",
  "products/track/index.html",
  "products/strategic-portfolio/index.html",
  "products/esco/bag/index.html",
  "portal/index.html",
  "404.html"
];
for (const route of latePublicPages) {
  if (register.some((record) => record.file === route)) continue;
  stampPinnedPublicHtml(root, route, sha);
  stamped += 1;
}
// The public quantum research reference is noindex and deliberately outside SEO's
// indexable canonical register, but its released bytes still need commit provenance.
stampPinnedPublicHtml(root, "quantum-research/index.html", sha, { mustBeNoindex: true });

console.log(`Stamped ${stamped} generated canonical pages with verified Git source commit ${sha}; noindex quantum candidate stamped separately.`);
