IF OBJECT_ID(N'dbo.organizations', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.organizations (
    id nvarchar(64) NOT NULL CONSTRAINT PK_organizations PRIMARY KEY,
    legal_name nvarchar(240) NOT NULL,
    trading_name nvarchar(240) NULL,
    company_number nvarchar(64) NULL,
    vat_number nvarchar(64) NULL,
    country_code nchar(2) NOT NULL CONSTRAINT DF_organizations_country DEFAULT N'GB',
    status nvarchar(32) NOT NULL CONSTRAINT DF_organizations_status DEFAULT N'active',
    version int NOT NULL CONSTRAINT DF_organizations_version DEFAULT 1,
    source_system nvarchar(64) NOT NULL CONSTRAINT DF_organizations_source DEFAULT N'novapharm',
    created_at datetime2(3) NOT NULL,
    created_by nvarchar(160) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    updated_by nvarchar(160) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.customers', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.customers (
    id nvarchar(64) NOT NULL CONSTRAINT PK_customers PRIMARY KEY,
    organization_id nvarchar(64) NOT NULL CONSTRAINT FK_customers_organizations REFERENCES dbo.organizations(id),
    customer_number nvarchar(64) NOT NULL CONSTRAINT UQ_customers_number UNIQUE,
    customer_type nvarchar(64) NOT NULL,
    lifecycle_status nvarchar(32) NOT NULL,
    credit_limit_minor bigint NOT NULL CONSTRAINT DF_customers_credit DEFAULT 0,
    outstanding_balance_minor bigint NOT NULL CONSTRAINT DF_customers_outstanding DEFAULT 0,
    currency nchar(3) NOT NULL CONSTRAINT DF_customers_currency DEFAULT N'GBP',
    payment_terms_days int NOT NULL CONSTRAINT DF_customers_terms DEFAULT 30,
    version int NOT NULL CONSTRAINT DF_customers_version DEFAULT 1,
    source_system nvarchar(64) NOT NULL CONSTRAINT DF_customers_source DEFAULT N'novapharm',
    created_at datetime2(3) NOT NULL,
    created_by nvarchar(160) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    updated_by nvarchar(160) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.suppliers', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.suppliers (
    id nvarchar(64) NOT NULL CONSTRAINT PK_suppliers PRIMARY KEY,
    organization_id nvarchar(64) NOT NULL CONSTRAINT FK_suppliers_organizations REFERENCES dbo.organizations(id),
    supplier_number nvarchar(64) NOT NULL CONSTRAINT UQ_suppliers_number UNIQUE,
    supplier_type nvarchar(80) NOT NULL,
    qualification_status nvarchar(32) NOT NULL,
    gdp_status nvarchar(32) NOT NULL CONSTRAINT DF_suppliers_gdp DEFAULT N'not_assessed',
    gmp_status nvarchar(32) NOT NULL CONSTRAINT DF_suppliers_gmp DEFAULT N'not_assessed',
    payment_terms_days int NOT NULL CONSTRAINT DF_suppliers_terms DEFAULT 30,
    version int NOT NULL CONSTRAINT DF_suppliers_version DEFAULT 1,
    source_system nvarchar(64) NOT NULL CONSTRAINT DF_suppliers_source DEFAULT N'novapharm',
    created_at datetime2(3) NOT NULL,
    created_by nvarchar(160) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    updated_by nvarchar(160) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.products', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.products (
    id nvarchar(64) NOT NULL CONSTRAINT PK_products PRIMARY KEY,
    sku nvarchar(100) NOT NULL CONSTRAINT UQ_products_sku UNIQUE,
    ean nvarchar(32) NULL,
    gtin nvarchar(32) NULL CONSTRAINT UQ_products_gtin UNIQUE,
    product_name nvarchar(240) NOT NULL,
    strength nvarchar(100) NULL,
    dosage_form nvarchar(100) NULL,
    pack_size nvarchar(100) NULL,
    manufacturer nvarchar(240) NULL,
    country_of_origin nvarchar(100) NULL,
    list_price_minor bigint NOT NULL CONSTRAINT DF_products_price DEFAULT 0,
    currency nchar(3) NOT NULL CONSTRAINT DF_products_currency DEFAULT N'GBP',
    regulatory_status nvarchar(40) NOT NULL CONSTRAINT DF_products_regulatory DEFAULT N'draft',
    marketing_status nvarchar(40) NOT NULL CONSTRAINT DF_products_marketing DEFAULT N'not_marketed',
    mhra_status nvarchar(40) NOT NULL CONSTRAINT DF_products_mhra DEFAULT N'not_assessed',
    lifecycle_status nvarchar(40) NOT NULL CONSTRAINT DF_products_lifecycle DEFAULT N'draft',
    version int NOT NULL CONSTRAINT DF_products_version DEFAULT 1,
    source_system nvarchar(64) NOT NULL CONSTRAINT DF_products_source DEFAULT N'novapharm',
    created_at datetime2(3) NOT NULL,
    created_by nvarchar(160) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    updated_by nvarchar(160) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.batches', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.batches (
    id nvarchar(64) NOT NULL CONSTRAINT PK_batches PRIMARY KEY,
    product_id nvarchar(64) NOT NULL CONSTRAINT FK_batches_products REFERENCES dbo.products(id),
    supplier_id nvarchar(64) NULL CONSTRAINT FK_batches_suppliers REFERENCES dbo.suppliers(id),
    batch_number nvarchar(100) NOT NULL,
    manufacture_date date NULL,
    expiry_date date NOT NULL,
    release_status nvarchar(32) NOT NULL CONSTRAINT DF_batches_release DEFAULT N'quarantine',
    quantity_available int NOT NULL CONSTRAINT DF_batches_quantity DEFAULT 0,
    version int NOT NULL CONSTRAINT DF_batches_version DEFAULT 1,
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    CONSTRAINT UQ_batches_product_number UNIQUE(product_id, batch_number)
  );
END
GO

IF OBJECT_ID(N'dbo.orders', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.orders (
    id nvarchar(64) NOT NULL CONSTRAINT PK_orders PRIMARY KEY,
    order_number nvarchar(64) NOT NULL CONSTRAINT UQ_orders_number UNIQUE,
    customer_id nvarchar(64) NOT NULL CONSTRAINT FK_orders_customers REFERENCES dbo.customers(id),
    status nvarchar(40) NOT NULL,
    requested_delivery_date date NULL,
    subtotal_minor bigint NOT NULL CONSTRAINT DF_orders_subtotal DEFAULT 0,
    tax_minor bigint NOT NULL CONSTRAINT DF_orders_tax DEFAULT 0,
    total_minor bigint NOT NULL CONSTRAINT DF_orders_total DEFAULT 0,
    currency nchar(3) NOT NULL CONSTRAINT DF_orders_currency DEFAULT N'GBP',
    customer_po_reference nvarchar(120) NULL,
    version int NOT NULL CONSTRAINT DF_orders_version DEFAULT 1,
    source_system nvarchar(64) NOT NULL CONSTRAINT DF_orders_source DEFAULT N'novapharm',
    created_at datetime2(3) NOT NULL,
    created_by nvarchar(160) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    updated_by nvarchar(160) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.order_lines', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.order_lines (
    id nvarchar(64) NOT NULL CONSTRAINT PK_order_lines PRIMARY KEY,
    order_id nvarchar(64) NOT NULL CONSTRAINT FK_order_lines_orders REFERENCES dbo.orders(id),
    product_id nvarchar(64) NOT NULL CONSTRAINT FK_order_lines_products REFERENCES dbo.products(id),
    quantity int NOT NULL CONSTRAINT CK_order_lines_quantity CHECK(quantity > 0),
    unit_price_minor bigint NOT NULL CONSTRAINT CK_order_lines_price CHECK(unit_price_minor >= 0),
    discount_basis_points int NOT NULL CONSTRAINT DF_order_lines_discount DEFAULT 0,
    line_total_minor bigint NOT NULL,
    created_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.invoices', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.invoices (
    id nvarchar(64) NOT NULL CONSTRAINT PK_invoices PRIMARY KEY,
    invoice_number nvarchar(64) NOT NULL CONSTRAINT UQ_invoices_number UNIQUE,
    customer_id nvarchar(64) NOT NULL CONSTRAINT FK_invoices_customers REFERENCES dbo.customers(id),
    order_id nvarchar(64) NULL CONSTRAINT FK_invoices_orders REFERENCES dbo.orders(id),
    status nvarchar(40) NOT NULL,
    issue_date date NOT NULL,
    due_date date NOT NULL,
    total_minor bigint NOT NULL,
    outstanding_minor bigint NOT NULL,
    currency nchar(3) NOT NULL CONSTRAINT DF_invoices_currency DEFAULT N'GBP',
    finance_external_id nvarchar(128) NULL,
    version int NOT NULL CONSTRAINT DF_invoices_version DEFAULT 1,
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.invoice_lines', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.invoice_lines (
    id nvarchar(64) NOT NULL CONSTRAINT PK_invoice_lines PRIMARY KEY,
    invoice_id nvarchar(64) NOT NULL CONSTRAINT FK_invoice_lines_invoices REFERENCES dbo.invoices(id),
    product_id nvarchar(64) NULL CONSTRAINT FK_invoice_lines_products REFERENCES dbo.products(id),
    description nvarchar(500) NOT NULL,
    quantity int NOT NULL,
    unit_price_minor bigint NOT NULL,
    line_total_minor bigint NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.purchase_orders', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.purchase_orders (
    id nvarchar(64) NOT NULL CONSTRAINT PK_purchase_orders PRIMARY KEY,
    po_number nvarchar(64) NOT NULL CONSTRAINT UQ_purchase_orders_number UNIQUE,
    supplier_id nvarchar(64) NOT NULL CONSTRAINT FK_purchase_orders_suppliers REFERENCES dbo.suppliers(id),
    status nvarchar(40) NOT NULL,
    subtotal_minor bigint NOT NULL CONSTRAINT DF_purchase_orders_subtotal DEFAULT 0,
    tax_minor bigint NOT NULL CONSTRAINT DF_purchase_orders_tax DEFAULT 0,
    total_minor bigint NOT NULL CONSTRAINT DF_purchase_orders_total DEFAULT 0,
    currency nchar(3) NOT NULL CONSTRAINT DF_purchase_orders_currency DEFAULT N'GBP',
    expected_date date NULL,
    version int NOT NULL CONSTRAINT DF_purchase_orders_version DEFAULT 1,
    created_at datetime2(3) NOT NULL,
    created_by nvarchar(160) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    updated_by nvarchar(160) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.purchase_order_lines', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.purchase_order_lines (
    id nvarchar(64) NOT NULL CONSTRAINT PK_purchase_order_lines PRIMARY KEY,
    purchase_order_id nvarchar(64) NOT NULL CONSTRAINT FK_purchase_order_lines_orders REFERENCES dbo.purchase_orders(id),
    product_id nvarchar(64) NOT NULL CONSTRAINT FK_purchase_order_lines_products REFERENCES dbo.products(id),
    quantity int NOT NULL CONSTRAINT CK_purchase_order_lines_quantity CHECK(quantity > 0),
    unit_cost_minor bigint NOT NULL CONSTRAINT CK_purchase_order_lines_cost CHECK(unit_cost_minor >= 0),
    line_total_minor bigint NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id nvarchar(64) NOT NULL CONSTRAINT PK_users PRIMARY KEY,
    entra_object_id nvarchar(64) NULL,
    identity_provider nvarchar(40) NOT NULL CONSTRAINT DF_users_identity_provider DEFAULT N'local',
    identity_issuer nvarchar(240) NULL,
    external_subject nvarchar(160) NULL,
    email nvarchar(320) NULL,
    username nvarchar(160) NOT NULL CONSTRAINT UQ_users_username UNIQUE,
    display_name nvarchar(200) NOT NULL,
    role nvarchar(32) NOT NULL,
    customer_id nvarchar(64) NULL CONSTRAINT FK_users_customers REFERENCES dbo.customers(id),
    status nvarchar(32) NOT NULL CONSTRAINT DF_users_status DEFAULT N'active',
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.auth_credentials', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.auth_credentials (
    username nvarchar(160) NOT NULL CONSTRAINT PK_auth_credentials PRIMARY KEY
      CONSTRAINT FK_auth_credentials_users REFERENCES dbo.users(username) ON DELETE CASCADE,
    password_hash nvarchar(256) NOT NULL,
    password_salt nvarchar(256) NOT NULL,
    password_algorithm nvarchar(64) NOT NULL CONSTRAINT DF_auth_credentials_algorithm DEFAULT N'pbkdf2-sha256',
    password_iterations int NOT NULL CONSTRAINT DF_auth_credentials_iterations DEFAULT 210000,
    failed_attempts int NOT NULL CONSTRAINT DF_auth_credentials_failed DEFAULT 0,
    locked_until datetime2(3) NULL,
    must_change_password bit NOT NULL CONSTRAINT DF_auth_credentials_change DEFAULT 0,
    credential_version int NOT NULL CONSTRAINT DF_auth_credentials_version DEFAULT 1,
    credential_source nvarchar(64) NOT NULL CONSTRAINT DF_auth_credentials_source DEFAULT N'environment',
    password_changed_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    CONSTRAINT CK_auth_credentials_iterations CHECK(password_iterations >= 210000),
    CONSTRAINT CK_auth_credentials_version CHECK(credential_version >= 1)
  );
END
GO

IF OBJECT_ID(N'dbo.auth_user_scopes', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.auth_user_scopes (
    username nvarchar(160) NOT NULL CONSTRAINT FK_auth_user_scopes_users REFERENCES dbo.users(username) ON DELETE CASCADE,
    scope nvarchar(32) NOT NULL CONSTRAINT CK_auth_user_scopes_scope CHECK(scope IN (N'customer', N'employee', N'board', N'admin')),
    created_at datetime2(3) NOT NULL,
    CONSTRAINT PK_auth_user_scopes PRIMARY KEY(username, scope)
  );
END
GO

IF OBJECT_ID(N'dbo.auth_sessions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.auth_sessions (
    id nvarchar(128) NOT NULL CONSTRAINT PK_auth_sessions PRIMARY KEY,
    username nvarchar(160) NOT NULL CONSTRAINT FK_auth_sessions_users REFERENCES dbo.users(username) ON DELETE CASCADE,
    access_type nvarchar(32) NOT NULL CONSTRAINT CK_auth_sessions_access CHECK(access_type IN (N'customer', N'employee', N'board', N'admin')),
    credential_version int NOT NULL CONSTRAINT DF_auth_sessions_version DEFAULT 1,
    created_at datetime2(3) NOT NULL,
    expires_at datetime2(3) NOT NULL,
    last_seen_at datetime2(3) NOT NULL,
    revoked_at datetime2(3) NULL
  );
END
GO

IF OBJECT_ID(N'dbo.rate_limit_buckets', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.rate_limit_buckets (
    bucket_key nvarchar(256) NOT NULL CONSTRAINT PK_rate_limit_buckets PRIMARY KEY,
    request_count int NOT NULL,
    reset_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.security_events', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.security_events (
    id nvarchar(64) NOT NULL CONSTRAINT PK_security_events PRIMARY KEY,
    event_type nvarchar(100) NOT NULL,
    username nvarchar(160) NULL,
    network_fingerprint nvarchar(128) NULL,
    outcome nvarchar(32) NOT NULL,
    details_json nvarchar(max) NOT NULL CONSTRAINT DF_security_events_details DEFAULT N'{}',
    occurred_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.employees', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.employees (
    id nvarchar(64) NOT NULL CONSTRAINT PK_employees PRIMARY KEY,
    user_id nvarchar(64) NULL CONSTRAINT UQ_employees_user UNIQUE CONSTRAINT FK_employees_users REFERENCES dbo.users(id),
    employee_number nvarchar(64) NOT NULL CONSTRAINT UQ_employees_number UNIQUE,
    department nvarchar(120) NOT NULL,
    manager_employee_id nvarchar(64) NULL CONSTRAINT FK_employees_manager REFERENCES dbo.employees(id),
    employment_status nvarchar(32) NOT NULL,
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.documents', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.documents (
    id nvarchar(64) NOT NULL CONSTRAINT PK_documents PRIMARY KEY,
    document_number nvarchar(100) NOT NULL CONSTRAINT UQ_documents_number UNIQUE,
    title nvarchar(500) NOT NULL,
    file_name nvarchar(260) NOT NULL,
    content_type nvarchar(160) NOT NULL,
    size_bytes bigint NOT NULL,
    checksum_sha256 nchar(64) NOT NULL,
    storage_path nvarchar(1000) NOT NULL,
    document_class nvarchar(100) NOT NULL,
    lifecycle_status nvarchar(32) NOT NULL CONSTRAINT DF_documents_lifecycle DEFAULT N'draft',
    retention_class nvarchar(100) NOT NULL CONSTRAINT DF_documents_retention DEFAULT N'business_7_years',
    security_status nvarchar(40) NOT NULL CONSTRAINT DF_documents_security DEFAULT N'pending_scan',
    malware_scan_result nvarchar(160) NULL,
    malware_scanned_at datetime2(3) NULL,
    version int NOT NULL CONSTRAINT DF_documents_version DEFAULT 1,
    created_at datetime2(3) NOT NULL,
    created_by nvarchar(160) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    updated_by nvarchar(160) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.document_links', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.document_links (
    id nvarchar(64) NOT NULL CONSTRAINT PK_document_links PRIMARY KEY,
    document_id nvarchar(64) NOT NULL CONSTRAINT FK_document_links_documents REFERENCES dbo.documents(id),
    entity_type nvarchar(80) NOT NULL,
    entity_id nvarchar(128) NOT NULL,
    relationship nvarchar(100) NOT NULL,
    created_at datetime2(3) NOT NULL,
    CONSTRAINT UQ_document_links_relationship UNIQUE(document_id, entity_type, entity_id, relationship)
  );
END
GO

IF OBJECT_ID(N'dbo.sharepoint_links', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.sharepoint_links (
    id nvarchar(64) NOT NULL CONSTRAINT PK_sharepoint_links PRIMARY KEY,
    document_id nvarchar(64) NULL CONSTRAINT FK_sharepoint_links_documents REFERENCES dbo.documents(id),
    entity_type nvarchar(80) NULL,
    entity_id nvarchar(128) NULL,
    site_id nvarchar(140) NOT NULL,
    drive_id nvarchar(140) NOT NULL,
    item_id nvarchar(140) NOT NULL,
    web_url nvarchar(1500) NULL,
    checksum_sha256 nchar(64) NULL,
    sync_status nvarchar(32) NOT NULL,
    last_verified_at datetime2(3) NULL,
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    CONSTRAINT UQ_sharepoint_links_item UNIQUE(site_id, drive_id, item_id)
  );
END
GO

IF OBJECT_ID(N'dbo.approvals', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.approvals (
    id nvarchar(64) NOT NULL CONSTRAINT PK_approvals PRIMARY KEY,
    entity_type nvarchar(80) NOT NULL,
    entity_id nvarchar(128) NOT NULL,
    workflow_type nvarchar(100) NOT NULL,
    stage nvarchar(100) NOT NULL,
    outcome nvarchar(40) NULL,
    actor_user_id nvarchar(64) NULL CONSTRAINT FK_approvals_users REFERENCES dbo.users(id),
    comments nvarchar(max) NULL,
    decided_at datetime2(3) NULL,
    created_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.regulatory_records', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.regulatory_records (
    id nvarchar(64) NOT NULL CONSTRAINT PK_regulatory_records PRIMARY KEY,
    regulatory_number nvarchar(100) NOT NULL CONSTRAINT UQ_regulatory_records_number UNIQUE,
    entity_type nvarchar(80) NOT NULL,
    entity_id nvarchar(128) NOT NULL,
    authority nvarchar(120) NOT NULL,
    record_type nvarchar(120) NOT NULL,
    external_reference nvarchar(240) NULL,
    status nvarchar(40) NOT NULL,
    effective_date date NULL,
    expiry_date date NULL,
    version int NOT NULL CONSTRAINT DF_regulatory_records_version DEFAULT 1,
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.quality_records', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.quality_records (
    id nvarchar(64) NOT NULL CONSTRAINT PK_quality_records PRIMARY KEY,
    quality_number nvarchar(100) NOT NULL CONSTRAINT UQ_quality_records_number UNIQUE,
    record_type nvarchar(120) NOT NULL,
    severity nvarchar(40) NOT NULL,
    status nvarchar(40) NOT NULL,
    product_id nvarchar(64) NULL CONSTRAINT FK_quality_records_products REFERENCES dbo.products(id),
    batch_id nvarchar(64) NULL CONSTRAINT FK_quality_records_batches REFERENCES dbo.batches(id),
    customer_id nvarchar(64) NULL CONSTRAINT FK_quality_records_customers REFERENCES dbo.customers(id),
    supplier_id nvarchar(64) NULL CONSTRAINT FK_quality_records_suppliers REFERENCES dbo.suppliers(id),
    owner_user_id nvarchar(64) NULL CONSTRAINT FK_quality_records_users REFERENCES dbo.users(id),
    due_date date NULL,
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.stock_transactions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.stock_transactions (
    id nvarchar(64) NOT NULL CONSTRAINT PK_stock_transactions PRIMARY KEY,
    product_id nvarchar(64) NOT NULL CONSTRAINT FK_stock_transactions_products REFERENCES dbo.products(id),
    batch_id nvarchar(64) NULL CONSTRAINT FK_stock_transactions_batches REFERENCES dbo.batches(id),
    movement_type nvarchar(80) NOT NULL,
    quantity int NOT NULL,
    location_code nvarchar(100) NOT NULL,
    reference_type nvarchar(80) NULL,
    reference_id nvarchar(128) NULL,
    occurred_at datetime2(3) NOT NULL,
    source_system nvarchar(64) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.warehouse_transactions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.warehouse_transactions (
    id nvarchar(64) NOT NULL CONSTRAINT PK_warehouse_transactions PRIMARY KEY,
    transaction_type nvarchar(100) NOT NULL,
    external_reference nvarchar(240) NULL,
    status nvarchar(40) NOT NULL,
    payload_json nvarchar(max) NOT NULL CONSTRAINT DF_warehouse_transactions_payload DEFAULT N'{}',
    occurred_at datetime2(3) NOT NULL,
    source_system nvarchar(64) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.crm_activities', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.crm_activities (
    id nvarchar(64) NOT NULL CONSTRAINT PK_crm_activities PRIMARY KEY,
    customer_id nvarchar(64) NULL CONSTRAINT FK_crm_activities_customers REFERENCES dbo.customers(id),
    supplier_id nvarchar(64) NULL CONSTRAINT FK_crm_activities_suppliers REFERENCES dbo.suppliers(id),
    activity_type nvarchar(100) NOT NULL,
    subject nvarchar(500) NOT NULL,
    notes nvarchar(max) NULL,
    owner_user_id nvarchar(64) NULL CONSTRAINT FK_crm_activities_users REFERENCES dbo.users(id),
    occurred_at datetime2(3) NOT NULL,
    created_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.leads', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.leads (
    id nvarchar(64) NOT NULL CONSTRAINT PK_leads PRIMARY KEY,
    name nvarchar(120) NOT NULL,
    email nvarchar(160) NOT NULL,
    company nvarchar(160) NOT NULL,
    enquiry_type nvarchar(80) NOT NULL,
    message nvarchar(2200) NOT NULL,
    submission_fingerprint nchar(64) NULL,
    status nvarchar(32) NOT NULL CONSTRAINT DF_leads_status DEFAULT N'new',
    owner_user_id nvarchar(64) NULL CONSTRAINT FK_leads_users REFERENCES dbo.users(id),
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.lead_details', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.lead_details (
    lead_id nvarchar(64) NOT NULL CONSTRAINT PK_lead_details PRIMARY KEY
      CONSTRAINT FK_lead_details_leads REFERENCES dbo.leads(id) ON DELETE CASCADE,
    role_title nvarchar(120) NOT NULL,
    country nvarchar(80) NOT NULL,
    telephone nvarchar(40) NULL,
    consent_at datetime2(3) NOT NULL,
    privacy_notice_version nvarchar(64) NOT NULL CONSTRAINT DF_lead_details_privacy DEFAULT N'2026-07-11-v1.0',
    safety_confirmation_at datetime2(3) NULL,
    source_page nvarchar(120) NOT NULL CONSTRAINT DF_lead_details_source DEFAULT N'corporate_website'
  );
END
GO

IF OBJECT_ID(N'dbo.support_tickets', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.support_tickets (
    id nvarchar(64) NOT NULL CONSTRAINT PK_support_tickets PRIMARY KEY,
    ticket_number nvarchar(100) NOT NULL CONSTRAINT UQ_support_tickets_number UNIQUE,
    customer_id nvarchar(64) NULL CONSTRAINT FK_support_tickets_customers REFERENCES dbo.customers(id),
    requester_user_id nvarchar(64) NULL CONSTRAINT FK_support_tickets_users REFERENCES dbo.users(id),
    category nvarchar(100) NOT NULL,
    priority nvarchar(32) NOT NULL,
    status nvarchar(40) NOT NULL,
    subject nvarchar(500) NOT NULL,
    description nvarchar(max) NOT NULL,
    order_id nvarchar(64) NULL CONSTRAINT FK_support_tickets_orders REFERENCES dbo.orders(id),
    product_id nvarchar(64) NULL CONSTRAINT FK_support_tickets_products REFERENCES dbo.products(id),
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.notifications', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.notifications (
    id nvarchar(64) NOT NULL CONSTRAINT PK_notifications PRIMARY KEY,
    channel nvarchar(40) NOT NULL,
    recipient nvarchar(320) NOT NULL,
    template_code nvarchar(100) NOT NULL,
    entity_type nvarchar(80) NULL,
    entity_id nvarchar(128) NULL,
    status nvarchar(40) NOT NULL,
    payload_json nvarchar(max) NOT NULL CONSTRAINT DF_notifications_payload DEFAULT N'{}',
    created_at datetime2(3) NOT NULL,
    sent_at datetime2(3) NULL
  );
END
GO

IF OBJECT_ID(N'dbo.account_applications', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.account_applications (
    id nvarchar(64) NOT NULL CONSTRAINT PK_account_applications PRIMARY KEY,
    application_number nvarchar(100) NOT NULL CONSTRAINT UQ_account_applications_number UNIQUE,
    status nvarchar(40) NOT NULL,
    company_json nvarchar(max) NOT NULL,
    responsible_people_json nvarchar(max) NOT NULL CONSTRAINT DF_account_applications_people DEFAULT N'[]',
    addresses_json nvarchar(max) NOT NULL CONSTRAINT DF_account_applications_addresses DEFAULT N'[]',
    compliance_json nvarchar(max) NOT NULL CONSTRAINT DF_account_applications_compliance DEFAULT N'{}',
    bank_json nvarchar(max) NOT NULL CONSTRAINT DF_account_applications_bank DEFAULT N'{}',
    submitted_by_email nvarchar(160) NOT NULL,
    privacy_notice_version nvarchar(64) NOT NULL CONSTRAINT DF_account_applications_privacy DEFAULT N'2026-07-11-v1.0',
    applicant_declaration_at datetime2(3) NULL,
    customer_id nvarchar(64) NULL CONSTRAINT FK_account_applications_customers REFERENCES dbo.customers(id),
    version int NOT NULL CONSTRAINT DF_account_applications_version DEFAULT 1,
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.training_records', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.training_records (
    id nvarchar(64) NOT NULL CONSTRAINT PK_training_records PRIMARY KEY,
    employee_id nvarchar(64) NOT NULL CONSTRAINT FK_training_records_employees REFERENCES dbo.employees(id),
    course_code nvarchar(100) NOT NULL,
    course_version nvarchar(64) NOT NULL,
    status nvarchar(40) NOT NULL,
    assigned_at datetime2(3) NOT NULL,
    completed_at datetime2(3) NULL,
    result nvarchar(100) NULL,
    document_id nvarchar(64) NULL CONSTRAINT FK_training_records_documents REFERENCES dbo.documents(id)
  );
END
GO

IF OBJECT_ID(N'dbo.integration_events', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.integration_events (
    id nvarchar(64) NOT NULL CONSTRAINT PK_integration_events PRIMARY KEY,
    event_type nvarchar(160) NOT NULL,
    aggregate_type nvarchar(80) NOT NULL,
    aggregate_id nvarchar(128) NOT NULL,
    source_system nvarchar(64) NOT NULL CONSTRAINT DF_integration_events_source DEFAULT N'novapharm',
    destination_system nvarchar(80) NOT NULL,
    idempotency_key nvarchar(360) NOT NULL,
    payload_json nvarchar(max) NOT NULL,
    status nvarchar(40) NOT NULL CONSTRAINT DF_integration_events_status DEFAULT N'pending',
    attempt_count int NOT NULL CONSTRAINT DF_integration_events_attempts DEFAULT 0,
    next_attempt_at datetime2(3) NOT NULL,
    last_error_code nvarchar(160) NULL,
    created_at datetime2(3) NOT NULL,
    processed_at datetime2(3) NULL,
    CONSTRAINT UQ_integration_events_destination_key UNIQUE(destination_system, idempotency_key)
  );
END
GO

IF OBJECT_ID(N'dbo.audit_logs', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.audit_logs (
    id nvarchar(64) NOT NULL CONSTRAINT PK_audit_logs PRIMARY KEY,
    actor nvarchar(160) NOT NULL,
    action nvarchar(160) NOT NULL,
    entity_type nvarchar(80) NOT NULL,
    entity_id nvarchar(128) NOT NULL,
    correlation_id nvarchar(64) NOT NULL,
    before_hash nchar(64) NULL,
    after_hash nchar(64) NULL,
    details_json nvarchar(max) NOT NULL CONSTRAINT DF_audit_logs_details DEFAULT N'{}',
    occurred_at datetime2(3) NOT NULL
  );
END
GO

IF OBJECT_ID(N'dbo.counters', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.counters (
    counter_key nvarchar(240) NOT NULL CONSTRAINT PK_counters PRIMARY KEY,
    value bigint NOT NULL
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_orders_customer_status' AND object_id = OBJECT_ID(N'dbo.orders'))
  CREATE INDEX idx_orders_customer_status ON dbo.orders(customer_id, status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_documents_entity' AND object_id = OBJECT_ID(N'dbo.document_links'))
  CREATE INDEX idx_documents_entity ON dbo.document_links(entity_type, entity_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_events_delivery' AND object_id = OBJECT_ID(N'dbo.integration_events'))
  CREATE INDEX idx_events_delivery ON dbo.integration_events(status, next_attempt_at, destination_system);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_audit_entity' AND object_id = OBJECT_ID(N'dbo.audit_logs'))
  CREATE INDEX idx_audit_entity ON dbo.audit_logs(entity_type, entity_id, occurred_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_products_search' AND object_id = OBJECT_ID(N'dbo.products'))
  CREATE INDEX idx_products_search ON dbo.products(product_name, sku, gtin);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_leads_status' AND object_id = OBJECT_ID(N'dbo.leads'))
  CREATE INDEX idx_leads_status ON dbo.leads(status, created_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_leads_fingerprint' AND object_id = OBJECT_ID(N'dbo.leads'))
  CREATE INDEX idx_leads_fingerprint ON dbo.leads(submission_fingerprint, created_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_auth_sessions_expiry' AND object_id = OBJECT_ID(N'dbo.auth_sessions'))
  CREATE INDEX idx_auth_sessions_expiry ON dbo.auth_sessions(expires_at, revoked_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_security_events_username' AND object_id = OBJECT_ID(N'dbo.security_events'))
  CREATE INDEX idx_security_events_username ON dbo.security_events(username, occurred_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_security_events_network' AND object_id = OBJECT_ID(N'dbo.security_events'))
  CREATE INDEX idx_security_events_network ON dbo.security_events(network_fingerprint, occurred_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_users_federated_identity' AND object_id = OBJECT_ID(N'dbo.users'))
  CREATE UNIQUE INDEX idx_users_federated_identity ON dbo.users(identity_issuer, external_subject) WHERE external_subject IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_users_entra_object' AND object_id = OBJECT_ID(N'dbo.users'))
  CREATE UNIQUE INDEX idx_users_entra_object ON dbo.users(entra_object_id) WHERE entra_object_id IS NOT NULL;
GO
