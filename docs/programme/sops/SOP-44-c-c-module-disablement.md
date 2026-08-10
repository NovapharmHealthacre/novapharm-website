# SOP-44 — C/C++ Module Disablement

Execution status: **NOT_APPLICABLE_UNTIL_LANGUAGE_ACTIVATED**

## Owner
Native Kernel Owner

## Purpose
Disable a future C/C++ performance kernel safely and remove it when it no longer materially outperforms the simpler accepted implementation.

## Trigger
Only after a C/C++ kernel has passed the mandate's measurable performance/security gate; trigger on crash, memory-safety, ABI, correctness, security or performance regression.

## Prerequisites
1. Accepted kernel purpose/benchmark and compiler/toolchain provenance.
2. Deterministic input/output contract and parity-tested simpler fallback.
3. Governed build/runtime disable path.

## Permissions
- Native Kernel Owner may disable the kernel. C/C++ must not own authentication, authorization, secrets or custom cryptography.

## Steps
1. If no C/C++ kernel is activated, STOP: this SOP is not applicable and no theatrical native code is required.
2. When active, identify kernel/version/build checksum/toolchain and affected workload.
3. Disable the native path and route work to the accepted simpler implementation.
4. Verify output parity/correctness before processing new work.
5. Preserve crash/security evidence without executing untrusted artifacts.
6. Run memory-safety/static/dynamic checks as applicable and re-benchmark against the fallback.
7. Reactivate only if correctness/security pass and the performance advantage remains material; otherwise remove the kernel.

## Evidence
Kernel version/checksum/toolchain, trigger/crash evidence, disable config, parity/security/performance results and reactivation/removal decision.

## Stop Conditions
Fallback cannot preserve correctness; kernel handles crypto/authz/secrets; provenance unknown; disabling silently changes regulated output.

A STOP condition keeps the affected feature closed until a safe fallback exists.

## Escalation
Native Kernel Owner, Domain Owner and Security Lead.

## Rollback
Keep the native kernel disabled; use the accepted fallback or fail closed.

## Recovery
Correct implementation, rerun parity/security/benchmark gates and reactivate only if the kernel still earns its place.

## Review Cadence
Not applicable until C/C++ earns activation; rehearse before first activation and after compiler/ABI changes.

### Authorities
- `docs/programme/architecture-decision-record.md`
- `docs/programme/security-governance-gates.md`
- mandate Sections 12–16

Repository procedure existence does **not** justify adding C/C++.
