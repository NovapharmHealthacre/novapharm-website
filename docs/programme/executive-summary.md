# Unified Digital Estate Executive Summary

Status: repository candidate materially implemented; production incomplete
Review date: 7 August 2026
Branch: `codex/unified-digital-estate-foundation`
Review vehicle: Draft PR 16

## Outcome

NovaPharm now has one governed TypeScript-first workspace for Corporate, NovaPharm Infotech, the Vishal Chakravarty founder property, the secure portal, the application API and the sanitised status service. Shared packages govern deployment mode, identity, claims, content, forms, SEO, accessibility, security, design and all 54 portal modules.

The repository contains the paid Azure target for six isolated App Services, Azure Front Door Premium/WAF, Azure SQL, private Blob storage, separate Key Vault boundaries, managed identities, candidate resources and observability. It also packages each application independently and validates the compiled infrastructure contract.

## Honest status

| Dimension | Status |
|---|---|
| Source architecture | Complete at repository level |
| Public application migrations | Complete at repository level; production cutover not performed |
| Design system and creative-direction evidence | Complete at repository level |
| Portal modules | 47 informational/read-only; seven hidden; none claimed operational in production |
| Azure edge and managed services | Implemented as IaC; owner-controlled deployment pending |
| Entra, Graph and SharePoint | Application/integration contracts exist; tenant activation and permission evidence pending |
| Search eligibility | Code and content eligibility implemented; Search Console, Bing, IndexNow and crawler production evidence pending |
| Regulatory evidence | Dr Nishita RP appointment and certificate-specific Polar Speed statements remain evidence-gated |
| Security governance | CodeQL source workflow added; live WAF/MFA/PIM/malware/alerts, branch rules and independent penetration testing pending |
| Production | Not complete |

## Release decision

Draft PR 16 must remain unmerged and undeployed until its final head passes clean-checkout checks and owner review. Even after repository acceptance, Azure provisioning, tenant consent, live integrations, penetration testing, DNS cutover and AAH-class network retesting remain distinct production gates.

## Canonical evidence

- Current state: `docs/programme/current-state-audit.md`.
- Architecture: `docs/programme/architecture-decision-record.md`.
- Edge: `docs/programme/azure-front-door-edge-architecture.md`.
- Design: `docs/programme/design-system.md` and `docs/programme/creative-directions.md`.
- Portal: `docs/programme/portal-module-maturity-register.md`.
- Complete traceability: `docs/programme/requirements/requirements-matrix.json`.
- External gates: `final-report/remaining-owner-actions.md` and `docs/programme/security-governance-gates.md`.
