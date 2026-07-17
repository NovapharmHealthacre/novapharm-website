import { createHash, randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { all, audit, closeDatabase, nowIso, one, run, transaction } from "../../src/data/database.mjs";

const actor = "local_validation_seed";

function timestamp(daysAgo = 0, hours = 0) {
  return new Date(Date.now() - daysAgo * 86400000 + hours * 3600000).toISOString();
}

async function insert(table, columns, values) {
  const placeholders = columns.map(() => "?").join(", ");
  return run(`INSERT OR IGNORE INTO ${table}(${columns.join(", ")}) VALUES(${placeholders})`, ...values);
}

function previewPayload({ to, subject, text, html, replyTo = null }, localState) {
  return JSON.stringify({
    message: { to, subject, text, html, replyTo },
    localCapture: { state: localState, synthetic: true }
  });
}

function ensureSyntheticDocument(fileName, body) {
  const root = process.env.DOCUMENT_STORAGE_ROOT;
  if (!root) throw new Error("DOCUMENT_STORAGE_ROOT is required for local seed documents.");
  const directory = join(root, "synthetic-seed");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, fileName);
  const bytes = Buffer.from(body);
  if (!existsSync(path)) writeFileSync(path, bytes, { mode: 0o600, flag: "wx" });
  chmodSync(path, 0o600);
  return { path, bytes, checksum: createHash("sha256").update(bytes).digest("hex") };
}

export async function seedLocalPortalData() {
  const protectedValidationMode = process.env.LOCAL_PORTAL_MODE === "true" || process.env.BROWSER_VALIDATION_MODE === "true";
  if (!protectedValidationMode || process.env.DATABASE_PROVIDER !== "sqlite" || process.env.HOST !== "127.0.0.1") {
    throw new Error("Synthetic local data may only be seeded in a protected localhost validation mode with SQLite.");
  }

  const now = nowIso();
  const customerOrganisations = [
    ["demo-org-customer-001", "DEMO Northbridge Pharmacy Group Ltd", "DEMO Northbridge", "TEST-COMP-001"],
    ["demo-org-customer-002", "TEST Meridian Healthcare Wholesale Ltd", "TEST Meridian", "TEST-COMP-002"],
    ["demo-org-customer-003", "DEMO Riverside Clinical Procurement Ltd", "DEMO Riverside", "TEST-COMP-003"]
  ];
  const supplierOrganisations = [
    ["demo-org-supplier-001", "TEST Atlas Formulations Ltd", "TEST Atlas", "TEST-SUPP-001"],
    ["demo-org-supplier-002", "DEMO Helix Packaging Services Ltd", "DEMO Helix", "TEST-SUPP-002"],
    ["demo-org-supplier-003", "TEST Northstar Logistics Validation Ltd", "TEST Northstar", "TEST-SUPP-003"]
  ];

  await transaction(async () => {
    for (const [id, legalName, tradingName, companyNumber] of [...customerOrganisations, ...supplierOrganisations]) {
      await insert("organizations", ["id", "legal_name", "trading_name", "company_number", "country_code", "status", "source_system", "created_at", "created_by", "updated_at", "updated_by"],
        [id, legalName, tradingName, companyNumber, "GB", "active", "local_validation", timestamp(30), actor, now, actor]);
    }

    const customers = [
      ["demo-customer-001", "demo-org-customer-001", "TEST-CUS-000001", "pharmacy_group", 2500000, 435000],
      ["demo-customer-002", "demo-org-customer-002", "TEST-CUS-000002", "wholesaler", 5000000, 1280000],
      ["demo-customer-003", "demo-org-customer-003", "TEST-CUS-000003", "hospital_procurement", 3500000, 0]
    ];
    for (const [id, organizationId, number, type, credit, outstanding] of customers) {
      await insert("customers", ["id", "organization_id", "customer_number", "customer_type", "lifecycle_status", "credit_limit_minor", "outstanding_balance_minor", "currency", "payment_terms_days", "source_system", "created_at", "created_by", "updated_at", "updated_by"],
        [id, organizationId, number, type, "active", credit, outstanding, "GBP", 30, "local_validation", timestamp(28), actor, now, actor]);
    }

    const contacts = [
      ["demo-contact-001", "demo-customer-001", "TEST Priya Shah", "Procurement Lead", "priya.shah@example.invalid"],
      ["demo-contact-002", "demo-customer-002", "DEMO Daniel Reed", "Responsible Person", "daniel.reed@example.invalid"],
      ["demo-contact-003", "demo-customer-003", "TEST Emma Cole", "Commercial Pharmacist", "emma.cole@example.invalid"]
    ];
    for (const [id, customerId, name, role, email] of contacts) {
      await insert("customer_contacts", ["id", "customer_id", "name", "role_title", "email", "is_primary", "status", "created_at", "updated_at"],
        [id, customerId, name, role, email, 1, "active", timestamp(27), now]);
    }

    const suppliers = [
      ["demo-supplier-001", "demo-org-supplier-001", "TEST-SUP-000001", "manufacturer", "approved", "qualified", "qualified"],
      ["demo-supplier-002", "demo-org-supplier-002", "TEST-SUP-000002", "packaging", "conditional", "not_applicable", "qualified"],
      ["demo-supplier-003", "demo-org-supplier-003", "TEST-SUP-000003", "logistics", "prospect", "under_review", "not_applicable"]
    ];
    for (const [id, organizationId, number, type, qualification, gdp, gmp] of suppliers) {
      await insert("suppliers", ["id", "organization_id", "supplier_number", "supplier_type", "qualification_status", "gdp_status", "gmp_status", "payment_terms_days", "source_system", "created_at", "created_by", "updated_at", "updated_by"],
        [id, organizationId, number, type, qualification, gdp, gmp, 30, "local_validation", timestamp(26), actor, now, actor]);
    }

    const products = [
      ["demo-product-001", "TEST-ONC-001", "Synthetic Oncology Vial 10 mg", "10 mg", "powder for solution", "1 vial", 12500],
      ["demo-product-002", "TEST-SPC-002", "Synthetic Specialty Tablet 25 mg", "25 mg", "tablet", "30 tablets", 8600],
      ["demo-product-003", "TEST-LIQ-003", "Synthetic Oral Liquid 5 mg/5 mL", "5 mg/5 mL", "oral solution", "150 mL", 4200],
      ["demo-product-004", "TEST-GEN-004", "Synthetic Generic Capsule 20 mg", "20 mg", "capsule", "28 capsules", 1900],
      ["demo-product-005", "TEST-NUT-005", "Synthetic Nutraceutical Tablets", null, "tablet", "60 tablets", 2400]
    ];
    for (const [id, sku, name, strength, dosage, pack, price] of products) {
      await insert("products", ["id", "sku", "product_name", "strength", "dosage_form", "pack_size", "manufacturer", "country_of_origin", "list_price_minor", "currency", "regulatory_status", "marketing_status", "mhra_status", "lifecycle_status", "source_system", "created_at", "created_by", "updated_at", "updated_by"],
        [id, sku, name, strength, dosage, pack, "TEST manufacturer — synthetic record", "GB", price, "GBP", "draft", "not_marketed", "not_assessed", "draft", "local_validation", timestamp(24), actor, now, actor]);
    }

    for (let index = 1; index <= 5; index += 1) {
      await insert("batches", ["id", "product_id", "supplier_id", "batch_number", "manufacture_date", "expiry_date", "release_status", "quantity_available", "created_at", "updated_at"],
        [`demo-batch-00${index}`, `demo-product-00${index}`, index < 3 ? "demo-supplier-001" : "demo-supplier-002", `TEST-BATCH-00${index}`, "2026-01-15", "2028-01-31", "quarantine", 0, timestamp(20), now]);
    }

    const orders = [
      ["demo-order-001", "TEST-ORD-000001", "demo-customer-001", "submitted", 25000, "TEST-PO-A1", 1],
      ["demo-order-002", "TEST-ORD-000002", "demo-customer-002", "confirmed", 43000, "TEST-PO-B2", 2],
      ["demo-order-003", "TEST-ORD-000003", "demo-customer-003", "allocated", 12600, "TEST-PO-C3", 3],
      ["demo-order-004", "TEST-ORD-000004", "demo-customer-001", "delivered", 3800, "TEST-PO-A4", 4],
      ["demo-order-005", "TEST-ORD-000005", "demo-customer-002", "invoiced", 7200, "TEST-PO-B5", 5]
    ];
    for (const [id, number, customerId, status, total, reference, productIndex] of orders) {
      await insert("orders", ["id", "order_number", "customer_id", "status", "requested_delivery_date", "subtotal_minor", "tax_minor", "total_minor", "currency", "customer_po_reference", "source_system", "created_at", "created_by", "updated_at", "updated_by"],
        [id, number, customerId, status, "2026-08-15", total, 0, total, "GBP", reference, "local_validation", timestamp(10 - productIndex), actor, now, actor]);
      await insert("order_lines", ["id", "order_id", "product_id", "quantity", "unit_price_minor", "discount_basis_points", "line_total_minor", "created_at"],
        [`demo-order-line-00${productIndex}`, id, `demo-product-00${productIndex}`, 2, Math.floor(total / 2), 0, total, timestamp(10 - productIndex)]);
    }

    const invoices = [
      ["demo-invoice-001", "TEST-INV-000001", "demo-customer-001", "demo-order-004", "due", 3800, 3800],
      ["demo-invoice-002", "TEST-INV-000002", "demo-customer-002", "demo-order-005", "paid", 7200, 0],
      ["demo-invoice-003", "TEST-INV-000003", "demo-customer-002", "demo-order-002", "draft", 43000, 43000]
    ];
    for (const [id, number, customerId, orderId, status, total, outstanding] of invoices) {
      await insert("invoices", ["id", "invoice_number", "customer_id", "order_id", "status", "issue_date", "due_date", "total_minor", "outstanding_minor", "currency", "created_at", "updated_at"],
        [id, number, customerId, orderId, status, "2026-07-10", "2026-08-09", total, outstanding, "GBP", timestamp(6), now]);
      await insert("invoice_lines", ["id", "invoice_id", "description", "quantity", "unit_price_minor", "line_total_minor"],
        [`${id}-line`, id, "Synthetic validation invoice line", 1, total, total]);
    }

    const purchaseOrders = [
      ["demo-po-001", "TEST-PO-000001", "demo-supplier-001", "approved", 50000, "demo-product-001"],
      ["demo-po-002", "TEST-PO-000002", "demo-supplier-002", "draft", 18000, "demo-product-003"]
    ];
    for (const [id, number, supplierId, status, total, productId] of purchaseOrders) {
      await insert("purchase_orders", ["id", "po_number", "supplier_id", "status", "subtotal_minor", "tax_minor", "total_minor", "currency", "expected_date", "created_at", "created_by", "updated_at", "updated_by"],
        [id, number, supplierId, status, total, 0, total, "GBP", "2026-09-01", timestamp(4), actor, now, actor]);
      await insert("purchase_order_lines", ["id", "purchase_order_id", "product_id", "quantity", "unit_cost_minor", "line_total_minor"],
        [`${id}-line`, id, productId, 10, Math.floor(total / 10), total]);
    }

    const leads = [
      ["demo-lead-001", "TEST-LEAD-000001", "TEST Alice Morgan", "alice.morgan@example.invalid", "TEST Arcadia Product Partners Ltd", "Product opportunity", "Synthetic product opportunity for local owner review only.", "new", "sent"],
      ["demo-lead-002", "TEST-LEAD-000002", "DEMO Robin Singh", "robin.singh@example.invalid", "DEMO Clearview Distribution Ltd", "Distribution partnership", "Synthetic distribution enquiry for retry workflow validation.", "reviewing", "retrying"],
      ["demo-lead-003", "TEST-LEAD-000003", "TEST Morgan Evans", "morgan.evans@example.invalid", "TEST Beacon Regulatory Services Ltd", "Regulatory services", "Synthetic regulatory enquiry for blocked delivery review.", "new", "blocked"]
    ];
    for (let index = 0; index < leads.length; index += 1) {
      const [id, number, name, email, company, type, message, status, delivery] = leads[index];
      await insert("leads", ["id", "lead_number", "name", "email", "company", "enquiry_type", "message", "submission_fingerprint", "status", "delivery_state", "created_at", "updated_at"],
        [id, number, name, email, company, type, message, `synthetic-${index + 1}`, status, delivery, timestamp(3 - index), now]);
      await insert("lead_details", ["lead_id", "role_title", "country", "telephone", "consent_at", "privacy_notice_version", "safety_confirmation_at", "source_page", "source_cta", "utm_source", "utm_medium", "utm_campaign", "referrer_domain", "network_fingerprint"],
        [id, "TEST Commercial Lead", "United Kingdom", null, timestamp(3 - index), "2026-07-14-v1.1", timestamp(3 - index), "/contact/", "local-owner-validation", "local", "validation", "owner-review", "127.0.0.1", `synthetic-network-${index + 1}`]);
    }

    const applications = [
      ["demo-application-001", "TEST-APP-000001", "under_initial_review", "TEST Willow Pharmacy Application Ltd", "initial@example.invalid"],
      ["demo-application-002", "TEST-APP-000002", "compliance_review", "DEMO Oak Wholesale Application Ltd", "compliance@example.invalid"],
      ["demo-application-003", "TEST-APP-000003", "approved", "TEST Cedar Healthcare Application Ltd", "approved@example.invalid"]
    ];
    for (let index = 0; index < applications.length; index += 1) {
      const [id, number, status, companyName, email] = applications[index];
      await insert("account_applications", ["id", "application_number", "submission_key", "status", "expected_document_count", "company_json", "responsible_people_json", "addresses_json", "compliance_json", "bank_json", "submitted_by_email", "privacy_notice_version", "applicant_declaration_at", "created_at", "updated_at"],
        [id, number, `synthetic-local-application-${index + 1}`, status, 1,
          JSON.stringify({ legalName: companyName, companyNumber: `TEST-APP-COMP-${index + 1}`, customerType: "pharmacy" }),
          JSON.stringify([{ name: `TEST Responsible Person ${index + 1}`, role: "Responsible Person", email }]),
          JSON.stringify([{ type: "registered", address: `${index + 1} TEST Validation Way`, postcode: "TE1 1ST", country: "GB" }]),
          JSON.stringify({ gdpStatus: "under_review", insuranceStatus: "Synthetic evidence", creditReferences: "Synthetic reference", tradeReferences: "Synthetic reference" }),
          JSON.stringify({ confirmationProvided: false }), email, "2026-07-14-v1.1", timestamp(5 - index), timestamp(5 - index), now]);

      const history = status === "under_initial_review"
        ? [[null, "submitted"], ["submitted", "under_initial_review"]]
        : status === "compliance_review"
          ? [[null, "submitted"], ["submitted", "under_initial_review"], ["under_initial_review", "compliance_review"]]
          : [[null, "submitted"], ["submitted", "under_initial_review"], ["under_initial_review", "compliance_review"], ["compliance_review", "credit_review"], ["credit_review", "approved"]];
      for (let eventIndex = 0; eventIndex < history.length; eventIndex += 1) {
        const [fromStatus, toStatus] = history[eventIndex];
        await insert("application_status_history", ["id", "application_id", "from_status", "to_status", "actor", "reason", "occurred_at"],
          [`${id}-history-${eventIndex + 1}`, id, fromStatus, toStatus, actor, "Synthetic local validation transition", timestamp(5 - index, eventIndex)]);
      }
    }

    const notificationSeeds = [
      ["demo-notification-sent", "contact_internal", "lead", "demo-lead-001", "sent", 1, null, timestamp(3), timestamp(3)],
      ["demo-notification-retrying", "contact_internal", "lead", "demo-lead-002", "retrying", 2, "LOCAL_CAPTURE_SIMULATED_RETRY", timestamp(2), null],
      ["demo-notification-blocked", "contact_internal", "lead", "demo-lead-003", "blocked", 8, "LOCAL_CAPTURE_SIMULATED_BLOCK", timestamp(1), null]
    ];
    for (const [id, template, entityType, entityId, status, attempts, errorCode, createdAt, sentAt] of notificationSeeds) {
      const lead = leads.find((entry) => entry[0] === entityId);
      const message = {
        to: "owner-review@local.novapharm.invalid",
        subject: `Synthetic local notification ${lead[1]}`,
        text: `${lead[6]}\n\nReference: ${lead[1]}`,
        html: `<h1>Synthetic local notification</h1><p>${lead[6]}</p><p><strong>Reference:</strong> ${lead[1]}</p>`,
        replyTo: lead[3]
      };
      await insert("notifications", ["id", "channel", "recipient", "template_code", "entity_type", "entity_id", "status", "payload_json", "attempt_count", "next_attempt_at", "last_attempt_at", "last_error_code", "provider_message_id", "created_at", "sent_at"],
        [id, "email", message.to, template, entityType, entityId, status, previewPayload(message, status), attempts, status === "retrying" ? timestamp(0, -1) : null, createdAt, errorCode, status === "sent" ? `local-capture/${id}` : null, createdAt, sentAt]);
    }

    await insert("support_tickets", ["id", "ticket_number", "customer_id", "category", "priority", "status", "subject", "description", "created_at", "updated_at"],
      ["demo-ticket-001", "TEST-TKT-000001", "demo-customer-001", "account", "normal", "open", "Synthetic local support request", "TEST data only; no live customer issue.", timestamp(2), now]);

    const integrationEvents = [
      ["demo-event-001", "local_validation.source_check", "system", "local-portal", "none", "synthetic-local-001", "succeeded"],
      ["demo-event-002", "local_validation.document_review", "document", "demo-document-quarantine", "local_only", "synthetic-local-002", "pending"],
      ["demo-event-003", "local_validation.notification_retry", "notification", "demo-notification-retrying", "local_capture", "synthetic-local-003", "retrying"]
    ];
    for (const [id, eventType, aggregateType, aggregateId, destination, key, status] of integrationEvents) {
      await insert("integration_events", ["id", "event_type", "aggregate_type", "aggregate_id", "source_system", "destination_system", "idempotency_key", "payload_json", "status", "attempt_count", "next_attempt_at", "created_at", "processed_at"],
        [id, eventType, aggregateType, aggregateId, "local_validation", destination, key, JSON.stringify({ synthetic: true, externalDelivery: false }), status, status === "retrying" ? 1 : 0, now, timestamp(1), status === "succeeded" ? now : null]);
    }
  });

  const quarantine = ensureSyntheticDocument("synthetic-local-quarantine.pdf", "%PDF-1.4\nSynthetic local validation document — not production scanned\n%%EOF\n");
  const cleanTest = ensureSyntheticDocument("synthetic-local-clean-test.pdf", "%PDF-1.4\nSynthetic local validation document — not production scanned\nControlled clean-test state\n%%EOF\n");

  await transaction(async () => {
    const documents = [
      ["demo-document-quarantine", "TEST-DOC-000001", "Synthetic local quarantine document", quarantine, "quarantine", "quarantine", null, null, "demo-application-001"],
      ["demo-document-clean-test", "TEST-DOC-000002", "Synthetic local clean-test document", cleanTest, "draft", "clean", "synthetic_local_validation_clean", now, "demo-application-002"]
    ];
    for (const [id, number, title, file, lifecycle, security, result, scannedAt, applicationId] of documents) {
      await insert("documents", ["id", "document_number", "title", "file_name", "content_type", "size_bytes", "checksum_sha256", "idempotency_key", "storage_path", "document_class", "lifecycle_status", "retention_class", "security_status", "malware_scan_result", "malware_scanned_at", "created_at", "created_by", "updated_at", "updated_by"],
        [id, number, title, file.path.split("/").at(-1), "application/pdf", file.bytes.length, file.checksum, `synthetic-${file.checksum}`, file.path, "company_due_diligence", lifecycle, "validation_short_term", security, result, scannedAt, timestamp(2), actor, now, actor]);
      await insert("document_links", ["id", "document_id", "entity_type", "entity_id", "relationship", "created_at"],
        [`${id}-link`, id, "account_application", applicationId, "supporting_document", timestamp(2)]);
    }
  });

  if (!await one("SELECT id FROM audit_logs WHERE action = 'local_validation.seed_completed' LIMIT 1")) {
    await audit({ actor, action: "local_validation.seed_completed", entityType: "environment", entityId: "local-portal", details: { syntheticOnly: true, externalServices: false } });
  }
  if (!await one("SELECT id FROM security_events WHERE event_type = 'local_validation.environment_initialised' LIMIT 1")) {
    await insert("security_events", ["id", "event_type", "username", "network_fingerprint", "outcome", "details_json", "occurred_at"],
      [randomUUID(), "local_validation.environment_initialised", null, "localhost", "allowed", JSON.stringify({ syntheticOnly: true, bindAddress: "127.0.0.1" }), now]);
  }

  const counts = {};
  for (const table of ["customers", "customer_contacts", "products", "suppliers", "orders", "invoices", "purchase_orders", "leads", "account_applications", "notifications", "documents", "audit_logs", "security_events"]) {
    counts[table] = Number((await one(`SELECT COUNT(*) AS value FROM ${table}`))?.value || 0);
  }
  const foreignKeyIssues = await all("PRAGMA foreign_key_check");
  if (foreignKeyIssues.length) throw new Error(`Synthetic seed failed foreign-key validation (${foreignKeyIssues.length} issue(s)).`);
  return { counts, foreignKeyIssues: 0 };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const result = await seedLocalPortalData();
  await closeDatabase();
  console.log(JSON.stringify({ status: "seeded", ...result }));
}
