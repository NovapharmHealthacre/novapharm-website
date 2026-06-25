# NovaPharm SharePoint Integration

This folder contains the Microsoft 365 / SharePoint integration architecture for the NovaPharm Client Portal.

## What It Provides
- Microsoft Graph API client.
- App-only authentication using tenant ID, client ID and client secret.
- SharePoint site discovery.
- Drive/folder operations.
- Folder plan for portal document synchronization.

## Required Credentials
No credentials are stored in this repository.

Set these environment variables in production:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `SHAREPOINT_HOSTNAME`
- `SHAREPOINT_SITE_PATH`
- `SHAREPOINT_DRIVE_ID`

## Recommended Portal Folders
- Regulatory Documents
- Product Catalogues
- Company Documents
- Business Plans
- Investor Files
- Downloads
- Announcements
- Task Tracking
- Executive Platform

## Important
Folder creation cannot be performed until Microsoft Graph credentials and SharePoint site details are available.
