import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccessibleChart, DataTable, FormField, ModalDialog, Tabs } from "../src/index.ts";

test("chart announces meaning and offers exact values with explicit provenance", () => {
  const html = renderToStaticMarkup(<AccessibleChart id="demand" title="Demand trend"
    description="Change in hypothetical demand, not observed sales."
    source="Owner-entered example" asOf="16 November 2026"
    table={<table><caption>Example values</caption><tbody><tr><th scope="row">Week 1</th><td>10</td></tr></tbody></table>}>
    <svg role="img"><title>Decorative bars</title></svg>
  </AccessibleChart>);
  assert.match(html, /aria-labelledby="demand-title"/);
  assert.match(html, /aria-describedby="demand-description"/);
  assert.match(html, /hypothetical demand/);
  assert.match(html, /Source: Owner-entered example/);
  assert.match(html, /View exact values in a table/);
  assert.match(html, /<div aria-hidden="true">/);
  assert.match(html, /<caption>Example values<\/caption>/);
});

test("modal markup is not prematurely open, is named, and provides an explicit dismiss action", () => {
  const html = renderToStaticMarkup(<ModalDialog open={false} onDismiss={() => {}}
    title="Discard draft?" description="Changes would be lost."
    actions={<button type="button">Keep editing</button>}>Draft information.</ModalDialog>);
  assert.match(html, /<dialog[^>]*class="np-dialog np-modal-dialog"/);
  assert.match(html, /aria-labelledby=/);
  assert.match(html, /aria-describedby=/);
  assert.match(html, /Close Discard draft\?/);
  assert.doesNotMatch(html, /<dialog[^>]*\sopen=/);
  assert.match(html, /Keep editing/);
});

test("tabs keep active panel visible and provide keyboard-operable tab list", () => {
  const html = renderToStaticMarkup(<Tabs label="Warehouse views" activeId="demand"
    onSelect={() => {}} tabs={[{ id: "demand", label: "Demand", panel: "Demand panel" }, { id: "people", label: "Staffing", panel: "Staffing panel" }]} />);
  assert.match(html, /role="tablist" aria-label="Warehouse views"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /role="tabpanel"/);
  assert.match(html, /Demand panel/);
  assert.doesNotMatch(html, /Staffing panel/);
});

test("FormField preserves the control's existing instructions, native required state and invalid semantics", () => {
  const html = renderToStaticMarkup(<FormField id="reference" label="Order reference" hint="Found on invoice" error="Check the reference">
    <input type="text" required aria-describedby="permission-note reference-hint" aria-invalid="grammar" />
  </FormField>);
  assert.match(html, /required=""/);
  assert.match(html, /aria-describedby="permission-note reference-hint reference-error"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /Check the reference/);

  const unchanged = renderToStaticMarkup(<FormField id="source" label="Data source">
    <input type="text" aria-describedby="source-policy" aria-invalid="spelling" />
  </FormField>);
  assert.match(unchanged, /aria-describedby="source-policy"/);
  assert.match(unchanged, /aria-invalid="spelling"/);
});

test("empty data tables have an explicit, caller-controlled message", () => {
  const html = renderToStaticMarkup(<DataTable caption="Authorised records"
    columns={[{ key: "reference", label: "Reference" }, { key: "status", label: "Status" }]}
    rows={[]} emptyMessage="No authorised records match these filters." />);
  assert.match(html, /<caption>Authorised records<\/caption>/);
  assert.match(html, /colSpan="2"/);
  assert.match(html, /No authorised records match these filters/);
});
