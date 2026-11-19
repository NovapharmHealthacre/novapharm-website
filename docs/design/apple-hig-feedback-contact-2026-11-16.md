# NovaPharm managed contact — Apple HIG Feedback / Entering Data acceptance

Date: 16 November 2026. Related Apple guidance:
- https://developer.apple.com/design/human-interface-guidelines/feedback
- https://developer.apple.com/design/human-interface-guidelines/entering-data
- https://developer.apple.com/design/human-interface-guidelines/loading

## Controlled behaviour
- Native form validity remains the first gate. A synchronous in-flight guard prevents rapid repeat submissions before React commits its disabled-button state.
- Form values are snapshotted at the moment the person submits, before awaiting the CSRF request, so edits during the handshake cannot change the request that was already initiated.
- Existing CSRF, scoped endpoint, server receipt verification and uncertain-outcome messaging remain unchanged.
- `aria-busy` indicates that the managed form is processing; the submit button disables; the keyboard-focusable result status remains announced.
- On a verified receipt, clear the form. On an unverified or failed outcome, preserve the entered text and do not falsely claim the enquiry was sent.
- The browser control is not a server idempotency key. Backend deduplication and retry protections still require independent testing.

## Release acceptance
1. Run dedicated source/SSR checks, corporate typecheck and existing full browser/security CI on exact PR head.
2. In Chromium/WebKit, test multiple rapid submit attempts with a delayed CSRF endpoint. Verify at most one request, same values as submitted, preserved text on failure, and accessible status/keyboard focus.
3. Verify no false positive receipts and no downgrade to account, privacy, or CRM permissions. Authenticate managed contact deployment separately; static public email-draft route is not changed.
4. Merge/deploy only after required checks and exact-SHA live acceptance. This note does not claim deployed readiness.
