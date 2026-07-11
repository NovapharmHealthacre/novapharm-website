# Production Deployment Guide

## Hosting Decision

Deploy the public website and secure API as one Node service at `https://novapharmhealthcare.com`. A split GitHub Pages and API arrangement is not the production design: Pages cannot execute authentication, persist records, protect Executive Platform files or process SharePoint workflows.

The repository includes a Render Blueprint for the initial deployment. It uses one paid Node instance and a 5 GB persistent disk. This is an appropriate launch topology for the current SQLite implementation, but it is deliberately single-instance. Move the canonical database to managed PostgreSQL before horizontal scaling or high-availability requirements.

Render reference: [Blueprint specification](https://render.com/docs/blueprint-spec), [web services](https://render.com/docs/web-services), [health checks](https://render.com/docs/health-checks).

## Pre-Deployment Gate

```sh
npm ci --ignore-scripts
npm run check
```

The gate covers the production build, metadata and schema assertions, 1,000+ local links/assets, JavaScript syntax, domain workflows and HTTP integration tests.

## Render Blueprint Deployment

1. Merge the approved pull request into `main`.
2. In Render, create a new Blueprint and connect `NovapharmHealthacre/novapharm-website`.
3. Confirm the `novapharm-healthcare` web service, Frankfurt region, Starter-or-higher plan and `/var/lib/novapharm` persistent disk.
4. Enter every `sync: false` value from `deployment/environment-variables.md`. Do not place credentials in `render.yaml` or GitHub.
5. Deploy and wait for `/api/health` to return HTTP 200 with `database: ready`.
6. Test the temporary `onrender.com` URL before changing DNS.
7. Add `novapharmhealthcare.com` and `www.novapharmhealthcare.com` as custom domains. Use the exact DNS values Render displays; do not guess records.
8. Set `www` to redirect permanently to the apex domain and confirm HTTPS certificates.
9. Re-run the smoke checklist below against the apex domain.

## Secure Content

The deployment build creates customer, employee and administrator application shells in `SECURE_CONTENT_ROOT`. At startup, `scripts/sync-secure-content.mjs` downloads the board-only Executive Platform from:

`NovaPharm Digital Ecosystem/16 Website and Portal/Executive Platform`

The sync accepts only `.html`, `.js`, `.pdf` and `.json`, rejects unsafe names and oversized files, writes atomically and records a private manifest. If Graph credentials are absent, startup continues but Executive Platform pages are unavailable. Never commit `_secure`.

## Production Smoke Test

- `GET /api/health` returns 200, application version and `database: ready`.
- `/`, `/services/`, `/regulatory-services/`, `/product-portfolio/`, `/leadership/` and an insight article render over HTTPS.
- `/sitemap.xml`, `/robots.txt` and `/feed.xml` use the apex canonical domain.
- A contact test creates one lead and sends the internal and acknowledgement emails.
- Vishal can select Customer, Employee and Board access using the same administrator identity.
- An unauthenticated request to `/portal/executive-platform/`, `/employee/dashboard/` or `/admin/dashboard/` redirects to `/portal/`.
- A signed-in administrator can open the Executive Platform and CEO dashboard.
- Logout revokes the database session and protected paths become inaccessible.
- SharePoint status is `configured` only after site, drive and credential validation.

## Security Checklist

- Production contains no `PORTAL_PASSWORD` variable.
- `SESSION_SECRET` is at least 32 random characters and differs from every non-production environment.
- Cookies are `Secure`, `HttpOnly` where appropriate and `SameSite=Lax`.
- HTTPS is enforced and `/api` state changes reject foreign browser origins.
- Microsoft Graph uses a least-privilege app registration and a rotated secret or certificate.
- Resend sender domain is verified; the notification recipient is a controlled NovaPharm mailbox.
- The persistent disk is private and `SECURE_CONTENT_ROOT` is outside the repository's public file boundary.
- Portal, employee, admin, API and error logs are reviewed after deployment.

## Monitoring Checklist

- Render HTTP health check targets `/api/health`.
- Alert on failed deploys, repeated restarts, sustained 5xx responses and disk usage above 75%.
- Review `security_events`, failed `notifications` and blocked/retrying `integration_events`.
- Monitor contact delivery and SharePoint sync freshness without logging message bodies or secrets.
- Submit the sitemap to Google Search Console and Bing Webmaster Tools after DNS stabilises.

## Backup Checklist

- Take an encrypted off-host database backup at least daily; a second copy on the same disk is not disaster recovery.
- Retain daily, weekly and monthly restore points according to the approved records policy.
- Test `PRAGMA integrity_check` and a restore into an isolated environment every quarter.
- Preserve SharePoint version history and retention labels for controlled files.
- Record backup owner, last successful run and last restore test in the operations register.

See `deployment/rollback-guide.md` before domain cutover.
