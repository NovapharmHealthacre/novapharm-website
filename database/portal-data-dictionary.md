# Enterprise portal data dictionary

- Version: 1.0
- Reviewed: 2026-07-16
- Tables documented: 94
- Sources: `database/schema.sql` and `database/sqlite/004_integrated_enterprise_portal.sql`
- Azure parity: `database/azure/004_integrated_enterprise_portal.sql` is validated structurally by the migration test

## Global conventions

- Monetary values use integer minor units plus an ISO currency code.
- Synthetic records use TEST/DEMO identifiers and never represent NovaPharm revenue, stock, customers or regulatory approvals.
- Timestamps are ISO-8601 UTC values.
- Foreign keys and unique constraints enforce identity and relationship integrity.
- Lifecycle changes use version fields and controlled services where supplied.
- Private document storage paths are never returned by public or portal snapshot APIs.

## account_applications

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `application_number` | TEXT NOT NULL UNIQUE |
| `submission_key` | TEXT UNIQUE |
| `status` | TEXT NOT NULL |
| `expected_document_count` | INTEGER NOT NULL DEFAULT 0 CHECK(expected_document_count >= 0 AND expected_document_count <= 10) |
| `company_json` | TEXT NOT NULL |
| `responsible_people_json` | TEXT NOT NULL DEFAULT '[]' |
| `addresses_json` | TEXT NOT NULL DEFAULT '[]' |
| `compliance_json` | TEXT NOT NULL DEFAULT '{}' |
| `bank_json` | TEXT NOT NULL DEFAULT '{}' |
| `submitted_by_email` | TEXT NOT NULL |
| `privacy_notice_version` | TEXT NOT NULL DEFAULT '2026-07-14-v1.1' |
| `applicant_declaration_at` | TEXT |
| `customer_id` | TEXT REFERENCES customers(id) |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## application_status_history

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `application_id` | TEXT NOT NULL REFERENCES account_applications(id) ON DELETE CASCADE |
| `from_status` | TEXT |
| `to_status` | TEXT NOT NULL |
| `actor` | TEXT NOT NULL |
| `reason` | TEXT |
| `occurred_at` | TEXT NOT NULL |

## application_upload_grants

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `application_id` | TEXT NOT NULL REFERENCES account_applications(id) ON DELETE CASCADE |
| `purpose` | TEXT NOT NULL CHECK(purpose IN ('upload', 'resume')) |
| `token_hash` | TEXT NOT NULL |
| `expires_at` | TEXT NOT NULL |
| `max_files` | INTEGER NOT NULL DEFAULT 0 CHECK(max_files >= 0 AND max_files <= 10) |
| `uploaded_count` | INTEGER NOT NULL DEFAULT 0 CHECK(uploaded_count >= 0) |
| `last_used_at` | TEXT |
| `revoked_at` | TEXT |
| `created_at` | TEXT NOT NULL |

## approvals

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `entity_type` | TEXT NOT NULL |
| `entity_id` | TEXT NOT NULL |
| `workflow_type` | TEXT NOT NULL |
| `stage` | TEXT NOT NULL |
| `outcome` | TEXT |
| `actor_user_id` | TEXT REFERENCES users(id) |
| `comments` | TEXT |
| `decided_at` | TEXT |
| `created_at` | TEXT NOT NULL |

## audit_logs

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `actor` | TEXT NOT NULL |
| `action` | TEXT NOT NULL |
| `entity_type` | TEXT NOT NULL |
| `entity_id` | TEXT NOT NULL |
| `correlation_id` | TEXT NOT NULL |
| `before_hash` | TEXT |
| `after_hash` | TEXT |
| `details_json` | TEXT NOT NULL DEFAULT '{}' |
| `occurred_at` | TEXT NOT NULL |

## auth_credentials

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `username` | TEXT PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE |
| `password_hash` | TEXT NOT NULL |
| `password_salt` | TEXT NOT NULL |
| `password_algorithm` | TEXT NOT NULL DEFAULT 'pbkdf2-sha256' |
| `password_iterations` | INTEGER NOT NULL DEFAULT 210000 |
| `failed_attempts` | INTEGER NOT NULL DEFAULT 0 |
| `locked_until` | TEXT |
| `must_change_password` | INTEGER NOT NULL DEFAULT 0 CHECK(must_change_password IN (0, 1)) |
| `credential_version` | INTEGER NOT NULL DEFAULT 1 CHECK(credential_version >= 1) |
| `credential_source` | TEXT NOT NULL DEFAULT 'environment' |
| `password_changed_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## auth_sessions

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `username` | TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE |
| `access_type` | TEXT NOT NULL CHECK(access_type IN ('customer', 'employee', 'board', 'admin')) |
| `credential_version` | INTEGER NOT NULL DEFAULT 1 |
| `created_at` | TEXT NOT NULL |
| `expires_at` | TEXT NOT NULL |
| `last_seen_at` | TEXT NOT NULL |
| `revoked_at` | TEXT |

## auth_user_scopes

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `username` | TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE |
| `scope` | TEXT NOT NULL CHECK(scope IN ('customer', 'employee', 'board', 'admin')) |
| `created_at` | TEXT NOT NULL |

## batches

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `product_id` | TEXT NOT NULL REFERENCES products(id) |
| `supplier_id` | TEXT REFERENCES suppliers(id) |
| `batch_number` | TEXT NOT NULL |
| `manufacture_date` | TEXT |
| `expiry_date` | TEXT NOT NULL |
| `release_status` | TEXT NOT NULL DEFAULT 'quarantine' |
| `quantity_available` | INTEGER NOT NULL DEFAULT 0 |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## capa_records

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `capa_number` | TEXT NOT NULL UNIQUE |
| `source_type` | TEXT NOT NULL |
| `source_id` | TEXT NOT NULL |
| `root_cause` | TEXT |
| `corrective_action` | TEXT |
| `preventive_action` | TEXT |
| `effectiveness_status` | TEXT NOT NULL DEFAULT 'not_assessed' |
| `status` | TEXT NOT NULL |
| `owner_user_id` | TEXT REFERENCES users(id) |
| `due_at` | TEXT |
| `closed_at` | TEXT |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## catalogue_import_items

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `catalogue_import_id` | TEXT NOT NULL REFERENCES catalogue_imports(id) ON DELETE CASCADE |
| `product_id` | TEXT NOT NULL REFERENCES products(id) |
| `source_record_id` | TEXT NOT NULL |
| `source_record_checksum_sha256` | TEXT NOT NULL |
| `outcome` | TEXT NOT NULL CHECK(outcome IN ('created', 'updated', 'unchanged')) |
| `created_at` | TEXT NOT NULL |

## catalogue_imports

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `catalogue_code` | TEXT NOT NULL |
| `catalogue_version` | TEXT NOT NULL |
| `source_checksum_sha256` | TEXT NOT NULL |
| `register_checksum_sha256` | TEXT NOT NULL |
| `product_count` | INTEGER NOT NULL CHECK(product_count > 0) |
| `status` | TEXT NOT NULL CHECK(status IN ('validated', 'imported', 'failed')) |
| `validation_json` | TEXT NOT NULL DEFAULT '{}' |
| `imported_by` | TEXT NOT NULL |
| `imported_at` | TEXT NOT NULL |

## change_controls

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `change_number` | TEXT NOT NULL UNIQUE |
| `entity_type` | TEXT NOT NULL |
| `entity_id` | TEXT NOT NULL |
| `change_type` | TEXT NOT NULL |
| `risk_level` | TEXT NOT NULL |
| `status` | TEXT NOT NULL |
| `description` | TEXT NOT NULL |
| `implementation_date` | TEXT |
| `owner_user_id` | TEXT REFERENCES users(id) |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## counters

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `counter_key` | TEXT PRIMARY KEY |
| `value` | INTEGER NOT NULL |

## credit_note_lines

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `credit_note_id` | TEXT NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE |
| `product_id` | TEXT REFERENCES products(id) |
| `description` | TEXT NOT NULL |
| `quantity` | INTEGER NOT NULL CHECK(quantity > 0) |
| `unit_amount_minor` | INTEGER NOT NULL CHECK(unit_amount_minor >= 0) |
| `line_total_minor` | INTEGER NOT NULL CHECK(line_total_minor >= 0) |

## credit_notes

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `credit_note_number` | TEXT NOT NULL UNIQUE |
| `customer_id` | TEXT NOT NULL REFERENCES customers(id) |
| `invoice_id` | TEXT REFERENCES invoices(id) |
| `return_id` | TEXT REFERENCES returns(id) |
| `status` | TEXT NOT NULL CHECK(status IN ('draft', 'approved', 'issued', 'cancelled')) |
| `issue_date` | TEXT |
| `total_minor` | INTEGER NOT NULL CHECK(total_minor >= 0) |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `reason` | TEXT NOT NULL |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## crm_activities

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `customer_id` | TEXT REFERENCES customers(id) |
| `supplier_id` | TEXT REFERENCES suppliers(id) |
| `activity_type` | TEXT NOT NULL |
| `subject` | TEXT NOT NULL |
| `notes` | TEXT |
| `owner_user_id` | TEXT REFERENCES users(id) |
| `occurred_at` | TEXT NOT NULL |
| `created_at` | TEXT NOT NULL |

## crm_opportunities

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `opportunity_number` | TEXT NOT NULL UNIQUE |
| `lead_id` | TEXT REFERENCES leads(id) |
| `organization_id` | TEXT REFERENCES organizations(id) |
| `customer_id` | TEXT REFERENCES customers(id) |
| `name` | TEXT NOT NULL |
| `opportunity_type` | TEXT NOT NULL |
| `stage` | TEXT NOT NULL |
| `probability_basis_points` | INTEGER NOT NULL DEFAULT 0 CHECK(probability_basis_points BETWEEN 0 AND 10000) |
| `estimated_value_minor` | INTEGER CHECK(estimated_value_minor IS NULL OR estimated_value_minor >= 0) |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `owner_user_id` | TEXT REFERENCES users(id) |
| `next_action` | TEXT |
| `next_action_at` | TEXT |
| `closed_at` | TEXT |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## crm_stage_history

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `opportunity_id` | TEXT NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE |
| `from_stage` | TEXT |
| `to_stage` | TEXT NOT NULL |
| `actor` | TEXT NOT NULL |
| `reason` | TEXT |
| `occurred_at` | TEXT NOT NULL |

## customer_contacts

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `customer_id` | TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE |
| `name` | TEXT NOT NULL |
| `role_title` | TEXT NOT NULL |
| `email` | TEXT NOT NULL |
| `is_primary` | INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)) |
| `status` | TEXT NOT NULL DEFAULT 'invited' |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## customer_price_lists

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `customer_id` | TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE |
| `price_list_id` | TEXT NOT NULL REFERENCES price_lists(id) |
| `priority` | INTEGER NOT NULL DEFAULT 100 |
| `valid_from` | TEXT |
| `valid_to` | TEXT |
| `created_at` | TEXT NOT NULL |

## customer_statements

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `statement_number` | TEXT NOT NULL UNIQUE |
| `customer_id` | TEXT NOT NULL REFERENCES customers(id) |
| `period_start` | TEXT NOT NULL |
| `period_end` | TEXT NOT NULL |
| `opening_balance_minor` | INTEGER NOT NULL |
| `closing_balance_minor` | INTEGER NOT NULL |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `document_id` | TEXT REFERENCES documents(id) |
| `generated_at` | TEXT NOT NULL |

## customers

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `organization_id` | TEXT NOT NULL REFERENCES organizations(id) |
| `customer_number` | TEXT NOT NULL UNIQUE |
| `customer_type` | TEXT NOT NULL |
| `lifecycle_status` | TEXT NOT NULL |
| `credit_limit_minor` | INTEGER NOT NULL DEFAULT 0 |
| `outstanding_balance_minor` | INTEGER NOT NULL DEFAULT 0 |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `payment_terms_days` | INTEGER NOT NULL DEFAULT 30 |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `source_system` | TEXT NOT NULL DEFAULT 'novapharm' |
| `created_at` | TEXT NOT NULL |
| `created_by` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |
| `updated_by` | TEXT NOT NULL |

## delivery_events

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `shipment_id` | TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE |
| `event_code` | TEXT NOT NULL |
| `event_status` | TEXT NOT NULL |
| `event_location` | TEXT |
| `external_reference` | TEXT |
| `payload_json` | TEXT NOT NULL DEFAULT '{}' |
| `occurred_at` | TEXT NOT NULL |
| `created_at` | TEXT NOT NULL |

## document_approvals

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `document_id` | TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE |
| `document_version_id` | TEXT REFERENCES document_versions(id) |
| `stage` | TEXT NOT NULL |
| `outcome` | TEXT |
| `requested_by` | TEXT NOT NULL |
| `decided_by` | TEXT |
| `comments` | TEXT |
| `requested_at` | TEXT NOT NULL |
| `decided_at` | TEXT |

## document_links

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `document_id` | TEXT NOT NULL REFERENCES documents(id) |
| `entity_type` | TEXT NOT NULL |
| `entity_id` | TEXT NOT NULL |
| `relationship` | TEXT NOT NULL |
| `created_at` | TEXT NOT NULL |

## document_versions

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `document_id` | TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE |
| `version_number` | INTEGER NOT NULL CHECK(version_number > 0) |
| `storage_path` | TEXT NOT NULL |
| `checksum_sha256` | TEXT NOT NULL |
| `change_summary` | TEXT |
| `lifecycle_status` | TEXT NOT NULL |
| `created_by` | TEXT NOT NULL |
| `created_at` | TEXT NOT NULL |

## documents

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `document_number` | TEXT NOT NULL UNIQUE |
| `title` | TEXT NOT NULL |
| `file_name` | TEXT NOT NULL |
| `content_type` | TEXT NOT NULL |
| `size_bytes` | INTEGER NOT NULL |
| `checksum_sha256` | TEXT NOT NULL |
| `idempotency_key` | TEXT UNIQUE |
| `storage_path` | TEXT NOT NULL |
| `document_class` | TEXT NOT NULL |
| `lifecycle_status` | TEXT NOT NULL DEFAULT 'draft' |
| `retention_class` | TEXT NOT NULL DEFAULT 'business_7_years' |
| `security_status` | TEXT NOT NULL DEFAULT 'scan_not_configured' |
| `malware_scan_result` | TEXT |
| `malware_scanned_at` | TEXT |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `created_at` | TEXT NOT NULL |
| `created_by` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |
| `updated_by` | TEXT NOT NULL |

## domain_events

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `event_type` | TEXT NOT NULL |
| `aggregate_type` | TEXT NOT NULL |
| `aggregate_id` | TEXT NOT NULL |
| `aggregate_version` | INTEGER NOT NULL |
| `correlation_id` | TEXT NOT NULL |
| `causation_id` | TEXT |
| `actor` | TEXT NOT NULL |
| `payload_json` | TEXT NOT NULL |
| `occurred_at` | TEXT NOT NULL |

## employees

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `user_id` | TEXT UNIQUE REFERENCES users(id) |
| `employee_number` | TEXT NOT NULL UNIQUE |
| `department` | TEXT NOT NULL |
| `manager_employee_id` | TEXT REFERENCES employees(id) |
| `employment_status` | TEXT NOT NULL |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## goods_receipt_lines

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `goods_receipt_id` | TEXT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE |
| `purchase_order_line_id` | TEXT NOT NULL REFERENCES purchase_order_lines(id) |
| `batch_id` | TEXT REFERENCES batches(id) |
| `quantity_received` | INTEGER NOT NULL CHECK(quantity_received > 0) |
| `quantity_rejected` | INTEGER NOT NULL DEFAULT 0 CHECK(quantity_rejected >= 0) |

## goods_receipts

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `receipt_number` | TEXT NOT NULL UNIQUE |
| `purchase_order_id` | TEXT NOT NULL REFERENCES purchase_orders(id) |
| `supplier_id` | TEXT NOT NULL REFERENCES suppliers(id) |
| `status` | TEXT NOT NULL |
| `received_at` | TEXT |
| `received_by` | TEXT |
| `document_id` | TEXT REFERENCES documents(id) |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## integration_events

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `event_type` | TEXT NOT NULL |
| `aggregate_type` | TEXT NOT NULL |
| `aggregate_id` | TEXT NOT NULL |
| `source_system` | TEXT NOT NULL DEFAULT 'novapharm' |
| `destination_system` | TEXT NOT NULL |
| `idempotency_key` | TEXT NOT NULL |
| `payload_json` | TEXT NOT NULL |
| `status` | TEXT NOT NULL DEFAULT 'pending' |
| `attempt_count` | INTEGER NOT NULL DEFAULT 0 |
| `next_attempt_at` | TEXT NOT NULL |
| `last_error_code` | TEXT |
| `created_at` | TEXT NOT NULL |
| `processed_at` | TEXT |

## inventory_balances

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `product_id` | TEXT NOT NULL REFERENCES products(id) |
| `batch_id` | TEXT NOT NULL REFERENCES batches(id) |
| `location_id` | TEXT NOT NULL REFERENCES inventory_locations(id) |
| `on_hand_quantity` | INTEGER NOT NULL DEFAULT 0 CHECK(on_hand_quantity >= 0) |
| `reserved_quantity` | INTEGER NOT NULL DEFAULT 0 CHECK(reserved_quantity >= 0) |
| `available_quantity` | INTEGER NOT NULL DEFAULT 0 CHECK(available_quantity >= 0) |
| `quarantine_quantity` | INTEGER NOT NULL DEFAULT 0 CHECK(quarantine_quantity >= 0) |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `updated_at` | TEXT NOT NULL |

## inventory_locations

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `location_code` | TEXT NOT NULL UNIQUE |
| `name` | TEXT NOT NULL |
| `location_type` | TEXT NOT NULL |
| `ownership_status` | TEXT NOT NULL DEFAULT 'third_party_validation' |
| `operational_status` | TEXT NOT NULL DEFAULT 'validation_only' |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## inventory_movements

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `product_id` | TEXT NOT NULL REFERENCES products(id) |
| `batch_id` | TEXT REFERENCES batches(id) |
| `location_id` | TEXT REFERENCES inventory_locations(id) |
| `movement_type` | TEXT NOT NULL |
| `quantity` | INTEGER NOT NULL CHECK(quantity <> 0) |
| `balance_after` | INTEGER |
| `reference_type` | TEXT NOT NULL |
| `reference_id` | TEXT NOT NULL |
| `actor` | TEXT NOT NULL |
| `correlation_id` | TEXT NOT NULL |
| `occurred_at` | TEXT NOT NULL |

## inventory_reservations

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `order_line_id` | TEXT NOT NULL REFERENCES order_lines(id) ON DELETE CASCADE |
| `batch_id` | TEXT NOT NULL REFERENCES batches(id) |
| `location_id` | TEXT NOT NULL REFERENCES inventory_locations(id) |
| `quantity` | INTEGER NOT NULL CHECK(quantity > 0) |
| `status` | TEXT NOT NULL |
| `expires_at` | TEXT |
| `created_at` | TEXT NOT NULL |
| `released_at` | TEXT |

## invoice_lines

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `invoice_id` | TEXT NOT NULL REFERENCES invoices(id) |
| `product_id` | TEXT REFERENCES products(id) |
| `description` | TEXT NOT NULL |
| `quantity` | INTEGER NOT NULL |
| `unit_price_minor` | INTEGER NOT NULL |
| `line_total_minor` | INTEGER NOT NULL |

## invoice_matches

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `supplier_invoice_id` | TEXT NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE |
| `purchase_order_id` | TEXT NOT NULL REFERENCES purchase_orders(id) |
| `goods_receipt_id` | TEXT REFERENCES goods_receipts(id) |
| `match_status` | TEXT NOT NULL |
| `variance_minor` | INTEGER NOT NULL DEFAULT 0 |
| `reviewed_by` | TEXT |
| `reviewed_at` | TEXT |
| `created_at` | TEXT NOT NULL |

## invoices

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `invoice_number` | TEXT NOT NULL UNIQUE |
| `customer_id` | TEXT NOT NULL REFERENCES customers(id) |
| `order_id` | TEXT REFERENCES orders(id) |
| `status` | TEXT NOT NULL |
| `issue_date` | TEXT NOT NULL |
| `due_date` | TEXT NOT NULL |
| `total_minor` | INTEGER NOT NULL |
| `outstanding_minor` | INTEGER NOT NULL |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `finance_external_id` | TEXT |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## journal_entries

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `journal_number` | TEXT NOT NULL UNIQUE |
| `journal_date` | TEXT NOT NULL |
| `description` | TEXT NOT NULL |
| `source_type` | TEXT NOT NULL |
| `source_id` | TEXT |
| `status` | TEXT NOT NULL DEFAULT 'draft' |
| `prepared_by` | TEXT NOT NULL |
| `approved_by` | TEXT |
| `posted_at` | TEXT |
| `correlation_id` | TEXT NOT NULL |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## journal_lines

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `journal_entry_id` | TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE |
| `ledger_account_id` | TEXT NOT NULL REFERENCES ledger_accounts(id) |
| `customer_id` | TEXT REFERENCES customers(id) |
| `supplier_id` | TEXT REFERENCES suppliers(id) |
| `description` | TEXT |
| `debit_minor` | INTEGER NOT NULL DEFAULT 0 |
| `credit_minor` | INTEGER NOT NULL DEFAULT 0 |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |

## lead_details

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `lead_id` | TEXT PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE |
| `role_title` | TEXT NOT NULL |
| `country` | TEXT NOT NULL |
| `telephone` | TEXT |
| `consent_at` | TEXT NOT NULL |
| `privacy_notice_version` | TEXT NOT NULL DEFAULT '2026-07-14-v1.1' |
| `safety_confirmation_at` | TEXT |
| `source_page` | TEXT NOT NULL DEFAULT '/contact/' |
| `source_cta` | TEXT |
| `utm_source` | TEXT |
| `utm_medium` | TEXT |
| `utm_campaign` | TEXT |
| `referrer_domain` | TEXT |
| `network_fingerprint` | TEXT |

## leads

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `lead_number` | TEXT NOT NULL UNIQUE |
| `name` | TEXT NOT NULL |
| `email` | TEXT NOT NULL |
| `company` | TEXT NOT NULL |
| `enquiry_type` | TEXT NOT NULL |
| `message` | TEXT NOT NULL |
| `submission_fingerprint` | TEXT |
| `status` | TEXT NOT NULL DEFAULT 'new' |
| `delivery_state` | TEXT NOT NULL DEFAULT 'queued' |
| `owner_user_id` | TEXT REFERENCES users(id) |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## ledger_accounts

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `account_code` | TEXT NOT NULL UNIQUE |
| `account_name` | TEXT NOT NULL |
| `account_type` | TEXT NOT NULL |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `status` | TEXT NOT NULL DEFAULT 'active' |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## notifications

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `channel` | TEXT NOT NULL |
| `recipient` | TEXT NOT NULL |
| `template_code` | TEXT NOT NULL |
| `entity_type` | TEXT |
| `entity_id` | TEXT |
| `status` | TEXT NOT NULL |
| `payload_json` | TEXT NOT NULL DEFAULT '{}' |
| `attempt_count` | INTEGER NOT NULL DEFAULT 0 |
| `next_attempt_at` | TEXT |
| `last_attempt_at` | TEXT |
| `last_error_code` | TEXT |
| `provider_message_id` | TEXT |
| `created_at` | TEXT NOT NULL |
| `sent_at` | TEXT |

## order_lines

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `order_id` | TEXT NOT NULL REFERENCES orders(id) |
| `product_id` | TEXT NOT NULL REFERENCES products(id) |
| `quantity` | INTEGER NOT NULL CHECK(quantity > 0) |
| `unit_price_minor` | INTEGER NOT NULL CHECK(unit_price_minor >= 0) |
| `discount_basis_points` | INTEGER NOT NULL DEFAULT 0 |
| `line_total_minor` | INTEGER NOT NULL |
| `created_at` | TEXT NOT NULL |

## order_status_history

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `order_id` | TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE |
| `from_status` | TEXT |
| `to_status` | TEXT NOT NULL |
| `actor` | TEXT NOT NULL |
| `reason` | TEXT |
| `occurred_at` | TEXT NOT NULL |

## orders

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `order_number` | TEXT NOT NULL UNIQUE |
| `customer_id` | TEXT NOT NULL REFERENCES customers(id) |
| `status` | TEXT NOT NULL |
| `requested_delivery_date` | TEXT |
| `subtotal_minor` | INTEGER NOT NULL DEFAULT 0 |
| `tax_minor` | INTEGER NOT NULL DEFAULT 0 |
| `total_minor` | INTEGER NOT NULL DEFAULT 0 |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `customer_po_reference` | TEXT |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `source_system` | TEXT NOT NULL DEFAULT 'novapharm' |
| `created_at` | TEXT NOT NULL |
| `created_by` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |
| `updated_by` | TEXT NOT NULL |

## organization_addresses

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `organization_id` | TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE |
| `address_type` | TEXT NOT NULL |
| `line_1` | TEXT NOT NULL |
| `line_2` | TEXT |
| `city` | TEXT NOT NULL |
| `region` | TEXT |
| `postcode` | TEXT NOT NULL |
| `country_code` | TEXT NOT NULL |
| `is_primary` | INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)) |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## organizations

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `legal_name` | TEXT NOT NULL |
| `trading_name` | TEXT |
| `company_number` | TEXT |
| `vat_number` | TEXT |
| `country_code` | TEXT NOT NULL DEFAULT 'GB' |
| `status` | TEXT NOT NULL DEFAULT 'active' |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `source_system` | TEXT NOT NULL DEFAULT 'novapharm' |
| `created_at` | TEXT NOT NULL |
| `created_by` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |
| `updated_by` | TEXT NOT NULL |

## outbox_messages

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `domain_event_id` | TEXT NOT NULL REFERENCES domain_events(id) ON DELETE CASCADE |
| `destination` | TEXT NOT NULL |
| `message_type` | TEXT NOT NULL |
| `idempotency_key` | TEXT NOT NULL |
| `payload_json` | TEXT NOT NULL |
| `status` | TEXT NOT NULL DEFAULT 'pending' |
| `attempt_count` | INTEGER NOT NULL DEFAULT 0 |
| `next_attempt_at` | TEXT NOT NULL |
| `last_error_code` | TEXT |
| `created_at` | TEXT NOT NULL |
| `processed_at` | TEXT |

## payments

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `payment_number` | TEXT NOT NULL UNIQUE |
| `customer_id` | TEXT NOT NULL REFERENCES customers(id) |
| `invoice_id` | TEXT REFERENCES invoices(id) |
| `amount_minor` | INTEGER NOT NULL CHECK(amount_minor > 0) |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `payment_method` | TEXT NOT NULL |
| `reference` | TEXT |
| `status` | TEXT NOT NULL |
| `received_at` | TEXT |
| `created_at` | TEXT NOT NULL |

## pharmacovigilance_cases

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `case_number` | TEXT NOT NULL UNIQUE |
| `source_type` | TEXT NOT NULL |
| `source_id` | TEXT NOT NULL |
| `case_status` | TEXT NOT NULL |
| `controlled_system_reference` | TEXT |
| `received_at` | TEXT NOT NULL |
| `transferred_at` | TEXT |
| `created_at` | TEXT NOT NULL |

## price_list_items

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `price_list_id` | TEXT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE |
| `product_id` | TEXT NOT NULL REFERENCES products(id) |
| `unit_price_minor` | INTEGER NOT NULL CHECK(unit_price_minor >= 0) |
| `minimum_quantity` | INTEGER NOT NULL DEFAULT 1 CHECK(minimum_quantity > 0) |
| `status` | TEXT NOT NULL DEFAULT 'draft' |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## price_lists

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `price_list_code` | TEXT NOT NULL UNIQUE |
| `name` | TEXT NOT NULL |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `status` | TEXT NOT NULL DEFAULT 'draft' |
| `valid_from` | TEXT |
| `valid_to` | TEXT |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `created_at` | TEXT NOT NULL |
| `created_by` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |
| `updated_by` | TEXT NOT NULL |

## product_certifications

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `product_id` | TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE |
| `certification_type` | TEXT NOT NULL |
| `issuer` | TEXT |
| `external_reference` | TEXT |
| `status` | TEXT NOT NULL DEFAULT 'unverified' CHECK(status IN ('unverified', 'under_review', 'verified', 'expired', 'withdrawn')) |
| `evidence_document_id` | TEXT REFERENCES documents(id) |
| `effective_date` | TEXT |
| `expiry_date` | TEXT |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## product_claims

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `product_id` | TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE |
| `claim_text` | TEXT NOT NULL |
| `claim_type` | TEXT NOT NULL |
| `jurisdiction` | TEXT NOT NULL |
| `source_reference` | TEXT |
| `evidence_status` | TEXT NOT NULL DEFAULT 'unverified' |
| `public_use_status` | TEXT NOT NULL DEFAULT 'blocked' |
| `reviewer` | TEXT |
| `reviewed_at` | TEXT |
| `created_at` | TEXT NOT NULL |

## product_composition_items

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `product_id` | TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE |
| `sequence_number` | INTEGER NOT NULL CHECK(sequence_number > 0) |
| `ingredient_name` | TEXT NOT NULL |
| `amount_text` | TEXT NOT NULL |
| `source_reference` | TEXT NOT NULL |
| `verification_status` | TEXT NOT NULL DEFAULT 'catalogue_transcription' CHECK(verification_status IN ('catalogue_transcription', 'label_confirmed', 'blocked_discrepancy')) |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## product_families

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `family_code` | TEXT NOT NULL UNIQUE |
| `brand_name` | TEXT NOT NULL |
| `family_name` | TEXT NOT NULL |
| `category` | TEXT NOT NULL |
| `public_summary` | TEXT |
| `lifecycle_status` | TEXT NOT NULL DEFAULT 'catalogue_only' |
| `source_document_checksum` | TEXT |
| `created_at` | TEXT NOT NULL |
| `created_by` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |
| `updated_by` | TEXT NOT NULL |

## product_media

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `product_id` | TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE |
| `media_role` | TEXT NOT NULL |
| `source_path` | TEXT NOT NULL |
| `fallback_path` | TEXT NOT NULL |
| `responsive_json` | TEXT NOT NULL DEFAULT '{}' |
| `alt_text` | TEXT NOT NULL |
| `source_checksum` | TEXT NOT NULL |
| `source_document_checksum` | TEXT NOT NULL |
| `licence_status` | TEXT NOT NULL |
| `review_status` | TEXT NOT NULL |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## product_supplier_links

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `product_id` | TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE |
| `supplier_id` | TEXT NOT NULL REFERENCES suppliers(id) |
| `relationship_type` | TEXT NOT NULL |
| `qualification_status` | TEXT NOT NULL |
| `valid_from` | TEXT |
| `valid_to` | TEXT |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## product_variants

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `product_id` | TEXT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE |
| `family_id` | TEXT NOT NULL REFERENCES product_families(id) |
| `variant_code` | TEXT NOT NULL UNIQUE |
| `public_slug` | TEXT NOT NULL UNIQUE |
| `display_name` | TEXT NOT NULL |
| `short_name` | TEXT NOT NULL |
| `serving_text` | TEXT |
| `formulation_json` | TEXT NOT NULL DEFAULT '[]' |
| `catalogue_page` | INTEGER |
| `catalogue_order` | INTEGER NOT NULL |
| `public_status` | TEXT NOT NULL DEFAULT 'catalogue_reference' |
| `claims_review_status` | TEXT NOT NULL DEFAULT 'not_reviewed' |
| `sale_status` | TEXT NOT NULL DEFAULT 'not_offered' |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## products

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `sku` | TEXT NOT NULL UNIQUE |
| `ean` | TEXT |
| `gtin` | TEXT UNIQUE |
| `product_name` | TEXT NOT NULL |
| `strength` | TEXT |
| `dosage_form` | TEXT |
| `pack_size` | TEXT |
| `manufacturer` | TEXT |
| `country_of_origin` | TEXT |
| `list_price_minor` | INTEGER NOT NULL DEFAULT 0 |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `regulatory_status` | TEXT NOT NULL DEFAULT 'draft' |
| `marketing_status` | TEXT NOT NULL DEFAULT 'not_marketed' |
| `mhra_status` | TEXT NOT NULL DEFAULT 'not_assessed' |
| `lifecycle_status` | TEXT NOT NULL DEFAULT 'draft' |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `source_system` | TEXT NOT NULL DEFAULT 'novapharm' |
| `created_at` | TEXT NOT NULL |
| `created_by` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |
| `updated_by` | TEXT NOT NULL |

## purchase_order_lines

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `purchase_order_id` | TEXT NOT NULL REFERENCES purchase_orders(id) |
| `product_id` | TEXT NOT NULL REFERENCES products(id) |
| `quantity` | INTEGER NOT NULL CHECK(quantity > 0) |
| `unit_cost_minor` | INTEGER NOT NULL CHECK(unit_cost_minor >= 0) |
| `line_total_minor` | INTEGER NOT NULL |

## purchase_order_status_history

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `purchase_order_id` | TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE |
| `from_status` | TEXT |
| `to_status` | TEXT NOT NULL |
| `actor` | TEXT NOT NULL |
| `reason` | TEXT |
| `occurred_at` | TEXT NOT NULL |

## purchase_orders

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `po_number` | TEXT NOT NULL UNIQUE |
| `supplier_id` | TEXT NOT NULL REFERENCES suppliers(id) |
| `status` | TEXT NOT NULL |
| `subtotal_minor` | INTEGER NOT NULL DEFAULT 0 |
| `tax_minor` | INTEGER NOT NULL DEFAULT 0 |
| `total_minor` | INTEGER NOT NULL DEFAULT 0 |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `expected_date` | TEXT |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `created_at` | TEXT NOT NULL |
| `created_by` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |
| `updated_by` | TEXT NOT NULL |

## quality_actions

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `complaint_id` | TEXT REFERENCES quality_complaints(id) ON DELETE CASCADE |
| `quality_record_id` | TEXT REFERENCES quality_records(id) ON DELETE CASCADE |
| `action_type` | TEXT NOT NULL |
| `description` | TEXT NOT NULL |
| `owner_user_id` | TEXT REFERENCES users(id) |
| `status` | TEXT NOT NULL |
| `due_at` | TEXT |
| `completed_at` | TEXT |
| `created_at` | TEXT NOT NULL |

## quality_complaints

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `complaint_number` | TEXT NOT NULL UNIQUE |
| `customer_id` | TEXT REFERENCES customers(id) |
| `order_id` | TEXT REFERENCES orders(id) |
| `product_id` | TEXT REFERENCES products(id) |
| `batch_id` | TEXT REFERENCES batches(id) |
| `severity` | TEXT NOT NULL |
| `status` | TEXT NOT NULL |
| `description` | TEXT NOT NULL |
| `safety_information_present` | INTEGER NOT NULL DEFAULT 0 CHECK(safety_information_present IN (0, 1)) |
| `pv_escalation_status` | TEXT NOT NULL DEFAULT 'not_required' |
| `owner_user_id` | TEXT REFERENCES users(id) |
| `due_at` | TEXT |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## quality_deviations

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `deviation_number` | TEXT NOT NULL UNIQUE |
| `product_id` | TEXT REFERENCES products(id) |
| `batch_id` | TEXT REFERENCES batches(id) |
| `supplier_id` | TEXT REFERENCES suppliers(id) |
| `severity` | TEXT NOT NULL |
| `status` | TEXT NOT NULL |
| `description` | TEXT NOT NULL |
| `root_cause_status` | TEXT NOT NULL DEFAULT 'not_started' |
| `owner_user_id` | TEXT REFERENCES users(id) |
| `due_at` | TEXT |
| `closed_at` | TEXT |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## quality_records

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `quality_number` | TEXT NOT NULL UNIQUE |
| `record_type` | TEXT NOT NULL |
| `severity` | TEXT NOT NULL |
| `status` | TEXT NOT NULL |
| `product_id` | TEXT REFERENCES products(id) |
| `batch_id` | TEXT REFERENCES batches(id) |
| `customer_id` | TEXT REFERENCES customers(id) |
| `supplier_id` | TEXT REFERENCES suppliers(id) |
| `owner_user_id` | TEXT REFERENCES users(id) |
| `due_date` | TEXT |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## rate_limit_buckets

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `bucket_key` | TEXT PRIMARY KEY |
| `request_count` | INTEGER NOT NULL |
| `reset_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## recall_records

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `recall_number` | TEXT NOT NULL UNIQUE |
| `product_id` | TEXT NOT NULL REFERENCES products(id) |
| `batch_id` | TEXT REFERENCES batches(id) |
| `classification` | TEXT |
| `status` | TEXT NOT NULL |
| `authority_reference` | TEXT |
| `initiated_at` | TEXT |
| `closed_at` | TEXT |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## regulatory_cases

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `case_number` | TEXT NOT NULL UNIQUE |
| `product_id` | TEXT REFERENCES products(id) |
| `case_type` | TEXT NOT NULL |
| `jurisdiction` | TEXT NOT NULL |
| `authority` | TEXT |
| `status` | TEXT NOT NULL |
| `current_stage` | TEXT NOT NULL |
| `external_reference` | TEXT |
| `target_date` | TEXT |
| `owner_user_id` | TEXT REFERENCES users(id) |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## regulatory_milestones

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `regulatory_case_id` | TEXT NOT NULL REFERENCES regulatory_cases(id) ON DELETE CASCADE |
| `milestone_code` | TEXT NOT NULL |
| `title` | TEXT NOT NULL |
| `status` | TEXT NOT NULL |
| `due_at` | TEXT |
| `completed_at` | TEXT |
| `evidence_document_id` | TEXT REFERENCES documents(id) |
| `created_at` | TEXT NOT NULL |

## regulatory_records

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `regulatory_number` | TEXT NOT NULL UNIQUE |
| `entity_type` | TEXT NOT NULL |
| `entity_id` | TEXT NOT NULL |
| `authority` | TEXT NOT NULL |
| `record_type` | TEXT NOT NULL |
| `external_reference` | TEXT |
| `status` | TEXT NOT NULL |
| `effective_date` | TEXT |
| `expiry_date` | TEXT |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## return_lines

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `return_id` | TEXT NOT NULL REFERENCES returns(id) ON DELETE CASCADE |
| `product_id` | TEXT NOT NULL REFERENCES products(id) |
| `batch_id` | TEXT REFERENCES batches(id) |
| `quantity` | INTEGER NOT NULL CHECK(quantity > 0) |
| `disposition` | TEXT NOT NULL DEFAULT 'pending' |

## returns

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `return_number` | TEXT NOT NULL UNIQUE |
| `customer_id` | TEXT NOT NULL REFERENCES customers(id) |
| `order_id` | TEXT REFERENCES orders(id) |
| `status` | TEXT NOT NULL |
| `reason_code` | TEXT NOT NULL |
| `quality_hold` | INTEGER NOT NULL DEFAULT 1 CHECK(quality_hold IN (0, 1)) |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## role_permissions

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `role_scope` | TEXT NOT NULL CHECK(role_scope IN ('customer', 'employee', 'board', 'admin')) |
| `module_code` | TEXT NOT NULL |
| `permission_code` | TEXT NOT NULL |
| `effect` | TEXT NOT NULL DEFAULT 'allow' CHECK(effect IN ('allow', 'deny')) |
| `created_at` | TEXT NOT NULL |

## security_events

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `event_type` | TEXT NOT NULL |
| `username` | TEXT |
| `network_fingerprint` | TEXT |
| `outcome` | TEXT NOT NULL |
| `details_json` | TEXT NOT NULL DEFAULT '{}' |
| `occurred_at` | TEXT NOT NULL |

## sharepoint_links

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `document_id` | TEXT REFERENCES documents(id) |
| `entity_type` | TEXT |
| `entity_id` | TEXT |
| `site_id` | TEXT NOT NULL |
| `drive_id` | TEXT NOT NULL |
| `item_id` | TEXT NOT NULL |
| `web_url` | TEXT |
| `checksum_sha256` | TEXT |
| `sync_status` | TEXT NOT NULL |
| `last_verified_at` | TEXT |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## shipment_lines

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `shipment_id` | TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE |
| `order_line_id` | TEXT NOT NULL REFERENCES order_lines(id) |
| `batch_id` | TEXT REFERENCES batches(id) |
| `quantity` | INTEGER NOT NULL CHECK(quantity > 0) |

## shipments

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `shipment_number` | TEXT NOT NULL UNIQUE |
| `order_id` | TEXT NOT NULL REFERENCES orders(id) |
| `status` | TEXT NOT NULL |
| `carrier_name` | TEXT |
| `tracking_reference` | TEXT |
| `dispatched_at` | TEXT |
| `delivered_at` | TEXT |
| `proof_of_delivery_document_id` | TEXT REFERENCES documents(id) |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## statement_lines

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `statement_id` | TEXT NOT NULL REFERENCES customer_statements(id) ON DELETE CASCADE |
| `line_date` | TEXT NOT NULL |
| `line_type` | TEXT NOT NULL |
| `reference` | TEXT NOT NULL |
| `description` | TEXT NOT NULL |
| `debit_minor` | INTEGER NOT NULL DEFAULT 0 |
| `credit_minor` | INTEGER NOT NULL DEFAULT 0 |
| `running_balance_minor` | INTEGER NOT NULL |

## stock_transactions

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `product_id` | TEXT NOT NULL REFERENCES products(id) |
| `batch_id` | TEXT REFERENCES batches(id) |
| `movement_type` | TEXT NOT NULL |
| `quantity` | INTEGER NOT NULL |
| `location_code` | TEXT NOT NULL |
| `reference_type` | TEXT |
| `reference_id` | TEXT |
| `occurred_at` | TEXT NOT NULL |
| `source_system` | TEXT NOT NULL |

## supplier_contacts

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `supplier_id` | TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE |
| `name` | TEXT NOT NULL |
| `role_title` | TEXT NOT NULL |
| `email` | TEXT NOT NULL |
| `telephone` | TEXT |
| `is_primary` | INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)) |
| `status` | TEXT NOT NULL DEFAULT 'active' |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## supplier_invoices

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `supplier_invoice_number` | TEXT NOT NULL |
| `supplier_id` | TEXT NOT NULL REFERENCES suppliers(id) |
| `purchase_order_id` | TEXT REFERENCES purchase_orders(id) |
| `status` | TEXT NOT NULL |
| `invoice_date` | TEXT NOT NULL |
| `due_date` | TEXT |
| `total_minor` | INTEGER NOT NULL CHECK(total_minor >= 0) |
| `currency` | TEXT NOT NULL DEFAULT 'GBP' |
| `document_id` | TEXT REFERENCES documents(id) |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## suppliers

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `organization_id` | TEXT NOT NULL REFERENCES organizations(id) |
| `supplier_number` | TEXT NOT NULL UNIQUE |
| `supplier_type` | TEXT NOT NULL |
| `qualification_status` | TEXT NOT NULL |
| `gdp_status` | TEXT NOT NULL DEFAULT 'not_assessed' |
| `gmp_status` | TEXT NOT NULL DEFAULT 'not_assessed' |
| `payment_terms_days` | INTEGER NOT NULL DEFAULT 30 |
| `version` | INTEGER NOT NULL DEFAULT 1 |
| `source_system` | TEXT NOT NULL DEFAULT 'novapharm' |
| `created_at` | TEXT NOT NULL |
| `created_by` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |
| `updated_by` | TEXT NOT NULL |

## support_tickets

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `ticket_number` | TEXT NOT NULL UNIQUE |
| `customer_id` | TEXT REFERENCES customers(id) |
| `requester_user_id` | TEXT REFERENCES users(id) |
| `category` | TEXT NOT NULL |
| `priority` | TEXT NOT NULL |
| `status` | TEXT NOT NULL |
| `subject` | TEXT NOT NULL |
| `description` | TEXT NOT NULL |
| `order_id` | TEXT REFERENCES orders(id) |
| `product_id` | TEXT REFERENCES products(id) |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## training_records

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `employee_id` | TEXT NOT NULL REFERENCES employees(id) |
| `course_code` | TEXT NOT NULL |
| `course_version` | TEXT NOT NULL |
| `status` | TEXT NOT NULL |
| `assigned_at` | TEXT NOT NULL |
| `completed_at` | TEXT |
| `result` | TEXT |
| `document_id` | TEXT REFERENCES documents(id) |

## users

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `entra_object_id` | TEXT UNIQUE |
| `identity_provider` | TEXT NOT NULL DEFAULT 'local' |
| `identity_issuer` | TEXT |
| `external_subject` | TEXT |
| `email` | TEXT |
| `username` | TEXT NOT NULL UNIQUE |
| `display_name` | TEXT NOT NULL |
| `role` | TEXT NOT NULL |
| `customer_id` | TEXT REFERENCES customers(id) |
| `status` | TEXT NOT NULL DEFAULT 'active' |
| `created_at` | TEXT NOT NULL |
| `updated_at` | TEXT NOT NULL |

## warehouse_transactions

Source: `database/schema.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `transaction_type` | TEXT NOT NULL |
| `external_reference` | TEXT |
| `status` | TEXT NOT NULL |
| `payload_json` | TEXT NOT NULL DEFAULT '{}' |
| `occurred_at` | TEXT NOT NULL |
| `source_system` | TEXT NOT NULL |

## workflow_instances

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `workflow_code` | TEXT NOT NULL |
| `business_key` | TEXT NOT NULL |
| `entity_type` | TEXT NOT NULL |
| `entity_id` | TEXT NOT NULL |
| `status` | TEXT NOT NULL |
| `current_step` | TEXT NOT NULL |
| `correlation_id` | TEXT NOT NULL |
| `started_by` | TEXT NOT NULL |
| `started_at` | TEXT NOT NULL |
| `completed_at` | TEXT |
| `updated_at` | TEXT NOT NULL |

## workflow_steps

Source: `database/sqlite/004_integrated_enterprise_portal.sql`

| Field | SQL definition |
|---|---|
| `id` | TEXT PRIMARY KEY |
| `workflow_instance_id` | TEXT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE |
| `step_code` | TEXT NOT NULL |
| `sequence_number` | INTEGER NOT NULL |
| `status` | TEXT NOT NULL |
| `actor` | TEXT |
| `input_json` | TEXT NOT NULL DEFAULT '{}' |
| `output_json` | TEXT NOT NULL DEFAULT '{}' |
| `started_at` | TEXT |
| `completed_at` | TEXT |
