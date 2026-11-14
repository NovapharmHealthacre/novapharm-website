"use client";

import { customerModules } from "@novapharm/portal-contracts";

/**
 * A single Customer workspace: Nutraxin and ESCO are product collections,
 * never independent identity stores, order databases or privilege scopes.
 * Everything below is navigation to existing governed module routes.
 * Deliberately no browser-side order submission or inferred stock/price.
 */
const paths = Object.freeze([
  {
    title: "Account & finances",
    modules: ["customer.account", "customer.invoices", "customer.statements", "customer.settings"],
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
    return <section className="unified-customer-hub" aria-labelledby="customer-workspace-title">
      <p className="unified-customer-eyebrow">NOVAPHARM / YOUR ACCOUNT</p>
      <h2 id="customer-workspace-title">Everything you need. One workspace.</h2>
      <p>Manage your account, products, orders, invoices, deliveries and support through the same authorised customer identity. Each feature displays only records released for your account.</p>
      <div className="unified-customer-groups">
        {paths.map((group) => <section className="unified-customer-group" key={group.title}>
          <h3>{group.title}</h3>
          <ul>{group.modules.map((code) => {
            const module = moduleMap.get(code);
            if (!module) return null;
            return <li key={code}>
              <a href={module.route}>
                <span>{module.title}</span>
                <small>{module.releaseClassificationLabel}</small>
              </a>
            </li>;
          })}</ul>
        </section>)}
      </div>
      <p className="unified-customer-release-note">Only approved business and commerce actions are enabled. Read-only and unavailable services never represent completed orders, verified stock or financial approval.</p>
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
