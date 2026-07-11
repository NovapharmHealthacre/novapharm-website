# Production Environment Variables

## Required Runtime

| Variable | Requirement |
| --- | --- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | Supplied by the host; defaults to `4173` |
| `SITE_URL` | `https://novapharmhealthcare.com` |
| `PUBLIC_ORIGIN` | `https://novapharmhealthcare.com` |
| `PUBLIC_API_ORIGIN` | `https://novapharmhealthcare.com` |
| `DATABASE_PATH` | Persistent private path, currently `/var/lib/novapharm/novapharm.sqlite` |
| `SECURE_CONTENT_ROOT` | Persistent private path, currently `/var/lib/novapharm/secure-content` |
| `DOCUMENT_STORAGE_ROOT` | Persistent private path, currently `/var/lib/novapharm/documents` |
| `SESSION_SECRET` | At least 32 random characters |
| `SESSION_TTL_MS` | Optional; defaults to eight hours |

## Administrator Identity

| Variable | Requirement |
| --- | --- |
| `PORTAL_USERNAME` | Initial administrator username |
| `PORTAL_DISPLAY_NAME` | Public-safe display name |
| `PORTAL_PASSWORD_HASH` | 64-character PBKDF2-SHA256 hash |
| `PORTAL_PASSWORD_SALT` | Random hexadecimal salt |
| `PORTAL_USERS_JSON` | Optional hashed customer, employee or board identities |

Generate a hash and salt in a controlled terminal:

```sh
PORTAL_PASSWORD='temporary value entered locally' npm run hash:password
```

Set only the resulting hash and salt in production. `PORTAL_PASSWORD` is rejected when `NODE_ENV=production`. Vishal's administrator identity receives customer, employee, board and administrator scopes.

## Contact Email

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CONTACT_NOTIFICATION_TO`

All three are required for live internal and acknowledgement emails. The enquiry is still stored if email delivery fails, and delivery failure is recorded without exposing the provider response to the visitor.

## Microsoft Graph and SharePoint

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `SHAREPOINT_HOSTNAME=novapharmhealthcare.sharepoint.com`
- `SHAREPOINT_SITE_PATH=/sites/NovapharmTier1`
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
