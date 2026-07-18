import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildPublicPages } from "./build-public-pages.mjs";
import { customerModules, employeeModules } from "../src/core/portal-module-catalog.mjs";

const apiBase = process.env.PUBLIC_API_ORIGIN || "";
const secureRoot = process.env.SECURE_CONTENT_ROOT || "_secure";
const brandLogoSvg = "/assets/brand/novapharm-healthcare-logo.svg";
const brandLogoPng = "/assets/brand/novapharm-healthcare-logo.png";

function brandPicture({ className = "brand-logo", width = 280, height = 35, eager = false } = {}) {
  return `<picture class="${className}"><source srcset="${brandLogoSvg}" type="image/svg+xml"><img src="${brandLogoPng}" alt="NovaPharm Healthcare" width="${width}" height="${height}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></picture>`;
}

function privateHead(title) {
  return `<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><link rel="icon" href="${brandLogoSvg}" type="image/svg+xml"><link rel="stylesheet" href="/assets/css/novapharm.bundle.css"><script type="module" src="/assets/js/cookie-consent.js"></script><script src="/assets/js/local-validation-banner.js" defer></script></head>`;
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function lockedPage(scope) {
  const labels = {
    customer: ["Customer workspace", "Customer records, orders, invoices and documents require an authenticated customer or administrator session.", "Customer"],
    employee: ["Employee workspace", "Operational applications and company records require an authenticated employee or administrator session.", "Employee"],
    admin: ["Administration", "User, lead, content and integration controls require an administrator session.", "Employee"],
    board: ["Board workspace", "Executive intelligence and controlled board documents require a board or administrator session.", "Board member"]
  };
  const [title, description, access] = labels[scope];
  return `<!DOCTYPE html><html lang="en-GB">${privateHead(`${title} | NovaPharm Healthcare`)}<body class="login-page"><main class="login-panel locked-panel"><a class="login-logo" href="/portal/" aria-label="NovaPharm Healthcare secure portal">${brandPicture({ width: 320, height: 40, eager: true })}</a><span class="section-kicker">Protected workspace</span><h1>${title}</h1><p>${description} Select <strong>${access}</strong> on the secure portal login.</p><a class="btn btn-primary" href="/portal/">Return to secure portal</a><div class="alert">This public shell does not expose dashboards, records or controlled documents.</div><button class="inline-link-button portal-cookie-settings" type="button" data-cookie-settings>Cookie settings</button></main></body></html>`;
}

function writeProtected(path, content, scope) {
  write(join(secureRoot, path), content);
  write(path, lockedPage(scope));
}

function loginPage() {
  return `<!DOCTYPE html><html lang="en-GB" data-api-base="${apiBase}">${privateHead("Secure Portal Login | NovaPharm Healthcare")}<body class="login-page"><main class="login-panel"><div class="login-logo">${brandPicture({ width: 320, height: 40, eager: true })}</div><span class="section-kicker">Private access</span><h1>NovaPharm Secure Portal</h1><p>Choose your authorised access area and sign in. Customer, employee, board and administrator information remains locked until the secure backend verifies your session and permissions.</p><form class="form-grid" data-login-form><fieldset class="portal-access"><legend>Portal access</legend><label><input type="radio" name="accessType" value="customer" checked><span><strong>Customer</strong><small>Orders, invoices, statements and documents</small></span></label><label><input type="radio" name="accessType" value="employee"><span><strong>Employee</strong><small>Operations, products, purchasing and CRM</small></span></label><label><input type="radio" name="accessType" value="board"><span><strong>Board member</strong><small>Executive Platform and CEO dashboard</small></span></label><label><input type="radio" name="accessType" value="admin"><span><strong>Administrator</strong><small>Users, content, analytics and platform controls</small></span></label></fieldset><a class="btn btn-outline" href="/.auth/login/aad" data-entra-login hidden>Continue with Microsoft</a><div class="portal-login-divider" aria-hidden="true"><span>or use an approved bootstrap account</span></div><div class="form-row"><div class="field"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required></div><div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div></div><button class="btn btn-primary" type="submit">Sign in securely</button><div class="alert" data-login-status role="status" aria-live="polite">Credentials and portal permissions are verified server-side.</div></form><button class="inline-link-button portal-cookie-settings" type="button" data-cookie-settings>Cookie settings</button></main><script src="/assets/js/api-client.js" defer></script><script src="/assets/js/portal-login.js" defer></script></body></html>`;
}

function entraCompletePage() {
  return `<!DOCTYPE html><html lang="en-GB" data-api-base="${apiBase}">${privateHead("Completing Secure Sign-in | NovaPharm Healthcare")}<body class="login-page"><main class="login-panel"><a class="login-logo" href="/portal/" aria-label="NovaPharm Healthcare secure portal">${brandPicture({ width: 320, height: 40, eager: true })}</a><span class="section-kicker">Microsoft identity</span><h1>Completing secure sign-in</h1><p>Your verified Microsoft identity is being matched to an approved NovaPharm role.</p><div class="alert" data-entra-status role="status" aria-live="polite">Checking authorised access...</div><a class="btn btn-outline" href="/portal/">Return to portal login</a></main><script src="/assets/js/api-client.js" defer></script><script src="/assets/js/entra-complete.js" defer></script></body></html>`;
}

function passwordChangePage() {
  return `<!DOCTYPE html><html lang="en-GB" data-api-base="${apiBase}">${privateHead("Change Password | NovaPharm Secure Portal")}<body class="login-page"><main class="login-panel password-change-panel"><a class="login-logo" href="/portal/" aria-label="NovaPharm Healthcare secure portal">${brandPicture({ width: 320, height: 40, eager: true })}</a><span class="section-kicker">Identity protection</span><h1>Create your permanent password</h1><p>Your temporary bootstrap credential must be replaced before confidential board or administrator information is available.</p><form class="form-grid" data-password-change-form novalidate><div class="field"><label for="currentPassword">Current temporary password</label><input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required></div><div class="field"><label for="newPassword">New password</label><input id="newPassword" name="newPassword" type="password" autocomplete="new-password" minlength="14" aria-describedby="password-requirements" required><p class="field-help" id="password-requirements">Use at least 14 characters and a strong mix of character types. Do not use names, company terms, common phrases or a previously exposed password.</p></div><div class="field"><label for="confirmation">Confirm new password</label><input id="confirmation" name="confirmation" type="password" autocomplete="new-password" minlength="14" required></div><button class="btn btn-primary" type="submit">Change password securely</button><div class="alert" data-password-status role="status" aria-live="polite">Changing the password invalidates all other sessions for this identity.</div></form><button class="inline-link-button portal-cookie-settings" type="button" data-cookie-settings>Cookie settings</button></main><script src="/assets/js/api-client.js" defer></script><script src="/assets/js/password-change.js" defer></script></body></html>`;
}

const customerNavigation = [
  ["dashboard", "Dashboard"], ["account", "My Account"], ["orders", "My Orders"], ["invoices", "My Invoices"], ["statements", "My Statements"],
  ["products", "My Products"], ["price-lists", "Price Lists"], ["stock-availability", "Stock Availability"], ["order-tracking", "Order Tracking"],
  ["delivery-tracking", "Delivery Tracking"], ["returns", "Returns"], ["quality-complaints", "Quality Complaints"], ["documents", "Documents"],
  ["support", "Support Tickets"], ["regulatory-documents", "Regulatory Documents"], ["downloads", "Downloads"], ["analytics", "Analytics"], ["settings", "Settings"]
];

const employeeNavigation = [
  ["dashboard", "Dashboard"], ["customers", "Customers"], ["suppliers", "Suppliers"], ["products", "Products"], ["orders", "Orders"],
  ["warehouse", "Warehouse"], ["purchasing", "Purchasing"], ["finance", "Finance"], ["quality", "Quality"], ["regulatory", "Regulatory"],
  ["crm", "CRM"], ["reports", "Reports"], ["administration", "Administration"]
];

function applicationShell({ area, page, title, body, navigation }) {
  const root = area === "Customer Portal" ? "/portal" : "/employee";
  const moduleArea = area === "Customer Portal" ? "customer" : "employee";
  const links = navigation.map(([slug, label]) => `<a href="${root}/${slug}/"${page === slug ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const crossLinks = area === "Employee Portal" ? '<a href="/portal/executive-platform/">Board Portal</a><a href="/admin/dashboard/">Admin Portal</a>' : "";
  return `<!DOCTYPE html><html lang="en-GB" data-api-base="${apiBase}">${privateHead(`${title} | NovaPharm ${area}`)}<body data-enterprise-page="${page}" data-enterprise-module="${moduleArea}.${page}"><div class="portal-shell"><aside class="portal-sidebar"><a class="portal-brand" href="${root}/dashboard/" aria-label="${area} dashboard">${brandPicture({ width: 224, height: 28, eager: true })}</a><nav aria-label="${area} navigation">${links}${crossLinks}<button class="btn btn-outline" type="button" data-logout>Logout</button><button class="inline-link-button portal-cookie-settings" type="button" data-cookie-settings>Cookie settings</button></nav></aside><main class="portal-main"><div class="portal-topbar"><div class="portal-title"><span class="eyebrow">${area}</span><h1>${title}</h1></div><div class="portal-search"><label for="portal-search-${moduleArea}">Search authorised records</label><input id="portal-search-${moduleArea}" type="search" data-enterprise-search autocomplete="off" placeholder="Reference, company or product"><div class="portal-search-results" data-enterprise-search-results hidden></div></div><span class="status-pill">Signed in as <span data-user-name></span></span></div>${body}</main></div><script src="/assets/js/api-client.js" defer></script><script src="/assets/js/portal-app.js" defer></script><script src="/assets/js/enterprise-app.js" defer></script></body></html>`;
}

function customerPage(page, title, body) {
  return applicationShell({ area: "Customer Portal", page, title, body, navigation: customerNavigation });
}

function employeePage(page, title, body) {
  return applicationShell({ area: "Employee Portal", page, title, body, navigation: employeeNavigation });
}

function moduleWorkspace(purpose, command = "") {
  return `${command}<section class="enterprise-workspace" data-enterprise-workspace aria-busy="true"><div class="enterprise-intro"><p>${purpose}</p><span class="maturity-tag" data-module-state>Loading</span></div><div class="enterprise-notices" data-module-notices role="status" aria-live="polite"></div><div class="metric-row enterprise-metrics" data-module-metrics></div><div class="enterprise-actions" data-module-actions></div><div class="enterprise-sections" data-module-sections></div><p class="data-freshness">Updated <span data-module-freshness>-</span></p></section><div class="alert" data-workflow-status role="status" aria-live="polite" hidden></div>`;
}

const customerPurpose = new Map(customerModules.map((item) => [item.slug, item.purpose]));
const employeePurpose = new Map(employeeModules.map((item) => [item.slug, item.purpose]));

function customerCommand(slug) {
  if (slug === "orders") return `<section class="portal-command"><div class="section-heading-row"><div><span class="eyebrow">Controlled order entry</span><h2>Place an order</h2></div></div><form class="form-grid compact-form" data-customer-order-form><div class="form-row"><div class="field"><label for="customerOrderProduct">Authorised product</label><select id="customerOrderProduct" name="productId" required></select></div><div class="field"><label for="customerOrderQuantity">Quantity</label><input id="customerOrderQuantity" name="quantity" type="number" min="1" required></div></div><div class="form-row"><div class="field"><label for="customerOrderPo">Purchase-order reference</label><input id="customerOrderPo" name="customerPoReference" maxlength="120"></div><div class="field"><label for="customerOrderDate">Requested delivery</label><input id="customerOrderDate" name="requestedDeliveryDate" type="date"></div></div><button class="btn btn-primary" type="submit">Submit order</button></form></section>`;
  if (slug === "support") return `<section class="portal-command"><div class="section-heading-row"><div><span class="eyebrow">Account support</span><h2>Open a support ticket</h2></div></div><form class="form-grid compact-form" data-support-form><div class="form-row"><div class="field"><label for="supportCategory">Category</label><select id="supportCategory" name="category"><option value="account">Account</option><option value="order">Order</option><option value="delivery">Delivery</option><option value="documents">Documents</option></select></div><div class="field"><label for="supportPriority">Priority</label><select id="supportPriority" name="priority"><option value="normal">Normal</option><option value="high">High</option></select></div></div><div class="field"><label for="supportSubject">Subject</label><input id="supportSubject" name="subject" maxlength="200" required></div><div class="field"><label for="supportDescription">Description</label><textarea id="supportDescription" name="description" rows="4" maxlength="2000" required></textarea></div><button class="btn btn-primary" type="submit">Create ticket</button></form></section>`;
  if (slug === "returns") return `<section class="portal-command"><div class="section-heading-row"><div><span class="eyebrow">Controlled returns</span><h2>Request a return</h2></div></div><form class="form-grid compact-form" data-return-form><div class="field"><label for="returnOrderLine">Delivered order line</label><select id="returnOrderLine" name="orderLine" data-return-options required></select></div><div class="form-row"><div class="field"><label for="returnQuantity">Quantity</label><input id="returnQuantity" name="quantity" type="number" min="1" required></div><div class="field"><label for="returnReason">Reason</label><select id="returnReason" name="reasonCode"><option value="packaging_observation">Packaging observation</option><option value="delivery_damage">Delivery damage</option><option value="ordering_error">Ordering error</option><option value="other">Other</option></select></div></div><button class="btn btn-primary" type="submit">Submit return request</button></form></section>`;
  if (slug === "quality-complaints") return `<section class="portal-command"><div class="section-heading-row"><div><span class="eyebrow">Quality case</span><h2>Open a quality complaint</h2></div></div><form class="form-grid compact-form" data-quality-form><div class="field"><label for="qualityOrderProduct">Order and product</label><select id="qualityOrderProduct" name="orderProduct" data-quality-options required></select></div><div class="field"><label for="qualityDescription">Quality observation</label><textarea id="qualityDescription" name="description" rows="5" maxlength="2000" required></textarea><p class="field-help">Do not include patient information, adverse events or urgent medical information.</p></div><button class="btn btn-primary" type="submit">Open quality complaint</button></form></section>`;
  return "";
}

function employeeCommand(slug) {
  if (slug === "suppliers") return `<section class="portal-command"><div class="section-heading-row"><div><span class="eyebrow">Supplier onboarding</span><h2>Create prospect supplier</h2></div></div><form class="form-grid compact-form" data-supplier-form><div class="form-row"><div class="field"><label for="supplierLegalName">Legal name</label><input id="supplierLegalName" name="legalName" required></div><div class="field"><label for="supplierType">Supplier type</label><select id="supplierType" name="supplierType" required><option value="manufacturer">Manufacturer</option><option value="wholesaler">Wholesaler</option><option value="service_provider">Service provider</option></select></div></div><div class="field"><label for="supplierCompanyNumber">Company number</label><input id="supplierCompanyNumber" name="companyNumber"></div><button class="btn btn-primary" type="submit">Create supplier prospect</button></form></section>`;
  if (slug === "products") return `<section class="portal-command"><div class="section-heading-row"><div><span class="eyebrow">Product onboarding</span><h2>Create draft product</h2></div></div><form class="form-grid compact-form" data-product-form><div class="form-row"><div class="field"><label for="sku">SKU</label><input id="sku" name="sku" required></div><div class="field"><label for="productName">Product name</label><input id="productName" name="productName" required></div></div><div class="form-row"><div class="field"><label for="strength">Strength</label><input id="strength" name="strength"></div><div class="field"><label for="packSize">Pack size</label><input id="packSize" name="packSize"></div></div><div class="form-row"><div class="field"><label for="manufacturer">Manufacturer</label><input id="manufacturer" name="manufacturer"></div><div class="field"><label for="listPrice">Internal list price GBP</label><input id="listPrice" name="listPrice" type="number" min="0" step="0.01" required></div></div><button class="btn btn-primary" type="submit">Create draft product</button><p class="field-help">Regulatory, marketing and lifecycle states begin in controlled draft status.</p></form></section>`;
  if (slug === "orders") return `<section class="portal-command"><div class="section-heading-row"><div><span class="eyebrow">Telesales</span><h2>Create order</h2></div></div><form class="form-grid compact-form" data-order-form><div class="form-row"><div class="field"><label for="orderCustomer">Customer</label><select id="orderCustomer" name="customerId" required></select></div><div class="field"><label for="orderProduct">Product</label><select id="orderProduct" name="productId" required></select></div></div><div class="form-row"><div class="field"><label for="orderQuantity">Quantity</label><input id="orderQuantity" name="quantity" type="number" min="1" required></div><div class="field"><label for="customerPoReference">Customer PO reference</label><input id="customerPoReference" name="customerPoReference"></div></div><div class="field"><label for="requestedDeliveryDate">Requested delivery</label><input id="requestedDeliveryDate" name="requestedDeliveryDate" type="date"></div><button class="btn btn-primary" type="submit">Create order</button></form></section>`;
  if (slug === "purchasing") return `<section class="portal-command"><div class="section-heading-row"><div><span class="eyebrow">Procure to pay</span><h2>Raise purchase order</h2></div></div><form class="form-grid compact-form" data-po-form><div class="form-row"><div class="field"><label for="poSupplier">Qualified supplier</label><select id="poSupplier" name="supplierId" required></select></div><div class="field"><label for="poProduct">Product</label><select id="poProduct" name="productId" required></select></div></div><div class="form-row"><div class="field"><label for="poQuantity">Quantity</label><input id="poQuantity" name="quantity" type="number" min="1" required></div><div class="field"><label for="unitCost">Unit cost GBP</label><input id="unitCost" name="unitCost" type="number" min="0" step="0.01" required></div></div><div class="field"><label for="expectedDate">Expected date</label><input id="expectedDate" name="expectedDate" type="date"></div><button class="btn btn-primary" type="submit">Submit purchase order</button></form></section>`;
  return "";
}

function table(headers, bodyAttribute) {
  return `<div class="table-wrap" role="region" aria-label="Portal data table" tabindex="0"><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody ${bodyAttribute}></tbody></table></div>`;
}

const executiveModules = [
  { title: "Command Centre", file: "NP_Hub.html", summary: "Cross-functional operating status, source readiness and controlled integration events.", metrics: ["customers", "products", "openOrders", "pendingSyncEvents"] },
  { title: "CEO Dashboard", file: "NP_CEO.html", summary: "A governed executive view of operational readiness without simulated commercial performance.", metrics: ["customers", "products", "openOrders", "pendingApplications", "pendingSyncEvents"] },
  { title: "Sales Intelligence", file: "NP_Sales.html", summary: "Customer and order indicators from the canonical application database.", metrics: ["customers", "openOrders"] },
  { title: "Customer Analytics", file: "NP_Customers.html", summary: "Account and application indicators subject to role and customer-isolation controls.", metrics: ["customers", "pendingApplications"] },
  { title: "Product Master", file: "NP_Products.html", summary: "Product-master readiness and lifecycle records; availability is never inferred.", metrics: ["products"] },
  { title: "NHS Data", file: "NP_NHS_Data.html", summary: "A controlled integration boundary for licensed data sources. No NHS supply relationship is implied.", maturity: "Planned" },
  { title: "PLPI", file: "NP_PLPI.html", summary: "A governance workspace for future parallel-import licensing activity, subject to authorisation.", maturity: "Planned" },
  { title: "Pharmacovigilance", file: "NP_PV.html", summary: "A controlled interface boundary for an approved safety system and qualified process.", maturity: "In development" },
  { title: "Sourcing", file: "NP_Sourcing.html", summary: "Supplier qualification and sourcing evidence linked to canonical supplier records.", maturity: "In development" },
  { title: "Tenders", file: "NP_Tenders.html", summary: "Tender tracking architecture for approved opportunities; no award or NHS supply is implied.", maturity: "Planned" },
  { title: "Warehouse", file: "NP_Warehouse.html", summary: "Integration readiness for a qualified third-party warehouse; NovaPharm-owned warehousing is not claimed.", maturity: "Planned" },
  { title: "Service Levels", file: "NP_SLA.html", summary: "Future service-level monitoring against approved operational source systems.", maturity: "Planned" },
  { title: "Finance", file: "NP_Finance.html", summary: "A controlled boundary for future accounting integration and authorised financial records.", maturity: "Planned" },
  { title: "Capital", file: "NP_Capital.html", summary: "Restricted governance for approved capital planning; no forecasts are published here.", maturity: "Planned" },
  { title: "Microsoft 365", file: "NP_M365.html", summary: "Microsoft Graph and SharePoint integration health under least-privilege access.", maturity: "In development" },
  { title: "Documents", file: "NP_Documents.html", summary: "Controlled document links, metadata and synchronisation status without public file exposure.", maturity: "In development" },
  { title: "AI & Technology", file: "NP_AI_Tech.html", summary: "A governed technology roadmap. Automated decision-making is not presented as operational.", maturity: "Planned" },
  { title: "Traceability", file: "NP_Blockchain.html", summary: "A future traceability architecture; blockchain capability is not presented as deployed.", maturity: "Planned" }
];

const executiveModuleCode = Object.freeze({
  "NP_Hub.html": "executive.command-centre",
  "NP_CEO.html": "executive.ceo-dashboard",
  "NP_Sales.html": "executive.sales-intelligence",
  "NP_Customers.html": "executive.customer-analytics",
  "NP_Products.html": "executive.product-master",
  "NP_NHS_Data.html": "executive.nhs-data",
  "NP_PLPI.html": "executive.plpi",
  "NP_PV.html": "executive.pharmacovigilance",
  "NP_Sourcing.html": "executive.sourcing",
  "NP_Tenders.html": "executive.tenders",
  "NP_Warehouse.html": "executive.warehouse",
  "NP_SLA.html": "executive.service-levels",
  "NP_Finance.html": "executive.finance",
  "NP_Capital.html": "executive.capital",
  "NP_M365.html": "executive.microsoft-365",
  "NP_Documents.html": "executive.documents",
  "NP_AI_Tech.html": "executive.ai-technology",
  "NP_Blockchain.html": "executive.traceability"
});

function executiveHref(module) {
  return module.file === "NP_CEO.html" ? "/portal/ceo-dashboard/" : `/portal/executive-platform/${module.file}`;
}

function executiveIndex() {
  return `<!DOCTYPE html><html lang="en-GB" data-api-base="${apiBase}">${privateHead("Executive Platform | NovaPharm Healthcare")}<body><main class="portal-main executive-index"><a class="executive-brand" href="/portal/executive-platform/" aria-label="NovaPharm Healthcare Executive Platform">${brandPicture({ width: 320, height: 40, eager: true })}</a><div class="portal-topbar"><div><span class="eyebrow">Board workspace</span><h1>NovaPharm Executive Platform</h1></div><div class="portal-actions"><span class="status-pill">Signed in as <span data-user-name></span></span><button class="btn btn-outline" type="button" data-logout>Logout</button><button class="inline-link-button portal-cookie-settings" type="button" data-cookie-settings>Cookie settings</button></div></div><p class="executive-intro">Controlled executive modules share one authenticated data boundary. Live values come from the canonical database; unavailable integrations are stated rather than simulated.</p><div class="grid grid-3">${executiveModules.map((module) => `<a class="card" href="${executiveHref(module)}"><span class="maturity-tag">${module.maturity || "Live foundation"}</span><h2>${module.title}</h2><p>${module.summary}</p></a>`).join("")}</div></main><script src="/assets/js/api-client.js" defer></script><script src="/assets/js/portal-app.js" defer></script></body></html>`;
}

function executiveModulePage(module) {
  return `<!DOCTYPE html><html lang="en-GB" data-api-base="${apiBase}">${privateHead(`${module.title} | NovaPharm Executive Platform`)}<body data-executive-module="${module.file}" data-enterprise-module="${executiveModuleCode[module.file]}"><main class="portal-main executive-module"><a class="executive-brand" href="/portal/executive-platform/" aria-label="NovaPharm Healthcare Executive Platform home">${brandPicture({ width: 320, height: 40, eager: true })}</a><div class="portal-topbar"><div><span class="eyebrow">Board workspace</span><h1>${module.title}</h1></div><div class="portal-actions"><span class="status-pill">Signed in as <span data-user-name></span></span><a class="btn btn-outline" href="/portal/executive-platform/">All modules</a><button class="btn btn-outline" type="button" data-logout>Logout</button></div></div><div class="executive-module-summary"><div><span class="maturity-tag">${module.maturity || "Live foundation"}</span><p>${module.summary}</p></div></div>${moduleWorkspace("Canonical executive evidence, explicit source state and read-only board reporting.")}<button class="inline-link-button portal-cookie-settings" type="button" data-cookie-settings>Cookie settings</button></main><script src="/assets/js/api-client.js" defer></script><script src="/assets/js/portal-app.js" defer></script><script src="/assets/js/enterprise-app.js" defer></script></body></html>`;
}

write("portal/index.html", loginPage());
write("entra-complete/index.html", entraCompletePage());
writeProtected("portal/change-password/index.html", passwordChangePage(), "customer");
write(join(secureRoot, "executive-platform/index.html"), executiveIndex());
for (const module of executiveModules) {
  write(join(secureRoot, `executive-platform/${module.file}`), executiveModulePage(module));
}
write("portal/executive-platform/index.html", lockedPage("board"));
write("portal/ceo-dashboard/index.html", lockedPage("board"));

writeProtected("portal/dashboard/index.html", customerPage("dashboard", "Customer Dashboard", moduleWorkspace(customerPurpose.get("dashboard"))), "customer");

const customerInformationPages = {
  account: ["My Account", "Account identity, credit terms, addresses and approved contacts come from the canonical customer record."],
  invoices: ["My Invoices", "Invoices appear after an approved finance provider posts them against canonical customer and order IDs."],
  statements: ["My Statements", "Statements are generated from posted invoices and payments and linked to controlled documents."],
  "price-lists": ["Price Lists", "Only current, account-authorised contract and standard price lists are displayed."],
  "stock-availability": ["Stock Availability", "Released batch availability and lead times depend on a validated warehouse feed."],
  "order-tracking": ["Order Tracking", "Orders progress through submitted, confirmed, allocated, dispatched, delivered and invoiced states."],
  "delivery-tracking": ["Delivery Tracking", "Carrier tracking and proof of delivery require an approved logistics integration contract."],
  returns: ["Returns", "Return requests link to the original order, product, batch and quality workflow."],
  "quality-complaints": ["Quality Complaints", "Quality complaints create governed quality records and controlled case files."],
  support: ["Support Tickets", "Support tickets retain order and product relationships with SLA ownership."],
  "regulatory-documents": ["Regulatory Documents", "Only approved, effective and account-authorised regulatory files are available."],
  analytics: ["Customer Analytics", "Spend, product mix and fulfilment metrics render from customer-scoped governed views."],
  settings: ["Settings", "Account preferences, contacts, notifications and identity controls remain linked to the canonical user."],
  documents: ["Documents", "Controlled files are retrieved from SharePoint through canonical document links and role scope."],
  downloads: ["Downloads", "Approved catalogues, account files and regulatory documents are available by permission."]
};

for (const [slug, [title, description]] of Object.entries(customerInformationPages)) {
  writeProtected(`portal/${slug}/index.html`, customerPage(slug, title, moduleWorkspace(customerPurpose.get(slug) || description, customerCommand(slug))), "customer");
}
writeProtected("portal/orders/index.html", customerPage("orders", "My Orders", moduleWorkspace(customerPurpose.get("orders"), customerCommand("orders"))), "customer");
writeProtected("portal/products/index.html", customerPage("products", "My Products", moduleWorkspace(customerPurpose.get("products"))), "customer");

writeProtected("employee/dashboard/index.html", employeePage("dashboard", "Operations Dashboard", moduleWorkspace(employeePurpose.get("dashboard"))), "employee");
writeProtected("employee/customers/index.html", employeePage("customers", "Customers", moduleWorkspace(employeePurpose.get("customers"))), "employee");
writeProtected("employee/suppliers/index.html", employeePage("suppliers", "Suppliers", moduleWorkspace(employeePurpose.get("suppliers"), employeeCommand("suppliers"))), "employee");
writeProtected("employee/products/index.html", employeePage("products", "Product Master", moduleWorkspace(employeePurpose.get("products"), employeeCommand("products"))), "employee");
writeProtected("employee/orders/index.html", employeePage("orders", "Telesales Orders", moduleWorkspace(employeePurpose.get("orders"), employeeCommand("orders"))), "employee");
writeProtected("employee/purchasing/index.html", employeePage("purchasing", "Purchase Orders", moduleWorkspace(employeePurpose.get("purchasing"), employeeCommand("purchasing"))), "employee");

for (const [slug, title] of [["warehouse", "Warehouse"], ["finance", "Finance"], ["quality", "Quality"], ["regulatory", "Regulatory"], ["crm", "CRM"], ["reports", "Reports"], ["administration", "Administration"]]) {
  writeProtected(`employee/${slug}/index.html`, employeePage(slug, title, moduleWorkspace(employeePurpose.get(slug))), "employee");
}

const adminNavigation = [["dashboard", "Dashboard"], ["local-review", "Owner Review"], ["users", "Users"], ["content", "Content"], ["analytics", "Analytics"]];
function adminPage(page, title, body) {
  const links = adminNavigation.map(([slug, label]) => `<a href="/admin/${slug}/"${page === slug ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  return `<!DOCTYPE html><html lang="en-GB" data-api-base="${apiBase}">${privateHead(`${title} | NovaPharm Admin`)}<body data-enterprise-module="admin.${page}"><div class="portal-shell"><aside class="portal-sidebar"><a class="portal-brand" href="/admin/dashboard/" aria-label="Administrator portal dashboard">${brandPicture({ width: 224, height: 28, eager: true })}</a><nav aria-label="Admin navigation">${links}<a href="/employee/dashboard/">Employee Portal</a><button class="btn btn-outline" type="button" data-logout>Logout</button><button class="inline-link-button portal-cookie-settings" type="button" data-cookie-settings>Cookie settings</button></nav></aside><main class="portal-main"><div class="portal-topbar"><div><span class="eyebrow">Administration</span><h1>${title}</h1></div><div class="portal-search"><label for="portal-search-admin">Search authorised records</label><input id="portal-search-admin" type="search" data-enterprise-search autocomplete="off" placeholder="Reference, company or product"><div class="portal-search-results" data-enterprise-search-results hidden></div></div><span class="status-pill">Canonical data</span></div>${body}</main></div><script src="/assets/js/api-client.js" defer></script><script src="/assets/js/portal-app.js" defer></script><script src="/assets/js/admin-app.js" defer></script><script src="/assets/js/enterprise-app.js" defer></script></body></html>`;
}

writeProtected("admin/index.html", '<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=/admin/dashboard/"><meta name="robots" content="noindex,nofollow"><title>Admin | NovaPharm</title></head><body><a href="/admin/dashboard/">Continue</a></body></html>', "admin");
writeProtected("admin/dashboard/index.html", adminPage("dashboard", "Admin Dashboard", `<div class="metric-row"><div class="metric"><strong data-admin-metric="leads">0</strong><span>Lead submissions</span></div><div class="metric"><strong data-admin-metric="customers">0</strong><span>Customers</span></div><div class="metric"><strong data-admin-metric="openOrders">0</strong><span>Open orders</span></div><div class="metric"><strong data-admin-metric="pendingSyncEvents">0</strong><span>Integration events</span></div><div class="metric"><strong data-admin-metric="emailDeliveryAttention">0</strong><span>Email deliveries requiring attention</span></div></div><section class="section-tight" id="lead-review"><h2>Lead tracking</h2>${table(["Reference", "Company", "Type", "Delivery", "Created", "Review"], "data-leads")}</section><section class="section-tight" id="application-review"><h2>Account applications</h2>${table(["Application", "Status", "Documents", "Submitted", "Review"], "data-applications")}</section><section class="section-tight admin-review-panel" data-admin-detail hidden><div class="section-heading-row"><div><span class="eyebrow">Controlled review</span><h2 data-admin-detail-title>Record detail</h2></div><button class="btn btn-outline" type="button" data-admin-detail-close>Close</button></div><div data-admin-detail-body></div><form class="form-grid compact-form" data-application-status-form hidden><input type="hidden" name="applicationId"><div class="form-row"><div class="field"><label for="applicationStatus">Next status</label><select id="applicationStatus" name="status" required><option value="under_initial_review">Under initial review</option><option value="compliance_review">Compliance review</option><option value="credit_review">Credit review</option><option value="information_requested">Information requested</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="withdrawn">Withdrawn</option></select></div><div class="field"><label for="applicationReason">Review note</label><input id="applicationReason" name="reason" maxlength="1000"></div></div><div class="portal-actions"><button class="btn btn-primary" type="submit">Update status</button><button class="btn btn-outline" type="button" data-activate-customer>Activate approved customer</button></div><p class="alert" data-admin-action-status role="status" aria-live="polite">Every action is authorised server-side and added to the immutable history.</p></form></section><section class="section-tight" id="notification-queue"><div class="section-heading-row"><div><span class="eyebrow">Transactional email</span><h2>Delivery queue</h2></div><button class="btn btn-outline" type="button" data-email-retry>Process due email</button></div><p class="alert" data-email-retry-status role="status" aria-live="polite">In the local owner environment, email is captured here and never sent externally. Retryable and blocked synthetic states can be replayed safely.</p>${table(["Template", "Entity", "Status", "Attempts", "Created", "Actions"], "data-email-deliveries")}</section><dialog class="email-preview-panel" data-email-preview><div class="email-preview-header"><div><span class="eyebrow">Local email capture</span><h2 data-email-preview-title>Email preview</h2></div><button class="btn btn-outline" type="button" data-email-preview-close>Close</button></div><div class="email-preview-body"><div data-email-preview-meta></div><h3>Rendered HTML</h3><div class="email-preview-frame" data-email-preview-html aria-label="Rendered local email preview"></div><h3>Plain text</h3><pre class="email-preview-text" data-email-preview-text></pre></div></dialog>`), "admin");
writeProtected("admin/users/index.html", adminPage("users", "User Management", `<div class="grid grid-3"><article class="card"><h2>Identity source</h2><p>Microsoft Entra identities and controlled validation identities link to the canonical user table.</p></article><article class="card"><h2>Active sessions</h2><p><strong data-admin-metric="activeSessions">0</strong> persistent sessions currently active.</p></article><article class="card"><h2>Role scopes</h2><p>Customer, employee, board and administrator access is enforced server-side.</p></article></div><section class="section-tight"><h2>Revoke user sessions</h2><form class="form-grid compact-form" data-session-revoke-form><div class="field"><label for="revokeUsername">Exact portal username</label><input id="revokeUsername" name="username" autocomplete="off" required></div><button class="btn btn-primary" type="submit">Revoke active sessions</button><p class="alert" data-session-revoke-status role="status" aria-live="polite">Use this control after a security event, role change or account suspension.</p></form></section>`), "admin");
writeProtected("admin/content/index.html", adminPage("content", "Content Management", moduleWorkspace("Controlled catalogue imports, workflows and content-governance events.")), "admin");
writeProtected("admin/analytics/index.html", adminPage("analytics", "Analytics", moduleWorkspace("Platform migrations, workflow state, outbox status and security evidence.")), "admin");

function reviewCards(items) {
  return `<div class="owner-review-grid">${items.map(([label, href, status, note]) => `<a class="owner-review-item" href="${href}"><span class="maturity-tag">${status}</span><strong>${label}</strong><small>${note}</small></a>`).join("")}</div>`;
}

const customerReview = customerNavigation.map(([slug, label]) => [label, `/portal/${slug}/`, ["dashboard", "orders", "products"].includes(slug) ? "Operational foundation" : "Source-controlled", slug === "dashboard" ? "Synthetic account metrics and recent orders." : "Uses the canonical customer boundary; unavailable external records are stated."]);
const employeeReview = employeeNavigation.map(([slug, label]) => [label, `/employee/${slug}/`, ["dashboard", "customers", "suppliers", "products", "orders", "purchasing"].includes(slug) ? "Operational foundation" : "In development", "Shared SQL records and server-side employee scope; external source gaps are explicit."]);
const executiveReview = executiveModules.map((module) => [module.title, executiveHref(module), module.maturity || "Operational foundation", module.summary]);
const administratorReview = [
  ["Dashboard", "/admin/dashboard/", "Operational foundation", "Canonical counts, owner controls and controlled record review."],
  ["Lead detail", "/admin/dashboard/#lead-review", "Synthetic validation", "Contact submissions, consent evidence and message detail."],
  ["Application detail", "/admin/dashboard/#application-review", "Operational foundation", "Four-step applications, documents and immutable status history."],
  ["Document states", "/admin/dashboard/#application-review", "Synthetic validation", "Quarantine and clean-test labels; not production malware scanning."],
  ["Notification queue", "/admin/dashboard/#notification-queue", "Local capture", "Rendered HTML and text previews, sent, retrying, blocked and replay states."],
  ["Audit reporting", "/admin/dashboard/", "Operational foundation", "Immutable audit and security records remain in the local SQL store."],
  ["Account activation", "/admin/dashboard/#application-review", "Controlled workflow", "Approved synthetic applications can be activated without creating a password."],
  ["Sessions", "/admin/users/", "Operational foundation", "Active-session count and administrator revocation control."],
  ["Analytics", "/admin/analytics/", "Planned", "No production analytics or confidential portal tracking is enabled."],
  ["Content", "/admin/content/", "Repository governed", "Public content remains generated from the reviewed repository source." ]
];

writeProtected("admin/local-review/index.html", adminPage("local-review", "Owner Review Index", `<div class="owner-review-intro"><p>This index organises the exact NovaPharm application for local owner acceptance. All records are synthetic, every company name is marked TEST or DEMO, and external email, SharePoint, analytics and production services remain disabled.</p><div class="alert">This environment validates application behaviour only. It is not approved for pharmaceutical trading, live customer onboarding, confidential board distribution or production records.</div></div><section class="owner-review-group"><span class="eyebrow">Customer</span><h2>Customer portal</h2>${reviewCards(customerReview)}</section><section class="owner-review-group"><span class="eyebrow">Employee</span><h2>Employee portal</h2>${reviewCards(employeeReview)}</section><section class="owner-review-group"><span class="eyebrow">Board and executive</span><h2>Executive Platform</h2>${reviewCards(executiveReview)}</section><section class="owner-review-group"><span class="eyebrow">Administrator</span><h2>Administration</h2>${reviewCards(administratorReview)}</section>`), "admin");

buildPublicPages();
