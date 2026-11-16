# NovaPharm Portal — safe customer action feedback

Related Apple HIG: Entering data, Feedback, Managing accounts, Onboarding.

## Source fix

Customer support tickets, return requests and quality complaints previously cleared input fields as soon as a request was initiated. Any server failure could therefore erase an in-progress customer report.

This change:
- Retains all three customer form drafts on rejected mutations.
- Clears fields only after the protected mutation resolves successfully.
- Applies a synchronous in-flight guard and disables concurrent mutation controls.
- Announces submission state accessibly, and differentiates an accepted mutation from a failed refresh of the updated workspace.
- Makes the authenticated module refresh return a boolean rather than silently reporting success to the action panel.

This is a **source-only candidate**. The gateway remains responsible for CSRF, authentication, role checks and actual data persistence. HTTP success alone is not independent proof that downstream business actions completed, so route-specific receipts and exact-source browser tests remain a release requirement.

## Release gates

Run exact-head portal source/type tests, security and both Chromium/WebKit portal role boundaries. Test success, request rejection, uncertain response, rapid double-click, and refresh failures with a real authenticated test identity. Merge/deploy only with verified main SHA, trusted service receipt and live acceptance. No transactional action may be fabricated or simulated as complete for real customers.
