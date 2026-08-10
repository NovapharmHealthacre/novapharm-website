import type {
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  FormEventHandler,
  ReactNode,
} from "react";
import React from "react";
import { cloneElement, isValidElement } from "react";

type LinkItem = Readonly<{ href: string; label: string; current?: boolean }>;
type StatusTone = "neutral" | "positive" | "warning" | "critical";

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export const componentRegistry = Object.freeze([
  "navigation",
  "mega-menu",
  "breadcrumbs",
  "hero",
  "editorial-section",
  "leadership-card",
  "product-explorer",
  "data-table",
  "accessible-chart",
  "timeline",
  "form-field",
  "dialog",
  "drawer",
  "tabs",
  "search",
  "filters",
  "error-state",
  "empty-state",
  "loading-state",
  "portal-control-bar",
  "file-upload",
  "approval-status",
  "audit-history",
  "document-viewer",
] as const);

export function SkipLink({ href = "#main-content", children = "Skip to main content" }: Readonly<{ href?: string; children?: ReactNode }>) {
  return <a className="np-skip-link" href={href}>{children}</a>;
}

export function Navigation({ label, homeHref, brand, items, actions }: Readonly<{
  label: string;
  homeHref: string;
  brand: ReactNode;
  items: readonly LinkItem[];
  actions?: ReactNode;
}>) {
  return <header className="np-navigation">
    <a className="np-navigation__brand" href={homeHref} aria-label={`${label} home`}>{brand}</a>
    <nav aria-label={label}>
      <ul className="np-navigation__list">{items.map((item) => <li key={item.href}><a href={item.href} aria-current={item.current ? "page" : undefined}>{item.label}</a></li>)}</ul>
    </nav>
    {actions ? <div className="np-navigation__actions">{actions}</div> : null}
  </header>;
}

export function MegaMenu({ label, groups }: Readonly<{
  label: string;
  groups: readonly Readonly<{ heading: string; links: readonly LinkItem[] }>[];
}>) {
  return <div className="np-mega-menu" role="region" aria-label={label}>{groups.map((group) => <section key={group.heading} aria-labelledby={`mega-${group.heading.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}>
    <h2 id={`mega-${group.heading.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}>{group.heading}</h2>
    <ul>{group.links.map((link) => <li key={link.href}><a href={link.href}>{link.label}</a></li>)}</ul>
  </section>)}</div>;
}

export function Breadcrumbs({ items }: Readonly<{ items: readonly LinkItem[] }>) {
  return <nav className="np-breadcrumbs" aria-label="Breadcrumb"><ol>{items.map((item, index) => <li key={item.href}>{index === items.length - 1 ? <span aria-current="page">{item.label}</span> : <a href={item.href}>{item.label}</a>}</li>)}</ol></nav>;
}

export function Hero({ eyebrow, title, summary, media, actions, compact = false }: Readonly<{
  eyebrow?: string;
  title: string;
  summary: string;
  media?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}>) {
  return <section className={classNames("np-hero", compact && "np-hero--compact")}>
    <div className="np-hero__content">{eyebrow ? <p className="np-eyebrow">{eyebrow}</p> : null}<h1>{title}</h1><p className="np-hero__summary">{summary}</p>{actions ? <div className="np-action-row">{actions}</div> : null}</div>
    {media ? <div className="np-hero__media">{media}</div> : null}
  </section>;
}

export function EditorialSection({ id, eyebrow, title, introduction, children, media, tone = "light" }: Readonly<{
  id: string;
  eyebrow?: string;
  title: string;
  introduction?: string;
  children: ReactNode;
  media?: ReactNode;
  tone?: "light" | "dark" | "blue";
}>) {
  return <section className={`np-editorial np-editorial--${tone}`} aria-labelledby={`${id}-title`}>
    <header>{eyebrow ? <p className="np-eyebrow">{eyebrow}</p> : null}<h2 id={`${id}-title`}>{title}</h2>{introduction ? <p>{introduction}</p> : null}</header>
    {media ? <div className="np-editorial__media">{media}</div> : null}<div className="np-editorial__body">{children}</div>
  </section>;
}

export function LeadershipCard({ name, role, href, image, summary }: Readonly<{ name: string; role: string; href: string; image?: ReactNode; summary?: string }>) {
  return <article className="np-leadership-card">{image ? <div className="np-leadership-card__media">{image}</div> : <div className="np-leadership-card__media np-media-placeholder" aria-label="Approved portrait not yet available" />}<div><h3><a href={href}>{name}</a></h3><p className="np-role">{role}</p>{summary ? <p>{summary}</p> : null}</div></article>;
}

export function ProductExplorer({ label, query, onQueryChange, filters, results, resultCount }: Readonly<{
  label: string;
  query: string;
  onQueryChange: ChangeEventHandler<HTMLInputElement>;
  filters?: ReactNode;
  results: ReactNode;
  resultCount: number;
}>) {
  return <section className="np-product-explorer" aria-label={label}><SearchField label={`Search ${label}`} value={query} onChange={onQueryChange} />{filters ? <div className="np-filter-row">{filters}</div> : null}<p className="np-result-count" role="status" aria-live="polite">{resultCount} results</p><div className="np-product-results">{results}</div></section>;
}

export function DataTable({ caption, columns, rows }: Readonly<{
  caption: string;
  columns: readonly Readonly<{ key: string; label: string; numeric?: boolean }>[];
  rows: readonly Readonly<Record<string, ReactNode>>[];
}>) {
  return <div className="np-table-scroll" tabIndex={0} role="region" aria-label={`${caption}, scrollable table`}><table className="np-data-table"><caption>{caption}</caption><thead><tr>{columns.map((column) => <th key={column.key} scope="col" className={column.numeric ? "np-numeric" : undefined}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column, columnIndex) => columnIndex === 0 ? <th key={column.key} scope="row">{row[column.key]}</th> : <td key={column.key} className={column.numeric ? "np-numeric" : undefined}>{row[column.key]}</td>)}</tr>)}</tbody></table></div>;
}

export function AccessibleChart({ id, title, description, children, table }: Readonly<{ id: string; title: string; description: string; children: ReactNode; table: ReactNode }>) {
  return <figure className="np-chart" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}><figcaption><h3 id={`${id}-title`}>{title}</h3><p id={`${id}-description`}>{description}</p></figcaption><div aria-hidden="true">{children}</div><details><summary>View data table</summary>{table}</details></figure>;
}

export function Timeline({ label, items }: Readonly<{ label: string; items: readonly Readonly<{ title: string; description: string; status?: string }>[] }>) {
  return <ol className="np-timeline" aria-label={label}>{items.map((item, index) => <li key={`${index}-${item.title}`}><span className="np-timeline__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.description}</p>{item.status ? <p className="np-timeline__status">{item.status}</p> : null}</div></li>)}</ol>;
}

export function FormField({ id, label, hint, error, required, children }: Readonly<{ id: string; label: string; hint?: string; error?: string; required?: boolean; children: ReactNode }>) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  const control = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, { id, "aria-describedby": describedBy, "aria-invalid": Boolean(error), required })
    : children;
  return <div className={classNames("np-field", error && "np-field--error")}><label htmlFor={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</label>{hint ? <p id={`${id}-hint`} className="np-field__hint">{hint}</p> : null}<div data-field-control>{control}</div>{error ? <p id={`${id}-error`} className="np-field__error" role="alert">{error}</p> : null}</div>;
}

export function Dialog({ id, title, description, open, children, actions }: Readonly<{ id: string; title: string; description?: string; open: boolean; children: ReactNode; actions?: ReactNode }>) {
  return <dialog className="np-dialog" open={open} aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}><h2 id={`${id}-title`}>{title}</h2>{description ? <p id={`${id}-description`}>{description}</p> : null}<div>{children}</div>{actions ? <footer>{actions}</footer> : null}</dialog>;
}

export function Drawer({ title, open, onClose, children }: Readonly<{ title: string; open: boolean; onClose?: () => void; children: ReactNode }>) {
  return <aside className={classNames("np-drawer", open && "np-drawer--open")} aria-hidden={!open} aria-labelledby="np-drawer-title"><header><h2 id="np-drawer-title">{title}</h2>{onClose ? <button type="button" onClick={onClose} aria-label={`Close ${title}`}>Close</button> : null}</header>{children}</aside>;
}

export function Tabs({ label, tabs, activeId, onSelect }: Readonly<{ label: string; tabs: readonly Readonly<{ id: string; label: string; panel: ReactNode }>[]; activeId: string; onSelect?: (id: string) => void }>) {
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  return <div className="np-tabs"><div role="tablist" aria-label={label}>{tabs.map((tab) => <button key={tab.id} type="button" role="tab" id={`${tab.id}-tab`} aria-controls={`${tab.id}-panel`} aria-selected={tab.id === active?.id} tabIndex={tab.id === active?.id ? 0 : -1} onClick={() => onSelect?.(tab.id)}>{tab.label}</button>)}</div>{active ? <div role="tabpanel" id={`${active.id}-panel`} aria-labelledby={`${active.id}-tab`}>{active.panel}</div> : null}</div>;
}

export function SearchField(props: Readonly<{ label: string; value: string; onChange: ChangeEventHandler<HTMLInputElement>; placeholder?: string }>) {
  return <label className="np-search"><span>{props.label}</span><input type="search" value={props.value} onChange={props.onChange} placeholder={props.placeholder} /></label>;
}

export function FilterGroup({ legend, children }: Readonly<{ legend: string; children: ReactNode }>) {
  return <fieldset className="np-filters"><legend>{legend}</legend>{children}</fieldset>;
}

export function StatePanel({ kind, title, message, action }: Readonly<{ kind: "error" | "empty" | "loading"; title: string; message: string; action?: ReactNode }>) {
  return <section className={`np-state np-state--${kind}`} role={kind === "error" ? "alert" : "status"} aria-live={kind === "error" ? "assertive" : "polite"} aria-busy={kind === "loading"}><h2>{title}</h2><p>{message}</p>{action}</section>;
}

export function PortalControlBar({ title, context, actions }: Readonly<{ title: string; context?: string; actions: ReactNode }>) {
  return <header className="np-portal-controls"><div><h1>{title}</h1>{context ? <p>{context}</p> : null}</div><div className="np-portal-controls__actions">{actions}</div></header>;
}

export function FileUpload({ id, label, accept, multiple = false, onChange, help }: Readonly<{ id: string; label: string; accept: string; multiple?: boolean; onChange?: ChangeEventHandler<HTMLInputElement>; help?: string }>) {
  return <div className="np-file-upload"><label htmlFor={id}>{label}</label>{help ? <p id={`${id}-help`}>{help}</p> : null}<input id={id} type="file" accept={accept} multiple={multiple} onChange={onChange} aria-describedby={help ? `${id}-help` : undefined} /></div>;
}

export function ApprovalStatus({ label, tone = "neutral", detail }: Readonly<{ label: string; tone?: StatusTone; detail?: string }>) {
  return <span className={`np-status np-status--${tone}`}><span>{label}</span>{detail ? <span className="np-visually-hidden">: {detail}</span> : null}</span>;
}

export function AuditHistory({ label, events }: Readonly<{ label: string; events: readonly Readonly<{ id: string; actor: string; action: string; timestamp: string; detail?: string }>[] }>) {
  return <ol className="np-audit-history" aria-label={label}>{events.map((event) => <li key={event.id}><time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</time><p><strong>{event.actor}</strong> {event.action}</p>{event.detail ? <p>{event.detail}</p> : null}</li>)}</ol>;
}

export function DocumentViewer({ id, title, source, downloadHref, children }: Readonly<{ id: string; title: string; source?: string; downloadHref?: string; children: ReactNode }>) {
  return <section className="np-document-viewer" aria-labelledby={`${id}-title`}><header><div><p className="np-eyebrow">Controlled document</p><h2 id={`${id}-title`}>{title}</h2>{source ? <p>{source}</p> : null}</div>{downloadHref ? <a href={downloadHref} download>Download authorised copy</a> : null}</header><div className="np-document-viewer__content">{children}</div></section>;
}

export function GovernedForm({ onSubmit, children, status }: Readonly<{ onSubmit: FormEventHandler<HTMLFormElement>; children: ReactNode; status?: ReactNode }>) {
  return <form className="np-form" onSubmit={onSubmit} noValidate>{children}{status ? <div className="np-form__status" aria-live="polite">{status}</div> : null}</form>;
}

export type ButtonProps = ComponentPropsWithoutRef<"button"> & Readonly<{ tone?: "primary" | "secondary" | "danger" }>;
export function Button({ tone = "primary", className, ...props }: ButtonProps) {
  return <button {...props} className={classNames("np-button", `np-button--${tone}`, className)} />;
}
