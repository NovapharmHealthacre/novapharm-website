import Link from "next/link";

/** An account application or a tightly allowlisted portal handoff; never a sale. */
export function NutraxinOrderAccess({ sku, name }: Readonly<{ sku: string; name: string }>) {
  // Do not send customers to the public static /portal/ placeholder. Only a
  // separately verified production portal may accept a continuation intent.
  const portalReady = process.env.NOVAPHARM_CUSTOMER_PORTAL_ACTIVE === "true"
    && process.env.PORTAL_ORIGIN?.replace(/\/$/, "") === "https://portal.novapharmhealthcare.com";
  const intent = `https://portal.novapharmhealthcare.com/?intent=nutraxin&sku=${encodeURIComponent(sku)}`;
  return (
    <section className="nutraxin-order-access" aria-label={`Business ordering access for ${name}`}>
      <p className="nutraxin-order-access-label">NOVAPHARM BUSINESS ACCOUNT</p>
      <h2>{portalReady ? "Selected for your account." : "Your business. Your account."}</h2>
      <p>{portalReady
        ? <>Continue securely with <strong>{name}</strong>. Your selected product is carried to your approved customer workspace.</>
        : <>Request a qualified business account to review <strong>{name}</strong> when commercial ordering becomes available.</>}</p>
      <div className="nutraxin-order-access-actions">
        {portalReady
          ? <a className="nutraxin-order-primary" href={intent}>Continue to customer account</a>
          : <Link className="nutraxin-order-primary" href={`/contact/?enquiry=Pharmacy%20or%20wholesaler%20account&product=${encodeURIComponent(name)}&sku=${encodeURIComponent(sku)}`}>Request business account access</Link>}
        {portalReady ? <Link className="nutraxin-order-secondary" href="/account-application/">New business customer?</Link> : null}
      </div>
      <p className="nutraxin-order-access-note">No online order or payment is accepted yet. UK VAT for standard-rated supplements is 20% where chargeable; prices, inventory, tax invoices and delivery must be approved before checkout opens.</p>
    </section>
  );
}
