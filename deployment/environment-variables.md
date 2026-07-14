# Azure Runtime Configuration Register

Status: names and sources implemented; values owner-controlled  
Last reviewed: 14 July 2026

Secret values belong in Azure Key Vault. GitHub stores only OIDC/resource identifiers and non-secret deployment configuration.

## Core runtime

| Name | Production source | Secret |
|---|---|---|
| `NODE_ENV` | Bicep: `production` | No |
| `HOST` | Bicep: `0.0.0.0` | No |
| `PORT` | App Service supplies it | No |
| `SITE_URL`, `PUBLIC_ORIGIN`, `PUBLIC_API_ORIGIN` | Bicep production origin | No |
| `SESSION_SECRET` | Key Vault `session-secret` | Yes |
| `SESSION_TTL_MS` | Bicep: eight-hour absolute lifetime | No |
| `SESSION_IDLE_TIMEOUT_MS` | Bicep: 30-minute inactivity lifetime | No |
| `SECURE_CONTENT_ROOT` | Immutable package `_secure` path | No |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Bicep Application Insights output | Controlled, not a password |
| `AZURE_KEY_VAULT_BOOTSTRAP_IP_CIDR` | Temporary GitHub Environment variable; one reviewed `/32` only | No; remove after secret entry |

## Database and private documents

| Name | Source |
|---|---|
| `DATABASE_PROVIDER` | `azure-sql` |
| `AZURE_SQL_SERVER`, `AZURE_SQL_DATABASE` | Bicep outputs |
| `AZURE_SQL_AUTHENTICATION` | `managed-identity` |
| `AZURE_SQL_RUN_MIGRATIONS` | `false` during normal runtime |
| `DOCUMENT_STORAGE_PROVIDER` | `azure-blob` |
| `AZURE_STORAGE_ACCOUNT_NAME` | Bicep output |
| `AZURE_STORAGE_QUARANTINE_CONTAINER` | Environment-specific private container |
| `AZURE_STORAGE_PRIVATE_CONTAINER` | Environment-specific clean container |

No database password or Storage account key is configured.

## Entra

- `ENTRA_AUTH_ENABLED`
- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET` from Key Vault only when required by App Service Authentication
- `ENTRA_EXTERNAL_TENANT_ID`
- `ENTRA_ADMIN_GROUP_ID`, `ENTRA_BOARD_GROUP_ID`, `ENTRA_EMPLOYEE_GROUP_ID`, `ENTRA_CUSTOMER_GROUP_ID`
- optional app-role name overrides; defaults are `NovaPharm.Admin`, `.Board`, `.Employee`, `.Customer`

## SharePoint and Graph

- `MICROSOFT_GRAPH_AUTH_MODE=managed-identity`
- `SHAREPOINT_HOSTNAME`
- `SHAREPOINT_SITE_PATH`
- `SHAREPOINT_DRIVE_ID`
- `SHAREPOINT_EXECUTIVE_PLATFORM_PATH`

`MICROSOFT_CLIENT_SECRET` is a fallback only and is not configured in the accepted production Bicep design.

## Email

- `RESEND_API_KEY`: Key Vault `resend-api-key`;
- `EMAIL_FROM`: verified Resend sender;
- `CONTACT_NOTIFICATION_TO`: controlled NovaPharm mailbox.

## Preview only

- `PREVIEW_MODE=true`
- `PREVIEW_LABEL`
- `PREVIEW_ACCESS_USERNAME`: Key Vault reference
- `PREVIEW_ACCESS_PASSWORD`: independent Key Vault secret of at least 16 bytes

Staging and production candidate use separate data, containers, sessions and test identities. Unresolved Key Vault reference strings are rejected by the application.

`NOVAPHARM_STAGING_ORIGIN` is optional. When omitted, Bicep configures the generated HTTPS `azurewebsites.net` hostname, avoiding any staging DNS prerequisite.

## Transitional administrator

- `PORTAL_USERNAME=Vishal`
- `PORTAL_DISPLAY_NAME=Vishal Chakravarty`
- `BOOTSTRAP_ADMIN_PASSWORD`: one-time protected value only; remove after forced change
- `NOVAPHARM_ENABLE_BOOTSTRAP_ADMIN`: deployment-time boolean; set `false` and reprovision immediately after the forced change

Never configure plaintext `PORTAL_PASSWORD` in production.
