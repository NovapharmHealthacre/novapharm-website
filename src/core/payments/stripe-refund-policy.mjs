/**
 * Interpret a Stripe refund webhook AFTER raw-body HMAC verification.
 * The handler must find a pre-authorised refund request in the private DB
 * and atomically deduplicate event.id. No refund is initiated here.
 */
const CURRENCY = "gbp";
const REFUND_TYPES = new Set(["refund.created", "refund.updated", "refund.failed"]);
function fail(message) { throw Object.assign(new Error(message), {code:"refund_reconciliation_rejected"}); }

export function reconcileStripeRefundEvent(event, storedAttempt, storedRefund) {
  if (!event || !REFUND_TYPES.has(event.type)) return {action:"ignore"};
  if (!storedAttempt || !storedRefund) fail("Unknown refund request.");
  const refund = event.data?.object;
  if (!refund || refund.object !== "refund" ||
      refund.id !== storedRefund.stripeRefundId ||
      storedAttempt.orderId !== storedRefund.orderId ||
      storedAttempt.paymentAttemptId !== storedRefund.paymentAttemptId ||
      refund.currency !== CURRENCY || refund.livemode !== storedAttempt.liveMode ||
      refund.amount !== storedRefund.amountMinor ||
      !Number.isSafeInteger(refund.amount) || refund.amount <= 0 ||
      refund.amount > storedAttempt.paidAmountMinor) {
    fail("Refund record does not match a verified paid payment.");
  }
  // Stripe refunds can be linked to a charge or a payment intent.
  if (refund.charge !== storedAttempt.stripeChargeId &&
      refund.payment_intent !== storedAttempt.stripePaymentIntentId) {
    fail("Refund does not belong to the verified Stripe charge.");
  }
  if (storedAttempt.paymentStatus !== "paid") fail("A payment must be paid before refund reconciliation.");
  if (storedRefund.status === "succeeded" && refund.status !== "succeeded") {
    return {action:"ignore_out_of_order_event",eventId:event.id};
  }
  const state = refund.status;
  if (state === "succeeded") return {action:"record_verified_refund",eventId:event.id,refundId:storedRefund.id};
  if (state === "pending" || state === "requires_action") return {action:"record_refund_pending",eventId:event.id,refundId:storedRefund.id};
  if (state === "failed" || state === "canceled") return {action:"flag_refund_failure",eventId:event.id,refundId:storedRefund.id};
  return {action:"review_unrecognised_refund_status",eventId:event.id,refundId:storedRefund.id};
}
