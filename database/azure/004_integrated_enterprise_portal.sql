IF OBJECT_ID(N'dbo.organization_addresses', N'U') IS NULL
CREATE TABLE dbo.organization_addresses (
  id nvarchar(64) NOT NULL PRIMARY KEY,
  organization_id nvarchar(64) NOT NULL REFERENCES dbo.organizations(id) ON DELETE CASCADE,
  address_type nvarchar(64) NOT NULL, line_1 nvarchar(300) NOT NULL, line_2 nvarchar(300) NULL,
  city nvarchar(160) NOT NULL, region nvarchar(160) NULL, postcode nvarchar(32) NOT NULL,
  country_code nchar(2) NOT NULL, is_primary bit NOT NULL CONSTRAINT DF_organization_addresses_primary DEFAULT 0,
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT UQ_organization_addresses UNIQUE(organization_id, address_type, postcode)
);
GO

IF OBJECT_ID(N'dbo.product_families', N'U') IS NULL
CREATE TABLE dbo.product_families (
  id nvarchar(64) NOT NULL PRIMARY KEY, family_code nvarchar(80) NOT NULL UNIQUE,
  brand_name nvarchar(160) NOT NULL, family_name nvarchar(240) NOT NULL, category nvarchar(120) NOT NULL,
  public_summary nvarchar(1200) NULL, lifecycle_status nvarchar(64) NOT NULL CONSTRAINT DF_product_families_lifecycle DEFAULT N'catalogue_only',
  source_document_checksum char(64) NULL, created_at datetime2(3) NOT NULL, created_by nvarchar(160) NOT NULL,
  updated_at datetime2(3) NOT NULL, updated_by nvarchar(160) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.product_variants', N'U') IS NULL
CREATE TABLE dbo.product_variants (
  id nvarchar(64) NOT NULL PRIMARY KEY, product_id nvarchar(64) NOT NULL UNIQUE REFERENCES dbo.products(id) ON DELETE CASCADE,
  family_id nvarchar(64) NOT NULL REFERENCES dbo.product_families(id), variant_code nvarchar(80) NOT NULL UNIQUE,
  public_slug nvarchar(200) NOT NULL UNIQUE, display_name nvarchar(300) NOT NULL, short_name nvarchar(200) NOT NULL,
  serving_text nvarchar(500) NULL, formulation_json nvarchar(max) NOT NULL CONSTRAINT DF_product_variants_formulation DEFAULT N'[]',
  catalogue_page int NULL, catalogue_order int NOT NULL, public_status nvarchar(64) NOT NULL CONSTRAINT DF_product_variants_public DEFAULT N'catalogue_reference',
  claims_review_status nvarchar(64) NOT NULL CONSTRAINT DF_product_variants_claims DEFAULT N'not_reviewed',
  sale_status nvarchar(64) NOT NULL CONSTRAINT DF_product_variants_sale DEFAULT N'not_offered',
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.product_media', N'U') IS NULL
CREATE TABLE dbo.product_media (
  id nvarchar(64) NOT NULL PRIMARY KEY, product_id nvarchar(64) NOT NULL REFERENCES dbo.products(id) ON DELETE CASCADE,
  media_role nvarchar(64) NOT NULL, source_path nvarchar(700) NOT NULL, fallback_path nvarchar(700) NOT NULL,
  responsive_json nvarchar(max) NOT NULL CONSTRAINT DF_product_media_responsive DEFAULT N'{}', alt_text nvarchar(500) NOT NULL,
  source_checksum char(64) NOT NULL, source_document_checksum char(64) NOT NULL,
  licence_status nvarchar(80) NOT NULL, review_status nvarchar(80) NOT NULL,
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT UQ_product_media_role UNIQUE(product_id, media_role)
);
GO

IF OBJECT_ID(N'dbo.product_claims', N'U') IS NULL
CREATE TABLE dbo.product_claims (
  id nvarchar(64) NOT NULL PRIMARY KEY, product_id nvarchar(64) NOT NULL REFERENCES dbo.products(id) ON DELETE CASCADE,
  claim_text nvarchar(1200) NOT NULL, claim_type nvarchar(80) NOT NULL, jurisdiction nvarchar(80) NOT NULL,
  source_reference nvarchar(700) NULL, evidence_status nvarchar(64) NOT NULL CONSTRAINT DF_product_claims_evidence DEFAULT N'unverified',
  public_use_status nvarchar(64) NOT NULL CONSTRAINT DF_product_claims_public DEFAULT N'blocked', reviewer nvarchar(160) NULL,
  reviewed_at datetime2(3) NULL, created_at datetime2(3) NOT NULL,
  CONSTRAINT UQ_product_claims UNIQUE(product_id, claim_text, jurisdiction)
);
GO

IF OBJECT_ID(N'dbo.product_composition_items', N'U') IS NULL
CREATE TABLE dbo.product_composition_items (
  id nvarchar(64) NOT NULL PRIMARY KEY, product_id nvarchar(64) NOT NULL REFERENCES dbo.products(id) ON DELETE CASCADE,
  sequence_number int NOT NULL, ingredient_name nvarchar(300) NOT NULL, amount_text nvarchar(160) NOT NULL,
  source_reference nvarchar(700) NOT NULL, verification_status nvarchar(64) NOT NULL CONSTRAINT DF_product_composition_verification DEFAULT N'catalogue_transcription',
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT CK_product_composition_sequence CHECK(sequence_number > 0),
  CONSTRAINT CK_product_composition_verification CHECK(verification_status IN (N'catalogue_transcription', N'label_confirmed', N'blocked_discrepancy')),
  CONSTRAINT UQ_product_composition_sequence UNIQUE(product_id, sequence_number),
  CONSTRAINT UQ_product_composition_identity UNIQUE(product_id, ingredient_name, amount_text)
);
GO

IF OBJECT_ID(N'dbo.product_certifications', N'U') IS NULL
CREATE TABLE dbo.product_certifications (
  id nvarchar(64) NOT NULL PRIMARY KEY, product_id nvarchar(64) NOT NULL REFERENCES dbo.products(id) ON DELETE CASCADE,
  certification_type nvarchar(160) NOT NULL, issuer nvarchar(240) NULL, external_reference nvarchar(240) NULL,
  status nvarchar(64) NOT NULL CONSTRAINT DF_product_certifications_status DEFAULT N'unverified',
  evidence_document_id nvarchar(64) NULL REFERENCES dbo.documents(id), effective_date date NULL, expiry_date date NULL,
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT CK_product_certifications_status CHECK(status IN (N'unverified', N'under_review', N'verified', N'expired', N'withdrawn')),
  CONSTRAINT UQ_product_certifications UNIQUE(product_id, certification_type, external_reference)
);
GO

IF OBJECT_ID(N'dbo.supplier_contacts', N'U') IS NULL
CREATE TABLE dbo.supplier_contacts (
  id nvarchar(64) NOT NULL PRIMARY KEY, supplier_id nvarchar(64) NOT NULL REFERENCES dbo.suppliers(id) ON DELETE CASCADE,
  name nvarchar(240) NOT NULL, role_title nvarchar(240) NOT NULL, email nvarchar(320) NOT NULL, telephone nvarchar(80) NULL,
  is_primary bit NOT NULL CONSTRAINT DF_supplier_contacts_primary DEFAULT 0, status nvarchar(64) NOT NULL CONSTRAINT DF_supplier_contacts_status DEFAULT N'active',
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL, CONSTRAINT UQ_supplier_contacts UNIQUE(supplier_id, email)
);
GO

IF OBJECT_ID(N'dbo.product_supplier_links', N'U') IS NULL
CREATE TABLE dbo.product_supplier_links (
  id nvarchar(64) NOT NULL PRIMARY KEY, product_id nvarchar(64) NOT NULL REFERENCES dbo.products(id) ON DELETE CASCADE,
  supplier_id nvarchar(64) NOT NULL REFERENCES dbo.suppliers(id), relationship_type nvarchar(80) NOT NULL,
  qualification_status nvarchar(80) NOT NULL, valid_from date NULL, valid_to date NULL,
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT UQ_product_supplier_links UNIQUE(product_id, supplier_id, relationship_type)
);
GO

IF OBJECT_ID(N'dbo.price_lists', N'U') IS NULL
CREATE TABLE dbo.price_lists (
  id nvarchar(64) NOT NULL PRIMARY KEY, price_list_code nvarchar(80) NOT NULL UNIQUE, name nvarchar(240) NOT NULL,
  currency nchar(3) NOT NULL CONSTRAINT DF_price_lists_currency DEFAULT N'GBP', status nvarchar(64) NOT NULL CONSTRAINT DF_price_lists_status DEFAULT N'draft',
  valid_from date NULL, valid_to date NULL, version int NOT NULL CONSTRAINT DF_price_lists_version DEFAULT 1,
  created_at datetime2(3) NOT NULL, created_by nvarchar(160) NOT NULL, updated_at datetime2(3) NOT NULL, updated_by nvarchar(160) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.price_list_items', N'U') IS NULL
CREATE TABLE dbo.price_list_items (
  id nvarchar(64) NOT NULL PRIMARY KEY, price_list_id nvarchar(64) NOT NULL REFERENCES dbo.price_lists(id) ON DELETE CASCADE,
  product_id nvarchar(64) NOT NULL REFERENCES dbo.products(id), unit_price_minor bigint NOT NULL,
  minimum_quantity int NOT NULL CONSTRAINT DF_price_list_items_quantity DEFAULT 1,
  status nvarchar(64) NOT NULL CONSTRAINT DF_price_list_items_status DEFAULT N'draft',
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT CK_price_list_items_price CHECK(unit_price_minor >= 0),
  CONSTRAINT CK_price_list_items_quantity CHECK(minimum_quantity > 0),
  CONSTRAINT UQ_price_list_items UNIQUE(price_list_id, product_id, minimum_quantity)
);
GO

IF OBJECT_ID(N'dbo.customer_price_lists', N'U') IS NULL
CREATE TABLE dbo.customer_price_lists (
  id nvarchar(64) NOT NULL PRIMARY KEY, customer_id nvarchar(64) NOT NULL REFERENCES dbo.customers(id) ON DELETE CASCADE,
  price_list_id nvarchar(64) NOT NULL REFERENCES dbo.price_lists(id), priority int NOT NULL CONSTRAINT DF_customer_price_lists_priority DEFAULT 100,
  valid_from date NULL, valid_to date NULL, created_at datetime2(3) NOT NULL,
  CONSTRAINT UQ_customer_price_lists UNIQUE(customer_id, price_list_id)
);
GO

IF OBJECT_ID(N'dbo.inventory_locations', N'U') IS NULL
CREATE TABLE dbo.inventory_locations (
  id nvarchar(64) NOT NULL PRIMARY KEY, location_code nvarchar(80) NOT NULL UNIQUE, name nvarchar(240) NOT NULL,
  location_type nvarchar(80) NOT NULL, ownership_status nvarchar(80) NOT NULL CONSTRAINT DF_inventory_locations_owner DEFAULT N'third_party_validation',
  operational_status nvarchar(80) NOT NULL CONSTRAINT DF_inventory_locations_status DEFAULT N'validation_only',
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.inventory_balances', N'U') IS NULL
CREATE TABLE dbo.inventory_balances (
  id nvarchar(64) NOT NULL PRIMARY KEY, product_id nvarchar(64) NOT NULL REFERENCES dbo.products(id),
  batch_id nvarchar(64) NOT NULL REFERENCES dbo.batches(id), location_id nvarchar(64) NOT NULL REFERENCES dbo.inventory_locations(id),
  on_hand_quantity int NOT NULL CONSTRAINT DF_inventory_balances_on_hand DEFAULT 0,
  reserved_quantity int NOT NULL CONSTRAINT DF_inventory_balances_reserved DEFAULT 0,
  available_quantity int NOT NULL CONSTRAINT DF_inventory_balances_available DEFAULT 0,
  quarantine_quantity int NOT NULL CONSTRAINT DF_inventory_balances_quarantine DEFAULT 0,
  version int NOT NULL CONSTRAINT DF_inventory_balances_version DEFAULT 1, updated_at datetime2(3) NOT NULL,
  CONSTRAINT UQ_inventory_balances UNIQUE(product_id, batch_id, location_id),
  CONSTRAINT CK_inventory_balances_nonnegative CHECK(on_hand_quantity >= 0 AND reserved_quantity >= 0 AND available_quantity >= 0 AND quarantine_quantity >= 0),
  CONSTRAINT CK_inventory_balances_total CHECK(reserved_quantity + available_quantity + quarantine_quantity <= on_hand_quantity)
);
GO

IF OBJECT_ID(N'dbo.inventory_reservations', N'U') IS NULL
CREATE TABLE dbo.inventory_reservations (
  id nvarchar(64) NOT NULL PRIMARY KEY, order_line_id nvarchar(64) NOT NULL REFERENCES dbo.order_lines(id) ON DELETE CASCADE,
  batch_id nvarchar(64) NOT NULL REFERENCES dbo.batches(id), location_id nvarchar(64) NOT NULL REFERENCES dbo.inventory_locations(id),
  quantity int NOT NULL, status nvarchar(64) NOT NULL, expires_at datetime2(3) NULL, created_at datetime2(3) NOT NULL, released_at datetime2(3) NULL,
  CONSTRAINT CK_inventory_reservations_quantity CHECK(quantity > 0),
  CONSTRAINT UQ_inventory_reservations UNIQUE(order_line_id, batch_id, location_id)
);
GO

IF OBJECT_ID(N'dbo.inventory_movements', N'U') IS NULL
CREATE TABLE dbo.inventory_movements (
  id nvarchar(64) NOT NULL PRIMARY KEY, product_id nvarchar(64) NOT NULL REFERENCES dbo.products(id), batch_id nvarchar(64) NULL REFERENCES dbo.batches(id),
  location_id nvarchar(64) NULL REFERENCES dbo.inventory_locations(id), movement_type nvarchar(80) NOT NULL, quantity int NOT NULL,
  balance_after int NULL, reference_type nvarchar(80) NOT NULL, reference_id nvarchar(80) NOT NULL,
  actor nvarchar(160) NOT NULL, correlation_id nvarchar(64) NOT NULL, occurred_at datetime2(3) NOT NULL,
  CONSTRAINT CK_inventory_movements_quantity CHECK(quantity <> 0)
);
GO

IF OBJECT_ID(N'dbo.order_status_history', N'U') IS NULL
CREATE TABLE dbo.order_status_history (
  id nvarchar(64) NOT NULL PRIMARY KEY, order_id nvarchar(64) NOT NULL REFERENCES dbo.orders(id) ON DELETE CASCADE,
  from_status nvarchar(64) NULL, to_status nvarchar(64) NOT NULL, actor nvarchar(160) NOT NULL,
  reason nvarchar(1000) NULL, occurred_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.shipments', N'U') IS NULL
CREATE TABLE dbo.shipments (
  id nvarchar(64) NOT NULL PRIMARY KEY, shipment_number nvarchar(80) NOT NULL UNIQUE, order_id nvarchar(64) NOT NULL REFERENCES dbo.orders(id),
  status nvarchar(64) NOT NULL, carrier_name nvarchar(240) NULL, tracking_reference nvarchar(240) NULL,
  dispatched_at datetime2(3) NULL, delivered_at datetime2(3) NULL, proof_of_delivery_document_id nvarchar(64) NULL REFERENCES dbo.documents(id),
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.shipment_lines', N'U') IS NULL
CREATE TABLE dbo.shipment_lines (
  id nvarchar(64) NOT NULL PRIMARY KEY, shipment_id nvarchar(64) NOT NULL REFERENCES dbo.shipments(id) ON DELETE CASCADE,
  order_line_id nvarchar(64) NOT NULL REFERENCES dbo.order_lines(id), batch_id nvarchar(64) NULL REFERENCES dbo.batches(id), quantity int NOT NULL,
  CONSTRAINT CK_shipment_lines_quantity CHECK(quantity > 0), CONSTRAINT UQ_shipment_lines UNIQUE(shipment_id, order_line_id, batch_id)
);
GO

IF OBJECT_ID(N'dbo.delivery_events', N'U') IS NULL
CREATE TABLE dbo.delivery_events (
  id nvarchar(64) NOT NULL PRIMARY KEY, shipment_id nvarchar(64) NOT NULL REFERENCES dbo.shipments(id) ON DELETE CASCADE,
  event_code nvarchar(80) NOT NULL, event_status nvarchar(80) NOT NULL, event_location nvarchar(300) NULL,
  external_reference nvarchar(240) NULL, payload_json nvarchar(max) NOT NULL CONSTRAINT DF_delivery_events_payload DEFAULT N'{}',
  occurred_at datetime2(3) NOT NULL, created_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.returns', N'U') IS NULL
CREATE TABLE dbo.returns (
  id nvarchar(64) NOT NULL PRIMARY KEY, return_number nvarchar(80) NOT NULL UNIQUE, customer_id nvarchar(64) NOT NULL REFERENCES dbo.customers(id),
  order_id nvarchar(64) NULL REFERENCES dbo.orders(id), status nvarchar(64) NOT NULL, reason_code nvarchar(80) NOT NULL,
  quality_hold bit NOT NULL CONSTRAINT DF_returns_quality_hold DEFAULT 1, created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.return_lines', N'U') IS NULL
CREATE TABLE dbo.return_lines (
  id nvarchar(64) NOT NULL PRIMARY KEY, return_id nvarchar(64) NOT NULL REFERENCES dbo.returns(id) ON DELETE CASCADE,
  product_id nvarchar(64) NOT NULL REFERENCES dbo.products(id), batch_id nvarchar(64) NULL REFERENCES dbo.batches(id),
  quantity int NOT NULL, disposition nvarchar(64) NOT NULL CONSTRAINT DF_return_lines_disposition DEFAULT N'pending',
  CONSTRAINT CK_return_lines_quantity CHECK(quantity > 0), CONSTRAINT UQ_return_lines UNIQUE(return_id, product_id, batch_id)
);
GO

IF OBJECT_ID(N'dbo.payments', N'U') IS NULL
CREATE TABLE dbo.payments (
  id nvarchar(64) NOT NULL PRIMARY KEY, payment_number nvarchar(80) NOT NULL UNIQUE, customer_id nvarchar(64) NOT NULL REFERENCES dbo.customers(id),
  invoice_id nvarchar(64) NULL REFERENCES dbo.invoices(id), amount_minor bigint NOT NULL, currency nchar(3) NOT NULL CONSTRAINT DF_payments_currency DEFAULT N'GBP',
  payment_method nvarchar(80) NOT NULL, reference nvarchar(240) NULL, status nvarchar(64) NOT NULL,
  received_at datetime2(3) NULL, created_at datetime2(3) NOT NULL, CONSTRAINT CK_payments_amount CHECK(amount_minor > 0)
);
GO

IF OBJECT_ID(N'dbo.credit_notes', N'U') IS NULL
CREATE TABLE dbo.credit_notes (
  id nvarchar(64) NOT NULL PRIMARY KEY, credit_note_number nvarchar(80) NOT NULL UNIQUE,
  customer_id nvarchar(64) NOT NULL REFERENCES dbo.customers(id), invoice_id nvarchar(64) NULL REFERENCES dbo.invoices(id),
  return_id nvarchar(64) NULL REFERENCES dbo.returns(id), status nvarchar(64) NOT NULL, issue_date date NULL,
  total_minor bigint NOT NULL, currency nchar(3) NOT NULL CONSTRAINT DF_credit_notes_currency DEFAULT N'GBP',
  reason nvarchar(1200) NOT NULL, created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT CK_credit_notes_status CHECK(status IN (N'draft', N'approved', N'issued', N'cancelled')),
  CONSTRAINT CK_credit_notes_total CHECK(total_minor >= 0)
);
GO

IF OBJECT_ID(N'dbo.credit_note_lines', N'U') IS NULL
CREATE TABLE dbo.credit_note_lines (
  id nvarchar(64) NOT NULL PRIMARY KEY, credit_note_id nvarchar(64) NOT NULL REFERENCES dbo.credit_notes(id) ON DELETE CASCADE,
  product_id nvarchar(64) NULL REFERENCES dbo.products(id), description nvarchar(500) NOT NULL, quantity int NOT NULL,
  unit_amount_minor bigint NOT NULL, line_total_minor bigint NOT NULL,
  CONSTRAINT CK_credit_note_lines_quantity CHECK(quantity > 0),
  CONSTRAINT CK_credit_note_lines_amounts CHECK(unit_amount_minor >= 0 AND line_total_minor >= 0)
);
GO

IF OBJECT_ID(N'dbo.customer_statements', N'U') IS NULL
CREATE TABLE dbo.customer_statements (
  id nvarchar(64) NOT NULL PRIMARY KEY, statement_number nvarchar(80) NOT NULL UNIQUE, customer_id nvarchar(64) NOT NULL REFERENCES dbo.customers(id),
  period_start date NOT NULL, period_end date NOT NULL, opening_balance_minor bigint NOT NULL, closing_balance_minor bigint NOT NULL,
  currency nchar(3) NOT NULL CONSTRAINT DF_customer_statements_currency DEFAULT N'GBP', document_id nvarchar(64) NULL REFERENCES dbo.documents(id),
  generated_at datetime2(3) NOT NULL, CONSTRAINT UQ_customer_statements UNIQUE(customer_id, period_start, period_end)
);
GO

IF OBJECT_ID(N'dbo.statement_lines', N'U') IS NULL
CREATE TABLE dbo.statement_lines (
  id nvarchar(64) NOT NULL PRIMARY KEY, statement_id nvarchar(64) NOT NULL REFERENCES dbo.customer_statements(id) ON DELETE CASCADE,
  line_date date NOT NULL, line_type nvarchar(64) NOT NULL, reference nvarchar(160) NOT NULL, description nvarchar(500) NOT NULL,
  debit_minor bigint NOT NULL CONSTRAINT DF_statement_lines_debit DEFAULT 0, credit_minor bigint NOT NULL CONSTRAINT DF_statement_lines_credit DEFAULT 0,
  running_balance_minor bigint NOT NULL, CONSTRAINT CK_statement_lines_amounts CHECK(debit_minor >= 0 AND credit_minor >= 0 AND NOT(debit_minor > 0 AND credit_minor > 0))
);
GO

IF OBJECT_ID(N'dbo.purchase_order_status_history', N'U') IS NULL
CREATE TABLE dbo.purchase_order_status_history (
  id nvarchar(64) NOT NULL PRIMARY KEY, purchase_order_id nvarchar(64) NOT NULL REFERENCES dbo.purchase_orders(id) ON DELETE CASCADE,
  from_status nvarchar(64) NULL, to_status nvarchar(64) NOT NULL, actor nvarchar(160) NOT NULL,
  reason nvarchar(1000) NULL, occurred_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.goods_receipts', N'U') IS NULL
CREATE TABLE dbo.goods_receipts (
  id nvarchar(64) NOT NULL PRIMARY KEY, receipt_number nvarchar(80) NOT NULL UNIQUE,
  purchase_order_id nvarchar(64) NOT NULL REFERENCES dbo.purchase_orders(id), supplier_id nvarchar(64) NOT NULL REFERENCES dbo.suppliers(id),
  status nvarchar(64) NOT NULL, received_at datetime2(3) NULL, received_by nvarchar(160) NULL,
  document_id nvarchar(64) NULL REFERENCES dbo.documents(id), created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.goods_receipt_lines', N'U') IS NULL
CREATE TABLE dbo.goods_receipt_lines (
  id nvarchar(64) NOT NULL PRIMARY KEY, goods_receipt_id nvarchar(64) NOT NULL REFERENCES dbo.goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id nvarchar(64) NOT NULL REFERENCES dbo.purchase_order_lines(id), batch_id nvarchar(64) NULL REFERENCES dbo.batches(id),
  quantity_received int NOT NULL, quantity_rejected int NOT NULL CONSTRAINT DF_goods_receipt_lines_rejected DEFAULT 0,
  CONSTRAINT CK_goods_receipt_lines_quantity CHECK(quantity_received > 0 AND quantity_rejected >= 0),
  CONSTRAINT UQ_goods_receipt_lines UNIQUE(goods_receipt_id, purchase_order_line_id, batch_id)
);
GO

IF OBJECT_ID(N'dbo.supplier_invoices', N'U') IS NULL
CREATE TABLE dbo.supplier_invoices (
  id nvarchar(64) NOT NULL PRIMARY KEY, supplier_invoice_number nvarchar(160) NOT NULL, supplier_id nvarchar(64) NOT NULL REFERENCES dbo.suppliers(id),
  purchase_order_id nvarchar(64) NULL REFERENCES dbo.purchase_orders(id), status nvarchar(64) NOT NULL,
  invoice_date date NOT NULL, due_date date NULL, total_minor bigint NOT NULL, currency nchar(3) NOT NULL CONSTRAINT DF_supplier_invoices_currency DEFAULT N'GBP',
  document_id nvarchar(64) NULL REFERENCES dbo.documents(id), created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT CK_supplier_invoices_total CHECK(total_minor >= 0), CONSTRAINT UQ_supplier_invoices UNIQUE(supplier_id, supplier_invoice_number)
);
GO

IF OBJECT_ID(N'dbo.invoice_matches', N'U') IS NULL
CREATE TABLE dbo.invoice_matches (
  id nvarchar(64) NOT NULL PRIMARY KEY, supplier_invoice_id nvarchar(64) NOT NULL REFERENCES dbo.supplier_invoices(id) ON DELETE CASCADE,
  purchase_order_id nvarchar(64) NOT NULL REFERENCES dbo.purchase_orders(id), goods_receipt_id nvarchar(64) NULL REFERENCES dbo.goods_receipts(id),
  match_status nvarchar(64) NOT NULL, variance_minor bigint NOT NULL CONSTRAINT DF_invoice_matches_variance DEFAULT 0,
  reviewed_by nvarchar(160) NULL, reviewed_at datetime2(3) NULL, created_at datetime2(3) NOT NULL,
  CONSTRAINT UQ_invoice_matches UNIQUE(supplier_invoice_id, purchase_order_id, goods_receipt_id)
);
GO

IF OBJECT_ID(N'dbo.ledger_accounts', N'U') IS NULL
CREATE TABLE dbo.ledger_accounts (
  id nvarchar(64) NOT NULL PRIMARY KEY, account_code nvarchar(40) NOT NULL UNIQUE, account_name nvarchar(240) NOT NULL,
  account_type nvarchar(64) NOT NULL, currency nchar(3) NOT NULL CONSTRAINT DF_ledger_accounts_currency DEFAULT N'GBP',
  status nvarchar(64) NOT NULL CONSTRAINT DF_ledger_accounts_status DEFAULT N'active', created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.journal_entries', N'U') IS NULL
CREATE TABLE dbo.journal_entries (
  id nvarchar(64) NOT NULL PRIMARY KEY, journal_number nvarchar(80) NOT NULL UNIQUE, journal_date date NOT NULL,
  description nvarchar(500) NOT NULL, source_type nvarchar(80) NOT NULL, source_id nvarchar(64) NULL,
  status nvarchar(64) NOT NULL CONSTRAINT DF_journal_entries_status DEFAULT N'draft', prepared_by nvarchar(160) NOT NULL,
  approved_by nvarchar(160) NULL, posted_at datetime2(3) NULL, correlation_id nvarchar(64) NOT NULL,
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT CK_journal_entries_maker_checker CHECK(approved_by IS NULL OR approved_by <> prepared_by)
);
GO

IF OBJECT_ID(N'dbo.journal_lines', N'U') IS NULL
CREATE TABLE dbo.journal_lines (
  id nvarchar(64) NOT NULL PRIMARY KEY, journal_entry_id nvarchar(64) NOT NULL REFERENCES dbo.journal_entries(id) ON DELETE CASCADE,
  ledger_account_id nvarchar(64) NOT NULL REFERENCES dbo.ledger_accounts(id), customer_id nvarchar(64) NULL REFERENCES dbo.customers(id),
  supplier_id nvarchar(64) NULL REFERENCES dbo.suppliers(id), description nvarchar(500) NULL,
  debit_minor bigint NOT NULL CONSTRAINT DF_journal_lines_debit DEFAULT 0, credit_minor bigint NOT NULL CONSTRAINT DF_journal_lines_credit DEFAULT 0,
  currency nchar(3) NOT NULL CONSTRAINT DF_journal_lines_currency DEFAULT N'GBP',
  CONSTRAINT CK_journal_lines_amount CHECK((debit_minor > 0 AND credit_minor = 0) OR (credit_minor > 0 AND debit_minor = 0))
);
GO

IF OBJECT_ID(N'dbo.quality_complaints', N'U') IS NULL
CREATE TABLE dbo.quality_complaints (
  id nvarchar(64) NOT NULL PRIMARY KEY, complaint_number nvarchar(80) NOT NULL UNIQUE,
  customer_id nvarchar(64) NULL REFERENCES dbo.customers(id), order_id nvarchar(64) NULL REFERENCES dbo.orders(id),
  product_id nvarchar(64) NULL REFERENCES dbo.products(id), batch_id nvarchar(64) NULL REFERENCES dbo.batches(id),
  severity nvarchar(64) NOT NULL, status nvarchar(64) NOT NULL, description nvarchar(max) NOT NULL,
  safety_information_present bit NOT NULL CONSTRAINT DF_quality_complaints_safety DEFAULT 0,
  pv_escalation_status nvarchar(64) NOT NULL CONSTRAINT DF_quality_complaints_pv DEFAULT N'not_required',
  owner_user_id nvarchar(64) NULL REFERENCES dbo.users(id), due_at datetime2(3) NULL, created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.quality_actions', N'U') IS NULL
CREATE TABLE dbo.quality_actions (
  id nvarchar(64) NOT NULL PRIMARY KEY, complaint_id nvarchar(64) NULL REFERENCES dbo.quality_complaints(id) ON DELETE CASCADE,
  quality_record_id nvarchar(64) NULL REFERENCES dbo.quality_records(id) ON DELETE CASCADE,
  action_type nvarchar(80) NOT NULL, description nvarchar(1200) NOT NULL, owner_user_id nvarchar(64) NULL REFERENCES dbo.users(id),
  status nvarchar(64) NOT NULL, due_at datetime2(3) NULL, completed_at datetime2(3) NULL, created_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.quality_deviations', N'U') IS NULL
CREATE TABLE dbo.quality_deviations (
  id nvarchar(64) NOT NULL PRIMARY KEY, deviation_number nvarchar(80) NOT NULL UNIQUE,
  product_id nvarchar(64) NULL REFERENCES dbo.products(id), batch_id nvarchar(64) NULL REFERENCES dbo.batches(id),
  supplier_id nvarchar(64) NULL REFERENCES dbo.suppliers(id), severity nvarchar(64) NOT NULL, status nvarchar(64) NOT NULL,
  description nvarchar(max) NOT NULL, root_cause_status nvarchar(64) NOT NULL CONSTRAINT DF_quality_deviations_root_cause DEFAULT N'not_started',
  owner_user_id nvarchar(64) NULL REFERENCES dbo.users(id), due_at datetime2(3) NULL, closed_at datetime2(3) NULL,
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.change_controls', N'U') IS NULL
CREATE TABLE dbo.change_controls (
  id nvarchar(64) NOT NULL PRIMARY KEY, change_number nvarchar(80) NOT NULL UNIQUE,
  entity_type nvarchar(80) NOT NULL, entity_id nvarchar(64) NOT NULL, change_type nvarchar(100) NOT NULL,
  risk_level nvarchar(64) NOT NULL, status nvarchar(64) NOT NULL, description nvarchar(max) NOT NULL,
  implementation_date date NULL, owner_user_id nvarchar(64) NULL REFERENCES dbo.users(id),
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.capa_records', N'U') IS NULL
CREATE TABLE dbo.capa_records (
  id nvarchar(64) NOT NULL PRIMARY KEY, capa_number nvarchar(80) NOT NULL UNIQUE, source_type nvarchar(80) NOT NULL, source_id nvarchar(64) NOT NULL,
  root_cause nvarchar(max) NULL, corrective_action nvarchar(max) NULL, preventive_action nvarchar(max) NULL,
  effectiveness_status nvarchar(64) NOT NULL CONSTRAINT DF_capa_effectiveness DEFAULT N'not_assessed', status nvarchar(64) NOT NULL,
  owner_user_id nvarchar(64) NULL REFERENCES dbo.users(id), due_at datetime2(3) NULL, closed_at datetime2(3) NULL,
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.recall_records', N'U') IS NULL
CREATE TABLE dbo.recall_records (
  id nvarchar(64) NOT NULL PRIMARY KEY, recall_number nvarchar(80) NOT NULL UNIQUE, product_id nvarchar(64) NOT NULL REFERENCES dbo.products(id),
  batch_id nvarchar(64) NULL REFERENCES dbo.batches(id), classification nvarchar(80) NULL, status nvarchar(64) NOT NULL,
  authority_reference nvarchar(240) NULL, initiated_at datetime2(3) NULL, closed_at datetime2(3) NULL,
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.regulatory_cases', N'U') IS NULL
CREATE TABLE dbo.regulatory_cases (
  id nvarchar(64) NOT NULL PRIMARY KEY, case_number nvarchar(80) NOT NULL UNIQUE, product_id nvarchar(64) NULL REFERENCES dbo.products(id),
  case_type nvarchar(80) NOT NULL, jurisdiction nvarchar(80) NOT NULL, authority nvarchar(160) NULL,
  status nvarchar(64) NOT NULL, current_stage nvarchar(120) NOT NULL, external_reference nvarchar(240) NULL,
  target_date date NULL, owner_user_id nvarchar(64) NULL REFERENCES dbo.users(id), created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.regulatory_milestones', N'U') IS NULL
CREATE TABLE dbo.regulatory_milestones (
  id nvarchar(64) NOT NULL PRIMARY KEY, regulatory_case_id nvarchar(64) NOT NULL REFERENCES dbo.regulatory_cases(id) ON DELETE CASCADE,
  milestone_code nvarchar(80) NOT NULL, title nvarchar(300) NOT NULL, status nvarchar(64) NOT NULL,
  due_at datetime2(3) NULL, completed_at datetime2(3) NULL, evidence_document_id nvarchar(64) NULL REFERENCES dbo.documents(id),
  created_at datetime2(3) NOT NULL, CONSTRAINT UQ_regulatory_milestones UNIQUE(regulatory_case_id, milestone_code)
);
GO

IF OBJECT_ID(N'dbo.pharmacovigilance_cases', N'U') IS NULL
CREATE TABLE dbo.pharmacovigilance_cases (
  id nvarchar(64) NOT NULL PRIMARY KEY, case_number nvarchar(80) NOT NULL UNIQUE, source_type nvarchar(80) NOT NULL,
  source_id nvarchar(64) NOT NULL, case_status nvarchar(64) NOT NULL, controlled_system_reference nvarchar(240) NULL,
  received_at datetime2(3) NOT NULL, transferred_at datetime2(3) NULL, created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_pharmacovigilance_source CHECK(source_type <> N'general_contact_form')
);
GO

IF OBJECT_ID(N'dbo.crm_opportunities', N'U') IS NULL
CREATE TABLE dbo.crm_opportunities (
  id nvarchar(64) NOT NULL PRIMARY KEY, opportunity_number nvarchar(80) NOT NULL UNIQUE, lead_id nvarchar(64) NULL REFERENCES dbo.leads(id),
  organization_id nvarchar(64) NULL REFERENCES dbo.organizations(id), customer_id nvarchar(64) NULL REFERENCES dbo.customers(id),
  name nvarchar(300) NOT NULL, opportunity_type nvarchar(80) NOT NULL, stage nvarchar(80) NOT NULL,
  probability_basis_points int NOT NULL CONSTRAINT DF_crm_probability DEFAULT 0, estimated_value_minor bigint NULL,
  currency nchar(3) NOT NULL CONSTRAINT DF_crm_currency DEFAULT N'GBP', owner_user_id nvarchar(64) NULL REFERENCES dbo.users(id),
  next_action nvarchar(500) NULL, next_action_at datetime2(3) NULL, closed_at datetime2(3) NULL,
  created_at datetime2(3) NOT NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT CK_crm_probability CHECK(probability_basis_points BETWEEN 0 AND 10000),
  CONSTRAINT CK_crm_value CHECK(estimated_value_minor IS NULL OR estimated_value_minor >= 0)
);
GO

IF OBJECT_ID(N'dbo.crm_stage_history', N'U') IS NULL
CREATE TABLE dbo.crm_stage_history (
  id nvarchar(64) NOT NULL PRIMARY KEY, opportunity_id nvarchar(64) NOT NULL REFERENCES dbo.crm_opportunities(id) ON DELETE CASCADE,
  from_stage nvarchar(80) NULL, to_stage nvarchar(80) NOT NULL, actor nvarchar(160) NOT NULL,
  reason nvarchar(1000) NULL, occurred_at datetime2(3) NOT NULL
);
GO

IF OBJECT_ID(N'dbo.document_versions', N'U') IS NULL
CREATE TABLE dbo.document_versions (
  id nvarchar(64) NOT NULL PRIMARY KEY, document_id nvarchar(64) NOT NULL REFERENCES dbo.documents(id) ON DELETE CASCADE,
  version_number int NOT NULL, storage_path nvarchar(700) NOT NULL, checksum_sha256 char(64) NOT NULL,
  change_summary nvarchar(1000) NULL, lifecycle_status nvarchar(64) NOT NULL, created_by nvarchar(160) NOT NULL, created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_document_versions_number CHECK(version_number > 0), CONSTRAINT UQ_document_versions UNIQUE(document_id, version_number)
);
GO

IF OBJECT_ID(N'dbo.document_approvals', N'U') IS NULL
CREATE TABLE dbo.document_approvals (
  id nvarchar(64) NOT NULL PRIMARY KEY, document_id nvarchar(64) NOT NULL REFERENCES dbo.documents(id) ON DELETE CASCADE,
  document_version_id nvarchar(64) NULL REFERENCES dbo.document_versions(id), stage nvarchar(80) NOT NULL,
  outcome nvarchar(64) NULL, requested_by nvarchar(160) NOT NULL, decided_by nvarchar(160) NULL,
  comments nvarchar(1200) NULL, requested_at datetime2(3) NOT NULL, decided_at datetime2(3) NULL
);
GO

IF OBJECT_ID(N'dbo.workflow_instances', N'U') IS NULL
CREATE TABLE dbo.workflow_instances (
  id nvarchar(64) NOT NULL PRIMARY KEY, workflow_code nvarchar(100) NOT NULL, business_key nvarchar(160) NOT NULL,
  entity_type nvarchar(80) NOT NULL, entity_id nvarchar(64) NOT NULL, status nvarchar(64) NOT NULL,
  current_step nvarchar(100) NOT NULL, correlation_id nvarchar(64) NOT NULL, started_by nvarchar(160) NOT NULL,
  started_at datetime2(3) NOT NULL, completed_at datetime2(3) NULL, updated_at datetime2(3) NOT NULL,
  CONSTRAINT UQ_workflow_instances UNIQUE(workflow_code, business_key)
);
GO

IF OBJECT_ID(N'dbo.workflow_steps', N'U') IS NULL
CREATE TABLE dbo.workflow_steps (
  id nvarchar(64) NOT NULL PRIMARY KEY, workflow_instance_id nvarchar(64) NOT NULL REFERENCES dbo.workflow_instances(id) ON DELETE CASCADE,
  step_code nvarchar(100) NOT NULL, sequence_number int NOT NULL, status nvarchar(64) NOT NULL, actor nvarchar(160) NULL,
  input_json nvarchar(max) NOT NULL CONSTRAINT DF_workflow_steps_input DEFAULT N'{}',
  output_json nvarchar(max) NOT NULL CONSTRAINT DF_workflow_steps_output DEFAULT N'{}',
  started_at datetime2(3) NULL, completed_at datetime2(3) NULL,
  CONSTRAINT UQ_workflow_steps UNIQUE(workflow_instance_id, step_code)
);
GO

IF OBJECT_ID(N'dbo.domain_events', N'U') IS NULL
CREATE TABLE dbo.domain_events (
  id nvarchar(64) NOT NULL PRIMARY KEY, event_type nvarchar(160) NOT NULL, aggregate_type nvarchar(80) NOT NULL,
  aggregate_id nvarchar(64) NOT NULL, aggregate_version int NOT NULL, correlation_id nvarchar(64) NOT NULL,
  causation_id nvarchar(64) NULL, actor nvarchar(160) NOT NULL, payload_json nvarchar(max) NOT NULL, occurred_at datetime2(3) NOT NULL,
  CONSTRAINT UQ_domain_events UNIQUE(aggregate_type, aggregate_id, aggregate_version, event_type)
);
GO

IF OBJECT_ID(N'dbo.outbox_messages', N'U') IS NULL
CREATE TABLE dbo.outbox_messages (
  id nvarchar(64) NOT NULL PRIMARY KEY, domain_event_id nvarchar(64) NOT NULL REFERENCES dbo.domain_events(id) ON DELETE CASCADE,
  destination nvarchar(100) NOT NULL, message_type nvarchar(160) NOT NULL, idempotency_key nvarchar(240) NOT NULL,
  payload_json nvarchar(max) NOT NULL, status nvarchar(64) NOT NULL CONSTRAINT DF_outbox_status DEFAULT N'pending',
  attempt_count int NOT NULL CONSTRAINT DF_outbox_attempts DEFAULT 0, next_attempt_at datetime2(3) NOT NULL,
  last_error_code nvarchar(160) NULL, created_at datetime2(3) NOT NULL, processed_at datetime2(3) NULL,
  CONSTRAINT UQ_outbox_messages UNIQUE(destination, idempotency_key)
);
GO

IF OBJECT_ID(N'dbo.catalogue_imports', N'U') IS NULL
CREATE TABLE dbo.catalogue_imports (
  id nvarchar(64) NOT NULL PRIMARY KEY, catalogue_code nvarchar(100) NOT NULL, catalogue_version nvarchar(64) NOT NULL,
  source_checksum_sha256 char(64) NOT NULL, register_checksum_sha256 char(64) NOT NULL, product_count int NOT NULL,
  status nvarchar(32) NOT NULL, validation_json nvarchar(max) NOT NULL CONSTRAINT DF_catalogue_imports_validation DEFAULT N'{}',
  imported_by nvarchar(160) NOT NULL, imported_at datetime2(3) NOT NULL,
  CONSTRAINT CK_catalogue_imports_count CHECK(product_count > 0),
  CONSTRAINT CK_catalogue_imports_status CHECK(status IN (N'validated', N'imported', N'failed')),
  CONSTRAINT UQ_catalogue_imports UNIQUE(catalogue_code, catalogue_version, source_checksum_sha256, register_checksum_sha256)
);
GO

IF OBJECT_ID(N'dbo.catalogue_import_items', N'U') IS NULL
CREATE TABLE dbo.catalogue_import_items (
  id nvarchar(64) NOT NULL PRIMARY KEY, catalogue_import_id nvarchar(64) NOT NULL REFERENCES dbo.catalogue_imports(id) ON DELETE CASCADE,
  product_id nvarchar(64) NOT NULL REFERENCES dbo.products(id), source_record_id nvarchar(160) NOT NULL,
  source_record_checksum_sha256 char(64) NOT NULL, outcome nvarchar(32) NOT NULL, created_at datetime2(3) NOT NULL,
  CONSTRAINT CK_catalogue_import_items_outcome CHECK(outcome IN (N'created', N'updated', N'unchanged')),
  CONSTRAINT UQ_catalogue_import_items UNIQUE(catalogue_import_id, source_record_id)
);
GO

IF OBJECT_ID(N'dbo.role_permissions', N'U') IS NULL
CREATE TABLE dbo.role_permissions (
  id nvarchar(64) NOT NULL PRIMARY KEY, role_scope nvarchar(32) NOT NULL, module_code nvarchar(100) NOT NULL,
  permission_code nvarchar(100) NOT NULL, effect nvarchar(16) NOT NULL CONSTRAINT DF_role_permissions_effect DEFAULT N'allow',
  created_at datetime2(3) NOT NULL, CONSTRAINT CK_role_permissions_scope CHECK(role_scope IN (N'customer', N'employee', N'board', N'admin')),
  CONSTRAINT CK_role_permissions_effect CHECK(effect IN (N'allow', N'deny')),
  CONSTRAINT UQ_role_permissions UNIQUE(role_scope, module_code, permission_code)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_product_variants_family' AND object_id = OBJECT_ID(N'dbo.product_variants'))
CREATE INDEX IX_product_variants_family ON dbo.product_variants(family_id, catalogue_order);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_product_composition_product' AND object_id = OBJECT_ID(N'dbo.product_composition_items'))
CREATE INDEX IX_product_composition_product ON dbo.product_composition_items(product_id, sequence_number);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_inventory_balances_product' AND object_id = OBJECT_ID(N'dbo.inventory_balances'))
CREATE INDEX IX_inventory_balances_product ON dbo.inventory_balances(product_id, available_quantity);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_quality_complaints_status' AND object_id = OBJECT_ID(N'dbo.quality_complaints'))
CREATE INDEX IX_quality_complaints_status ON dbo.quality_complaints(status, severity, due_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_quality_deviations_status' AND object_id = OBJECT_ID(N'dbo.quality_deviations'))
CREATE INDEX IX_quality_deviations_status ON dbo.quality_deviations(status, severity, due_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_regulatory_cases_status' AND object_id = OBJECT_ID(N'dbo.regulatory_cases'))
CREATE INDEX IX_regulatory_cases_status ON dbo.regulatory_cases(status, target_date);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_crm_opportunities_stage' AND object_id = OBJECT_ID(N'dbo.crm_opportunities'))
CREATE INDEX IX_crm_opportunities_stage ON dbo.crm_opportunities(stage, next_action_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_workflow_instances_status' AND object_id = OBJECT_ID(N'dbo.workflow_instances'))
CREATE INDEX IX_workflow_instances_status ON dbo.workflow_instances(workflow_code, status, updated_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_domain_events_aggregate' AND object_id = OBJECT_ID(N'dbo.domain_events'))
CREATE INDEX IX_domain_events_aggregate ON dbo.domain_events(aggregate_type, aggregate_id, occurred_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_outbox_delivery' AND object_id = OBJECT_ID(N'dbo.outbox_messages'))
CREATE INDEX IX_outbox_delivery ON dbo.outbox_messages(status, destination, next_attempt_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_catalogue_imports_source' AND object_id = OBJECT_ID(N'dbo.catalogue_imports'))
CREATE INDEX IX_catalogue_imports_source ON dbo.catalogue_imports(catalogue_code, catalogue_version, imported_at);
GO
