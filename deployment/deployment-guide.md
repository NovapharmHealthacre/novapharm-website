# Deployment Guide

## Recommended Hosting

Use a Node-capable production host. GitHub Pages alone is not sufficient because the portal, database, authentication, document uploads and integration workers require `server.mjs`.

Recommended:

- Azure App Service.
- Azure Container Apps.
- Render, Railway or Fly.io.
- VPS with Node 24+, HTTPS, process manager, backups and monitoring.

## Runtime

Node 24+ is required.

```sh
node scripts/build-pages.mjs
node scripts/validate-site.mjs
node scripts/validate-app.mjs
node scripts/validate-domain.mjs
NODE_ENV=production node server.mjs
```

## Local Verification

```sh
SESSION_SECRET=local-dev-session-secret-change-me PORTAL_USERNAME=Vishal PORTAL_PASSWORD=***REMOVED*** node server.mjs
```

The current Codex sandbox blocks local port binding with `listen EPERM`; run this command in a normal terminal or production host.

## Production Checklist

- Merge consolidated files into the GitHub website checkout.
- Commit and push to `NovapharmHealthacre/novapharm-website`.
- Configure Node 24+ on the host.
- Set every variable from `deployment/environment-variables.md`.
- Configure HTTPS.
- Configure persistent database storage.
- Configure Microsoft Graph and SharePoint permissions.
- Configure Polar Speed/Marken API contract variables when supplied.
- Configure backups and monitoring.
- Confirm `/api/health`.
- Confirm `/sitemap.xml` and `/robots.txt`.
- Test `/portal/`, `/employee/dashboard/`, `/admin/dashboard/` and `/account-application/`.

## Domain Go-Live

To make `novapharmhealthcare.com` live:

1. Add `novapharmhealthcare.com` and `www.novapharmhealthcare.com` to the hosting provider.
2. Point DNS records from the domain registrar to the hosting provider.
3. Enable HTTPS certificates.
4. Set `SITE_URL=https://www.novapharmhealthcare.com`.
5. Run post-deploy validation and Lighthouse.
