import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WmsCapacityScenarioStudio } from "../components/wms-capacity-scenario-studio";
import { WmsRecordedEvidenceStudio } from "../components/wms-recorded-evidence-studio";

test("WMS scenario makes non-live provenance clear and exposes accessible chart data", () => {
  const html = renderToStaticMarkup(React.createElement(WmsCapacityScenarioStudio));
  assert.match(html, /what-if exercise/);
  assert.match(html, /not live stock, shift or labour records/);
  assert.match(html, /distribution-wms-capacity-zone-chart/);
  assert.match(html, /View exact zone values in a table/);
  assert.match(html, /<caption>Scenario demand by warehouse zone<\/caption>/);
  assert.match(html, /<th scope="row">Zone A<\/th>/);
  assert.match(html, /Reset assumptions/);
  assert.doesNotMatch(html, /Undo reset/);
});

test("WMS recorded source sizes expose exact values and unavailable sources without inventing live stock", () => {
  const html = renderToStaticMarkup(React.createElement(WmsRecordedEvidenceStudio, { snapshot: {
    module: { code: "employee.warehouse" },
    dataState: "canonical",
    dataFreshness: "2026-11-16T09:00:00Z",
    sections: [
      { title: "Inventory ledger", rows: [{ sku: "SKU-1" }, { sku: "SKU-2" }] },
      { title: "Quality and recall observations", rows: [] },
    ],
  } }));
  assert.match(html, /View exact source sample counts in a table/);
  assert.match(html, /<caption>Authorised application sample counts, recorded/);
  assert.match(html, /<th scope="row">Inventory<\/th>/);
  assert.match(html, /Source unavailable/);
  assert.match(html, /No independently authenticated Polar Speed\/UPS/);
});
