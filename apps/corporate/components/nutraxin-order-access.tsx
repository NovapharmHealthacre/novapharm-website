import Link from "next/link";

/** Account entry point, not a public sale offer or checkout. */
export function NutraxinOrderAccess({ sku, name }: Readonly<{ sku: string; name: string }>) {
  const intent = `/portal/?intent=nutraxin&sku=${encodeURIComponent(sku)}`;
  return (
    <section className="nutraxin-order-access" aria-label={`Business ordering access for ${name}`}>
      <p className="nutraxin-order-access-label">NOVAPHARM BUSINESS ORDERING</p>
      <h2>Selected for your account.</h2>
      <p>Continue securely with <strong>{name}</strong>. Your product selection will be carried through sign-in to your customer workspace.</p>
      <div className="nutraxin-order-access-actions">
        <a className="nutraxin-order-primary" href={intent}>Continue to customer account</a>
        <Link className="nutraxin-order-secondary" href="/account-application/">New business customer?</Link>
      </div>
      <p className="nutraxin-order-access-note">Order submission and checkout are not enabled. Product eligibility, approved account status, stock, pricing, VAT and delivery terms must be verified before an order can be placed.</p>
    </section>
  );
}
