NovaPharm SEO Pages preflight — 20 November 2026

The official site is served by GitHub Pages and currently contains an active AWS-backed contact form. The normal PUBLIC_ONLY build would replace that active form with a mailto fallback, and the existing manual recovery workflow correctly blocks such downgrades.

The preflight validates the 19 Nutraxin offers, canonical URLs, concise metadata, structured Product/Offer descriptions, sitemap entries, public crawler access, existing training opt-outs and the public AI source guide. It separately verifies the live contact form and owner production approval. The preflight produces an inspectable report but has no deploy permissions and never activates a customer service.

A passing CI run can still report HELD_FOR_SAFETY_AND_OWNER_APPROVAL; passing CI is NOT production signoff. Publication requires a separately authorised contact-preserving full-artifact publisher, including an approved AWS origin and existing security/commerce acceptance. Re-verify live product pages, feed, contact, robots and AI guide after release. Google indexing and AI model citations remain external outcomes, not guarantees.

Expanded isolated CI validation also tests the current verified production contact API origin against a contact-preserving temporary artifact. It never makes AWS requests or deploys. Reports are saved separately for the public-only and contact-preserving candidates. Any mismatch in the public data-api-origin fails closed even if other gates pass.
