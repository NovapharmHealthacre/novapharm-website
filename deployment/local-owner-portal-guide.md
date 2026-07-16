# NovaPharm Local Owner Portal Guide

Status: local validation only
Owner: NovaPharm Healthcare Ltd
Last reviewed: 16 July 2026
Production impact: none

## Purpose

This workflow runs the PR 10 NovaPharm application privately on the owner's Mac. It binds only to `127.0.0.1:4173`, uses synthetic TEST/DEMO records, captures email locally, and does not connect to Azure, SharePoint, Microsoft Graph, Resend, analytics or the production website.

It is not approved for pharmaceutical trading, real customer onboarding, patient or adverse-event information, confidential board files, production customer records or production supplier records.

## Start

From the repository folder, run:

```bash
npm run portal:local
```

The launcher:

1. confirms Node.js 24;
2. confirms or installs the locked dependencies;
3. builds the exact PR 10 application;
4. creates the private SQLite database and synthetic records when required;
5. creates the `Vishal Chakravarty` administrator with customer, employee, board and admin scopes;
6. opens the protected temporary credential in a local Terminal window only;
7. starts the service on `http://127.0.0.1:4173`;
8. waits for both `/api/live` and `/api/ready`;
9. opens the secure portal login.

The portal ID is `vishal@novapharmhealthcare.com`. The temporary password is never stored in this repository and is never printed by the launcher process used for automated validation.

## First Login

1. Open `http://127.0.0.1:4173/portal/`.
2. Select any required access area.
3. Enter the portal ID and the temporary password shown in the protected local Terminal window.
4. The application redirects to the mandatory password-change screen.
5. Enter the current temporary password and a new strong password known only to the owner.
6. After success, every older session is invalidated and the temporary password no longer works.

The protected credential file and its display launcher are deleted automatically after the first password change succeeds. If manual removal is ever required, delete only:

- `~/Library/Application Support/NovaPharm/local-portal-credentials.txt`
- `~/Library/Application Support/NovaPharm/show-local-portal-credentials.command`

Never send either file by email or chat.

## Owner Review

After login, select Administrator and open:

`http://127.0.0.1:4173/admin/local-review/`

The owner review index links every customer, employee, board, Executive Platform and administrator module. Each module is labelled as an operational foundation, source-controlled, in development, planned or synthetic validation.

The Admin Dashboard includes:

- contact leads and consent evidence;
- account applications and immutable status history;
- account activation controls;
- synthetic quarantine and clean-test document states;
- local HTML and plain-text email previews;
- sent, retrying and blocked notification examples;
- session revocation controls.

## Stop

```bash
npm run portal:local:stop
```

Stopping the portal leaves the protected local database and files available for the next review.

## Reset

```bash
npm run portal:local:reset -- --yes
```

Reset stops the service, deletes only the synthetic local database, local uploads, local previews, local backups and temporary handoff, then creates a fresh isolated environment with a new temporary password. It does not change Git, GitHub, Azure, SharePoint, DNS or the production website.

## Local Paths

- Runtime settings: `~/Library/Application Support/NovaPharm/local-portal/portal.env`
- SQLite database: `~/Library/Application Support/NovaPharm/local-portal/novapharm-local.sqlite`
- Private documents: `~/Library/Application Support/NovaPharm/local-portal/documents/`
- Backups: `~/Library/Application Support/NovaPharm/local-portal/backups/`
- Runtime log: `~/Library/Application Support/NovaPharm/local-portal/novapharm-local.log`

Runtime settings, database files, uploads, backups and credential handoffs use owner-only file permissions and remain outside the repository.

## Safety Controls

- Host and origin are restricted to `127.0.0.1:4173`.
- Responses include `noindex`, `nofollow` and `noarchive`.
- All protected routes require a server-side session and scope.
- The administrator identity has the explicitly required four scopes.
- Temporary credentials require first-login replacement.
- Password changes rotate the salt and hash, revoke other sessions and retire the bootstrap artifacts.
- Email is local capture only and makes no provider request.
- Local scan states are explicitly synthetic and are not represented as production malware scanning.
- Local document promotion never queues SharePoint synchronisation.
- External cloud and email credentials are removed from the child environment and rejected if supplied.
- No production domain, DNS, GitHub Pages or cloud resource is changed.

## Troubleshooting

If the portal says a process is running but is not ready:

```bash
npm run portal:local:stop
npm run portal:local
```

Review the owner-only runtime log at `~/Library/Application Support/NovaPharm/local-portal/novapharm-local.log`. The application does not log passwords, session secrets or credential hashes.
