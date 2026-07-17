import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const tempDir = mkdtempSync(join(tmpdir(), "novapharm-domain-"));
process.env.DATABASE_PATH = join(tempDir, "validation.sqlite");

const {
  activateCustomer,
  createOrder,
  createProduct,
  createPurchaseOrder,
  createSupplier,
  listAudit,
  listOrders,
  listProducts,
  listPurchaseOrders,
  listSuppliers,
  markApplicationDocumentsSubmitted,
  operationalDashboard,
  setApplicationStatus,
  submitCustomerApplication,
  syncStatus
} = await import("../src/core/domain-service.mjs");
const { storeDocument } = await import("../src/core/document-service.mjs");
const { processSharePointEvents } = await import("../src/integrations/sharepoint/sync-engine.mjs");
const { processPolarSpeedEvents } = await import("../src/integrations/polar-speed/sync-engine.mjs");
const { run } = await import("../src/data/database.mjs");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const application = await submitCustomerApplication({
  company: {
    legalName: "Validation Pharmacy Ltd",
    tradingName: "Validation Pharmacy",
    companyNumber: "12345678",
    vatNumber: "GB123456789",
    customerType: "pharmacy"
  },
  responsiblePeople: [{ name: "Validation RP", role: "Responsible Person", email: "rp@example.com" }],
  addresses: [{ type: "registered", address: "1 Validation Street", postcode: "N1 1AA", country: "GB" }],
  compliance: { wdaNumber: "WDA(H)-VALIDATION", gdpStatus: "certified", insuranceStatus: "validated", creditReferences: "Validation credit reference", tradeReferences: "Validation trade reference" },
  bank: { confirmationProvided: true },
  applicantDeclaration: "yes",
  privacyAcknowledgement: "yes",
  expectedDocumentCount: 1,
  submissionKey: "domain-validation-application-000001",
  email: "validation.customer@example.com"
});

const document = await storeDocument({
  bytes: Buffer.from("%PDF-1.4\n% NovaPharm validation evidence\n"),
  fileName: "validation-evidence.pdf",
  contentType: "application/pdf",
  documentClass: "customer_onboarding",
  entityType: "account_application",
  entityId: application.id,
  businessNumber: application.applicationNumber,
  displayName: "Validation Pharmacy Ltd",
  actor: "validation"
});

await markApplicationDocumentsSubmitted(application.id, "validation_applicant");
for (const status of ["under_initial_review", "compliance_review", "credit_review", "approved"]) {
  await setApplicationStatus(application.id, status, "validation_admin", `Validation transition: ${status}`);
}
const customer = await activateCustomer(application.id, "validation_admin");
const supplier = await createSupplier({
  legalName: "Validation Supplier Ltd",
  supplierType: "manufacturer",
  qualificationStatus: "approved",
  gdpStatus: "certified",
  gmpStatus: "certified"
}, "validation_admin");
const product = await createProduct({
  sku: "NPH-VALID-001",
  productName: "Validation Product",
  strength: "10mg",
  packSize: "30 tablets",
  manufacturer: "Validation Supplier Ltd",
  listPriceMinor: 1250,
  mhraStatus: "approved",
  marketingStatus: "marketed",
  lifecycleStatus: "active"
}, "validation_admin");
assert(supplier.qualificationStatus === "prospect", "supplier creation must ignore browser-supplied approval state");
assert(product.lifecycleStatus === "draft" && product.marketingStatus === "not_marketed" && product.mhraStatus === "not_assessed", "product creation must begin in controlled draft state");
let unapprovedOrderBlocked = false;
try {
  await createOrder({ customerId: customer.id, lines: [{ productId: product.id, quantity: 1 }] }, "validation_admin");
} catch (error) {
  unapprovedOrderBlocked = error?.statusCode === 409;
}
assert(unapprovedOrderBlocked, "draft product must not be orderable");

// This isolated validation step represents approved qualification evidence; public inputs cannot set these states.
await run("UPDATE suppliers SET qualification_status = 'approved', gdp_status = 'certified', gmp_status = 'certified' WHERE id = ?", supplier.id);
await run("UPDATE products SET regulatory_status = 'approved', marketing_status = 'marketed', mhra_status = 'approved', lifecycle_status = 'active' WHERE id = ?", product.id);
const order = await createOrder({
  customerId: customer.id,
  customerPoReference: "PO-VALIDATION",
  lines: [{ productId: product.id, quantity: 4 }]
}, "validation_admin");
const purchaseOrder = await createPurchaseOrder({
  supplierId: supplier.id,
  lines: [{ productId: product.id, quantity: 20, unitCostMinor: 700 }]
}, "validation_admin");

const sharePointResult = await processSharePointEvents({ limit: 50 });
const polarSpeedResult = await processPolarSpeedEvents({ limit: 50 });
const dashboard = await operationalDashboard();
const sync = await syncStatus();

assert(application.applicationNumber.startsWith("APP-"), "application number was not allocated");
assert(document.documentNumber.startsWith("DOC-CUSTOMER_ONBOARDING-"), "document number was not allocated");
assert(customer.customer_number.startsWith("CUS-"), "customer number was not allocated");
assert(supplier.supplierNumber.startsWith("SUP-"), "supplier number was not allocated");
assert(product.sku === "NPH-VALID-001", "product was not created");
assert(order.orderNumber.startsWith("SO-"), "sales order was not created");
assert(purchaseOrder.poNumber.startsWith("PO-"), "purchase order was not created");
assert((await listProducts()).length === 1, "product list does not include validation product");
assert((await listSuppliers()).length === 1, "supplier list does not include validation supplier");
assert((await listOrders()).length === 1, "order list does not include validation order");
assert((await listPurchaseOrders()).length === 1, "purchase order list does not include validation PO");
assert(dashboard.customers === 1, "dashboard customer count mismatch");
assert(dashboard.products === 1, "dashboard product count mismatch");
assert(sharePointResult.blocked > 0, "SharePoint events should block without external credentials");
assert(polarSpeedResult.blocked > 0, "Polar Speed events should block without API contract");
assert(sync.some((row) => row.destination_system === "sharepoint"), "SharePoint sync status missing");
assert(sync.some((row) => row.destination_system === "polar_speed"), "Polar Speed sync status missing");
assert((await listAudit()).length >= 6, "audit trail is incomplete");

writeFileSync(join(tempDir, "validation-summary.json"), JSON.stringify({
  application: application.applicationNumber,
  customer: customer.customer_number,
  supplier: supplier.supplierNumber,
  product: product.sku,
  order: order.orderNumber,
  purchaseOrder: purchaseOrder.poNumber,
  sharePointResult,
  polarSpeedResult,
  dashboard,
  sync
}, null, 2));

console.log(`Domain validation passed using ${process.env.DATABASE_PATH}`);
