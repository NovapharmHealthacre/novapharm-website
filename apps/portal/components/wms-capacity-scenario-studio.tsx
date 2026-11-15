"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_WMS_CAPACITY_SCENARIO,
  evaluateWmsCapacityScenario,
  type WmsCapacityScenarioInput,
} from "../lib/wms-capacity-scenario";

const fields = [
  { key: "orderLines", label: "Order lines per shift", min: 0, max: 1000000 },
  { key: "teamMembers", label: "Team members", min: 1, max: 500 },
  { key: "linesPerHourPerPerson", label: "Lines per person / hour", min: 1, max: 200 },
  { key: "shiftHours", label: "Shift hours", min: 1, max: 24 },
  { key: "equipmentAvailabilityPercent", label: "Equipment availability (%)", min: 10, max: 100 },
  { key: "variabilityBufferPercent", label: "Variability buffer (%)", min: 0, max: 50 },
  { key: "zoneAWeight", label: "Zone A load weight", min: 0, max: 100 },
  { key: "zoneBWeight", label: "Zone B load weight", min: 0, max: 100 },
  { key: "zoneCWeight", label: "Zone C load weight", min: 0, max: 100 },
] as const;

export function WmsCapacityScenarioStudio() {
  const [values, setValues] = useState<WmsCapacityScenarioInput>(DEFAULT_WMS_CAPACITY_SCENARIO);
  const result = useMemo(() => evaluateWmsCapacityScenario(values), [values]);
  const update = (key: keyof WmsCapacityScenarioInput, next: string) => {
    const n = Number(next);
    setValues((old) => ({ ...old, [key]: next.trim() === "" ? NaN : n }));
  };

  return <section className="distribution-wms-capacity-studio" aria-labelledby="wms-capacity-title">
    <div className="distribution-wms-capacity-heading">
      <p className="distribution-employee-overline">NOVAPHARM DISTRIBUTION / RESOURCE PLANNING</p>
      <h2 id="wms-capacity-title">Model the workload before the shift.</h2>
      <p>Change the assumptions to examine staffing and zone pressure. This is a mathematical
        what-if exercise—not an AI forecast, live warehouse schedule or automated task allocation.</p>
    </div>
    <div className="distribution-wms-capacity-body">
      <div className="distribution-wms-capacity-inputs">
        <h3>Scenario assumptions</h3>
        <div className="distribution-wms-capacity-fields">
          {fields.map(({key,label,min,max}) =>
            <label key={key}>{label}
              <input type="number" min={min} max={max} step={1}
                value={Number.isFinite(values[key]) ? values[key] : ""}
                onChange={(event) => update(key,event.target.value)}/>
            </label>)}
        </div>
        <button type="button" className="distribution-wms-capacity-reset"
          onClick={() => setValues(DEFAULT_WMS_CAPACITY_SCENARIO)}>
          Reset assumptions
        </button>
      </div>
      <div className="distribution-wms-capacity-output" aria-live="polite">
        <h3>Scenario output</h3>
        {result.status === "invalid_inputs" ? <p role="status">{result.reason}</p> : <>
          <div className="distribution-wms-capacity-metrics">
            <div><span>Buffered demand</span><strong>{result.bufferedDemandLines?.toLocaleString()}</strong><small>Hypothetical lines</small></div>
            <div><span>Estimated capacity</span><strong>{result.effectiveCapacityLines?.toLocaleString()}</strong><small>Hypothetical lines</small></div>
            <div><span>Required people</span><strong>{result.requiredMembers}</strong><small>Scenario only</small></div>
            <div><span>Additional people</span><strong>{result.additionalMembers}</strong><small>Above entered team</small></div>
          </div>
          <div className="distribution-wms-capacity-utilisation">
            <div><strong>Modelled utilisation</strong><strong>{result.utilisationPercent}%</strong></div>
            <div className="distribution-wms-capacity-meter" aria-hidden="true"><span
              style={{width: `${Math.min(100,result.utilisationPercent ?? 0)}%`}}/></div>
            <p>{result.pressure === "capacity_gap"
              ? "Scenario demand exceeds assumed shift capacity."
              : result.pressure === "elevated"
                ? "Scenario workload is close to the assumed capacity ceiling."
                : "Scenario capacity exceeds the modelled workload."}</p>
          </div>
          <h4>Illustrative zone load</h4>
          <div className="distribution-wms-capacity-zones">
            {result.zones.map((zone) => <div key={zone.zone}>
              <strong>{zone.zone}</strong>
              <span>{zone.hypotheticalLines.toLocaleString()} lines</span>
            </div>)}
          </div>
          <p className="distribution-wms-capacity-disclaimer">{result.reason}
            Actual labour, automation, slotting, task release and product availability remain
            subject to provider data, legal scope and operational approval.</p>
        </>}
      </div>
    </div>
  </section>;
}
