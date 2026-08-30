import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(process.cwd());
const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const write = (path, value) => {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${value.trim()}\n`);
};
const cell = (value) => String(value ?? "")
  .replaceAll("\\", "\\\\")
  .replaceAll("|", "\\|")
  .replace(/\r?\n/g, " ")
  .trim();

const productRegister = readJson("docs/nutraxin-product-register.json");
const products = [...productRegister.products].sort((a, b) => a.catalogueOrder - b.catalogueOrder);
const productRows = products.map((product) => {
  const composition = product.formulation.map((item) => `${item.name}: ${item.amount}`).join("; ");
  return `| ${product.catalogueOrder} | \`${product.slug}\` | [${cell(product.name)}](/products/nutraxin/${product.slug}/) | ${cell(product.range)} | ${cell(product.packSize)} | ${cell(product.dosageForm)} | ${cell(composition)} | p. ${product.cataloguePage} | \`${product.imageBase}\`<br>\`${product.imageSha256}\` | No price, stock, availability, Bag or Buy action |`;
}).join("\n");

write("docs/products/nutraxin-product-matrix.md", `
# Nutraxin product matrix

Review date: 22 August 2026
Canonical source: \`docs/nutraxin-product-register.json\`
Catalogue scope: ${products.length} owner-supplied product records

This matrix is generated from the governed register. It records catalogue facts, not current UK availability, efficacy, regulatory acceptance, stock or price. Each detail route is public for qualified B2B review and deliberately contains no commerce control.

| Order | Slug | Canonical route | Range | Pack | Dosage form | Source-transcribed composition | Catalogue | Approved pack image and SHA-256 | Commerce state |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${productRows}

## Acceptance boundary

- All ${products.length} routes are generated in static and managed Next.js candidates.
- Product JSON-LD identifies the catalogue item but contains no \`Offer\`, price, inventory or availability claim.
- Pack images are the approved catalogue-derived product assets; no product pack is AI-generated or redrawn.
- Public copy is limited to the verified name, pack, formulation, classification context and explicit evidence boundaries.
- Commerce remains feature-gated pending approved prices, stock authority, merchant/payment decision, tax and delivery rules, returns approval and production transaction evidence.
`);

const modules = readJson("packages/portal-contracts/src/module-catalog.json");
const visible = modules.filter((module) => module.releaseClassification === "informational_only");
const hidden = modules.filter((module) => module.releaseClassification === "hidden_until_dependency_exists");
const moduleRows = modules.map((module) => {
  const roles = module.authorisedRoles.map((role) => `\`${role}\``).join(", ");
  const frontend = module.visibleInNavigation
    ? "Next.js governed dynamic route; read-only presentation"
    : "No navigation or screen; route resolves to 404";
  const api = module.visibleInNavigation
    ? `GET \`enterprise/modules/${module.code}\`; mutation controls suppressed in this release`
    : "Server module gate rejects access while dependency is absent";
  const documents = module.dataAuthority.includes("SharePoint")
    ? "SharePoint is document authority only after approved connection; never session or transaction authority"
    : "No separate approved document authority recorded";
  const security = `${module.visibleInNavigation ? "Server RBAC and noindex" : "Server RBAC, hidden-route rejection and noindex"}${module.area === "customer" ? "; customer-scoped database isolation" : ""}`;
  const tests = module.testCoverage.map((entry) => `\`${entry}\``).join("<br>");
  return `| \`${module.code}\` | ${cell(module.title)} | ${cell(module.purpose)} | \`${module.route}\` | ${roles} | ${frontend} | ${api} | ${cell(module.dataSource)} | ${documents} | ${cell(module.externalDependency)} | ${security} | ${tests} | Repository candidate only | \`${module.productionStatus}\` | ${cell(module.externalDependency)} |`;
}).join("\n");

write("docs/portal/54-module-production-matrix.md", `
# 54-module Portal production matrix

Review date: 22 August 2026
Canonical source: \`packages/portal-contracts/src/module-catalog.json\`
Governed modules: ${modules.length}
Repository-visible, informational and read-only: ${visible.length}
Hidden until an approved dependency exists: ${hidden.length}
Production-operational modules: 0

The matrix distinguishes repository implementation from live authority. No module is represented as production-operational. The public website materialises only a fail-closed Portal safety page. Managed Portal routes require accepted Azure hosting, Entra identity, production data, monitoring, security acceptance and owner approval.

| ID | Name | Business purpose | Route | Role | Frontend | API | Database | Documents | Integration | Security | Test status | Deployment status | Production status | Blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${moduleRows}

## Release rule

A module can become fully operational only when its authoritative source exists, staging and production identity work, role and organisation isolation pass against real infrastructure, accepted production data is connected, audit and monitoring are live, backup and restore are proven, the business owner accepts the workflow, and exact-SHA production evidence is recorded. Hidden modules remain unlinked and return 404 until then.
`);

console.log(`Generated governed ledgers for ${products.length} Nutraxin products and ${modules.length} Portal modules (${visible.length} informational, ${hidden.length} hidden).`);
