function invalid(message, statusCode = 409) {
  return Object.assign(new Error(message), { statusCode });
}
function field(value, maximum) {
  return typeof value === "string" && value.trim() && value.length <= maximum &&
    !/[\u0000-\u001f\u007f]/.test(value) ? value.trim() : null;
}

/**
 * This snapshot must come from the server-owned customer/organisation tables;
 * a browser-supplied full address or customerId is never accepted.
 */
export function approvedShipToSnapshot(row, customerId) {
  if (!row || row.owner_customer_id !== customerId || row.address_kind !== "delivery" ||
      row.status !== "approved") throw invalid("The delivery location has not been approved for this account.");
  const id = field(row.id, 128);
  const recipientName = field(row.recipient_name, 160);
  const contactPhone = field(row.contact_phone, 40);
  const line1 = field(row.line_1, 200);
  const city = field(row.city, 120);
  const postcode = field(row.postcode, 32);
  const countryCode = field(row.country_code, 2);
  if (!id || !recipientName || !contactPhone || !line1 || !city || !postcode ||
      !countryCode || !/^[A-Z]{2}$/.test(countryCode)) throw invalid("The delivery record is incomplete.");
  if (countryCode !== "GB") throw invalid("This order's shipping country has not been released.");
  return Object.freeze({
    addressId: id,
    recipientName,
    contactPhone,
    line1,
    line2: field(row.line_2, 200),
    city,
    region: field(row.region, 120),
    postcode,
    countryCode,
    deliveryInstructions: field(row.delivery_instructions, 400),
    reviewedAt: row.reviewed_at || null,
    version: 1,
  });
}

