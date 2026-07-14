# Azure Free-Validation Runbook

Status: repository configuration ready; deployment blocked by absent Azure subscription

Environment: `free-validation` / `poc`

Resource group: `novapharm-free-validation-rg`

Public production impact: none; GitHub Pages and all DNS records remain unchanged

This runbook creates a synthetic-data validation environment, not production. It must never contain live customer, supplier, employee, board, patient, adverse-event, payment or confidential corporate data.

## 1. Select an eligible protected subscription

In **Azure portal > Subscriptions**, select a subscription that has active promotional credit and a spending limit. Do not use an unrestricted pay-as-you-go subscription for this phase.

Verify:

- status is **Active/Enabled**;
- **Spending limit** is **On**;
- the limit has not been removed for the current billing period;
- current credit balance is positive;
- credit expiry is after the planned validation period;
- no Marketplace commitment or support plan is attached.

The subscription name is not secret. Treat the subscription ID and tenant ID as controlled configuration and place them in GitHub Environment variables rather than chat or source files.

## 2. Confirm the SQL free offer before deployment

Open **Azure portal > Azure SQL > Create > Start free** using the selected subscription. Choose the proposed region and confirm all of the following without completing the portal deployment:

- **Free offer applied** is visible;
- estimated monthly database cost is zero;
- General Purpose serverless is selected;
- behaviour at the free limit is **Auto-pause the database until next month**;
- **Continue using database for additional charges** is not selected;
- storage and backup are each within 32 GB;
- no elastic pool, failover group, geo-replication or long-term retention is selected.

Record the date of this check. Do not place a screenshot containing subscription IDs, payment information or personal data in the repository.

## 3. Create the GitHub OIDC deployment identity

In **Microsoft Entra admin centre > App registrations**, create a deployment registration for repository `NovapharmHealthacre/novapharm-website`. Add a federated credential for GitHub Environment `azure-free-validation`. Do not create a client secret.

Grant the minimum resource-creation rights at `novapharm-free-validation-rg` after the resource group exists. A temporary subscription-scope role may be needed only to create that one resource group; remove it immediately afterwards.

## 4. Configure the GitHub Environment

In **GitHub repository > Settings > Environments**, create `azure-free-validation` and require owner approval. Add these non-secret variables:

| Variable | Value format |
|---|---|
| `AZURE_OIDC_CLIENT_ID` | Entra application UUID |
| `AZURE_TENANT_ID` | NovaPharm tenant UUID |
| `AZURE_SUBSCRIPTION_ID` | selected protected subscription UUID |
| `AZURE_LOCATION` | Azure region code, for example `uksouth` |
| `AZURE_FREE_VALIDATION_RESOURCE_GROUP` | exactly `novapharm-free-validation-rg` |
| `AZURE_SQL_ENTRA_ADMIN_OBJECT_ID` | approved SQL administrator group UUID |
| `AZURE_SQL_ENTRA_ADMIN_LOGIN` | approved SQL administrator group display name |
| `NOVAPHARM_OPERATIONS_EMAIL` | validation operations mailbox |
| `NOVAPHARM_FREE_DEPLOY_KEY_VAULT` | `false` unless separately verified under credit protection |
| `AZURE_SQL_FREE_OFFER_OWNER_VERIFIED` | `true` only after section 2 |
| `AZURE_SQL_APP_IDENTITY_BOOTSTRAPPED` | `false` until section 8 completes |
| `AZURE_CREDIT_CHECKED_ON` | current date as `YYYY-MM-DD` |
| `AZURE_REMAINING_CREDIT_AMOUNT` | positive numeric amount, no currency symbol |
| `AZURE_REMAINING_CREDIT_CURRENCY` | ISO currency code, for example `GBP` |

Add these protected Environment secrets only immediately before application deployment:

- `FREE_VALIDATION_SESSION_SECRET`: at least 32 cryptographically random bytes;
- `FREE_VALIDATION_PREVIEW_USERNAME`: temporary validation gate identity;
- `FREE_VALIDATION_PREVIEW_PASSWORD`: at least 16 random bytes;
- `FREE_VALIDATION_BOOTSTRAP_ADMIN_PASSWORD`: one-time strong password supplied outside GitHub/source/chat.

Never use a former or production password. The workflow does not print these values.

## 5. Run the read-only preflight

Open **GitHub > Actions > Controlled Azure free validation > Run workflow**:

- action: `preflight`;
- zero-out-of-pocket confirmation: off;
- schema migrations: off.

The run must report the expected subscription, `spendingLimit=On`, Linux F1 availability and a supported Node 24 runtime. A failed preflight authorises no fallback paid resource.

## 6. Provision the data layer first

Run the same workflow with:

- action: `provision-data`;
- zero-out-of-pocket confirmation: on;
- schema migrations: off.

The workflow creates only `novapharm-free-validation-rg`, the Entra-only SQL logical server, one SQL free-offer database, one static free-usage metric alert and its email action group. It then verifies `useFreeLimit=true`, `freeLimitExhaustionBehavior=AutoPause`, maximum size 32 GB and General Purpose serverless.

Immediately confirm in **Azure SQL database > Overview** that **Free amount remaining** is present. Confirm Cost Management shows no database charge after usage data becomes available. Disconnect Query Editor, SSMS and Object Explorer when not in use.

## 7. Provision F1 and private validation storage

Run:

- action: `provision-app`;
- zero-out-of-pocket confirmation: on;
- schema migrations: off.

The workflow performs a what-if first, then creates one Linux F1 plan, one web app with a system-managed identity and one Standard LRS storage account. Blob anonymous access and shared-key access are disabled. Both validation containers are private; synthetic uploads expire after seven days. Key Vault remains disabled unless its current allowance and spending protection were separately verified.

## 8. Bootstrap the SQL app identity

An approved Entra SQL administrator must connect to the validation database and create the App Service managed identity as a contained user. Grant only runtime data permissions. Grant schema-alter permissions temporarily for migration, then revoke them after migration.

Set GitHub variable `AZURE_SQL_APP_IDENTITY_BOOTSTRAPPED=true` only after the contained user and temporary migration grant are verified. Do not create a SQL password or enable SQL authentication.

## 9. Deploy the application

Run:

- action: `deploy-app`;
- zero-out-of-pocket confirmation: on;
- schema migrations: on for the first controlled deployment only.

The workflow runs the full repository check, creates an immutable package, applies protected validation settings, deploys to the generated `azurewebsites.net` hostname, checks `/api/health`, removes the bootstrap input from App Service configuration, disables migrations and confirms `X-Robots-Tag: noindex`.

After successful migration, revoke schema-alter rights and keep only runtime rights. Complete the forced password change before accessing board or administrator routes. Delete the one-time bootstrap secret from the GitHub Environment after the application setting has been removed.

## 10. Acceptance boundary

Use only synthetic validation identities and records. Verify:

- preview Basic authentication and `noindex`;
- contact persistence, validation, CSRF, rate limiting and provider-failure queue;
- account application without automatic privileged identity creation;
- customer, employee, board and administrator route boundaries;
- Vishal validation administrator scopes: customer, employee, board and admin;
- customer isolation and private document rejection;
- quarantine, simulated clean/malicious transitions and release gating;
- Chromium/WebKit rendering and accessibility;
- SQL free-amount metric and the 10% alert;
- logical export/import restore into a separate eligible free database, because native restore into the free offer is unsupported;
- Blob copy/restore using synthetic files only.

Do not call this environment production. It has F1 cold stops/quotas, no SLA, public service endpoints protected by identity rather than paid private networking, no paid Defender scanning, and no production data.

## 11. Shutdown and deletion

To stop validation compute without deleting evidence:

```bash
az webapp stop --resource-group novapharm-free-validation-rg --name <validation-app-name>
```

Ensure all SQL clients are disconnected so normal serverless auto-pause can occur. When owner assessment is complete, export the non-secret acceptance evidence, remove temporary GitHub secrets, and delete the isolated resource group from **Azure portal > Resource groups > novapharm-free-validation-rg > Delete resource group**. Type the resource-group name exactly when prompted.

Deletion is irreversible for the synthetic environment. It does not affect GitHub Pages, production DNS, Microsoft 365 DNS or SharePoint.

## 12. Paid-production upgrade remains separate

The future production path remains `infra/main.bicep`: App Service S1 or measured alternative, Always On, candidate slot, production SQL, Key Vault, private networking, Defender for Storage, full monitoring, production Entra/External ID, domains and managed TLS. None is authorised by this runbook.
