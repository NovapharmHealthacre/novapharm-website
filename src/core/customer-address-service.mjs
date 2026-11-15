import { randomUUID } from "node:crypto";
import { all, audit, nowIso, one, run, transaction } from "../data/database.mjs";
import { normaliseCustomerAddress, requireAddressCustomer } from "./customer-address-contract.mjs";

function blocked(message, statusCode = 409) { return Object.assign(new Error(message), { statusCode }); }
function requestsEnabled() { return process.env.CUSTOMER_ADDRESS_REQUESTS_ENABLED === "true"; }
function assertRequestsEnabled() {
  if (!requestsEnabled()) throw blocked("Address changes are awaiting secure customer-service activation.", 503);
}
async function accountFor(context) {
  const customerId = requireAddressCustomer(context);
  const account = await one(`SELECT c.id, c.lifecycle_status, c.customer_number,
      o.id AS organization_id, o.legal_name, o.trading_name
    FROM customers c JOIN organizations o ON o.id = c.organization_id WHERE c.id = ?`, customerId);
  if (!account || account.lifecycle_status !== "active") {
    throw blocked("Your account is not yet activated for address management.", 403);
  }
  return account;
}
export async function customerAddressBook(context) {
  const account = await accountFor(context);
  const approvedCompanyAddresses = await all(`SELECT id, address_type, line_1, line_2, city, region,
      postcode, country_code, is_primary
    FROM organization_addresses WHERE organization_id = ? ORDER BY is_primary DESC, address_type`,
    account.organization_id);
  const requests = requestsEnabled() ? await all(`SELECT id, address_kind, label, recipient_name, contact_phone,
      line_1, line_2, city, region, postcode, country_code, delivery_instructions,
      is_default, status, created_at, reviewed_at
    FROM customer_account_addresses WHERE customer_id = ? ORDER BY created_at DESC`, account.id) : [];
  return {
    account: { customerNumber: account.customer_number, legalName: account.legal_name,
      tradingName: account.trading_name, lifecycleStatus: account.lifecycle_status },
    addresses: approvedCompanyAddresses.map(row => ({ ...row, authority: "controlled_company_record" })),
    addressRequests: requests.map(row => ({ ...row, authority: "customer_request" })),
    requestsEnabled: requestsEnabled(),
    verification: {
      businessIdentity: "separate_qualification_required",
      deliveryAddress: "approval_required",
      note: "An entered address does not verify an account or authorise medicines, payment or dispatch.",
    },
  };
}
export async function submitCustomerAddress(input, context) {
  assertRequestsEnabled();
  const account = await accountFor(context);
  const value = normaliseCustomerAddress(input);
  return transaction(async () => {
    const pending = await one(`SELECT COUNT(*) AS total FROM customer_account_addresses
      WHERE customer_id = ? AND status = 'pending_review'`, account.id);
    if (Number(pending?.total || 0) >= 10) throw blocked("Too many address changes await review.");
    const id = randomUUID();
    const now = nowIso();
    await run(`INSERT INTO customer_account_addresses
      (id, customer_id, address_kind, label, recipient_name, contact_phone,
       line_1, line_2, city, region, postcode, country_code,
       delivery_instructions, is_default, status, created_by, created_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?)`,
      id, account.id, value.addressKind, value.label, value.recipientName,
      value.contactPhone, value.line1, value.line2, value.city, value.region,
      value.postcode, value.countryCode, value.deliveryInstructions,
      value.isDefault ? 1 : 0, context.username, now);
    // Do not add personal addresses or telephone numbers to operational audit logs.
    await audit({ actor: context.username, action: "customer.address.requested",
      entityType: "customer_address", entityId: id,
      details: { customerId: account.id, addressKind: value.addressKind, status: "pending_review" } });
    return { id, status: "pending_review", createdAt: now };
  });
}
/** Administrator-only review queue. Route authorization is enforced by the API. */
export async function pendingCustomerAddressReviews() {
  assertRequestsEnabled();
  const rows = await all(`SELECT ca.id, ca.customer_id, c.customer_number, o.legal_name,
      ca.address_kind, ca.label, ca.recipient_name, ca.contact_phone, ca.line_1,
      ca.line_2, ca.city, ca.region, ca.postcode, ca.country_code,
      ca.delivery_instructions, ca.is_default, ca.status, ca.created_at
    FROM customer_account_addresses ca
      JOIN customers c ON c.id = ca.customer_id
      JOIN organizations o ON o.id = c.organization_id
    WHERE ca.status = 'pending_review'
    ORDER BY ca.created_at LIMIT 100`);
  return { requests: rows, approvalScope: "address_only", customerQualificationUnchanged: true };
}
export async function decideCustomerAddress(id, decision, actor) {
  assertRequestsEnabled();
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) throw blocked("Address request not found.", 404);
  if (!["approve", "reject"].includes(decision)) throw blocked("Decision must be approve or reject.", 400);
  return transaction(async () => {
    const item = await one(`SELECT id, customer_id, address_kind, is_default, status
      FROM customer_account_addresses WHERE id = ?`, id);
    if (!item) throw blocked("Address request not found.", 404);
    if (item.status !== "pending_review") throw blocked("Address request was already reviewed.");
    if (decision === "approve" && Number(item.is_default) === 1) {
      await run(`UPDATE customer_account_addresses SET is_default = 0
        WHERE customer_id = ? AND address_kind = ? AND status = 'approved'`,
        item.customer_id, item.address_kind);
    }
    const next = decision === "approve" ? "approved" : "rejected";
    const now = nowIso();
    const result = await run(`UPDATE customer_account_addresses
      SET status = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'pending_review'`, next, actor, now, id);
    if (!result.changes) throw blocked("Address request changed during review.");
    await audit({ actor, action: "customer.address.reviewed", entityType: "customer_address",
      entityId: id, before: { status: "pending_review" }, after: { status: next },
      details: { customerId: item.customer_id, addressKind: item.address_kind } });
    return { id, status: next, reviewedAt: now };
  });
}
