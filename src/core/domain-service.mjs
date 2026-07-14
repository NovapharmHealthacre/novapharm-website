import { randomUUID } from "node:crypto";
import { allocateNumber, audit, enqueue, insertIgnore, nowIso, one, run, stableHash, transaction, all } from "../data/database.mjs";
import { sharePointFolderPath } from "./sharepoint-mapping.mjs";

function required(value, name) {
  const clean = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) throw Object.assign(new Error(`${name} is required.`), { statusCode: 400 });
  return clean;
}

const enquiryTypes = new Set([
  "Product opportunity",
  "Distribution partnership",
  "Pharmacy or wholesaler account",
  "CMO/CDMO partnership",
  "Regulatory services",
  "Supplier enquiry",
  "Media",
  "Careers",
  "General enquiry"
]);
const privacyNoticeVersion = "2026-07-14-v1.1";

function integer(value, name, minimum = 0) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) throw Object.assign(new Error(`${name} is invalid.`), { statusCode: 400 });
  return parsed;
}

function entityFolderEvent(entityType, entityId, businessNumber, displayName, actor) {
  return enqueue({
    eventType: `${entityType}.sharepoint_folder_requested`,
    aggregateType: entityType,
    aggregateId: entityId,
    destinationSystem: "sharepoint",
    idempotencyKey: `${entityType}:${entityId}:folder:v1`,
    payload: { operation: "ensure_entity_folder", entityType, entityId, businessNumber, displayName, actor }
  });
}

export async function listProducts(query = "", { customerVisibleOnly = false } = {}) {
  const term = `%${String(query).trim()}%`;
  return all(`
    SELECT p.*,
      COALESCE((SELECT SUM(b.quantity_available) FROM batches b WHERE b.product_id = p.id AND b.release_status = 'released'), 0) AS stock_available,
      (SELECT MIN(b.expiry_date) FROM batches b WHERE b.product_id = p.id AND b.release_status = 'released' AND b.quantity_available > 0) AS next_expiry
    FROM products p
    WHERE (? = 0 OR (p.lifecycle_status = 'active' AND p.marketing_status = 'marketed' AND p.mhra_status IN ('approved', 'licensed')))
      AND (? = '%%' OR p.product_name LIKE ? OR p.sku LIKE ? OR COALESCE(p.gtin, '') LIKE ?)
    ORDER BY p.product_name LIMIT 100
  `, customerVisibleOnly ? 1 : 0, term, term, term, term);
}

export async function listCustomers(query = "") {
  const term = `%${String(query).trim()}%`;
  return all(`SELECT c.*, o.legal_name, o.trading_name, o.company_number
    FROM customers c JOIN organizations o ON o.id = c.organization_id
    WHERE ? = '%%' OR c.customer_number LIKE ? OR o.legal_name LIKE ? OR COALESCE(o.trading_name, '') LIKE ?
    ORDER BY o.legal_name LIMIT 100`, term, term, term, term);
}

export async function listSuppliers(query = "") {
  const term = `%${String(query).trim()}%`;
  return all(`SELECT s.*, o.legal_name, o.trading_name, o.company_number
    FROM suppliers s JOIN organizations o ON o.id = s.organization_id
    WHERE ? = '%%' OR s.supplier_number LIKE ? OR o.legal_name LIKE ? OR COALESCE(o.trading_name, '') LIKE ?
    ORDER BY o.legal_name LIMIT 100`, term, term, term, term);
}

export async function createSupplier(input, actor) {
  const now = nowIso();
  const organizationId = randomUUID();
  const supplierId = randomUUID();
  const supplierNumber = await allocateNumber("supplier", "SUP-");
  const supplier = {
    id: supplierId,
    supplierNumber,
    legalName: required(input.legalName, "Legal name"),
    tradingName: String(input.tradingName || "").trim() || null,
    companyNumber: String(input.companyNumber || "").trim() || null,
    vatNumber: String(input.vatNumber || "").trim() || null,
    supplierType: required(input.supplierType, "Supplier type"),
    qualificationStatus: String(input.qualificationStatus || "prospect"),
    gdpStatus: String(input.gdpStatus || "not_assessed"),
    gmpStatus: String(input.gmpStatus || "not_assessed")
  };
  return transaction(async () => {
    await run(`INSERT INTO organizations(id, legal_name, trading_name, company_number, vat_number, created_at, created_by, updated_at, updated_by)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`, organizationId, supplier.legalName, supplier.tradingName, supplier.companyNumber, supplier.vatNumber, now, actor, now, actor);
    await run(`INSERT INTO suppliers(id, organization_id, supplier_number, supplier_type, qualification_status, gdp_status, gmp_status, created_at, created_by, updated_at, updated_by)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, supplier.id, organizationId, supplier.supplierNumber, supplier.supplierType, supplier.qualificationStatus, supplier.gdpStatus, supplier.gmpStatus, now, actor, now, actor);
    await audit({ actor, action: "supplier.created", entityType: "supplier", entityId: supplier.id, after: supplier });
    await entityFolderEvent("supplier", supplier.id, supplier.supplierNumber, supplier.legalName, actor);
    return supplier;
  });
}

export async function createLead(input, actor = "public_website") {
  if (String(input.website || "").trim()) return { id: null, status: "received" };
  const lead = {
    id: randomUUID(),
    name: required(input.name, "Name").slice(0, 120),
    email: required(input.email, "Email").toLowerCase().slice(0, 160),
    company: required(input.company, "Company").slice(0, 160),
    enquiryType: required(input.enquiryType, "Enquiry type").slice(0, 80),
    message: required(input.message, "Message").slice(0, 2000),
    role: required(input.role, "Role or job title").slice(0, 120),
    country: required(input.country, "Country").slice(0, 80),
    telephone: String(input.telephone || "").replace(/[^0-9+().\-\s]/g, "").trim().slice(0, 40) || null,
    status: "new"
  };
  if (!/^\S+@\S+\.\S+$/.test(lead.email)) throw Object.assign(new Error("Enter a valid email address."), { statusCode: 400 });
  if (!enquiryTypes.has(lead.enquiryType)) throw Object.assign(new Error("Select a valid enquiry type."), { statusCode: 400 });
  if (lead.message.length < 20) throw Object.assign(new Error("Message must contain at least 20 characters."), { statusCode: 400 });
  if (input.privacyAcknowledgement !== "yes" && input.consent !== "yes") throw Object.assign(new Error("Confirm that you have read the privacy notice before submitting an enquiry."), { statusCode: 400 });
  if (input.safetyConfirmation !== "yes") throw Object.assign(new Error("Confirm that the enquiry does not contain patient-identifiable, adverse-event or urgent medical information."), { statusCode: 400 });
  const submissionFingerprint = stableHash({
    email: lead.email,
    company: lead.company.toLowerCase(),
    enquiryType: lead.enquiryType,
    message: lead.message.toLowerCase()
  });
  const now = nowIso();
  const duplicateSince = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  if (await one("SELECT id FROM leads WHERE submission_fingerprint = ? AND created_at >= ? LIMIT 1", submissionFingerprint, duplicateSince)) {
    return { id: null, status: "received", duplicate: true };
  }
  return transaction(async () => {
    await run("INSERT INTO leads(id, name, email, company, enquiry_type, message, submission_fingerprint, status, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", lead.id, lead.name, lead.email, lead.company, lead.enquiryType, lead.message, submissionFingerprint, lead.status, now, now);
    await run(`INSERT INTO lead_details(lead_id, role_title, country, telephone, consent_at, privacy_notice_version, safety_confirmation_at, source_page)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?)`, lead.id, lead.role, lead.country, lead.telephone, now, privacyNoticeVersion, now, "corporate_website");
    await audit({ actor, action: "lead.created", entityType: "lead", entityId: lead.id, after: { company: lead.company, enquiryType: lead.enquiryType } });
    await enqueue({ eventType: "lead.notification_requested", aggregateType: "lead", aggregateId: lead.id, destinationSystem: "microsoft365", idempotencyKey: `lead:${lead.id}:notify:sales`, payload: { operation: "notify_team", team: "sales", leadId: lead.id, company: lead.company, enquiryType: lead.enquiryType, replyTo: lead.email } });
    return { id: lead.id, status: lead.status };
  });
}

export async function listLeads(limit = 100) {
  return all(`SELECT l.id, l.name, l.email, l.company, l.enquiry_type, l.status, l.created_at,
      d.role_title, d.country, d.telephone, d.consent_at
    FROM leads l LEFT JOIN lead_details d ON d.lead_id = l.id
    ORDER BY l.created_at DESC LIMIT ?`, limit);
}

export async function leadNotificationContext(leadId) {
  return one(`SELECT l.id, l.name, l.email, l.company, l.enquiry_type, l.message,
      d.role_title, d.country, d.telephone
    FROM leads l JOIN lead_details d ON d.lead_id = l.id WHERE l.id = ?`, leadId);
}

export async function createProduct(input, actor) {
  const now = nowIso();
  const product = {
    id: randomUUID(),
    sku: required(input.sku || await allocateNumber("product", "NPH-"), "SKU"),
    ean: String(input.ean || "").trim() || null,
    gtin: String(input.gtin || "").trim() || null,
    productName: required(input.productName, "Product name"),
    strength: String(input.strength || "").trim() || null,
    dosageForm: String(input.dosageForm || "").trim() || null,
    packSize: String(input.packSize || "").trim() || null,
    manufacturer: String(input.manufacturer || "").trim() || null,
    countryOfOrigin: String(input.countryOfOrigin || "").trim() || null,
    listPriceMinor: integer(input.listPriceMinor || 0, "List price"),
    regulatoryStatus: String(input.regulatoryStatus || "draft"),
    marketingStatus: String(input.marketingStatus || "not_marketed"),
    mhraStatus: String(input.mhraStatus || "not_assessed"),
    lifecycleStatus: String(input.lifecycleStatus || "draft")
  };
  return transaction(async () => {
    await run(`INSERT INTO products(
      id, sku, ean, gtin, product_name, strength, dosage_form, pack_size, manufacturer, country_of_origin,
      list_price_minor, regulatory_status, marketing_status, mhra_status, lifecycle_status,
      created_at, created_by, updated_at, updated_by
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    product.id, product.sku, product.ean, product.gtin, product.productName, product.strength, product.dosageForm,
    product.packSize, product.manufacturer, product.countryOfOrigin, product.listPriceMinor, product.regulatoryStatus,
    product.marketingStatus, product.mhraStatus, product.lifecycleStatus, now, actor, now, actor);
    await audit({ actor, action: "product.created", entityType: "product", entityId: product.id, after: product });
    await entityFolderEvent("product", product.id, product.sku, product.productName, actor);
    return product;
  });
}

export async function submitCustomerApplication(input, actor = "public_applicant") {
  const company = input.company || {};
  const responsiblePeopleInput = Array.isArray(input.responsiblePeople) ? input.responsiblePeople.slice(0, 5) : [];
  const addressesInput = Array.isArray(input.addresses) ? input.addresses.slice(0, 10) : [];
  const complianceInput = input.compliance || {};
  const customerTypes = new Set(["pharmacy", "hospital", "wholesaler", "clinic", "other_healthcare"]);
  const gdpStatuses = new Set(["certified", "in_progress", "not_applicable"]);
  if (!responsiblePeopleInput.length) throw Object.assign(new Error("At least one responsible person is required."), { statusCode: 400 });
  if (!addressesInput.some((address) => address?.type === "registered")) throw Object.assign(new Error("A registered address is required."), { statusCode: 400 });
  const customerType = required(company.customerType, "Customer type");
  if (!customerTypes.has(customerType)) throw Object.assign(new Error("Customer type is invalid."), { statusCode: 400 });
  const gdpStatus = required(complianceInput.gdpStatus, "GDP status");
  if (!gdpStatuses.has(gdpStatus)) throw Object.assign(new Error("GDP status is invalid."), { statusCode: 400 });
  const responsiblePeople = responsiblePeopleInput.map((person) => {
    const email = required(person?.email, "Responsible person email").toLowerCase().slice(0, 160);
    if (!/^\S+@\S+\.\S+$/.test(email)) throw Object.assign(new Error("Responsible person email is invalid."), { statusCode: 400 });
    return { name: required(person?.name, "Responsible person name").slice(0, 120), role: required(person?.role, "Responsible person role").slice(0, 120), email };
  });
  const addresses = addressesInput.map((address) => ({
    type: ["registered", "delivery", "invoice"].includes(address?.type) ? address.type : "delivery",
    address: required(address?.address, "Address").slice(0, 500),
    postcode: required(address?.postcode, "Postcode").slice(0, 20),
    country: String(address?.country || "GB").trim().toUpperCase().slice(0, 2)
  }));
  const email = required(input.email, "Contact email").toLowerCase().slice(0, 160);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw Object.assign(new Error("Contact email is invalid."), { statusCode: 400 });
  if (input.bank?.confirmationProvided !== true) throw Object.assign(new Error("Bank confirmation must be available for review."), { statusCode: 400 });
  if (input.privacyAcknowledgement !== "yes") throw Object.assign(new Error("Confirm that you have read the privacy notice before submitting the application."), { statusCode: 400 });
  if (input.applicantDeclaration !== "yes") throw Object.assign(new Error("Confirm the application declaration before submitting."), { statusCode: 400 });
  const now = nowIso();
  const application = {
    id: randomUUID(),
    applicationNumber: await allocateNumber(`application:${new Date().getUTCFullYear()}`, `APP-${new Date().getUTCFullYear()}-`),
    company: {
      legalName: required(company.legalName, "Legal company name"),
      tradingName: String(company.tradingName || "").trim(),
      companyNumber: required(company.companyNumber, "Company number"),
      vatNumber: String(company.vatNumber || "").trim(),
      customerType
    },
    responsiblePeople,
    addresses,
    compliance: {
      wdaNumber: String(complianceInput.wdaNumber || "").trim().slice(0, 50),
      gdpStatus,
      insuranceStatus: required(complianceInput.insuranceStatus, "Insurance status").slice(0, 200),
      creditReferences: required(complianceInput.creditReferences, "Credit references").slice(0, 1000),
      tradeReferences: required(complianceInput.tradeReferences, "Trade references").slice(0, 1000)
    },
    bank: { confirmationProvided: true },
    email
  };
  return transaction(async () => {
    await run(`INSERT INTO account_applications(
      id, application_number, status, company_json, responsible_people_json, addresses_json,
      compliance_json, bank_json, submitted_by_email, privacy_notice_version, applicant_declaration_at, created_at, updated_at
    ) VALUES(?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, application.id, application.applicationNumber,
    JSON.stringify(application.company), JSON.stringify(application.responsiblePeople), JSON.stringify(application.addresses),
    JSON.stringify(application.compliance), JSON.stringify(application.bank), application.email, privacyNoticeVersion, now, now, now);
    await audit({ actor, action: "customer_application.submitted", entityType: "account_application", entityId: application.id, after: application });
    await enqueue({
      eventType: "customer_application.sharepoint_folder_requested",
      aggregateType: "account_application",
      aggregateId: application.id,
      destinationSystem: "sharepoint",
      idempotencyKey: `account_application:${application.id}:folder:v1`,
      payload: { operation: "ensure_entity_folder", entityType: "account_application", entityId: application.id, businessNumber: application.applicationNumber, displayName: application.company.legalName, actor }
    });
    for (const team of ["compliance", "sales"]) {
      await enqueue({
        eventType: "customer_application.notification_requested",
        aggregateType: "account_application",
        aggregateId: application.id,
        destinationSystem: "microsoft365",
        idempotencyKey: `account_application:${application.id}:notify:${team}`,
        payload: { operation: "notify_team", team, applicationNumber: application.applicationNumber, companyName: application.company.legalName }
      });
    }
    return { id: application.id, applicationNumber: application.applicationNumber, status: "submitted" };
  });
}

export async function activateCustomer(applicationId, actor) {
  const application = await one("SELECT * FROM account_applications WHERE id = ?", applicationId);
  if (!application) throw Object.assign(new Error("Application not found."), { statusCode: 404 });
  if (application.customer_id) return one("SELECT * FROM customers WHERE id = ?", application.customer_id);
  const company = JSON.parse(application.company_json);
  const now = nowIso();
  const organizationId = randomUUID();
  const customerId = randomUUID();
  const customerNumber = await allocateNumber("customer", "CUS-");
  const portalUsername = String(application.submitted_by_email || "").trim().toLowerCase();
  return transaction(async () => {
    await run(`INSERT INTO organizations(id, legal_name, trading_name, company_number, vat_number, created_at, created_by, updated_at, updated_by)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`, organizationId, company.legalName, company.tradingName || null, company.companyNumber, company.vatNumber || null, now, actor, now, actor);
    await run(`INSERT INTO customers(id, organization_id, customer_number, customer_type, lifecycle_status, created_at, created_by, updated_at, updated_by)
      VALUES(?, ?, ?, ?, 'active', ?, ?, ?, ?)`, customerId, organizationId, customerNumber, company.customerType, now, actor, now, actor);
    await run("UPDATE account_applications SET status = 'active', customer_id = ?, updated_at = ? WHERE id = ?", customerId, now, applicationId);
    const existingUser = portalUsername ? await one("SELECT id FROM users WHERE username = ?", portalUsername) : null;
    if (existingUser) {
      await run("UPDATE users SET customer_id = ?, role = 'client', status = 'invited', updated_at = ? WHERE id = ?", customerId, now, existingUser.id);
    } else if (portalUsername) {
      await run("INSERT INTO users(id, username, display_name, role, customer_id, status, created_at, updated_at) VALUES(?, ?, ?, 'client', ?, 'invited', ?, ?)", randomUUID(), portalUsername, company.legalName, customerId, now, now);
    }
    const linkedDocuments = await all(`SELECT dl.document_id, d.checksum_sha256
      FROM document_links dl JOIN documents d ON d.id = dl.document_id
      WHERE dl.entity_type = 'account_application' AND dl.entity_id = ?`, applicationId);
    for (const document of linkedDocuments) {
      await insertIgnore("document_links", {
        id: randomUUID(),
        document_id: document.document_id,
        entity_type: "customer",
        entity_id: customerId,
        relationship: "onboarding_evidence",
        created_at: now
      }, ["document_id", "entity_type", "entity_id", "relationship"]);
      await enqueue({
        eventType: "document.customer_sharepoint_upload_requested",
        aggregateType: "document",
        aggregateId: document.document_id,
        destinationSystem: "sharepoint",
        idempotencyKey: `document:${document.document_id}:customer:${customerId}:upload:v1`,
        payload: {
          operation: "upload_document",
          documentId: document.document_id,
          entityType: "customer",
          entityId: customerId,
          checksum: document.checksum_sha256,
          folderPath: sharePointFolderPath({ entityType: "customer", entityId: customerId, businessNumber: customerNumber, displayName: company.legalName })
        }
      });
    }
    await audit({ actor, action: "customer.activated", entityType: "customer", entityId: customerId, after: { customerNumber, organizationId, applicationId } });
    await entityFolderEvent("customer", customerId, customerNumber, company.legalName, actor);
    await enqueue({
      eventType: "customer.portal_access_requested",
      aggregateType: "customer",
      aggregateId: customerId,
      destinationSystem: "microsoft365",
      idempotencyKey: `customer:${customerId}:portal-access:v1`,
      payload: { operation: "invite_customer_user", username: portalUsername, customerNumber, companyName: company.legalName }
    });
    return one("SELECT c.*, o.legal_name, o.trading_name FROM customers c JOIN organizations o ON o.id = c.organization_id WHERE c.id = ?", customerId);
  });
}

export async function createOrder(input, actor, scopedCustomerId = null) {
  const customerId = scopedCustomerId || required(input.customerId, "Customer");
  const customer = await one("SELECT * FROM customers WHERE id = ?", customerId);
  if (!customer || customer.lifecycle_status !== "active") throw Object.assign(new Error("Customer account is not active."), { statusCode: 409 });
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (!lines.length) throw Object.assign(new Error("At least one order line is required."), { statusCode: 400 });
  const priced = [];
  for (const line of lines) {
    const product = await one("SELECT * FROM products WHERE id = ? AND lifecycle_status = 'active' AND marketing_status = 'marketed' AND mhra_status IN ('approved', 'licensed')", required(line.productId, "Product"));
    if (!product) throw Object.assign(new Error("Product is unavailable for ordering."), { statusCode: 409 });
    const quantity = integer(line.quantity, "Quantity", 1);
    const unitPriceMinor = product.list_price_minor;
    priced.push({ id: randomUUID(), productId: product.id, quantity, unitPriceMinor, lineTotalMinor: quantity * unitPriceMinor });
  }
  const subtotal = priced.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const tax = 0;
  const now = nowIso();
  const order = { id: randomUUID(), orderNumber: await allocateNumber(`order:${new Date().getUTCFullYear()}`, `SO-${new Date().getUTCFullYear()}-`), customerId, subtotalMinor: subtotal, taxMinor: tax, totalMinor: subtotal + tax, status: "submitted" };
  return transaction(async () => {
    await run(`INSERT INTO orders(id, order_number, customer_id, status, requested_delivery_date, subtotal_minor, tax_minor, total_minor, customer_po_reference, created_at, created_by, updated_at, updated_by)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, order.id, order.orderNumber, order.customerId, order.status,
      input.requestedDeliveryDate || null, order.subtotalMinor, order.taxMinor, order.totalMinor, String(input.customerPoReference || "").trim() || null,
      now, actor, now, actor);
    for (const line of priced) await run("INSERT INTO order_lines(id, order_id, product_id, quantity, unit_price_minor, line_total_minor, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)", line.id, order.id, line.productId, line.quantity, line.unitPriceMinor, line.lineTotalMinor, now);
    await audit({ actor, action: "order.submitted", entityType: "order", entityId: order.id, after: { ...order, lines: priced } });
    await enqueue({ eventType: "order.sharepoint_folder_requested", aggregateType: "order", aggregateId: order.id, destinationSystem: "sharepoint", idempotencyKey: `order:${order.id}:folder:v1`, payload: { operation: "ensure_entity_folder", entityType: "order", entityId: order.id, businessNumber: order.orderNumber, displayName: order.orderNumber, actor } });
    await enqueue({ eventType: "order.wms_reservation_requested", aggregateType: "order", aggregateId: order.id, destinationSystem: "polar_speed", idempotencyKey: `order:${order.id}:reserve:v1`, payload: { operation: "reserve_stock", orderId: order.id, orderNumber: order.orderNumber, lines: priced } });
    return { ...order, lines: priced };
  });
}

export async function listOrders({ customerId = null, limit = 100 } = {}) {
  const rows = customerId
    ? await all("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?", customerId, limit)
    : await all("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?", limit);
  return Promise.all(rows.map(async (order) => ({ ...order, lines: await all("SELECT ol.*, p.sku, p.product_name FROM order_lines ol JOIN products p ON p.id = ol.product_id WHERE ol.order_id = ?", order.id) })));
}

export async function createPurchaseOrder(input, actor) {
  const supplierId = required(input.supplierId, "Supplier");
  const supplier = await one("SELECT * FROM suppliers WHERE id = ?", supplierId);
  if (!supplier || !["approved", "conditional"].includes(supplier.qualification_status)) {
    throw Object.assign(new Error("Supplier must be qualified before a purchase order can be raised."), { statusCode: 409 });
  }
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (!lines.length) throw Object.assign(new Error("At least one purchase-order line is required."), { statusCode: 400 });
  const priced = [];
  for (const line of lines) {
    const product = await one("SELECT id, sku, product_name FROM products WHERE id = ?", required(line.productId, "Product"));
    if (!product) throw Object.assign(new Error("Product not found."), { statusCode: 404 });
    const quantity = integer(line.quantity, "Quantity", 1);
    const unitCostMinor = integer(line.unitCostMinor, "Unit cost");
    priced.push({ id: randomUUID(), productId: product.id, quantity, unitCostMinor, lineTotalMinor: quantity * unitCostMinor });
  }
  const subtotal = priced.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const now = nowIso();
  const po = { id: randomUUID(), poNumber: await allocateNumber(`purchase_order:${new Date().getUTCFullYear()}`, `PO-${new Date().getUTCFullYear()}-`), supplierId, status: "submitted", subtotalMinor: subtotal, taxMinor: 0, totalMinor: subtotal };
  return transaction(async () => {
    await run(`INSERT INTO purchase_orders(id, po_number, supplier_id, status, subtotal_minor, tax_minor, total_minor, expected_date, created_at, created_by, updated_at, updated_by)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, po.id, po.poNumber, po.supplierId, po.status, po.subtotalMinor, po.taxMinor, po.totalMinor, input.expectedDate || null, now, actor, now, actor);
    for (const line of priced) await run("INSERT INTO purchase_order_lines(id, purchase_order_id, product_id, quantity, unit_cost_minor, line_total_minor) VALUES(?, ?, ?, ?, ?, ?)", line.id, po.id, line.productId, line.quantity, line.unitCostMinor, line.lineTotalMinor);
    await audit({ actor, action: "purchase_order.submitted", entityType: "purchase_order", entityId: po.id, after: { ...po, lines: priced } });
    await enqueue({ eventType: "purchase_order.sharepoint_folder_requested", aggregateType: "purchase_order", aggregateId: po.id, destinationSystem: "sharepoint", idempotencyKey: `purchase_order:${po.id}:folder:v1`, payload: { operation: "ensure_entity_folder", entityType: "purchase_order", entityId: po.id, businessNumber: po.poNumber, displayName: po.poNumber, actor } });
    await enqueue({ eventType: "purchase_order.approval_requested", aggregateType: "purchase_order", aggregateId: po.id, destinationSystem: "microsoft365", idempotencyKey: `purchase_order:${po.id}:approval:v1`, payload: { operation: "start_approval", poNumber: po.poNumber, totalMinor: po.totalMinor, currency: "GBP" } });
    return { ...po, lines: priced };
  });
}

export async function listPurchaseOrders(limit = 100) {
  const rows = await all(`SELECT po.*, o.legal_name AS supplier_name
    FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id JOIN organizations o ON o.id = s.organization_id
    ORDER BY po.created_at DESC LIMIT ?`, limit);
  return Promise.all(rows.map(async (po) => ({
      ...po,
      lines: await all("SELECT pol.*, p.sku, p.product_name FROM purchase_order_lines pol JOIN products p ON p.id = pol.product_id WHERE pol.purchase_order_id = ?", po.id)
    })));
}

export async function operationalDashboard(customerId = null) {
  if (customerId) {
    const account = await one(`SELECT c.*, o.legal_name FROM customers c JOIN organizations o ON o.id = c.organization_id WHERE c.id = ?`, customerId);
    if (!account) throw Object.assign(new Error("Customer account not found."), { statusCode: 404 });
    return {
      account,
      availableCreditMinor: Math.max(0, account.credit_limit_minor - account.outstanding_balance_minor),
      orderCount: (await one("SELECT COUNT(*) AS value FROM orders WHERE customer_id = ?", customerId)).value,
      annualSpendMinor: (await one("SELECT COALESCE(SUM(total_minor), 0) AS value FROM invoices WHERE customer_id = ? AND issue_date >= date('now', '-12 months')", customerId)).value,
      invoicesDue: (await one("SELECT COUNT(*) AS value FROM invoices WHERE customer_id = ? AND outstanding_minor > 0 AND due_date <= date('now')", customerId)).value,
      recentOrders: await listOrders({ customerId, limit: 8 }),
      dataFreshness: nowIso()
    };
  }
  return {
    customers: (await one("SELECT COUNT(*) AS value FROM customers WHERE lifecycle_status = 'active'")).value,
    products: (await one("SELECT COUNT(*) AS value FROM products WHERE lifecycle_status = 'active'")).value,
    openOrders: (await one("SELECT COUNT(*) AS value FROM orders WHERE status NOT IN ('closed', 'cancelled')")).value,
    pendingApplications: (await one("SELECT COUNT(*) AS value FROM account_applications WHERE status NOT IN ('active', 'rejected')")).value,
    pendingSyncEvents: (await one("SELECT COUNT(*) AS value FROM integration_events WHERE status IN ('pending', 'retrying', 'blocked')")).value,
    sourceStatus: {
      operationalDatabase: "live",
      sharePoint: process.env.MICROSOFT_TENANT_ID ? "configured" : "credentials_required",
      warehouse: process.env.POLAR_SPEED_API_BASE_URL ? "configured" : "api_contract_required",
      finance: process.env.FINANCE_API_BASE_URL ? "configured" : "provider_required"
    },
    dataFreshness: nowIso()
  };
}

export async function syncStatus() {
  return all(`SELECT destination_system, status, COUNT(*) AS count, MAX(created_at) AS latest_event
    FROM integration_events GROUP BY destination_system, status ORDER BY destination_system, status`);
}

export async function listApplications(limit = 100) {
  return all("SELECT id, application_number, status, submitted_by_email, customer_id, created_at, updated_at FROM account_applications ORDER BY created_at DESC LIMIT ?", limit);
}

export async function applicationDocumentContext(applicationId) {
  const application = await one("SELECT id, application_number, company_json, status FROM account_applications WHERE id = ?", applicationId);
  if (!application) throw Object.assign(new Error("Application not found."), { statusCode: 404 });
  const company = JSON.parse(application.company_json);
  return { id: application.id, applicationNumber: application.application_number, companyName: company.legalName, status: application.status };
}

export async function applicationNotificationContext(applicationId) {
  const application = await one("SELECT id, application_number, company_json, submitted_by_email FROM account_applications WHERE id = ?", applicationId);
  if (!application) return null;
  const company = JSON.parse(application.company_json);
  return {
    id: application.id,
    application_number: application.application_number,
    company_name: company.legalName,
    customer_type: company.customerType,
    submitted_by_email: application.submitted_by_email
  };
}

export async function listAudit(limit = 100) {
  return all("SELECT id, actor, action, entity_type, entity_id, correlation_id, occurred_at FROM audit_logs ORDER BY occurred_at DESC LIMIT ?", limit);
}
