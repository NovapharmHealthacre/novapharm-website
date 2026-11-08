/**
 * Transactional boundaries for server-authorised checkout.
 * Deliberately independent of HTTP so no public endpoint is accidentally
 * created while customer identity, stock, commercial tax and AWS are gated.
 * The production store MUST enforce unique active attempts transactionally.
 */
import { createStripeHostedCheckout, verifyStripeWebhook,
  reconcileStripeCheckoutEvent } from "./stripe-checkout.mjs";

const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{5,99}$/u;
const deny = (message="Payment is not available for this customer or order.") =>
  Object.assign(new Error(message), {statusCode:403, code:"payment_not_authorised"});

function approvedIdentity(identity) {
  if (!identity || identity.authenticated !== true || identity.verifiedEmail !== true ||
      identity.tradingApproved !== true || identity.role !== "customer" ||
      typeof identity.customerId !== "string" || !ID.test(identity.customerId) ||
      typeof identity.subject !== "string" || !ID.test(identity.subject)) throw deny();
}

/**
 * Only orderId travels from the browser. Store functions MUST be backed by
 * private customer-scoped durable records and atomic stock/attempt writes.
 * Never pass a request body into approvedOrder, quote or activation.
 */
export async function beginAuthorisedCheckout({
  identity, orderId, store, activation, publicOrigin, fetchImpl
} = {}) {
  approvedIdentity(identity);
  if (typeof orderId !== "string" || !ID.test(orderId)) throw deny();
  if (!store || typeof store.loadApprovedOrderForCustomer !== "function" ||
      typeof store.reservePaymentAttemptAtomically !== "function" ||
      typeof store.attachStripeSessionAtomically !== "function") throw deny("Payment database is unavailable.");

  const approvedOrder = await store.loadApprovedOrderForCustomer(orderId,identity.customerId);
  if (!approvedOrder || approvedOrder.orderId !== orderId ||
      approvedOrder.customerId !== identity.customerId ||
      approvedOrder.approvedForPayment !== true ||
      approvedOrder.stockReserved !== true ||
      approvedOrder.taxAndShippingVerified !== true) throw deny();

  const attempt = await store.reservePaymentAttemptAtomically({
    orderId,customerId:identity.customerId,quoteVersion:approvedOrder.quoteVersion,
    subject:identity.subject
  });
  if (!attempt || !ID.test(String(attempt.id||"")) ||
      attempt.orderId !== orderId || attempt.customerId !== identity.customerId ||
      attempt.quoteVersion !== approvedOrder.quoteVersion) throw deny("Payment attempt could not be safely reserved.");

  const completeOrder={...approvedOrder,paymentAttemptId:attempt.id};
  const checkout=await createStripeHostedCheckout({
    approvedOrder:completeOrder,activation,publicOrigin,fetchImpl
  });
  // Never return a URL if the provider session could not be persisted.
  await store.attachStripeSessionAtomically({
    attemptId:attempt.id,orderId,customerId:identity.customerId,quoteVersion:approvedOrder.quoteVersion,
    stripeSessionId:checkout.sessionId
  });
  return Object.freeze({checkoutUrl:checkout.checkoutUrl,checkoutSessionId:checkout.sessionId});
}

/**
 * Raw incoming Stripe webhook -> signature check -> linked stored attempt ->
 * exactly-once transactional payment+outbox persistence.
 * The store, not this adapter, must handle event ID deduplication and serial
 * state transitions. Browser "success" return is NOT part of this flow.
 */
export async function acceptSignedCheckoutWebhook({
  rawBody, signatureHeader, webhookSecret, store, nowMs
} = {}) {
  if (!store || typeof store.findAttemptForStripeSession !== "function" ||
      typeof store.applyPaymentEventOnceAndEnqueue !== "function") throw deny("Payment ledger is unavailable.");
  const event=verifyStripeWebhook({rawBody,signatureHeader,webhookSecret,nowMs});
  if (!String(event.type||"").startsWith("checkout.session.")) {
    return Object.freeze({acknowledged:true,applied:false});
  }
  const stripeSessionId=event.data?.object?.id;
  if (typeof stripeSessionId !== "string" || !/^cs_(?:test_|live_)[a-zA-Z0-9]+$/u.test(stripeSessionId)) {
    throw deny("Invalid Stripe session reference.");
  }
  const stored=await store.findAttemptForStripeSession(stripeSessionId);
  if (!stored) throw deny("Unrecognised payment attempt.");
  const outcome=reconcileStripeCheckoutEvent(event,stored);
  const applied=await store.applyPaymentEventOnceAndEnqueue({
    eventId:event.id,attemptId:stored.paymentAttemptId,
    orderId:stored.orderId,action:outcome.action,
    providerCreatedAt:event.created
  });
  return Object.freeze({acknowledged:true,applied:applied===true});
}
