# Trusted AI Risk Register

**Status:** implemented controls and residual-risk record
**Reviewed:** 22 July 2026
**Owners:** Technology, Information Security, Privacy, Quality and Corporate Communications

| Risk | Applies to | Implemented control | Residual risk | Required owner |
|---|---|---|---|---|
| Unsupported public answer | Public ask mode | Approved corpus only; deterministic policy before retrieval; exact passage citations; fixed abstention | A cited page may itself become outdated | Content owner and review-date governance |
| Medical or safety content | Public assistant | Deterministic refusal and controlled official routes; no generation | Novel wording may evade a simple pattern | Periodic red-team expansion; prominent public boundary |
| Prompt injection | Public and internal | Instructions are evaluated before retrieval; output is rendered with `textContent`; records cannot change policy | Obfuscated attacks may require new patterns | Information Security |
| Private-data leakage | Public assistant | Private routes and records absent from build allowlist; no external inference; no query logging | Public source may contain content published in error | Publication review and source register |
| Cross-role or cross-customer access | Internal gateway | Authenticated server route, required scopes, registered source classes, no customer use case | Future data adapters could weaken isolation | Security test on every adapter |
| Autonomous decision | Internal gateway | `productionWriteAllowed: false`; no write tools; provider `none`; human-review labels | A user could over-rely on a draft | Training, visible status and accountable owner |
| Model or licence drift | Semantic search | First-party deterministic model, revision and checksum | Future third-party model may add restrictions | Licence gate and immutable version |
| Browser storage surprise | Optional semantic search | Explicit activation, disclosed total size, cancellable download and clear-cache control | Browser eviction and storage behaviour vary | Cross-browser tests and privacy notice |
| Performance regression | Public website | AI controller dynamically imported; model/index fetched only after action; worker execution | Search activation downloads about 1.14 MB uncompressed | Budget monitoring and conventional fallback |
| Accessibility failure | Search dialog and navigator | Native modal dialog, labelled controls, status region, keyboard controls, no simulated typing | Browser and assistive-technology variation | Manual keyboard and screen-reader acceptance |
| False forecasting or traceability claim | Public content | Roadmap-only language and claims scanner | Marketing copy may regress later | Automated claim gate and evidence owner |
| Ollama exposure | Internal development | Loopback HTTP host allowlist and production rejection | Local machine compromise remains possible | Local developer security and model review |

## L0 sparse-model research addendum — 18 November 2026

This research is intentionally **not** an approved model or deployable inference route. The central model/use-case/SBOM registers identify its status and source. Time-dependent pharmaceutical feature selection must pass source-rights, leakage-safe holdouts, subgroup, drift and safety checks before any model proposal. Exact-zero weights alone do not establish interpretability, lower resource use or clinical validity.

**Additional risk — false sparse-model assurance:** Exact-zero gating and synthetic numerical acceptance do not prove model accuracy, explainability, calibrated uncertainty, lower latency, lawful source use, or production eligibility. The research remains source-only and must be reviewed by Model Risk, Quality, Security and data owners.

## Stop conditions

Disable the affected capability if testing identifies a medical recommendation, unsupported regulatory or availability claim, private-source retrieval, role bypass, executable output, citation mismatch, public model prefetch, secret disclosure or critical accessibility barrier.

## Research alignment hazards — 18 November 2026

- **Reward proxy Goodhart risk:** optimising a reported preference or forecast score can worsen independent outcomes; research detects candidate deterioration but cannot independently establish true outcome validity.
- **Critique authority confusion:** fluent critiques may be false or omit material flaws; assistant criticism must be tied to independent qualified reviewers and exact source evidence, never taken as automatic approval.
- **Instruction and prompt-injection hierarchy:** caller-supplied checklist compliance cannot waive authenticated scope, source licences, patient restrictions or security policy. Source documents are data, not instructions.
- **Simulation-to-reality transfer:** a synthetic safe policy is not a safe operational controller. No distributed self-play, unauthorised exploration, warehouse actuation or commercial/clinical decision is permitted.

Every component in this stage is research-only, with customer and production activation disabled. Model Risk, Quality, Regulatory, Privacy and Security must independently establish rights, valid holdout outcomes, reward robustness, subgroup stability, controls and a tested rollback before any new runtime or training programme. See `docs/intelligence/NOVA_AI_ALIGNMENT_RESEARCH_20261118.md`.
