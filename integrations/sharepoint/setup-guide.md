# SharePoint Production Setup

## 1. Register The Runtime Application

Create `NovaPharm Website Portal` in Microsoft Entra ID. Prefer certificate authentication where operational support permits; otherwise store a short-lived client secret only in the production host's secret manager.

## 2. Grant Least Privilege

Use Microsoft Graph application permission `Sites.Selected` where tenant policy permits. Grant the application read/write access only to the approved production site. Use broader `Sites.ReadWrite.All` only after a documented security review.

The browser must never receive Graph credentials or app-only tokens.

## 3. Configure The Host

```text
SHAREPOINT_HOSTNAME=your-tenant.sharepoint.com
SHAREPOINT_SITE_PATH=/sites/your-site
SHAREPOINT_DRIVE_ID=b!uEWPsekhUUSx7JVCwS8wfvjggLC-ZqBFl1Khkpc0DVKhy0Cv-Vh1SYg9j7mGijwl
SHAREPOINT_EXECUTIVE_PLATFORM_PATH=your-controlled-library-folder
```

Add tenant, client and secret/certificate values through the host's secret manager.

## 4. Apply Metadata And Governance

Create the fields described in `sharepoint/metadata-model/README.md`, approve retention classes and map Entra groups from `sharepoint/permissions/README.md`. Enable version history and audit review.

## 5. Restrict The Executive Platform

The folder currently inherits `Novapharm Tier 1 Owners`, `Members` and `Visitors`. There is no anonymous link. A SharePoint administrator must break inheritance and grant only the approved board and platform-administrator groups before confidential board data is placed there.

## 6. Verify Runtime Sync

Run `node scripts/sync-secure-content.mjs` in a controlled environment. Confirm the private manifest lists 22 files, then sign in through the Board member portal and open the hub and CEO dashboard. Review Graph audit logs and ensure no controlled path is reachable without a valid board/admin session.
