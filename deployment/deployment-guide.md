# NovaPharm Production Deployment Guide

This guide is written for the company owner. Complete the steps in order. Do not change DNS or turn off the current site until the temporary Render address has passed every acceptance test.

## 1. What Render Must Create

Use the repository Blueprint. It creates one paid **Node Web Service** named `novapharm-healthcare`; do not create a Static Site.

| Setting | Exact value |
| --- | --- |
| Repository | `NovapharmHealthacre/novapharm-website` |
| Branch | `main`, after pull request 2 is approved and merged |
| Runtime | Node |
| Node version | 24, enforced by `package.json`, `.node-version` and `NODE_VERSION` |
| Region | Frankfurt |
| Plan | Starter or higher |
| Build command | `npm ci --omit=dev --ignore-scripts` |
| Start command | `npm run start:production` |
| Health-check path | `/api/health` |
| Auto-deploy | Only after repository checks pass |
| Service instances | One while SQLite and a persistent disk are used |

The application reads Render's `PORT` automatically and binds it on `0.0.0.0`. Render terminates public TLS and forwards the request to the Node service. The application uses `PUBLIC_ORIGIN` for origin checks and always issues `Secure`, `HttpOnly` session cookies in production.

## 2. Create The Service

1. Sign in to Render and choose **New +**, then **Blueprint**.
2. Connect the GitHub account that owns `NovapharmHealthacre/novapharm-website`.
3. Select the repository and approve the `render.yaml` Blueprint.
4. Confirm that Render proposes a **Web Service**, not a Static Site.
5. Confirm the service name, Frankfurt region, paid plan, build command, start command and health path shown above.
6. Do not deploy until the disk and every required environment value below are present.

## 3. Persistent Disk

Create the disk exactly as follows:

| Setting | Exact value |
| --- | --- |
| Disk name | `novapharm-runtime` |
| Size | 5 GB initially |
| Mount path | `/var/lib/novapharm` |

Only files below the mount path survive a restart or deploy. The application therefore uses:

- Database: `/var/lib/novapharm/novapharm.sqlite`
- Database backups: `/var/lib/novapharm/backups`
- Private uploaded documents: `/var/lib/novapharm/documents`
- Private Executive Platform cache: `/var/lib/novapharm/secure-content`

Do not change these to `/tmp`, the repository folder or another ephemeral location. A disk-backed SQLite service must remain a single Render instance.

## 4. Environment Variables

Enter values in Render under **Environment**. Never place secret values in GitHub, `render.yaml`, screenshots, tickets or email.

### Required application values

| Variable | Value or source |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24` |
| `HOST` | `0.0.0.0` |
| `PORT` | Do not create this; Render supplies it |
| `SITE_URL` | `https://novapharmhealthcare.com` |
| `PUBLIC_ORIGIN` | `https://novapharmhealthcare.com` |
| `PUBLIC_API_ORIGIN` | `https://novapharmhealthcare.com` |
| `DATABASE_PATH` | `/var/lib/novapharm/novapharm.sqlite` |
| `DATABASE_BACKUP_ROOT` | `/var/lib/novapharm/backups` |
| `SECURE_CONTENT_ROOT` | `/var/lib/novapharm/secure-content` |
| `DOCUMENT_STORAGE_ROOT` | `/var/lib/novapharm/documents` |
| `SESSION_SECRET` | Generate a new random value of at least 32 characters in Render |
| `SESSION_TTL_MS` | `28800000` for an eight-hour session |
| `PORTAL_USERNAME` | Initial administrator username |
| `PORTAL_DISPLAY_NAME` | Administrator display name |
| `PORTAL_PASSWORD_SALT` | Generated locally as described below |
| `PORTAL_PASSWORD_HASH` | Generated locally as described below |

Production deliberately refuses to start if the persistent paths, HTTPS origins, `0.0.0.0` host or hashed administrator are missing or inconsistent. Never create `PORTAL_PASSWORD` in production.

### Resend contact-email values

Create these in the Resend dashboard after verifying a NovaPharm sending domain:

| Variable | Source |
| --- | --- |
| `RESEND_API_KEY` | New restricted API key from Resend |
| `EMAIL_FROM` | Verified sender, for example `NovaPharm Healthcare <website@notifications.novapharmhealthcare.com>` |
| `CONTACT_NOTIFICATION_TO` | Controlled NovaPharm mailbox that receives website enquiries |

The database records a valid enquiry even if Resend is temporarily unavailable. The visitor receives a professional success response and the failed notification is recorded for retry or investigation.

### Microsoft Graph and SharePoint values

Create an application registration in Microsoft Entra ID. Use application permissions approved by the Microsoft 365 administrator and least-privilege `Sites.Selected` access where practical.

| Variable | Source |
| --- | --- |
| `MICROSOFT_TENANT_ID` | Entra tenant Overview page |
| `MICROSOFT_CLIENT_ID` | Entra application Client ID |
| `MICROSOFT_CLIENT_SECRET` | New Entra application secret; record it once in Render |
| `SHAREPOINT_HOSTNAME` | Your Microsoft 365 tenant hostname, such as `your-tenant.sharepoint.com` |
| `SHAREPOINT_SITE_PATH` | The approved site path, such as `/sites/your-site` |
| `SHAREPOINT_DRIVE_ID` | Documents library drive ID, or leave unset only when the default site drive is confirmed |
| `SHAREPOINT_EXECUTIVE_PLATFORM_PATH` | The approved controlled folder path supplied by the SharePoint owner |
| `SECURE_CONTENT_MAX_FILE_BYTES` | `26214400` |

Do not use a personal delegated access token. The production service uses client credentials and downloads controlled Executive Platform files into the private disk cache during startup.

### Variables that remain disabled until contracts exist

Leave Polar Speed/Marken, finance-provider and Entra SSO variables unset until their approved API contracts and implementation are available. Empty values keep the interface in a truthful `credentials_required`, `api_contract_required` or `provider_required` state.

## 5. Generate The Administrator Hash And Salt

Use a trusted computer in the checked-out repository. The password is entered silently and is not written to the repository:

```sh
read -s PORTAL_PASSWORD
export PORTAL_PASSWORD
npm run hash:password
unset PORTAL_PASSWORD
```

The command prints two new values. Put only `PORTAL_PASSWORD_SALT` and `PORTAL_PASSWORD_HASH` into Render. Close the terminal after confirming the values are stored. Do not store the plaintext password in Render, GitHub or a document.

## 6. Create Initial Portal Users

The two administrator variables create the first administrator. That account receives customer, employee, board and administrator scopes.

Additional users are supplied through `PORTAL_USERS_JSON` as a JSON array containing a username, display name, role, generated hash and generated salt. Customer users must also contain the canonical `customerId`; the service rejects a customer identity without that link. Supported roles are `client`, `employee`, `board` and `admin`.

Environment-defined identities are safely provisioned into the persistent SQLite tables at startup. Sessions are stored in `auth_sessions` inside the same persistent database and survive ordinary service restarts until expiry or logout. Account-application activation creates an invited customer record, but credentials must still be issued through an approved identity process.

## 7. First Deployment At The Temporary Address

1. Click **Apply** or **Deploy Blueprint**.
2. Wait for the build and start logs to complete.
3. Open the Render `onrender.com` address.
4. Open `/api/health`; require HTTP 200, `status: ok`, `database: ready` and `environment: production`.
5. Test the homepage, mobile menu, contact form and all four portal roles.
6. Confirm an unauthenticated visit to `/portal/executive-platform/`, `/employee/dashboard/` and `/admin/dashboard/` redirects to `/portal/`.
7. Confirm `/_secure/`, `/data/`, `/database/`, `/src/`, `/deployment/` and `/docs/` cannot be read without the required route and role.
8. Upload one harmless test PDF through the intended workflow and confirm it exists only below `/var/lib/novapharm/documents` and in the authorised SharePoint location.
9. Delete the test records through the approved administration process or clearly mark them as test data.

Do not change DNS unless all nine checks pass.

## 8. Add The Custom Domains

1. In the Render service, open **Settings**, then **Custom Domains**.
2. Add `novapharmhealthcare.com` first. Render automatically adds `www.novapharmhealthcare.com` and redirects it to the apex domain.
3. At the DNS provider, record the current GitHub Pages records before editing them.
4. Remove conflicting `AAAA` records for the apex and `www`; Render currently routes custom domains over IPv4.
5. For a conventional DNS provider, set:
   - Apex host `@`: `A` record to `216.24.57.1`, or use the provider's supported `ALIAS`/`ANAME` to the exact Render service hostname.
   - Host `www`: `CNAME` to the exact `*.onrender.com` hostname shown for this service.
6. For Cloudflare, use CNAME flattening to the Render hostname as described by Render instead of the apex A record.
7. Remove only the old apex and `www` records that conflict with Render. Do not remove mail, Microsoft 365, verification, SPF, DKIM, DMARC or unrelated subdomain records.
8. Return to Render and click **Verify** for both domains.
9. Wait for Render to issue TLS certificates. Confirm `http://` redirects to `https://` and `www` redirects permanently to the apex domain.
10. Confirm `PUBLIC_ORIGIN`, `PUBLIC_API_ORIGIN` and `SITE_URL` still exactly match the apex HTTPS URL.

## 9. Retire GitHub Pages Without A Gap

Do this only after the Render apex site has passed the post-deployment acceptance test:

1. In GitHub, open `NovapharmHealthacre/novapharm-website`.
2. Open **Settings**, **Pages**.
3. Use the menu beside the live-site message and choose **Unpublish site**.
4. Remove the GitHub Pages custom-domain setting after Render owns the verified domain.
5. Remove the repository `CNAME` file in a separate reviewed commit after cutover. It is retained during migration so the existing Pages site remains available before DNS changes.
6. Keep the old Pages deployment details and DNS snapshot in the rollback record.

## 10. Data And Content Migration Behaviour

| Existing item | What happens at cutover |
| --- | --- |
| `novapharmhealthcare.com` | Continues on GitHub Pages until its DNS record is changed; then serves the Render Node application |
| `www.novapharmhealthcare.com` | Becomes a Render-managed redirect to the apex domain after verification |
| GitHub Pages | Remains a temporary fallback until explicitly unpublished after acceptance |
| Existing DNS | Only conflicting web records change; mail and Microsoft 365 records remain untouched |
| Existing portal users | Static Pages users are not server accounts; the first persistent accounts come from hashed Render environment configuration |
| Existing contact submissions | The previous static site did not write to this SQLite database; export any records held by an external form provider before cutover |
| Existing SQLite data | No local Mac database is uploaded automatically; restore an approved existing production backup before opening traffic, otherwise a new empty database is created |
| SharePoint content | Remains the controlled source; Render downloads a private runtime copy and does not move or delete the SharePoint originals |
| Existing public HTML | Remains in the repository and is served by the Node application |
| Existing images | Retained unless deliberately superseded; the approved logo SVG and PNG become the canonical identity files |
| Indexed URLs and inbound links | Primary paths and apex canonicals are preserved; legacy paths use noindex redirects to their new canonical destinations |
| Search rankings | No ranking can be guaranteed; risk is reduced by preserving URLs, content intent, canonicals, sitemap, redirects and continuous HTTPS |

## 11. Back Up The Database

Render's disk snapshots are useful for files, but a consistent SQLite backup must be created through SQLite rather than by copying a live database file.

1. Open the Render service Shell.
2. Run `npm run backup:database`.
3. Record the printed backup path and SHA-256 checksum.
4. Run `npm run verify:backup -- /var/lib/novapharm/backups/<backup-file>.sqlite` using the printed filename.
5. Transfer the verified backup to encrypted off-host storage using Render SSH/SFTP.
6. Keep daily, weekly and monthly copies according to the approved retention policy.

### Restore safely

1. Put the service in maintenance mode or stop incoming writes.
2. Create a final backup and retain the failed database for investigation.
3. Verify the proposed restore file with `npm run verify:backup -- <backup-path>`.
4. Stop the service before replacing `/var/lib/novapharm/novapharm.sqlite`.
5. Replace the database with the verified backup; remove stale `-wal` and `-shm` files only while the service is stopped.
6. Start the service and require `/api/health` to return 200.
7. Test login, contact storage, customer-scoped orders and audit records before reopening traffic.

## 12. Final Contact And Portal Tests

- Submit one valid contact enquiry and confirm both the internal email and visitor acknowledgement.
- Submit an invalid form and confirm field-level guidance without a raw browser error.
- Confirm a simulated email-provider failure still stores the lead and does not expose provider details.
- Sign in as Customer and confirm only that customer's account, orders and documents are visible.
- Sign in as Employee and confirm customer/supplier/product operations, but no administrator page.
- Sign in as Board and confirm only the Executive Platform and permitted board content.
- Sign in as Administrator and confirm all four scopes.
- Sign out and confirm the previous protected URL is no longer accessible.
- Confirm repeated failed sign-ins trigger lockout and rate limiting.

## 13. Roll Back

1. In Render, choose the last deployment whose GitHub checks and smoke tests passed, then use **Rollback** or redeploy that immutable commit.
2. Keep the same disk attached; an application rollback must not overwrite the current database or uploaded documents.
3. If the database changed incompatibly, follow the verified database restore procedure above.
4. Re-test health, homepage, contact, all portal roles and private-file controls.
5. During the agreed emergency window only, restore the recorded previous web DNS target. Never send authenticated portal routes to GitHub Pages.

The deeper rollback notes are in `deployment/rollback-guide.md`. Render's current provider instructions are at <https://render.com/docs/custom-domains>, <https://render.com/docs/configure-other-dns>, <https://render.com/docs/disks> and <https://render.com/docs/web-services>.
