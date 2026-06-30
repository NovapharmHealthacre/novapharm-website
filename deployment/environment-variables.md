# Environment Variables

## Runtime

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=4173`
- `SITE_URL=https://www.novapharmhealthcare.com`
- `DATABASE_PATH=/var/lib/novapharm/novapharm.sqlite`
- `SESSION_SECRET`

## Initial Admin User

- `PORTAL_USERNAME=Vishal`
- `PORTAL_PASSWORD_HASH`
- `PORTAL_PASSWORD_SALT`

Local verification only:

- `PORTAL_PASSWORD=***REMOVED***`

Do not set `PORTAL_PASSWORD` in production.

## Microsoft Graph / SharePoint

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `SHAREPOINT_HOSTNAME`
- `SHAREPOINT_SITE_PATH`
- `SHAREPOINT_DRIVE_ID`

## Polar Speed / Marken

- `POLAR_SPEED_API_BASE_URL`
- `POLAR_SPEED_API_KEY`
- `POLAR_SPEED_ACCOUNT_NUMBER`
- `POLAR_SPEED_RESERVE_STOCK_PATH`
- `POLAR_SPEED_DISPATCH_PATH`
- `POLAR_SPEED_TRACKING_PATH`
- `POLAR_SPEED_INVENTORY_PATH`
- `POLAR_SPEED_TIMEOUT_MS=30000`

## Finance Provider

- `FINANCE_API_BASE_URL`
- `FINANCE_API_KEY`

## Microsoft Entra ID

- `ENTRA_CLIENT_ID`
- `ENTRA_TENANT_ID`
- `ENTRA_REDIRECT_URI=https://www.novapharmhealthcare.com/api/auth/entra/callback`
