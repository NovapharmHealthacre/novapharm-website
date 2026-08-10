import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { insights, site } from "../data/site";

const root = process.cwd();
const logoPath = path.join(root, "public", "assets", "NIT-logo.svg");
const expectedLogoSha256 = "26662aa0cb8217169f67699c7a6f602f1fd556683239cba2c17efc1c1e930b74";
const logoSha256 = createHash("sha256").update(fs.readFileSync(logoPath)).digest("hex");
assert.equal(logoSha256, expectedLogoSha256, "Official NIT logo differs from the approved source asset");

assert.equal(site.url, "https://nit.novapharmhealthcare.com");
assert.equal(site.email, "bd@novapharmhealthcare.com");
assert.equal(insights.length, 3, "The approved NIT insight corpus must contain three articles");
assert.equal(new Set(insights.map((insight) => insight.slug)).size, insights.length, "Duplicate insight slug detected");
assert.equal(new Set(insights.map((insight) => insight.title)).size, insights.length, "Duplicate insight title detected");
for (const insight of insights) {
  assert.match(insight.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.match(insight.publishedIso, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(insight.modifiedIso, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(insight.sections.length >= 3, `${insight.slug}: article is too thin`);
}

const requiredRoutes = [
  "app/page.tsx",
  "app/expertise/page.tsx",
  "app/sectors/page.tsx",
  "app/approach/page.tsx",
  "app/insights/page.tsx",
  "app/insights/[slug]/page.tsx",
  "app/about/page.tsx",
  "app/contact/page.tsx",
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/not-found.tsx",
];
for (const route of requiredRoutes) assert.ok(fs.existsSync(path.join(root, route)), `Missing route source: ${route}`);

function sourceFiles(directory: string): readonly string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

const publicSource = [...sourceFiles(path.join(root, "app")), ...sourceFiles(path.join(root, "components")), ...sourceFiles(path.join(root, "data"))]
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
for (const [label, pattern] of [
  ["unsupported authorisation", /(?:we|NIT) (?:hold|holds|have|has) (?:an? )?(?:MHRA|WDA\(H\)|PLPI)/i],
  ["unsupported NHS supply", /(?:we|NIT) (?:supply|supplies|are supplying) (?:the )?NHS/i],
  ["unsupported guaranteed outcome", /guaranteed (?:approval|outcome|result)/i],
  ["unsupported professional service type", /ProfessionalService/],
  ["incorrect executive title", /Founder\s*(?:&|and)\s*Chief Executive Officer/i],
] as const) {
  assert.doesNotMatch(publicSource, pattern, `${label} detected`);
}
assert.doesNotMatch(publicSource, /dangerouslySetInnerHTML/, "Unsafe inline HTML rendering detected");

console.log(`Validated ${requiredRoutes.length} NIT route sources, ${insights.length} articles and the byte-identical official logo.`);
