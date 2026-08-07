# NovaPharm Azure infrastructure

These Bicep templates implement the approved **Path A** target: six isolated Node/Next.js applications on Azure App Service for Linux behind Azure Front Door Premium and Azure WAF, with Azure SQL Database, private Blob Storage, separate portal/API Key Vaults, managed identities, private service endpoints, Application Insights and Log Analytics.

The current paid staging/production contract is `unified-estate.bicep`, with `unified-development.bicepparam`, `unified-staging.bicepparam` and `unified-production.bicepparam`. The earlier single-application `main.bicep` and parameter files remain only as migration rollback evidence and must not be used for a new estate deployment. The separately cost-gated proof of concept remains split into `free-validation-data.bicep` and `free-validation-app.bicep`; it does not represent the six-app production topology.

## Application topology

| Application | Plan | Managed data access | Package entry |
|---|---|---|---|
| Corporate | Public | None; public forms use the same-origin API gateway | `node apps/corporate/server.js` |
| Technology | Public | None | `node apps/technology/server.js` |
| Founder | Public | None | `node apps/founder/server.js` |
| Status | Public | Sanitised HTTPS health requests only | `node apps/status/server.js` |
| Portal | Secure | Portal Key Vault only | `node apps/portal/server.js` |
| API | Secure | API Key Vault, Azure SQL and private Blob Storage | `node apps/api/dist/server.js` |

Production candidate slots use separate SQL and Blob resources. Every application has its own system-assigned managed identity and deployment artifact digest.

Each application receives an isolated Front Door production endpoint, origin group, HTTPS-only route and WAF association. Candidate slots use separate generated Front Door endpoints. App Service origin access is restricted to the `AzureFrontDoor.Backend` service tag with the exact profile `X-Azure-FDID`. The production template declares optional priority-two regional origins but leaves them disabled until a separately deployed and accepted secondary region exists.

## Safety gates

- Nothing in this folder deploys automatically from a developer computer.
- `enableDefenderForStorage` defaults to `false` because on-upload malware scanning has a usage-based charge.
- App Service Authentication defaults to `false` until the Entra registrations, redirect URIs, app roles and owners are approved.
- The unified production contract declares Front Door custom domains and Azure-managed TLS, but DNS validation and activation remain owner-controlled. The earlier direct App Service `custom-domain.bicep` and `managed-certificate.bicep` files are rollback evidence and must not be used for the Front Door topology.
- No DNS record, SharePoint permission, credential or production secret is created here.
- Staging and production use separate resource groups and unified parameter files. The production candidate slots use a separate database and private containers.
- Public applications cannot read either Key Vault, Azure SQL or private Blob Storage.
- The portal cannot read API session, email, bootstrap or document credentials. The API cannot read the portal's Entra relying-party credential.
- Free validation uses resource group `novapharm-free-validation-rg`, environment code `poc`, synthetic data, the generated Azure hostname and no production DNS.
- The free-validation workflow fails unless Azure reports the subscription spending limit as `On`, the owner has recently verified positive promotional credit, and the SQL portal has shown the zero-cost free offer.
- Free validation uses F1 with no Always On, slots, custom domain, VNet integration or paid backup. It is not the production baseline.
- Application Insights, Log Analytics, Defender for Storage, private endpoints, Front Door, WAF, NAT Gateway and Azure Firewall are absent from the separately cost-gated free-validation templates.

## Front Door and WAF boundary

- `modules/front-door-core.bicep` creates the Premium profile, prevention-mode WAF, Microsoft Default Rule Set 2.2, Bot Manager 1.1, global and sensitive-path rate limits, diagnostics and edge alerts.
- `modules/front-door-application.bicep` creates production/candidate endpoints, health-probed origin groups, managed-TLS custom domains, HTTPS-only routes, WAF associations and the optional regional failover origin.
- `modules/web-app.bicep` restricts each App Service origin to the exact Front Door profile when `restrictOriginToFrontDoor` is enabled.
- `scripts/validate-unified-estate-infrastructure.mjs` validates the compiled template and environment contract without provisioning resources.
- Live WAF effectiveness, managed-certificate issuance, failover, log ingestion and alert delivery remain external verification gates after owner-approved Azure deployment.

## Required non-secret inputs

- Azure subscription and target resource group
- approved Azure region
- Microsoft Entra object ID and display name of the Azure SQL administrators group
- optional environment origin hostname; development and staging default to the generated Azure hostname
- operations email, if alert email is approved

`AZURE_KEY_VAULT_BOOTSTRAP_IP_CIDR` may be supplied temporarily as one approved `/32` while an owner enters secrets in the Azure portal. Remove it and redeploy immediately; the default state disables Key Vault public access.

Values are read from deployment-time environment variables in the `.bicepparam` files. Do not put secret values in parameter files.

## Required secrets after provisioning

Create these directly in the applicable environment vault. The value of each portal gateway secret pair must be identical within an environment, but it is entered separately so neither workload receives unrelated vault access.

Portal vault:

- `portal-gateway-secret`
- `candidate-portal-gateway-secret` when candidate slots exist
- `entra-client-secret` only when the approved App Service Authentication registration requires it

API vault:

- `session-secret`
- `candidate-session-secret` when candidate slots exist
- `portal-gateway-secret`, matching the portal-vault version for the same environment
- `candidate-portal-gateway-secret`, matching the candidate portal-vault version
- `resend-api-key` only after provider approval
- temporary bootstrap credentials only during their explicitly approved workflow

The application receives secrets through Key Vault references. It does not need Key Vault secret values in GitHub.

## Validation and deployment

Use Azure CLI from an authenticated, owner-controlled shell:

```bash
az bicep build --file infra/unified-estate.bicep
az deployment group validate \
  --resource-group <environment-resource-group> \
  --parameters infra/environments/unified-staging.bicepparam
az deployment group what-if \
  --resource-group <environment-resource-group> \
  --parameters infra/environments/unified-staging.bicepparam
```

Run `what-if` and obtain owner approval before any `create` command. The full sequence, role setup and verification steps are in `deployment/infrastructure-deployment-guide.md`.

## Post-deployment database access

Azure SQL role-based access requires contained database users for the API and candidate API managed identities. The Bicep template deliberately gives no public or portal application database access and does not grant schema-owner rights. Run the reviewed SQL role bootstrap after provisioning; migration and runtime roles remain separate.
