# Oncology and AI Browser Acceptance

- Status: **PASSED**
- Evidence date: 22 July 2026
- Validated implementation head: `0d3b7c035ea8a0e584fdde649807581740cc7cfe`
- GitHub workflow: Chromium and WebKit acceptance, run 90
- Evidence artifact: `oncology-ai-browser-0d3b7c035ea8a0e584fdde649807581740cc7cfe` (artifact ID `8521128993`)
- Engines: Chromium and WebKit
- Viewports per engine: 12
- Rendered cases: 150
- Axe scans: 74
- Evidence images: 41
- Material issues: 0

The exact-head matrix exercised the Oncology page, Responsible AI governance, the no-JavaScript search directory, JavaScript-on and JavaScript-off rendering, reduced motion, cited answers, abstention, medical refusal, explicit semantic-download consent, cache clearing, browser-storage denial, retrieval unavailability and operation without WebGPU.

The six broader browser shards also completed successfully for Chromium and WebKit across desktop, tablet and mobile. Their aggregate gate initially rejected the expanded route inventory because its expected public-route count remained at 39 while the shard source of truth correctly reported 42. The candidate now derives the 2,352 expected page and Axe inspections from 42 public routes, 56 protected routes and the 24 engine/viewport executions. The final pull-request head must repeat the aggregate gate before release; its conclusion is recorded in the pull-request checks and release handoff.
