import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WmsPilotFeedbackPanel } from "../components/wms-pilot-feedback-panel";
import { WMS_PROTOTYPE_WORKSPACE_MAP } from "../components/wms-prototype-workspace-map";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
test("private pilot UI includes all 16 prototype workspaces and a locked initial state", () => {
  const html = renderToStaticMarkup(createElement(WmsPilotFeedbackPanel));
  assert.match(html, /Test\. Record\. Improve\./);
  assert.match(html, /Private pilot not activated for this account/);
  assert.doesNotMatch(html, /Checking private pilot access/);
  assert.match(html, /no patients|patient information/i);
  assert.match(html, /This is software testing feedback/);
  assert.equal(WMS_PROTOTYPE_WORKSPACE_MAP.length, 16);
  for (const item of WMS_PROTOTYPE_WORKSPACE_MAP)
    assert.ok(item.title.length > 3);
});

test("pilot UI remains server-session gated, makes no warehouse mutations", () => {
  const page = read("components/employee-distribution-workspace.tsx");
  const form = read("components/wms-pilot-feedback-panel.tsx");
  const server = read("app/[[...slug]]/page.tsx");
  const css = read("app/employee-distribution.css");
  assert.match(page, /if \(moduleCode === "employee\.warehouse"\)/);
  assert.match(page, /<WmsPilotFeedbackPanel \/>/);
  assert.match(server, /verifiedPortalSession/);
  assert.match(form, /protectedMutation/);
  assert.match(form, /NEXT_PUBLIC_WMS_PILOT_UI_ENABLED/);
  assert.match(form, /if \(!pilotUiEnabled\) return/);
  assert.match(form, /response\.canViewAdminSummary === true/);
  assert.match(form, /enterprise\/wms\/pilot-feedback/);
  assert.doesNotMatch(form, /localStorage|sessionStorage|warehouseTasksCreated|reserveStock\(|dispatchShipment\(/);
  assert.match(css, /\.distribution-wms-pilot/);
  assert.match(css, /@media\(max-width:850px\)/);
});
