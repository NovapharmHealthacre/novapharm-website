import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ApprovalStatus,
  Breadcrumbs,
  DataTable,
  Dialog,
  FormField,
  Navigation,
  StatePanel,
  Tabs,
  Timeline,
} from "../src/index.ts";

test("navigation, breadcrumbs and tabs render semantic navigation states", () => {
  const html = renderToStaticMarkup(<>
    <Navigation label="Primary" homeHref="/" brand="NovaPharm" items={[{ href: "/about/", label: "About", current: true }]} />
    <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/about/", label: "About" }]} />
    <Tabs label="Record views" activeId="open" tabs={[{ id: "open", label: "Open", panel: "Open records" }, { id: "closed", label: "Closed", panel: "Closed records" }]} />
  </>);
  assert.match(html, /<nav aria-label="Primary">/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /aria-label="Breadcrumb"/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /aria-selected="true"/);
});

test("form errors, data tables and states expose assistive semantics", () => {
  const html = renderToStaticMarkup(<>
    <FormField id="company" label="Company" hint="Registered name" error="Company is required" required><input type="text" /></FormField>
    <DataTable caption="Review queue" columns={[{ key: "record", label: "Record" }, { key: "state", label: "State" }]} rows={[{ record: "QA-1", state: <ApprovalStatus label="Pending" tone="warning" /> }]} />
    <StatePanel kind="error" title="Unavailable" message="No data was changed." />
  </>);
  assert.match(html, /aria-describedby="company-hint company-error"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /<caption>Review queue<\/caption>/);
  assert.match(html, /scope="row"/);
  assert.match(html, /role="alert"/);
});

test("timeline and dialog keep visible content and explicit relationships", () => {
  const html = renderToStaticMarkup(<>
    <Timeline label="Approval pathway" items={[{ title: "Review", description: "Check evidence." }]} />
    <Dialog id="evidence-dialog" title="Evidence review" description="Confirm the controlled source." open>Review content</Dialog>
  </>);
  assert.match(html, /aria-label="Approval pathway"/);
  assert.match(html, /aria-labelledby="evidence-dialog-title"/);
  assert.match(html, /aria-describedby="evidence-dialog-description"/);
});
