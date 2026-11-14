# NovaPharm Distribution — consolidated WMS portal identity

The official owner-approved NovaPharm Distribution master vector was published in PR #670 at `assets/brand/novapharm-distribution-logo.svg`. The employee portal uses this **single canonical wordmark** and the existing first-party asset synchronisation. We deliberately do not introduce a duplicate graphite SVG or a new paid service.

## Scope

- **Product identity:** NovaPharm Distribution for the employee distribution dashboard, telesales and WMS pages.
- **Legal identity:** NovaPharm Healthcare for customer account, registration, corporate site, licensing, billing and existing secure login.
- **Paths:** the established employee routes `/employee/dashboard/`, `/employee/orders/` and `/employee/warehouse/`; no new standalone WMS.
- **Header:** canonical graphite outlined SVG with intrinsic aspect ratio 2307:408 and descriptive alt text, accessible home link and keyboard focus.
- **Metadata:** employee distribution page titles; default parent portal favicon remains until a separately governed icon asset is ready.
- **Build:** local, fail-closed source asset check; no CDN, changed warehouse permissions or customer data.
- **Coverage:** in-process route and browser acceptance enforce Distribution branding only on the relevant employee pages, and Healthcare branding elsewhere.

This is a visual product identity release, not an assertion of a live Polar Speed feed, independently reconciled available stock, operational delivery, or completed AWS portal cutover. Those remain tracked separately in issues #664 and #601.
