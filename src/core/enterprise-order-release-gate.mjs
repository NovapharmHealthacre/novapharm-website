/**
 * Enterprise-portal order release boundary.
 *
 * The historical enterprise API currently lacks a complete, independently
 * accepted commercial/GDP/warehouse/finance authorisation service. Therefore
 * it is synthetic-validation-only and MUST NOT emit binding orders or stock
 * reservations from any deployed production or shared staging API.
 *
 * This intentionally does not control the separate, independently governed
 * customer BFF's non-binding quotation requests or retailer checkout.
 */
export const ENTERPRISE_ORDER_RELEASE = Object.freeze({
  status: "NOT_PRODUCTION_ACCEPTED",
  bindingOrderEnabled: false,
  warehouseReservationEnabled: false,
  requires: Object.freeze([
    "approved_legal_distribution_activity",
    "independent_product_and_buyer_country_authorisation",
    "contract_price_tax_credit_evidence",
    "reconciled_quality_released_inventory_and_fefo",
    "qualified_warehouse_and_dispatch_integration",
    "transaction_idempotency_and_integrity",
    "security_finance_quality_and_owner_release_signoff",
  ]),
});

/**
 * Call synchronously before database reads, order number allocation, order
 * insertion or WMS/SharePoint outbox enqueue. Never accept flags from HTTP
 * bodies, user roles, customer input, or unreviewed environment overrides.
 */
export function assertEnterpriseOrderSubmissionAllowed(env = process.env) {
  // Domain CI runs against an explicitly-created throwaway SQLite path.
  // This is not an enablement flag for a shared staging or production database.
  const isolatedDomainFixture =
    env.NOVAPHARM_DOMAIN_VALIDATION_MODE === "true" &&
    typeof env.DATABASE_PATH === "string" &&
    /(?:^|\\/)novapharm-domain-[a-zA-Z0-9]+\\/validation\\.sqlite$/.test(env.DATABASE_PATH);

  const syntheticValidation =
    env.NODE_ENV !== "production" &&
    (env.LOCAL_PORTAL_MODE === "true" ||
      env.BROWSER_VALIDATION_MODE === "true" ||
      isolatedDomainFixture);

  if (syntheticValidation) {
    return Object.freeze({
      environment: "isolated_synthetic_validation",
      productionTransactionAuthorised: false,
    });
  }

  const error = new Error(
    "Enterprise binding orders are unavailable until independently accepted " +
      "distribution, commercial, inventory, finance, quality and security evidence exists. " +
      "Use the governed non-binding customer quotation request flow instead.",
  );
  error.code = "enterprise_binding_order_not_released";
  error.statusCode = 409;
  throw error;
}
