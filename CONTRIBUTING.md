# Contributing

NovaPharm changes are made through reviewed branches and pull requests. Do not commit credentials, production data, private documents, patient information or unsupported pharmaceutical claims.

Before opening a pull request:

1. Create a focused `codex/` or approved feature branch from current `main`.
2. Keep changes within the relevant application or shared ownership boundary.
3. Add or update a `.changeset/*.md` entry for materially changed workspace packages and maintain the `CHANGELOG.md` Unreleased section.
4. Run `npm ci --ignore-scripts`, `npm run check`, `npm audit --omit=dev --audit-level=high` and the applicable browser suite.
5. Update claims, evidence, architecture and operational documentation when behaviour changes.
6. Link test evidence and state every owner-controlled or external dependency honestly.
7. Request review from CODEOWNERS and do not deploy an unreviewed feature SHA.

Third-party workflow actions must use a reviewed 40-character commit SHA with the intended release line retained in a comment. New dependency licence expressions require an explicit policy and obligations review; do not weaken the validator to admit an unknown licence.

Regulated titles, licence statements, partner authorisations and product availability require evidence approval. Tests must not be weakened to make a pull request pass.

## NovaPharm interface design DNA (all applications)

For every new or materially modified interface in Corporate, Technology, Founder, Status, Customer/Employee/Executive/Admin Portal, Intelligence or Distribution/WMS:

1. Read `packages/design-system/src/layout-policy.ts` and [the 33-source official Apple layout review](docs/design/apple-layout-source-matrix-20261116.md) before selecting a layout. Follow the Apple **principles** through semantic React/HTML/CSS, not native SwiftUI/UIKit/AppKit/TVUIKit binaries, copying Apple artwork or implying Apple approval.
2. Reuse shared `@novapharm/design-system` components, tokens and `assets/css/apple-hig-layout.css`. Choose collections for image-rich items, tables for text ledgers, outline/columns for real hierarchies, one-action lockups for cards, disclosures for secondary options, splits for related panels and tab views only for a small set of closely related panes.
3. Preserve NovaPharm-approved brand marks and typography, restrained institutional red, real data provenance, existing routes, tenant and role guards, no false inventory/medicine/payment authority, and no new unauthorised cloud runtime.
4. Prove keyboard focus, readable labels, high-contrast/forced-colour operation, reduced motion, RTL, long translations, 320–1920px reflow and 200%/400% zoom with appropriate Chromium/WebKit testing. Keep essential controls available without fragile scripting.
5. Run `node --test scripts/test-apple-layout-contract.mjs scripts/test-apple-layout-organization.mjs` and `npm run workspace:check`. Add browser and authorised/denied acceptance evidence when changing interactive or protected pages. A source build or PR merge is not proof of production deployment: record the deployed commit and verify each separate live surface.

Layout review is mandatory for applicable UI work, but design patterns are **content-driven**; do not impose one visual template on every NovaPharm business function.
