import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const generator=readFileSync("scripts/apply-esco-catalogue.mjs","utf8");
const bag=readFileSync("assets/js/esco-bag.js","utf8");
const checkout=readFileSync("apps/esco-checkout/index.py","utf8");
const infra=JSON.parse(readFileSync("infra/aws/esco-products-checkout-production.json","utf8"));
const css=readFileSync("assets/css/esco-order-requests.css","utf8");

test("all catalogue customers can submit an explicit nonfinancial order request",()=>{
  for (const marker of ["data-esco-order-request-form","data-esco-order-request-submit",
    "data-esco-order-request-receipt","customer-name","customer-email",
    "accept-order-terms"]) assert.ok(generator.includes(marker),marker);
  assert.match(generator,/No card details or payment now/);
  assert.match(generator,/Base price/);
  assert.match(bag,/checkoutApiOrigin \+ "\/order-requests"/);
  assert.match(bag,/request_id:draftRequestId/);
  assert.match(bag,/accept_order_terms:fields\.get/);
  assert.match(bag,/No payment has been collected/);
});
test("paid checkout remains server authoritative and separate from request submission",()=>{
  assert.match(bag,/checkoutButton\.hidden = !eligible/);
  assert.match(bag,/approvedCatalogIds\.has\(item\.id\) && approvedUnitPricesPence\.has\(item\.id\)/);
  assert.match(bag,/checkoutApiOrigin \+ "\/checkout"/);
  assert.match(bag,/checkoutApiOrigin \+ "\/order-requests"/);
  assert.match(checkout,/set\(payload\) != \{/);
  assert.match(checkout,/request_id[\s\S]*lines[\s\S]*customer[\s\S]*accept_order_terms/);
  assert.match(checkout,/not 1 <= int\(sku\[-4:\]\) <= 373/);
  assert.doesNotMatch(checkout,/request\.get\("unit_price_pence"\)/);
});
test("request route, protected DynamoDB persistence and data retention are configured",()=>{
  const resources=infra.Resources;
  assert.equal(resources.OrderRequestRoute.Properties.RouteKey,"POST /order-requests");
  assert.equal(resources.OrderRequestStatusRoute.Properties.RouteKey,"GET /order-request-status/{orderId}");
  assert.equal(resources.OrdersTable.Properties.TimeToLiveSpecification.AttributeName,"expiresAt");
  assert.equal(resources.OrdersTable.Properties.TimeToLiveSpecification.Enabled,true);
  assert.equal(resources.CheckoutLambda.Properties.Code.ZipFile,checkout);
  assert.match(checkout,/ConditionExpression="attribute_not_exists\(pk\)"/);
  assert.match(checkout,/status": "RECEIVED_AWAITING_CONFIRMATION"/);
  assert.match(checkout,/paymentCollected": False/);
  assert.ok(css.includes(":focus-visible"));
  assert.ok(!generator.includes("Ready to order</span>"));
});

test("customers can check their receipt without seeing personal or payment data",()=>{
  assert.match(generator,/data-esco-request-lookup/);
  assert.match(generator,/data-esco-request-id/);
  assert.match(generator,/data-esco-request-state/);
  assert.match(bag,/\/order-request-status\/"/);
  assert.match(bag,/REQUEST_REF\.test\(orderId\)/);
  assert.match(bag,/info\.paymentCollected !== false/);
  assert.match(bag,/info\.orderId !== orderId/);
  assert.match(bag,/credentials: "omit", cache: "no-store"/);
  assert.match(bag,/requestLookupInput\.value = orderId/);
  assert.doesNotMatch(bag,/localStorage\.setItem\([^;]*orderId/);
  assert.match(checkout,/def request_status\(event, order_id\):/);
  assert.match(css,/\.esco-request-lookup-state\[hidden\]/);
});

test("customers can download a specification-based BOQ without sending any emails or prices",()=>{
  assert.match(generator,/data-esco-export-boq/);
  assert.match(bag,/boqExportButton\.disabled = !state\.length/);
  assert.match(bag,/downloadBoq\(state, known, categoryNameById\)/);
  assert.match(bag,/novapharm-esco-bill-of-quantities\.csv/);
  assert.match(bag,/new Blob\(\[csv\]/);
  assert.match(bag,/categoryNameById\.get\(item\.id\)/);
  assert.match(bag,/Exact specification \/ size \/ variant \(buyer to complete\)/);
  assert.match(bag,/replaceAll\('"', '""'\)/);
  assert.doesNotMatch(bag,/window\.location\.assign\([^;]*boq/i);
  assert.match(css,/\.esco-bag-boq:disabled/);
});
