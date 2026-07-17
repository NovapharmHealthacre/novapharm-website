import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { portalModules } from "../src/core/portal-module-catalog.mjs";
import { validateNutraxinRegister } from "../src/core/nutraxin-catalogue.mjs";

const root = resolve(process.cwd());
const catalogue = validateNutraxinRegister({ repositoryRoot: root });
const reviewedAt = catalogue.register.reviewedAt;

function write(path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content.endsWith("\n") ? content : `${content}\n`);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function md(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

const sources = {
  customer: {
    dashboard: "customers, orders, invoices, quality_complaints",
    account: "customers, organizations, organization_addresses, customer_contacts",
    orders: "orders, order_lines, order_status_history, shipments, invoices",
    invoices: "invoices, invoice_lines, payments, credit_notes",
    statements: "customer_statements, statement_lines",
    products: "products, product_variants, product_families, product_media, customer_price_lists",
    "price-lists": "price_lists, price_list_items, customer_price_lists, products",
    "stock-availability": "inventory_balances, batches, products, customer_price_lists",
    "order-tracking": "orders, order_status_history, shipments, delivery_events",
    "delivery-tracking": "shipments, shipment_lines, delivery_events, orders",
    returns: "returns, return_lines, orders, order_lines, credit_notes",
    "quality-complaints": "quality_complaints, quality_actions, orders, products, batches",
    documents: "documents, document_links, document_versions",
    support: "support_tickets, customers, users",
    "regulatory-documents": "documents, document_links, document_versions, regulatory_records",
    downloads: "documents, document_links, document_versions",
    analytics: "orders, invoices, returns, quality_complaints, shipments",
    settings: "users, customers, customer_contacts, notifications"
  },
  employee: {
    dashboard: "workflow_instances, purchase_orders, inventory_balances, quality_complaints, regulatory_cases, integration_events",
    customers: "customers, organizations, customer_contacts, orders, invoices, quality_complaints, support_tickets",
    suppliers: "suppliers, organizations, supplier_contacts, product_supplier_links, purchase_orders, goods_receipts",
    products: "products, product_families, product_variants, product_composition_items, product_claims, product_media, product_certifications",
    orders: "orders, order_lines, order_status_history, inventory_reservations, shipments, invoices",
    warehouse: "inventory_locations, inventory_balances, inventory_movements, batches, inventory_reservations",
    purchasing: "purchase_orders, purchase_order_lines, goods_receipts, goods_receipt_lines, supplier_invoices, invoice_matches",
    finance: "ledger_accounts, journal_entries, journal_lines, invoices, payments, supplier_invoices",
    quality: "quality_complaints, quality_actions, quality_deviations, capa_records, change_controls, recall_records",
    regulatory: "regulatory_cases, regulatory_milestones, regulatory_records, products",
    crm: "leads, lead_details, crm_opportunities, crm_stage_history, crm_activities",
    reports: "canonical read models across orders, purchasing, inventory, finance, quality, regulatory and security",
    administration: "workflow_instances, workflow_steps, role_permissions"
  },
  executive: {
    "command-centre": "customers, products, orders, invoices, quality_complaints, regulatory_cases, workflow_instances",
    "ceo-dashboard": "invoices, supplier_invoices, journal_entries, journal_lines, customers, orders",
    "sales-intelligence": "crm_opportunities, crm_stage_history, orders, invoices",
    "customer-analytics": "customers, organizations, orders, invoices, quality_complaints",
    "product-master": "products, product_variants, product_families, batches, product_claims",
    "nhs-data": "integration_events (approved licensed source required)",
    plpi: "regulatory_cases, regulatory_milestones (project records only)",
    pharmacovigilance: "integration boundary; qualified safety system required",
    sourcing: "suppliers, product_supplier_links, purchase_orders, goods_receipts",
    tenders: "approved opportunity source required",
    warehouse: "inventory_balances, inventory_movements, shipments",
    "service-levels": "orders, shipments, delivery_events",
    finance: "ledger_accounts, journal_entries, journal_lines, invoices, payments, supplier_invoices",
    capital: "board-approved planning source required",
    "microsoft-365": "integration_events, outbox_messages, sharepoint_links",
    documents: "documents, document_links, document_versions, document_approvals",
    "ai-technology": "approved use-case and model-risk source required",
    traceability: "products, batches, inventory_movements, orders, shipments"
  },
  admin: {
    dashboard: "workflow_instances, catalogue_imports, schema_migrations, security_events, outbox_messages",
    "local-review": "workflow_instances, catalogue_imports, schema_migrations, domain_events",
    users: "users, auth_user_scopes, auth_sessions, security_events",
    content: "products, product_variants, product_claims, product_media, catalogue_imports",
    analytics: "audit_logs, security_events, domain_events, outbox_messages, schema_migrations"
  }
};

const writeActions = new Map([
  ["customer.support", "Create support ticket via POST /api/enterprise/customer/support"],
  ["customer.returns", "Request customer-scoped return via POST /api/enterprise/customer/returns"],
  ["customer.quality-complaints", "Open non-safety quality complaint via POST /api/enterprise/customer/quality-complaints"],
  ["employee.products", "Create draft product and advance validated lifecycle state"],
  ["employee.suppliers", "Create prospect supplier only"],
  ["employee.orders", "Create and validate telesales order"],
  ["employee.purchasing", "Create purchase order and governed receipt/match workflow"],
  ["employee.administration", "Advance active workflow via POST /api/enterprise/workflows/:id/advance"]
]);

function permittedRoles(module) {
  if (module.area === "customer") return "customer; admin only with an explicit customer context";
  if (module.area === "employee") return "employee; admin";
  if (module.area === "executive") return "board; admin (read-only module contract)";
  return "admin";
}

function contract(module) {
  const sourceTables = sources[module.area]?.[module.slug] || "canonical application database";
  const writeAction = writeActions.get(module.code);
  const readEndpoint = `/api/enterprise/modules/${module.code}`;
  const customerIsolation = module.area === "customer" ? "Every query binds the authenticated customer_id; cross-account identifiers are rejected." : "Role and scope are checked server-side; no browser-provided role is trusted.";
  const external = module.externalDependency || (module.maturity === "operational_foundation" ? "Production data, approved operating procedures and owner acceptance." : "None recorded.");
  return [
    ["Contract ID", module.code],
    ["Route", module.route],
    ["Primary users", module.area === "executive" ? "Board and authorised executives" : `${module.area[0].toUpperCase()}${module.area.slice(1)} users`],
    ["Permitted roles", permittedRoles(module)],
    ["Business purpose", module.purpose],
    ["Canonical entities and source tables", sourceTables],
    ["Service functions", "enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed"],
    ["API endpoints", `${readEndpoint}; GET /api/enterprise/search${writeAction ? `; ${writeAction}` : ""}`],
    ["Key actions", writeAction || (module.area === "executive" ? "Inspect and drill into governed read models only." : "Filter, inspect and navigate authorised records.")],
    ["Approval requirements", writeAction ? "Server-side transition validation; CSRF; role check; audit event; domain event where lifecycle/workflow changes." : "No approval for an authorised read; controlled records remain immutable from this view."],
    ["Upstream dependencies", sourceTables],
    ["Downstream effects", writeAction ? "Transactional record, audit trail, and relevant workflow/outbox state." : "No state change."],
    ["Documents", module.slug.includes("document") || module.slug === "downloads" ? "Clean, authorised metadata only; private storage path is withheld." : "Related documents use canonical document_links and security classification."],
    ["Alerts", "Module notices and exception rows are derived from canonical status and maturity data."],
    ["KPIs", "Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth."],
    ["Audit events", writeAction ? "Specialised command audit event; lifecycle/workflow commands also create domain_events and outbox_messages." : "No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls."],
    ["Domain events", writeAction ? "Command-specific event where implemented; otherwise audit-only until a production workflow is approved." : "None on read."],
    ["Data freshness", "Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data."],
    ["Integration status", module.maturity],
    ["Empty state", module.externalDependency ? `Honest blocked state: ${module.externalDependency}.` : "A useful no-record state names the canonical dataset and does not fabricate activity."],
    ["Synthetic test scenario", "Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations."],
    ["Security tests", `Authentication, role boundary, parameterised query and protected-route checks. ${customerIsolation}`],
    ["Browser tests", "Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states."],
    ["Current maturity", module.maturity],
    ["Remaining production dependency", external]
  ];
}

const contractSections = ["customer", "employee", "executive", "admin"].map((area) => {
  const modules = portalModules.filter((module) => module.area === area);
  return `## ${area[0].toUpperCase()}${area.slice(1)} modules (${modules.length})\n\n${modules.map((module) => `### ${module.title}\n\n${contract(module).map(([label, value]) => `- **${label}:** ${md(value)}`).join("\n")}`).join("\n\n")}`;
}).join("\n\n");

write("architecture/portal-module-contracts.md", `# Enterprise portal module contracts\n\n- Version: 1.0\n- Reviewed: ${reviewedAt}\n- Source of truth: \`src/core/portal-module-catalog.mjs\` and \`src/core/enterprise-domain-service.mjs\`\n- Scope: ${portalModules.length} routed module contracts implementing the numbered enterprise-platform brief\n\n## Contract rules\n\nAll modules use one canonical database, the same status vocabulary, server-side identity and scope checks, parameterised queries, and the shared enterprise snapshot format. A rendered page is not classified as operational by itself. \`operational_foundation\` means that the local synthetic workflow is implemented and tested but production data, approved procedures, external integration and owner acceptance remain separate gates. Executive modules are read-only. Customer records are always filtered by the authenticated customer relationship.\n\n${contractSections}\n`);

write("architecture/portal-domain-map.md", `# Enterprise portal domain map\n\n- Version: 1.0\n- Reviewed: ${reviewedAt}\n- Architecture rule: one canonical transactional model; no portal-specific shadow databases\n\n## Bounded domains\n\n| Domain | Authoritative records | Connected modules | Key invariant |\n|---|---|---|---|\n| Identity and access | users, auth_credentials, auth_user_scopes, auth_sessions, role_permissions | All portals | Server validates identity and scope; customer context is never taken from the browser. |\n| Party master | organizations, customers, suppliers, contacts, addresses | Customer, employee, CRM, admin | One organisation identity links commercial, quality, regulatory and document records. |\n| Product and catalogue | products, product_families, product_variants, composition, claims, media, certifications | Public portfolio, Product Master, ordering, sourcing | Catalogue presence never means approved claims, sale status, stock or regulatory approval. |\n| Order to cash | price lists, orders, reservations, shipments, invoices, payments, statements, returns, credits | Customer, telesales, warehouse, finance, executive | Customer isolation and released-stock checks apply throughout. |\n| Procure to pay | suppliers, product links, purchase orders, receipts, supplier invoices, matches | Sourcing, purchasing, inventory, finance | Receipt and invoice evidence must reconcile to an approved purchase order. |\n| Quality and regulatory | complaints, actions, deviations, CAPA, recalls, regulatory cases and milestones | Quality, regulatory, Product Master, executive | Safety reports are excluded from general quality intake; unverified authorisation is never inferred. |\n| Documents and integration | documents, versions, approvals, links, domain events, outbox, integration events | All portals, SharePoint, notifications | Private storage paths stay server-side; delivery is idempotent and auditable. |\n\n## Vertical workflows\n\n1. Product onboarding: source record -> evidence review -> classification -> claims/media control -> approved lifecycle transition.\n2. Order to cash: account price -> order -> credit/stock checks -> reservation -> shipment -> invoice -> payment -> statement.\n3. Procure to pay: qualified supplier -> PO -> receipt/quarantine -> release -> supplier invoice -> three-way match -> journal.\n4. Lead to customer: enquiry -> qualification -> application -> review -> approval -> customer identity invitation.\n5. Quality complaint: customer-scoped intake -> triage -> investigation -> action/CAPA -> controlled closure.\n6. Document control: upload/quarantine -> scan state -> metadata -> approval -> effective version -> authorised link.\n\n## Data ownership\n\nSQLite is the local validation implementation. Azure SQL migration 004 is the parity target. SharePoint is a controlled document backbone and business-register projection, not the authentication, session, customer-isolation, finance or transaction database. Browser storage is not an authoritative store.\n`);

const eventRows = [
  ["product.review / product.approved / product.active / product.suspended / product.retired", "product", "Lifecycle transition", "Implemented", "domain_events + outbox_messages + audit_logs"],
  ["workflow.advanced / workflow.completed", "workflow", "Approved workflow step command", "Implemented", "domain_events + outbox_messages + audit_logs"],
  ["support_ticket.created", "support_ticket", "Customer support submission", "Audit implemented", "audit_logs; production event projection pending"],
  ["return.requested", "return", "Customer return submission", "Audit implemented", "audit_logs; production event projection pending"],
  ["complaint.opened", "quality_complaint", "Non-safety quality complaint", "Audit implemented", "audit_logs; production event projection pending"],
  ["catalogue.imported", "catalogue", "Idempotent Nutraxin import", "Import ledger implemented", "catalogue_imports + catalogue_import_items"],
  ["order.*", "order", "Order lifecycle", "Workflow contract", "Required before production automation"],
  ["purchase_order.* / goods_receipt.* / invoice_match.*", "purchasing", "Procure-to-pay lifecycle", "Workflow contract", "Required before production automation"],
  ["document.*", "document", "Scan, approval and version lifecycle", "Integration foundation", "Existing integration_events plus production Graph approval"],
  ["notification.*", "notification", "Queued delivery and replay", "Existing email queue foundation", "External provider credential required"]
];
write("architecture/portal-event-catalogue.md", `# Enterprise portal event catalogue\n\n- Version: 1.0\n- Reviewed: ${reviewedAt}\n\n| Event family | Aggregate | Trigger | Current status | Persistence or next gate |\n|---|---|---|---|---|\n${eventRows.map((row) => `| ${row.map(md).join(" | ")} |`).join("\n")}\n\n## Event controls\n\n- Event identifiers and idempotency keys are immutable.\n- Aggregate version prevents silent lifecycle overwrite.\n- A business transaction commits its state, audit record, domain event and outbox record atomically where the event is implemented.\n- Outbox delivery may retry without duplicating the business transaction.\n- External failure never changes an approved local record into an invented success.\n- Payloads exclude credentials, private storage paths, patient information and unrestricted document contents.\n`);

function parseTables(path) {
  const sql = readFileSync(join(root, path), "utf8");
  const tables = [];
  for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z0-9_]+)\s*\(([\s\S]*?)\n\);/gi)) {
    const columns = match[2].split("\n").map((line) => line.trim().replace(/,$/, "")).filter((line) => line && !/^(?:PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i.test(line)).map((line) => {
      const parts = line.match(/^([a-z0-9_]+)\s+(.+)$/i);
      return parts ? { name: parts[1], definition: parts[2] } : null;
    }).filter(Boolean);
    tables.push({ name: match[1], columns, source: path });
  }
  return tables;
}

const dictionaryTables = new Map();
for (const table of [...parseTables("database/schema.sql"), ...parseTables("database/sqlite/004_integrated_enterprise_portal.sql")]) dictionaryTables.set(table.name, table);
const dictionary = [...dictionaryTables.values()].sort((a, b) => a.name.localeCompare(b.name));
write("database/portal-data-dictionary.md", `# Enterprise portal data dictionary\n\n- Version: 1.0\n- Reviewed: ${reviewedAt}\n- Tables documented: ${dictionary.length}\n- Sources: \`database/schema.sql\` and \`database/sqlite/004_integrated_enterprise_portal.sql\`\n- Azure parity: \`database/azure/004_integrated_enterprise_portal.sql\` is validated structurally by the migration test\n\n## Global conventions\n\n- Monetary values use integer minor units plus an ISO currency code.\n- Synthetic records use TEST/DEMO identifiers and never represent NovaPharm revenue, stock, customers or regulatory approvals.\n- Timestamps are ISO-8601 UTC values.\n- Foreign keys and unique constraints enforce identity and relationship integrity.\n- Lifecycle changes use version fields and controlled services where supplied.\n- Private document storage paths are never returned by public or portal snapshot APIs.\n\n${dictionary.map((table) => `## ${table.name}\n\nSource: \`${table.source}\`\n\n| Field | SQL definition |\n|---|---|\n${table.columns.map((column) => `| \`${column.name}\` | ${md(column.definition)} |`).join("\n")}`).join("\n\n")}\n`);

write("database/portal-erd.md", `# Enterprise portal relationship model\n\n- Version: 1.0\n- Reviewed: ${reviewedAt}\n\n\`\`\`mermaid\nerDiagram\n  ORGANIZATIONS ||--o| CUSTOMERS : represents\n  ORGANIZATIONS ||--o| SUPPLIERS : represents\n  CUSTOMERS ||--o{ CUSTOMER_CONTACTS : authorises\n  CUSTOMERS ||--o{ ORDERS : places\n  ORDERS ||--|{ ORDER_LINES : contains\n  PRODUCTS ||--o{ ORDER_LINES : ordered_as\n  ORDERS ||--o{ SHIPMENTS : fulfilled_by\n  SHIPMENTS ||--o{ DELIVERY_EVENTS : reports\n  ORDERS ||--o{ INVOICES : billed_as\n  INVOICES ||--o{ PAYMENTS : settled_by\n  CUSTOMERS ||--o{ CUSTOMER_STATEMENTS : receives\n  ORDERS ||--o{ RETURNS : may_create\n  RETURNS ||--o{ CREDIT_NOTES : may_generate\n  PRODUCT_FAMILIES ||--o{ PRODUCT_VARIANTS : groups\n  PRODUCTS ||--o| PRODUCT_VARIANTS : describes\n  PRODUCTS ||--o{ PRODUCT_COMPOSITION_ITEMS : contains\n  PRODUCTS ||--o{ PRODUCT_CLAIMS : governs\n  PRODUCTS ||--o{ PRODUCT_MEDIA : presents\n  PRODUCTS ||--o{ BATCHES : identifies\n  BATCHES ||--o{ INVENTORY_BALANCES : held_as\n  INVENTORY_LOCATIONS ||--o{ INVENTORY_BALANCES : stores\n  SUPPLIERS ||--o{ PURCHASE_ORDERS : receives\n  PURCHASE_ORDERS ||--|{ PURCHASE_ORDER_LINES : contains\n  PURCHASE_ORDERS ||--o{ GOODS_RECEIPTS : received_as\n  SUPPLIER_INVOICES ||--o{ INVOICE_MATCHES : reconciled_by\n  QUALITY_COMPLAINTS ||--o{ QUALITY_ACTIONS : drives\n  QUALITY_COMPLAINTS ||--o{ CAPA_RECORDS : may_drive\n  PRODUCTS ||--o{ REGULATORY_CASES : assessed_by\n  REGULATORY_CASES ||--o{ REGULATORY_MILESTONES : contains\n  DOCUMENTS ||--o{ DOCUMENT_VERSIONS : versions\n  DOCUMENTS ||--o{ DOCUMENT_APPROVALS : governed_by\n  WORKFLOW_INSTANCES ||--o{ WORKFLOW_STEPS : contains\n  DOMAIN_EVENTS ||--o{ OUTBOX_MESSAGES : projects\n  USERS ||--o{ AUTH_SESSIONS : authenticates\n  USERS ||--o{ AUTH_USER_SCOPES : authorises\n\`\`\`\n\n## Critical relationship controls\n\n- Customer APIs join every customer-owned record through the authenticated customer identifier.\n- Order, invoice, return, complaint and document relationships cannot be selected across customer accounts.\n- Product activation for owner-supplied Nutraxin records is blocked unless claims, sale status and regulatory classification are all approved.\n- Posted journals must have equal debit and credit totals.\n- Quarantine quantities are excluded from released available-to-promise quantities.\n`);

const discrepancies = catalogue.register.products.flatMap((product) => (product.notes || []).map((note) => ({
  productId: product.id,
  sku: product.sku,
  product: product.name,
  cataloguePage: product.cataloguePage,
  note,
  status: "blocked_pending_approved_label_evidence"
})));
write("docs/nutraxin-catalogue-discrepancies.md", `# Nutraxin catalogue discrepancy register\n\n- Version: ${catalogue.register.version}\n- Reviewed: ${reviewedAt}\n- Source title: ${catalogue.register.source.title}\n- Source SHA-256: \`${catalogue.register.source.sha256}\`\n- Discrepancies: ${discrepancies.length}\n- Control: No discrepancy may be resolved from assumption or pack appearance alone. Approved label evidence and an authorised review decision are required.\n\n| Product | SKU | Catalogue page | Source observation | Status |\n|---|---|---:|---|---|\n${discrepancies.map((item) => `| ${md(item.product)} | \`${item.sku}\` | ${item.cataloguePage} | ${md(item.note)} | ${item.status} |`).join("\n")}\n\n## Publication boundary\n\nThe public page displays a generic composition-review status for affected records. It does not reproduce clinical statements, unresolved flavour wording or unverified source claims. The full discrepancy detail remains a controlled repository record for owner and regulatory review.\n`);

const mediaAssets = [];
for (const product of catalogue.register.products) {
  for (const variant of [
    { suffix: ".png", format: "png", width: 700, height: 700, role: "source-extract" },
    { suffix: "-480.webp", format: "webp", width: 480, height: 480, role: "responsive-web" },
    { suffix: "-800.webp", format: "webp", width: 800, height: 800, role: "responsive-web" },
    { suffix: "-480.avif", format: "avif", width: 480, height: 480, role: "responsive-web" },
    { suffix: "-800.avif", format: "avif", width: 800, height: 800, role: "responsive-web" }
  ]) {
    const relativePath = `assets/media/products/nutraxin/${product.imageBase}${variant.suffix}`;
    const absolutePath = join(root, relativePath);
    mediaAssets.push({
      productId: product.id,
      sku: product.sku,
      path: relativePath,
      sha256: sha256(absolutePath),
      bytes: statSync(absolutePath).size,
      format: variant.format,
      width: variant.width,
      height: variant.height,
      role: variant.role,
      source: "Owner-supplied Nutraxin UK catalogue embedded pack artwork",
      rightsBasis: "Owner supplied the catalogue and expressly requested website implementation; underlying brand-artwork rights remain an owner-controlled confirmation before production publication.",
      attributionRequired: false,
      thirdPartyBrandVisible: "Nutraxin",
      altText: product.altText,
      reviewStatus: "approved_for_pr_candidate_owner_review"
    });
  }
}
write("docs/nutraxin-media-provenance.json", `${JSON.stringify({
  version: "1.0.0",
  reviewedAt,
  source: catalogue.register.source,
  controls: {
    publicUse: "PR candidate only pending owner production approval",
    misrepresentation: "Pack artwork does not assert NovaPharm ownership, stock, approval or availability",
    metadata: "Responsive derivatives are repository-generated from owner-supplied embedded artwork"
  },
  assetCount: mediaAssets.length,
  assets: mediaAssets
}, null, 2)}\n`);

write("docs/product-claims-evidence-register.json", `${JSON.stringify({
  version: "1.0.0",
  reviewedAt,
  scope: "Nutraxin owner-supplied catalogue references",
  control: "No health, nutrition, medicinal, efficacy, clinical, certification or regulatory claim is approved by catalogue import.",
  products: catalogue.register.products.map((product) => ({
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    publicClaims: [],
    evidence: [],
    claimsReviewStatus: "blocked_pending_evidence_and_market_review",
    certificationStatus: "not_verified",
    regulatoryClassification: "not_assessed",
    saleStatus: "not_offered",
    requiredBeforeApproval: [
      "Approved market label and complete composition",
      "Applicable UK legal and regulatory classification review",
      "Permitted nutrition and health-claims evidence review",
      "Supplier, rights and artwork authorisation evidence",
      "Named reviewer decision and audit record"
    ],
    discrepancyCount: product.notes?.length || 0
  }))
}, null, 2)}\n`);

write("docs/nutraxin-regulatory-source-register.md", `# Nutraxin UK regulatory source register\n\n- Version: 1.0\n- Reviewed: ${reviewedAt}\n- Scope: Repository controls for the owner-supplied Nutraxin food supplement catalogue\n- Status: Technical and content-governance reference; not legal approval\n\n| Topic | Official source | Current repository decision | Owner or qualified-review gate |\n|---|---|---|---|\n| Food supplement status and safety | [Food supplements guidance, Food Standards Agency, 25 June 2026](https://www.gov.uk/government/publications/food-supplements-guidance/food-supplements-guidance) | Present the range as food supplement catalogue references, not medicines; publish no disease-prevention, treatment or cure wording. | Confirm classification and approved market labelling for each product. |\n| Permitted GB claims | [Great Britain nutrition and health claims register, updated 19 May 2026](https://www.gov.uk/government/publications/great-britain-nutrition-and-health-claims-nhc-register) | Import no health or nutrition claim from the catalogue. Claims remain blocked unless the exact authorised wording, conditions of use and product evidence are reviewed. | Qualified claims review and documented approval. |\n| Claims in websites and commercial communication | [DHSC guidance on nutrition and health claims](https://www.gov.uk/government/publications/nutrition-and-health-claims-guidance-to-compliance-with-regulation-ec-1924-2006-on-nutrition-and-health-claims-made-on-foods/nutrition-and-health-claims-guidance-to-compliance-with-regulation-ec-19242006) | Treat public page, metadata, captions and structured data as controlled publication surfaces. | Legal/regulatory review before any claim status changes. |\n| Nutrition legislation and brand-name implications | [Nutrition legislation information sheet](https://www.gov.uk/government/publications/nutrition-legislation-information-sources/nutrition-legislation-information-sheet--2) | Avoid benefit language inferred from product names or artwork; neutral catalogue descriptions only. | Confirm whether any brand or fancy name itself needs accompanying authorised wording. |\n| Food business, traceability and recall duties | [Running a food business: responsibilities](https://www.gov.uk/running-food-business) | No sale or availability status is enabled. Product activation requires approved controls and operating readiness. | Food-business registration, traceability and recall controls before trading. |\n| Food supplement composition and presentation | [Food Supplements (England) Regulations 2003](https://www.legislation.gov.uk/uksi/2003/1387/contents) | Composition is source transcription only and cannot substitute for an approved label/specification. | Verify permitted substances/forms, full specification and final labelling. |\n\n## Implementation conclusion\n\nThe public candidate is an evidence-controlled B2B catalogue reference. It does not offer products for sale, publish stock or price, assert regulatory classification, or reproduce health, nutrition, clinical or medicinal claims. The twelve identified source discrepancies remain blocked. This register must be reviewed again if the intended market, formulation, label, claim wording or commercial status changes.\n`);

write("audit/portal-module-audit.md", `# Enterprise portal module audit\n\n- Version: 1.0\n- Reviewed: ${reviewedAt}\n- Before-state evidence: owner-supplied 15-page portal screenshot document, checksum recorded in the owner handoff\n- Routed contracts reviewed: ${portalModules.length}\n\n| Area | Routed modules | Implemented foundation | External or planned boundaries |\n|---|---:|---:|---:|\n${["customer", "employee", "executive", "admin"].map((area) => {
  const modules = portalModules.filter((module) => module.area === area);
  const blocked = modules.filter((module) => module.maturity !== "operational_foundation").length;
  return `| ${area} | ${modules.length} | ${modules.length - blocked} | ${blocked} |`;
}).join("\n")}\n\n## Findings resolved\n\n- Generic placeholder pages were replaced by authenticated module workspaces backed by the canonical database.\n- Customer views now enforce customer isolation for account, order, invoice, statement, product, price, stock, tracking, return, complaint, document, support and analytics records.\n- Employee modules now expose connected product, supplier, order, purchasing, inventory, finance, quality, regulatory, CRM, reporting and workflow records.\n- Board and executive modules are read-only and label every synthetic or externally blocked source honestly.\n- Administrator views expose migration, import, workflow, domain-event and outbox state without unrestricted raw-table editing.\n- A single authorised search service respects customer and employee boundaries.\n\n## Honest boundaries retained\n\nNHS data, live pharmacovigilance, Microsoft 365 tenant access, capital plans, AI models and tenders remain no-data or external-integration states. PLPI remains an internal project-governance view and does not assert a granted licence. Warehouse views use a synthetic third-party location and do not imply NovaPharm ownership. All financial values are synthetic local-validation records.\n`);

console.log(`Generated enterprise documentation for ${portalModules.length} modules, ${dictionary.length} tables, ${catalogue.productCount} products and ${mediaAssets.length} media assets.`);
