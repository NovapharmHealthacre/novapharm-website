import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
assert.match(sha, /^[0-9a-f]{40}$/, "Release identity must be a 40-character Git commit SHA");
const register = JSON.parse(readFileSync(resolve(root, "seo/generated/page-metadata-register.json"), "utf8"));
assert.ok(register.length >= 60, "Canonical page register is incomplete");

let stamped = 0;
// Marketplace is added to the indexable sitemap after the SEO register is generated.
const releasePages = new Set([...register.map(record => record.file), "products/marketplace/index.html"]);
for (const route of releasePages) {
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

console.log(`Stamped ${stamped} registered and late-generated pages with verified Git source commit ${sha}; noindex quantum candidate stamped separately.`);
