# NovaPharm public-static branding release — owner signoff preflight

**Status:** Public-static-with-preserved-Contact scope was separately authorised in source commit `26432d4ac2c53a8a39b6701fa77bccda487737ed`; **production publication has not been dispatched or verified**. Recheck the exact `main` head and owner decision before any release.

This procedure is for the public-static branding already merged into `main` only. It does not approve Portal login, subscriptions, customer billing, external email, new paid infrastructure, vendor licenses, native enterprise integrations, medicine-data admission, or DNS/API cutovers. All eleven `productionPermissions` remain explicitly `false`, and `productionSignoff` must remain `not_granted`.

## Release candidate and required approvals

1. Review the exact current `main` commit and the already merged branding and Pages verification changes. Never use a moving tag or abbreviated SHA for a deployment.
2. Confirm the already recorded **separate** public-static owner signoff remains valid in the exact current `main` commit: `publicBrandingRelease.enabled` must be `true`, `publicBrandingRelease.signoff` must be `granted`, and scope must equal `public-static-with-preserved-contact`. The signoff was added by commit `26432d4ac2c53a8a39b6701fa77bccda487737ed`, which requires its own post-merge security and release checks. Never treat it as customer production consent; do not modify `productionSignoff` or any of the eleven disabled permissions.
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

This preflight records the independently approved, still **unpublished** branding-only status. It does not itself grant new signoff, activate any other production permission or dispatch a deployment.
