# NovaPharm Intelligence — Quantum & Computational Science DNA
**19 November 2026 | Source-only research candidate | No production release authority**

## Basis and scope
Implements the research specification provided by the owner, *Quantum Computing — Deep Technical Analysis for NovaPharm Intelligence* (19 November 2026), alongside the official Google Quantum AI software pages. This does NOT copy Google's IP, require Google accounts, activate quantum hardware, integrate a paid service, ingest protected medical records or imply demonstrated pharmaceutical quantum advantage.

| Layer | Proposed technology | Current delivery |
|---|---|---|
| Problem formulation | Physics/chemistry or bounded optimization question | Design and public research catalogue |
| Molecular representation | OpenFermion + approved chemistry backend | Planned; no H2 or drug calculations claimed |
| Algorithm/resource estimation | Qualtran, fault-tolerant assumptions | Planned; no physical resource figures claimed |
| Circuit execution | Cirq | Optional offline Bell sampling script, requires separately installed local dependency |
| High-performance simulation | qsim | Planned benchmark; cannot promise workstation-scale qubits |
| Real hardware | Separately approved provider | Disabled; no keys, requests or hardware claims |
| Verification | Exact input/code digests, counts, baseline, noise, human review | Fail-closed Bell receipt shape validator and negative tests only |

## Standing design and evidence principles
1. Keep scientific problem, method, processor/simulator, measurements, and reviewed evidence distinct.
2. Distinguish state-vector simulation, noisy simulation and physical-device measurement. Never confuse quantum error correction with conventional data-validation processes.
3. Benchmark molecule/algorithm against credible classical calculations and time/memory/cost under the **same constraints**. No speedup, drug efficacy or chemical-accuracy claim from a Bell circuit.
4. Preserve immutable source/input/runner digests, geometry, units, basis, random seed, shots, optimizer, dependency versions, exact test conditions, calibration snapshot for actual hardware, error mitigation and confidence/uncertainty.
5. Quantum error correction needs separately measured physical/logical error data; none is represented by a generic software schema.
6. Scientific review must reproduce or independently challenge results; structural validity cannot sign scientific truth, licences or source data permissions.
7. Restrict CPU/memory/shots and stop on invalid input. Do not use the public website or customer-service processes as a compute runtime.
8. Human permission and source rights precede any exposure, ingest, export or commercial decision. No regulated automatic acts.

## Cross-platform integration
- **Corporate web:** a new public methodological page, explicitly research-only, no customer-facing quantum functionality.
- **Protected Intelligence web app:** extend the existing board Science Research workspace with shared metadata and read-only status.
- **Expo iOS/Android:** the same metadata is rendered in existing offline Science Research preview with platform accessibility and system appearance.
- **Standalone Swift/Kotlin:** strict display-only contracts, no network or native quantum SDK bundled. Neither prototype is a signed or distributed app.
- Canonical 22 medicine workspaces remain unchanged. All compute stays outside the web request path.
- Metadata contract: `docs/intelligence/quantum-research-program-v1.json`.
- Experiment contract: `npi.quantum-research.v1`; only bounded ideal Bell results. No scientific, clinical or production admission by structural decoding.

## Research execution
```sh
node --test scripts/test-intelligence-quantum-research.mjs
python3 scripts/research/quantum-bell-pilot.py --help
# Optional, after environment/licence/reproducibility review and pinned offline Cirq installation:
python3 scripts/research/quantum-bell-pilot.py --shots 512 --seed 42
```
The offline Python runner does not install packages, use external APIs, download data or produce a signed receipt. `Cirq` must be separately installed and approved. An ideal two-qubit Bell circuit is a smoke test, **not** a molecular simulation or quantum advantage.

## H2 scientific pilot — unimplemented next step
Record H2 geometry, multiplicity, charge, basis, source integrals and version-pinned PySCF or equivalent; use OpenFermion Jordan–Wigner mapping, classical exact-diagonalization reference and documented VQE/Cirq state preparation. Compare total energies with matching conventions and nuclear repulsion, precision, errors and noise; independently replicate. No chemistry results have been calculated by this change.

## Required production/research acceptance
- Independent review of developer licences, dependencies, data rights, commercial/AI reuse, source revocation and citations.
- Signed rights-cleared non-patient dataset/experiment provenance and independent scientific replication with negative controls.
- Source security tests, strict two-tenant identity and MFA, release-sha attestation, rollback, cost/permissions authority.
- iOS/Android signed real-device accessibility/security validation, no implicit platform SDK equivalence.
- Authorised hardware account, finite cost ceilings, calibration snapshots and separate safety approval before external quantum execution.
- No claim of simulation/research completion being equivalent to live deployment.

**Owner restrictions inherited:** `config/intelligence/owner-production-constraints.json` says zero incremental monthly spend, no new paid compute, no public customer access, no new clinical/source data admission and `productionSignoff:not_granted`. This implementation intentionally does not change those controls.

## Primary references
- https://quantumai.google/software
- https://quantumai.google/cirq
- https://quantumai.google/openfermion
- https://quantumai.google/qualtran
- https://quantumai.google/qsim
