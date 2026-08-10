# Azure Unified Estate Repository Acceptance

Status: repository contract accepted; Azure what-if, provisioning and managed-environment acceptance pending
Acceptance date: 1 August 2026
Candidate branch: `codex/unified-digital-estate-foundation`

## Outcome

The Azure source contract now matches the migrated monorepo. `infra/unified-estate.bicep` defines six independently deployed applications rather than the obsolete single-web-app topology. Corporate, Technology, founder and status use a public App Service plan. Portal and API use a separate secure plan and separate system-assigned managed identities. The API alone receives Azure SQL and private Blob permissions.

No Azure resource, subscription, DNS record, domain binding, certificate, Entra registration, SharePoint permission or production deployment changed during this acceptance. The templates were compiled locally only. Cost approval, authenticated Azure what-if and owner-controlled secrets remain external gates.

## Implemented boundaries

| Boundary | Repository implementation |
|---|---|
| Compute | Six App Services, Node 24 LTS, HTTPS-only, TLS 1.2 minimum, FTPS disabled, independent commands and health paths |
| Plans | One public plan and one secure portal/API plan |
| Release | Six isolated artifacts, file and byte manifests, SHA-256 digest per artifact, packaged API boot test |
| Promotion | Production candidate slots only; the workflow contains no slot-swap, DNS, certificate or GitHub Pages retirement command |
| Data | Azure SQL Entra-only administration, production/candidate databases, private endpoints and short-term retention |
| Documents | Private Blob containers, candidate isolation, public Blob and shared-key access disabled, versioning and deletion protection |
| Secrets | Separate portal and API Key Vaults, RBAC, purge protection, soft deletion and separate private endpoints |
| Identity | One managed identity per application; only portal/API vault roles and API Blob role exist in the template |
| Network | Private SQL, Blob and vault endpoints; portal/API VNet integration; public apps receive no data-plane subnet |
| Observability | Shared Application Insights and Log Analytics with platform diagnostics; API suppresses sensitive route telemetry |
| Delivery | GitHub OIDC, exact reviewed SHA, protected environments, what-if/provision/deploy actions and immutable package evidence |

The gateway signing key is stored separately in the portal and API vaults. The owner enters one environment-specific value into both vaults through protected Azure inputs. Session, email and bootstrap secrets remain only in the API vault; the Entra relying-party credential remains only in the portal vault.

## Slot-safe form routing

The corporate application now sends CSRF, contact and account-application requests to `/api/platform/**` on its own origin. The server gateway resolves `PUBLIC_API_ORIGIN` at runtime and forwards only three allowlisted public paths. This removes the former build-time API hostname from browser JavaScript and prevents production traffic from following a candidate hostname after slot promotion.

Actual tests passed:

- valid CSRF upstream forwarding;
- exact corporate `Origin` forwarding;
- secure `Set-Cookie` relay;
- unlisted route rejection;
- oversized request rejection;
- no identity or authorisation-header forwarding;
- professional no-detail service errors.
- controlled `503` handling for malformed runtime public/API origins.

## Release artifacts

The first local Node 24 packaging run produced and validated:

| Application | Files | Bytes |
|---|---:|---:|
| Corporate | 1,585 before gateway rebuild; 1,593 in the latest standalone build | approximately 41.2 MB |
| Technology | 1,337 | approximately 18.9 MB |
| Founder | 1,406 | approximately 20.1 MB |
| Portal | 1,223 | approximately 18.2 MB |
| Status | 1,244 | approximately 17.9 MB |
| API | 11,208 | approximately 59.3 MB |

The API artifact contains only the compiled entry, governed server modules, configuration, SQL migrations, portal catalogue and transitive production dependencies. It rejects source maps, local databases, environment files, first-party tests, private content and recognised credential forms. A real API process started from the packaged directory, returned the expected live health contract and removed its isolated synthetic runtime.

Artifact counts and digests are regenerated for every immutable SHA; the figures above are evidence of the local acceptance run, not a production release identifier.

## Actual repository validation

| Gate | Result |
|---|---|
| `az bicep lint` | Passed for all root and nested Bicep modules |
| `az bicep build` | Passed for legacy, free-validation, unified and nested templates |
| `az bicep build-params` | Passed for every environment parameter file with synthetic non-secret identifiers |
| Free-validation contract | Passed unchanged |
| Unified topology validator | Passed: six apps, two plans, two vaults, four private endpoints and least-privilege role boundaries |
| Workflow YAML parse | Passed for every GitHub workflow |
| Corporate TypeScript/Biome/content/build | Passed |
| Corporate gateway tests | Passed: 11 total corporate tests |
| Release artifact structural tests | Passed |
| Packaged API startup | Passed on Node `24.14.0` |

## Deployment workflow safety

`.github/workflows/azure-deploy.yml` is manual only. It requires:

1. a selected staging or production-candidate target;
2. a complete reviewed 40-character SHA;
3. exact checkout equality;
4. current `main` equality for production candidates;
5. protected GitHub Environment approval;
6. Azure OIDC rather than a deployment client secret;
7. an infrastructure what-if before creation;
8. complete repository and dependency checks before packaging;
9. six matching app/package deployments; and
10. health/noindex smoke checks.

Production deploys only to candidate slots. There is deliberately no automatic slot swap, custom-domain binding, DNS update, SharePoint permission change or GitHub Pages retirement.

## Legacy and free-validation status

- `infra/main.bicep` and the original `development`, `staging` and `production` parameter files are retained as single-app migration evidence. They are not the current estate deployment contract.
- `infra/free-validation-*.bicep` remains the separately cost-gated proof-of-concept contract. It cannot prove the paid six-application production topology.
- Existing GitHub Pages deployment remains the public rollback until owner-approved managed cutover acceptance.

## External gates

The following are not complete and must not be inferred from repository acceptance:

1. owner-approved Azure subscription, region and cost estimate;
2. GitHub OIDC registration and protected environments;
3. authenticated Azure what-if and actual resource IDs;
4. protected entry and resolution of both vaults' secrets;
5. Entra workforce and External ID registrations, groups, app roles and MFA evidence;
6. Azure SQL contained users, migration, reconciliation, backup and isolated restore;
7. private Blob quarantine and an approved malware-scanning service;
8. transactional email delivery and provider-failure replay;
9. Graph `Sites.Selected` consent and owner-approved SharePoint permissions;
10. managed staging visual, security, accessibility, performance and penetration acceptance;
11. production candidate acceptance, cost approval, merge, domain binding, DNS and GitHub Pages retirement.

Repository acceptance is not production completion.
