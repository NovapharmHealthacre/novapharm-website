/**
 * Validated user-provided delivery/contact details.
 * An address is NOT evidence of email ownership, company identity, trading authority or GDP suitability.
 */
const limits = Object.freeze({
  label: 80, recipientName: 160, contactPhone: 40, line1: 200,
  line2: 200, city: 120, region: 120, postcode: 32, deliveryInstructions: 400,
});
function invalid(message) { return Object.assign(new Error(message), { statusCode: 400 }); }
function field(input, key, required = false) {
  const value = input[key];
  if (value == null || value === "") {
    if (required) throw invalid(`${key} is required.`);
    return null;
  }
  if (typeof value !== "string" || value.length > limits[key] || /[\u0000-\u001f\u007f]/.test(value)) {
    throw invalid(`${key} is invalid.`);
  }
  const normalised = value.trim().replace(/\s+/g, " ");
  if (required && !normalised) throw invalid(`${key} is required.`);
  return normalised || null;
}
export function normaliseCustomerAddress(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid("Address must be an object.");
  if (!["delivery", "billing"].includes(input.addressKind)) throw invalid("Invalid address type. Choose delivery or billing.");
  const countryCode = String(input.countryCode ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) throw invalid("Use a two-letter country code.");
  const result = {
    addressKind: input.addressKind,
    label: field(input, "label", true),
    recipientName: field(input, "recipientName", true),
    contactPhone: field(input, "contactPhone", true),
    line1: field(input, "line1", true),
    line2: field(input, "line2"),
    city: field(input, "city", true),
    region: field(input, "region"),
    postcode: field(input, "postcode", true),
    countryCode,
    deliveryInstructions: field(input, "deliveryInstructions"),
    isDefault: input.isDefault === true,
  };
  if (!/^[+0-9().\s-]{6,40}$/.test(result.contactPhone) ||
      !/[0-9]/.test(result.contactPhone)) throw invalid("Enter a valid contact telephone number.");
  if (result.line1.length < 5 || result.postcode.length < 2) throw invalid("Enter a complete address and postal code.");
  return Object.freeze(result);
}
export function requireAddressCustomer(context) {
  if (context?.accessType !== "customer" ||
      !context.accessScopes?.includes("customer") ||
      typeof context.customerId !== "string" ||
      !/^[A-Za-z0-9_-]{8,128}$/.test(context.customerId)) {
    throw Object.assign(new Error("A verified linked customer account is required."), { statusCode: 403 });
  }
  return context.customerId;
}
