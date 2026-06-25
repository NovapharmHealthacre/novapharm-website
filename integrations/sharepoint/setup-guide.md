# SharePoint Setup Guide

## 1. Create Microsoft Entra App Registration
1. Go to Microsoft Entra admin center.
2. Create a new app registration for `NovaPharm Website Portal`.
3. Add an application client secret.
4. Store tenant ID, client ID and client secret in production environment variables.

## 2. Configure API Permissions
Recommended minimum Graph application permissions:

- `Sites.ReadWrite.All`
- `Files.ReadWrite.All`

Grant admin consent after review.

## 3. Identify SharePoint Site
Set:

- `SHAREPOINT_HOSTNAME`, for example `tenant.sharepoint.com`
- `SHAREPOINT_SITE_PATH`, for example `/sites/NovaPharm`
- `SHAREPOINT_DRIVE_ID`, the document library drive ID

## 4. Provision Folders
Use `graph-client.ts` from a TypeScript-capable runtime or adapt it into the server deployment pipeline.

The default folders are:

```text
Regulatory Documents
Product Catalogues
Company Documents
Business Plans
Investor Files
Downloads
Announcements
Task Tracking
Executive Platform
```

## 5. Security
- Never expose the client secret in browser JavaScript.
- Run Graph calls server-side only.
- Use Microsoft Entra groups for production role-based access.
- Audit document access in Microsoft Purview where required.
