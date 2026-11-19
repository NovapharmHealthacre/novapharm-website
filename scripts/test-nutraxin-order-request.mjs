import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { buildQuoteRequestURL, encodeBasketLines, NUTRAXIN_SKUS } from "../assets/js/nutraxin-order-request.js";

const register = JSON.parse(readFileSync("apps/corporate/data/nutraxin-product-register.json", "utf8"));
const contactCode = readFileSync("assets/js/contact-production.js", "utf8");
const generator = readFileSync("scripts/apply-corporate-product-discipline.mjs", "utf8");

function prefillContact(search) {
  class FakeForm {}
  class FakeSelect {
    constructor() {
      this.value = "";
      this.options = ["General enquiry", "Pharmacy or wholesaler account"].map(value => ({ value }));
    }
  }
  class FakeTextArea { constructor() { this.value = ""; } }
  const form = new FakeForm();
  const topic = new FakeSelect();
  const message = new FakeTextArea();
  form.dataset = { apiOrigin: "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com" };
  form.querySelector = () => ({ disabled: false });
  form.elements = { namedItem(name) { return name === "enquiryType" ? topic : name === "message" ? message : null; } };
  form.addEventListener = () => {};
  runInNewContext(contactCode, {
    document: { querySelector(selector) { return selector === "[data-live-b2b-enquiry-form]" ? form : { textContent: "" }; } },
    HTMLFormElement: FakeForm,
    HTMLSelectElement: FakeSelect,
    HTMLTextAreaElement: FakeTextArea,
    location: { search },
    URLSearchParams
  });
  return { topic: topic.value, message: message.value };
}

test("order-request allowlist exactly matches canonical 19-product register", () => {
  assert.equal(register.products.length, 19);
  assert.deepEqual([...NUTRAXIN_SKUS].sort(), register.products.map(p => p.sku).sort());
  assert.match(generator, /function nutraxinOrderRequestMain\(\)/);
  assert.match(generator, /products\/nutraxin\/order-request\/index\.html/);
  assert.match(generator, /nx-order-line/);
  assert.match(generator, /nutraxin-order-request\.js/);
});

test("basket preserves exact SKU, quantity, and secure enquiry routing", () => {
  const sample = [
    { sku: NUTRAXIN_SKUS[0], quantity: 10 },
    { sku: NUTRAXIN_SKUS[8], quantity: 48 }
  ];
  const expected = `${NUTRAXIN_SKUS[0]}:10,${NUTRAXIN_SKUS[8]}:48`;
  assert.equal(encodeBasketLines(sample), expected);
  assert.equal(encodeBasketLines([{ sku: NUTRAXIN_SKUS[0], quantity: 1 }]), `${NUTRAXIN_SKUS[0]}:1`);
  assert.equal(encodeBasketLines([{ sku: NUTRAXIN_SKUS[0], quantity: 10000 }]), `${NUTRAXIN_SKUS[0]}:10000`);
  assert.match(generator, /max="10000"/);
  const u = new URL(buildQuoteRequestURL(sample), "https://novapharmhealthcare.com");
  assert.equal(u.pathname, "/contact/");
  assert.equal(u.searchParams.get("basket"), expected);
  assert.equal(u.searchParams.get("enquiry"), "Pharmacy or wholesaler account");
  const { topic, message } = prefillContact(u.search);
  assert.equal(topic, "Pharmacy or wholesaler account");
  assert.match(message, /preliminary Nutraxin business purchase request/);
  assert.ok(message.includes(NUTRAXIN_SKUS[0] + ": 10 units"));
  assert.ok(message.includes(NUTRAXIN_SKUS[8] + ": 48 units"));
  assert.match(message, /non-binding quotation request, not a confirmed order/);
  assert.doesNotMatch(message, /£[0-9]/);
});

test("all 19 SKU quantities fit into B2B message safety limit", () => {
  const url = buildQuoteRequestURL(NUTRAXIN_SKUS.map(sku => ({ sku, quantity: 10000 })));
  const message = prefillContact(new URL(url, "https://novapharmhealthcare.com").search).message;
  assert.ok(message.length >= 20 && message.length <= 2000);
  assert.equal(message.split(" units").length - 1, 19);
});

test("unsafe, missing, excessive and repeated quantities fail closed", () => {
  assert.throws(() => encodeBasketLines([]));
  assert.throws(() => encodeBasketLines([{ sku: "NOT-ON-LIST", quantity: 1 }]));
  assert.throws(() => encodeBasketLines([{ sku: NUTRAXIN_SKUS[0], quantity: 0 }]));
  assert.throws(() => encodeBasketLines([{ sku: NUTRAXIN_SKUS[0], quantity: 10001 }]));
  assert.throws(() => encodeBasketLines([{ sku: NUTRAXIN_SKUS[0], quantity: 2.5 }]));
  assert.throws(() => encodeBasketLines([{ sku: NUTRAXIN_SKUS[0], quantity: 1 }, { sku: NUTRAXIN_SKUS[0], quantity: 2 }]));
  assert.equal(prefillContact("?enquiry=Pharmacy%20or%20wholesaler%20account&basket=NUT-UK-VD3-T120:1%3Cscript%3E").message, "");
  assert.equal(prefillContact("?enquiry=Pharmacy%20or%20wholesaler%20account&basket=NUT-UK-VD3-T120:0").message, "");
});
