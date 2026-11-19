# NovaPharm Intelligence customer access ledger

This is a **production infrastructure foundation, not a customer launch certificate**.

Table: novapharm-intelligence-customer-access (AWS Stockholm / eu-north-1).
Encryption: AWS-managed DynamoDB KMS, PITR, TTL on ttlEpoch and deletion protection. No public IAM policy. Never put credentials, OAuth codes, tokens, clinical content or raw payment details in a row.

## Keys, enforced by the server-side application (not client claims)

- PK=TENANT#<tenantId>, SK=META: approved organisation, signed contract, owner, seat limit, status.
- PK=SUBJECT#<CognitoSub>, SK=TENANT#<tenantId>: approved membership; no auto-provisioning from Cognito or Stripe.
- PK=TENANT#<tenantId>, SK=SEAT#<CognitoSub>: role, feature allowlist and incrementing sessionVersion (revoke by rotating version).
- PK=SESSION#<sha256(opaqueCookie)>, SK=META: Cognito subject, tenant, MFA-attested identity, issuedAt, expiresAt (ISO-8601), ttlEpoch (Unix seconds), status, revocation. Authorization checks expiresAt on every read, never rely on DynamoDB TTL deletion timing.
- PK=TENANT#<tenantId>, SK=BILLING#<CognitoSub>: explicitly reconciled, signature-backed Stripe subscription and accepted contract.
- PK=TENANT#<tenantId>, SK=USAGE#<CognitoSub>#YYYY-MM: authoritative feature usage.

Tenant, membership, seat, session, billing and usage loads must use strongly consistent reads. Grant issuance and seat limit increments must use conditional TransactWriteItems. Never trust an incoming tenant/role field. The access decision module takes only the opaque session cookie and feature from a request. Ledger adapters are **not yet wired to the production callback or medicine API**.

## Launch gates still open

1. Owner-approved tenant and contract enrolment workflow and managed seat invitations, with suppression of unsolicited outbound customer email.
2. Server-side callback creates a short-lived, revocable application session only after verified Cognito identity, MFA attestation, explicitly approved tenant/seat and authenticated backing store. Use __Host-npi_session HttpOnly Secure SameSite=Lax, bounded by 12 hours; implement logout, revocation and session rotation. Do NOT use legacy np_session or staff/admin scopes.
3. Permission-scoped API authorizer must read the ledger with least-privilege AWS IAM, enforce cross-tenant negative tests on every route, and verify Stripe entitlement, feature release, source rights and quota for each request.
4. Signed Stripe reconciliation + contract acceptance, versioned customer/seat audit events, backup restore, logs, rate limiting, threat model, pen test, accessibility and real two-tenant/MFA/end-to-end smoke.
5. Production deployment of the app container with immutable exact-head provenance, independent test, DNS/browser validation and owner acceptance. Never claim live customer access based solely on successful infrastructure deployment.

No production customer users, accounts, seats, medicine datasets or billing grants are created by this change.
