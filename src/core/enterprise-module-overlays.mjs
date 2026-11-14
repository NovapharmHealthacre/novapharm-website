import { all, one } from "../data/database.mjs";
import { reviewRecordedWarehouseLedger } from "./wms-control-tower.mjs";
import { reviewWmsFiveLayerObservations } from "./wms-five-layer-readiness.mjs";

function section(title, columns, rows, emptyState, { source = "Canonical application database", description = "" } = {}) {
  return { title, description, columns, rows, emptyState, source, rowCount: rows.length };
}

function metric(key, label, value, format = "number", href = null) {
  return { key, label, value: Number(value || 0), format, href };
}

async function dashboardView(snapshot) {
  const [workflows, integrations, outbox, counts] = await Promise.all([
    all("SELECT workflow_code, business_key, status, current_step, updated_at FROM workflow_instances ORDER BY updated_at DESC LIMIT 20"),
    all("SELECT destination_system, event_type, status, created_at FROM integration_events WHERE status IN ('pending','retrying','blocked') ORDER BY created_at DESC LIMIT 20"),
    all("SELECT destination, message_type, status, attempt_count, next_attempt_at, created_at FROM outbox_messages WHERE status IN ('pending','retrying','blocked') ORDER BY created_at DESC LIMIT 20"),
    one(`SELECT
      (SELECT COUNT(*) FROM workflow_instances WHERE status <> 'completed') AS active_workflows,
      (SELECT COUNT(*) FROM integration_events WHERE status IN ('pending','retrying','blocked')) AS integration_exceptions,
      (SELECT COUNT(*) FROM outbox_messages WHERE status IN ('pending','retrying','blocked')) AS delivery_exceptions,
      (SELECT COUNT(*) FROM security_events) AS security_events`)
  ]);
  return {
    ...snapshot,
    readOnly: true,
    actions: [],
    metrics: [
      metric("active-workflows", "Active workflows", counts?.active_workflows),
      metric("integration-exceptions", "Integration exceptions", counts?.integration_exceptions),
      metric("delivery-exceptions", "Delivery exceptions", counts?.delivery_exceptions),
      metric("security-events", "Security events", counts?.security_events)
    ],
    sections: [
      section("Priority workflow queue", [["workflow_code", "Workflow"], ["business_key", "Business key"], ["status", "Status", "status"], ["current_step", "Current step"], ["updated_at", "Updated"]], workflows, "No active workflow evidence is recorded."),
      section("Integration exceptions", [["destination_system", "Destination"], ["event_type", "Event"], ["status", "Status", "status"], ["created_at", "Raised"]], integrations, "No integration exception is recorded."),
      section("Delivery outbox", [["destination", "Destination"], ["message_type", "Message"], ["status", "Status", "status"], ["attempt_count", "Attempts", "number"], ["next_attempt_at", "Next attempt"], ["created_at", "Created"]], outbox, "No delivery item requires attention.")
    ],
    notices: [
      ...snapshot.notices,
      "Admin Dashboard is an operational posture view. It does not grant raw-table editing or bypass workflow authority.",
      "Managed-staging and live external-system health remain dependency-gated at R1."
    ]
  };
}

async function localReviewView(snapshot) {
  const [migrations, imports, workflows, counts] = await Promise.all([
    all("SELECT version, checksum_sha256, applied_at FROM schema_migrations ORDER BY version"),
    all("SELECT catalogue_code, catalogue_version, product_count, status, imported_by, imported_at FROM catalogue_imports ORDER BY imported_at DESC"),
    all("SELECT workflow_code, business_key, status, current_step, started_by, updated_at FROM workflow_instances ORDER BY updated_at DESC LIMIT 30"),
    one(`SELECT
      (SELECT COUNT(*) FROM schema_migrations) AS migrations,
      (SELECT COUNT(*) FROM catalogue_imports) AS imports,
      (SELECT COUNT(*) FROM workflow_instances) AS workflows`)
  ]);
  return {
    ...snapshot,
    readOnly: true,
    actions: [],
    metrics: [
      metric("migrations", "Schema migrations", counts?.migrations),
      metric("imports", "Controlled imports", counts?.imports),
      metric("workflows", "Workflow instances", counts?.workflows)
    ],
    sections: [
      section("Schema evidence", [["version", "Migration"], ["checksum_sha256", "Checksum", "code"], ["applied_at", "Applied"]], migrations, "No schema migration evidence is recorded."),
      section("Controlled catalogue evidence", [["catalogue_code", "Catalogue"], ["catalogue_version", "Version"], ["product_count", "Products", "number"], ["status", "Status", "status"], ["imported_by", "Actor"], ["imported_at", "Imported"]], imports, "No controlled catalogue import is recorded."),
      section("Workflow review evidence", [["workflow_code", "Workflow"], ["business_key", "Business key"], ["status", "Status", "status"], ["current_step", "Current step"], ["started_by", "Started by"], ["updated_at", "Updated"]], workflows, "No workflow review evidence is recorded.")
    ],
    notices: [
      ...snapshot.notices,
      "Local Review shows synthetic/repository acceptance evidence only; it is not managed-staging or production acceptance.",
      "Customer activation, notification replay and other state changes remain on separate CSRF-protected admin endpoints and require their governing review evidence."
    ]
  };
}

async function usersView(snapshot) {
  const [users, scopes, sessions, security, activeSessions] = await Promise.all([
    all("SELECT username, display_name, role, customer_id, status, identity_provider, created_at, updated_at FROM users ORDER BY role, username"),
    all("SELECT username, scope, created_at FROM auth_user_scopes ORDER BY username, scope"),
    all("SELECT username, access_type, created_at, expires_at, last_seen_at, revoked_at FROM auth_sessions ORDER BY created_at DESC LIMIT 40"),
    all(`SELECT event_type, username, outcome, occurred_at FROM security_events
      WHERE event_type LIKE 'authentication.%' OR event_type LIKE 'password.%' OR event_type LIKE 'administrator.%'
      ORDER BY occurred_at DESC LIMIT 40`),
    one("SELECT COUNT(*) AS value FROM auth_sessions WHERE revoked_at IS NULL AND expires_at > ?", new Date().toISOString())
  ]);
  const scopesByUser = new Map();
  for (const row of scopes) {
    const list = scopesByUser.get(row.username) || [];
    list.push(row.scope);
    scopesByUser.set(row.username, list);
  }
  const governedUsers = users.map((row) => ({ ...row, scopes: (scopesByUser.get(row.username) || []).join(", ") || "none" }));
  return {
    ...snapshot,
    readOnly: true,
    actions: [],
    metrics: [
      metric("users", "Governed identities", governedUsers.length),
      metric("active-sessions", "Active sessions", activeSessions?.value),
      metric("revoked-sessions", "Revoked sessions in view", sessions.filter((row) => row.revoked_at).length)
    ],
    sections: [
      section("Governed identities", [["username", "Username"], ["display_name", "Display name"], ["role", "Role", "status"], ["scopes", "Scopes"], ["customer_id", "Customer context"], ["identity_provider", "Identity provider", "status"], ["status", "Account status", "status"], ["updated_at", "Updated"]], governedUsers, "No governed identities are recorded."),
      section("Session posture", [["username", "Username"], ["access_type", "Workspace", "status"], ["created_at", "Created"], ["expires_at", "Expires"], ["last_seen_at", "Last seen"], ["revoked_at", "Revoked"]], sessions, "No session records are present."),
      section("Identity security events", [["event_type", "Event"], ["username", "Username"], ["outcome", "Outcome", "status"], ["occurred_at", "Time"]], security, "No identity security event is recorded.")
    ],
    notices: [
      ...snapshot.notices,
      "Credential hashes, salts, session identifiers, network fingerprints and security-event detail payloads are deliberately excluded.",
      "The server exposes controlled admin session revocation, but R1 keeps this module read-only until production identity authority is accepted."
    ]
  };
}

async function contentView(snapshot) {
  const [products, imports, counts] = await Promise.all([
    all(`SELECT p.sku, p.product_name, p.lifecycle_status, p.regulatory_status, p.source_system, p.updated_at,
      pv.public_slug, pv.sale_status, pv.claims_review_status
      FROM products p LEFT JOIN product_variants pv ON pv.product_id = p.id
      ORDER BY p.product_name, pv.catalogue_order LIMIT 80`),
    all("SELECT catalogue_code, catalogue_version, product_count, status, imported_by, imported_at FROM catalogue_imports ORDER BY imported_at DESC"),
    one(`SELECT
      (SELECT COUNT(*) FROM products) AS products,
      (SELECT COUNT(*) FROM product_variants WHERE sale_status = 'approved') AS approved_for_sale,
      (SELECT COUNT(*) FROM product_variants WHERE claims_review_status = 'approved') AS claims_approved`)
  ]);
  return {
    ...snapshot,
    readOnly: true,
    actions: [],
    metrics: [
      metric("products", "Products", counts?.products),
      metric("approved-for-sale", "Approved sale states", counts?.approved_for_sale),
      metric("claims-approved", "Approved claims states", counts?.claims_approved)
    ],
    sections: [
      section("Publication governance", [["sku", "SKU"], ["product_name", "Product"], ["lifecycle_status", "Lifecycle", "status"], ["regulatory_status", "Regulatory", "status"], ["sale_status", "Sale status", "status"], ["claims_review_status", "Claims review", "status"], ["public_slug", "Public slug"], ["source_system", "Source"], ["updated_at", "Updated"]], products, "No governed product content is recorded."),
      section("Catalogue provenance", [["catalogue_code", "Catalogue"], ["catalogue_version", "Version"], ["product_count", "Products", "number"], ["status", "Status", "status"], ["imported_by", "Actor"], ["imported_at", "Imported"]], imports, "No catalogue provenance record is available.")
    ],
    notices: [
      ...snapshot.notices,
      "Content Governance exposes approval state and provenance, not a raw content editor.",
      "Product activation and publication remain subject to lifecycle, claims, commercial and regulatory gates."
    ]
  };
}

async function analyticsView(snapshot) {
  const [events, security, integrations, outbox, migrations, counts] = await Promise.all([
    all("SELECT event_type, aggregate_type, aggregate_id, actor, occurred_at FROM domain_events ORDER BY occurred_at DESC LIMIT 50"),
    all("SELECT event_type, username, outcome, occurred_at FROM security_events ORDER BY occurred_at DESC LIMIT 50"),
    all("SELECT destination_system, event_type, status, created_at FROM integration_events ORDER BY created_at DESC LIMIT 50"),
    all("SELECT destination, message_type, status, attempt_count, next_attempt_at, created_at FROM outbox_messages ORDER BY created_at DESC LIMIT 50"),
    all("SELECT version, checksum_sha256, applied_at FROM schema_migrations ORDER BY version"),
    one(`SELECT
      (SELECT COUNT(*) FROM domain_events) AS domain_events,
      (SELECT COUNT(*) FROM security_events) AS security_events,
      (SELECT COUNT(*) FROM integration_events WHERE status IN ('pending','retrying','blocked')) AS integration_exceptions,
      (SELECT COUNT(*) FROM outbox_messages WHERE status IN ('pending','retrying','blocked')) AS delivery_exceptions`)
  ]);
  return {
    ...snapshot,
    readOnly: true,
    actions: [],
    metrics: [
      metric("domain-events", "Domain events", counts?.domain_events),
      metric("security-events", "Security events", counts?.security_events),
      metric("integration-exceptions", "Integration exceptions", counts?.integration_exceptions),
      metric("delivery-exceptions", "Delivery exceptions", counts?.delivery_exceptions)
    ],
    sections: [
      section("Domain event stream", [["event_type", "Event"], ["aggregate_type", "Entity type"], ["aggregate_id", "Entity"], ["actor", "Actor"], ["occurred_at", "Time"]], events, "No domain event is recorded."),
      section("Security posture", [["event_type", "Event"], ["username", "Username"], ["outcome", "Outcome", "status"], ["occurred_at", "Time"]], security, "No security event is recorded."),
      section("Integration telemetry", [["destination_system", "Destination"], ["event_type", "Event"], ["status", "Status", "status"], ["created_at", "Created"]], integrations, "No integration event is recorded."),
      section("Delivery telemetry", [["destination", "Destination"], ["message_type", "Message"], ["status", "Status", "status"], ["attempt_count", "Attempts", "number"], ["next_attempt_at", "Next attempt"], ["created_at", "Created"]], outbox, "No outbox event is recorded."),
      section("Schema lineage", [["version", "Migration"], ["checksum_sha256", "Checksum", "code"], ["applied_at", "Applied"]], migrations, "No schema lineage evidence is recorded.")
    ],
    notices: [
      ...snapshot.notices,
      "This R1 view uses canonical application audit/integration tables. It is not a substitute for accepted live Azure Monitor/Application Insights telemetry.",
      "Sensitive payloads and network fingerprints are excluded from the module response."
    ]
  };
}

export async function commandCentreView(snapshot) {
  const [workflows, integrations, quality, regulatory, counts] = await Promise.all([
    all("SELECT workflow_code, business_key, status, current_step, updated_at FROM workflow_instances WHERE status <> 'completed' ORDER BY updated_at DESC LIMIT 24"),
    all("SELECT destination_system, event_type, status, created_at FROM integration_events WHERE status IN ('pending','retrying','blocked') ORDER BY created_at DESC LIMIT 24"),
    all("SELECT complaint_number, severity, status, pv_escalation_status, due_at, created_at FROM quality_complaints WHERE status <> 'closed' ORDER BY due_at, created_at DESC LIMIT 24"),
    all("SELECT case_number, case_type, status, current_stage, target_date FROM regulatory_cases WHERE status NOT IN ('closed','approved') ORDER BY target_date LIMIT 24"),
    one(`SELECT
      (SELECT COUNT(*) FROM workflow_instances WHERE status <> 'completed') AS active_workflows,
      (SELECT COUNT(*) FROM integration_events WHERE status IN ('pending','retrying','blocked')) AS integration_exceptions,
      (SELECT COUNT(*) FROM quality_complaints WHERE status <> 'closed') AS quality_exceptions,
      (SELECT COUNT(*) FROM regulatory_cases WHERE status NOT IN ('closed','approved')) AS regulatory_actions`)
  ]);
  return {
    ...snapshot,
    readOnly: true,
    actions: [],
    metrics: [
      metric("active-workflows", "Active workflows", counts?.active_workflows),
      metric("integration-exceptions", "Integration exceptions", counts?.integration_exceptions),
      metric("quality-exceptions", "Quality exceptions", counts?.quality_exceptions),
      metric("regulatory-actions", "Regulatory actions", counts?.regulatory_actions)
    ],
    sections: [
      section("Decision and workflow queue", [["workflow_code", "Workflow"], ["business_key", "Business key"], ["status", "Status", "status"], ["current_step", "Current step"], ["updated_at", "Updated"]], workflows, "No active decision workflow is recorded."),
      section("Quality exceptions", [["complaint_number", "Complaint"], ["severity", "Severity", "status"], ["status", "Status", "status"], ["pv_escalation_status", "Safety escalation", "status"], ["due_at", "Due"]], quality, "No open quality exception is recorded."),
      section("Regulatory actions", [["case_number", "Case"], ["case_type", "Type", "status"], ["status", "Status", "status"], ["current_stage", "Stage"], ["target_date", "Target"]], regulatory, "No open regulatory action is recorded."),
      section("Integration exceptions", [["destination_system", "Destination"], ["event_type", "Event"], ["status", "Status", "status"], ["created_at", "Raised"]], integrations, "No integration exception is recorded.")
    ],
    notices: [
      ...snapshot.notices,
      "Command Centre is a read-only exception and decision surface; it does not replace the authoritative operational workflows.",
      "All records remain synthetic/local-validation evidence until managed staging and live authorities are accepted."
    ]
  };
}

export async function ceoDashboardView(snapshot) {
  const [pipeline, workflows, quality, regulatory, counts] = await Promise.all([
    all("SELECT opportunity_number, name, stage, probability_basis_points, estimated_value_minor, currency, next_action_at FROM crm_opportunities WHERE stage NOT IN ('won','lost','closed') ORDER BY next_action_at LIMIT 16"),
    all("SELECT workflow_code, business_key, status, current_step, updated_at FROM workflow_instances WHERE status <> 'completed' ORDER BY updated_at DESC LIMIT 16"),
    all("SELECT complaint_number, severity, status, due_at FROM quality_complaints WHERE status <> 'closed' ORDER BY due_at LIMIT 16"),
    all("SELECT case_number, case_type, status, current_stage, target_date FROM regulatory_cases WHERE status NOT IN ('closed','approved') ORDER BY target_date LIMIT 16"),
    one(`SELECT
      (SELECT COUNT(*) FROM customers WHERE lifecycle_status = 'active') AS active_customers,
      (SELECT COUNT(*) FROM orders WHERE status NOT IN ('closed','cancelled','delivered','invoiced')) AS open_orders,
      (SELECT COALESCE(SUM(total_minor),0) FROM invoices) AS invoice_value,
      (SELECT COALESCE(SUM(outstanding_minor),0) FROM invoices) AS receivables,
      (SELECT COUNT(*) FROM crm_opportunities WHERE stage NOT IN ('won','lost','closed')) AS pipeline,
      (SELECT COUNT(*) FROM quality_complaints WHERE status <> 'closed') AS quality_exceptions,
      (SELECT COUNT(*) FROM regulatory_cases WHERE status NOT IN ('closed','approved')) AS regulatory_actions`)
  ]);
  return {
    ...snapshot,
    readOnly: true,
    actions: [],
    metrics: [
      metric("active-customers", "Active customers", counts?.active_customers),
      metric("open-orders", "Open orders", counts?.open_orders),
      metric("invoice-value", "Synthetic invoiced value", counts?.invoice_value, "money"),
      metric("receivables", "Synthetic receivables", counts?.receivables, "money"),
      metric("pipeline", "Open opportunities", counts?.pipeline),
      metric("quality-exceptions", "Quality exceptions", counts?.quality_exceptions),
      metric("regulatory-actions", "Regulatory actions", counts?.regulatory_actions)
    ],
    sections: [
      section("Commercial outlook", [["opportunity_number", "Opportunity"], ["name", "Name"], ["stage", "Stage", "status"], ["probability_basis_points", "Probability", "basis_points"], ["estimated_value_minor", "Synthetic value", "money"], ["next_action_at", "Next action"]], pipeline, "No open opportunity is recorded."),
      section("Operating decisions", [["workflow_code", "Workflow"], ["business_key", "Business key"], ["status", "Status", "status"], ["current_step", "Current step"], ["updated_at", "Updated"]], workflows, "No active operating workflow is recorded."),
      section("Quality posture", [["complaint_number", "Complaint"], ["severity", "Severity", "status"], ["status", "Status", "status"], ["due_at", "Due"]], quality, "No open quality exception is recorded."),
      section("Regulatory posture", [["case_number", "Case"], ["case_type", "Type", "status"], ["status", "Status", "status"], ["current_stage", "Stage"], ["target_date", "Target"]], regulatory, "No open regulatory action is recorded.")
    ],
    notices: [
      ...snapshot.notices,
      "CEO Dashboard is a balanced synthetic-validation scorecard, not a Finance clone and not a claim of NovaPharm revenue or performance.",
      "Live commercial, finance and regulatory interpretation remains dependent on approved production data authorities."
    ]
  };
}

/**
 * One employee-authorised WMS decision surface over existing canonical
 * application read models. These are previews of independent systems, not
 * reconciled physical warehouse facts, sale authority, verified ATP or OTIF.
 *
 * Crucially, this function does not query separate intelligence/payments
 * databases or trust browser-selected organisation or warehouse identifiers.
 * The enterprise module dispatcher applies employee RBAC before this call.
 */
export async function enrichWarehouseControlSnapshot(snapshot) {
  if (snapshot?.module?.code !== "employee.warehouse") {
    throw Object.assign(new Error("Employee warehouse context required."), { statusCode: 403 });
  }
  const [orders, receipts, quality, returns, shipments, integrations] = await Promise.all([
    all(`SELECT o.order_number, org.legal_name AS customer, o.status,
      o.customer_po_reference, o.requested_delivery_date, o.created_at
      FROM orders o JOIN customers c ON c.id = o.customer_id
      JOIN organizations org ON org.id = c.organization_id
      ORDER BY o.created_at DESC LIMIT 30`),
    all(`SELECT po.po_number, gr.receipt_number, gr.status AS receipt_status,
      gr.received_at, SUM(grl.quantity_received) AS received_quantity,
      SUM(grl.quantity_rejected) AS rejected_quantity
      FROM goods_receipts gr JOIN purchase_orders po ON po.id = gr.purchase_order_id
      LEFT JOIN goods_receipt_lines grl ON grl.goods_receipt_id = gr.id
      GROUP BY gr.id, po.po_number, gr.receipt_number, gr.status, gr.received_at
      ORDER BY gr.received_at DESC LIMIT 30`),
    all(`SELECT qc.complaint_number, p.sku, b.batch_number, qc.severity, qc.status,
      qc.pv_escalation_status, qc.due_at
      FROM quality_complaints qc LEFT JOIN products p ON p.id = qc.product_id
      LEFT JOIN batches b ON b.id = qc.batch_id
      WHERE qc.status <> 'closed' ORDER BY qc.created_at DESC LIMIT 30`),
    all(`SELECT return_number, status, reason_code, quality_hold, created_at
      FROM returns ORDER BY created_at DESC LIMIT 30`),
    all(`SELECT o.order_number, s.shipment_number, s.status AS shipment_status,
      s.carrier_name, s.tracking_reference, s.dispatched_at, s.delivered_at,
      (SELECT MAX(de.occurred_at) FROM delivery_events de WHERE de.shipment_id = s.id)
        AS latest_carrier_event
      FROM shipments s JOIN orders o ON o.id = s.order_id
      ORDER BY s.created_at DESC LIMIT 30`),
    all(`SELECT destination_system, event_type, status, created_at
      FROM integration_events WHERE status IN ('pending','retrying','blocked')
      ORDER BY created_at DESC LIMIT 30`),
  ]);
  const newSections = [
    section("Commercial fulfilment queue",
      [["order_number","Order"],["customer","Customer"],["status","Order state","status"],
        ["customer_po_reference","PO reference"],["requested_delivery_date","Requested"]],
      orders, "No commercial order records are present in this application.",
      { source: "Enterprise order ledger (recent 30 records)",
        description: "Commercial order observation is not customer eligibility, payment, stock reservation or 3PL acceptance." }),
    section("Receiving and purchasing evidence",
      [["po_number","Purchase order"],["receipt_number","3PL receipt reference"],
        ["receipt_status","Recorded status","status"],["received_quantity","Recorded received","number"],
        ["rejected_quantity","Recorded rejected","number"],["received_at","Received"]],
      receipts, "No recorded goods receipts are present.",
      { source: "Enterprise goods-receipt ledger (recent 30 records)",
        description: "Recorded receipt is not confirmed warehouse inventory or completed quality release." }),
    section("Quality and recall observations",
      [["complaint_number","Quality case"],["sku","SKU"],["batch_number","Batch"],
        ["severity","Severity","status"],["status","Case status","status"],
        ["pv_escalation_status","Safety escalation","status"],["due_at","Due"]],
      quality, "No open complaint records are present in this sample.",
      { source: "Enterprise quality-complaint ledger (recent 30 open records)",
        description: "This is not an authoritative QMS, complete recall register or batch release." }),
    section("Return isolation review",
      [["return_number","Return"],["status","Recorded state","status"],
        ["reason_code","Reason","status"],["quality_hold","Quality hold"],["created_at","Raised"]],
      returns, "No return records are present in this sample.",
      { source: "Enterprise returns ledger (recent 30 records)",
        description: "A return or credit never automatically restores saleable inventory." }),
    section("Shipment and carrier observations",
      [["order_number","Order"],["shipment_number","Shipment"],["shipment_status","Recorded state","status"],
        ["carrier_name","Carrier"],["tracking_reference","Tracking"],
        ["latest_carrier_event","Latest event"],["delivered_at","Delivery"]],
      shipments, "No shipment events are present in this application sample.",
      { source: "Enterprise shipment and delivery event ledgers (recent 30 records)",
        description: "An observed shipment status does not establish reconciled proof of delivery." }),
    section("Integration delivery exceptions",
      [["destination_system","Destination"],["event_type","Event"],
        ["status","State","status"],["created_at","Raised"]],
      integrations, "No pending integration events are present in the recorded sample.",
      { source: "Enterprise integration-event ledger (recent 30 problem records)",
        description: "An empty sample does not certify a live or healthy external Polar Speed/UPS feed." }),
  ];
  const observed = { ...snapshot,
    readOnly: true,
    actions: [],
    sections: [...snapshot.sections, ...newSections],
  };
  const readiness = reviewWmsFiveLayerObservations(observed);
  return {
    ...observed,
    sections: [
      ...observed.sections,
      section("Five-layer control and release evidence",
        [["layer","Control layer"],["observedSampleRows","Observed sample","adaptive"],
          ["dataOrigin","Data provenance","status"],
          ["reconciliation","Independent reconciliation","status"],
          ["decision","Current authority","status"],["requiredEvidence","Required for activation"]],
        readiness.rows, "The WMS control-plane evidence is unavailable.",
        { source: "Derived from existing employee-authorised application views",
          description: "Commercial, inventory, quality, orchestration and intelligence remain separate authorities. None of these observed samples establishes readiness for release." }),
    ],
    notices: [
      ...observed.notices,
      "WMS five-layer view: sample counts are bounded at 30 records per domain and are not network-wide totals.",
      "Order, warehouse, quality, carrier and integration sources remain independently unverified. OTIF, gross contribution and physical available-to-promise are not measured by this view.",
    ],
  };
}

export function rollingWarehouseView(snapshot) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + 90);
  const todayKey = today.toISOString().slice(0, 10);
  const horizonKey = horizon.toISOString().slice(0, 10);
  const ledger = snapshot.sections.find((item) => item.title === "Inventory ledger")?.rows || [];
  const wms = reviewRecordedWarehouseLedger(ledger, { asOf: today.toISOString() });
  const expired = ledger.filter((row) => row.expiry_date && row.expiry_date < todayKey).length;
  const expiring = ledger.filter((row) => row.expiry_date && row.expiry_date >= todayKey && row.expiry_date <= horizonKey).length;
  const metrics = snapshot.metrics.filter((item) => !["expiring", "expired"].includes(item.key));
  return {
    ...snapshot,
    metrics: [
      ...metrics,
      metric("expiring", "Expiring in 90 days", expiring),
      metric("expired", "Expired batches", expired),
      metric("wms-review-flags", "Observed WMS exception flags", wms.findings.length)
    ],
    sections: [
      ...snapshot.sections,
      section(
        "Warehouse exception review",
        [["reason", "Review trigger", "status"], ["sku", "SKU"], ["batchNumber", "Batch"],
          ["locationCode", "Location"], ["expiryDate", "Expiry"], ["evidenceState", "Evidence state", "status"]],
        wms.findings.slice(0, 120),
        "No exception is visible in the recorded ledger. This is not confirmation of reconciled stock.",
        { source: "Derived from the unverified legacy inventory ledger",
          description: "Read-only exception screening; not live 3PL confirmation or a pick, pack, ATP or dispatch instruction." }
      )
    ],
    notices: [
      ...snapshot.notices,
      `Expiry posture is evaluated against the current UTC date with a rolling 90-day horizon ending ${horizonKey}; no fixed calendar cutoff is used.`,
      "WMS control tower: legacy ledger rows have not been reconciled to a trusted Polar Speed/UPS warehouse snapshot. Zero displayed exceptions does not verify stock.",
      "FEFO, temperature, recall, quarantine and batch checks are review controls only. Reservation, order release and warehouse dispatch remain disabled."
    ]
  };
}

export async function authoredAdminView(snapshot) {
  switch (snapshot.module.slug) {
    case "dashboard": return dashboardView(snapshot);
    case "local-review": return localReviewView(snapshot);
    case "users": return usersView(snapshot);
    case "content": return contentView(snapshot);
    case "analytics": return analyticsView(snapshot);
    default: throw Object.assign(new Error("Admin module requires an authored snapshot."), { statusCode: 500 });
  }
}
