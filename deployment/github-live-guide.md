# GitHub Release Guide

## Canonical Repository

`NovapharmHealthacre/novapharm-website` is the single code repository for the corporate website, secure runtime, portal applications, architecture and deployment configuration. Controlled Executive Platform files remain in SharePoint and are intentionally excluded from Git.

## Release Branch

The production candidate is published from `codex/ultra-premium-rebuild` through a pull request to `main`.

Required pull-request checks:

```sh
npm ci --ignore-scripts
npm run check
```

Do not merge around a failed quality check. Review the claims guardrails, security changes, database/storage implications and deployment secrets before approval.

## After Merge

1. Connect `main` to the Node hosting service defined in `render.yaml` or an approved equivalent.
2. Enter production secrets in the host, not GitHub files.
3. Verify the temporary hosting URL and `/api/health`.
4. Add the apex and `www` custom domains using exact provider DNS instructions.
5. Run the smoke, security, visual and Lighthouse checks in `deployment/deployment-guide.md`.

GitHub Pages may remain a temporary public-only fallback, but it cannot be the production portal host because it cannot execute `server.mjs` or protect runtime files.
