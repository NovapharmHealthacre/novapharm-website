# NovaPharm Distribution — authenticated evidence studio

**Stage:** read-only WMS control-tower interface expansion, 15 November 2026.  
**Depends on:** owner-supplied NovaPharm Distribution WMS prototype v4.1, with 16-workspace mapping in PR #679.

## What this release adds

An operational evidence section within the existing role-protected `employee.warehouse` route.

- It receives the **existing authorised enterprise-module snapshot** after employee login, access-scope verification and server-side query permission. It adds no new API endpoint, tenant lookup, cookie, data store or permission bypass.
- Seven recent source samples have labelled relative-size bars: inventory, receipts, quality, returns, shipments, integration records and commercial orders.
- Four evidence cards explicitly distinguish observed source coverage, bounded row samples, unknown physical ATP and unreconciled/synthetic state.
- A read-only exception table uses the merged PR #678 worklist and has functional **All / High / Standard** filters plus an in-browser search of the already authorised bounded rows.
- Missing source: shows **N/A** instead of zero. Empty recorded source: shows 0 sample records but does not claim that the network is clear. The total is only the sum of displayed samples and may duplicate records.
- Every bar compares records within the visible sample. There are no invented units, OTIF rates, cost totals, margin, utilisation, fake demand forecasts, physical warehouse positions or 3PL stock balances.
- Responsive CSS, keyboard focus, textual chart descriptions, small-screen horizontal table navigation and reduced-motion handling. No decorative icons or emojis.

## What is **not** activated

This release does not write stock, allow SKU allocation, establish 3PL physical inventory, alter quality/recalled stock, create a purchase order, dispatch shipments, email customers, export sensitive records, charge customers or train/predict with unvalidated data. The reviewed standalone prototype's browser-local actions are not copied into production.

## Integration lineage

`apps/portal/components/dashboard.tsx` fetches `enterprise/modules/employee.warehouse` using the current secured gateway and checks the employee access-scope. The same secured snapshot is passed to `EmployeeDistributionWorkspace`, and then to `WmsRecordedEvidenceStudio`.

The raw source remains `src/core/enterprise-module-overlays.mjs` with bounded existing ledger and QMS/commerce data; the end-user UI explicitly identifies them as unreconciled observations. Any future live warehouse feed must independently satisfy the provider contract, tenancy/site ownership, immutable source evidence, duplicate handling, QMS and order-release gates.

## Acceptance and rollout

- Run portal lint, TypeScript, tests, Next build and protected role/route browser suite.
- Ensure there is **no false live provider claim** when zero source rows appear or when the snapshot is synthetic.
- Deploy through the independently accepted unified employee portal workflow only. The public domain still routes to a separate Nutraxin staging backend pending issue #601.
- Obtain provider-approved Polar Speed/UPS integration schema and authentication before enabling actual stock reservation, warehouse execution, carrier POD, invoicing or AI-backed capacity planning (issue #664).

**Additional paid infrastructure:** none.
