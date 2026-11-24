# One production website publisher — 2026-11-24

Incident: branch-based Pages deployment 45437827470, from gh-pages commit 4c641e6c, replaced the successful main artifact release 45419712360 with legacy website content. Both the coupon and Klarna assets now exist byte-identically in main (merge 8c947fd7). Do not republish gh-pages, and do not recreate old public artifacts.

Owner-scoped recovery:
1. Wait for mandatory checks and merge this PR normally.
2. Repository Settings > Pages > Build and deployment > Source: **GitHub Actions**. Keep custom domain and enforced HTTPS unchanged. The connector cannot change that setting. Do not select a branch.
3. Dispatch **Publish verified AWS-backed contact form** from main with the exact reviewed main SHA, existing pinned contact API origin, and branding_only=true. Retain the existing explicit branding-only signoff and denied customer permissions. The ancestry guard accepts only the exact reviewed legacy Klarna commit and verifies main contains the same two retail assets. It fails closed for every other unrelated legacy commit.
4. The publisher now checks the 30 public design routes before uploading the artifact, requires Actions-only Pages mode and existing domain/HTTPS before deployment, and verifies the same routes at the exact deployed SHA. The existing Contact, commerce, security and visual checks remain mandatory. Retain the post-release monitor.
5. Confirm product and bag interactions, header/footer geometry and Contact form rendering in browser acceptance; no live test payments or submissions. Do not claim release success for skipped jobs or a green workflow summary alone.

No branch rewrite, no new paid infrastructure, no change to payments, customer permissions or API access. The disabled gift-card preview must not be treated as an activated gift-card product. This procedure retires the one-time archive restoration route; the canonical build already includes the required retail changes. For future releases, make changes in main and publish solely through the guarded workflow.
