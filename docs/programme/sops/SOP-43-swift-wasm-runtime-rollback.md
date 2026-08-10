# SOP-43 — Swift/Wasm Runtime Rollback

Execution status: **NOT_APPLICABLE_UNTIL_LANGUAGE_ACTIVATED**

## Owner
Portal Runtime Owner

## Purpose
Disable or roll back a future Swift/Wasm enhancement without affecting server-side authorization and while preserving an accepted simpler fallback.

## Trigger
Only after a Swift/Wasm workload has passed the mandate's measurable performance/security gate; trigger on runtime, load, correctness, security or performance regression.

## Prerequisites
1. Accepted Swift/Wasm module manifest, benchmark and provenance/checksum.
2. TypeScript/platform fallback with parity tests.
3. Governed feature/runtime kill switch that has no authorization authority.

## Permissions
- Portal Runtime Owner may disable the client enhancement. Swift/Wasm never receives identity/authorization authority.

## Steps
1. If no Swift/Wasm workload is activated, STOP: this SOP is not applicable and no dummy module is required.
2. When active, identify module/version/checksum and triggering metric/error.
3. Disable the Wasm enhancement through governed configuration; do not change server authorization.
4. Verify the accepted fallback preserves the same business behavior and user truth.
5. Keep CSP/security controls intact; never fix Wasm loading by weakening policy globally.
6. Run Portal role/customer-isolation, accessibility, browser and performance acceptance on the fallback.
7. Record root cause and re-benchmark/review before any reactivation.

## Evidence
Module/version/checksum, benchmark baseline, trigger evidence, kill-switch/config change, fallback tests, exact SHA and reactivation/removal decision.

## Stop Conditions
Fallback absent or semantically different; Wasm participates in authorization; provenance unknown; proposed fix weakens CSP/security; regulated output changes.

A STOP condition keeps Swift/Wasm disabled.

## Escalation
Portal Runtime Owner and Security Lead.

## Rollback
Keep the Swift/Wasm feature disabled and serve the accepted simpler implementation.

## Recovery
Fix/rebuild with pinned tooling, rerun parity/security/browser/performance gates and reactivate only if the workload still earns its place.

## Review Cadence
Not applicable until Swift/Wasm earns activation; rehearse before first activation and after runtime/toolchain changes.

### Authorities
- `docs/programme/architecture-decision-record.md`
- `docs/programme/security-governance-gates.md`
- mandate Sections 6–11

Repository procedure existence does **not** justify adding Swift/Wasm.
