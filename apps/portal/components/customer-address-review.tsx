"use client";

import { useCallback, useEffect, useState } from "react";
import { gatewayJson, professionalError, protectedMutation } from "../lib/gateway";

type Review = Readonly<{
  id: string; customer_number: string; legal_name: string; address_kind: string;
  label: string; recipient_name: string; contact_phone: string; line_1: string; line_2?: string | null;
  city: string; region?: string | null; postcode: string; country_code: string;
  delivery_instructions?: string | null; is_default: number | boolean; created_at: string;
}>;
export function CustomerAddressReview() {
  const [items, setItems] = useState<readonly Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gatewayJson<{ requests: readonly Review[]; requestsEnabled: boolean }>("admin/customer-addresses");
      setItems(data.requests);
      setEnabled(data.requestsEnabled === true);
    } catch (error) {
      setEnabled(false);
      setItems([]);
      setMessage(professionalError(error));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function decide(id: string, decision: "approve" | "reject") {
    if (busyId) return;
    setBusyId(id);
    setMessage("");
    try {
      const response = await protectedMutation<{ request: { status: string } }>(
        `admin/customer-addresses/${encodeURIComponent(id)}/decision`, { decision },
      );
      setMessage(`Address decision recorded: ${response.request.status}. This does not approve the business account.`);
      await refresh();
    } catch (error) { setMessage(professionalError(error)); }
    finally { setBusyId(""); }
  }
  return <section className="customer-address-workspace" aria-label="Customer address change reviews">
    <div className="customer-address-intro"><p className="customer-address-eyebrow">OWNER REVIEW / CUSTOMER ACCOUNTS</p>
      <h2>Address requests.</h2><p>Approve delivery destinations separately from account, product and trading permissions.</p></div>
    {loading ? <p>Loading authorised review queue…</p> : null}
    {!loading && enabled && items.length === 0 ? <p>No address requests awaiting review.</p> : null}
    {!loading && !enabled ? <p>Address review is not yet activated in this environment.</p> : null}
    <div className="customer-address-review-list">
      {items.map(item => <article className="customer-address-panel" key={item.id}>
        <h3>{item.label}</h3>
        <p>{item.legal_name} · {item.customer_number} · {item.address_kind}</p>
        <p><strong>{item.recipient_name}</strong> · {item.contact_phone}</p>
        <p>{[item.line_1, item.line_2, item.city, item.region, item.postcode, item.country_code].filter(Boolean).join(", ")}</p>
        {item.delivery_instructions ? <p>Instructions: {item.delivery_instructions}</p> : null}
        <p>{Boolean(item.is_default) ? "Requested as default" : "Additional address"}</p>
        <div className="customer-address-review-actions">
          <button type="button" disabled={Boolean(busyId)} onClick={() => void decide(item.id, "approve")}>Approve address</button>
          <button type="button" disabled={Boolean(busyId)} onClick={() => void decide(item.id, "reject")}>Reject request</button>
        </div>
      </article>)}
    </div>
    <p role="status" aria-live="polite">{message}</p>
    <p className="customer-address-privacy">An approved address is only a verified delivery destination within this application; it does not validate company identity, licenses, stock or warehouse capacity.</p>
  </section>;
}
