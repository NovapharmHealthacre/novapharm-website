import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { all, audit, closeDatabase, nowIso, one, run, transaction } from "../../src/data/database.mjs";
import { ownerUsername } from "./runtime.mjs";

const actor = "local_validation_enterprise_seed";

async function insert(table, columns, values) {
  return run(`INSERT OR IGNORE INTO ${table}(${columns.join(", ")}) VALUES(${columns.map(() => "?").join(", ")})`, ...values);
}

function workflowSteps(code) {
  return {
    product_onboarding: ["draft", "data_complete", "artwork_evidence", "claims_review", "quality_review", "regulatory_classification", "commercial_approval", "price_list", "customer_visibility", "order_eligibility"],
    order_to_cash: ["customer", "credit_validation", "order", "product_validation", "inventory_reservation", "pick", "dispatch", "delivery", "invoice", "payment", "statement", "finance_posting", "board_reporting"],
    procure_to_pay: ["approved_supplier", "requisition", "purchase_order", "approval", "goods_receipt", "batch_quarantine", "quality_release", "supplier_invoice", "three_way_match", "payment", "finance_posting"],
    lead_to_customer: ["website_enquiry", "crm_lead", "product_interest", "opportunity", "account_application", "compliance_review", "credit_review", "approval", "customer_activation", "price_list", "first_order"],
    quality_complaint: ["customer_complaint", "product", "batch", "order", "triage", "investigation", "capa", "recall_assessment", "customer_communication", "closure", "trend_reporting"],
    document_control: ["upload", "quarantine", "scan", "classification", "review", "approval", "entity_link", "access_control", "retention", "audit"]
  }[code];
}

async function seedWorkflow({ code, businessKey, entityType, entityId, complete = true, instanceId = null }) {
  const id = instanceId || `demo-workflow-${code.replaceAll("_", "-")}`;
  const steps = workflowSteps(code);
  const now = nowIso();
  await insert("workflow_instances", ["id", "workflow_code", "business_key", "entity_type", "entity_id", "status", "current_step", "correlation_id", "started_by", "started_at", "completed_at", "updated_at"],
    [id, code, businessKey, entityType, entityId, complete ? "completed" : "active", complete ? steps.at(-1) : steps[0], id, actor, now, complete ? now : null, now]);
  for (let index = 0; index < steps.length; index += 1) {
    await insert("workflow_steps", ["id", "workflow_instance_id", "step_code", "sequence_number", "status", "actor", "input_json", "output_json", "started_at", "completed_at"],
      [`${id}-step-${String(index + 1).padStart(2, "0")}`, id, steps[index], index + 1, complete ? "completed" : index === 0 ? "active" : "pending", actor,
        JSON.stringify({ synthetic: true }), JSON.stringify({ validated: complete, externalAction: false }), now, complete ? now : null]);
  }
  await insert("domain_events", ["id", "event_type", "aggregate_type", "aggregate_id", "aggregate_version", "correlation_id", "actor", "payload_json", "occurred_at"],
    [`${id}-event`, `workflow.${complete ? "completed" : "started"}`, "workflow", id, 1, id, actor, JSON.stringify({ workflowCode: code, synthetic: true }), now]);
  await insert("outbox_messages", ["id", "domain_event_id", "destination", "message_type", "idempotency_key", "payload_json", "status", "attempt_count", "next_attempt_at", "created_at", "processed_at"],
    [`${id}-outbox`, `${id}-event`, "local_validation", "workflow.snapshot", `${id}:snapshot:v1`, JSON.stringify({ workflowCode: code, synthetic: true }), "processed", 1, now, now, now]);
}

export async function seedEnterpriseScenarios() {
  if (process.env.LOCAL_PORTAL_MODE !== "true" || process.env.DATABASE_PROVIDER !== "sqlite" || process.env.HOST !== "127.0.0.1") {
    throw new Error("Enterprise synthetic scenarios may only run in the protected localhost SQLite portal.");
  }
  const owner = await one("SELECT id, username FROM users WHERE lower(username) = lower(?)", ownerUsername);
  if (!owner) throw new Error("The protected local owner identity must exist before enterprise scenarios are seeded.");
  const nutraxinProducts = await all(`SELECT p.id, p.sku, p.product_name, pv.catalogue_order
    FROM products p JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.source_system = 'owner_supplied_nutraxin_catalogue' ORDER BY pv.catalogue_order`);
  if (nutraxinProducts.length !== 19) throw new Error(`Enterprise scenarios require all 19 Nutraxin records; found ${nutraxinProducts.length}.`);
  const now = nowIso();
  const releasedProduct = nutraxinProducts[0];
  const quarantineProduct = nutraxinProducts[1];
  const expiringProduct = nutraxinProducts[2];

  await transaction(async () => {
    await run(`UPDATE products SET lifecycle_status = 'active', marketing_status = 'marketed', mhra_status = 'approved',
      regulatory_status = 'synthetic_validation', updated_at = ?, updated_by = ? WHERE id LIKE 'demo-product-%'`, now, actor);
    await run(`UPDATE batches SET release_status = 'released', quantity_available = 120, updated_at = ? WHERE id = 'demo-batch-001'`, now);

    const supplierContacts = [
      ["demo-supplier-contact-001", "demo-supplier-001", "TEST Amira Patel", "Quality contact", "amira.patel@example.invalid"],
      ["demo-supplier-contact-002", "demo-supplier-002", "DEMO Lee Carter", "Packaging contact", "lee.carter@example.invalid"],
      ["demo-supplier-contact-003", "demo-supplier-003", "TEST Jo Green", "Logistics contact", "jo.green@example.invalid"]
    ];
    for (const [id, supplierId, name, role, email] of supplierContacts) {
      await insert("supplier_contacts", ["id", "supplier_id", "name", "role_title", "email", "is_primary", "status", "created_at", "updated_at"],
        [id, supplierId, name, role, email, 1, "active", now, now]);
    }
    for (const product of nutraxinProducts) {
      await insert("product_supplier_links", ["id", "product_id", "supplier_id", "relationship_type", "qualification_status", "created_at", "updated_at"],
        [`demo-link-${product.id}`, product.id, "demo-supplier-001", "catalogue_validation_supplier", "synthetic_approved", now, now]);
    }

    const priceLists = [
      ["demo-price-list-standard", "TEST-NUT-STANDARD", "TEST Nutraxin validation standard", "demo-customer-001", 1499],
      ["demo-price-list-contract", "TEST-NUT-CONTRACT", "TEST Nutraxin validation contract", "demo-customer-002", 1299]
    ];
    for (const [id, code, name, customerId, basePrice] of priceLists) {
      await insert("price_lists", ["id", "price_list_code", "name", "currency", "status", "valid_from", "valid_to", "version", "created_at", "created_by", "updated_at", "updated_by"],
        [id, code, name, "GBP", "active_validation", "2026-07-01", "2027-06-30", 1, now, actor, now, actor]);
      await insert("customer_price_lists", ["id", "customer_id", "price_list_id", "priority", "valid_from", "valid_to", "created_at"],
        [`${id}-${customerId}`, customerId, id, 10, "2026-07-01", "2027-06-30", now]);
      for (let index = 0; index < nutraxinProducts.length; index += 1) {
        await insert("price_list_items", ["id", "price_list_id", "product_id", "unit_price_minor", "minimum_quantity", "status", "created_at", "updated_at"],
          [`${id}-item-${String(index + 1).padStart(2, "0")}`, id, nutraxinProducts[index].id, basePrice + index * 125, 6, "validation_only", now, now]);
      }
    }

    await insert("inventory_locations", ["id", "location_code", "name", "location_type", "ownership_status", "operational_status", "created_at", "updated_at"],
      ["demo-location-3pl-001", "TEST-3PL-01", "TEST third-party distribution location", "third_party_warehouse", "third_party_validation", "validation_only", now, now]);
    const batches = [
      ["demo-nutraxin-batch-released", releasedProduct.id, "TEST-NUT-REL-001", "2027-12-31", "released", 180],
      ["demo-nutraxin-batch-quarantine", quarantineProduct.id, "TEST-NUT-QUA-001", "2028-03-31", "quarantine", 80],
      ["demo-nutraxin-batch-expiring", expiringProduct.id, "TEST-NUT-EXP-001", "2026-10-31", "released", 40]
    ];
    for (const [id, productId, number, expiry, status, quantity] of batches) {
      await insert("batches", ["id", "product_id", "supplier_id", "batch_number", "manufacture_date", "expiry_date", "release_status", "quantity_available", "version", "created_at", "updated_at"],
        [id, productId, "demo-supplier-001", number, "2026-04-01", expiry, status, quantity, 1, now, now]);
      const released = status === "released" ? quantity : 0;
      const quarantine = status === "quarantine" ? quantity : 0;
      await insert("inventory_balances", ["id", "product_id", "batch_id", "location_id", "on_hand_quantity", "reserved_quantity", "available_quantity", "quarantine_quantity", "version", "updated_at"],
        [`${id}-balance`, productId, id, "demo-location-3pl-001", quantity, 0, released, quarantine, 1, now]);
      await insert("inventory_movements", ["id", "product_id", "batch_id", "location_id", "movement_type", "quantity", "balance_after", "reference_type", "reference_id", "actor", "correlation_id", "occurred_at"],
        [`${id}-receipt-movement`, productId, id, "demo-location-3pl-001", status === "released" ? "quality_release" : "goods_receipt_quarantine", quantity, quantity, "batch", id, actor, `${id}-correlation`, now]);
    }

    await insert("purchase_orders", ["id", "po_number", "supplier_id", "status", "subtotal_minor", "tax_minor", "total_minor", "currency", "expected_date", "version", "created_at", "created_by", "updated_at", "updated_by"],
      ["demo-nutraxin-po-001", "TEST-NUT-PO-000001", "demo-supplier-001", "received", 72000, 0, 72000, "GBP", "2026-07-15", 1, now, actor, now, actor]);
    await insert("purchase_order_lines", ["id", "purchase_order_id", "product_id", "quantity", "unit_cost_minor", "line_total_minor"],
      ["demo-nutraxin-po-line-001", "demo-nutraxin-po-001", releasedProduct.id, 120, 600, 72000]);
    await insert("goods_receipts", ["id", "receipt_number", "purchase_order_id", "supplier_id", "status", "received_at", "received_by", "created_at", "updated_at"],
      ["demo-goods-receipt-001", "TEST-GRN-000001", "demo-nutraxin-po-001", "demo-supplier-001", "quality_released", now, actor, now, now]);
    await insert("goods_receipt_lines", ["id", "goods_receipt_id", "purchase_order_line_id", "batch_id", "quantity_received", "quantity_rejected"],
      ["demo-goods-receipt-line-001", "demo-goods-receipt-001", "demo-nutraxin-po-line-001", "demo-nutraxin-batch-released", 120, 0]);
    await insert("supplier_invoices", ["id", "supplier_invoice_number", "supplier_id", "purchase_order_id", "status", "invoice_date", "due_date", "total_minor", "currency", "created_at", "updated_at"],
      ["demo-supplier-invoice-001", "TEST-SINV-000001", "demo-supplier-001", "demo-nutraxin-po-001", "matched", "2026-07-15", "2026-08-14", 72000, "GBP", now, now]);
    await insert("invoice_matches", ["id", "supplier_invoice_id", "purchase_order_id", "goods_receipt_id", "match_status", "variance_minor", "reviewed_by", "reviewed_at", "created_at"],
      ["demo-invoice-match-001", "demo-supplier-invoice-001", "demo-nutraxin-po-001", "demo-goods-receipt-001", "matched", 0, ownerUsername, now, now]);

    await insert("orders", ["id", "order_number", "customer_id", "status", "requested_delivery_date", "subtotal_minor", "tax_minor", "total_minor", "currency", "customer_po_reference", "version", "source_system", "created_at", "created_by", "updated_at", "updated_by"],
      ["demo-nutraxin-order-001", "TEST-NUT-ORD-000001", "demo-customer-001", "delivered", "2026-07-14", 8994, 0, 8994, "GBP", "TEST-CUST-PO-NUT-01", 1, "local_validation", now, actor, now, actor]);
    await insert("order_lines", ["id", "order_id", "product_id", "quantity", "unit_price_minor", "discount_basis_points", "line_total_minor", "created_at"],
      ["demo-nutraxin-order-line-001", "demo-nutraxin-order-001", releasedProduct.id, 6, 1499, 0, 8994, now]);
    await insert("order_status_history", ["id", "order_id", "from_status", "to_status", "actor", "reason", "occurred_at"],
      ["demo-nutraxin-order-history-001", "demo-nutraxin-order-001", "dispatched", "delivered", actor, "Synthetic local delivery confirmation", now]);
    await insert("inventory_reservations", ["id", "order_line_id", "batch_id", "location_id", "quantity", "status", "created_at", "released_at"],
      ["demo-nutraxin-reservation-001", "demo-nutraxin-order-line-001", "demo-nutraxin-batch-released", "demo-location-3pl-001", 6, "fulfilled", now, now]);
    await insert("shipments", ["id", "shipment_number", "order_id", "status", "carrier_name", "tracking_reference", "dispatched_at", "delivered_at", "created_at", "updated_at"],
      ["demo-shipment-001", "TEST-SHP-000001", "demo-nutraxin-order-001", "delivered", "TEST Validation Carrier", "TEST-TRACK-000001", now, now, now, now]);
    await insert("shipment_lines", ["id", "shipment_id", "order_line_id", "batch_id", "quantity"],
      ["demo-shipment-line-001", "demo-shipment-001", "demo-nutraxin-order-line-001", "demo-nutraxin-batch-released", 6]);
    await insert("delivery_events", ["id", "shipment_id", "event_code", "event_status", "event_location", "external_reference", "payload_json", "occurred_at", "created_at"],
      ["demo-delivery-event-001", "demo-shipment-001", "delivered", "complete", "TEST customer location", "TEST-POD-000001", JSON.stringify({ synthetic: true, proofOfDeliveryPublished: false }), now, now]);

    await insert("invoices", ["id", "invoice_number", "customer_id", "order_id", "status", "issue_date", "due_date", "total_minor", "outstanding_minor", "currency", "version", "created_at", "updated_at"],
      ["demo-nutraxin-invoice-001", "TEST-NUT-INV-000001", "demo-customer-001", "demo-nutraxin-order-001", "paid", "2026-07-14", "2026-08-13", 8994, 0, "GBP", 1, now, now]);
    await insert("invoice_lines", ["id", "invoice_id", "product_id", "description", "quantity", "unit_price_minor", "line_total_minor"],
      ["demo-nutraxin-invoice-line-001", "demo-nutraxin-invoice-001", releasedProduct.id, `${releasedProduct.product_name} — synthetic local transaction`, 6, 1499, 8994]);
    await insert("payments", ["id", "payment_number", "customer_id", "invoice_id", "amount_minor", "currency", "payment_method", "reference", "status", "received_at", "created_at"],
      ["demo-payment-001", "TEST-PAY-000001", "demo-customer-001", "demo-nutraxin-invoice-001", 8994, "GBP", "synthetic_bank_transfer", "TEST-REMIT-001", "allocated", now, now]);
    await insert("customer_statements", ["id", "statement_number", "customer_id", "period_start", "period_end", "opening_balance_minor", "closing_balance_minor", "currency", "generated_at"],
      ["demo-statement-001", "TEST-STM-2026-07-001", "demo-customer-001", "2026-07-01", "2026-07-31", 0, 0, "GBP", now]);
    const statementLines = [
      ["demo-statement-line-001", "2026-07-14", "invoice", "TEST-NUT-INV-000001", "Synthetic invoice", 8994, 0, 8994],
      ["demo-statement-line-002", "2026-07-16", "payment", "TEST-PAY-000001", "Synthetic payment", 0, 8994, 0]
    ];
    for (const [id, date, type, reference, description, debit, credit, balance] of statementLines) {
      await insert("statement_lines", ["id", "statement_id", "line_date", "line_type", "reference", "description", "debit_minor", "credit_minor", "running_balance_minor"],
        [id, "demo-statement-001", date, type, reference, description, debit, credit, balance]);
    }

    await insert("returns", ["id", "return_number", "customer_id", "order_id", "status", "reason_code", "quality_hold", "created_at", "updated_at"],
      ["demo-return-001", "TEST-RTN-000001", "demo-customer-001", "demo-nutraxin-order-001", "closed", "packaging_observation", 1, now, now]);
    await insert("return_lines", ["id", "return_id", "product_id", "batch_id", "quantity", "disposition"],
      ["demo-return-line-001", "demo-return-001", releasedProduct.id, "demo-nutraxin-batch-released", 1, "quality_reviewed_not_resold"]);
    await insert("credit_notes", ["id", "credit_note_number", "customer_id", "invoice_id", "return_id", "status", "issue_date", "total_minor", "currency", "reason", "created_at", "updated_at"],
      ["demo-credit-note-001", "TEST-CN-000001", "demo-customer-001", "demo-nutraxin-invoice-001", "demo-return-001", "issued", "2026-07-16", 1499, "GBP", "Synthetic returned unit credit", now, now]);
    await insert("credit_note_lines", ["id", "credit_note_id", "product_id", "description", "quantity", "unit_amount_minor", "line_total_minor"],
      ["demo-credit-note-line-001", "demo-credit-note-001", releasedProduct.id, "Synthetic return credit", 1, 1499, 1499]);

    await insert("quality_complaints", ["id", "complaint_number", "customer_id", "order_id", "product_id", "batch_id", "severity", "status", "description", "safety_information_present", "pv_escalation_status", "owner_user_id", "due_at", "created_at", "updated_at"],
      ["demo-quality-complaint-001", "TEST-QC-000001", "demo-customer-001", "demo-nutraxin-order-001", releasedProduct.id, "demo-nutraxin-batch-released", "minor", "closed", "Synthetic packaging observation; no adverse event or patient information.", 0, "not_required", owner.id, now, now, now]);
    await insert("quality_actions", ["id", "complaint_id", "action_type", "description", "owner_user_id", "status", "due_at", "completed_at", "created_at"],
      ["demo-quality-action-001", "demo-quality-complaint-001", "investigation", "Synthetic packaging evidence reviewed.", owner.id, "completed", now, now, now]);
    await insert("capa_records", ["id", "capa_number", "source_type", "source_id", "root_cause", "corrective_action", "preventive_action", "effectiveness_status", "status", "owner_user_id", "due_at", "closed_at", "created_at", "updated_at"],
      ["demo-capa-001", "TEST-CAPA-000001", "quality_complaint", "demo-quality-complaint-001", "Synthetic label-handling observation", "Synthetic correction recorded", "Synthetic checklist updated", "effective_validation", "closed", owner.id, now, now, now, now]);
    await insert("quality_deviations", ["id", "deviation_number", "product_id", "batch_id", "supplier_id", "severity", "status", "description", "root_cause_status", "owner_user_id", "due_at", "closed_at", "created_at", "updated_at"],
      ["demo-deviation-001", "TEST-DEV-000001", quarantineProduct.id, "demo-nutraxin-batch-quarantine", "demo-supplier-001", "minor", "under_review", "Synthetic quarantine-label discrepancy.", "in_progress", owner.id, now, null, now, now]);
    await insert("change_controls", ["id", "change_number", "entity_type", "entity_id", "change_type", "risk_level", "status", "description", "implementation_date", "owner_user_id", "created_at", "updated_at"],
      ["demo-change-001", "TEST-CHG-000001", "product", releasedProduct.id, "catalogue_content", "low", "approved_validation", "Synthetic controlled catalogue-content correction.", "2026-07-16", owner.id, now, now]);

    await insert("regulatory_cases", ["id", "case_number", "product_id", "case_type", "jurisdiction", "authority", "status", "current_stage", "target_date", "owner_user_id", "created_at", "updated_at"],
      ["demo-regulatory-case-001", "TEST-REG-000001", releasedProduct.id, "food_supplement_classification", "GB", "Owner review required", "under_review", "claims_and_label_assessment", "2026-09-30", owner.id, now, now]);
    await insert("regulatory_milestones", ["id", "regulatory_case_id", "milestone_code", "title", "status", "due_at", "created_at"],
      ["demo-regulatory-milestone-001", "demo-regulatory-case-001", "label_review", "Approved-label and claims review", "pending_owner_evidence", "2026-09-30", now]);
    await insert("crm_opportunities", ["id", "opportunity_number", "lead_id", "organization_id", "customer_id", "name", "opportunity_type", "stage", "probability_basis_points", "estimated_value_minor", "currency", "owner_user_id", "next_action", "next_action_at", "created_at", "updated_at"],
      ["demo-opportunity-001", "TEST-OPP-000001", "demo-lead-001", "demo-org-customer-001", "demo-customer-001", "TEST Nutraxin validation opportunity", "product_opportunity", "qualified", 4000, 250000, "GBP", owner.id, "Complete evidence review", now, now, now]);
    await insert("crm_stage_history", ["id", "opportunity_id", "from_stage", "to_stage", "actor", "reason", "occurred_at"],
      ["demo-opportunity-history-001", "demo-opportunity-001", "new", "qualified", actor, "Synthetic qualification", now]);

    const accounts = [
      ["demo-ledger-cash", "1000", "TEST Cash", "asset"], ["demo-ledger-ar", "1100", "TEST Accounts receivable", "asset"],
      ["demo-ledger-inventory", "1200", "TEST Inventory", "asset"], ["demo-ledger-ap", "2100", "TEST Accounts payable", "liability"],
      ["demo-ledger-revenue", "4000", "TEST Product revenue", "income"]
    ];
    for (const [id, code, name, type] of accounts) {
      await insert("ledger_accounts", ["id", "account_code", "account_name", "account_type", "currency", "status", "created_at", "updated_at"],
        [id, code, name, type, "GBP", "active_validation", now, now]);
    }
    const journals = [
      ["demo-journal-invoice", "TEST-JRN-000001", "customer_invoice", "demo-nutraxin-invoice-001", 8994, "demo-ledger-ar", "demo-ledger-revenue"],
      ["demo-journal-payment", "TEST-JRN-000002", "customer_payment", "demo-payment-001", 8994, "demo-ledger-cash", "demo-ledger-ar"],
      ["demo-journal-receipt", "TEST-JRN-000003", "goods_receipt", "demo-goods-receipt-001", 72000, "demo-ledger-inventory", "demo-ledger-ap"]
    ];
    for (const [id, number, sourceType, sourceId, amount, debitAccount, creditAccount] of journals) {
      await insert("journal_entries", ["id", "journal_number", "journal_date", "description", "source_type", "source_id", "status", "prepared_by", "approved_by", "posted_at", "correlation_id", "created_at", "updated_at"],
        [id, number, "2026-07-16", `Synthetic ${sourceType.replaceAll("_", " ")} journal`, sourceType, sourceId, "posted", actor, ownerUsername, now, `${id}-correlation`, now, now]);
      await insert("journal_lines", ["id", "journal_entry_id", "ledger_account_id", "description", "debit_minor", "credit_minor", "currency"],
        [`${id}-debit`, id, debitAccount, "Synthetic debit", amount, 0, "GBP"]);
      await insert("journal_lines", ["id", "journal_entry_id", "ledger_account_id", "description", "debit_minor", "credit_minor", "currency"],
        [`${id}-credit`, id, creditAccount, "Synthetic credit", 0, amount, "GBP"]);
    }

    await insert("document_versions", ["id", "document_id", "version_number", "storage_path", "checksum_sha256", "change_summary", "lifecycle_status", "created_by", "created_at"],
      ["demo-document-version-001", "demo-document-clean-test", 1,
        (await one("SELECT storage_path FROM documents WHERE id = 'demo-document-clean-test'"))?.storage_path,
        (await one("SELECT checksum_sha256 FROM documents WHERE id = 'demo-document-clean-test'"))?.checksum_sha256,
        "Synthetic controlled first version", "approved_validation", actor, now]);
    await insert("document_approvals", ["id", "document_id", "document_version_id", "stage", "outcome", "requested_by", "decided_by", "comments", "requested_at", "decided_at"],
      ["demo-document-approval-001", "demo-document-clean-test", "demo-document-version-001", "owner_validation", "approved", actor, ownerUsername, "Synthetic approval only", now, now]);

    const permissions = [
      ["customer", "customer_portal", "read", "allow"], ["customer", "customer_portal", "customer_isolated_write", "allow"],
      ["employee", "operations", "read", "allow"], ["employee", "finance", "prepare", "allow"], ["employee", "finance", "self_approve", "deny"],
      ["employee", "warehouse", "quality_release", "deny"], ["board", "executive_platform", "read", "allow"], ["board", "executive_platform", "write", "deny"],
      ["admin", "administration", "manage", "allow"], ["admin", "audit", "bypass", "deny"]
    ];
    for (let index = 0; index < permissions.length; index += 1) {
      const [scope, module, permission, effect] = permissions[index];
      await insert("role_permissions", ["id", "role_scope", "module_code", "permission_code", "effect", "created_at"],
        [`demo-permission-${String(index + 1).padStart(2, "0")}`, scope, module, permission, effect, now]);
    }

    await seedWorkflow({ code: "product_onboarding", businessKey: "TEST-ONC-001", entityType: "product", entityId: "demo-product-001" });
    await seedWorkflow({ code: "order_to_cash", businessKey: "TEST-NUT-ORD-000001", entityType: "order", entityId: "demo-nutraxin-order-001" });
    await seedWorkflow({ code: "procure_to_pay", businessKey: "TEST-NUT-PO-000001", entityType: "purchase_order", entityId: "demo-nutraxin-po-001" });
    await seedWorkflow({ code: "lead_to_customer", businessKey: "TEST-LEAD-000001", entityType: "lead", entityId: "demo-lead-001" });
    await seedWorkflow({ code: "quality_complaint", businessKey: "TEST-QC-000001", entityType: "quality_complaint", entityId: "demo-quality-complaint-001" });
    await seedWorkflow({ code: "document_control", businessKey: "TEST-DOC-000002", entityType: "document", entityId: "demo-document-clean-test" });
    await seedWorkflow({ code: "product_onboarding", businessKey: "TEST-NUT-CONTENT-REVIEW", entityType: "product", entityId: releasedProduct.id,
      complete: false, instanceId: "demo-workflow-product-onboarding-nutraxin-review" });
  });

  if (!await one("SELECT id FROM audit_logs WHERE action = 'local_validation.enterprise_scenarios_seeded' LIMIT 1")) {
    await audit({ actor, action: "local_validation.enterprise_scenarios_seeded", entityType: "environment", entityId: "local-portal",
      details: { syntheticOnly: true, nutraxinProducts: 19, workflowTypes: 6, workflowInstances: 7, externalServices: false } });
  }
  const unbalanced = await all(`SELECT je.id, SUM(jl.debit_minor) AS debit, SUM(jl.credit_minor) AS credit
    FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id = je.id
    WHERE je.status = 'posted' GROUP BY je.id HAVING SUM(jl.debit_minor) <> SUM(jl.credit_minor)`);
  const foreignKeyIssues = await all("PRAGMA foreign_key_check");
  const counts = {};
  for (const table of ["product_variants", "price_lists", "inventory_balances", "shipments", "payments", "customer_statements", "quality_complaints", "regulatory_cases", "crm_opportunities", "journal_entries", "workflow_instances", "workflow_steps"]) {
    counts[table] = Number((await one(`SELECT COUNT(*) AS value FROM ${table}`))?.value || 0);
  }
  if (unbalanced.length || foreignKeyIssues.length || counts.workflow_instances < 6) throw new Error("Enterprise synthetic scenario reconciliation failed.");
  return { status: "seeded", counts, unbalancedJournals: 0, foreignKeyIssues: 0 };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const result = await seedEnterpriseScenarios();
  await closeDatabase();
  console.log(JSON.stringify(result));
}
