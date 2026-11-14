import assert from "node:assert/strict";
import test from "node:test";
import catalogue from "../../corporate/data/nutraxin-product-register.json";
import { destinationAfterPortalLogin, nutraxinOrderProducts, nutraxinProductForSelection, recognisedNutraxinSku, validatedCustomerCommerceIntentQuery, validatedNutraxinIntentQuery } from "../data/nutraxin-order-intent";

test("ordering handoff recognises precisely the nineteen governed Nutraxin SKUs", () => {
  assert.equal(Object.keys(nutraxinOrderProducts).length, 19);
  assert.deepEqual(new Set(Object.keys(nutraxinOrderProducts)), new Set(catalogue.products.map((product) => product.sku)));
  for (const product of catalogue.products) {
    assert.deepEqual(nutraxinOrderProducts[product.sku as keyof typeof nutraxinOrderProducts], { name: product.name, packSize: product.packSize, slug: product.slug });
    assert.equal(recognisedNutraxinSku(product.sku), product.sku);
  }
});

test("customer account continuation carries validated product selection without a redirect target", () => {
  const query = "?intent=nutraxin&sku=NUT-UK-MGCX-T60";
  assert.equal(validatedNutraxinIntentQuery(query), query);
  assert.equal(destinationAfterPortalLogin("customer", query, "/portal/dashboard/"), "/portal/products/?nutraxin_sku=NUT-UK-MGCX-T60");
  assert.equal(destinationAfterPortalLogin("employee", query, "/employee/dashboard/"), "/employee/dashboard/");
  assert.equal(nutraxinProductForSelection("?nutraxin_sku=NUT-UK-MGCX-T60")?.name, "Nutraxin Magnesium Complex + Vitamin B6");
});

test("unknown, forged and malformed product selections fail closed", () => {
  for (const query of ["?intent=nutraxin&sku=NUT-UK-FAKE", "?intent=nutraxin&sku=../../admin", "?intent=nutraxin&sku=https://evil.example", "?intent=other&sku=NUT-UK-MGCX-T60", "?intent=nutraxin", "?next=https://evil.example"]) {
    assert.equal(validatedNutraxinIntentQuery(query), "");
    assert.equal(destinationAfterPortalLogin("customer", query, "/portal/dashboard/"), "/portal/dashboard/");
  }
  assert.equal(nutraxinProductForSelection("?nutraxin_sku=NUT-UK-FAKE"), null);
});

test("ESCO Anand and Nutraxin continue through the same governed customer Products area", () => {
  assert.equal(validatedCustomerCommerceIntentQuery("?intent=esco"), "?intent=esco");
  assert.equal(destinationAfterPortalLogin("customer", "?intent=esco", "/portal/dashboard/"), "/portal/products/?collection=esco");
  assert.equal(destinationAfterPortalLogin("employee", "?intent=esco", "/employee/dashboard/"), "/employee/dashboard/");
  assert.equal(destinationAfterPortalLogin("board", "?intent=esco", "/portal/executive-platform/"), "/portal/executive-platform/");
  assert.equal(destinationAfterPortalLogin("admin", "?intent=esco", "/admin/dashboard/"), "/admin/dashboard/");
  for (const unsafe of ["?intent=esco&sku=not-approved", "?intent=esco&next=https://evil.invalid", "?intent=esco&intent=admin", "?intent=other"]) {
    assert.equal(validatedCustomerCommerceIntentQuery(unsafe), "");
    assert.equal(destinationAfterPortalLogin("customer", unsafe, "/portal/dashboard/"), "/portal/dashboard/");
  }
});
