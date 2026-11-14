"use client";

import { customerModules } from "@novapharm/portal-contracts";
import Image from "next/image";

/**
 * A single Customer workspace: Nutraxin and ESCO are product collections,
 * never independent identity stores, order databases or privilege scopes.
 * Everything below is navigation to existing governed module routes.
 * Deliberately no browser-side order submission or inferred stock/price.
 */
const paths = Object.freeze([
  {
    title: "Account & finances",
    modules: ["customer.dashboard", "customer.account", "customer.invoices", "customer.statements", "customer.settings"],
  },
  {
    title: "Products & orders",
    modules: ["customer.products", "customer.price-lists", "customer.stock-availability",
      "customer.orders", "customer.order-tracking", "customer.delivery-tracking", "customer.returns"],
  },
  {
    title: "Services & documents",
    modules: ["customer.quality-complaints", "customer.documents", "customer.regulatory-documents",
      "customer.downloads", "customer.support", "customer.analytics"],
  },
] as const);

const moduleMap = new Map(customerModules.filter((module) => module.visibleInNavigation).map((module) => [module.code, module]));

export function CustomerCommerceWorkspace({ moduleCode }: Readonly<{ moduleCode: string }>) {
  if (moduleCode === "customer.dashboard") {
    const products = moduleMap.get("customer.products");
    const orders = moduleMap.get("customer.orders");
    const tracking = moduleMap.get("customer.delivery-tracking");
    return <section className="unified-customer-hub customer-editorial-hub" aria-labelledby="customer-workspace-title">
      <div className="customer-editorial-hero">
        <p className="customer-editorial-eyebrow">CUSTOMER WORKSPACE</p>
        <h1 id="customer-workspace-title">Everything for your<br />NovaPharm business.</h1>
        <p>Products, orders, documents and support — all in one place.</p>
        <div className="customer-editorial-actions">
          {products ? <a className="customer-action-primary" href={products.route}>Browse products</a> : null}
          {orders ? <a className="customer-action-secondary" href={orders.route}>View orders</a> : null}
        </div>
      </div>
      <section className="customer-editorial-feature-grid" aria-label="Customer services">
        <article className="customer-editorial-feature customer-editorial-products">
          <div className="customer-editorial-feature-copy">
            <p className="customer-editorial-feature-overline">PRODUCTS</p>
            <h2>Products &amp; ordering.</h2>
            <p>Browse your authorised catalogue, review account-specific pricing and manage order requests.</p>
            {products ? <a href={products.route}>Explore products</a> : null}
          </div>
          <div className="customer-editorial-packshots" aria-label="Nutraxin catalogue product photographs">
            <Image src="/assets/media/products/nutraxin/vitamin-d3-120-tablets-480.webp" alt="Nutraxin Vitamin D3 pack" width={180} height={228} unoptimized />
            <Image src="/assets/media/products/nutraxin/magnesium-complex-60-tablets-480.webp" alt="Nutraxin Magnesium Complex pack" width={180} height={228} unoptimized />
            <Image src="/assets/media/products/nutraxin/collagen-gold-30-tablets-480.webp" alt="Nutraxin Collagen Gold pack" width={180} height={228} unoptimized />
          </div>
        </article>
        <article className="customer-editorial-feature customer-editorial-delivery">
          <div className="customer-editorial-feature-copy">
            <p className="customer-editorial-feature-overline">FULFILMENT</p>
            <h2>Orders &amp; deliveries.</h2>
            <p>Find your orders, follow eligible deliveries and access returns in one secure workspace.</p>
            {orders ? <a href={orders.route}>Manage orders</a> : null}
          </div>
          <div className="customer-editorial-delivery-detail" aria-hidden="true">
            <span>ORDER</span><span>DISPATCH</span><span>DELIVERY</span>
            <div className="customer-editorial-delivery-line" />
          </div>
          {tracking ? <a className="customer-editorial-sub-link" href={tracking.route}>Delivery tracking</a> : null}
        </article>
      </section>
      <section className="customer-editorial-index" aria-labelledby="customer-services-heading">
        <h2 id="customer-services-heading">Everything else, easy to find.</h2>
        <div className="customer-editorial-groups">
          {paths.map((group) => <section className="customer-editorial-group" key={group.title}>
            <h3>{group.title}</h3>
            <ul>{group.modules.map((code) => {
              const module = moduleMap.get(code);
              if (!module) return null;
              return <li key={code}><a href={module.route}>{module.title}</a></li>;
            })}</ul>
          </section>)}
        </div>
      </section>
      <p className="customer-editorial-footnote">Product photographs are catalogue references, not confirmation of customer eligibility, stock or price. Only approved services and released account records can be used.</p>
    </section>;
  }

  if (moduleCode === "customer.products") {
    return <section className="unified-customer-hub" aria-labelledby="customer-collections-title">
      <p className="unified-customer-eyebrow">NOVAPHARM / AUTHORISED CATALOGUE</p>
      <h2 id="customer-collections-title">One catalogue. Multiple collections.</h2>
      <p>Nutraxin and ESCO Anand are collections within My Products, not separate shopping accounts or ordering applications. Your authenticated catalogue below is the authority for available products and account-specific terms.</p>
      <div className="unified-collection-grid">
        <div className="unified-collection-card">
          <strong>Nutraxin</strong>
          <span>Nutrition & wellness products</span>
          <p>Product eligibility, approved retail or trade pricing, and fulfilment must be verified before checkout.</p>
        </div>
        <div className="unified-collection-card">
          <strong>ESCO Anand</strong>
          <span>Medical and surgical supply references</span>
          <p>Catalogue references alone do not establish account prices, UK product authorisation, stock or order acceptance.</p>
        </div>
      </div>
      <p className="unified-customer-release-note">The current portal release is read-only. Order and payment controls remain unavailable until the common transactional service passes its documented checks.</p>
    </section>;
  }
  return null;
}
