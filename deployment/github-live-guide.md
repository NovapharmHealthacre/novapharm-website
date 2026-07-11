# GitHub Merge and Live Deployment Guide

## Current consolidation target

The complete consolidated NovaPharm Healthcare platform now lives in:

`/Users/vishalchakravarty/Documents/NovaPharm Executive Platform`

The GitHub website checkout is:

`/Users/vishalchakravarty/Documents/Novapharm InfoTech/novapharm-website`

## Merge command

Run this only when the website checkout is writable:

```sh
cd "/Users/vishalchakravarty/Documents/NovaPharm Executive Platform"
node scripts/merge-to-website-repo.mjs "/Users/vishalchakravarty/Documents/Novapharm InfoTech/novapharm-website"
```

The script preserves the target `.git` directory, removes obsolete public Executive Platform copies, and excludes secrets and runtime folders including `.env`, `_secure`, `private-content`, `data`, `artifacts`, `.git`, `node_modules`, `.DS_Store`, and swap files.

## Commit and push

```sh
cd "/Users/vishalchakravarty/Documents/Novapharm InfoTech/novapharm-website"
node scripts/build-pages.mjs
node scripts/validate-site.mjs
node scripts/validate-app.mjs
node scripts/validate-domain.mjs
git status -sb
git add -A
git commit -m "Build unified NovaPharm digital ecosystem"
git push -u origin codex/enterprise-redesign
```

## Make novapharmhealthcare.com live

Deploy the Node runtime to a provider that supports persistent server execution, private storage and environment variables. GitHub Pages serves only the public corporate website and locked portal entry states.

Recommended options:

- Azure App Service with a custom domain.
- Azure Container Apps.
- Render, Railway or Fly.io for a managed Node deployment.
- A VPS with Node 24+, HTTPS, process manager and backups.

After deployment:

1. Add `novapharmhealthcare.com` and `www.novapharmhealthcare.com` as custom domains in the hosting provider.
2. Add the provider's DNS records at the domain registrar.
3. Enable HTTPS certificates.
4. Set every production environment variable in `deployment/environment-variables.md`, including a private `SECURE_CONTENT_ROOT` outside the repository.
5. Confirm `/api/health` returns `status: ok`.
6. Confirm `/sitemap.xml`, `/robots.txt`, `/portal/`, `/employee/dashboard/`, `/admin/dashboard/` and `/account-application/`.
