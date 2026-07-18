IF COL_LENGTH(N'dbo.leads', N'lead_number') IS NULL
  ALTER TABLE dbo.leads ADD lead_number nvarchar(40) NULL;
GO

UPDATE dbo.leads
SET lead_number = CONCAT(N'NP-LEAD-LEGACY-', LEFT(REPLACE(id, N'-', N''), 12))
WHERE lead_number IS NULL OR lead_number = N'';
GO

ALTER TABLE dbo.leads ALTER COLUMN lead_number nvarchar(40) NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_leads_lead_number' AND object_id = OBJECT_ID(N'dbo.leads'))
  CREATE UNIQUE INDEX UX_leads_lead_number ON dbo.leads(lead_number);
GO

IF COL_LENGTH(N'dbo.leads', N'delivery_state') IS NULL
  ALTER TABLE dbo.leads ADD delivery_state nvarchar(32) NOT NULL
    CONSTRAINT DF_leads_delivery_state DEFAULT N'queued';
GO

IF COL_LENGTH(N'dbo.lead_details', N'source_cta') IS NULL
  ALTER TABLE dbo.lead_details ADD source_cta nvarchar(120) NULL;
IF COL_LENGTH(N'dbo.lead_details', N'utm_source') IS NULL
  ALTER TABLE dbo.lead_details ADD utm_source nvarchar(160) NULL;
IF COL_LENGTH(N'dbo.lead_details', N'utm_medium') IS NULL
  ALTER TABLE dbo.lead_details ADD utm_medium nvarchar(160) NULL;
IF COL_LENGTH(N'dbo.lead_details', N'utm_campaign') IS NULL
  ALTER TABLE dbo.lead_details ADD utm_campaign nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.lead_details', N'referrer_domain') IS NULL
  ALTER TABLE dbo.lead_details ADD referrer_domain nvarchar(255) NULL;
IF COL_LENGTH(N'dbo.lead_details', N'network_fingerprint') IS NULL
  ALTER TABLE dbo.lead_details ADD network_fingerprint nchar(64) NULL;
GO

IF COL_LENGTH(N'dbo.account_applications', N'submission_key') IS NULL
  ALTER TABLE dbo.account_applications ADD submission_key nvarchar(128) NULL;
IF COL_LENGTH(N'dbo.account_applications', N'expected_document_count') IS NULL
  ALTER TABLE dbo.account_applications ADD expected_document_count int NOT NULL
    CONSTRAINT DF_account_applications_expected_documents DEFAULT 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_account_applications_submission_key' AND object_id = OBJECT_ID(N'dbo.account_applications'))
  CREATE UNIQUE INDEX UX_account_applications_submission_key
    ON dbo.account_applications(submission_key) WHERE submission_key IS NOT NULL;
GO

IF COL_LENGTH(N'dbo.documents', N'idempotency_key') IS NULL
  ALTER TABLE dbo.documents ADD idempotency_key nchar(64) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_documents_idempotency_key' AND object_id = OBJECT_ID(N'dbo.documents'))
  CREATE UNIQUE INDEX UX_documents_idempotency_key
    ON dbo.documents(idempotency_key) WHERE idempotency_key IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.application_status_history', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.application_status_history (
    id nvarchar(64) NOT NULL CONSTRAINT PK_application_status_history PRIMARY KEY,
    application_id nvarchar(64) NOT NULL
      CONSTRAINT FK_application_status_history_application REFERENCES dbo.account_applications(id) ON DELETE CASCADE,
    from_status nvarchar(40) NULL,
    to_status nvarchar(40) NOT NULL,
    actor nvarchar(160) NOT NULL,
    reason nvarchar(1000) NULL,
    occurred_at datetime2(3) NOT NULL
  );
  CREATE INDEX IX_application_status_history_application
    ON dbo.application_status_history(application_id, occurred_at);
END
GO

CREATE OR ALTER TRIGGER dbo.TR_application_status_history_immutable
ON dbo.application_status_history
INSTEAD OF UPDATE, DELETE
AS
  THROW 51000, 'Application status history is immutable.', 1;
GO

IF OBJECT_ID(N'dbo.application_upload_grants', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.application_upload_grants (
    id nvarchar(64) NOT NULL CONSTRAINT PK_application_upload_grants PRIMARY KEY,
    application_id nvarchar(64) NOT NULL
      CONSTRAINT FK_application_upload_grants_application REFERENCES dbo.account_applications(id) ON DELETE CASCADE,
    purpose nvarchar(16) NOT NULL,
    token_hash nchar(64) NOT NULL,
    expires_at datetime2(3) NOT NULL,
    max_files int NOT NULL CONSTRAINT DF_application_upload_grants_max_files DEFAULT 0,
    uploaded_count int NOT NULL CONSTRAINT DF_application_upload_grants_uploaded_count DEFAULT 0,
    last_used_at datetime2(3) NULL,
    revoked_at datetime2(3) NULL,
    created_at datetime2(3) NOT NULL,
    CONSTRAINT CK_application_upload_grants_purpose CHECK(purpose IN (N'upload', N'resume')),
    CONSTRAINT CK_application_upload_grants_counts CHECK(max_files >= 0 AND max_files <= 10 AND uploaded_count >= 0)
  );
  CREATE INDEX IX_application_upload_grants_application
    ON dbo.application_upload_grants(application_id, purpose, expires_at, revoked_at);
END
GO

IF OBJECT_ID(N'dbo.customer_contacts', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.customer_contacts (
    id nvarchar(64) NOT NULL CONSTRAINT PK_customer_contacts PRIMARY KEY,
    customer_id nvarchar(64) NOT NULL
      CONSTRAINT FK_customer_contacts_customer REFERENCES dbo.customers(id) ON DELETE CASCADE,
    name nvarchar(120) NOT NULL,
    role_title nvarchar(120) NOT NULL,
    email nvarchar(160) NOT NULL,
    is_primary bit NOT NULL CONSTRAINT DF_customer_contacts_primary DEFAULT 0,
    status nvarchar(32) NOT NULL CONSTRAINT DF_customer_contacts_status DEFAULT N'invited',
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    CONSTRAINT UQ_customer_contacts_customer_email UNIQUE(customer_id, email)
  );
END
GO

CREATE OR ALTER VIEW dbo.reporting_current_leads AS
  SELECT l.lead_number, l.name, l.email, l.company, l.enquiry_type, l.status, l.delivery_state,
    d.role_title, d.country, d.source_page, d.source_cta, d.utm_source, d.utm_medium,
    d.utm_campaign, d.referrer_domain, l.created_at, l.updated_at
  FROM dbo.leads l JOIN dbo.lead_details d ON d.lead_id = l.id;
GO

CREATE OR ALTER VIEW dbo.reporting_application_pipeline AS
  SELECT a.application_number, a.status, a.submitted_by_email, a.expected_document_count,
    COUNT(DISTINCT dl.document_id) AS uploaded_document_count, a.customer_id, a.created_at, a.updated_at
  FROM dbo.account_applications a
  LEFT JOIN dbo.document_links dl ON dl.entity_type = N'account_application' AND dl.entity_id = a.id
  GROUP BY a.id, a.application_number, a.status, a.submitted_by_email,
    a.expected_document_count, a.customer_id, a.created_at, a.updated_at;
GO

CREATE OR ALTER VIEW dbo.reporting_notification_delivery AS
  SELECT template_code, entity_type, status, COUNT_BIG(*) AS notification_count,
    MAX(created_at) AS latest_created_at, MAX(sent_at) AS latest_sent_at
  FROM dbo.notifications WHERE channel = N'email'
  GROUP BY template_code, entity_type, status;
GO

CREATE OR ALTER VIEW dbo.reporting_daily_form_activity AS
  SELECT CAST(created_at AS date) AS activity_date, N'contact' AS activity_type, COUNT_BIG(*) AS activity_count
  FROM dbo.leads GROUP BY CAST(created_at AS date)
  UNION ALL
  SELECT CAST(created_at AS date), N'account_application', COUNT_BIG(*)
  FROM dbo.account_applications GROUP BY CAST(created_at AS date);
GO

CREATE OR ALTER VIEW dbo.reporting_utm_attribution AS
  SELECT COALESCE(utm_source, N'unattributed') AS utm_source,
    COALESCE(utm_medium, N'unattributed') AS utm_medium,
    COALESCE(utm_campaign, N'unattributed') AS utm_campaign,
    COUNT_BIG(*) AS lead_count
  FROM dbo.lead_details GROUP BY utm_source, utm_medium, utm_campaign;
GO

CREATE OR ALTER VIEW dbo.reporting_active_portal_users AS
  SELECT s.username, u.display_name, u.role, s.access_type, s.created_at, s.last_seen_at, s.expires_at
  FROM dbo.auth_sessions s JOIN dbo.users u ON u.username = s.username
  WHERE s.revoked_at IS NULL AND s.expires_at > SYSUTCDATETIME();
GO

CREATE OR ALTER VIEW dbo.reporting_security_events AS
  SELECT event_type, outcome, COUNT_BIG(*) AS event_count, MAX(occurred_at) AS latest_event
  FROM dbo.security_events GROUP BY event_type, outcome;
GO

CREATE OR ALTER VIEW dbo.reporting_document_quarantine AS
  SELECT d.document_number, d.document_class, d.lifecycle_status, d.security_status,
    d.malware_scan_result, dl.entity_type, dl.entity_id, d.created_at, d.updated_at
  FROM dbo.documents d JOIN dbo.document_links dl ON dl.document_id = d.id
  WHERE d.lifecycle_status = N'quarantine' OR d.security_status <> N'clean';
GO

CREATE OR ALTER VIEW dbo.reporting_account_activation AS
  SELECT a.application_number, a.status, c.customer_number, a.updated_at AS activated_at
  FROM dbo.account_applications a LEFT JOIN dbo.customers c ON c.id = a.customer_id
  WHERE a.status = N'activated' OR a.customer_id IS NOT NULL;
GO

IF DATABASE_PRINCIPAL_ID(N'novapharm_reporting_reader') IS NULL
  CREATE ROLE novapharm_reporting_reader AUTHORIZATION dbo;
GO

GRANT SELECT ON OBJECT::dbo.reporting_current_leads TO novapharm_reporting_reader;
GRANT SELECT ON OBJECT::dbo.reporting_application_pipeline TO novapharm_reporting_reader;
GRANT SELECT ON OBJECT::dbo.reporting_notification_delivery TO novapharm_reporting_reader;
GRANT SELECT ON OBJECT::dbo.reporting_daily_form_activity TO novapharm_reporting_reader;
GRANT SELECT ON OBJECT::dbo.reporting_utm_attribution TO novapharm_reporting_reader;
GRANT SELECT ON OBJECT::dbo.reporting_active_portal_users TO novapharm_reporting_reader;
GRANT SELECT ON OBJECT::dbo.reporting_security_events TO novapharm_reporting_reader;
GRANT SELECT ON OBJECT::dbo.reporting_document_quarantine TO novapharm_reporting_reader;
GRANT SELECT ON OBJECT::dbo.reporting_account_activation TO novapharm_reporting_reader;
GO
