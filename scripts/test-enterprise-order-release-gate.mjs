import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ENTERPRISE_ORDER_RELEASE,
  assertEnterpriseOrderSubmissionAllowed,
} from "../src/core/enterprise-order-release-gate.mjs";

const fakeApproval = {
  NOW: "2026-11-14",
  NOVAPHARM_BINDING_ORDER_ENABLED: "true",
  FOUNDER_APPROVED: "true",
  WDAH_APPROVED: "true",
  PAYMENT_APPROVED: "true",
};

test("production and ordinary staging cannot create enterprise binding orders", () => {
  for (const env of [
    { NODE_ENV: "production", ...fakeApproval },
    { NODE_ENV: "production", LOCAL_PORTAL_MODE: "true", BROWSER_VALIDATION_MODE: "true" },
    { NODE_ENV: "staging", ...fakeApproval },
    { NODE_ENV: "development", ...fakeApproval },
    { NODE_ENV: "test", ...fakeApproval },
    { NODE_ENV: "test", NOVAPHARM_DOMAIN_VALIDATION_MODE: "true", DATABASE_PATH: "/var/data/live.sqlite" },
    { NODE_ENV: "production", NOVAPHARM_DOMAIN_VALIDATION_MODE: "true", DATABASE_PATH: "/tmp/novapharm-domain-aaaa/validation.sqlite" },
  ]) {
    assert.throws(
      () => assertEnterpriseOrderSubmissionAllowed(env),
      error => error?.statusCode === 409 &&
        error?.code === "enterprise_binding_order_not_released" &&
        /non-binding customer quotation request/.test(error.message),
    );
  }
});

test("only isolated synthetic/browser validation can create test records", () => {
  for (const key of ["LOCAL_PORTAL_MODE", "BROWSER_VALIDATION_MODE"]) {
    const allowed = assertEnterpriseOrderSubmissionAllowed({
      NODE_ENV: "development",
      [key]: "true",
    });
    assert.equal(allowed.productionTransactionAuthorised, false);
    assert.equal(allowed.environment, "isolated_synthetic_validation");
  }
});

test("explicit isolated domain fixture stays synthetic and never authorises production", () => {
  const allowed = assertEnterpriseOrderSubmissionAllowed({
    NODE_ENV: "test",
    NOVAPHARM_DOMAIN_VALIDATION_MODE: "true",
    DATABASE_PATH: "/tmp/novapharm-domain-A1b2c3/validation.sqlite",
  });
  assert.equal(allowed.productionTransactionAuthorised, false);
  assert.equal(allowed.environment, "isolated_synthetic_validation");
});

test("commercial and medicine release gates cannot be represented as enabled", () => {
  assert.equal(ENTERPRISE_ORDER_RELEASE.status, "NOT_PRODUCTION_ACCEPTED");
  assert.equal(ENTERPRISE_ORDER_RELEASE.bindingOrderEnabled, false);
  assert.equal(ENTERPRISE_ORDER_RELEASE.warehouseReservationEnabled, false);
  assert.ok(ENTERPRISE_ORDER_RELEASE.requires.includes("reconciled_quality_released_inventory_and_fefo"));
  assert.ok(ENTERPRISE_ORDER_RELEASE.requires.includes("security_finance_quality_and_owner_release_signoff"));
});

test("the mandatory guard executes before product selection, order creation and outbox writes", () => {
  const source = readFileSync(new URL("../src/core/domain-service.mjs", import.meta.url), "utf8");
  const start = source.indexOf("export async function createOrder(");
  const end = source.indexOf("export async function listOrders(", start);
  assert.ok(start >= 0 && end > start);
  const method = source.slice(start, end);
  const guard = method.indexOf("assertEnterpriseOrderSubmissionAllowed()");
  assert.ok(guard >= 0, "order release check must be in the actual createOrder method");
  for (const following of ["await one(", "allocateNumber(", "INSERT INTO orders", "order.wms_reservation_requested"]) {
    const pos = method.indexOf(following);
    assert.ok(pos > guard, following + " must be after release guard");
  }
});
