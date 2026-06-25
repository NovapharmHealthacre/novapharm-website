# Deployment Guide

## Recommended Production Hosting
Use a Node-capable host such as Azure App Service, Azure Static Web Apps with API backend, Render, Railway or Vercel server runtime. GitHub Pages can serve public static pages but cannot securely protect the portal or use Microsoft Graph secrets.

## Run Locally

```sh
PORTAL_USERNAME=Vishal PORTAL_PASSWORD=Vish123 SESSION_SECRET=local-dev-secret-at-least-24-chars node server.mjs
```

Open:

```text
http://127.0.0.1:4173/
```

## Production Checklist
- Configure HTTPS.
- Set `SESSION_SECRET`.
- Set `PORTAL_USERNAME`.
- Set `PORTAL_PASSWORD_HASH` and `PORTAL_PASSWORD_SALT`.
- Configure Microsoft Graph variables.
- Run validation.
- Test portal login.
- Test admin routes.
- Test contact form.
- Run Lighthouse.
