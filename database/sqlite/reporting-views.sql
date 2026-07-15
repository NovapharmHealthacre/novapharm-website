CREATE VIEW reporting_current_leads AS
  SELECT l.lead_number, l.name, l.email, l.company, l.enquiry_type, l.status, l.delivery_state,
    d.role_title, d.country, d.source_page, d.source_cta, d.utm_source, d.utm_medium,
    d.utm_campaign, d.referrer_domain, l.created_at, l.updated_at
  FROM leads l JOIN lead_details d ON d.lead_id = l.id;

CREATE VIEW reporting_application_pipeline AS
  SELECT a.application_number, a.status, a.submitted_by_email, a.expected_document_count,
    COUNT(DISTINCT dl.document_id) AS uploaded_document_count, a.customer_id, a.created_at, a.updated_at
  FROM account_applications a
  LEFT JOIN document_links dl ON dl.entity_type = 'account_application' AND dl.entity_id = a.id
  GROUP BY a.id, a.application_number, a.status, a.submitted_by_email,
    a.expected_document_count, a.customer_id, a.created_at, a.updated_at;

CREATE VIEW reporting_notification_delivery AS
  SELECT template_code, entity_type, status, COUNT(*) AS notification_count,
    MAX(created_at) AS latest_created_at, MAX(sent_at) AS latest_sent_at
  FROM notifications WHERE channel = 'email'
  GROUP BY template_code, entity_type, status;

CREATE VIEW reporting_daily_form_activity AS
  SELECT substr(created_at, 1, 10) AS activity_date, 'contact' AS activity_type, COUNT(*) AS activity_count
  FROM leads GROUP BY substr(created_at, 1, 10)
  UNION ALL
  SELECT substr(created_at, 1, 10), 'account_application', COUNT(*)
  FROM account_applications GROUP BY substr(created_at, 1, 10);

CREATE VIEW reporting_utm_attribution AS
  SELECT COALESCE(utm_source, 'unattributed') AS utm_source,
    COALESCE(utm_medium, 'unattributed') AS utm_medium,
    COALESCE(utm_campaign, 'unattributed') AS utm_campaign,
    COUNT(*) AS lead_count
  FROM lead_details GROUP BY utm_source, utm_medium, utm_campaign;

CREATE VIEW reporting_active_portal_users AS
  SELECT s.username, u.display_name, u.role, s.access_type, s.created_at, s.last_seen_at, s.expires_at
  FROM auth_sessions s JOIN users u ON u.username = s.username
  WHERE s.revoked_at IS NULL AND datetime(s.expires_at) > datetime('now');

CREATE VIEW reporting_security_events AS
  SELECT event_type, outcome, COUNT(*) AS event_count, MAX(occurred_at) AS latest_event
  FROM security_events GROUP BY event_type, outcome;

CREATE VIEW reporting_document_quarantine AS
  SELECT d.document_number, d.document_class, d.lifecycle_status, d.security_status,
    d.malware_scan_result, dl.entity_type, dl.entity_id, d.created_at, d.updated_at
  FROM documents d JOIN document_links dl ON dl.document_id = d.id
  WHERE d.lifecycle_status = 'quarantine' OR d.security_status <> 'clean';

CREATE VIEW reporting_account_activation AS
  SELECT a.application_number, a.status, c.customer_number, a.updated_at AS activated_at
  FROM account_applications a LEFT JOIN customers c ON c.id = a.customer_id
  WHERE a.status = 'activated' OR a.customer_id IS NOT NULL;
