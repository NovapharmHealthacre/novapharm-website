CREATE TABLE IF NOT EXISTS organization_addresses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL,
  line_1 TEXT NOT NULL,
  line_2 TEXT,
  city TEXT NOT NULL,
  region TEXT,
  postcode TEXT NOT NULL,
  country_code TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(organization_id, address_type, postcode)
);

CREATE TABLE IF NOT EXISTS product_families (
  id TEXT PRIMARY KEY,
  family_code TEXT NOT NULL UNIQUE,
  brand_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  category TEXT NOT NULL,
  public_summary TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'catalogue_only',
  source_document_checksum TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  family_id TEXT NOT NULL REFERENCES product_families(id),
  variant_code TEXT NOT NULL UNIQUE,
  public_slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  serving_text TEXT,
  formulation_json TEXT NOT NULL DEFAULT '[]',
  catalogue_page INTEGER,
  catalogue_order INTEGER NOT NULL,
  public_status TEXT NOT NULL DEFAULT 'catalogue_reference',
  claims_review_status TEXT NOT NULL DEFAULT 'not_reviewed',
  sale_status TEXT NOT NULL DEFAULT 'not_offered',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_media (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_role TEXT NOT NULL,
  source_path TEXT NOT NULL,
  fallback_path TEXT NOT NULL,
  responsive_json TEXT NOT NULL DEFAULT '{}',
  alt_text TEXT NOT NULL,
  source_checksum TEXT NOT NULL,
  source_document_checksum TEXT NOT NULL,
  licence_status TEXT NOT NULL,
  review_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(product_id, media_role)
);

CREATE TABLE IF NOT EXISTS product_claims (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  source_reference TEXT,
  evidence_status TEXT NOT NULL DEFAULT 'unverified',
  public_use_status TEXT NOT NULL DEFAULT 'blocked',
  reviewer TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(product_id, claim_text, jurisdiction)
);

CREATE TABLE IF NOT EXISTS product_composition_items (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL CHECK(sequence_number > 0),
  ingredient_name TEXT NOT NULL,
  amount_text TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'catalogue_transcription' CHECK(verification_status IN ('catalogue_transcription', 'label_confirmed', 'blocked_discrepancy')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(product_id, sequence_number),
  UNIQUE(product_id, ingredient_name, amount_text)
);

CREATE TABLE IF NOT EXISTS product_certifications (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL,
  issuer TEXT,
  external_reference TEXT,
  status TEXT NOT NULL DEFAULT 'unverified' CHECK(status IN ('unverified', 'under_review', 'verified', 'expired', 'withdrawn')),
  evidence_document_id TEXT REFERENCES documents(id),
  effective_date TEXT,
  expiry_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(product_id, certification_type, external_reference)
);

CREATE TABLE IF NOT EXISTS supplier_contacts (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(supplier_id, email)
);

CREATE TABLE IF NOT EXISTS product_supplier_links (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  relationship_type TEXT NOT NULL,
  qualification_status TEXT NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(product_id, supplier_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS price_lists (
  id TEXT PRIMARY KEY,
  price_list_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'draft',
  valid_from TEXT,
  valid_to TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id TEXT PRIMARY KEY,
  price_list_id TEXT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  unit_price_minor INTEGER NOT NULL CHECK(unit_price_minor >= 0),
  minimum_quantity INTEGER NOT NULL DEFAULT 1 CHECK(minimum_quantity > 0),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(price_list_id, product_id, minimum_quantity)
);

CREATE TABLE IF NOT EXISTS customer_price_lists (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  price_list_id TEXT NOT NULL REFERENCES price_lists(id),
  priority INTEGER NOT NULL DEFAULT 100,
  valid_from TEXT,
  valid_to TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(customer_id, price_list_id)
);

CREATE TABLE IF NOT EXISTS inventory_locations (
  id TEXT PRIMARY KEY,
  location_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL,
  ownership_status TEXT NOT NULL DEFAULT 'third_party_validation',
  operational_status TEXT NOT NULL DEFAULT 'validation_only',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_balances (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  location_id TEXT NOT NULL REFERENCES inventory_locations(id),
  on_hand_quantity INTEGER NOT NULL DEFAULT 0 CHECK(on_hand_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK(reserved_quantity >= 0),
  available_quantity INTEGER NOT NULL DEFAULT 0 CHECK(available_quantity >= 0),
  quarantine_quantity INTEGER NOT NULL DEFAULT 0 CHECK(quarantine_quantity >= 0),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  UNIQUE(product_id, batch_id, location_id),
  CHECK(reserved_quantity + available_quantity + quarantine_quantity <= on_hand_quantity)
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id TEXT PRIMARY KEY,
  order_line_id TEXT NOT NULL REFERENCES order_lines(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL REFERENCES batches(id),
  location_id TEXT NOT NULL REFERENCES inventory_locations(id),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  status TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  released_at TEXT,
  UNIQUE(order_line_id, batch_id, location_id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  batch_id TEXT REFERENCES batches(id),
  location_id TEXT REFERENCES inventory_locations(id),
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity <> 0),
  balance_after INTEGER,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  shipment_number TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES orders(id),
  status TEXT NOT NULL,
  carrier_name TEXT,
  tracking_reference TEXT,
  dispatched_at TEXT,
  delivered_at TEXT,
  proof_of_delivery_document_id TEXT REFERENCES documents(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipment_lines (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_line_id TEXT NOT NULL REFERENCES order_lines(id),
  batch_id TEXT REFERENCES batches(id),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  UNIQUE(shipment_id, order_line_id, batch_id)
);

CREATE TABLE IF NOT EXISTS delivery_events (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_code TEXT NOT NULL,
  event_status TEXT NOT NULL,
  event_location TEXT,
  external_reference TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  return_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  order_id TEXT REFERENCES orders(id),
  status TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  quality_hold INTEGER NOT NULL DEFAULT 1 CHECK(quality_hold IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS return_lines (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  batch_id TEXT REFERENCES batches(id),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  disposition TEXT NOT NULL DEFAULT 'pending',
  UNIQUE(return_id, product_id, batch_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  invoice_id TEXT REFERENCES invoices(id),
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  payment_method TEXT NOT NULL,
  reference TEXT,
  status TEXT NOT NULL,
  received_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_notes (
  id TEXT PRIMARY KEY,
  credit_note_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  invoice_id TEXT REFERENCES invoices(id),
  return_id TEXT REFERENCES returns(id),
  status TEXT NOT NULL CHECK(status IN ('draft', 'approved', 'issued', 'cancelled')),
  issue_date TEXT,
  total_minor INTEGER NOT NULL CHECK(total_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_note_lines (
  id TEXT PRIMARY KEY,
  credit_note_id TEXT NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_amount_minor INTEGER NOT NULL CHECK(unit_amount_minor >= 0),
  line_total_minor INTEGER NOT NULL CHECK(line_total_minor >= 0)
);

CREATE TABLE IF NOT EXISTS customer_statements (
  id TEXT PRIMARY KEY,
  statement_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  opening_balance_minor INTEGER NOT NULL,
  closing_balance_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  document_id TEXT REFERENCES documents(id),
  generated_at TEXT NOT NULL,
  UNIQUE(customer_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS statement_lines (
  id TEXT PRIMARY KEY,
  statement_id TEXT NOT NULL REFERENCES customer_statements(id) ON DELETE CASCADE,
  line_date TEXT NOT NULL,
  line_type TEXT NOT NULL,
  reference TEXT NOT NULL,
  description TEXT NOT NULL,
  debit_minor INTEGER NOT NULL DEFAULT 0,
  credit_minor INTEGER NOT NULL DEFAULT 0,
  running_balance_minor INTEGER NOT NULL,
  CHECK(debit_minor >= 0 AND credit_minor >= 0 AND NOT(debit_minor > 0 AND credit_minor > 0))
);

CREATE TABLE IF NOT EXISTS purchase_order_status_history (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id TEXT PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  status TEXT NOT NULL,
  received_at TEXT,
  received_by TEXT,
  document_id TEXT REFERENCES documents(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goods_receipt_lines (
  id TEXT PRIMARY KEY,
  goods_receipt_id TEXT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id TEXT NOT NULL REFERENCES purchase_order_lines(id),
  batch_id TEXT REFERENCES batches(id),
  quantity_received INTEGER NOT NULL CHECK(quantity_received > 0),
  quantity_rejected INTEGER NOT NULL DEFAULT 0 CHECK(quantity_rejected >= 0),
  UNIQUE(goods_receipt_id, purchase_order_line_id, batch_id)
);

CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY,
  supplier_invoice_number TEXT NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  purchase_order_id TEXT REFERENCES purchase_orders(id),
  status TEXT NOT NULL,
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  total_minor INTEGER NOT NULL CHECK(total_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  document_id TEXT REFERENCES documents(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(supplier_id, supplier_invoice_number)
);

CREATE TABLE IF NOT EXISTS invoice_matches (
  id TEXT PRIMARY KEY,
  supplier_invoice_id TEXT NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
  goods_receipt_id TEXT REFERENCES goods_receipts(id),
  match_status TEXT NOT NULL,
  variance_minor INTEGER NOT NULL DEFAULT 0,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(supplier_invoice_id, purchase_order_id, goods_receipt_id)
);

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id TEXT PRIMARY KEY,
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  journal_number TEXT NOT NULL UNIQUE,
  journal_date TEXT NOT NULL,
  description TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  prepared_by TEXT NOT NULL,
  approved_by TEXT,
  posted_at TEXT,
  correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(approved_by IS NULL OR approved_by <> prepared_by)
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  ledger_account_id TEXT NOT NULL REFERENCES ledger_accounts(id),
  customer_id TEXT REFERENCES customers(id),
  supplier_id TEXT REFERENCES suppliers(id),
  description TEXT,
  debit_minor INTEGER NOT NULL DEFAULT 0,
  credit_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  CHECK(debit_minor >= 0 AND credit_minor >= 0),
  CHECK((debit_minor > 0 AND credit_minor = 0) OR (credit_minor > 0 AND debit_minor = 0))
);

CREATE TABLE IF NOT EXISTS quality_complaints (
  id TEXT PRIMARY KEY,
  complaint_number TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES customers(id),
  order_id TEXT REFERENCES orders(id),
  product_id TEXT REFERENCES products(id),
  batch_id TEXT REFERENCES batches(id),
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT NOT NULL,
  safety_information_present INTEGER NOT NULL DEFAULT 0 CHECK(safety_information_present IN (0, 1)),
  pv_escalation_status TEXT NOT NULL DEFAULT 'not_required',
  owner_user_id TEXT REFERENCES users(id),
  due_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quality_actions (
  id TEXT PRIMARY KEY,
  complaint_id TEXT REFERENCES quality_complaints(id) ON DELETE CASCADE,
  quality_record_id TEXT REFERENCES quality_records(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  owner_user_id TEXT REFERENCES users(id),
  status TEXT NOT NULL,
  due_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quality_deviations (
  id TEXT PRIMARY KEY,
  deviation_number TEXT NOT NULL UNIQUE,
  product_id TEXT REFERENCES products(id),
  batch_id TEXT REFERENCES batches(id),
  supplier_id TEXT REFERENCES suppliers(id),
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT NOT NULL,
  root_cause_status TEXT NOT NULL DEFAULT 'not_started',
  owner_user_id TEXT REFERENCES users(id),
  due_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS change_controls (
  id TEXT PRIMARY KEY,
  change_number TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT NOT NULL,
  implementation_date TEXT,
  owner_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS capa_records (
  id TEXT PRIMARY KEY,
  capa_number TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  effectiveness_status TEXT NOT NULL DEFAULT 'not_assessed',
  status TEXT NOT NULL,
  owner_user_id TEXT REFERENCES users(id),
  due_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recall_records (
  id TEXT PRIMARY KEY,
  recall_number TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES products(id),
  batch_id TEXT REFERENCES batches(id),
  classification TEXT,
  status TEXT NOT NULL,
  authority_reference TEXT,
  initiated_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS regulatory_cases (
  id TEXT PRIMARY KEY,
  case_number TEXT NOT NULL UNIQUE,
  product_id TEXT REFERENCES products(id),
  case_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  authority TEXT,
  status TEXT NOT NULL,
  current_stage TEXT NOT NULL,
  external_reference TEXT,
  target_date TEXT,
  owner_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS regulatory_milestones (
  id TEXT PRIMARY KEY,
  regulatory_case_id TEXT NOT NULL REFERENCES regulatory_cases(id) ON DELETE CASCADE,
  milestone_code TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  due_at TEXT,
  completed_at TEXT,
  evidence_document_id TEXT REFERENCES documents(id),
  created_at TEXT NOT NULL,
  UNIQUE(regulatory_case_id, milestone_code)
);

CREATE TABLE IF NOT EXISTS pharmacovigilance_cases (
  id TEXT PRIMARY KEY,
  case_number TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  case_status TEXT NOT NULL,
  controlled_system_reference TEXT,
  received_at TEXT NOT NULL,
  transferred_at TEXT,
  created_at TEXT NOT NULL,
  CHECK(source_type <> 'general_contact_form')
);

CREATE TABLE IF NOT EXISTS crm_opportunities (
  id TEXT PRIMARY KEY,
  opportunity_number TEXT NOT NULL UNIQUE,
  lead_id TEXT REFERENCES leads(id),
  organization_id TEXT REFERENCES organizations(id),
  customer_id TEXT REFERENCES customers(id),
  name TEXT NOT NULL,
  opportunity_type TEXT NOT NULL,
  stage TEXT NOT NULL,
  probability_basis_points INTEGER NOT NULL DEFAULT 0 CHECK(probability_basis_points BETWEEN 0 AND 10000),
  estimated_value_minor INTEGER CHECK(estimated_value_minor IS NULL OR estimated_value_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  owner_user_id TEXT REFERENCES users(id),
  next_action TEXT,
  next_action_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_stage_history (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK(version_number > 0),
  storage_path TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  change_summary TEXT,
  lifecycle_status TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(document_id, version_number)
);

CREATE TABLE IF NOT EXISTS document_approvals (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_version_id TEXT REFERENCES document_versions(id),
  stage TEXT NOT NULL,
  outcome TEXT,
  requested_by TEXT NOT NULL,
  decided_by TEXT,
  comments TEXT,
  requested_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS workflow_instances (
  id TEXT PRIMARY KEY,
  workflow_code TEXT NOT NULL,
  business_key TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_step TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  started_by TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(workflow_code, business_key)
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id TEXT PRIMARY KEY,
  workflow_instance_id TEXT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_code TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  actor TEXT,
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT,
  completed_at TEXT,
  UNIQUE(workflow_instance_id, step_code)
);

CREATE TABLE IF NOT EXISTS domain_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_version INTEGER NOT NULL,
  correlation_id TEXT NOT NULL,
  causation_id TEXT,
  actor TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  UNIQUE(aggregate_type, aggregate_id, aggregate_version, event_type)
);

CREATE TABLE IF NOT EXISTS outbox_messages (
  id TEXT PRIMARY KEY,
  domain_event_id TEXT NOT NULL REFERENCES domain_events(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  message_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT,
  UNIQUE(destination, idempotency_key)
);

CREATE TABLE IF NOT EXISTS catalogue_imports (
  id TEXT PRIMARY KEY,
  catalogue_code TEXT NOT NULL,
  catalogue_version TEXT NOT NULL,
  source_checksum_sha256 TEXT NOT NULL,
  register_checksum_sha256 TEXT NOT NULL,
  product_count INTEGER NOT NULL CHECK(product_count > 0),
  status TEXT NOT NULL CHECK(status IN ('validated', 'imported', 'failed')),
  validation_json TEXT NOT NULL DEFAULT '{}',
  imported_by TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  UNIQUE(catalogue_code, catalogue_version, source_checksum_sha256, register_checksum_sha256)
);

CREATE TABLE IF NOT EXISTS catalogue_import_items (
  id TEXT PRIMARY KEY,
  catalogue_import_id TEXT NOT NULL REFERENCES catalogue_imports(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  source_record_id TEXT NOT NULL,
  source_record_checksum_sha256 TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('created', 'updated', 'unchanged')),
  created_at TEXT NOT NULL,
  UNIQUE(catalogue_import_id, source_record_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role_scope TEXT NOT NULL CHECK(role_scope IN ('customer', 'employee', 'board', 'admin')),
  module_code TEXT NOT NULL,
  permission_code TEXT NOT NULL,
  effect TEXT NOT NULL DEFAULT 'allow' CHECK(effect IN ('allow', 'deny')),
  created_at TEXT NOT NULL,
  UNIQUE(role_scope, module_code, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_family ON product_variants(family_id, catalogue_order);
CREATE INDEX IF NOT EXISTS idx_product_claims_review ON product_claims(evidence_status, public_use_status);
CREATE INDEX IF NOT EXISTS idx_product_composition_product ON product_composition_items(product_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_product ON inventory_balances(product_id, available_quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order ON inventory_reservations(order_line_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id, received_at);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_quality_complaints_status ON quality_complaints(status, severity, due_at);
CREATE INDEX IF NOT EXISTS idx_quality_deviations_status ON quality_deviations(status, severity, due_at);
CREATE INDEX IF NOT EXISTS idx_regulatory_cases_status ON regulatory_cases(status, target_date);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm_opportunities(stage, next_action_at);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(workflow_code, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate ON domain_events(aggregate_type, aggregate_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_outbox_delivery ON outbox_messages(status, destination, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_catalogue_imports_source ON catalogue_imports(catalogue_code, catalogue_version, imported_at);
