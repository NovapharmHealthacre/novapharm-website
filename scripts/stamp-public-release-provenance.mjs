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
  assert.ok(!route.startsWith("/") && !route.includes("..") && route.endsWith(".html"),
    "Unsafe late public page path");
  const full = resolve(root, route);
  assert.ok(existsSync(full), "Required late public HTML missing: " + route);
  let html = readFileSync(full, "utf8");
  assert.ok(html.includes("</head>"), "Late public HTML missing </head>: " + route);
  html = html.replace(/\s*<meta name="novapharm-source-sha" content="[0-9a-f]{40}">/gi, "");
  html = html.replace("</head>", '  <meta name="novapharm-source-sha" content="' + sha + '">\n</head>');
  assert.equal((html.match(/name="novapharm-source-sha"/g) ?? []).length, 1,
    "Missing or duplicate late-page source provenance: " + route);
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

console.log(`Stamped ${stamped} generated canonical pages with verified Git source commit ${sha}; noindex quantum candidate stamped separately.`);
