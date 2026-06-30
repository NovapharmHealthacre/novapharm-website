# NovaPharm Healthcare Digital Ecosystem

This repository contains the consolidated NovaPharm Healthcare website and operating platform:

- Premium public website for NovaPharm Healthcare.
- Secure portal entry point.
- Customer portal routes for accounts, orders, invoices, statements, documents and analytics.
- Employee portal routes for customers, suppliers, products, orders, purchasing, finance, quality, regulatory, CRM and reports.
- Admin dashboard for leads, users, content, analytics and integration monitoring.
- Executive Platform integrated at `/portal/executive-platform/`.
- Canonical SQLite data model, domain services and audit logs.
- SharePoint/Microsoft Graph integration boundary.
- Polar Speed/Marken warehouse and delivery integration boundary.

## Runtime

Node 24+ is required because the backend uses Node's built-in SQLite module.

```sh
node scripts/build-pages.mjs
SESSION_SECRET=local-dev-session-secret-change-me PORTAL_USERNAME=Vishal PORTAL_PASSWORD=Vish123 node server.mjs
```

The local URL is:

```text
http://127.0.0.1:4173/
```

## Validation

```sh
node scripts/validate-site.mjs
node scripts/validate-app.mjs
node scripts/validate-domain.mjs
```

`validate-domain` runs customer onboarding, document upload, customer activation, product creation, order creation, purchase order creation, audit logging and blocked integration events against a temporary database.

## GitHub Merge

The consolidated tree can be copied into the website GitHub checkout with:

```sh
node scripts/merge-to-website-repo.mjs "/Users/vishalchakravarty/Documents/Novapharm InfoTech/novapharm-website"
```

This preserves the target `.git` folder and excludes runtime artifacts.
