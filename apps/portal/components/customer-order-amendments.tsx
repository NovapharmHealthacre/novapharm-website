"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { gatewayJson, professionalError, protectedMutation } from "../lib/gateway";

type Order = Readonly<{
  id: string; order_number: string; status: string;
  customer_po_reference: string | null; requested_delivery_date: string | null;
  total_minor: number; currency: string; created_at: string;
  shipTo: { city: string; postcode: string; countryCode: string } | null;
  lines: readonly { sku: string; product_name: string; quantity: number; line_total_minor: number }[];
  shipments: readonly {
    shipment_number: string; status: string; carrier_name: string | null;
    tracking_reference: string | null; dispatched_at: string | null; delivered_at: string | null;
  }[];
}>;
type Amendment = Readonly<{
  id: string; order_number: string; request_kind: string;
  requested_value: string; status: string; created_at: string;
}>;
type Overview = Readonly<{ orders: readonly Order[]; amendments: readonly Amendment[]; amendmentsEnabled: boolean; notice: string }>;
type SavedAddress = Readonly<{
  id: string; label: string; address_kind: string; status: string;
  city: string; postcode: string;
}>;
type AddressResponse = Readonly<{ addressRequests: readonly SavedAddress[] }>;
type ChangeKind = "delivery_address" | "delivery_date" | "purchase_order_reference" | "other";

function amount(minor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency || "GBP" }).format(Number(minor || 0) / 100);
}
function dateLabel(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? "Not recorded" : time.toLocaleDateString("en-GB");
}

export function CustomerOrderAmendments() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [addresses, setAddresses] = useState<readonly SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState("");
  const [kind, setKind] = useState<ChangeKind>("delivery_date");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, book] = await Promise.all([
        gatewayJson<Overview>("enterprise/customer/order-overview"),
        gatewayJson<AddressResponse>("enterprise/customer/addresses"),
      ]);
      setOverview(orders);
      setAddresses(book.addressRequests.filter((a) => a.status === "approved" && a.address_kind === "delivery"));
    } catch (error) {
      setOverview(null);
      setMessage(professionalError(error));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function requestChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!overview?.amendmentsEnabled || submitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const field = (name: string) => String(data.get(name) || "").trim();
    setMessage("");
    setSubmitting(true);
    try {
      const result = await protectedMutation<{ request: { status: string; orderNumber: string } }>(
        "enterprise/customer/order-amendments",
        { orderId, requestKind: kind, deliveryAddressId: kind === "delivery_address" ? field("deliveryAddressId") : undefined,
          value: kind === "delivery_address" ? undefined : field("value"), note: field("note") });
      if (result.request.status !== "pending_review") throw new Error("The order request was not recorded.");
      setMessage(`Change request for ${result.request.orderNumber} submitted for operational review. No payment or shipment was changed.`);
      form.reset();
      await refresh();
    } catch (error) { setMessage(professionalError(error)); }
    finally { setSubmitting(false); }
  }

  const eligible = overview?.orders.filter((o) => o.status === "submitted" && o.shipments.length === 0) || [];
  return <section className="customer-order-workspace" aria-labelledby="customer-order-workspace-title">
    <header className="customer-order-intro">
      <p>MY ORDERS / DELIVERY</p>
      <h2 id="customer-order-workspace-title">Your orders. Every detail.</h2>
      <span>Account-scoped order lines, delivery destinations and recorded shipment updates.</span>
    </header>
    {loading ? <p role="status">Loading orders…</p> : null}
    {overview && <div className="customer-order-cards">
      {overview.orders.length === 0 ? <p>No orders have been recorded against this customer account.</p> : null}
      {overview.orders.map((order) => <article className="customer-order-card" key={order.id}>
        <div className="customer-order-card-head">
          <div><strong>{order.order_number}</strong><small>Placed {dateLabel(order.created_at)}</small></div>
          <div><span>{order.status.replaceAll("_", " ")}</span><strong>{amount(order.total_minor, order.currency)}</strong></div>
        </div>
        <dl className="customer-order-summary">
          <div><dt>Purchase order</dt><dd>{order.customer_po_reference || "Not recorded"}</dd></div>
          <div><dt>Delivery requested</dt><dd>{dateLabel(order.requested_delivery_date)}</dd></div>
          <div><dt>Delivery destination</dt><dd>{order.shipTo ? `${order.shipTo.city}, ${order.shipTo.postcode}` : "Not recorded"}</dd></div>
        </dl>
        <div className="customer-order-lines">
          <h3>Items</h3>
          {order.lines.map((line) => <div className="customer-order-line" key={line.sku}>
            <span>{line.product_name}<small>{line.sku} · Qty {line.quantity}</small></span>
            <strong>{amount(line.line_total_minor, order.currency)}</strong>
          </div>)}
        </div>
        <div className="customer-order-shipment">
          <h3>Delivery status</h3>
          {order.shipments.length === 0 ? <p>No warehouse dispatch has been recorded.</p> : order.shipments.map((shipment) => <p key={shipment.shipment_number}>
            {shipment.shipment_number} · {shipment.status.replaceAll("_", " ")}
            {shipment.carrier_name ? ` · ${shipment.carrier_name}` : ""}
            {shipment.tracking_reference ? ` · Tracking: ${shipment.tracking_reference}` : ""}
          </p>)}
          {overview.amendmentsEnabled && eligible.some((item) => item.id === order.id) ?
            <button type="button" className="customer-order-select" onClick={() => { setOrderId(order.id); setMessage(`Choose the requested change for ${order.order_number} below.`); }}>
              Request a change to this order
            </button> : null}
        </div>
      </article>)}
    </div>}
    {overview && <section className="customer-order-amendments" aria-labelledby="customer-order-change-title">
      <h3 id="customer-order-change-title">Change an order</h3>
      <p>A confirmed order is never silently edited after payment or released fulfilment. Your request must be reviewed and, if accepted, separately executed by customer operations.</p>
      {overview.amendmentsEnabled && eligible.length ? <form className="customer-order-change-form" onSubmit={requestChange}>
        <label>Order
          <select value={orderId} onChange={(event) => setOrderId(event.target.value)} required>
            <option value="">Choose an eligible order</option>
            {eligible.map((order) => <option key={order.id} value={order.id}>{order.order_number}</option>)}
          </select>
        </label>
        <label>Requested change
          <select value={kind} onChange={(event) => setKind(event.target.value as ChangeKind)}>
            <option value="delivery_date">Requested delivery date</option>
            <option value="purchase_order_reference">Purchase-order reference</option>
            <option value="delivery_address">Delivery address</option>
            <option value="other">Other order information</option>
          </select>
        </label>
        {kind === "delivery_address" ? <label>Approved delivery address
          <select name="deliveryAddressId" required>
            <option value="">Choose an approved location</option>
            {addresses.map((address) => <option key={address.id} value={address.id}>{address.label} · {address.city}, {address.postcode}</option>)}
          </select>
        </label> : kind === "delivery_date" ? <label>New requested date
          <input type="date" name="value" required />
        </label> : kind === "purchase_order_reference" ? <label>New purchase-order reference
          <input name="value" maxLength={100} required />
        </label> : <label>Change details
          <textarea name="value" maxLength={300} minLength={10} rows={3} required />
        </label>}
        <label>Reason or instructions (optional)
          <textarea name="note" maxLength={400} rows={2} />
        </label>
        <button type="submit" disabled={!orderId || submitting || (kind === "delivery_address" && !addresses.length)}>
          {submitting ? "Sending request…" : "Submit change request"}
        </button>
      </form> : <p className="customer-order-gate">{overview.amendmentsEnabled ?
        "There are no orders eligible for an online amendment. Contact customer support for a dispatched order." :
        "Order amendments will be available after the secure customer service is activated."}</p>}
      {overview.amendments.length > 0 && <div className="customer-order-request-history">
        <h3>Change request history</h3>
        {overview.amendments.map((item) => <p key={item.id}>{item.order_number} · {item.request_kind.replaceAll("_", " ")} · {item.status.replaceAll("_", " ")} · {dateLabel(item.created_at)}</p>)}
      </div>}
    </section>}
    <p className="customer-order-message" aria-live="polite" role="status">{message}</p>
  </section>;
}
