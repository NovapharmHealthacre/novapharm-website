"use client";

import { adminModules, customerModules, employeeModules, executiveModules, type PortalArea, type PortalModule } from "@novapharm/portal-contracts";
import { Activity, ArrowUpRight, LogOut, Menu, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { areaLabels, areaLandingRoutes, areaScopes } from "../data/routes";
import { gatewayJson, type PortalUser, professionalError, protectedMutation } from "../lib/gateway";
import { PortalBrand } from "./portal-brand";

type Metric = Readonly<{ key: string; label: string; value: number; format?: string; href?: string | null }>;
type Column = readonly [string, string, string?];
type DataSection = Readonly<{ title: string; description?: string; columns: readonly Column[]; rows: readonly Record<string, unknown>[]; emptyState: string; source?: string }>;
type ModuleAction = Readonly<{ code: string; label: string; endpoint?: string; endpointTemplate?: string; method?: string; enabled?: boolean; options?: readonly Record<string, unknown>[] }>;
type Snapshot = Readonly<{
  module: PortalModule;
  environment: string;
  dataState: string;
  dataFreshness: string;
  readOnly: boolean;
  metrics: readonly Metric[];
  sections: readonly DataSection[];
  notices: readonly string[];
  actions: readonly ModuleAction[];
}>;
type SearchResult = Readonly<{ type: string; title: string; reference: string; route: string; status?: string | null }>;

const visible = (modules: readonly PortalModule[]) => modules.filter((module) => module.visibleInNavigation);
const modulesByArea: Readonly<Record<PortalArea, readonly PortalModule[]>> = { customer: visible(customerModules), employee: visible(employeeModules), executive: visible(executiveModules), admin: visible(adminModules) };

function readable(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  return String(value).replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatted(value: unknown, type = "", row: Record<string, unknown> = {}): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (type === "money") return new Intl.NumberFormat("en-GB", { style: "currency", currency: String(row["currency"] ?? "GBP") }).format(Number(value) / 100);
  if (type === "number") return new Intl.NumberFormat("en-GB").format(Number(value));
  if (type === "basis_points") return `${(Number(value) / 100).toFixed(0)}%`;
  if (type === "status") return readable(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  return String(value);
}

function MetricGrid({ metrics }: Readonly<{ metrics: readonly Metric[] }>) {
  if (!metrics.length) return null;
  return <div className="metric-grid">{metrics.map((metric) => <article key={metric.key} className="metric"><span>{metric.label}</span><strong>{formatted(metric.value, metric.format)}</strong>{metric.href ? <a href={metric.href}>View detail <ArrowUpRight aria-hidden="true" /></a> : null}</article>)}</div>;
}

function DataTable({ section }: Readonly<{ section: DataSection }>) {
  return <section className="data-section"><header><div><h2>{section.title}</h2>{section.description ? <p>{section.description}</p> : null}</div><span>{section.source ?? "Canonical application database"}</span></header>{/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll wide operational tables. */}<section className="table-region" tabIndex={0} aria-label={`Scrollable ${section.title} table`}><table><thead><tr>{section.columns.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead><tbody>{section.rows.length ? section.rows.map((row) => <tr key={section.columns.map(([key]) => String(row[key] ?? "")).join("|")}>{section.columns.map(([key, label, type]) => <td key={key} data-label={label} data-state={type === "status" ? String(row[key] ?? "unknown").toLowerCase() : undefined}>{formatted(row[key], type, row)}</td>)}</tr>) : <tr><td className="empty-cell" colSpan={Math.max(1, section.columns.length)}>{section.emptyState}</td></tr>}</tbody></table></section></section>;
}

function AreaSwitcher({ user }: Readonly<{ user: PortalUser }>) {
  const options = (Object.keys(areaScopes) as PortalArea[]).filter((area) => user.accessScopes.includes(areaScopes[area]) || user.accessScopes.includes("admin"));
  return <div className="area-switcher"><span>Available workspaces</span><div>{options.map((area) => <a key={area} href={areaLandingRoutes[area]}>{areaLabels[area]}</a>)}</div></div>;
}

function gatewayActionPath(endpoint: string): string {
  if (!endpoint.startsWith("/api/") || endpoint.includes("..")) throw new Error("The controlled action route is invalid.");
  return endpoint.slice(5);
}

function ActionPanel({ snapshot, onComplete, onMessage }: Readonly<{ snapshot: Snapshot; onComplete: () => Promise<void>; onMessage: (message: string) => void }>) {
  async function submit(endpoint: string, body: unknown, success: string) {
    try {
      await protectedMutation(gatewayActionPath(endpoint), body);
      await onComplete();
      onMessage(success);
    } catch (error) {
      onMessage(professionalError(error));
    }
  }

  if (!snapshot.actions.length) return null;
  const productRows = snapshot.sections.flatMap((section) => section.rows).filter((row) => row["id"] && row["lifecycle_status"]);
  return <section className="available-actions"><header><h2>Controlled actions</h2><p>Every change is validated, authorised and audit logged by the server.</p></header><div className="action-grid">{snapshot.actions.map((action) => {
    if (action.code === "create_support_ticket" && action.endpoint) return <form key={action.code} onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); void submit(action.endpoint as string, values, "Support ticket created."); event.currentTarget.reset(); }}><h3>{action.label}</h3><label>Subject<input name="subject" required maxLength={200} /></label><label>Category<select name="category" defaultValue="account"><option value="account">Account</option><option value="order">Order</option><option value="document">Document</option><option value="technical">Technical</option></select></label><label>Priority<select name="priority" defaultValue="normal"><option value="normal">Normal</option><option value="high">High</option></select></label><label>Description<textarea name="description" required minLength={10} maxLength={2000} rows={4} /></label><button type="submit">Create ticket</button></form>;
    if (action.code === "request_return" && action.endpoint) return <form key={action.code} onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const option = action.options?.[Number(values.get("option"))]; if (!option) return onMessage("Select an eligible order line."); void submit(action.endpoint as string, { orderId: option["order_id"], orderLineId: option["order_line_id"], quantity: Number(values.get("quantity")), reasonCode: values.get("reasonCode") }, "Return request created."); form.reset(); }}><h3>{action.label}</h3><label>Delivered order line<select name="option" required defaultValue=""><option value="" disabled>Select an order line</option>{action.options?.map((option, index) => <option key={String(option["order_line_id"])} value={index}>{String(option["order_number"])} · {String(option["sku"])} · {String(option["product_name"])}</option>)}</select></label><label>Quantity<input name="quantity" type="number" min="1" step="1" required /></label><label>Reason<select name="reasonCode" defaultValue="other"><option value="damaged">Damaged</option><option value="incorrect">Incorrect item</option><option value="other">Other</option></select></label><button type="submit">Request return</button></form>;
    if (action.code === "open_quality_complaint" && action.endpoint) return <form key={action.code} onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const option = action.options?.[Number(values.get("option"))]; if (!option) return onMessage("Select an eligible order and product."); void submit(action.endpoint as string, { orderId: option["order_id"], productId: option["product_id"], description: values.get("description"), severity: "untriaged", safetyInformationPresent: false }, "Quality complaint opened."); form.reset(); }}><h3>{action.label}</h3><p className="action-warning">Do not include adverse-event, patient-identifiable or urgent medical information.</p><label>Order and product<select name="option" required defaultValue=""><option value="" disabled>Select an order and product</option>{action.options?.map((option, index) => <option key={`${String(option["order_id"])}-${String(option["product_id"])}`} value={index}>{String(option["order_number"])} · {String(option["sku"])} · {String(option["product_name"])}</option>)}</select></label><label>Quality issue<textarea name="description" required minLength={20} maxLength={2000} rows={5} /></label><button type="submit">Open complaint</button></form>;
    if (action.code === "advance_workflow" && action.endpoint) return <div className="compact-action" key={`${action.code}-${action.endpoint}`}><h3>{action.label}</h3><p>Advance only after completing the evidence required by the active workflow step.</p><button type="button" onClick={() => void submit(action.endpoint as string, {}, "Workflow advanced to its next governed step.")}>Advance workflow</button></div>;
    if (action.code === "product_transition" && action.endpointTemplate) return <form key={action.code} onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); const productId = encodeURIComponent(String(values.get("productId") ?? "")); const endpoint = (action.endpointTemplate as string).replace("{id}", productId); void submit(endpoint, { status: values.get("status") }, "Product lifecycle transition recorded."); }}><h3>{action.label}</h3><label>Product<select name="productId" required defaultValue=""><option value="" disabled>Select product</option>{productRows.map((product) => <option key={String(product["id"])} value={String(product["id"])}>{String(product["sku"])} · {String(product["product_name"])} · {readable(product["lifecycle_status"])}</option>)}</select></label><label>Next state<select name="status" defaultValue="review"><option value="review">Review</option><option value="approved">Approved</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="draft">Draft</option><option value="retired">Retired</option></select></label><button type="submit">Record transition</button></form>;
    return <div className="compact-action unavailable" key={`${action.code}-${action.label}`}><h3>{action.label}</h3><p>{action.enabled === false ? "This request requires a separate controlled review workflow." : "No approved interactive workflow is available for this action."}</p></div>;
  })}</div></section>;
}

export function Dashboard({ module }: Readonly<{ module: PortalModule }>) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<readonly SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const session = await gatewayJson<{ user: PortalUser }>("portal/session");
      if (session.user.mustChangePassword) {
        window.location.replace("/portal/change-password/");
        return;
      }
      const requiredScope = areaScopes[module.area];
      if (!session.user.accessScopes.includes(requiredScope) && !session.user.accessScopes.includes("admin")) {
        setStatus("This identity is not authorised for the requested workspace.");
        setUser(session.user);
        setSnapshot(null);
        return;
      }
      const moduleSnapshot = await gatewayJson<Snapshot>(`enterprise/modules/${encodeURIComponent(module.code)}`);
      setUser(session.user);
      setSnapshot(moduleSnapshot);
    } catch (error) {
      setStatus(professionalError(error));
      if ((error as { status?: number }).status === 401) window.location.replace("/");
    } finally {
      setLoading(false);
    }
  }, [module.area, module.code]);

  useEffect(() => { void load(); }, [load]);

  async function logout() {
    let federatedLogout = false;
    try {
      const result = await protectedMutation<{ federatedLogout: boolean }>("auth/logout", {});
      federatedLogout = result.federatedLogout === true;
    } finally {
      window.location.replace(federatedLogout ? "/.auth/logout?post_logout_redirect_uri=/" : "/");
    }
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("query") ?? "").trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchOpen(true);
      return;
    }
    try {
      const result = await gatewayJson<{ results: readonly SearchResult[] }>(`enterprise/search?q=${encodeURIComponent(query)}`);
      setSearchResults(result.results);
      setSearchOpen(true);
    } catch (error) {
      setStatus(professionalError(error));
    }
  }

  const navigation = modulesByArea[module.area];
  return <main className="workspace-shell">
    <aside className={menuOpen ? "workspace-sidebar open" : "workspace-sidebar"}>
      <div className="sidebar-brand"><PortalBrand home={areaLandingRoutes[module.area]} /><button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X aria-hidden="true" /></button></div>
      <p className="sidebar-label">{areaLabels[module.area]} workspace</p>
      <nav aria-label={`${areaLabels[module.area]} portal`}><ul>{navigation.map((entry) => <li key={entry.code}><a className={entry.code === module.code ? "active" : ""} href={entry.route} aria-current={entry.code === module.code ? "page" : undefined}><span>{entry.title}</span><small>{entry.releaseClassificationLabel}</small></a></li>)}</ul></nav>
      <div className="sidebar-security"><ShieldCheck aria-hidden="true" /><span>Server-enforced access<br />No public caching</span></div>
    </aside>
    <section className="workspace-main">
      <header className="workspace-topbar"><button className="menu-button" type="button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu aria-hidden="true" /></button><search><form className="portal-search" onSubmit={search}><Search aria-hidden="true" /><label className="sr-only" htmlFor="portal-search">Search authorised records</label><input id="portal-search" name="query" placeholder="Search" autoComplete="off" /><button type="submit">Search</button>{searchOpen ? <div className="search-results"><button className="search-close" type="button" aria-label="Close search results" onClick={() => setSearchOpen(false)}><X aria-hidden="true" /></button>{searchResults.length ? searchResults.map((result) => <a key={`${result.type}-${result.reference}`} href={result.route}><strong>{result.title}</strong><span>{result.type} · {result.reference}{result.status ? ` · ${readable(result.status)}` : ""}</span></a>) : <p>No authorised records found.</p>}</div> : null}</form></search><div className="user-summary"><span>{user?.displayName ?? "Secure user"}</span><small>{user ? readable(user.accessType) : "Verifying"}</small><button type="button" onClick={logout} aria-label="Sign out"><LogOut aria-hidden="true" /></button></div></header>
      <div className="workspace-content">
        <header className="module-heading"><div><p className="eyebrow">{areaLabels[module.area]} / {module.releaseClassificationLabel}</p><h1>{module.title}</h1><p>{module.purpose}</p></div><button className="icon-command" type="button" onClick={() => void load()} disabled={loading} title="Refresh data"><RefreshCw aria-hidden="true" /><span>Refresh</span></button></header>
        {user ? <AreaSwitcher user={user} /> : null}
        <p className="workflow-status" aria-live="polite">{status}</p>
        {loading ? <div className="loading-state"><Activity aria-hidden="true" /><span>Loading authorised records…</span></div> : null}
        {snapshot ? <><div className="data-context"><span>{snapshot.dataState === "synthetic" ? "Synthetic validation data" : snapshot.module.releaseClassificationLabel}</span><span>Updated {new Date(snapshot.dataFreshness).toLocaleString("en-GB")}</span><span>Read only</span></div>{snapshot.notices.map((notice) => <p className="module-notice" key={notice}>{notice}</p>)}<MetricGrid metrics={snapshot.metrics} />{snapshot.sections.map((section) => <DataTable key={section.title} section={section} />)}<ActionPanel snapshot={snapshot} onComplete={load} onMessage={setStatus} /></> : null}
      </div>
    </section>
  </main>;
}
