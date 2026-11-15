import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WmsRecordedEvidenceStudio, type WmsSnapshot } from "../components/wms-recorded-evidence-studio";

const base = process.cwd();
const source = (file: string) => readFileSync(path.join(base, file), "utf8");

function fixture(dataState = "canonical"): WmsSnapshot {
  return {
    module: { code: "employee.warehouse" },
    dataState,
    dataFreshness: "2026-11-15T04:50:00Z",
    sections: [
      { title: "Inventory ledger", rows: [{ sku: "SKU-001" }, { sku: "SKU-002" }] },
      { title: "Receiving and purchasing evidence", rows: [{ receipt_number: "GR-001" }] },
      { title: "Quality and recall observations", rows: [] },
      { title: "NovaPharm Distribution exception worklist", rows: [
        { priority: "high", domain: "Quality", reference: "QC-001",
          signal: "Recorded open quality case", reviewOwner: "Quality / RP",
          observationKey: "quality:1" },
      ] },
    ],
  };
}

test("authenticated warehouse evidence generates only observed sample visuals", () => {
  const html = renderToStaticMarkup(createElement(WmsRecordedEvidenceStudio,{snapshot:fixture()}));
  assert.match(html, /Recorded evidence\. No assumptions/);
  assert.match(html, /3 \/ 7/);
  assert.match(html, /Not verified/);
  assert.match(html, /Unreconciled/);
  assert.match(html, /Inventory: 2 records observed in bounded sample/);
  assert.match(html, /Inbound: 1 records observed in bounded sample/);
  assert.match(html, /Quality: 0 records observed in bounded sample/);
  assert.match(html, /Integrations: source not available/);
  assert.match(html, /QC-001/);
  assert.match(html, /Quality \/ RP/);
  assert.match(html, /No independently authenticated Polar Speed\/UPS/);
  assert.match(html, /Independently authenticated|independently authenticated/);
  assert.doesNotMatch(html, /localStorage|demo stock|Reserve inventory|Create dispatch|Approve lot/);
});

test("synthetic mode is explicitly labelled and never accepted as live stock", () => {
  const html = renderToStaticMarkup(createElement(WmsRecordedEvidenceStudio,{snapshot:fixture("synthetic")}));
  assert.match(html, /Synthetic/);
  assert.match(html, /Local validation, not live inventory/);
  assert.match(html, /Physical ATP/);
});

test("missing warehouse source returns explicit unknown state", () => {
  const html = renderToStaticMarkup(createElement(WmsRecordedEvidenceStudio,{snapshot:null}));
  assert.match(html, /Authenticated WMS source data are not loaded/);
  assert.doesNotMatch(html, /Rows in recent samples/);
  const foreign = renderToStaticMarkup(createElement(WmsRecordedEvidenceStudio,{snapshot:{
    module:{code:"customer.dashboard"},dataState:"canonical",dataFreshness:"now",sections:[]
  }}));
  assert.match(foreign, /Authenticated WMS source data are not loaded/);
});

test("dashboard only renders WMS evidence with authorised employee snapshot", () => {
  const dash=source("components/dashboard.tsx");
  const workspace=source("components/employee-distribution-workspace.tsx");
  const chart=source("components/wms-recorded-evidence-studio.tsx");
  const css=source("app/employee-distribution.css");
  assert.match(dash, /snapshot=\{user && snapshot \? snapshot : null\}/);
  assert.match(workspace, /<WmsRecordedEvidenceStudio snapshot=\{snapshot \?\? null\} \/>/);
  assert.match(chart, /snapshot\.module\.code !== "employee\.warehouse"/);
  assert.match(chart, /aria-pressed=\{priority === choice\}/);
  assert.match(chart, /type="search"/);
  assert.doesNotMatch(chart, /localStorage\.(?:getItem|setItem)|sessionStorage\.|fetch\(|protectedMutation\(|reserveStock\(/);
  assert.match(css, /\.distribution-wms-evidence-bar-row/);
  assert.match(css, /@media\(max-width:650px\)/);
});
