"use client";

import { useId, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

/** Website equivalents of Apple's hierarchy and lockup patterns, not native Apple UI classes. */
/** Small, selectable labels use semantic ink hierarchy rather than decorative pills. */
export function TextLabel({ children, tone = "primary" }: Readonly<{
  children: ReactNode;
  tone?: "primary" | "secondary" | "tertiary";
}>) {
  return <span className={`np-hig-text-label np-hig-text-label--${tone}`}>{children}</span>;
}

export type HierarchyItem = Readonly<{
  id: string;
  label: string;
  description: string;
  detail?: string;
  href?: string;
  status?: string;
}>;
export type HierarchyGroup = Readonly<{
  id: string;
  label: string;
  items: readonly HierarchyItem[];
}>;

function focusAdjacent(event: KeyboardEvent<HTMLButtonElement>) {
  if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
  const controls = Array.from(event.currentTarget.closest("ul")?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
  const position = controls.indexOf(event.currentTarget);
  if (position < 0 || !controls.length) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? controls.length - 1
    : (position + (event.key === "ArrowDown" ? 1 : -1) + controls.length) % controls.length;
  controls[next]?.focus();
  // A browser-style selection follows the keyboard cursor; never submits a record.
  controls[next]?.click();
}

/** A desktop-friendly group → record → preview browser; no implied permission to act. */
export function ColumnBrowser({ label, groups }: Readonly<{ label: string; groups: readonly HierarchyGroup[] }>) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
  const [selectedItemId, setSelectedItemId] = useState(groups[0]?.items[0]?.id ?? "");
  const group = groups.find((entry) => entry.id === selectedGroupId) ?? groups[0];
  const item = group?.items.find((entry) => entry.id === selectedItemId) ?? group?.items[0];
  const headingId = useId();
  const [categoryWidth, setCategoryWidth] = useState(28);
  const browserStyle = { "--np-hig-category-width": `${categoryWidth}%` } as CSSProperties;
  if (!groups.length) return <p role="status">No categories are available.</p>;
  return <div className="np-hig-column-browser" role="region" aria-label={label} style={browserStyle}>
    <nav className="np-hig-column-browser__pane" aria-label={`${label}: categories`}>
      <h3>Categories</h3>
      <label className="np-hig-column-browser__resize">
        <span>Category width</span>
        <input type="range" min={20} max={40} step={5} value={categoryWidth}
          onChange={(event) => setCategoryWidth(Number(event.currentTarget.value))}
          aria-valuetext={`${categoryWidth}% of browser width`} />
      </label>
      <ul>{groups.map((entry) => <li key={entry.id}>
        <button type="button" aria-pressed={entry.id === group?.id}
          onClick={() => { setSelectedGroupId(entry.id); setSelectedItemId(entry.items[0]?.id ?? ""); }} onKeyDown={focusAdjacent}>
          <span>{entry.label}</span><small>{entry.items.length}</small>
        </button>
      </li>)}</ul>
    </nav>
    <nav className="np-hig-column-browser__pane" aria-label={`${label}: records`}>
      <h3>{group?.label ?? "Records"}</h3>
      <ul>{group?.items.map((entry) => <li key={entry.id}>
        <button type="button" aria-pressed={entry.id === item?.id} onClick={() => setSelectedItemId(entry.id)} onKeyDown={focusAdjacent}>
          {entry.label}
        </button>
      </li>)}</ul>
    </nav>
    <section className="np-hig-column-browser__preview" aria-labelledby={headingId} aria-live="polite">
      <h3 id={headingId}>{item?.label ?? "No records"}</h3>
      {item ? <>
        <p><TextLabel tone="secondary">{item.description}</TextLabel></p>
        {item.detail ? <p className="np-hig-column-browser__detail">{item.detail}</p> : null}
        {item.href
          ? <a href={item.href} aria-label={`Open recorded view for ${item.label}`}>Open recorded view</a>
          : <p className="np-hig-column-browser__status">{item.status ?? "Integration required"}</p>}
      </> : <p>No records are available in this category.</p>}
    </section>
  </div>;
}

/** Native details/summary exposes each level without JavaScript or simulated tree roles. */
export function OutlineView({ label, groups }: Readonly<{ label: string; groups: readonly HierarchyGroup[] }>) {
  return <section className="np-hig-outline" aria-label={label}>
    {groups.length ? <ul>{groups.map((group, index) => <li key={group.id}>
      <details open={index === 0}>
        <summary><span>{group.label}</span><small>{group.items.length} records</small></summary>
        <ul>{group.items.map((item) => <li key={item.id}>
          <div className="np-hig-outline__record">
            <strong>{item.label}</strong><p><TextLabel tone="secondary">{item.description}</TextLabel></p>
            {item.detail ? <small>{item.detail}</small> : null}
            {item.href ? <a href={item.href} aria-label={`Open recorded view for ${item.label}`}>Open recorded view</a>
              : <span>{item.status ?? "Integration required"}</span>}
          </div>
        </li>)}</ul>
      </details>
    </li>)}</ul> : <p role="status">No categories are available.</p>}
  </section>;
}

/** Outline is the no-script default; mounted panes retain state when switching. */
export function HierarchyExplorer({ label, groups }: Readonly<{ label: string; groups: readonly HierarchyGroup[] }>) {
  const [view, setView] = useState<"columns" | "outline">("outline");
  return <div className="np-hig-hierarchy-explorer">
    <div className="np-hig-explorer-switch" role="group" aria-label={`${label} display`}>
      <button type="button" aria-pressed={view === "columns"} onClick={() => setView("columns")}>Columns</button>
      <button type="button" aria-pressed={view === "outline"} onClick={() => setView("outline")}>Outline</button>
    </div>
    <div hidden={view !== "columns"}><ColumnBrowser label={label} groups={groups} /></div>
    <div hidden={view !== "outline"}><OutlineView label={label} groups={groups} /></div>
  </div>;
}

/** One interactive link per composed content unit; do not nest secondary actions. */
export function ContentLockup({ href, title, subtitle, media, footer }: Readonly<{
  href: string; title: string; subtitle?: string; media?: ReactNode; footer?: string;
}>) {
  return <a className="np-hig-lockup" href={href}>
    {media ? <span className="np-hig-lockup__media">{media}</span> : null}
    <span className="np-hig-lockup__body"><strong>{title}</strong>
      {subtitle ? <span>{subtitle}</span> : null}
      {footer ? <small>{footer}</small> : null}
    </span>
  </a>;
}
