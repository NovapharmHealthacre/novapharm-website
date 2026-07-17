# Enterprise portal module contracts

- Version: 1.0
- Reviewed: 2026-07-16
- Source of truth: `src/core/portal-module-catalog.mjs` and `src/core/enterprise-domain-service.mjs`
- Scope: 54 routed module contracts implementing the numbered enterprise-platform brief

## Contract rules

All modules use one canonical database, the same status vocabulary, server-side identity and scope checks, parameterised queries, and the shared enterprise snapshot format. A rendered page is not classified as operational by itself. `operational_foundation` means that the local synthetic workflow is implemented and tested but production data, approved procedures, external integration and owner acceptance remain separate gates. Executive modules are read-only. Customer records are always filtered by the authenticated customer relationship.

## Customer modules (18)

### Customer Dashboard

- **Contract ID:** customer.dashboard
- **Route:** /portal/dashboard/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Account position, current actions and recent customer-scoped activity.
- **Canonical entities and source tables:** customers, orders, invoices, quality_complaints
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.dashboard; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** customers, orders, invoices, quality_complaints
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### My Account

- **Contract ID:** customer.account
- **Route:** /portal/account/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Controlled legal entity, contacts, addresses, terms and change-request status.
- **Canonical entities and source tables:** customers, organizations, organization_addresses, customer_contacts
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.account; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** customers, organizations, organization_addresses, customer_contacts
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### My Orders

- **Contract ID:** customer.orders
- **Route:** /portal/orders/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Customer-scoped orders, lines, status histories and linked fulfilment records.
- **Canonical entities and source tables:** orders, order_lines, order_status_history, shipments, invoices
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.orders; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** orders, order_lines, order_status_history, shipments, invoices
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### My Invoices

- **Contract ID:** customer.invoices
- **Route:** /portal/invoices/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Customer invoices, outstanding balances, payments and credit notes.
- **Canonical entities and source tables:** invoices, invoice_lines, payments, credit_notes
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.invoices; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** invoices, invoice_lines, payments, credit_notes
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### My Statements

- **Contract ID:** customer.statements
- **Route:** /portal/statements/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Period statements reconciled from invoices, credits and payments.
- **Canonical entities and source tables:** customer_statements, statement_lines
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.statements; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** customer_statements, statement_lines
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### My Products

- **Contract ID:** customer.products
- **Route:** /portal/products/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Account-authorised catalogue products with controlled pricing and availability state.
- **Canonical entities and source tables:** products, product_variants, product_families, product_media, customer_price_lists
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.products; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** products, product_variants, product_families, product_media, customer_price_lists
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Price Lists

- **Contract ID:** customer.price-lists
- **Route:** /portal/price-lists/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Effective customer-specific price lists without supplier cost or other-account pricing.
- **Canonical entities and source tables:** price_lists, price_list_items, customer_price_lists, products
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.price-lists; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** price_lists, price_list_items, customer_price_lists, products
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Stock Availability

- **Contract ID:** customer.stock-availability
- **Route:** /portal/stock-availability/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Released available-to-promise quantities and explicit quarantine separation.
- **Canonical entities and source tables:** inventory_balances, batches, products, customer_price_lists
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.stock-availability; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** inventory_balances, batches, products, customer_price_lists
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Order Tracking

- **Contract ID:** customer.order-tracking
- **Route:** /portal/order-tracking/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Order status, allocation and linked shipment progress.
- **Canonical entities and source tables:** orders, order_status_history, shipments, delivery_events
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.order-tracking; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** orders, order_status_history, shipments, delivery_events
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Delivery Tracking

- **Contract ID:** customer.delivery-tracking
- **Route:** /portal/delivery-tracking/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Carrier and delivery events from approved source records.
- **Canonical entities and source tables:** shipments, shipment_lines, delivery_events, orders
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.delivery-tracking; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** shipments, shipment_lines, delivery_events, orders
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Returns

- **Contract ID:** customer.returns
- **Route:** /portal/returns/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Controlled return requests, inspection disposition and credit-note status.
- **Canonical entities and source tables:** returns, return_lines, orders, order_lines, credit_notes
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.returns; GET /api/enterprise/search; Request customer-scoped return via POST /api/enterprise/customer/returns
- **Key actions:** Request customer-scoped return via POST /api/enterprise/customer/returns
- **Approval requirements:** Server-side transition validation; CSRF; role check; audit event; domain event where lifecycle/workflow changes.
- **Upstream dependencies:** returns, return_lines, orders, order_lines, credit_notes
- **Downstream effects:** Transactional record, audit trail, and relevant workflow/outbox state.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** Specialised command audit event; lifecycle/workflow commands also create domain_events and outbox_messages.
- **Domain events:** Command-specific event where implemented; otherwise audit-only until a production workflow is approved.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Quality Complaints

- **Contract ID:** customer.quality-complaints
- **Route:** /portal/quality-complaints/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Customer quality cases without processing adverse-event information.
- **Canonical entities and source tables:** quality_complaints, quality_actions, orders, products, batches
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.quality-complaints; GET /api/enterprise/search; Open non-safety quality complaint via POST /api/enterprise/customer/quality-complaints
- **Key actions:** Open non-safety quality complaint via POST /api/enterprise/customer/quality-complaints
- **Approval requirements:** Server-side transition validation; CSRF; role check; audit event; domain event where lifecycle/workflow changes.
- **Upstream dependencies:** quality_complaints, quality_actions, orders, products, batches
- **Downstream effects:** Transactional record, audit trail, and relevant workflow/outbox state.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** Specialised command audit event; lifecycle/workflow commands also create domain_events and outbox_messages.
- **Domain events:** Command-specific event where implemented; otherwise audit-only until a production workflow is approved.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Documents

- **Contract ID:** customer.documents
- **Route:** /portal/documents/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Authorised customer and order documents only.
- **Canonical entities and source tables:** documents, document_links, document_versions
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.documents; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** documents, document_links, document_versions
- **Downstream effects:** No state change.
- **Documents:** Clean, authorised metadata only; private storage path is withheld.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Support Tickets

- **Contract ID:** customer.support
- **Route:** /portal/support/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Customer-scoped service requests and linked order or product context.
- **Canonical entities and source tables:** support_tickets, customers, users
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.support; GET /api/enterprise/search; Create support ticket via POST /api/enterprise/customer/support
- **Key actions:** Create support ticket via POST /api/enterprise/customer/support
- **Approval requirements:** Server-side transition validation; CSRF; role check; audit event; domain event where lifecycle/workflow changes.
- **Upstream dependencies:** support_tickets, customers, users
- **Downstream effects:** Transactional record, audit trail, and relevant workflow/outbox state.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** Specialised command audit event; lifecycle/workflow commands also create domain_events and outbox_messages.
- **Domain events:** Command-specific event where implemented; otherwise audit-only until a production workflow is approved.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Regulatory Documents

- **Contract ID:** customer.regulatory-documents
- **Route:** /portal/regulatory-documents/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Approved effective regulatory documents authorised for the account.
- **Canonical entities and source tables:** documents, document_links, document_versions, regulatory_records
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.regulatory-documents; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** documents, document_links, document_versions, regulatory_records
- **Downstream effects:** No state change.
- **Documents:** Clean, authorised metadata only; private storage path is withheld.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Downloads

- **Contract ID:** customer.downloads
- **Route:** /portal/downloads/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Permission-controlled downloadable records with no direct storage disclosure.
- **Canonical entities and source tables:** documents, document_links, document_versions
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.downloads; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** documents, document_links, document_versions
- **Downstream effects:** No state change.
- **Documents:** Clean, authorised metadata only; private storage path is withheld.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Customer Analytics

- **Contract ID:** customer.analytics
- **Route:** /portal/analytics/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Customer-only order, spend, service and complaint indicators.
- **Canonical entities and source tables:** orders, invoices, returns, quality_complaints, shipments
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.analytics; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** orders, invoices, returns, quality_complaints, shipments
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Settings

- **Contract ID:** customer.settings
- **Route:** /portal/settings/
- **Primary users:** Customer users
- **Permitted roles:** customer; admin only with an explicit customer context
- **Business purpose:** Identity, notification and controlled account-change preferences.
- **Canonical entities and source tables:** users, customers, customer_contacts, notifications
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/customer.settings; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** users, customers, customer_contacts, notifications
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Every query binds the authenticated customer_id; cross-account identifiers are rejected.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

## Employee modules (13)

### Operations Dashboard

- **Contract ID:** employee.dashboard
- **Route:** /employee/dashboard/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Cross-functional tasks, exceptions and data-source readiness.
- **Canonical entities and source tables:** workflow_instances, purchase_orders, inventory_balances, quality_complaints, regulatory_cases, integration_events
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.dashboard; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** workflow_instances, purchase_orders, inventory_balances, quality_complaints, regulatory_cases, integration_events
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Customers

- **Contract ID:** employee.customers
- **Route:** /employee/customers/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Canonical customer accounts, contacts, credit and connected records.
- **Canonical entities and source tables:** customers, organizations, customer_contacts, orders, invoices, quality_complaints, support_tickets
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.customers; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** customers, organizations, customer_contacts, orders, invoices, quality_complaints, support_tickets
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Suppliers

- **Contract ID:** employee.suppliers
- **Route:** /employee/suppliers/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Qualification, contacts, products, purchasing and evidence.
- **Canonical entities and source tables:** suppliers, organizations, supplier_contacts, product_supplier_links, purchase_orders, goods_receipts
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.suppliers; GET /api/enterprise/search; Create prospect supplier only
- **Key actions:** Create prospect supplier only
- **Approval requirements:** Server-side transition validation; CSRF; role check; audit event; domain event where lifecycle/workflow changes.
- **Upstream dependencies:** suppliers, organizations, supplier_contacts, product_supplier_links, purchase_orders, goods_receipts
- **Downstream effects:** Transactional record, audit trail, and relevant workflow/outbox state.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** Specialised command audit event; lifecycle/workflow commands also create domain_events and outbox_messages.
- **Domain events:** Command-specific event where implemented; otherwise audit-only until a production workflow is approved.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Product Master

- **Contract ID:** employee.products
- **Route:** /employee/products/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Product lifecycle, variants, composition, claims, media and linked records.
- **Canonical entities and source tables:** products, product_families, product_variants, product_composition_items, product_claims, product_media, product_certifications
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.products; GET /api/enterprise/search; Create draft product and advance validated lifecycle state
- **Key actions:** Create draft product and advance validated lifecycle state
- **Approval requirements:** Server-side transition validation; CSRF; role check; audit event; domain event where lifecycle/workflow changes.
- **Upstream dependencies:** products, product_families, product_variants, product_composition_items, product_claims, product_media, product_certifications
- **Downstream effects:** Transactional record, audit trail, and relevant workflow/outbox state.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** Specialised command audit event; lifecycle/workflow commands also create domain_events and outbox_messages.
- **Domain events:** Command-specific event where implemented; otherwise audit-only until a production workflow is approved.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Telesales Orders

- **Contract ID:** employee.orders
- **Route:** /employee/orders/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Validated order creation and governed order lifecycle.
- **Canonical entities and source tables:** orders, order_lines, order_status_history, inventory_reservations, shipments, invoices
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.orders; GET /api/enterprise/search; Create and validate telesales order
- **Key actions:** Create and validate telesales order
- **Approval requirements:** Server-side transition validation; CSRF; role check; audit event; domain event where lifecycle/workflow changes.
- **Upstream dependencies:** orders, order_lines, order_status_history, inventory_reservations, shipments, invoices
- **Downstream effects:** Transactional record, audit trail, and relevant workflow/outbox state.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** Specialised command audit event; lifecycle/workflow commands also create domain_events and outbox_messages.
- **Domain events:** Command-specific event where implemented; otherwise audit-only until a production workflow is approved.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Warehouse & Inventory

- **Contract ID:** employee.warehouse
- **Route:** /employee/warehouse/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Third-party warehouse validation foundation and canonical inventory ledger.
- **Canonical entities and source tables:** inventory_locations, inventory_balances, inventory_movements, batches, inventory_reservations
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.warehouse; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** inventory_locations, inventory_balances, inventory_movements, batches, inventory_reservations
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Purchasing

- **Contract ID:** employee.purchasing
- **Route:** /employee/purchasing/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Purchase orders, receipts, supplier invoices and three-way matching.
- **Canonical entities and source tables:** purchase_orders, purchase_order_lines, goods_receipts, goods_receipt_lines, supplier_invoices, invoice_matches
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.purchasing; GET /api/enterprise/search; Create purchase order and governed receipt/match workflow
- **Key actions:** Create purchase order and governed receipt/match workflow
- **Approval requirements:** Server-side transition validation; CSRF; role check; audit event; domain event where lifecycle/workflow changes.
- **Upstream dependencies:** purchase_orders, purchase_order_lines, goods_receipts, goods_receipt_lines, supplier_invoices, invoice_matches
- **Downstream effects:** Transactional record, audit trail, and relevant workflow/outbox state.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** Specialised command audit event; lifecycle/workflow commands also create domain_events and outbox_messages.
- **Domain events:** Command-specific event where implemented; otherwise audit-only until a production workflow is approved.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Finance

- **Contract ID:** employee.finance
- **Route:** /employee/finance/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Synthetic double-entry, receivables, payables and control exceptions.
- **Canonical entities and source tables:** ledger_accounts, journal_entries, journal_lines, invoices, payments, supplier_invoices
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.finance; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** ledger_accounts, journal_entries, journal_lines, invoices, payments, supplier_invoices
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Quality

- **Contract ID:** employee.quality
- **Route:** /employee/quality/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Complaints, deviations, CAPA and batch-quality controls.
- **Canonical entities and source tables:** quality_complaints, quality_actions, quality_deviations, capa_records, change_controls, recall_records
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.quality; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** quality_complaints, quality_actions, quality_deviations, capa_records, change_controls, recall_records
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Regulatory

- **Contract ID:** employee.regulatory
- **Route:** /employee/regulatory/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Classification and milestone records without asserting unverified authorisation.
- **Canonical entities and source tables:** regulatory_cases, regulatory_milestones, regulatory_records, products
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.regulatory; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** regulatory_cases, regulatory_milestones, regulatory_records, products
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### CRM

- **Contract ID:** employee.crm
- **Route:** /employee/crm/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Leads, opportunities, attribution and account-conversion context.
- **Canonical entities and source tables:** leads, lead_details, crm_opportunities, crm_stage_history, crm_activities
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.crm; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** leads, lead_details, crm_opportunities, crm_stage_history, crm_activities
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Reports

- **Contract ID:** employee.reports
- **Route:** /employee/reports/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Governed read-only operational reporting with stated scope and freshness.
- **Canonical entities and source tables:** canonical read models across orders, purchasing, inventory, finance, quality, regulatory and security
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.reports; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** canonical read models across orders, purchasing, inventory, finance, quality, regulatory and security
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Operational Administration

- **Contract ID:** employee.administration
- **Route:** /employee/administration/
- **Primary users:** Employee users
- **Permitted roles:** employee; admin
- **Business purpose:** Tasks, permissions and workflow state without security-admin duplication.
- **Canonical entities and source tables:** workflow_instances, workflow_steps, role_permissions
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/employee.administration; GET /api/enterprise/search; Advance active workflow via POST /api/enterprise/workflows/:id/advance
- **Key actions:** Advance active workflow via POST /api/enterprise/workflows/:id/advance
- **Approval requirements:** Server-side transition validation; CSRF; role check; audit event; domain event where lifecycle/workflow changes.
- **Upstream dependencies:** workflow_instances, workflow_steps, role_permissions
- **Downstream effects:** Transactional record, audit trail, and relevant workflow/outbox state.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** Specialised command audit event; lifecycle/workflow commands also create domain_events and outbox_messages.
- **Domain events:** Command-specific event where implemented; otherwise audit-only until a production workflow is approved.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

## Executive modules (18)

### Command Centre

- **Contract ID:** executive.command-centre
- **Route:** /portal/executive-platform/command-centre/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Cross-functional operating position, exceptions and decisions required.
- **Canonical entities and source tables:** customers, products, orders, invoices, quality_complaints, regulatory_cases, workflow_instances
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.command-centre; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** customers, products, orders, invoices, quality_complaints, regulatory_cases, workflow_instances
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### CEO Dashboard

- **Contract ID:** executive.ceo-dashboard
- **Route:** /portal/executive-platform/ceo-dashboard/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Synthetic financial and operational indicators linked to canonical records.
- **Canonical entities and source tables:** invoices, supplier_invoices, journal_entries, journal_lines, customers, orders
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.ceo-dashboard; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** invoices, supplier_invoices, journal_entries, journal_lines, customers, orders
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Sales Intelligence

- **Contract ID:** executive.sales-intelligence
- **Route:** /portal/executive-platform/sales-intelligence/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Pipeline, product interest, conversion and order indicators.
- **Canonical entities and source tables:** crm_opportunities, crm_stage_history, orders, invoices
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.sales-intelligence; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** crm_opportunities, crm_stage_history, orders, invoices
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Customer Analytics

- **Contract ID:** executive.customer-analytics
- **Route:** /portal/executive-platform/customer-analytics/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Customer, application, credit, service and complaint indicators.
- **Canonical entities and source tables:** customers, organizations, orders, invoices, quality_complaints
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.customer-analytics; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** customers, organizations, orders, invoices, quality_complaints
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Product Master

- **Contract ID:** executive.product-master
- **Route:** /portal/executive-platform/product-master/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Read-only strategic view of product readiness and claim controls.
- **Canonical entities and source tables:** products, product_variants, product_families, batches, product_claims
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.product-master; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** products, product_variants, product_families, batches, product_claims
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### NHS Data

- **Contract ID:** executive.nhs-data
- **Route:** /portal/executive-platform/nhs-data/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Licensed-data integration contract and honest no-data state.
- **Canonical entities and source tables:** integration_events (approved licensed source required)
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.nhs-data; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** integration_events (approved licensed source required)
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** blocked_external_integration
- **Empty state:** Honest blocked state: Licensed NHS data source and approved purpose.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** blocked_external_integration
- **Remaining production dependency:** Licensed NHS data source and approved purpose

### PLPI

- **Contract ID:** executive.plpi
- **Route:** /portal/executive-platform/plpi/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Internal project governance only; no granted licence is implied.
- **Canonical entities and source tables:** regulatory_cases, regulatory_milestones (project records only)
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.plpi; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** regulatory_cases, regulatory_milestones (project records only)
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** planned
- **Empty state:** Honest blocked state: Verified project records and regulatory approval.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** planned
- **Remaining production dependency:** Verified project records and regulatory approval

### Pharmacovigilance

- **Contract ID:** executive.pharmacovigilance
- **Route:** /portal/executive-platform/pharmacovigilance/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Qualified safety-system boundary; general portal safety intake remains prohibited.
- **Canonical entities and source tables:** integration boundary; qualified safety system required
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.pharmacovigilance; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** integration boundary; qualified safety system required
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** blocked_external_integration
- **Empty state:** Honest blocked state: Approved qualified safety system and process.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** blocked_external_integration
- **Remaining production dependency:** Approved qualified safety system and process

### Sourcing

- **Contract ID:** executive.sourcing
- **Route:** /portal/executive-platform/sourcing/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Supplier qualification, product relationships and evidence status.
- **Canonical entities and source tables:** suppliers, product_supplier_links, purchase_orders, goods_receipts
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.sourcing; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** suppliers, product_supplier_links, purchase_orders, goods_receipts
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Tenders

- **Contract ID:** executive.tenders
- **Route:** /portal/executive-platform/tenders/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Controlled opportunity tracking without implying award.
- **Canonical entities and source tables:** approved opportunity source required
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.tenders; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** approved opportunity source required
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** planned
- **Empty state:** Honest blocked state: Approved tender source and records.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** planned
- **Remaining production dependency:** Approved tender source and records

### Warehouse

- **Contract ID:** executive.warehouse
- **Route:** /portal/executive-platform/warehouse/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Third-party integration readiness and canonical stock indicators.
- **Canonical entities and source tables:** inventory_balances, inventory_movements, shipments
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.warehouse; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** inventory_balances, inventory_movements, shipments
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Service Levels

- **Contract ID:** executive.service-levels
- **Route:** /portal/executive-platform/service-levels/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Measured delivery indicators from approved synthetic source records.
- **Canonical entities and source tables:** orders, shipments, delivery_events
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.service-levels; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** orders, shipments, delivery_events
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Finance

- **Contract ID:** executive.finance
- **Route:** /portal/executive-platform/finance/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Read-only synthetic finance controls and reconciled indicators.
- **Canonical entities and source tables:** ledger_accounts, journal_entries, journal_lines, invoices, payments, supplier_invoices
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.finance; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** ledger_accounts, journal_entries, journal_lines, invoices, payments, supplier_invoices
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Capital

- **Contract ID:** executive.capital
- **Route:** /portal/executive-platform/capital/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Controlled budget and capital-planning boundary without published forecasts.
- **Canonical entities and source tables:** board-approved planning source required
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.capital; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** board-approved planning source required
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** planned
- **Empty state:** Honest blocked state: Board-approved planning records.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** planned
- **Remaining production dependency:** Board-approved planning records

### Microsoft 365

- **Contract ID:** executive.microsoft-365
- **Route:** /portal/executive-platform/microsoft-365/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Graph and SharePoint integration health and least-privilege state.
- **Canonical entities and source tables:** integration_events, outbox_messages, sharepoint_links
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.microsoft-365; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** integration_events, outbox_messages, sharepoint_links
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** blocked_external_integration
- **Empty state:** Honest blocked state: Microsoft tenant credentials and permission approval.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** blocked_external_integration
- **Remaining production dependency:** Microsoft tenant credentials and permission approval

### Documents

- **Contract ID:** executive.documents
- **Route:** /portal/executive-platform/documents/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Controlled metadata and links without public file exposure.
- **Canonical entities and source tables:** documents, document_links, document_versions, document_approvals
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.documents; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** documents, document_links, document_versions, document_approvals
- **Downstream effects:** No state change.
- **Documents:** Clean, authorised metadata only; private storage path is withheld.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### AI & Technology

- **Contract ID:** executive.ai-technology
- **Route:** /portal/executive-platform/ai-technology/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Governed use-case register; no autonomous decisions are presented as live.
- **Canonical entities and source tables:** approved use-case and model-risk source required
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.ai-technology; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** approved use-case and model-risk source required
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** planned
- **Empty state:** Honest blocked state: Approved use cases, models and risk review.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** planned
- **Remaining production dependency:** Approved use cases, models and risk review

### Traceability

- **Contract ID:** executive.traceability
- **Route:** /portal/executive-platform/traceability/
- **Primary users:** Board and authorised executives
- **Permitted roles:** board; admin (read-only module contract)
- **Business purpose:** Canonical product, batch, order and inventory lineage; blockchain is not claimed.
- **Canonical entities and source tables:** products, batches, inventory_movements, orders, shipments
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/executive.traceability; GET /api/enterprise/search
- **Key actions:** Inspect and drill into governed read models only.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** products, batches, inventory_movements, orders, shipments
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

## Admin modules (5)

### Admin Dashboard

- **Contract ID:** admin.dashboard
- **Route:** /admin/dashboard/
- **Primary users:** Admin users
- **Permitted roles:** admin
- **Business purpose:** Controlled platform, lead, application and integration overview.
- **Canonical entities and source tables:** workflow_instances, catalogue_imports, schema_migrations, security_events, outbox_messages
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/admin.dashboard; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** workflow_instances, catalogue_imports, schema_migrations, security_events, outbox_messages
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Owner Review

- **Contract ID:** admin.local-review
- **Route:** /admin/local-review/
- **Primary users:** Admin users
- **Permitted roles:** admin
- **Business purpose:** Synthetic local acceptance index and module maturity.
- **Canonical entities and source tables:** workflow_instances, catalogue_imports, schema_migrations, domain_events
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/admin.local-review; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** workflow_instances, catalogue_imports, schema_migrations, domain_events
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Users & Sessions

- **Contract ID:** admin.users
- **Route:** /admin/users/
- **Primary users:** Admin users
- **Permitted roles:** admin
- **Business purpose:** Identity scopes, sessions and revocation controls.
- **Canonical entities and source tables:** users, auth_user_scopes, auth_sessions, security_events
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/admin.users; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** users, auth_user_scopes, auth_sessions, security_events
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Content Governance

- **Contract ID:** admin.content
- **Route:** /admin/content/
- **Primary users:** Admin users
- **Permitted roles:** admin
- **Business purpose:** Product content, claims, imagery and publication control.
- **Canonical entities and source tables:** products, product_variants, product_claims, product_media, catalogue_imports
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/admin.content; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** products, product_variants, product_claims, product_media, catalogue_imports
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.

### Platform Analytics

- **Contract ID:** admin.analytics
- **Route:** /admin/analytics/
- **Primary users:** Admin users
- **Permitted roles:** admin
- **Business purpose:** Audit, security, migration, backup and data-quality indicators.
- **Canonical entities and source tables:** audit_logs, security_events, domain_events, outbox_messages, schema_migrations
- **Service functions:** enterpriseModuleSnapshot; authorisedEnterpriseSearch; specialised command service where listed
- **API endpoints:** /api/enterprise/modules/admin.analytics; GET /api/enterprise/search
- **Key actions:** Filter, inspect and navigate authorised records.
- **Approval requirements:** No approval for an authorised read; controlled records remain immutable from this view.
- **Upstream dependencies:** audit_logs, security_events, domain_events, outbox_messages, schema_migrations
- **Downstream effects:** No state change.
- **Documents:** Related documents use canonical document_links and security classification.
- **Alerts:** Module notices and exception rows are derived from canonical status and maturity data.
- **KPIs:** Snapshot metrics are calculated server-side from the named source tables; no browser-calculated financial truth.
- **Audit events:** No business audit event is emitted for an ordinary read; authentication failures and security exceptions use the existing security-event controls.
- **Domain events:** None on read.
- **Data freshness:** Request-time database snapshot with dataFreshness timestamp; external modules show their source status instead of stale invented data.
- **Integration status:** operational_foundation
- **Empty state:** A useful no-record state names the canonical dataset and does not fabricate activity.
- **Synthetic test scenario:** Seeded TEST/DEMO records exercise the module without production customers, suppliers, revenue or regulated operations.
- **Security tests:** Authentication, role boundary, parameterised query and protected-route checks. Role and scope are checked server-side; no browser-provided role is trusted.
- **Browser tests:** Desktop, tablet and mobile rendering; keyboard focus; responsive tables; clear status and empty states.
- **Current maturity:** operational_foundation
- **Remaining production dependency:** Production data, approved operating procedures and owner acceptance.
