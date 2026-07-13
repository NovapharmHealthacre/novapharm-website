# NovaPharm Healthcare Digital Ecosystem

NovaPharm's single repository contains the premium public corporate website, secure customer/employee/board portal, canonical operational data model and governed integration boundaries for SharePoint, Microsoft 365, warehouse services and finance.

## Applications

- Public pharmaceutical company, services, regulatory, portfolio, partnership, leadership and insight pages.
- Controlled customer account application with document intake.
- Customer workspace for account, catalogue, orders, finance, documents and support.
- Employee workspace for customer, supplier, product, order, purchasing, quality and regulatory operations.
- Board-only Executive Platform and CEO dashboard hydrated from SharePoint.
- Administrator workspace for leads, users, content, analytics and integration status.

## Local Runtime

Node 24 is required because the canonical database uses Node's built-in SQLite module and the release is pinned to that major runtime.

```sh
npm ci
npm run build
npm run check
npm start
```

Create a local `.env` from `.env.example`. Production uses a protected one-time bootstrap or an existing persistent hashed identity. A plaintext `PORTAL_PASSWORD` is rejected in production.

The default local address is `http://127.0.0.1:4173/`.

## Production

`render.yaml` defines the initial single-instance Node deployment with a persistent disk, application health check and secret prompts. `Dockerfile` provides a portable deployment path. The public site and API must share `https://novapharmhealthcare.com`; GitHub Pages is suitable only as a temporary static fallback because it cannot authenticate portal users or run workflows.

Controlled Executive Platform files are never committed. `scripts/sync-secure-content.mjs` hydrates them from SharePoint into `SECURE_CONTENT_ROOT` at startup when Graph credentials are configured.

See [deployment/deployment-guide.md](deployment/deployment-guide.md) and [deployment/environment-variables.md](deployment/environment-variables.md).

## Quality Gate

`npm run check` rebuilds the site, validates metadata, structured data, public claims and protected-shell contracts, checks internal links, scans for secrets and artefacts, exercises domain workflows and runs the HTTP and production-security integration suites. The same command runs in `.github/workflows/ci.yml` after the package advisory audit.
