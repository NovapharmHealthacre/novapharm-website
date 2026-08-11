# NovaPharm Healthcare Digital Ecosystem

NovaPharm's unified repository contains the public Corporate, Innovation Technology, Founder and Status applications; the secure role-bound Portal; the protected API; the canonical operational contracts; and the governed infrastructure, security, recovery and release evidence for the digital estate.

## Current release truth

- **Current release state:** `R1 PUBLIC RELEASE VERIFIED`.
- GitHub Pages remains the verified public fallback while the managed Azure estate is still gated by staging, identity, data, integration, recovery and owner-approval evidence.
- Repository implementation and green CI do **not** mean managed staging or production has been accepted.
- Production slot promotion, Front Door/custom-domain activation, DNS changes and GitHub Pages retirement remain separate owner-controlled actions.

See `docs/programme/absolute-mandate-register.json`, `docs/programme/azure-unified-estate-acceptance.md` and `deployment/deployment-runbook.md` for the governed release state and activation sequence.

## Applications

The managed topology is six independently packaged applications:

1. **Corporate** — public pharmaceutical company, services, regulatory, portfolio, partnership, leadership, insights and controlled public contact/account-interest journeys.
2. **Innovation Technology** — NovaPharm's technology and systems narrative with a deliberately distinct dark technical visual language.
3. **Founder** — portrait-led founder/leadership monograph and editorial content.
4. **Status** — public service-status surface.
5. **Portal** — authenticated Customer, Employee, Executive/Board and Admin workspaces.
6. **API** — protected business workflows, data access, identity/session authority, private-document handling and governed integrations.

## Portal governance

The Portal catalogue contains **54 governed module codes**: 18 Customer, 13 Employee, 18 Executive/Board and 5 Admin.

- 47 modules currently have visible repository-authored runtime paths with explicit route, role, data/API authority, audit/monitoring and presentation contracts.
- 7 Executive modules remain deliberately **hidden for safety / dependency-gated** until their real identity, data or integration authorities exist. They are not represented by fake operational screens.
- Module presence in Git is not production activation. Managed-staging and production evidence remain separate gates.

The source authorities are `packages/portal-contracts/src/module-catalog.json`, `packages/portal-contracts/src/activation.ts`, `packages/portal-contracts/src/database-authority.ts` and the all-layer completion tests under `packages/portal-contracts/test/`.

## Data and document authority

The canonical managed-production data boundary is **Azure SQL using managed identity**, not a local SQLite disk. Node's built-in SQLite support remains useful for isolated synthetic validation, local workflow testing and legacy migration evidence; it is not the six-application Azure production database.

The canonical managed private-document boundary is **private Azure Blob storage** with environment/slot isolation, versioning/deletion protection and quarantine/release controls. Microsoft Graph/SharePoint is a separately gated integration using approved `Sites.Selected` authority; it is not a universal fallback or default source of truth for every Portal module.

See `deployment/environment-variables.md`, `deployment/backup-and-restore-runbook.md` and `docs/programme/azure-unified-estate-acceptance.md`.

## Managed Azure target

`infra/unified-estate.bicep` is the current managed-estate infrastructure contract. It defines:

- six isolated Azure App Services;
- separate public and secure compute plans;
- production-candidate slots without automatic slot promotion;
- system-assigned managed identities;
- Azure SQL with private networking and Entra-only administration;
- private Azure Blob storage;
- separate Portal/API Key Vault boundaries;
- Front Door Premium/WAF and private service connectivity;
- Application Insights / Log Analytics observability;
- GitHub OIDC, exact-SHA deployment and mandatory infrastructure `what-if` before provisioning.

The former `render.yaml`, single-node persistent-disk and SQLite production path are retained only as historical/legacy compatibility evidence. Do not use them as the current managed deployment authority.

## Managed-staging gates

The repository is prepared for managed staging but **R2 is not yet accepted**. Real external evidence is still required for, among other things:

- approved Azure subscription/region/cost and protected GitHub environments;
- authenticated Azure `what-if` and actual resource identifiers;
- Entra workforce / External ID registrations, groups, roles and MFA;
- protected Key Vault values and production-safe identity boundaries;
- Azure SQL migration, reconciliation, backup and isolated restore;
- private document malware/quarantine acceptance;
- approved email, Graph/SharePoint, CRM and logistics integrations where applicable;
- all-module managed-staging security, accessibility, performance and penetration acceptance;
- executable SOP rehearsal and recovery evidence.

No repository document should be interpreted as proof that those external gates have occurred.

## Local validation

Node 24 is required by the governed runtime and CI baseline.

The release/CI dependency authority is npm and `package-lock.json`:

```sh
npm ci --ignore-scripts
npm run check
```

The repository also retains `pnpm-lock.yaml` and `pnpm-workspace.yaml` for workspace-linking and dependency-policy controls. They are a second maintained policy surface, not an alternative production release record. Dependency changes must keep the manifest and both lock/policy representations coherent; do not update one lock in isolation.

For local development, create a local `.env` only from the governed examples and never copy managed secrets into source or shell history. Synthetic browser-validation identities and databases are isolated and removed by their harnesses.

## Quality and security gates

`npm run check` is the repository-wide production-readiness gate. The wider GitHub acceptance estate additionally includes:

- exact dependency installation and high-severity production advisory audit;
- secret, artefact, policy and requirements validation;
- TypeScript/Biome/content/build contracts;
- API/server and workflow integration tests;
- CodeQL;
- supply-chain and licence validation;
- Chromium + WebKit route/viewport coverage;
- Axe accessibility checks;
- Portal Lighthouse acceptance;
- six isolated Azure package builds and boot tests;
- public Pages artifact validation and publication verification.

Green repository gates prove the reviewed code/evidence candidate; they do not create external identity, Azure, integration, DNS or production evidence.

## Operations and recovery

Section 70 contains 44 executable SOPs under `docs/programme/sops/`. Applicable procedures include owner, trigger, prerequisites, permissions, executable steps, evidence, STOP conditions, escalation, rollback and recovery.

Rehearsal/production evidence is exact-SHA- and environment-bound by `docs/programme/sops/evidence-contract.json`; repository procedure existence can never auto-promote a release state.

Use the current operational authorities:

- `deployment/deployment-guide.md`
- `deployment/deployment-runbook.md`
- `deployment/rollback-guide.md`
- `deployment/backup-and-restore-runbook.md`
- `deployment/environment-variables.md`
- `docs/programme/sops/README.md`

## Mandate traceability

The consolidated programme governs **Sections 0 through 121 (122 numbered obligations)** plus the binding `0A`, `0B` and `3A`–`3K` amendments. The requirements matrix records 5,900 source requirements with explicit implementation/evidence states and deliberately keeps production completion false while owner/external gates remain outstanding.

The canonical programme authorities are:

- `docs/programme/absolute-mandate-register.json`
- `docs/programme/binding-mandate-amendments.json`
- `docs/programme/requirements/requirements-matrix.json`
- `docs/programme/sops/sop-register.json`

The completion standard is truthful, secure, accessible, performant, supportable, recoverable and operationally evidenced—not merely merged or visually polished.