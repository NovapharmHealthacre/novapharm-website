# NovaPharm Distribution — resource and slotting scenario studio

**Stage:** 15 November 2026, first-party employee WMS planning tool.  
**Source direction:** The reviewed NovaPharm Distribution Enterprise WMS prototype v4.1 and global warehouse-management product principles.

## Functionality implemented

The existing role-controlled `employee.warehouse` page receives an interactive scenario workbench below the read-only operational evidence studio. Nine editable scenario assumptions determine projected shift demand, effective picking capacity, implied headcount and illustrative zone load:

- Order lines in a shift.
- Number of staff (scenario, not real staff).
- Lines handled per staff member per hour.
- Shift length and assumed equipment availability.
- Variability buffer to account for disruption/uncertainty.
- Relative Zone A/B/C activity weights.

The deterministic model uses the following assumptions:

```
planned_lines = order_lines * (1 + buffer_percent / 100)
capacity_lines = staff * lines_per_hour * shift_hours * equipment_availability_percent / 100
required_staff = ceil(planned_lines / (lines_per_hour * shift_hours * availability_percent / 100))
utilisation = round(100 * planned_lines / capacity_lines)
```

Zone loads are derived from user-entered weights, not physical bin addresses. The displayed priority and staffing gap are **what-if** outputs only. Changes recalculate immediately and reset is functional. Inputs are bounded, invalid values display an explanation, and the view supports keyboard focus and small screens.

## Grounding in industry principles

This implements the *scenario review* pattern—not the proprietary execution methods—described by:
- [Blue Yonder WMS](https://blueyonder.com/solutions/warehouse-management): resource forecasting, orchestration and advanced slotting.
- [SAP EWM features](https://www.sap.com/india/products/scm/extended-warehouse-management/features.html): labour structures, wave processing and batch/yard operations.
- [Manhattan Active WM](https://www.manh.com/en-in/our-solutions/supply-chain-management-software/warehouse-management-system): distribution control, people/equipment visibility and workflow optimisation.
- [Infor WMS](https://docs.infor.com/lncs/2025.x/en-us/lncslib/lncspov/wzu1564481459702.html): labour, task/wave and 3PL management.

## Release and authority boundaries

- Not ML, not an AI agent, not a validated demand forecast, not a digital twin, not actual wave/slotting optimisation.
- No network calls, browser storage, new paid API, altered customer pricing or stock data.
- No real labour assignments, WES/WCS/robot control, rack moves, slotting instructions, wave release, carrier bookings or QMS action.
- User-entered assumption inputs are never persisted, so reopening the page resets to the documented safe reference scenario.
- Independent provider stock and workforce telemetry, time studies, permissioned service contracts and an accepted AWS employee portal runtime are needed before the projected numbers can be regarded as operational KPIs.

## Tests

`apps/portal/test/wms-capacity-scenario.test.ts` verifies the reference case, staffing gap, zero demand, invalid inputs, server-rendered labels and strict absence of execution/storage access. Existing production readiness, CodeQL, Biome, TypeScript and Chromium/WebKit portal checks remain required.

This branch is stacked on PR #680 (authorised recorded-evidence dashboard). Merge #680 first; then rebase and validate this feature independently.
