import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { runInNewContext } from "node:vm";
import { navigation } from "../src/content/site-content.mjs";

const routes = ["distribution", "market-access", "markets"];
const sitemap = readFileSync("sitemap.xml", "utf8");
const homepage = readFileSync("index.html", "utf8");
// The visible desktop and mobile navigation in both corporate renderers must
// expose Distribution. A section CTA alone does not satisfy primary navigation.
const nav = homepage.match(/<nav\b[^>]*aria-label="Primary navigation"[\s\S]*?<\/nav>/i)?.[0] || "";
assert.equal(navigation.filter(([label, href]) => label === "Distribution" && href === "/distribution/").length, 1, "Public navigation must have one Distribution entry");
assert.match(readFileSync("apps/corporate/data/site.ts", "utf8"), /\["Distribution", "\/distribution\/"\]/, "Next.js navigation must include Distribution");
assert.match(nav, /<a\b[^>]*href="\/distribution\/"/, "Homepage primary navigation must link to Distribution");
assert.match(nav, /data-mega-trigger="distribution"/, "Distribution navigation must open a contextual menu");
assert.match(homepage, /data-mega-panel="distribution"/, "Distribution menu must include its accessible panel");
assert.match(homepage, /id="commercial-pathways"/, "Homepage must expose commercial pathways");
for (const slug of routes) {
  const path = "/" + slug + "/";
  const html = readFileSync(slug + "/index.html", "utf8");
  assert.equal((html.match(/<h1\b/g) || []).length, 1, slug + " must have one H1");
  assert.ok(html.includes('rel="canonical" href="https://novapharmhealthcare.com' + path + '"'), slug + " missing canonical");
  assert.ok(html.includes("#organization") && html.includes("#website"), slug + " missing canonical entities");
  assert.ok(html.includes("Regulated pharmaceutical wholesale supply has not commenced"), slug + " missing current permissions boundary");
  assert.ok(html.includes("/contact/?enquiry="), slug + " missing qualified enquiry route");
  if (slug === "distribution") {
    for (const destination of ["/regulatory-services/", "/oncology/", "/products/"]) {
      assert.ok(html.includes('href="' + destination + '"'),
        "Distribution category editorial link must be valid: " + destination);
    }
  }
  assert.ok(sitemap.includes("<loc>https://novapharmhealthcare.com" + path + "</loc>"), slug + " absent from sitemap");
  assert.ok(homepage.includes('href="' + path + '"'), slug + " absent from homepage");
  assert.doesNotMatch(html, /fully licensed worldwide|ISO certified|guaranteed distribution/i, slug + " contains unverified claims");
}
for (const script of ["assets/js/contact-production.js", "assets/js/contact-email-draft.js"]) {
  const source = readFileSync(script, "utf8");
  for (const [search, expected] of [
    ["?enquiry=Distribution", "Distribution partnership"],
    ["?enquiry=Distribution%20partnership", "Distribution partnership"],
    ["?enquiry=Oncology", "Oncology & specialist medicines"],
    ["?enquiry=Oncology%20solid%20tumours", "Oncology & specialist medicines"],
    ["?enquiry=Pharmacy%20or%20wholesaler%20account", "Pharmacy or wholesaler account"]
  ]) {
    class Select {
      constructor() {
        this.options = [
          { value: "Product opportunity" },
          { value: "Distribution partnership" },
          { value: "Oncology & specialist medicines" },
          { value: "Pharmacy or wholesaler account" },
          { value: "General enquiry" }
        ];
        this.value = "";
      }
    }
    class TextArea { constructor() { this.value = ""; } }
    class Form {}
    const select = new Select();
    const message = new TextArea();
    const form = new Form();
    form.dataset = { apiOrigin: "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com" };
    form.elements = { namedItem: (name) => name === "enquiryType" ? select : name === "message" ? message : null };
    form.querySelector = () => ({ disabled: false });
    form.addEventListener = () => {};
    const isLive = script.includes("contact-production");
    const document = { querySelector: (selector) => {
      if (selector === (isLive ? "[data-live-b2b-enquiry-form]" : "[data-email-enquiry-form]")) return form;
      return { textContent: "" };
    }};
    runInNewContext(source, {
      document, URLSearchParams, HTMLFormElement: Form,
      HTMLSelectElement: Select, HTMLTextAreaElement: TextArea,
      location: { search }, window: { location: { search } }
    }, { timeout: 1000 });
    assert.equal(select.value, expected, script + " must preselect " + expected + " for " + search);
  }
}

console.log("Global distribution foundation: pages, internal links, canonicals, schema, sitemap, regulatory boundaries and canonical enquiry prefills passed.");
