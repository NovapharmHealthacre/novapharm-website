"use client";

import { employeeModules } from "@novapharm/portal-contracts";

/**
 * Premium employee distribution experience inside the EXISTING role-gated
 * enterprise portal. No browser-side role selection, API writes or customer data.
 * Telesales orders remain read-only until a distinct workforce identity and
 * authoritative shared-order service are independently accepted.
 */
const modules = new Map(employeeModules
  .filter((entry) => entry.visibleInNavigation)
  .map((entry) => [entry.code, entry]));

const workAreas = [
  { code: "employee.orders", label: "Telesales & orders",
    description: "Review governed order records and assisted-order procedures.", prominence: "primary" },
  { code: "employee.customers", label: "Customer accounts",
    description: "Locate qualified business customers without using consumer credentials.", prominence: "secondary" },
  { code: "employee.products", label: "Product catalogue",
    description: "Confirm exact product identity, pack and release classification.", prominence: "secondary" },
  { code: "employee.warehouse", label: "NovaPharm Distribution",
    description: "Warehouse control tower for recorded stock, expiry, quality and distribution evidence.", prominence: "secondary" },
  { code: "employee.purchasing", label: "Purchasing",
    description: "Coordinate qualified suppliers, sourcing and order exceptions.", prominence: "secondary" },
  { code: "employee.finance", label: "Finance & credit",
    description: "Review approved contract terms and account controls.", prominence: "secondary" },
] as const;

const wmsControlAreas = [
  { code: "employee.orders", title: "Commercial control",
    detail: "Customer, price, purchase-order and credit evidence. An enquiry is not a binding order." },
  { code: "employee.warehouse", title: "Inventory visibility",
    detail: "Recorded lot, expiry, stock-owner and movement evidence. Ledger balances are not confirmed ATP." },
  { code: "employee.quality", title: "Quality and release",
    detail: "Quarantine, returns, deviations, CAPA and recall decisions remain with authorised quality." },
  { code: "employee.purchasing", title: "Order orchestration",
    detail: "Supplier receipt, carrier and 3PL fulfilment evidence; no automatic reservation or dispatch." },
  { code: "employee.dashboard", title: "Distribution intelligence",
    detail: "Investigate exceptions and data readiness; OTIF and profitability require reconciled data." },
] as const;

const process = [
  ["01", "Verify the caller", "Confirm the authorised business contact and employee assignment."],
  ["02", "Locate the product", "Use exact SKU, strength, pack, market and product classification."],
  ["03", "Request a quotation", "Record the customer's request without inventing stock or prices."],
  ["04", "Review all release gates", "Check customer, commercial, quality, medicine and stock evidence."],
  ["05", "Confirm the outcome", "Create an accepted order only through an independently approved service."],
] as const;

function WorkAreaCards() {
  return <div className="distribution-employee-grid">
    {workAreas.map((area) => {
      const entry = modules.get(area.code);
      if (!entry) return null;
      return <article className={"distribution-employee-card " + area.prominence} key={area.code}>
        <p className="distribution-employee-overline">OPERATIONS</p>
        <h3>{area.label}</h3>
        <p>{area.description}</p>
        <a href={entry.route} aria-label={"Open " + area.label}>Open workspace</a>
      </article>;
    })}
  </div>;
}

function AllOperations() {
  return <section className="distribution-employee-all" aria-labelledby="employee-operations-all">
    <h2 id="employee-operations-all">All operations.</h2>
    <p>Every service stays within its existing governed employee route. Availability depends on the verified data source.</p>
    <ul>{employeeModules.filter((entry) => entry.visibleInNavigation).map((entry) =>
      <li key={entry.code}><a href={entry.route}>{entry.title}</a></li>)}</ul>
  </section>;
}

export function EmployeeDistributionWorkspace({ moduleCode }: Readonly<{ moduleCode: string }>) {
  if (moduleCode === "employee.dashboard") {
    return <section className="distribution-employee" aria-labelledby="distribution-employee-title">
      <header className="distribution-employee-hero">
        <p className="distribution-employee-overline">NOVAPHARM DISTRIBUTION / OPERATIONS</p>
        <h1 id="distribution-employee-title">One network. Clear decisions.</h1>
        <p>Customers, products, procurement and fulfilment. A single operational workspace,
          with accountable approvals at every step.</p>
        <div className="distribution-employee-links">
          {modules.get("employee.orders")
            ? <a className="distribution-employee-button" href={modules.get("employee.orders")?.route}>Open telesales</a>
            : null}
          {modules.get("employee.customers")
            ? <a className="distribution-employee-link" href={modules.get("employee.customers")?.route}>Review customers</a>
            : null}
        </div>
      </header>
      <WorkAreaCards />
      <AllOperations />
      <section className="distribution-employee-notice" aria-label="Operating status">
        <strong>Controlled release.</strong>
        <p>Only verified, role-authorised records are actionable. The full enterprise portal,
          employee sign-in, commercial transactions and regulated medicine supply remain subject
          to separate production acceptance. These links do not authorise stock reservations,
          payment, price changes or dispatch.</p>
      </section>
    </section>;
  }

  if (moduleCode === "employee.warehouse") {
    return <section className="distribution-employee" aria-labelledby="employee-wms-title">
      <header className="distribution-employee-hero distribution-employee-hero-small">
        <p className="distribution-employee-overline">NOVAPHARM DISTRIBUTION / WAREHOUSE CONTROL TOWER</p>
        <h1 id="employee-wms-title">Warehouse &amp; Inventory</h1>
        <p>Every batch. Accounted for. One view across warehouse evidence, quality holds, expiry exposure
          and inventory movements. Clarity before action.</p>
      </header>
      <nav className="distribution-wms-control-nav" aria-label="Five WMS control layers">
        {wmsControlAreas.map((area, index) => {
          const entry = modules.get(area.code);
          return entry ? <a key={area.code} href={entry.route}
            aria-current={moduleCode === area.code ? "page" : undefined}>
            <span>{String(index + 1).padStart(2, "0")} / {area.title}</span>
            <small>{area.detail}</small>
          </a> : null;
        })}
      </nav>
      <section className="distribution-wms-status" aria-label="Warehouse data authority">
        <p className="distribution-employee-overline">SOURCE AND OPERATING AUTHORITY</p>
        <h2>Verification before availability.</h2>
        <p>Inventory shown below is recorded ledger evidence, not a confirmed Polar Speed
          or UPS warehouse balance. A catalogue item is not available-to-promise stock.</p>
        <div className="distribution-wms-principles">
          <div><strong>Inventory</strong><span>Site- and batch-level reconciliation required</span></div>
          <div><strong>Quality</strong><span>Release, expiry, quarantine, recall and temperature reviewed</span></div>
          <div><strong>Fulfilment</strong><span>FEFO review only; no automatic reservation or dispatch</span></div>
        </div>
      </section>
      <section className="distribution-wms-journeys" aria-labelledby="employee-wms-workflows">
        <p className="distribution-employee-overline">CONTROLLED WAREHOUSE OPERATIONS</p>
        <h2 id="employee-wms-workflows">From receipt to proof of delivery.</h2>
        <p>Three evidence-led workstreams support our warehouse partners. Each transition must be
          tied to the correct stock owner, site, product, batch and responsible decision.</p>
        <div className="distribution-wms-journey-list">
          <article><span>01 / INBOUND</span><h3>Receive and reconcile.</h3>
            <p>Match supplier purchase orders and advance shipment notices against actual
              warehouse receipts. Flag shortages, excess quantities and damage for quality review.</p></article>
          <article><span>02 / QUALITY</span><h3>Control every exception.</h3>
            <p>Keep returns isolated, preserve batch traceability and identify potential
              recall exposure. Only authorised quality decisions may change stock status.</p></article>
          <article><span>03 / FULFILMENT</span><h3>Follow every movement.</h3>
            <p>Reconcile allocation, picking, packing, carrier handover, delivery evidence
              and 3PL charges before treating a shipment as completed.</p></article>
        </div>
        <p className="distribution-wms-footnote">Operational data source: no independently authenticated
          Polar Speed/UPS inventory feed is configured. These controls cannot submit receiving
          adjustments, reservations, dispatch instructions or recall communications.</p>
        {modules.get("employee.quality")
          ? <a className="distribution-employee-link" href={modules.get("employee.quality")?.route}>
              Open quality workspace
            </a> : null}
      </section>
    </section>;
  }

  if (moduleCode === "employee.orders") {
    return <section className="distribution-employee" aria-labelledby="employee-telesales-title">
      <header className="distribution-employee-hero distribution-employee-hero-small">
        <p className="distribution-employee-overline">NOVAPHARM DISTRIBUTION / CUSTOMER ORDERS</p>
        <h1 id="employee-telesales-title">Telesales, without friction.</h1>
        <p>One assisted-order process, aligned with the customer's own account.
          Every request must be verified before it becomes an order.</p>
      </header>
      <section className="distribution-employee-process" aria-labelledby="employee-process-title">
        <p className="distribution-employee-overline">CONTROLLED ORDER JOURNEY</p>
        <h2 id="employee-process-title">From first call to confirmed supply.</h2>
        <ol>
          {process.map(([step, label, description]) => <li key={step}>
            <span className="distribution-employee-step">{step}</span>
            <div><h3>{label}</h3><p>{description}</p></div>
          </li>)}
        </ol>
      </section>
      <AllOperations />
      <section className="distribution-employee-notice" aria-label="Current service availability">
        <strong>Assisted order submission is not active.</strong>
        <p>The shared telesales request contract is source-tested. An authenticated workforce
          gateway, caller-verification audit ledger, customer-scoped persistence and regulated
          order-release checks must pass live acceptance before any form may submit an order.
          No customer credentials, guessed availability or unapproved prices are accepted.</p>
        {modules.get("employee.customers")
          ? <a href={modules.get("employee.customers")?.route}>Review customer workspace</a>
          : null}
      </section>
    </section>;
  }

  return null;
}
