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
console.log(`Stamped ${stamped} generated canonical pages with verified Git source commit ${sha}.`);
