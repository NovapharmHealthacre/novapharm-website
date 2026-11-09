import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const script = readFileSync("assets/js/contact-production.js", "utf8");
const publisher = readFileSync("scripts/apply-corporate-product-discipline.mjs", "utf8");
const catalogue = JSON.parse(readFileSync("apps/corporate/data/nutraxin-product-register.json", "utf8"));

function renderEnquiry(search, existingMessage = "") {
  class FakeForm {}
  class FakeSelect {
    constructor() {
      this.value = "";
      this.options = ["General enquiry", "Pharmacy or wholesaler account", "Product opportunity"].map(value => ({ value }));
    }
  }
  class FakeTextArea {
    constructor() { this.value = existingMessage; }
  }
  const topic = new FakeSelect();
  const message = new FakeTextArea();
  const form = new FakeForm();
  form.dataset = { apiOrigin: "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com" };
  form.querySelector = () => ({ disabled: false });
  form.elements = { namedItem(name) { return name === "enquiryType" ? topic : name === "message" ? message : null; } };
  form.addEventListener = () => {};
  const document = { querySelector(selector) { return selector === "[data-live-b2b-enquiry-form]" ? form : { textContent: "" }; } };
  runInNewContext(script, {
    document,
    HTMLFormElement: FakeForm,
    HTMLSelectElement: FakeSelect,
    HTMLTextAreaElement: FakeTextArea,
    URLSearchParams,
    location: { search }
  });
  return { topic: topic.value, message: message.value };
}

test("all 19 Nutraxin SKUs have a safe product-specific business enquiry entry", () => {
  assert.equal(catalogue.products.length, 19);
  assert.match(publisher, /Shop the Nutraxin collection/, "Product detail prioritises consumer shopping");
  assert.match(publisher, /Enquire about a business account/, "Business customer SKU-specific enquiry remains available");
  assert.match(publisher, /enquiry=Pharmacy%20or%20wholesaler%20account&product=/);
  assert.match(publisher, /encodeURIComponent\(product\.sku\)/);
  for (const product of catalogue.products) {
    const output = renderEnquiry(`?enquiry=Pharmacy%20or%20wholesaler%20account&product=${encodeURIComponent(product.name)}&sku=${encodeURIComponent(product.sku)}`);
    assert.equal(output.topic, "Pharmacy or wholesaler account");
    assert.ok(output.message.includes(product.name));
    assert.ok(output.message.includes(product.sku));
    assert.ok(output.message.includes("not an order"));
  }
});

test("untrusted product query cannot inject HTML, and user's text is never replaced", () => {
  const attack = renderEnquiry("?enquiry=Product%20opportunity&product=%3Cscript%3Ealert(1)%3C%2Fscript%3E");
  assert.equal(attack.message, "");
  const existing = renderEnquiry("?product=Nutraxin%20Vitamin%20D3&sku=NUT-UK-ABC", "I need delivery information");
  assert.equal(existing.message, "I need delivery information");
});

test("non-product enquiries remain untouched", () => {
  assert.equal(renderEnquiry("?enquiry=General%20enquiry").message, "");
});
