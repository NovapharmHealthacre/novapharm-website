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
An independent zero-dependency Bell-state reference is available at `scripts/research/quantum-bell-reference.py`, which performs explicit H and controlled-NOT state-vector transformations, seeded finite-shot sampling and Wilson 95% intervals on an ideal two-qubit circuit. Five standard-library local safety and mathematical tests passed; for 512 shots, seed 42, the observed local counts were 257 for 00, 255 for 11, and zero for 01/10. This is **classical simulation only**, not external scientific replication or physical hardware verification. Run `python3 scripts/research/test-quantum-bell-reference.py -v`.

The optional Cirq runner does not install packages, use external APIs, download data or produce a signed receipt. `Cirq` must be separately installed and approved. An ideal two-qubit Bell circuit is a smoke test, **not** a molecular simulation or quantum advantage.

## H2 scientific pilot — fail-closed offline source candidate; no chemistry run yet
Record H2 geometry, multiplicity, charge, basis, source integrals and version-pinned PySCF or equivalent; use OpenFermion Jordan–Wigner mapping, classical exact-diagonalization reference and documented VQE/Cirq state preparation. Compare total energies with matching conventions and nuclear repulsion, precision, errors and noise; independently replicate. The first optional H2 source runner now exists at `scripts/research/quantum-h2-benchmark.py`; five offline preflight/denial tests pass locally, but the model computation has **not run** because PySCF, OpenFermion and OpenFermion-PySCF are not installed. It defaults to preflight only; execution additionally requires `--execute --confirm-local-only`. The fixed public H2 geometry is 0.7414 Å, STO-3G, charge 0, singlet, two electrons, four spin orbitals. A successful future run must match restricted-sector Jordan–Wigner exact diagonalization against PySCF FCI within 1e-6 Hartree and report total energy including nuclear repulsion, HF reference, package versions, input configuration and source hash. It stores intermediate files only in a temporary directory and produces no quantum-hardware result.

Offline safety tests: `python3 scripts/research/test-quantum-h2-benchmark.py -v`. Plain preflight: `python3 scripts/research/quantum-h2-benchmark.py`. A separate approved, dependency-locked and network-isolated environment is required before execution, rights/compatibility review, repeatability and scientific acceptance. VQE, noise and hardware benchmarks remain unimplemented.

## Noise and calibration research — synthetic, not a device calibration
The first-party standard-library `scripts/research/quantum-noise-reference.py` models an **independent classical bit-flip readout error** on each of two Bell-state bits with per-bit probability p in [0, 0.2]; it does not simulate a full physical quantum processor. For this ideal Bell source, predicted P(01)=P(10)=p(1-p) and P(00)=P(11)=[(1-p)²+p²]/2. This is a **synthetic sensitivity/verification exercise only**, with no gates/coherence errors, error correction, measured calibration drift or hardware claims. Finite-shot count discrepancies are sampling noise, not proof of device reliability.

Run `python3 scripts/research/test-quantum-noise-reference.py -v` (five offline safety and analytical tests locally passed) or `python3 scripts/research/quantum-noise-reference.py --shots 1000 --seed 42 --readout-error 0.1`. The latter local smoke produced 00=398, 01=92, 10=97, 11=413, observed disagreement 18.9%, analytic expectation 18%. That is a single seeded synthetic sample, not a scientific effect size or experimental processor characterization.

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
