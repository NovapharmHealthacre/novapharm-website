import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve("oncology/index.html"), "utf8");
const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
const types = schemas.flatMap((schema) => Array.isArray(schema["@type"]) ? schema["@type"] : [schema["@type"]]);
for (const required of ["WebPage", "BreadcrumbList", "FAQPage", "Service"]) assert.ok(types.includes(required), required);
const faq = schemas.find((schema) => schema["@type"] === "FAQPage");
assert.equal(faq.mainEntity.length, 6);
assert.ok(faq.mainEntity.every((item) => item.name && item.acceptedAnswer?.text));
const service = schemas.find((schema) => schema["@type"] === "Service");
assert.equal(service.provider["@id"], "https://novapharmhealthcare.com/#organization");
assert.equal(service.termsOfService, "https://novapharmhealthcare.com/oncology/#scope-boundary");
assert.match(html, /<link rel="canonical" href="https:\/\/novapharmhealthcare\.com\/oncology\/">/);
console.log("Oncology schema passed for WebPage, BreadcrumbList, FAQPage and evidence-bounded Service markup.");
