import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WmsCapacityScenarioStudio } from "../components/wms-capacity-scenario-studio";
import {
  DEFAULT_WMS_CAPACITY_SCENARIO,
  evaluateWmsCapacityScenario,
} from "../lib/wms-capacity-scenario";

const read = (file: string) => readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), "utf8");

test("transparent reference scenario predicts load without issuing operational commands",()=>{
  const result=evaluateWmsCapacityScenario(DEFAULT_WMS_CAPACITY_SCENARIO);
  assert.equal(result.status,"hypothetical_scenario");
  assert.equal(result.bufferedDemandLines,1380);
  assert.equal(result.effectiveCapacityLines,1428);
  assert.equal(result.requiredMembers,6);
  assert.equal(result.additionalMembers,0);
  assert.equal(result.utilisationPercent,97);
  assert.equal(result.pressure,"elevated");
  assert.deepEqual(result.zones.map(x=>x.hypotheticalLines),[600,420,180]);
  for(const key of ["liveLaborConfirmed","workerAssignmentsCreated","warehouseTasksCreated",
    "providerDataUsed","aiPrediction"] as const)assert.equal(result[key],false,key);
});

test("staffing gaps, shift constraints and zero workload are deterministic",()=>{
  const overloaded=evaluateWmsCapacityScenario({
    ...DEFAULT_WMS_CAPACITY_SCENARIO,equipmentAvailabilityPercent:30,
  });
  assert.equal(overloaded.pressure,"capacity_gap");
  assert.equal(overloaded.additionalMembers,11);
  assert.equal(overloaded.utilisationPercent,274);
  const zero=evaluateWmsCapacityScenario({...DEFAULT_WMS_CAPACITY_SCENARIO,orderLines:0});
  assert.equal(zero.requiredMembers,0);
  assert.equal(zero.utilisationPercent,0);
  assert.deepEqual(zero.zones.map(x=>x.hypotheticalLines),[0,0,0]);
  assert.equal(zero.liveLaborConfirmed,false);
});

test("invalid scenarios never become trusted resource forecasts",()=>{
  const bad=[
    {teamMembers:0}, {orderLines:-1}, {shiftHours:25},
    {equipmentAvailabilityPercent:0}, {variabilityBufferPercent:51},
    {zoneAWeight:0,zoneBWeight:0,zoneCWeight:0},
    {orderLines:Number.NaN},
  ];
  for(const props of bad){
    const v=evaluateWmsCapacityScenario({...DEFAULT_WMS_CAPACITY_SCENARIO,...props});
    assert.equal(v.status,"invalid_inputs");
    assert.equal(v.effectiveCapacityLines,null);
    assert.equal(v.aiPrediction,false);
    assert.equal(v.warehouseTasksCreated,false);
  }
});

test("capacity UI is usable and explicitly labelled hypothetical",()=>{
  const html=renderToStaticMarkup(createElement(WmsCapacityScenarioStudio));
  assert.match(html,/Model the workload before the shift/);
  assert.match(html,/not an AI forecast, live warehouse schedule/);
  assert.match(html,/Scenario assumptions/);
  assert.match(html,/Reset assumptions/);
  assert.match(html,/Required people/);
  assert.match(html,/Additional people/);
  assert.match(html,/Zone A/);
  assert.match(html,/Zone B/);
  assert.match(html,/Zone C/);
  assert.match(html,/97%/);
  assert.doesNotMatch(html,/Create wave|Release wave|Assign workers|Dispatch shipment/);
});

test("scenario stays in the governed employee warehouse page only",()=>{
  const app=read("components/employee-distribution-workspace.tsx");
  const studio=read("components/wms-capacity-scenario-studio.tsx");
  const css=read("app/employee-distribution.css");
  assert.match(app, /<WmsCapacityScenarioStudio \/>/);
  assert.match(app, /if \(moduleCode === "employee.warehouse"\)/);
  assert.doesNotMatch(studio,/fetch\(|localStorage|sessionStorage|XMLHttpRequest|navigator\.sendBeacon/);
  assert.match(css, /\.distribution-wms-capacity-studio/);
  assert.match(css, /@media\(max-width:940px\)/);
  assert.match(studio,/type="number"/);
  assert.match(studio,/aria-live="polite"/);
});
