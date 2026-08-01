# Azure Runtime Configuration Register

Status: names, ownership and vault boundaries implemented; values owner-controlled
Last reviewed: 1 August 2026

The current deployment contract is `infra/unified-estate.bicep`. It deploys six separate packages and does not give every application the monolith's configuration. Secret values belong in the named Azure Key Vault and are exposed to an application only through a Key Vault reference. GitHub stores OIDC/resource identifiers and reviewed non-secret parameters, never runtime credentials.

## Shared App Service settings

| Name | Applications | Production source | Secret |
|---|---|---|---|
| `NODE_ENV` | all six | Bicep: `production` | No |
| `HOSTNAME` | five Next.js applications | Bicep: `0.0.0.0` | No |
| `HOST` | API | Bicep: `0.0.0.0` | No |
| `PORT` | all six | supplied by App Service; do not set manually | No |
| `APP_VERSION` | all six | immutable reviewed commit SHA | No |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | all six | Bicep output | Controlled telemetry configuration, not an authentication secret |
| `WEBSITE_NODE_DEFAULT_VERSION` | all six | Bicep: `~24` | No |
| `WEBSITE_RUN_FROM_PACKAGE` | all six | Bicep: `1` | No |

## Public applications

| Application | Runtime settings |
|---|---|
| Corporate | `PUBLIC_ORIGIN`, `PUBLIC_API_ORIGIN`, `PORTAL_ORIGIN`, `STATUS_ORIGIN`, `PUBLIC_INDEXABLE` |
| Technology | `PUBLIC_ORIGIN`, `PUBLIC_INDEXABLE` |
| Founder | `PUBLIC_ORIGIN`, `PUBLIC_INDEXABLE` |
| Status | `CORPORATE_ORIGIN`, `TECHNOLOGY_ORIGIN`, `FOUNDER_ORIGIN`, `PORTAL_ORIGIN`, `PUBLIC_API_ORIGIN` |

The browser submits corporate contact and account workflows to `/api/platform/**` on the corporate origin. The corporate server resolves `PUBLIC_API_ORIGIN` at runtime and forwards only the allowlisted public API routes. The API hostname is not embedded in browser JavaScript.

Staging and candidate public applications set `PUBLIC_INDEXABLE=false` and `PREVIEW_LABEL`. The portal and status service remain noindex in every environment.

## Portal application

| Name | Source | Secret |
|---|---|---|
| `PUBLIC_ORIGIN`, `PORTAL_ORIGIN` | exact portal origin | No |
| `PUBLIC_API_ORIGIN`, `INTERNAL_API_ORIGIN` | exact API origin | No |
| `NEXT_PUBLIC_ENTRA_LOGIN_ENABLED` | reviewed Entra activation flag, supplied at build and runtime | No |
| `PORTAL_GATEWAY_SECRET` | portal Key Vault `portal-gateway-secret` | Yes |
| `ENTRA_CLIENT_SECRET` | portal Key Vault `entra-client-secret`, only when App Service Authentication requires it | Yes |

The portal does not receive the API session secret, email key, bootstrap password, SQL settings, Storage permissions or SharePoint document credentials.

## API application

### Origin and server boundary

- `NOVAPHARM_SERVER_MODE=api-only`
- `PLATFORM_MODE=FULL_PLATFORM`
- `SITE_URL`, `PUBLIC_ORIGIN`, `PUBLIC_API_ORIGIN`, `PORTAL_ORIGIN`
- `ALLOWED_ORIGINS`: exact comma-separated corporate, technology, founder and portal origins; no wildcards
- `SECURE_CONTENT_ROOT=/home/site/wwwroot/_secure`
- `PREVIEW_MODE=false` for the paid production topology

### Sessions and portal handoff

| Name | Source |
|---|---|
| `SESSION_SECRET` | API Key Vault `session-secret`; at least 32 cryptographically random bytes |
| `SESSION_TTL_MS` | Bicep: eight-hour absolute lifetime |
| `SESSION_IDLE_TIMEOUT_MS` | Bicep: 30-minute inactivity lifetime |
| `PORTAL_GATEWAY_SECRET` | API Key Vault `portal-gateway-secret`; same environment-specific value as the portal vault copy |

Production and candidate slots use independent session and gateway values. Gateway values are duplicated deliberately across the two least-privilege vaults; all other secrets remain isolated.

### Database and private documents

| Name | Source |
|---|---|
| `DATABASE_PROVIDER` | `azure-sql` |
| `AZURE_SQL_SERVER`, `AZURE_SQL_DATABASE` | Bicep outputs |
| `AZURE_SQL_AUTHENTICATION` | `managed-identity` |
| `AZURE_SQL_RUN_MIGRATIONS` | `false` during normal runtime; temporarily enabled only by the controlled workflow |
| `DOCUMENT_STORAGE_PROVIDER` | `azure-blob` |
| `AZURE_STORAGE_ACCOUNT_NAME` | Bicep output |
| `AZURE_STORAGE_QUARANTINE_CONTAINER` | environment/slot-specific private container |
| `AZURE_STORAGE_PRIVATE_CONTAINER` | environment/slot-specific private container |

No SQL password, connection string or Storage account key is configured.

### Entra, Microsoft Graph and SharePoint

- `ENTRA_AUTH_ENABLED`
- `ENTRA_EXTERNAL_TENANT_ID`
- `ENTRA_ADMIN_GROUP_ID`, `ENTRA_BOARD_GROUP_ID`, `ENTRA_EMPLOYEE_GROUP_ID`, `ENTRA_CUSTOMER_GROUP_ID`
- `MICROSOFT_GRAPH_AUTH_MODE=managed-identity`
- `MICROSOFT_TENANT_ID`
- `SHAREPOINT_HOSTNAME`, `SHAREPOINT_SITE_PATH`, `SHAREPOINT_DRIVE_ID`, `SHAREPOINT_EXECUTIVE_PLATFORM_PATH`

The API identity must receive separately approved `Sites.Selected` access. Candidate and staging identities receive only approved test-site access. `MICROSOFT_CLIENT_SECRET` is a legacy fallback and is absent from the accepted Bicep contract.

### Transactional email

| Name | Source |
|---|---|
| `EMAIL_PROVIDER` | explicitly approved `resend` or `microsoft-graph` in managed staging/production |
| `EMAIL_FROM` | verified NovaPharm sender identity |
| `CONTACT_NOTIFICATION_TO` | controlled NovaPharm mailbox |
| `RESEND_API_KEY` | API Key Vault `resend-api-key`, only when Resend is selected |
| `MICROSOFT_EMAIL_SENDER` | approved mailbox when Microsoft Graph is selected |

Candidate slots deliberately contain no live provider key or recipient. `APPLICATION_UPLOAD_TOKEN_TTL_MS` is 30 minutes and `APPLICATION_RESUME_TOKEN_TTL_MS` is 24 hours. Only token hashes are stored in SQL.

## Key Vault ownership

| Vault | Secret names | Permitted application identities |
|---|---|---|
| API `akv` | `session-secret`, `candidate-session-secret`, production/candidate gateway copies, optional `resend-api-key`, optional production/candidate bootstrap values | API and candidate API only |
| Portal `pkv` | production/candidate gateway copies, optional `entra-client-secret` | portal and candidate portal only |

Each secret must be entered through Azure's protected field and must never appear in chat, source, terminal history, workflow inputs, screenshots or documentation.

## One-time administrator bootstrap

- `PORTAL_USERNAME=Vishal`
- `PORTAL_DISPLAY_NAME=Vishal Chakravarty`
- `BOOTSTRAP_ADMIN_PASSWORD`: API Key Vault reference only while the owner-authorised first-login or recovery workflow is active
- `NOVAPHARM_ENABLE_BOOTSTRAP_ADMIN`: deployment parameter; set `false`, remove the vault secret and reprovision immediately after the forced password change

Never configure plaintext `PORTAL_PASSWORD`. Production Entra activation is the durable identity path.

## Deployment-only GitHub variables

`AZURE_OIDC_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_LOCATION`, resource-group names, SQL administrator group identifiers, approved Entra group identifiers, SharePoint identifiers and non-secret sender addresses live in protected GitHub Environments. `AZURE_KEY_VAULT_BOOTSTRAP_IP_CIDR` is a time-boxed deployment variable for one reviewed `/32`; it is not an application runtime setting and must be removed immediately after protected vault entry.

Production and staging never share databases, containers, session secrets, gateway secrets, identities, email credentials, SharePoint test content or administrator bootstrap values. Unresolved Key Vault references fail the affected security or integration capability and must block managed-environment acceptance.
