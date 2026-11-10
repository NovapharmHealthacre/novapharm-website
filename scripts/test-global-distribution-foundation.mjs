import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const routes = ["distribution", "market-access", "markets"];
const sitemap = readFileSync("sitemap.xml", "utf8");
const homepage = readFileSync("index.html", "utf8");
assert.match(homepage, /id="commercial-pathways"/, "Homepage must expose commercial pathways");
for (const slug of routes) {
  const path = "/" + slug + "/";
  const html = readFileSync(slug + "/index.html", "utf8");
  assert.equal((html.match(/<h1\b/g) || []).length, 1, slug + " must have one H1");
  assert.ok(html.includes('rel="canonical" href="https://novapharmhealthcare.com' + path + '"'), slug + " missing canonical");
  assert.ok(html.includes("#organization") && html.includes("#website"), slug + " missing canonical entities");
  assert.ok(html.includes("Regulated pharmaceutical wholesale supply has not commenced"), slug + " missing current permissions boundary");
  assert.ok(html.includes("/contact/?enquiry="), slug + " missing qualified enquiry route");
  assert.ok(sitemap.includes("<loc>https://novapharmhealthcare.com" + path + "</loc>"), slug + " absent from sitemap");
  assert.ok(homepage.includes('href="' + path + '"'), slug + " absent from homepage");
  assert.doesNotMatch(html, /fully licensed worldwide|ISO certified|guaranteed distribution/i, slug + " contains unverified claims");
}
console.log("Global distribution foundation: pages, internal links, canonicals, schema, sitemap, regulatory boundaries and enquiries passed.");
