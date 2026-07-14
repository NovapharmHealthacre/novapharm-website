# NovaPharm Azure infrastructure

These Bicep templates implement the approved **Path A** target: Azure App Service for Linux, Azure SQL Database, private Blob Storage, Azure Key Vault, managed identities, private service endpoints, Application Insights and Log Analytics.

## Safety gates

- Nothing in this folder deploys automatically from a developer computer.
- `enableDefenderForStorage` defaults to `false` because on-upload malware scanning has a usage-based charge.
- App Service Authentication defaults to `false` until the Entra registrations, redirect URIs, app roles and owners are approved.
- Custom-domain binding and managed-certificate activation are separate post-acceptance templates. Run `custom-domain.bicep` only after the DNS change is approved, then run `managed-certificate.bicep` after Azure verifies the hostname.
- No DNS record, SharePoint permission, credential or production secret is created here.
- Staging and production use separate resource groups and parameter files. The production candidate slot uses a separate database and private containers.

## Required non-secret inputs

- Azure subscription and target resource group
- approved Azure region
- Microsoft Entra object ID and display name of the Azure SQL administrators group
- environment origin hostname
- operations email, if alert email is approved

Values are read from deployment-time environment variables in the `.bicepparam` files. Do not put secret values in parameter files.

## Required secrets after provisioning

Create these directly in the environment Key Vault:

- `session-secret`
- `candidate-session-secret` when the production candidate slot exists
- `resend-api-key` only in production after email-provider approval
- temporary bootstrap or integration credentials only when their approved workflow explicitly requires them

The application receives secrets through Key Vault references. It does not need Key Vault secret values in GitHub.

## Validation and deployment

Use Azure CLI from an authenticated, owner-controlled shell:

```bash
az bicep build --file infra/main.bicep
az deployment group validate \
  --resource-group <environment-resource-group> \
  --parameters infra/environments/staging.bicepparam
az deployment group what-if \
  --resource-group <environment-resource-group> \
  --parameters infra/environments/staging.bicepparam
```

Run `what-if` and obtain owner approval before any `create` command. The full sequence, role setup and verification steps are in `deployment/infrastructure-deployment-guide.md`.

## Post-deployment database access

Azure SQL role-based access requires contained database users for the App Service managed identities. The Bicep template deliberately does not grant the web process schema-owner rights. Run the reviewed SQL role bootstrap after provisioning; application migrations and normal runtime access use separate roles.
