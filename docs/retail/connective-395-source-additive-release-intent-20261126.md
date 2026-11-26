# Connective 395 source-only Pages release intent

Owner authorisation: 26 November 2026. The goal is to publish the approved *source-reference* browsing collection for all 395 Connective product identifiers using the existing website's additive-only candidate workflow.

This release is deliberately **browse-only**. No retail consumer prices, offers, unverified ingredients, stock or claims of image rights enter the public catalogue. No changes to Nutraxin's Stripe payment flow, identity accounts, home page, header/footer, external AK Online Service or already-live paths.

Source commit: dc71aee2cfab942aece1b0392c8cca354fd74935. The protected GitHub Actions workflow `.github/workflows/connective-source-only-live-candidate.yml` must wait for successful `Production readiness` on a current `main` commit tagged `[connective-source-additive]`, stage 395 product pages and a collection **from the current live gh-pages branch**, then open a PR into `gh-pages`. Neither this marker nor merging it is evidence that the PR to `gh-pages` has merged or that customers can pay.

Acceptance: the live branch is never reset; all unchanged files remain byte-identical; final production URL checks must succeed before marking browse pages live.
