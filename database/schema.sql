PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  company_number TEXT,
  vat_number TEXT,
  country_code TEXT NOT NULL DEFAULT 'GB',
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'novapharm',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  customer_number TEXT NOT NULL UNIQUE,
  customer_type TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL,
  credit_limit_minor INTEGER NOT NULL DEFAULT 0,
  outstanding_balance_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'novapharm',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  supplier_number TEXT NOT NULL UNIQUE,
  supplier_type TEXT NOT NULL,
  qualification_status TEXT NOT NULL,
  gdp_status TEXT NOT NULL DEFAULT 'not_assessed',
  gmp_status TEXT NOT NULL DEFAULT 'not_assessed',
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'novapharm',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  ean TEXT,
  gtin TEXT UNIQUE,
  product_name TEXT NOT NULL,
  strength TEXT,
  dosage_form TEXT,
  pack_size TEXT,
  manufacturer TEXT,
  country_of_origin TEXT,
  list_price_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  regulatory_status TEXT NOT NULL DEFAULT 'draft',
  marketing_status TEXT NOT NULL DEFAULT 'not_marketed',
  mhra_status TEXT NOT NULL DEFAULT 'not_assessed',
  lifecycle_status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'novapharm',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  supplier_id TEXT REFERENCES suppliers(id),
  batch_number TEXT NOT NULL,
  manufacture_date TEXT,
  expiry_date TEXT NOT NULL,
  release_status TEXT NOT NULL DEFAULT 'quarantine',
  quantity_available INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(product_id, batch_number)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL,
  requested_delivery_date TEXT,
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  customer_po_reference TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'novapharm',
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_lines (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_price_minor INTEGER NOT NULL CHECK(unit_price_minor >= 0),
  discount_basis_points INTEGER NOT NULL DEFAULT 0,
  line_total_minor INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  order_id TEXT REFERENCES orders(id),
  status TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  total_minor INTEGER NOT NULL,
  outstanding_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  finance_external_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  product_id TEXT REFERENCES products(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_minor INTEGER NOT NULL,
  line_total_minor INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  status TEXT NOT NULL,
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  expected_date TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_cost_minor INTEGER NOT NULL CHECK(unit_cost_minor >= 0),
  line_total_minor INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  entra_object_id TEXT UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id),
  employee_number TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  manager_employee_id TEXT REFERENCES employees(id),
  employment_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  document_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  document_class TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'draft',
  retention_class TEXT NOT NULL DEFAULT 'business_7_years',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_links (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(document_id, entity_type, entity_id, relationship)
);

CREATE TABLE IF NOT EXISTS sharepoint_links (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id),
  entity_type TEXT,
  entity_id TEXT,
  site_id TEXT NOT NULL,
  drive_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  web_url TEXT,
  checksum_sha256 TEXT,
  sync_status TEXT NOT NULL,
  last_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(site_id, drive_id, item_id)
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  workflow_type TEXT NOT NULL,
  stage TEXT NOT NULL,
  outcome TEXT,
  actor_user_id TEXT REFERENCES users(id),
  comments TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS regulatory_records (
  id TEXT PRIMARY KEY,
  regulatory_number TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  authority TEXT NOT NULL,
  record_type TEXT NOT NULL,
  external_reference TEXT,
  status TEXT NOT NULL,
  effective_date TEXT,
  expiry_date TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quality_records (
  id TEXT PRIMARY KEY,
  quality_number TEXT NOT NULL UNIQUE,
  record_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  product_id TEXT REFERENCES products(id),
  batch_id TEXT REFERENCES batches(id),
  customer_id TEXT REFERENCES customers(id),
  supplier_id TEXT REFERENCES suppliers(id),
  owner_user_id TEXT REFERENCES users(id),
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  batch_id TEXT REFERENCES batches(id),
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  location_code TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  occurred_at TEXT NOT NULL,
  source_system TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS warehouse_transactions (
  id TEXT PRIMARY KEY,
  transaction_type TEXT NOT NULL,
  external_reference TEXT,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL,
  source_system TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_activities (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  supplier_id TEXT REFERENCES suppliers(id),
  activity_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  notes TEXT,
  owner_user_id TEXT REFERENCES users(id),
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  enquiry_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  owner_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES customers(id),
  requester_user_id TEXT REFERENCES users(id),
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  order_id TEXT REFERENCES orders(id),
  product_id TEXT REFERENCES products(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  template_code TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS account_applications (
  id TEXT PRIMARY KEY,
  application_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  company_json TEXT NOT NULL,
  responsible_people_json TEXT NOT NULL DEFAULT '[]',
  addresses_json TEXT NOT NULL DEFAULT '[]',
  compliance_json TEXT NOT NULL DEFAULT '{}',
  bank_json TEXT NOT NULL DEFAULT '{}',
  submitted_by_email TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  course_code TEXT NOT NULL,
  course_version TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  completed_at TEXT,
  result TEXT,
  document_id TEXT REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS integration_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'novapharm',
  destination_system TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT,
  UNIQUE(destination_system, idempotency_key)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  before_hash TEXT,
  after_hash TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  counter_key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON document_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_delivery ON integration_events(status, next_attempt_at, destination_system);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_products_search ON products(product_name, sku, gtin);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, created_at);
