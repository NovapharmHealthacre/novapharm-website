import assert from "node:assert/strict";
import test from "node:test";
import { normaliseCustomerAddress, requireAddressCustomer } from "../src/core/customer-address-contract.mjs";

const valid = {
  addressKind: "delivery", label: "Main warehouse", recipientName: "Goods in",
  contactPhone: "+44 20 1234 5678", line1: "10 Example Industrial Park",
  line2: "", city: "London", region: "Greater London", postcode: "SW1A 1AA",
  countryCode: "gb", deliveryInstructions: "Goods-in reception", isDefault: true,
};
test("accepts bounded delivery contact and normalises country code", () => {
  const address = normaliseCustomerAddress(valid);
  assert.equal(address.countryCode, "GB");
  assert.equal(address.isDefault, true);
  assert.equal(Object.isFrozen(address), true);
  assert.equal(address.line2, null);
});
test("rejects invalid address, telephone and unbounded injection", () => {
  for (const payload of [
    null, { ...valid, addressKind: "registered" },
    { ...valid, line1: "x" }, { ...valid, line1: "A".repeat(201) },
    { ...valid, city: "London\nInjected" }, { ...valid, postcode: "" },
    { ...valid, contactPhone: "please contact me" }, { ...valid, countryCode: "GBR" },
  ]) assert.throws(() => normaliseCustomerAddress(payload), /invalid|required|complete|code|telephone|object/i);
});
test("a forged customer id, staff role, or admin access does not pass customer ownership", () => {
  const customer = { accessType: "customer", accessScopes: ["customer"], customerId: "customer_12345678" };
  assert.equal(requireAddressCustomer(customer), customer.customerId);
  for (const candidate of [
    { ...customer, accessType: "employee" },
    { ...customer, accessType: "admin", accessScopes: ["admin", "customer"] },
    { ...customer, customerId: undefined },
    { ...customer, accessScopes: [] },
  ]) assert.throws(() => requireAddressCustomer(candidate), /linked customer account/);
});
