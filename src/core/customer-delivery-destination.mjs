import { one } from "../data/database.mjs";
import { approvedShipToSnapshot } from "./customer-delivery-validation.mjs";

const validId = /^[A-Za-z0-9_-]{8,128}$/;
function invalid(message, statusCode = 409) { return Object.assign(new Error(message), { statusCode }); }

export async function resolveCustomerShipTo(customerId, deliveryAddressId) {
  if (typeof customerId !== "string" || !validId.test(customerId) ||
      typeof deliveryAddressId !== "string" || !/^[0-9a-f-]{36}$/i.test(deliveryAddressId)) {
    throw invalid("Select an approved saved delivery address.", 400);
  }
  // Rows must match both account ownership and explicit, independently reviewed status.
  // Controlled organisation locations can be incorporated after an approved source-to-destination contract.
  const row = await one(`SELECT id, customer_id AS owner_customer_id, address_kind, status,
      recipient_name, contact_phone, line_1, line_2, city, region, postcode, country_code,
      delivery_instructions, reviewed_at
    FROM customer_account_addresses
    WHERE id = ? AND customer_id = ? AND address_kind = 'delivery' AND status = 'approved'`,
    deliveryAddressId, customerId);
  return approvedShipToSnapshot(row, customerId);
}
