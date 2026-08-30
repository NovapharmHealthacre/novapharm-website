import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const catalogPath = resolve("packages/portal-contracts/src/module-catalog.json");
const reportPath = resolve("docs/programme/portal-module-maturity-register.md");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

const ownerBySlug = Object.freeze({
  dashboard: "Portal Product Owner",
  account: "Customer Operations",
  orders: "Commercial Operations",
  invoices: "Finance",
  statements: "Finance",
  products: "Product and Regulatory",
  "price-lists": "Commercial and Finance",
  "stock-availability": "Supply Chain Operations",
  "order-tracking": "Supply Chain Operations",
  "delivery-tracking": "Supply Chain Operations",
  returns: "Customer Operations and Quality",
  "quality-complaints": "Quality",
  documents: "Document Control",
  support: "Customer Operations",
  "regulatory-documents": "Regulatory and Quality",
  downloads: "Document Control",
  analytics: "Portal Product Owner",
  settings: "Portal Product Owner",
  customers: "Customer Operations",
  suppliers: "Supplier Quality and Procurement",
  warehouse: "Supply Chain Operations",
  purchasing: "Procurement",
  finance: "Finance",
  quality: "Quality",
  regulatory: "Regulatory",
  crm: "Commercial Operations",
  reports: "Business Intelligence",
  administration: "Platform Administration",
  "command-centre": "Board and Chief Executive Officer",
  "ceo-dashboard": "Chief Executive Officer",
  "sales-intelligence": "Commercial Operations",
  "customer-analytics": "Commercial Operations",
  "product-master": "Product and Regulatory",
  "nhs-data": "Commercial and Regulatory",
  plpi: "Regulatory",
  pharmacovigilance: "Qualified Safety Owner",
  sourcing: "Procurement and Supplier Quality",
  tenders: "Commercial Operations",
  "service-levels": "Supply Chain Operations",
  capital: "Board and Finance",
  "microsoft-365": "Microsoft 365 Platform Owner",
  "ai-technology": "AI Governance Committee",
  traceability: "Quality and Supply Chain Operations",
  "local-review": "Platform Administration",
  users: "Identity and Access Management",
  content: "Content Governance",
});

const sourceByCode = Object.freeze({
  "customer.dashboard": "Azure SQL target: customers, organisations, orders, invoices and quality_complaints",
  "customer.account": "Azure SQL target: customers, organisations, customer_contacts and organisation_addresses",
  "customer.orders": "Azure SQL target: orders and order_lines restricted by customer_id",
  "customer.invoices": "Azure SQL target: invoices and invoice_lines restricted by customer_id",
  "customer.statements": "Azure SQL target: invoices, credit notes and account transactions restricted by customer_id",
  "customer.products": "Azure SQL target: customer_price_lists, products, product_variants and inventory_balances",
  "customer.price-lists": "Azure SQL target: customer_price_lists, price_lists and price_list_items",
  "customer.stock-availability": "Azure SQL target: authorised products, released batches and inventory_balances",
  "customer.order-tracking": "Azure SQL target: orders, shipments and shipment_events restricted by customer_id",
  "customer.delivery-tracking": "Azure SQL target: shipments and shipment_events restricted by customer_id",
  "customer.returns": "Azure SQL target: returns, return_lines, orders and order_lines restricted by customer_id",
  "customer.quality-complaints": "Azure SQL target: quality_complaints, orders and products restricted by customer_id",
  "customer.documents": "Azure SQL metadata plus private Blob/SharePoint delivery after document authorisation",
  "customer.support": "Azure SQL target: support_tickets restricted by customer_id",
  "customer.regulatory-documents": "Azure SQL document metadata plus approved private regulatory document store",
  "customer.downloads": "Azure SQL document authorisations plus private Blob/SharePoint delivery",
  "customer.analytics": "Azure SQL customer-scoped aggregate queries; no third-party analytics source connected",
  "customer.settings": "Azure SQL target: identity linkage and customer notification preferences",
  "employee.customers": "Azure SQL target: customers, organisations, contacts and account workflow state",
  "employee.suppliers": "Azure SQL target: suppliers, organisations, qualification and quality-agreement state",
  "employee.products": "Azure SQL target: products, variants, composition, media and lifecycle events",
  "employee.orders": "Azure SQL target: orders, order_lines, customers and fulfilment state",
  "employee.warehouse": "Azure SQL target: batches, inventory_balances and warehouse_transactions; no live WMS connected",
  "employee.purchasing": "Azure SQL target: purchase_orders, purchase_order_lines and supplier records",
  "employee.finance": "Azure SQL target: invoices, journals, receivables and payables; no live accounting platform connected",
  "employee.quality": "Azure SQL target: quality_complaints, CAPA and quality workflow records",
  "employee.regulatory": "Azure SQL target: regulatory_cases and evidence status; no regulator system connected",
  "employee.crm": "Azure SQL target: opportunities and CRM activities; no Salesforce tenant connected",
  "employee.reports": "Azure SQL governed reporting queries; no production BI workspace connected",
  "employee.administration": "Azure SQL target: workflow_instances, outbox state and controlled domain events",
  "executive.command-centre": "Azure SQL read model across governed workflows, risks and review events",
  "executive.ceo-dashboard": "Azure SQL synthetic-validation executive aggregate; no production finance feed connected",
  "executive.sales-intelligence": "Azure SQL opportunities and commercial pipeline; no production CRM feed connected",
  "executive.customer-analytics": "Azure SQL customer aggregates; no production analytics warehouse connected",
  "executive.product-master": "Azure SQL product, regulatory and evidence-readiness read model",
  "executive.nhs-data": "No approved source connected; licensed NHS data source and purpose required",
  "executive.plpi": "No verified production projects connected; Azure SQL governance schema only",
  "executive.pharmacovigilance": "No qualified safety system connected",
  "executive.sourcing": "Azure SQL supplier qualification and sourcing-readiness read model",
  "executive.tenders": "No approved tender source connected",
  "executive.warehouse": "Azure SQL synthetic shipment read model; no live WMS or Polar Speed feed connected",
  "executive.service-levels": "Azure SQL synthetic shipment events; no accepted production carrier feed connected",
  "executive.finance": "Azure SQL synthetic journals and invoices; no production finance system connected",
  "executive.capital": "No board-approved capital planning source connected",
  "executive.microsoft-365": "No production Graph or SharePoint connection; tenant consent required",
  "executive.documents": "Azure SQL document metadata; private SharePoint/Blob content not connected in production",
  "executive.ai-technology": "No production AI use case or model approved",
  "executive.traceability": "Azure SQL stock and transaction events; no blockchain capability claimed",
  "admin.dashboard": "Azure SQL target: workflow, integration, security and audit aggregates",
  "admin.local-review": "Synthetic local acceptance register only",
  "admin.users": "Azure SQL target: identity linkage, sessions and security events; Entra not connected in production",
  "admin.content": "Repository claims/content registries plus Azure SQL publication workflow target",
  "admin.analytics": "Application Insights and Azure SQL target; no live telemetry estate connected",
});

const writeModules = new Set([
  "customer.returns",
  "customer.quality-complaints",
  "customer.support",
  "employee.products",
  "employee.administration",
]);

const rolesByArea = Object.freeze({
  customer: ["customer", "admin"],
  employee: ["employee", "admin"],
  executive: ["board", "admin"],
  admin: ["admin"],
});

const enriched = catalog.map((module) => {
  const hidden = module.maturity !== "operational_foundation";
  const releaseClassification = hidden ? "hidden_until_dependency_exists" : "informational_only";
  const productionDependency = module.externalDependency
    ?? "Accepted Azure deployment, Entra identity linkage, production data migration and owner acceptance";
  return {
    ...module,
    releaseClassification,
    releaseClassificationLabel: hidden ? "Hidden until its dependency exists" : "Informational only",
    businessOwner: ownerBySlug[module.slug] ?? `${module.area} business owner`,
    dataSource: sourceByCode[module.code] ?? "No approved production source connected",
    dataSourceStatus: hidden ? "not_connected" : "repository_query_implemented_production_not_connected",
    dataAuthority: "Azure SQL Database for transactional records; SharePoint only for authorised controlled documents",
    readCapability: hidden ? "none_while_hidden" : "repository_tested_read_model",
    writeCapability: writeModules.has(module.code) ? "controlled_repository_write_implemented_but_not_released" : "none_read_only",
    externalDependency: productionDependency,
    authorisedRoles: rolesByArea[module.area],
    testCoverage: hidden
      ? ["packages/portal-contracts/test/catalog.test.ts", "apps/portal/test/routes.test.ts (hidden route rejection)", "src/core/enterprise-domain-service.mjs (server fail-closed gate)"]
      : ["packages/portal-contracts/test/catalog.test.ts", "apps/portal/test/routes.test.ts", "scripts/test-enterprise-portal.mjs", "apps/portal/test/browser-acceptance.ts"],
    validationDataState: "synthetic_non_confidential_only",
    visibleInNavigation: !hidden,
    productionStatus: "not_deployed_owner_controlled",
    classificationRationale: hidden
      ? "The required approved external system, evidence or business record does not exist; route and API access fail closed."
      : "The repository read model and role boundary are tested with synthetic data, but no accepted production runtime or canonical production data is connected, so the release remains informational and read-only.",
  };
});

if (enriched.length !== 54) throw new Error(`Expected 54 portal modules, received ${enriched.length}.`);
await writeFile(catalogPath, `${JSON.stringify(enriched, null, 2)}\n`, "utf8");

const rows = enriched.map((module) => `| \`${module.code}\` | ${module.businessOwner} | ${module.releaseClassificationLabel} | ${module.readCapability} | ${module.writeCapability} | ${module.authorisedRoles.map((role) => `\`${role}\``).join(", ")} | ${module.productionStatus} |`).join("\n");
const report = `# Portal Module Maturity Register\n\nStatus: repository classification complete; production deployment pending  \nReview date: 1 August 2026  \nScope: all 54 governed modules\n\n## Decision\n\nNo module is described as fully operational in production. Forty-seven repository-backed modules are released as **informational only** and read-only because Azure, Entra and canonical production data are not deployed. Seven modules are **hidden until their dependency exists**. No module is silently removed. Synthetic local acceptance demonstrates contracts and access boundaries; it is not evidence of a live ERP, WMS, CRM, finance, NHS, pharmacovigilance or Microsoft 365 integration.\n\nThe canonical machine-readable record is [module-catalog.json](../../packages/portal-contracts/src/module-catalog.json). Each record names its actual repository or external source boundary, business owner, maturity, read/write state, dependency, authorised roles, test files, navigation state and production status.\n\n## Enforcement\n\n- Hidden modules do not resolve through portal routing and are rejected by the server module service.\n- Informational modules suppress mutation controls in the current release.\n- Every customer query retains database-enforced \`customer_id\` isolation.\n- An \`admin\` navigation link never replaces record-level authorisation.\n- SharePoint is not used for sessions, authentication, customer isolation or transactional authority.\n\n## Register\n\n| Module | Business owner | Release classification | Read | Write | Authorised roles | Production |\n|---|---|---|---|---|---|---|\n${rows}\n\n## Production activation gate\n\nA module can move to **Fully operational and tested** only after its named source is connected, real data ownership is approved, migrations reconcile, security and role tests pass in Azure staging, business acceptance is signed, backup/restore is proven, and live monitoring is active. The catalogue change must be reviewed like code and cannot be made from the browser.\n`;
await writeFile(reportPath, report, "utf8");

const counts = Object.groupBy(enriched, (module) => module.releaseClassification);
console.log(`Portal catalogue reconciled: ${enriched.length} modules; informational=${counts.informational_only?.length ?? 0}; hidden=${counts.hidden_until_dependency_exists?.length ?? 0}.`);
