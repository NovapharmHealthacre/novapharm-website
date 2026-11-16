import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WmsCapacityScenarioStudio } from "../components/wms-capacity-scenario-studio";

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
