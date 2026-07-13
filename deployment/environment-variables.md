# Production Environment Variables

## Required Runtime

| Variable | Requirement |
| --- | --- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | Supplied by Render; do not create it manually |
| `SITE_URL` | `https://novapharmhealthcare.com` |
| `PUBLIC_ORIGIN` | `https://novapharmhealthcare.com` |
| `PUBLIC_API_ORIGIN` | `https://novapharmhealthcare.com` |
| `DATABASE_PATH` | Persistent private path, currently `/var/lib/novapharm/novapharm.sqlite` |
| `DATABASE_BACKUP_ROOT` | Persistent backup path, currently `/var/lib/novapharm/backups` |
| `SECURE_CONTENT_ROOT` | Persistent private path, currently `/var/lib/novapharm/secure-content` |
| `DOCUMENT_STORAGE_ROOT` | Persistent private path, currently `/var/lib/novapharm/documents` |
| `SESSION_SECRET` | Protected value containing at least 32 random bytes |
| `SESSION_TTL_MS` | Optional; defaults to eight hours |

## Administrator Identity

| Variable | Requirement |
| --- | --- |
| `PORTAL_USERNAME` | `Vishal` |
| `PORTAL_DISPLAY_NAME` | `Vishal Chakravarty` |
| `BOOTSTRAP_ADMIN_PASSWORD` | One-time protected Render secret; delete after the first password change |
| `PORTAL_USERS_JSON` | Optional hashed customer, employee or board identities; every client identity requires its canonical `customerId` |

The bootstrap value is entered only in Render's protected secret field. On first start, the service stores a unique salt and PBKDF2-SHA256 hash in the persistent identity store and marks the account for mandatory password change. Delete the Render bootstrap variable immediately after that change. `PORTAL_PASSWORD` is rejected in production. The administrator receives customer, employee, board and administrator scopes.

The production runtime fails closed when no persistent administrator exists, when a completed bootstrap secret is still present after restart, or when persistent paths, HTTPS origin or public host binding are missing or inconsistent.

## Contact Email

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CONTACT_NOTIFICATION_TO`

All three are required for live internal and acknowledgement emails. The enquiry is still stored if email delivery fails, and delivery failure is recorded without exposing the provider response to the visitor.

## Microsoft Graph and SharePoint

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `SHAREPOINT_HOSTNAME=your-tenant.sharepoint.com`
- `SHAREPOINT_SITE_PATH=/sites/your-site`
- `SHAREPOINT_DRIVE_ID` (optional when the site's default drive is correct)
- `SHAREPOINT_EXECUTIVE_PLATFORM_PATH`
- `SECURE_CONTENT_MAX_FILE_BYTES` (defaults to 25 MB)

The Graph application must be approved through Microsoft Entra ID. Do not use delegated personal tokens in the production runtime.

## External Operations

- `POLAR_SPEED_API_BASE_URL`
- `POLAR_SPEED_API_KEY`
- `POLAR_SPEED_ACCOUNT_NUMBER`
- `POLAR_SPEED_RESERVE_STOCK_PATH`
- `POLAR_SPEED_DISPATCH_PATH`
- `POLAR_SPEED_TRACKING_PATH`
- `POLAR_SPEED_INVENTORY_PATH`
- `POLAR_SPEED_TIMEOUT_MS`
- `FINANCE_API_BASE_URL`
- `FINANCE_API_KEY`

Leave these unset until the provider contract and data-processing terms are approved. The UI reports `api_contract_required` or `provider_required`; it does not simulate live data.

## Microsoft Entra SSO Roadmap

- `ENTRA_CLIENT_ID`
- `ENTRA_TENANT_ID`
- `ENTRA_REDIRECT_URI=https://novapharmhealthcare.com/api/auth/entra/callback`

The current production-ready local credential flow is server-side and hashed. Entra SSO variables are reserved for the next identity-provider implementation and do not activate SSO by themselves.
