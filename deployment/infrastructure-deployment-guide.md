# Azure Infrastructure Deployment Guide

Status: repository implementation complete; no Azure resources deployed  
Owner: NovaPharm Healthcare Ltd  
Last reviewed: 14 July 2026

This guide deploys the accepted Path A architecture without changing DNS or the current GitHub Pages website. It uses `infra/resource-group.bicep`, `infra/main.bicep` and the protected `Controlled Azure deployment` GitHub workflow.

## 1. Owner approvals before any deployment

| Gate | Azure/GitHub screen | Required value | Secret | May be shared in chat | Verification |
|---|---|---|---|---|---|
| Subscription and charges | Azure Portal > Subscriptions; Azure Pricing Calculator | Approved subscription and signed-off estimate | No | Yes, subscription name only; not IDs unless necessary | Budget and billing owner recorded |
| Region | Azure service availability and data-residency review | Approved Azure region code, initially assessed as `uksouth` | No | Yes | All selected SKUs available |
| SQL administrator | Entra ID > Groups | Object ID and display name of an approved SQL administrator group | Object ID is not a password, but treat as controlled configuration | Prefer GitHub Environment variable | Group has at least two approved administrators |
| OIDC deployment identity | Entra ID > App registrations > Federated credentials | Repository/environment-scoped GitHub federated credential | No client secret is created | IDs may be stored as GitHub Environment variables | Workflow receives a short-lived token |
| Production approval | GitHub > Settings > Environments > `azure-production` | Required reviewers including the owner | No | Yes | Deployment waits for approval |

Do not create Azure resources until the owner has approved the estimated recurring cost.

## 2. GitHub Environment configuration

Create `azure-staging` and `azure-production` under **Repository > Settings > Environments**. Require approval for production. Add these as environment **variables**, not source files:

- `AZURE_OIDC_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_LOCATION`
- `AZURE_STAGING_RESOURCE_GROUP` or `AZURE_PRODUCTION_RESOURCE_GROUP`
- `AZURE_SQL_ENTRA_ADMIN_OBJECT_ID`
- `AZURE_SQL_ENTRA_ADMIN_LOGIN`
- `NOVAPHARM_STAGING_ORIGIN` only when staging uses an approved custom host; otherwise the generated `azurewebsites.net` origin is used
- `AZURE_KEY_VAULT_BOOTSTRAP_IP_CIDR` only during a time-boxed secret-entry window
- `NOVAPHARM_ENABLE_BOOTSTRAP_ADMIN` (`true` only during one-time initialisation, then `false`)
- `NOVAPHARM_ENABLE_ENTRA_AUTH`
- `NOVAPHARM_ENTRA_CLIENT_ID`
- `NOVAPHARM_ENTRA_EXTERNAL_TENANT_ID` when External ID is approved
- `NOVAPHARM_ENTRA_ADMIN_GROUP_ID`, `NOVAPHARM_ENTRA_BOARD_GROUP_ID`, `NOVAPHARM_ENTRA_EMPLOYEE_GROUP_ID`
- `NOVAPHARM_ENTRA_CUSTOMER_GROUP_ID` only when an approved customer group is used
- `NOVAPHARM_ENABLE_DEFENDER_FOR_STORAGE` only after charge approval
- `NOVAPHARM_SHAREPOINT_HOSTNAME`, `NOVAPHARM_SHAREPOINT_SITE_PATH`, `NOVAPHARM_SHAREPOINT_DRIVE_ID`, `NOVAPHARM_SHAREPOINT_EXECUTIVE_PLATFORM_PATH`
- `NOVAPHARM_OPERATIONS_EMAIL`
- `NOVAPHARM_EMAIL_FROM`
- `NOVAPHARM_CONTACT_NOTIFICATION_TO`

These identifiers and addresses are controlled configuration. Passwords, API keys and client secrets do not belong in GitHub variables.

## 3. Federated deployment identity

In **Microsoft Entra admin centre > App registrations**, create or select the deployment application. Under **Certificates & secrets > Federated credentials**, add GitHub credentials restricted to:

- repository `NovapharmHealthacre/novapharm-website`;
- environment `azure-staging` for staging;
- environment `azure-production` for production.

Grant the smallest Azure RBAC scope that supports the Bicep resources and App Service deployment. `Website Contributor` is required on the target app and candidate slot for package deployment. Resource creation requires an approved resource-group/subscription deployment role. Do not create a long-lived GitHub client secret.

## 4. Validate before deploying

Run **Actions > Azure infrastructure validation > Run workflow**. It compiles and lints all Bicep modules and parameter files. Then run **Controlled Azure deployment** with:

- target: `staging`;
- action: `what-if`;
- run schema migrations: off.

Review the complete what-if. It must not delete or modify unrelated resources.

## 5. Owner-controlled Key Vault entries

The Bicep template creates Key Vault references but never secret values. Prefer an approved private-network administrative path. If that is unavailable, the owner may use this time-boxed bootstrap procedure:

1. In the applicable GitHub Environment, set variable `AZURE_KEY_VAULT_BOOTSTRAP_IP_CIDR` to the administrator's current public IPv4 address followed by `/32`, for example `192.0.2.10/32`. This is controlled configuration, not a password, and may be shared with the infrastructure administrator but need not be posted in chat.
2. Run the controlled deployment and confirm the Key Vault firewall permits only that address.
3. In **Azure Portal > Key vaults > the environment vault > Objects > Secrets**, create each secret below. Enter values only in Azure's protected **Secret value** field.
4. Verify the App Service Key Vault references report `Resolved` and complete the staging smoke test.
5. Delete `AZURE_KEY_VAULT_BOOTSTRAP_IP_CIDR` from the GitHub Environment and redeploy immediately.
6. In **Key Vault > Networking**, verify public access is disabled and the private endpoint remains approved.

Do not leave the temporary firewall rule in place. Do not use a broad CIDR or `0.0.0.0/0`.

| Secret name | Source | Requirement |
|---|---|---|
| `session-secret` | Owner-generated random value | At least 32 cryptographically random bytes |
| `candidate-session-secret` | Independently generated | Must differ from production |
| `preview-access-username` | Owner-selected staging identity | Not a portal identity |
| `preview-access-password` | Owner-generated | At least 16 random bytes; staging only |
| `resend-api-key` | Resend dashboard | Restricted transactional key; staging uses a sandbox/non-production key |
| `entra-client-secret` | Entra app registration | Only if App Service Authentication uses a client secret; store nowhere else |
| `bootstrap-admin-password` | Owner-controlled one-time input | Add only when local recovery bootstrap is explicitly authorised; remove after password change |
| `candidate-bootstrap-admin-password` | Independently generated candidate-only input | Never reuse the production bootstrap value |

Never paste these values into chat, terminal command history, workflow inputs, source, screenshots or documentation.

## 6. Entra and app-role configuration

Create workforce app roles named `NovaPharm.Customer`, `NovaPharm.Employee`, `NovaPharm.Board` and `NovaPharm.Admin`. Configure group object IDs in App Service settings through approved parameters. The application maps `NovaPharm.Admin` to all four scopes but still enforces every protected route server-side.

Register these redirect URLs only after the hostnames exist:

- `https://<staging-host>/.auth/login/aad/callback`
- `https://<production-candidate-host>/.auth/login/aad/callback`
- `https://novapharmhealthcare.com/.auth/login/aad/callback`

External customers require a separately approved Entra External ID tenant, verified email and an active linked customer record. Public application submission never creates privileged access.

## 7. Azure SQL identity bootstrap

The runtime managed identity deliberately does not receive permanent schema-owner rights. An Entra SQL administrator must:

1. create contained users for the staging app identity and production/candidate identities;
2. grant the runtime identity only the required read/write/execute permissions;
3. grant schema migration rights temporarily;
4. run `npm run migrate:azure-sql:schema` through the controlled app identity, or set the workflow migration input after temporary permission is confirmed;
5. set `AZURE_SQL_RUN_MIGRATIONS=false`, restart and verify readiness;
6. revoke schema migration rights;
7. record grants and revocation in the deployment evidence.

Do not enable Azure SQL public access to simplify deployment.

## 8. SharePoint managed identity

The App Service identity requests Graph tokens with `DefaultAzureCredential`. The Microsoft 365 administrator must grant only the approved Microsoft Graph application permission and site-level `Sites.Selected` access. Configure the approved SharePoint hostname, site path, drive and Executive Platform folder. No SharePoint permission change is authorised by this repository.

## 9. Deploy staging

First run **Controlled Azure deployment** with target `staging` and action `provision`. This creates or updates infrastructure without packaging the application or waiting for application health, allowing the owner to seed Key Vault and create SQL users safely. Then run it again with target `staging`, action `deploy`, and schema migrations only after temporary SQL migration permission exists. The deploy action:

1. logs into Azure with OIDC;
2. validates and deploys the isolated resource group;
3. runs Bicep what-if and deployment;
4. installs with Node 24;
5. runs audit and the complete repository check;
6. creates an immutable deployment package;
7. deploys to the staging App Service, whose startup command is pinned to `npm run start:production` and writes no runtime data into the read-only package;
8. optionally runs the controlled schema migration;
9. requires healthy database status and `X-Robots-Tag: noindex`.

Staging must contain no live customer data, confidential documents, production email key, production Graph secret, production SharePoint content or production administrator credential.

The Node process checks the transactional-email queue at startup and every 60 seconds. Failed retryable Resend requests use bounded backoff and a stable `Idempotency-Key`; after the maximum attempts they remain blocked for controlled review. An authorised administrator can trigger a due-item pass with `POST /api/integrations/email/retries` using the normal authenticated session and CSRF token. Staging acceptance must simulate a provider failure, confirm the public submission still succeeds, then confirm exactly-once replay and both account-application emails.

## 10. Production candidate and cutover

Production deployment is permitted only from `main` and the protected `azure-production` environment. Deploy first to the `candidate` slot. Do not swap slots, bind the public domains, modify DNS or disable GitHub Pages until the production acceptance report is complete and the owner separately approves cutover.

## Evidence still required

- Bicep compile/what-if from GitHub Actions;
- owner-approved pricing estimate;
- Azure resource IDs and deployment outputs;
- Key Vault reference resolution;
- Entra login and MFA evidence;
- Azure SQL migration/reconciliation;
- Blob malware-scanning evidence;
- Application Insights and alert evidence;
- private staging visual/security acceptance;
- tested Azure backup restoration.
