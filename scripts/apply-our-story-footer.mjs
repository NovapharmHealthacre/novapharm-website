import { readFileSync, writeFileSync } from "node:fs";
import { publicRtlFiles } from "./finalize-public-rtl.mjs";
const link = '<a href="/our-story/">Our story</a>';
let updated = 0;
for (const file of publicRtlFiles()) {
  const original = readFileSync(file, "utf8");
  const html = original.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/i, footer => {
    if (footer.includes('href="/our-story/"')) return footer;
    const companyHeading = /(<h[234]\b[^>]*>\s*(?:Company|About NovaPharm|About us)\s*<\/h[234]>)/i;
    if (companyHeading.test(footer)) return footer.replace(companyHeading, "$1" + link);
    const overview = /(<a\b[^>]*href="\/about\/"[^>]*>[\s\S]*?<\/a>)/i;
    if (overview.test(footer)) return footer.replace(overview, "$1" + link);
    return footer;
  });
  if (html !== original) { writeFileSync(file, html, "utf8"); updated++; }
}
console.log("Our Story footer link added to " + updated + " late public shells.");
