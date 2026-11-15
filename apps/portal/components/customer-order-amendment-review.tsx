"use client";

import { useCallback, useEffect, useState } from "react";
import { gatewayJson, professionalError, protectedMutation } from "../lib/gateway";

type Amendment = Readonly<{
  id: string; customer_id: string; order_number: string; order_status: string;
  request_kind: string; requested_value: string; note: string | null;
  status: string; created_at: string;
}>;
type Queue = Readonly<{ requests: readonly Amendment[]; amendmentsEnabled: boolean }>;

export function CustomerOrderAmendmentReview() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState("");
  const refresh = useCallback(async () => {
    try {
      setQueue(await gatewayJson<Queue>("admin/customer-order-amendments"));
    } catch (error) { setMessage(professionalError(error)); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function decide(id: string, decision: "accept" | "reject") {
    if (saving) return;
    setSaving(id);
    setMessage("");
    try {
      const result = await protectedMutation<{ request: { status: string } }>(
        `admin/customer-order-amendments/${encodeURIComponent(id)}/decision`, { decision });
      setMessage(result.request.status === "accepted_pending_execution"
        ? "Request accepted for operational execution. The customer order and warehouse instructions have not yet been changed."
        : "Order change request rejected.");
      await refresh();
    } catch (error) { setMessage(professionalError(error)); }
    finally { setSaving(""); }
  }

  return <section className="customer-order-review" aria-labelledby="order-amendment-admin-heading">
    <h2 id="order-amendment-admin-heading">Order change requests</h2>
    <p>Review only. Acceptance does not amend a paid order or instruct a warehouse. Operational execution requires separate authorisation and reconciliation.</p>
    {queue && !queue.amendmentsEnabled && <p>Order amendment review is not yet activated.</p>}
    {queue?.amendmentsEnabled && !queue.requests.length && <p>No order changes are awaiting review.</p>}
    {queue?.requests.map((item) => <article key={item.id} className="customer-order-review-card">
      <h3>{item.order_number} · {item.request_kind.replaceAll("_", " ")}</h3>
      <p>Customer {item.customer_id} · Order {item.order_status}</p>
      <p>Requested value: {item.requested_value}</p>
      {item.note && <p>Notes: {item.note}</p>}
      <div className="customer-order-review-actions">
        <button type="button" disabled={Boolean(saving)} onClick={() => void decide(item.id, "accept")}>Accept for operations</button>
        <button type="button" disabled={Boolean(saving)} onClick={() => void decide(item.id, "reject")}>Reject request</button>
      </div>
    </article>)}
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
