import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { personBySlug } from "@novapharm/content";
import { articles } from "../data/articles";
import { assertPageMetaCoverage, corporatePages } from "../data/pages";
import { company, leadership, pageMeta, productCategories, servicePillars } from "../data/site";

const applicationRoot = process.cwd();
const repositoryRoot = path.resolve(applicationRoot, "../..");
const routeSet = new Set<string>();

assertPageMetaCoverage();
assert.equal(corporatePages.length, 27, "Corporate application must retain 27 canonical page records");
assert.equal(leadership.length, 5, "Five approved leadership profiles are required");
assert.equal(articles.length, 6, "Six substantial Insights articles are required");
assert.equal(Object.keys(pageMeta).length, corporatePages.length, "Every canonical page requires one metadata record");
assert.equal(new Set(Object.values(pageMeta).map((meta) => meta.title)).size, corporatePages.length, "Page titles must be unique");
assert.equal(new Set(Object.values(pageMeta).map((meta) => meta.description)).size, corporatePages.length, "Page descriptions must be unique");

for (const page of corporatePages) {
  const route = page.slug ? `/${page.slug}/` : "/";
  assert.ok(!routeSet.has(route), `Duplicate route: ${route}`);
  routeSet.add(route);
  assert.ok(page.heroTitle.length >= 12, `${route} needs a clear H1`);
  assert.ok(page.intro.length >= 70, `${route} needs a substantive introduction`);
}

for (const person of leadership) {
  const route = `/leadership/${person.slug}/`;
  assert.ok(!routeSet.has(route), `Duplicate leadership route: ${route}`);
  routeSet.add(route);
  assert.ok(person.biography.length >= 3, `${person.displayName} requires a reviewed biography`);
  assert.equal(person.schemaTitle, personBySlug(person.slug).publicTitle, `${person.displayName} title diverges from the canonical people registry`);
  if (person.image) assert.ok(existsSync(path.join(applicationRoot, "public", person.image)), `Missing portrait: ${person.image}`);
}

const vishal = leadership.find((person) => person.slug === "vishal-chakravarty");
assert.equal(vishal?.title, "Chief Executive Officer");
assert.equal(vishal?.governance, "Founder and statutory director");
const nishita = leadership.find((person) => person.slug === "nishita-trivedi");
assert.equal(nishita?.title, "Chief Technology Officer and Responsible Person");
assert.match(nishita?.governance ?? "", /not a statutory director/i);
const prabhakar = leadership.find((person) => person.slug === "prabhakar-lahare");
assert.equal(prabhakar?.title, "Chief Operating Officer");

for (const article of articles) {
  const route = `/news-insights/${article.slug}/`;
  assert.ok(!routeSet.has(route), `Duplicate article route: ${route}`);
  routeSet.add(route);
  assert.ok(article.sections.length >= 6, `${article.slug} requires at least six substantive sections`);
  assert.ok(article.references.length >= 2, `${article.slug} requires authoritative sources`);
  assert.equal(article.author, "NovaPharm Healthcare Editorial Team", `${article.slug} must retain its approved authorship`);
  assert.ok(existsSync(path.join(applicationRoot, "public", article.heroImage)), `Missing article image: ${article.heroImage}`);
}

assert.equal(routeSet.size, 38, "Corporate canonical route count changed unexpectedly");
assert.equal(company.companyNumber, "16716501");
assert.match(company.regulatoryNotice, /active in corporate, product, partnership and commercial-development work/i);
assert.match(company.regulatoryNotice, /Regulated wholesale supply has not commenced/i);
assert.equal(servicePillars.length, 8);
assert.equal(productCategories.length, 8);

for (const category of productCategories) {
  for (const extension of ["avif", "webp", "jpg"]) {
    assert.ok(existsSync(path.join(applicationRoot, "public", "assets", "media", "products", `${category.imageBase}.${extension}`)), `Missing ${category.title} ${extension} asset`);
  }
}

const parity = [
  ["src/content/site-content.mjs", "apps/corporate/data/site.ts"],
  ["src/content/cro-content.mjs", "apps/corporate/data/cro.ts"],
  ["src/content/oncology-content.mjs", "apps/corporate/data/oncology.ts"],
] as const;
for (const [legacy, target] of parity) {
  const digest = (file: string) => {
    const source = readFileSync(path.join(repositoryRoot, file), "utf8");
    // The migrated TypeScript data uses `as const` for route inference. Strip
    // that type-only annotation before comparing the approved content payload.
    const comparableSource = source.replaceAll(" as const", "");
    return createHash("sha256").update(comparableSource).digest("hex");
  };
  assert.equal(digest(legacy), digest(target), `Approved structured content diverged during migration: ${target}`);
}

const logoDigest = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
assert.equal(
  logoDigest(path.join(repositoryRoot, "assets/brand/novapharm-healthcare-logo.svg")),
  logoDigest(path.join(applicationRoot, "public/assets/brand/novapharm-healthcare-logo.svg")),
  "Corporate SVG logo must be byte-identical to the approved repository asset",
);

const renderedSource = readFileSync(path.join(applicationRoot, "components/page-renderer.tsx"), "utf8");
const heroAsset = path.join(applicationRoot, "public/assets/media/home/supply-network-hero.avif");
assert.ok(existsSync(heroAsset), "Homepage AVIF delivery asset is missing");
assert.ok(statSync(heroAsset).size < 80_000, "Homepage AVIF must remain below its 80 KB performance budget");
assert.match(renderedSource, /supply-network-hero\.avif/);
assert.match(renderedSource, /fetchPriority="high"/);
const productsView = renderedSource.match(/function ProductsPage\(\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
assert.equal((productsView.match(/Food Supplement Portfolio Review/g) ?? []).length, 1);
assert.ok(productsView.indexOf("food-supplement-portfolio-review") < productsView.indexOf("product-grid"), "Food Supplement Portfolio Review must precede other portfolio categories");
for (const prohibited of ["100% GDP compliant", "MHRA-authorised pharmaceutical wholesaler", "currently supplying NHS", "Founder & Chief Executive Officer"]) {
  assert.ok(!renderedSource.includes(prohibited), `Unsupported public claim found: ${prohibited}`);
}

console.log(`Corporate content validation passed: ${routeSet.size} canonical routes, ${leadership.length} leaders, ${articles.length} articles.`);
