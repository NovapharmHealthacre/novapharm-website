# NovaPharm public-static branding release — owner signoff preflight

**Status:** Source integration complete; separately approved production publication **NOT GRANTED**.

This procedure is for the public-static branding already merged into `main` only. It does not approve Portal login, subscriptions, customer billing, external email, new paid infrastructure, vendor licenses, native enterprise integrations, medicine-data admission, or DNS/API cutovers. All eleven `productionPermissions` remain explicitly `false`, and `productionSignoff` must remain `not_granted`.

## Release candidate and required approvals

1. Review the exact current `main` commit and the already merged branding and Pages verification changes. Never use a moving tag or abbreviated SHA for a deployment.
2. Obtain a **separate, recorded owner signoff** specifically for the scope `public-static-with-preserved-contact`. Only after explicit approval, submit and merge a reviewed, CI-green change to `config/intelligence/owner-production-constraints.json` setting `publicBrandingRelease.enabled` to `true` and `publicBrandingRelease.signoff` to `granted`. Do not change any other permission, `productionSignoff`, or the approved scope.
3. Confirm the three immovable reviewed Contact blob hashes: `src/content/contact-managed-release.html` = `14591f43ff0ec6674b026a7bec629495f18fa50f`; `assets/js/contact-production.js` = `d405d459e089c3a696bd0ed6b2fb84bf529787bc`; `assets/css/novapharm-unified-20261107.css` = `9631537b380551b5dd3f8dbee81d93c3098bab54`. The approved Contact API must stay `https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com`.
4. Verify required protected checks, supply-chain policy and CodeQL on the **new exact main SHA after signoff merge**. Any failure or changed Contact hash stops the release.

## Explicit, guarded manual workflow

In GitHub Actions, open **Publish verified AWS-backed contact form** (`.github/workflows/publish-aws-contact-production.yml`). Choose **Run workflow** on `main`, with these inputs:

- `expected_sha`: the **full 40-character** approved `main` SHA, including the signoff change.
- `contact_api_origin`: `https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com`.
- `branding_only`: **true**.

Do **not** launch `pages-live-publish.yml` as a shortcut: it is a legacy public-only recovery path, not the Contact-preserving branding-only release. Do not enable the general customer-production flag or use push events to simulate manual authorisation.

The publisher itself must verify the signoff, exact checkout SHA, upstream ancestry, locked dependencies, no-email Contact health probe, existing Contact behaviour, forward-only Pages deployment, official image/CSS assets and independently checked live source receipts. A green source build alone is not a publication receipt.

## Post-deployment acceptance and stop conditions

Accept publication only after the live custom domain returns the exact approved source SHA and Royal Mineral White browser theme `#FBFAEF` across these six routes: `/`, `/legal/accessibility/`, `/contact/`, `/products/`, `/capabilities/` and `/oncology/`. Check official logos/raster checksums, responsive styling, all mandatory browser gates, and the unchanged AWS-backed Contact form, consent fields, CSP and pinned API.

If any check fails, **do not** claim launch success or broaden permissions. Preserve current production, investigate the release workflow and use the protected forward-only recovery process after separate approval. The `gh-pages` branch commit alone is not adequate proof of an Actions-artifact publication.

This preflight deliberately leaves the approval **disabled**. It does not constitute signoff or dispatch any deployment.
