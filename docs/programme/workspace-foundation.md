# Unified Workspace Foundation

Status: implemented and tested; application migration in progress
Date: 30 July 2026
Owner: NovaPharm digital-estate programme

## Purpose

This foundation establishes the shared contracts that all NovaPharm applications must consume during the migration from independently maintained sites to one governed TypeScript workspace. It does not claim that the legacy public applications have already been replaced.

## Toolchain

| Control | Implemented value | Validation |
|---|---|---|
| Runtime | Node.js 24.x | Repository engine and CI runtime |
| Workspace manager | pnpm 11.9.x | `pnpm-lock.yaml` and supply-chain policy check |
| Task orchestration | Turborepo 2.10.7 | 18 package tasks run successfully |
| Language | TypeScript 7.0.2 in strict, no-emit mode | Workspace and package type checks |
| Legacy-release compatibility | npm lock retained temporarily | Existing Pages and backend workflows continue to use `npm ci` during the strangler migration |

The temporary npm lock is deliberate. The existing GitHub Pages and Node release workflows remain reproducible while applications are migrated. It must be removed, together with npm-specific workflow steps, before the ADR acceptance condition of one estate lockfile can be marked complete.

## Shared packages

| Package | Authority |
|---|---|
| `@novapharm/platform-mode` | Public-only, full-platform, maintenance and incident capability boundaries |
| `@novapharm/config` | Exact HTTPS origins and isolated public, portal, API and status trust boundaries |
| `@novapharm/content` | Legal organisation identity, leadership identity, titles, governance facts and evidence state |
| `@novapharm/claims` | Operational maturity, evidence, publication approval and review-expiry gates |
| `@novapharm/auth` | Customer, employee, board and administrator scopes plus customer-resource isolation |
| `@novapharm/forms` | Normalised B2B contact contract, safety/privacy acknowledgements and bot-field handling |
| `@novapharm/seo` | Canonical organisation, website and person entity graph linked through persistent identifiers |
| `@novapharm/design-system` | Shared brand tokens, interaction dimensions, reduced-motion output and distinct property direction |
| `@novapharm/accessibility` | WCAG 2.2 AA target, required viewport matrix and mandatory manual evidence controls |

## Fail-closed decisions

- A current operational statement cannot publish without verified evidence.
- A current regulated statement also requires a public or controlled evidence reference.
- Planned, in-development, subject-to-authorisation and non-operational statements must say that status visibly.
- The requested Responsible Person title remains held until appointment evidence is approved.
- An administrator receives all four application scopes, but scope does not bypass customer-record isolation.
- Full-platform mode requires distinct portal and API origins. Wildcards, shared origins and insecure production origins are rejected.
- Public-only builds cannot emit password, upload, application or server-dependent workflow controls.

## Canonical identity decisions

- Public company name: `NovaPharm Healthcare`.
- Legal company name: `NOVAPHARM HEALTHCARE LTD`.
- Company number: `16716501`.
- Public operating state: the company and commercial-development programme are active; regulated wholesale supply has not commenced and remains subject to the required authorisation and release controls.
- Vishal Chakravarty: `Chief Executive Officer`; founder and statutory-director facts remain separate.
- Dr Nishita Trivedi: `Chief Technology Officer and Responsible Person`; the executive role and regulated appointment are distinct, she is not a statutory director, and formal appointment documentation remains pending in the controlled evidence register.

## Tests executed

The initial foundation passed:

- strict workspace type checking;
- 25 direct contract tests;
- 18 Turborepo package tasks across nine packages;
- production dependency audit;
- complete dependency audit.

No known dependency vulnerability remained after upgrading Azure Monitor OpenTelemetry and Sharp and applying consistent parser overrides.

## Migration boundary

The next application stages must import these packages instead of copying their values. Until each application is migrated, its existing generator or framework remains a compatibility implementation and its output must continue to pass the public-only boundary test.

This file is evidence of foundation completion only. Azure deployment, Entra activation, live forms, protected portals, database migration, SharePoint permissions, DNS and production cutover remain separate acceptance gates.
