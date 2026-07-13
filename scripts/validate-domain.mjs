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
  operationalDashboard,
  submitCustomerApplication,
  syncStatus
} = await import("../src/core/domain-service.mjs");
const { storeDocument } = await import("../src/core/document-service.mjs");
const { processSharePointEvents } = await import("../src/integrations/sharepoint/sync-engine.mjs");
const { processPolarSpeedEvents } = await import("../src/integrations/polar-speed/sync-engine.mjs");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const application = submitCustomerApplication({
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
  email: "validation.customer@example.com"
});

const document = storeDocument({
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

const customer = activateCustomer(application.id, "validation_admin");
const supplier = createSupplier({
  legalName: "Validation Supplier Ltd",
  supplierType: "manufacturer",
  qualificationStatus: "approved",
  gdpStatus: "certified",
  gmpStatus: "certified"
}, "validation_admin");
const product = createProduct({
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
const order = createOrder({
  customerId: customer.id,
  customerPoReference: "PO-VALIDATION",
  lines: [{ productId: product.id, quantity: 4 }]
}, "validation_admin");
const purchaseOrder = createPurchaseOrder({
  supplierId: supplier.id,
  lines: [{ productId: product.id, quantity: 20, unitCostMinor: 700 }]
}, "validation_admin");

const sharePointResult = await processSharePointEvents({ limit: 50 });
const polarSpeedResult = await processPolarSpeedEvents({ limit: 50 });
const dashboard = operationalDashboard();
const sync = syncStatus();

assert(application.applicationNumber.startsWith("APP-"), "application number was not allocated");
assert(document.documentNumber.startsWith("DOC-CUSTOMER_ONBOARDING-"), "document number was not allocated");
assert(customer.customer_number.startsWith("CUS-"), "customer number was not allocated");
assert(supplier.supplierNumber.startsWith("SUP-"), "supplier number was not allocated");
assert(product.sku === "NPH-VALID-001", "product was not created");
assert(order.orderNumber.startsWith("SO-"), "sales order was not created");
assert(purchaseOrder.poNumber.startsWith("PO-"), "purchase order was not created");
assert(listProducts().length === 1, "product list does not include validation product");
assert(listSuppliers().length === 1, "supplier list does not include validation supplier");
assert(listOrders().length === 1, "order list does not include validation order");
assert(listPurchaseOrders().length === 1, "purchase order list does not include validation PO");
assert(dashboard.customers === 1, "dashboard customer count mismatch");
assert(dashboard.products === 1, "dashboard product count mismatch");
assert(sharePointResult.blocked > 0, "SharePoint events should block without external credentials");
assert(polarSpeedResult.blocked > 0, "Polar Speed events should block without API contract");
assert(sync.some((row) => row.destination_system === "sharepoint"), "SharePoint sync status missing");
assert(sync.some((row) => row.destination_system === "polar_speed"), "Polar Speed sync status missing");
assert(listAudit().length >= 6, "audit trail is incomplete");

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
