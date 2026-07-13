# Private Render Preview Guide

This is an owner-controlled, paid-service gate. Do not create it until the owner approves the Render charge and the sanitised branch is available.

## Create an isolated Web Service

Create a second Render **Node Web Service**, not a Static Site and not the production service.

| Setting | Preview value |
|---|---|
| Repository | `NovapharmHealthacre/novapharm-website` |
| Branch | Final sanitised candidate branch |
| Runtime | Node 24 |
| Build | `npm ci --omit=dev --ignore-scripts` |
| Start | `npm run start:production` |
| Health | `/api/health` |
| Host | `0.0.0.0` |
| Custom domain | None |
| Disk | Separate preview-only disk, 5 GB, mounted at `/var/lib/novapharm-preview` |

Set `NODE_ENV=production` and `PREVIEW_MODE=true`. Set `SITE_URL`, `PUBLIC_ORIGIN` and `PUBLIC_API_ORIGIN` to the exact temporary HTTPS `onrender.com` origin. Public HTML still carries production canonical URLs, while every preview response sends `X-Robots-Tag: noindex, nofollow, noarchive` and preview `robots.txt` disallows all crawling.

## Protect the preview

Create a random temporary username and password in Render's protected environment controls:

- `PREVIEW_ACCESS_USERNAME`
- `PREVIEW_ACCESS_PASSWORD`

The service refuses to start in preview mode without both. The browser presents an HTTP authentication prompt before any page or portal login is available. Do not reuse a production or portal credential. Delete both when the preview is destroyed.

## Isolate all data

Use only these preview paths:

- `DATABASE_PATH=/var/lib/novapharm-preview/novapharm-preview.sqlite`
- `DATABASE_BACKUP_ROOT=/var/lib/novapharm-preview/backups`
- `DOCUMENT_STORAGE_ROOT=/var/lib/novapharm-preview/documents`
- `SECURE_CONTENT_ROOT=/var/lib/novapharm-preview/secure-content`

Generate a preview-only `SESSION_SECRET`. Use a separate temporary administrator bootstrap and harmless synthetic test records. Do not provide production Resend, Microsoft Graph, SharePoint, finance, logistics or customer credentials. Do not copy production SQLite data or confidential documents.

## Acceptance and deletion

1. Verify unauthenticated access returns HTTP 401.
2. Verify `/robots.txt` disallows all and ordinary pages include the noindex header.
3. Verify `/api/health` returns HTTP 200 without exposing data.
4. Complete Chromium, WebKit, accessibility, contact-failure and all-role tests using synthetic data.
5. Record screenshots and results in `audit/visual-acceptance-report.md`.
6. Delete the preview service, disk, test secrets and test data after acceptance.

Render service previews also add a noindex header, but the application gate remains required because noindex is not access control. Render's preview-environment feature may require a Pro plan; use only after owner approval: <https://render.com/docs/preview-environments>.
