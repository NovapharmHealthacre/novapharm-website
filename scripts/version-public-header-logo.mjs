import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// The PNG bytes remain owner-approved; only the four public header URL keys
// change. Run after all page/editorial CSS transforms, before provenance stamping.
const logo = readFileSync(resolve("assets/brand/novapharm-healthcare-logo.png"));
const hash = createHash("sha256").update(logo).digest("hex");
const versioned = `/assets/brand/novapharm-healthcare-logo.png?v=20261119-official-red-v1&amp;sha256=${hash}`;
const pages = ["index.html", "capabilities/index.html", "oncology/index.html", "products/index.html"];
const logoPattern = /(<picture class="brand-logo"><img src=")\/assets\/brand\/novapharm-healthcare-logo\.png(?:\?[^"]*)?(")/g;
for (const page of pages) {
  const path = resolve(page);
  const original = readFileSync(path, "utf8");
  const headers = original.match(/<header class="site-header npd-header"[\s\S]*?<\/header>/g) ?? [];
  if (headers.length !== 1) throw new Error(`${page}: expected one public site header`);
  const matches = [...headers[0].matchAll(logoPattern)];
  if (matches.length !== 1) throw new Error(`${page}: expected one official header PNG`);
  const refreshed = headers[0].replace(logoPattern, (_match, before, after) => `${before}${versioned}${after}`);
  if (!refreshed.includes(`src="${versioned}"`)) throw new Error(`${page}: versioned logo URL missing`);
  const next = original.replace(headers[0], refreshed);
  if (next !== original) writeFileSync(path, next, "utf8");
}
console.log(`Versioned official public header PNG on ${pages.length} pages with exact SHA-256 cache key.`);
