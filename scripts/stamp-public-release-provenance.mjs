import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stampMarketplaceSourceRevision } from "./marketplace-release-provenance.mjs";

const root = process.cwd();
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
assert.match(sha, /^[0-9a-f]{40}$/, "Release identity must be a 40-character Git commit SHA");
const register = JSON.parse(readFileSync(resolve(root, "seo/generated/page-metadata-register.json"), "utf8"));
assert.ok(register.length >= 60, "Canonical page register is incomplete");

let stamped = 0;
for (const record of register) {
  const route = record.file;
  assert.match(route, /^(?!\/)(?!.*\.\.\/)[a-zA-Z0-9/_-]+\.html$/, "Unsafe page path in SEO register");
  const full = resolve(root, route);
  assert.ok(existsSync(full), `Canonical HTML missing: ${route}`);
  let html = readFileSync(full, "utf8");
  assert.ok(html.includes("</head>"), `Missing head element: ${route}`);
  html = html.replace(/\s*<meta name="novapharm-source-sha" content="[0-9a-f]{40}">/gi, "");
  html = html.replace("</head>", `  <meta name="novapharm-source-sha" content="${sha}">\n</head>`);
  assert.equal((html.match(/name="novapharm-source-sha"/g) ?? []).length, 1, `Duplicate source proof: ${route}`);
  writeFileSync(full, html, "utf8");
  stamped += 1;
}
// The public quantum research reference is noindex and deliberately outside SEO's
// indexable canonical register, but its released bytes still need commit provenance.
const researchCandidatePath = resolve(root, "quantum-research/index.html");
// Read directly: a separate existsSync check introduces a time-of-check/time-of-use gap.
// Missing or unreadable source must fail closed before the artifact can be staged.
let researchCandidate = readFileSync(researchCandidatePath, "utf8");
assert.ok(researchCandidate.includes('name="robots" content="noindex, nofollow"'), "Quantum candidate must remain noindex");
researchCandidate = researchCandidate.replace(/\s*<meta name="novapharm-source-sha" content="[0-9a-f]{40}">/gi, "");
researchCandidate = researchCandidate.replace("</head>", '  <meta name="novapharm-source-sha" content="' + sha + '">\n</head>');
writeFileSync(researchCandidatePath, researchCandidate, "utf8");

// Marketplace is materialised after the SEO page metadata register. Its
// public URL is indexable but absent from that pre-Marketplace register, so
// the original register-only loop cannot stamp it. Never overwrite a future
// primary-register entry; only take the reviewed post-build fallback path.
const marketplaceFile = "products/marketplace/index.html";
if (!register.some(record => record.file === marketplaceFile)) {
  const marketplacePath = resolve(root, marketplaceFile);
  // Missing Marketplace at this point is a broken public build, not optional.
  const currentMarketplaceHtml = readFileSync(marketplacePath, "utf8");
  writeFileSync(marketplacePath,
    stampMarketplaceSourceRevision(currentMarketplaceHtml, sha), "utf8");
}

console.log(`Stamped ${stamped} generated canonical pages with verified Git source commit ${sha}; noindex quantum candidate stamped separately.`);
