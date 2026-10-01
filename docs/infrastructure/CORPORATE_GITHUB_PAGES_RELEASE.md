# Corporate Public Release

## Scope

This release publishes the owner-approved Corporate presentation through the
existing GitHub repository and custom domain. It does not publish the private
platform, medicines warehouse, API, local validation environment or secrets.

The managed application remains the default. The separate `github-pages` export
profile renders the approved public content, hero, exact outlined brand assets,
Nutraxin catalogue, leadership, articles and legal pages without a server.

Public links load complete exported documents rather than requesting a live
React Server Component navigation service. This also preserves each document's
exact build-time CSP hashes. Managed navigation retains its Next.js behaviour.

## Honest Service Boundaries

- Contact and account-interest pages offer an explicit email link to
  `vishal@novapharmhealthcare.com`. They do not collect submissions or claim
  delivery. Sending requires the visitor's email application.
- Portal access explains that sign-in is not available. No credentials are
  collected and no local validation database is exposed.
- Managed enquiry forms and their receipt, CSRF and outage controls are retained
  in source for a separately accepted authenticated backend deployment.
- No licence, regulatory authorisation, analytics or clinical result is invented.

This is public-website publication, not whole-programme production acceptance.

## Reproducible Build

Use Node 24 and the committed package lock:

```sh
npm ci --ignore-scripts
node scripts/build-corporate-pages.mjs /absolute/fresh/release-directory
node scripts/check-links.mjs /absolute/fresh/release-directory
node scripts/test-corporate-pages.mjs /absolute/fresh/release-directory /absolute/fresh/evidence-directory
```

The builder uses an isolated temporary directory. Only public source, approved
assets and public shared packages are copied. The request-time proxy and API
handler are excluded from staging, not deleted from their source. Images are
exported directly rather than pointing to a missing image-optimisation server.
The builder rejects an existing output directory and protected data destinations.

Each artifact contains a source-revision release record, approved-logo digest,
artifact fingerprint, `.nojekyll` and the existing domain `CNAME`. A separate
manifest records every file's size and SHA-256. Do not publish evidence folders
or local machine paths with the public artifact.

## Hosting and Security

GitHub Pages serves the generated public artifact from `gh-pages`. The source
implementation is reviewed separately through a bounded Corporate pull request;
the accepted dirty local programme is never pushed wholesale.

Existing domain and HTTPS settings are retained. No Azure infrastructure, tunnel,
database port, router forwarding, mailbox grant or DNS email record is changed.

Public HTML receives a build-time CSP with exact inline-script hashes, same-origin
scripts and connections, no executable objects and no form submissions. GitHub
Pages cannot provide the managed server's per-request nonce or configurable HTTP
security headers. In particular a meta CSP cannot enforce `frame-ancestors`.
Authenticated services must remain separately hosted and independently accepted.

Historical routes use canonicalised HTML redirects with an explicit fallback
link. These are not falsely described as HTTP 301 responses. The managed server's
permanent redirects remain unchanged.

## Verification and Rollback

Before publication: lint, unit tests, static production build, whole-artifact
link audit, private-control exclusion, exact logo digest, Chromium/WebKit route
and responsive checks, Axe checks, and real navigation/cookie/motion interactions.
Inspect representative desktop/mobile screenshots, not only automated results.

After publication: check the custom domain and `www`, compare `release.json` to
the reviewed source revision, inspect the hero and Nutraxin assets, exercise
navigation/contact links/cookie controls, and verify private portal unavailability.

The prior Pages configuration was `legacy`, `main`, `/`, with the same CNAME and
HTTPS enforced. Save the complete prior configuration in private release evidence.
Rollback restores that configuration without rewriting or force-pushing `main`.
Retain the generated release branch and its source revision for recovery.

The historical `pages-live-publish.yml` workflow builds the older public renderer.
Do not run that legacy deployment against this release. Consolidate its deployment
contract with this static export after the source pull request is reviewed; do not
weaken its checks or claim that its old visual contract accepted this new artifact.
