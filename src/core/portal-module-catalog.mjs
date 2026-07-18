function module(area, slug, title, purpose, maturity = "operational_foundation", externalDependency = null) {
  const roots = { customer: "/portal", employee: "/employee", executive: "/portal/executive-platform", admin: "/admin" };
  return Object.freeze({
    code: `${area}.${slug}`,
    area,
    slug,
    title,
    route: `${roots[area]}/${slug}/`,
    purpose,
    maturity,
    externalDependency
  });
}

export const customerModules = Object.freeze([
  module("customer", "dashboard", "Customer Dashboard", "Account position, current actions and recent customer-scoped activity."),
  module("customer", "account", "My Account", "Controlled legal entity, contacts, addresses, terms and change-request status."),
  module("customer", "orders", "My Orders", "Customer-scoped orders, lines, status histories and linked fulfilment records."),
  module("customer", "invoices", "My Invoices", "Customer invoices, outstanding balances, payments and credit notes."),
  module("customer", "statements", "My Statements", "Period statements reconciled from invoices, credits and payments."),
  module("customer", "products", "My Products", "Account-authorised catalogue products with controlled pricing and availability state."),
  module("customer", "price-lists", "Price Lists", "Effective customer-specific price lists without supplier cost or other-account pricing."),
  module("customer", "stock-availability", "Stock Availability", "Released available-to-promise quantities and explicit quarantine separation."),
  module("customer", "order-tracking", "Order Tracking", "Order status, allocation and linked shipment progress."),
  module("customer", "delivery-tracking", "Delivery Tracking", "Carrier and delivery events from approved source records."),
  module("customer", "returns", "Returns", "Controlled return requests, inspection disposition and credit-note status."),
  module("customer", "quality-complaints", "Quality Complaints", "Customer quality cases without processing adverse-event information."),
  module("customer", "documents", "Documents", "Authorised customer and order documents only."),
  module("customer", "support", "Support Tickets", "Customer-scoped service requests and linked order or product context."),
  module("customer", "regulatory-documents", "Regulatory Documents", "Approved effective regulatory documents authorised for the account."),
  module("customer", "downloads", "Downloads", "Permission-controlled downloadable records with no direct storage disclosure."),
  module("customer", "analytics", "Customer Analytics", "Customer-only order, spend, service and complaint indicators."),
  module("customer", "settings", "Settings", "Identity, notification and controlled account-change preferences.")
]);

export const employeeModules = Object.freeze([
  module("employee", "dashboard", "Operations Dashboard", "Cross-functional tasks, exceptions and data-source readiness."),
  module("employee", "customers", "Customers", "Canonical customer accounts, contacts, credit and connected records."),
  module("employee", "suppliers", "Suppliers", "Qualification, contacts, products, purchasing and evidence."),
  module("employee", "products", "Product Master", "Product lifecycle, variants, composition, claims, media and linked records."),
  module("employee", "orders", "Telesales Orders", "Validated order creation and governed order lifecycle."),
  module("employee", "warehouse", "Warehouse & Inventory", "Third-party warehouse validation foundation and canonical inventory ledger."),
  module("employee", "purchasing", "Purchasing", "Purchase orders, receipts, supplier invoices and three-way matching."),
  module("employee", "finance", "Finance", "Synthetic double-entry, receivables, payables and control exceptions."),
  module("employee", "quality", "Quality", "Complaints, deviations, CAPA and batch-quality controls."),
  module("employee", "regulatory", "Regulatory", "Classification and milestone records without asserting unverified authorisation."),
  module("employee", "crm", "CRM", "Leads, opportunities, attribution and account-conversion context."),
  module("employee", "reports", "Reports", "Governed read-only operational reporting with stated scope and freshness."),
  module("employee", "administration", "Operational Administration", "Tasks, permissions and workflow state without security-admin duplication.")
]);

export const executiveModules = Object.freeze([
  module("executive", "command-centre", "Command Centre", "Cross-functional operating position, exceptions and decisions required."),
  module("executive", "ceo-dashboard", "CEO Dashboard", "Synthetic financial and operational indicators linked to canonical records."),
  module("executive", "sales-intelligence", "Sales Intelligence", "Pipeline, product interest, conversion and order indicators."),
  module("executive", "customer-analytics", "Customer Analytics", "Customer, application, credit, service and complaint indicators."),
  module("executive", "product-master", "Product Master", "Read-only strategic view of product readiness and claim controls."),
  module("executive", "nhs-data", "NHS Data", "Licensed-data integration contract and honest no-data state.", "blocked_external_integration", "Licensed NHS data source and approved purpose"),
  module("executive", "plpi", "PLPI", "Internal project governance only; no granted licence is implied.", "planned", "Verified project records and regulatory approval"),
  module("executive", "pharmacovigilance", "Pharmacovigilance", "Qualified safety-system boundary; general portal safety intake remains prohibited.", "blocked_external_integration", "Approved qualified safety system and process"),
  module("executive", "sourcing", "Sourcing", "Supplier qualification, product relationships and evidence status."),
  module("executive", "tenders", "Tenders", "Controlled opportunity tracking without implying award.", "planned", "Approved tender source and records"),
  module("executive", "warehouse", "Warehouse", "Third-party integration readiness and canonical stock indicators."),
  module("executive", "service-levels", "Service Levels", "Measured delivery indicators from approved synthetic source records."),
  module("executive", "finance", "Finance", "Read-only synthetic finance controls and reconciled indicators."),
  module("executive", "capital", "Capital", "Controlled budget and capital-planning boundary without published forecasts.", "planned", "Board-approved planning records"),
  module("executive", "microsoft-365", "Microsoft 365", "Graph and SharePoint integration health and least-privilege state.", "blocked_external_integration", "Microsoft tenant credentials and permission approval"),
  module("executive", "documents", "Documents", "Controlled metadata and links without public file exposure."),
  module("executive", "ai-technology", "AI & Technology", "Governed use-case register; no autonomous decisions are presented as live.", "planned", "Approved use cases, models and risk review"),
  module("executive", "traceability", "Traceability", "Canonical product, batch, order and inventory lineage; blockchain is not claimed.")
]);

export const adminModules = Object.freeze([
  module("admin", "dashboard", "Admin Dashboard", "Controlled platform, lead, application and integration overview."),
  module("admin", "local-review", "Owner Review", "Synthetic local acceptance index and module maturity."),
  module("admin", "users", "Users & Sessions", "Identity scopes, sessions and revocation controls."),
  module("admin", "content", "Content Governance", "Product content, claims, imagery and publication control."),
  module("admin", "analytics", "Platform Analytics", "Audit, security, migration, backup and data-quality indicators.")
]);

export const portalModules = Object.freeze([...customerModules, ...employeeModules, ...executiveModules, ...adminModules]);
export const portalModuleByCode = new Map(portalModules.map((entry) => [entry.code, entry]));

