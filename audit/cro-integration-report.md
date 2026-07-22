# CRO Integration Report

Candidate date: 18 July 2026

Status: repository integration passed

## Integrated surfaces

| Surface | Integration |
| --- | --- |
| Global navigation | CRO added between Regulatory and Products on generated public pages; breakpoint adjusted to prevent crowding. |
| Footer | Clinical Research & CRO added to the Capabilities group. |
| Homepage | Evidence-architecture bridge with explicit not-full-service boundary and contextual CTA. |
| Services | Connected capability band linking to the CRO proposition. |
| Regulatory | UK pathway connection to quality and governance. |
| Partners | CRO and specialist-provider context included without publishing unapproved partner names or logos. |
| Technology | Programme evidence, responsibility and sponsor-visibility link. |
| Insights | Related existing evidence selected; no article is misrepresented as a clinical-trial case study. |
| Contact | New controlled enquiry option, query-string preselection and safety warning. |
| SEO/GEO | Metadata, social image, schemas, sitemaps and generated registers. |
| Build | CRO generated from `src/content/cro-content.mjs`; deterministic CSS bundle produced during build. |
| Validation | CRO content, claims, links, visual contracts, browser matrix and Lighthouse evidence. |

## Architecture decisions

The implementation remains inside the existing Node/static-generation architecture. It adds no framework, client router, external widget, analytics dependency, database migration or authentication path. `assets/js/cro.js` only enhances visible server-generated content; disabling it does not remove information or actions.

Media is local, responsive and recorded in `docs/cro-media-provenance.json`: two conceptual evidence compositions, two approved leadership portraits and five code-native information graphics. The public page makes no live portal, sponsor workspace, validated system or external-provider integration claim.

## Regeneration contract

`npm run build` regenerates the CRO page, public navigation/footer changes, metadata registers, sitemaps and the CSS bundle. `npm run check` includes the CRO structural and claims tests. Direct edits to generated HTML are not the source of truth.
