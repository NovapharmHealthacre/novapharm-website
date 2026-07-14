import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildPublicPages } from "./build-public-pages.mjs";

const apiBase = process.env.PUBLIC_API_ORIGIN || "";
const secureRoot = process.env.SECURE_CONTENT_ROOT || "_secure";
const brandLogoSvg = "/assets/brand/novapharm-healthcare-logo.svg";
const brandLogoPng = "/assets/brand/novapharm-healthcare-logo.png";

function brandPicture({ className = "brand-logo", width = 280, height = 35, eager = false } = {}) {
  return `<picture class="${className}"><source srcset="${brandLogoSvg}" type="image/svg+xml"><img src="${brandLogoPng}" alt="NovaPharm Healthcare" width="${width}" height="${height}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></picture>`;
}

function privateHead(title) {
  return `<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><link rel="icon" href="${brandLogoSvg}" type="image/svg+xml"><link rel="stylesheet" href="/assets/css/novapharm.css"><script type="module" src="/assets/js/cookie-consent.js"></script></head>`;
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
  const links = navigation.map(([slug, label]) => `<a href="${root}/${slug}/"${page === slug ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const crossLinks = area === "Employee Portal" ? '<a href="/portal/executive-platform/">Board Portal</a><a href="/admin/dashboard/">Administration</a>' : "";
  return `<!DOCTYPE html><html lang="en-GB" data-api-base="${apiBase}">${privateHead(`${title} | NovaPharm ${area}`)}<body data-enterprise-page="${page}"><div class="portal-shell"><aside class="portal-sidebar"><a class="portal-brand" href="${root}/dashboard/" aria-label="${area} dashboard">${brandPicture({ width: 224, height: 28, eager: true })}</a><nav aria-label="${area} navigation">${links}${crossLinks}<button class="btn btn-outline" type="button" data-logout>Logout</button><button class="inline-link-button portal-cookie-settings" type="button" data-cookie-settings>Cookie settings</button></nav></aside><main class="portal-main"><div class="portal-topbar"><div><span class="eyebrow">${area}</span><h1>${title}</h1></div><span class="status-pill">Signed in as <span data-user-name></span></span></div>${body}</main></div><script src="/assets/js/api-client.js" defer></script><script src="/assets/js/portal-app.js" defer></script><script src="/assets/js/enterprise-app.js" defer></script></body></html>`;
}

function customerPage(page, title, body) {
  return applicationShell({ area: "Customer Portal", page, title, body, navigation: customerNavigation });
}

function employeePage(page, title, body) {
  return applicationShell({ area: "Employee Portal", page, title, body, navigation: employeeNavigation });
}

function table(headers, bodyAttribute) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody ${bodyAttribute}></tbody></table></div>`;
}

const orderTable = table(["Order", "Account", "Status", "Total", "PO reference", "Created"], "data-order-rows");
const productTable = table(["SKU", "Product", "Strength", "Pack", "Price", "Stock", "MHRA", "Status"], "data-product-rows");

function executiveIndex() {
  const modules = [
    ["Command Centre", "NP_Hub.html"], ["CEO Dashboard", "NP_CEO.html"], ["Sales Intelligence", "NP_Sales.html"], ["Customer Analytics", "NP_Customers.html"],
    ["Product Master", "NP_Products.html"], ["NHS Data", "NP_NHS_Data.html"], ["PLPI", "NP_PLPI.html"], ["Pharmacovigilance", "NP_PV.html"],
    ["Sourcing", "NP_Sourcing.html"], ["Tenders", "NP_Tenders.html"], ["Warehouse", "NP_Warehouse.html"], ["Service Levels", "NP_SLA.html"],
    ["Finance", "NP_Finance.html"], ["Capital", "NP_Capital.html"], ["Microsoft 365", "NP_M365.html"], ["Documents", "NP_Documents.html"],
    ["AI & Technology", "NP_AI_Tech.html"], ["Traceability", "NP_Blockchain.html"]
  ];
  return `<!DOCTYPE html><html lang="en-GB">${privateHead("Executive Platform | NovaPharm Healthcare")}<body><main class="portal-main executive-index"><a class="executive-brand" href="/portal/executive-platform/" aria-label="NovaPharm Healthcare Executive Platform">${brandPicture({ width: 320, height: 40, eager: true })}</a><div class="portal-topbar"><div><span class="eyebrow">Board workspace</span><h1>NovaPharm Executive Platform</h1></div><div><a class="btn btn-outline" href="/portal/" data-logout>Logout</a><button class="inline-link-button portal-cookie-settings" type="button" data-cookie-settings>Cookie settings</button></div></div><div class="grid grid-3">${modules.map(([label, href]) => `<a class="card" href="${href}"><h2>${label}</h2><p>Open the controlled ${label.toLowerCase()} module.</p></a>`).join("")}</div></main><script src="/assets/js/api-client.js" defer></script><script src="/assets/js/portal-app.js" defer></script></body></html>`;
}

write("portal/index.html", loginPage());
write("entra-complete/index.html", entraCompletePage());
writeProtected("portal/change-password/index.html", passwordChangePage(), "customer");
write(join(secureRoot, "executive-platform/index.html"), executiveIndex());
write("portal/executive-platform/index.html", lockedPage("board"));
write("portal/ceo-dashboard/index.html", lockedPage("board"));

writeProtected("portal/dashboard/index.html", customerPage("dashboard", "Customer Dashboard", `<div class="metric-row"><div class="metric"><strong data-live-metric="accountNumber">-</strong><span>Account number</span></div><div class="metric"><strong data-live-metric="availableCredit">-</strong><span>Available credit</span></div><div class="metric"><strong data-live-metric="annualSpend">-</strong><span>Annual spend</span></div><div class="metric"><strong data-live-metric="invoicesDue">-</strong><span>Invoices due</span></div></div><section class="section-tight"><h2>Recent orders</h2>${orderTable}</section><p class="data-freshness">Data refreshed <span data-freshness>-</span></p>`), "customer");

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
  writeProtected(`portal/${slug}/index.html`, customerPage(slug, title, `<section class="section-tight"><h2>${title}</h2><p>${description}</p><div class="alert">No live records are available for this account. Values are never simulated.</div></section>`), "customer");
}
writeProtected("portal/orders/index.html", customerPage("orders", "My Orders", `<section class="section-tight"><h2>Orders</h2>${orderTable}</section><div class="alert" data-workflow-status>Customer ordering activates only for a signed-in identity linked to an approved account.</div>`), "customer");
writeProtected("portal/products/index.html", customerPage("products", "My Products", `<div class="field"><label for="productSearch">Search products</label><input id="productSearch" data-product-search placeholder="SKU, GTIN or product name"></div>${productTable}`), "customer");

writeProtected("employee/dashboard/index.html", employeePage("dashboard", "Operations Dashboard", `<div class="metric-row"><div class="metric"><strong data-live-metric="customers">0</strong><span>Active customers</span></div><div class="metric"><strong data-live-metric="products">0</strong><span>Active products</span></div><div class="metric"><strong data-live-metric="openOrders">0</strong><span>Open orders</span></div><div class="metric"><strong data-live-metric="pendingSyncEvents">0</strong><span>Integration events</span></div></div><section class="section-tight"><h2>Source readiness</h2>${table(["Source", "Status"], "data-source-status")}</section><p class="data-freshness">Data refreshed <span data-freshness>-</span></p>`), "employee");
writeProtected("employee/customers/index.html", employeePage("customers", "Customers", `${table(["Account", "Company", "Type", "Status", "Credit limit", "Outstanding"], "data-customer-rows")}<div class="alert" data-workflow-status>Customers originate from the approved account-application workflow.</div>`), "employee");
writeProtected("employee/suppliers/index.html", employeePage("suppliers", "Suppliers", `<form class="form-grid compact-form" data-supplier-form><div class="form-row"><div class="field"><label for="supplierLegalName">Legal name</label><input id="supplierLegalName" name="legalName" required></div><div class="field"><label for="supplierType">Supplier type</label><select id="supplierType" name="supplierType" required><option value="manufacturer">Manufacturer</option><option value="wholesaler">Wholesaler</option><option value="service_provider">Service provider</option></select></div></div><div class="form-row"><div class="field"><label for="qualificationStatus">Qualification</label><select id="qualificationStatus" name="qualificationStatus"><option value="prospect">Prospect</option><option value="conditional">Conditional</option><option value="approved">Approved</option></select></div><div class="field"><label for="supplierCompanyNumber">Company number</label><input id="supplierCompanyNumber" name="companyNumber"></div></div><button class="btn btn-primary" type="submit">Create supplier</button></form><div class="alert" data-workflow-status>Supplier records and folders share one canonical ID.</div>${table(["Supplier", "Company", "Type", "Qualification", "GDP", "GMP"], "data-supplier-rows")}`), "employee");
writeProtected("employee/products/index.html", employeePage("products", "Product Master", `<form class="form-grid compact-form" data-product-form><div class="form-row"><div class="field"><label for="sku">SKU</label><input id="sku" name="sku" required></div><div class="field"><label for="productName">Product name</label><input id="productName" name="productName" required></div></div><div class="form-row"><div class="field"><label for="strength">Strength</label><input id="strength" name="strength"></div><div class="field"><label for="packSize">Pack size</label><input id="packSize" name="packSize"></div></div><div class="form-row"><div class="field"><label for="manufacturer">Manufacturer</label><input id="manufacturer" name="manufacturer"></div><div class="field"><label for="listPrice">List price GBP</label><input id="listPrice" name="listPrice" type="number" min="0" step="0.01" required></div></div><div class="form-row"><div class="field"><label for="mhraStatus">MHRA status</label><select id="mhraStatus" name="mhraStatus"><option value="not_assessed">Not assessed</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="licensed">Licensed</option></select></div><div class="field"><label for="lifecycleStatus">Lifecycle</label><select id="lifecycleStatus" name="lifecycleStatus"><option value="draft">Draft</option><option value="approved">Approved</option><option value="active">Active</option></select></div></div><button class="btn btn-primary" type="submit">Create product</button></form><div class="alert" data-workflow-status>Only approved or active products enter ordering.</div>${productTable}`), "employee");
writeProtected("employee/orders/index.html", employeePage("orders", "Telesales Orders", `<form class="form-grid compact-form" data-order-form><div class="form-row"><div class="field"><label for="orderCustomer">Customer</label><select id="orderCustomer" name="customerId" required></select></div><div class="field"><label for="orderProduct">Product</label><select id="orderProduct" name="productId" required></select></div></div><div class="form-row"><div class="field"><label for="orderQuantity">Quantity</label><input id="orderQuantity" name="quantity" type="number" min="1" required></div><div class="field"><label for="customerPoReference">Customer PO reference</label><input id="customerPoReference" name="customerPoReference"></div></div><div class="field"><label for="requestedDeliveryDate">Requested delivery</label><input id="requestedDeliveryDate" name="requestedDeliveryDate" type="date"></div><button class="btn btn-primary" type="submit">Create order</button></form><div class="alert" data-workflow-status>Pricing, customer status and product sellability are validated server-side.</div>${orderTable}`), "employee");
writeProtected("employee/purchasing/index.html", employeePage("purchasing", "Purchase Orders", `<form class="form-grid compact-form" data-po-form><div class="form-row"><div class="field"><label for="poSupplier">Qualified supplier</label><select id="poSupplier" name="supplierId" required></select></div><div class="field"><label for="poProduct">Product</label><select id="poProduct" name="productId" required></select></div></div><div class="form-row"><div class="field"><label for="poQuantity">Quantity</label><input id="poQuantity" name="quantity" type="number" min="1" required></div><div class="field"><label for="unitCost">Unit cost GBP</label><input id="unitCost" name="unitCost" type="number" min="0" step="0.01" required></div></div><div class="field"><label for="expectedDate">Expected date</label><input id="expectedDate" name="expectedDate" type="date"></div><button class="btn btn-primary" type="submit">Submit purchase order</button></form><div class="alert" data-workflow-status>Only qualified suppliers can receive a purchase order.</div>${table(["PO", "Supplier", "Status", "Total", "Expected", "Created"], "data-po-rows")}`), "employee");

for (const [slug, title] of [["warehouse", "Warehouse"], ["finance", "Finance"], ["quality", "Quality"], ["regulatory", "Regulatory"], ["crm", "CRM"], ["reports", "Reports"], ["administration", "Administration"]]) {
  writeProtected(`employee/${slug}/index.html`, employeePage(slug, title, `<section class="section-tight"><h2>${title}</h2><p>This module reads and writes canonical records through shared domain APIs and the document outbox.</p><div class="alert">The approved external source is not configured. No operational values are simulated.</div></section>`), "employee");
}

const adminNavigation = [["dashboard", "Dashboard"], ["users", "Users"], ["content", "Content"], ["analytics", "Analytics"]];
function adminPage(page, title, body) {
  const links = adminNavigation.map(([slug, label]) => `<a href="/admin/${slug}/"${page === slug ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  return `<!DOCTYPE html><html lang="en-GB" data-api-base="${apiBase}">${privateHead(`${title} | NovaPharm Admin`)}<body><div class="portal-shell"><aside class="portal-sidebar"><a class="portal-brand" href="/admin/dashboard/" aria-label="Administrator portal dashboard">${brandPicture({ width: 224, height: 28, eager: true })}</a><nav aria-label="Admin navigation">${links}<a href="/employee/dashboard/">Employee Portal</a><button class="btn btn-outline" type="button" data-logout>Logout</button><button class="inline-link-button portal-cookie-settings" type="button" data-cookie-settings>Cookie settings</button></nav></aside><main class="portal-main"><div class="portal-topbar"><div><span class="eyebrow">Administration</span><h1>${title}</h1></div><span class="status-pill">Canonical data</span></div>${body}</main></div><script src="/assets/js/api-client.js" defer></script><script src="/assets/js/portal-app.js" defer></script><script src="/assets/js/admin-app.js" defer></script></body></html>`;
}

writeProtected("admin/index.html", '<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=/admin/dashboard/"><meta name="robots" content="noindex,nofollow"><title>Admin | NovaPharm</title></head><body><a href="/admin/dashboard/">Continue</a></body></html>', "admin");
writeProtected("admin/dashboard/index.html", adminPage("dashboard", "Admin Dashboard", `<div class="metric-row"><div class="metric"><strong data-admin-metric="leads">0</strong><span>Lead submissions</span></div><div class="metric"><strong data-admin-metric="customers">0</strong><span>Customers</span></div><div class="metric"><strong data-admin-metric="openOrders">0</strong><span>Open orders</span></div><div class="metric"><strong data-admin-metric="pendingSyncEvents">0</strong><span>Integration events</span></div></div><section class="section-tight"><h2>Lead tracking</h2>${table(["Name", "Company", "Type", "Created"], "data-leads")}</section>`), "admin");
writeProtected("admin/users/index.html", adminPage("users", "User Management", `<div class="grid grid-3"><article class="card"><h2>Identity source</h2><p>Hashed local identities are provisioned into the canonical user table. Entra ID is the planned production SSO provider.</p></article><article class="card"><h2>Active sessions</h2><p><strong data-admin-metric="activeSessions">0</strong> persistent sessions currently active.</p></article><article class="card"><h2>Role scopes</h2><p>Customer, employee, board and administrator access is enforced server-side.</p></article></div>`), "admin");
writeProtected("admin/content/index.html", adminPage("content", "Content Management", `<section class="section-tight"><h2>Governed content</h2><p>Public company, service, leadership and insight content is generated from structured repository sources. Controlled documents remain in SharePoint.</p></section>`), "admin");
writeProtected("admin/analytics/index.html", adminPage("analytics", "Analytics", `<section class="section-tight"><h2>Analytics readiness</h2><p>Operational metrics use canonical records. Search and web analytics activate only after consent, provider and privacy approval.</p></section>`), "admin");

buildPublicPages();
