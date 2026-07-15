# Transactional Email Provider Decision

**Status:** Implemented adapters; production provider owner-controlled
**Decision date:** 15 July 2026
**Owner:** NovaPharm platform administrator

## Decision

The SQL notification outbox is the authoritative delivery record. Application
requests commit before any provider call, and an email outage never removes a
valid lead or application. `EMAIL_PROVIDER` selects one of two server-only
adapters:

- **Resend:** preferred for production when provider-side idempotency is
  required. Each delivery uses the durable notification ID as Resend's
  `Idempotency-Key` and includes HTML and plain-text bodies.
- **Microsoft Graph:** supported for an approved NovaPharm mailbox. It sends a
  MIME `multipart/alternative` message through `/users/{sender}/sendMail`,
  retries `429` and transient `5xx` responses, and uses an internal immutable
  notification identifier. Microsoft Graph does not provide an equivalent
  provider-side idempotency key, so delivery is at-least-once across an
  ambiguous network failure.

`auto` selects Resend when its protected key resolves, then Microsoft Graph
when a sender and Graph identity resolve. The browser receives no provider
credential and cannot select a provider.

## Verified Microsoft context

The delegated company connector confirms that the signed-in NovaPharm identity
has a Microsoft 365 mailbox. This verifies tenant context only. It does not
grant the deployed application `Mail.Send`, approve a sender alias, or prove
production delivery. Those remain Microsoft-administrator actions.

## Graph permission boundary

Use the App Service managed identity where the tenant supports the required
Graph app-role assignment. Restrict it to the approved sender mailbox with an
Exchange application access policy or the current supported equivalent. Do not
grant a browser token, use a personal refresh token, or store a client secret in
Git. A client-secret configuration remains a documented fallback only.

## Failure and replay model

Notifications move through `pending`, `sending`, `sent`, `retrying` and
`blocked`. Claims are atomic, stale `sending` claims are recoverable, retry is
bounded to eight attempts, and only an authenticated administrator can replay a
blocked item. Provider errors are reduced to safe codes; response bodies,
tokens, messages and credentials are not persisted in failure metadata.

## Production acceptance gate

Before enabling either provider, verify the sender, recipient, SPF/DKIM/DMARC
posture, acknowledgement rendering, transient failure retry and duplicate
behaviour against synthetic submissions. No live provider test has been
claimed by this repository change.
