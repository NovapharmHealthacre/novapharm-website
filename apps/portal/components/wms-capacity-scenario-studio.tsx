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
  const [priorToReset, setPriorToReset] = useState<WmsCapacityScenarioInput | null>(null);
  const result = useMemo(() => evaluateWmsCapacityScenario(values), [values]);
  const zoneMax = result.status === "invalid_inputs" ? 0 : Math.max(0, ...result.zones.map((zone) => zone.hypotheticalLines));
  const update = (key: keyof WmsCapacityScenarioInput, next: string) => {
    const n = Number(next);
    setValues((old) => ({ ...old, [key]: next.trim() === "" ? NaN : n }));
    setPriorToReset(null);
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
        <div className="distribution-wms-capacity-reset-actions">
          <button type="button" className="distribution-wms-capacity-reset"
            onClick={() => { setPriorToReset(values); setValues(DEFAULT_WMS_CAPACITY_SCENARIO); }}>
            Reset assumptions
          </button>
          {priorToReset ? <button type="button" className="distribution-wms-capacity-undo"
            onClick={() => { setValues(priorToReset); setPriorToReset(null); }}>
            Undo reset
          </button> : null}
        </div>
      </div>
      <div className="distribution-wms-capacity-output" aria-live="polite">
        <h3>Scenario output</h3>
        {result.status === "invalid_inputs" ? <p role="status">{result.reason}</p> : <>
          <div className="distribution-wms-capacity-metrics">
            <div><span>Buffered demand</span><strong>{result.bufferedDemandLines?.toLocaleString("en-GB")}</strong><small>Hypothetical lines</small></div>
            <div><span>Estimated capacity</span><strong>{result.effectiveCapacityLines?.toLocaleString("en-GB")}</strong><small>Hypothetical lines</small></div>
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
          <figure className="distribution-wms-capacity-zone-chart" aria-labelledby="wms-capacity-zone-title" aria-describedby="wms-capacity-zone-summary">
            <figcaption>
              <h4 id="wms-capacity-zone-title">Illustrative zone load</h4>
              <p id="wms-capacity-zone-summary">Relative zone demand under the current assumptions. This chart contains hypothetical values, not live stock, shift or labour records.</p>
            </figcaption>
            <div className="distribution-wms-capacity-zone-bars">
              {result.zones.map((zone) => <div key={zone.zone} className="distribution-wms-capacity-zone-row">
                <strong>{zone.zone}</strong>
                <span className="distribution-wms-capacity-zone-track" aria-hidden="true">
                  <span style={{ width: `${zoneMax > 0 ? Math.min(100, (zone.hypotheticalLines / zoneMax) * 100) : 0}%` }} />
                </span>
                <span className="distribution-wms-capacity-zone-value">{zone.hypotheticalLines.toLocaleString("en-GB")} lines</span>
              </div>)}
            </div>
            <details className="distribution-wms-capacity-zone-data">
              <summary>View exact zone values in a table</summary>
              <table>
                <caption>Scenario demand by warehouse zone</caption>
                <thead><tr><th scope="col">Zone</th><th scope="col">Hypothetical lines</th></tr></thead>
                <tbody>{result.zones.map((zone) => <tr key={zone.zone}><th scope="row">{zone.zone}</th><td>{zone.hypotheticalLines.toLocaleString("en-GB")}</td></tr>)}</tbody>
              </table>
            </details>
          </figure>
          <p className="distribution-wms-capacity-disclaimer">{result.reason}
            Actual labour, automation, slotting, task release and product availability remain
            subject to provider data, legal scope and operational approval.</p>
        </>}
      </div>
    </div>
  </section>;
}
