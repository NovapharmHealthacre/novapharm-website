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

## Stop conditions

Disable the affected capability if testing identifies a medical recommendation, unsupported regulatory or availability claim, private-source retrieval, role bypass, executable output, citation mismatch, public model prefetch, secret disclosure or critical accessibility barrier.
