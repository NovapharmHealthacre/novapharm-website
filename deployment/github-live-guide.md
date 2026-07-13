# GitHub Release Guide

## Canonical repository

`NovapharmHealthacre/novapharm-website` is the single code repository for the public website, secure Node runtime, portal applications, architecture and deployment configuration. Controlled Executive Platform documents remain in SharePoint and are intentionally excluded from Git.

## Verified post-merge state

- Pull Request 2 is closed and merged.
- Its squash merge is `189da77fdaff9ac5c79d39af60e93dbb06a48e58` on `main`.
- The post-launch candidate branch is `codex/post-launch-production-completion`.
- That branch was created from the verified merge commit and must be proposed to `main` through a new pull request.
- Do not reuse `codex/ultra-premium-rebuild`.

Required candidate checks:

```sh
npm ci --ignore-scripts
npm audit --omit=dev --audit-level=high
npm run check
```

Do not merge around a failed check. Review pharmaceutical claims, authentication and database migrations, private-storage boundaries, generated media provenance and deployment secrets before approval.

## Release order

1. Review and approve the new post-launch pull request after its connected checks pass.
2. Squash-merge only with explicit owner approval; keep the source branch until production cutover is stable.
3. Create the Render Node service from `main` using `render.yaml` and enter protected secrets in Render.
4. Complete the private temporary-URL acceptance matrix, including real Chromium and WebKit evidence.
5. Configure the one-time administrator bootstrap, force the password change and remove the bootstrap secret.
6. Verify contact email, all portal roles, persistence, private documents and backup/restore.
7. Change website DNS only after separate owner approval and temporary-URL acceptance.
8. Retire GitHub Pages only after both production domains pass HTTPS and application acceptance.

GitHub Pages remains a public-only continuity host during this process. It cannot run `server.mjs`, authenticate users or safely serve confidential portal data.
