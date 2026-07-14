# Administrator Bootstrap Guide

Status: workflow implemented and tested locally; Azure execution pending  
Applies to: emergency/transition local credential only

## Secure input

The owner enters `BOOTSTRAP_ADMIN_PASSWORD` only through Azure Key Vault or a protected Azure application-setting workflow. It must never be pasted into chat, source, documentation, GitHub Actions input, terminal command text, screenshots or logs.

Required non-secret identity settings:

- `PORTAL_USERNAME=Vishal`
- `PORTAL_DISPLAY_NAME=Vishal Chakravarty`

The account receives `customer`, `employee`, `board` and `admin` scopes.

Set the protected GitHub Environment variable `NOVAPHARM_ENABLE_BOOTSTRAP_ADMIN=true` only for initialisation. Staging and the production candidate must use independent Key Vault secrets; the candidate secret name is `candidate-bootstrap-admin-password`.

## First start

1. Confirm the database is private and persistent.
2. Add the one-time secret through the approved protected field.
3. Start one application instance.
4. The server checks policy and known-breach data, creates a unique cryptographic salt, stores only PBKDF2-SHA256 output, records an audit event and marks password change required.
5. Sign in at `/portal/`; only `/portal/change-password/` is usable until completion.

## Required password change

The owner supplies the current temporary password and a new password twice over an authenticated, CSRF-protected session. The server rejects reuse, common/predictable values and known-compromised values. On success it creates a new salt/hash, increments credential version, revokes all sessions and records `password.changed` without password content.

## Remove bootstrap material

Immediately set `NOVAPHARM_ENABLE_BOOTSTRAP_ADMIN=false` and run the infrastructure `provision` action again. This removes `BOOTSTRAP_ADMIN_PASSWORD` from App Service configuration without changing application code. Disable and delete the corresponding Key Vault secret through **Key Vault > Objects > Secrets**, then restart the app and prove:

- the new password signs in;
- the temporary value does not;
- the earlier session is rejected;
- the account still has all four scopes;
- no bootstrap value appears in logs or environment exports.

After Entra administrator login and MFA are accepted, retire local password login except for an owner-approved, monitored recovery design.
