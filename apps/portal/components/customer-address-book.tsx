"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { gatewayJson, professionalError, protectedMutation } from "../lib/gateway";

type CompanyAddress = Readonly<{
  id: string; address_type: string; line_1: string; line_2?: string | null;
  city: string; region?: string | null; postcode: string; country_code: string; is_primary: number | boolean;
}>;
type RequestedAddress = Readonly<{
  id: string; address_kind: "delivery" | "billing"; label: string; replaces_address_id?: string | null;
  recipient_name: string; contact_phone: string; line_1: string; line_2?: string | null;
  city: string; region?: string | null; postcode: string; country_code: string;
  delivery_instructions?: string | null; status: "pending_review" | "approved" | "rejected" | "disabled";
  is_default: number | boolean; created_at: string;
}>;
type AddressBook = Readonly<{
  account: {
    customerNumber: string; legalName: string; tradingName?: string | null; lifecycleStatus: string;
    customerType: string; companyNumber?: string | null; vatNumberOnFile: boolean; countryCode: string;
    paymentTermsDays: number; currency: string;
    primaryContact: { name: string; roleTitle: string; email: string; status: string } | null;
  };
  application: { number: string; status: string } | null;
  addresses: readonly CompanyAddress[];
  addressRequests: readonly RequestedAddress[];
  requestsEnabled: boolean;
  verification: { businessIdentity: string; deliveryAddress: string; note: string };
}>;

function locationLine(address: { line_1: string; line_2?: string | null; city: string; region?: string | null; postcode: string; country_code: string }) {
  return [address.line_1, address.line_2, address.city, address.region, address.postcode, address.country_code].filter(Boolean).join(", ");
}

export function CustomerAddressBook() {
  const [book, setBook] = useState<AddressBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [message, setMessage] = useState("");
  const [addressKind, setAddressKind] = useState<"delivery" | "billing">("delivery");
  const [editing, setEditing] = useState<RequestedAddress | null>(null);
  function startEdit(item: RequestedAddress) {
    if (item.status !== "approved" || !book?.requestsEnabled) return;
    setEditing(item);
    setAddressKind(item.address_kind);
    setMessage("Submit the updated address for review. The current approved location remains available until the change is approved.");
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await gatewayJson<AddressBook>("enterprise/customer/addresses");
      setBook(response);
    } catch (error) {
      setBook(null);
      setMessage(professionalError(error));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function removeAddress(id: string) {
    if (!book?.requestsEnabled || removingId) return;
    setRemovingId(id);
    setMessage("");
    try {
      await protectedMutation<{ request: { status: string } }>(
        `enterprise/customer/addresses/${encodeURIComponent(id)}/disable`, {});
      setMessage("Address removed from your available locations. Previously confirmed orders remain unchanged.");
      await refresh();
    } catch (error) { setMessage(professionalError(error)); }
    finally { setRemovingId(""); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!book?.requestsEnabled || submitting) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const field = (name: string) => String(values.get(name) ?? "").trim();
    setSubmitting(true);
    setMessage("");
    try {
      const result = await protectedMutation<{ request: { status: string } }>("enterprise/customer/addresses", {
        addressKind,
        replacesAddressId: editing?.id || null,
        label: field("label"),
        recipientName: field("recipientName"),
        contactPhone: field("contactPhone"),
        line1: field("line1"),
        line2: field("line2"),
        city: field("city"),
        region: field("region"),
        postcode: field("postcode"),
        countryCode: field("countryCode").toUpperCase(),
        deliveryInstructions: field("deliveryInstructions"),
        isDefault: values.get("isDefault") === "on",
      });
      if (result.request.status !== "pending_review") throw new Error("The request has not been recorded for review.");
      form.reset();
      setAddressKind("delivery");
      setEditing(null);
      setMessage(editing
        ? "Address update submitted for review. Your existing approved address remains in place until the change is approved."
        : "Address submitted for review. It cannot be used for dispatch until approved.");
      await refresh();
    } catch (error) { setMessage(professionalError(error)); }
    finally { setSubmitting(false); }
  }

  return <section className="customer-address-workspace" aria-labelledby="address-workspace-heading">
    <div className="customer-address-intro">
      <p className="customer-address-eyebrow">MY ACCOUNT / ADDRESS BOOK</p>
      <h2 id="address-workspace-heading">Your business. Your destinations.</h2>
      <p>Keep invoicing details and delivery locations together in one secure NovaPharm account.</p>
    </div>
    {loading ? <p aria-live="polite">Loading your account addresses…</p> : null}
    {book ? <>
      <div className="customer-address-identity">
        <div><span>Account holder</span><strong>{book.account.legalName}</strong><small>{book.account.customerNumber}</small></div>
        <div><span>Business account</span><strong>{book.account.lifecycleStatus === "active" ? "Account record active" : "Under review"}</strong><small>Trading and product permissions are checked separately.</small></div>
        <div><span>Address verification</span><strong>Review required</strong><small>A delivery address does not verify company identity or authorise a sale.</small></div>
      </div>
      <section className="customer-address-business" aria-labelledby="customer-business-heading">
        <h3 id="customer-business-heading">Business information</h3>
        <p>These details come from NovaPharm's account records. Address changes do not independently verify a company.</p>
        <dl className="customer-address-business-grid">
          <div><dt>Legal name</dt><dd>{book.account.legalName}</dd></div>
          <div><dt>Trading name</dt><dd>{book.account.tradingName || "Not recorded"}</dd></div>
          <div><dt>Company registration</dt><dd>{book.account.companyNumber || "Not recorded"}</dd></div>
          <div><dt>Country</dt><dd>{book.account.countryCode}</dd></div>
          <div><dt>Tax identifier</dt><dd>{book.account.vatNumberOnFile ? "On file" : "Not recorded / may not apply"}</dd></div>
          <div><dt>Application review</dt><dd>{book.application ? `${book.application.status} · ${book.application.number}` : "No linked reviewed application"}</dd></div>
          <div><dt>Primary contact</dt><dd>{book.account.primaryContact ? `${book.account.primaryContact.name} · ${book.account.primaryContact.email}` : "Not recorded"}</dd></div>
          <div><dt>Payment terms</dt><dd>{book.account.paymentTermsDays} days · {book.account.currency}</dd></div>
        </dl>
        <p className="customer-address-privacy">Account activation, email ownership and product-specific trading permissions are distinct verification steps.</p>
      </section>
      <div className="customer-address-columns">
        <div className="customer-address-panel">
          <h3>Saved addresses</h3>
          <p>Approved company records and your submitted address changes.</p>
          {book.addresses.length === 0 && book.addressRequests.length === 0
            ? <p className="customer-address-empty">No saved delivery or billing addresses yet.</p> : null}
          {book.addresses.map(item => <article className="customer-address-card" key={item.id}>
            <div className="customer-address-card-header"><strong>{item.address_type === "delivery" ? "Delivery location" : item.address_type === "invoice" ? "Billing address" : "Company address"}</strong><span>Controlled record</span></div>
            <p>{locationLine(item)}</p>
            {Boolean(item.is_primary) ? <small>Primary company address</small> : null}
          </article>)}
          {book.addressRequests.map(item => <article className="customer-address-card" key={item.id}>
            <div className="customer-address-card-header"><strong>{item.label}</strong><span>{item.status.replaceAll("_", " ")}</span></div>
            <p>{item.recipient_name} · {item.contact_phone}</p>
            <p>{locationLine(item)}</p>
            <small>{item.address_kind === "delivery" ? "Delivery" : "Billing"} {Boolean(item.is_default) ? "· Requested default" : ""}</small>
            {book.requestsEnabled && item.status === "approved" ? <button className="customer-address-remove" type="button" onClick={() => startEdit(item)}>Edit address</button> : null}
            {book.requestsEnabled && ["approved", "pending_review"].includes(item.status) ? <button className="customer-address-remove" type="button" disabled={Boolean(removingId)} onClick={() => void removeAddress(item.id)}>{item.status === "pending_review" ? "Withdraw request" : "Remove address"}</button> : null}
            {item.replaces_address_id ? <small>Requested update to an existing approved address</small> : null}
          </article>)}
        </div>
        <div className="customer-address-panel">
          <h3>{editing ? "Update saved address" : "Add an address"}</h3>
          <p>{editing ? "Your current approved address will be retained until this replacement is reviewed." : "New locations are submitted for account review before they become available for orders."}</p>
          {editing ? <button type="button" className="customer-address-remove" onClick={() => { setEditing(null); setAddressKind("delivery"); setMessage(""); }}>Cancel editing</button> : null}
          <form key={editing?.id || "new"} onSubmit={submit} className="customer-address-form">
            <div className="customer-address-two">
              <label>Address type<select value={addressKind} disabled={Boolean(editing)} onChange={event => setAddressKind(event.target.value as "delivery" | "billing")}>
                <option value="delivery">Delivery</option><option value="billing">Billing</option>
              </select></label>
              <label>Address label<input name="label" defaultValue={editing?.label || ""} placeholder="Main warehouse" maxLength={80} required /></label>
            </div>
            <label>Recipient or business contact<input name="recipientName" defaultValue={editing?.recipient_name || ""} autoComplete="name" maxLength={160} required /></label>
            <label>Contact telephone<input name="contactPhone" defaultValue={editing?.contact_phone || ""} autoComplete="tel" type="tel" maxLength={40} placeholder="+44…" required /></label>
            <label>Address line 1<input name="line1" defaultValue={editing?.line_1 || ""} autoComplete="address-line1" maxLength={200} required /></label>
            <label>Address line 2<input name="line2" defaultValue={editing?.line_2 || ""} autoComplete="address-line2" maxLength={200} /></label>
            <div className="customer-address-two">
              <label>Town or city<input name="city" defaultValue={editing?.city || ""} autoComplete="address-level2" maxLength={120} required /></label>
              <label>County or region<input name="region" defaultValue={editing?.region || ""} autoComplete="address-level1" maxLength={120} /></label>
            </div>
            <div className="customer-address-two">
              <label>Postcode<input name="postcode" defaultValue={editing?.postcode || ""} autoComplete="postal-code" maxLength={32} required /></label>
              <label>Country code<input name="countryCode" autoComplete="country" maxLength={2} defaultValue={editing?.country_code || "GB"} pattern="[A-Za-z]{2}" required /></label>
            </div>
            <label>Delivery instructions (optional)<textarea name="deliveryInstructions" defaultValue={editing?.delivery_instructions || ""} maxLength={400} rows={3} placeholder="Goods-in entrance, opening hours, unloading requirements…" /></label>
            <label className="customer-address-checkbox"><input type="checkbox" name="isDefault" defaultChecked={Boolean(editing?.is_default)} /> Request as default {addressKind} address</label>
            <button type="submit" disabled={!book.requestsEnabled || submitting}>{submitting ? "Submitting…" : editing ? "Submit address update" : "Submit address for review"}</button>
            {!book.requestsEnabled ? <p className="customer-address-gate">Address submissions will open once the secure customer service passes production activation.</p> : null}
          </form>
        </div>
      </div>
    </> : null}
    <p className="customer-address-message" role="status" aria-live="polite">{message}</p>
    <p className="customer-address-privacy">Delivery contact details are used only for account and fulfilment administration. Email ownership, company qualification and product permissions remain separate checks. No address entry initiates a payment or shipment.</p>
  </section>;
}
