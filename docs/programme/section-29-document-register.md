# Section 29 Documentation Register

Status: repository documentation set reconciled
Review date: 1 August 2026

All links are repository-relative. `Complete` means the document itself is reviewable; it does not convert an explicitly pending production or owner gate into completion.

| Required document | Canonical repository evidence | Document status |
|---|---|---|
| Executive summary | [executive-summary.md](./executive-summary.md) | Complete |
| Current-state audit | [current-state-audit.md](./current-state-audit.md) | Complete; updated by programme checkpoints |
| Target architecture | [architecture-decision-record.md](./architecture-decision-record.md), [master-data-model.md](../../architecture/master-data-model.md), [azure-front-door-edge-architecture.md](./azure-front-door-edge-architecture.md) | Complete at repository level |
| Migration plan | [migration-strategy.md](./migration-strategy.md), [database-migration-plan.md](../../database/database-migration-plan.md) | Complete; execution externally gated |
| Rollback plan | [rollback-plan.md](../../deployment/rollback-plan.md) | Complete; managed drill pending |
| Design system | [design-system.md](./design-system.md), [creative-directions.md](./creative-directions.md) | Complete at repository level |
| Brand governance | [brand-governance.md](./brand-governance.md), [official-logo-register.md](../../final-report/official-logo-register.md) | Complete |
| Content model | [content-model.md](./content-model.md) | Complete |
| Claims register | [business-plan-claim-register.json](../business-plan-claim-register.json), [public-content-evidence-register.json](../public-content-evidence-register.json), `packages/claims/src/index.ts` | Complete at repository level; evidence gates remain |
| Regulatory publication rules | [regulatory-publication-rules.md](./regulatory-publication-rules.md) | Complete |
| Integration register | [integration-register.md](./integration-register.md) | Complete; live connections pending |
| Data-flow map | [data-flow-diagrams.md](../../architecture/data-flow-diagrams.md), [system-relationships.md](../../architecture/system-relationships.md) | Complete at repository level |
| Threat model | [threat-model.md](./threat-model.md) | Complete; independent test pending |
| Security controls | [security-governance-gates.md](./security-governance-gates.md), [security-report.md](../../security/security-report.md), [security-test-report.md](../../security/security-test-report.md) | Complete at repository level |
| Privacy model | [privacy-data-map.md](../../compliance/privacy-data-map.md), [retention-schedule.md](../../compliance/retention-schedule.md), [cookie-register.md](../../compliance/cookie-register.md) | Complete draft; solicitor review pending |
| Accessibility conformance | [accessibility-report.md](../../audit/accessibility-report.md), [design-system.md](./design-system.md) | Tested locally; full conformance not claimed |
| Performance budgets | [performance-report.md](../../performance/performance-report.md), [core-web-vitals-report.md](../../seo/core-web-vitals-report.md) | Local evidence complete; field evidence pending |
| Domain-trust runbook | [domain-trust-runbook.md](./domain-trust-runbook.md) | Complete; production execution pending |
| AAH retest checklist | [aah-retest-checklist.md](./aah-retest-checklist.md) | Complete procedure; external retest pending |
| Operations runbook | [operations-runbook.md](./operations-runbook.md), [deployment-runbook.md](../../deployment/deployment-runbook.md) | Complete; live ownership pending |
| Incident response | [incident-response-plan.md](../../security/incident-response-plan.md) | Complete draft; owner/legal approval pending |
| Backup and recovery | [backup-and-restore-runbook.md](../../deployment/backup-and-restore-runbook.md) | Complete procedure; Azure restore pending |
| Owner actions | [remaining-owner-actions.md](../../final-report/remaining-owner-actions.md), [security-governance-gates.md](./security-governance-gates.md), [owner-evidence-request-dr-nishita-responsible-person.md](./owner-evidence-request-dr-nishita-responsible-person.md) | Complete register; actions remain open |

## Governance

Documentation links are validated with repository link checks. Reports distinguish `implemented`, `tested`, `passed`, `pending`, `owner-controlled`, `externally verified` and `legally unverified`. Local files outside the repository and screenshots without committed provenance are not accepted as final handoff evidence.
