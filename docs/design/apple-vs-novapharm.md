# Apple discipline versus NovaPharm application

Last reviewed: 2026-08-28

This is a principle comparison, not a claim of affiliation or a pixel-copying
specification.

| Product discipline | Public Apple observation | NovaPharm application | Deliberate difference |
| --- | --- | --- | --- |
| Global navigation | Category-level destinations remain quiet and stable. | Seven corporate destinations; deeper links move into local navigation. | NovaPharm retains explicit Contact and Secure Portal destinations because B2B and security journeys require them. |
| Homepage | A product or service receives one proposition and a small action set. | Each major homepage band answers one pharmaceutical partner question. | Regulatory caveats remain visible even when they add copy. |
| Product presentation | The product itself carries the visual story. | Nutraxin uses approved pack shots, consistent scale and verified product facts. | No price, stock or purchase control appears without commerce authority. |
| Family navigation | Local navigation clarifies models and supporting content. | Company, Capabilities and Products receive scoped local navigation. | Local items reflect corporate governance and regulated workflows rather than consumer shopping. |
| Copy | Short, direct and action oriented. | Precise, evidence-led statements with one principal thought per section. | Legal and regulatory wording is not removed for visual minimalism. |
| Forms | Context and topic precede data collection. | Contact starts with enquiry purpose; account opening separates interest, qualification, evidence, review and provisioning. | No public form creates credentials or claims approval. |
| Imagery | Fewer, highly art-directed images. | Fewer approved pharmaceutical and product images with responsive crops and provenance. | Conceptual imagery cannot imply NovaPharm-owned facilities or active regulated operations. |
| Motion | Motion explains relationship and responds to input. | Quiet CSS-first state and reveal motion with a designed reduced-motion path. | No sticky spectacle or scroll-controlled narrative is required for regulated content. |
| Privacy | Data requests are contextual and restrained. | Only fields needed for the selected managed workflow are collected. | Pharmaceutical evidence and confidential documents remain outside public static hosting. |
| Footer | Dense information is organised quietly. | Company, capabilities, products and legal material are grouped into a restrained institutional footer. | Regulatory status remains discoverable rather than reduced to generic legal links. |

## Fresh current-candidate verdict

The 28 August primary-source refresh confirms that the current implementation
has resolved the previous structural defects:

- the header has seven category-level destinations and scoped local navigation;
- mobile uses an explicit text control and authored navigation state;
- the owner-directed no-illustration, no-emoji and no-UI-icon rules remain intact;
- CRO and Oncology are text-led, concise and free of the retired decorative systems;
- Nutraxin has one governed overview and nineteen canonical pack-led detail routes;
- public Contact, Open Account and Portal surfaces fail closed while managed
  workflows remain separately deployable; and
- current inner pages share the intended editorial composition and design tokens.

The fresh comparison did not justify a new corporate restructuring. The
exact-final-tree Corporate browser, print, Lighthouse, security and canonical
root gates now pass. The remaining release work is immutable-candidate and
production authority, not another visual architecture: commit the accepted
tree, reproduce the release-critical checks in a clean checkout, pass exact-head
GitHub checks, then obtain managed staging and production evidence before using
live or operational language.

## Acceptance test

The final corporate site succeeds when its hierarchy, image quality,
responsiveness, accessibility and speed feel deliberately authored while its
content remains unmistakably NovaPharm and pharmaceutical. Visual resemblance
alone is not acceptance.

## Major-route comparison dossier

The baseline is the deployed `main` experience at `23310988e8fc484375aa10176aa1c1edbf5371a8`. The baseline-defect columns record why the accepted current-branch structure was introduced; they are not unresolved defects. The exact final working tree completed the repeated browser and release gates on 28 August 2026; approval remains repository-level until an immutable commit reproduces them and passes exact-head GitHub checks.

| Route | Current experience | Apple principle | Baseline defect (historical) | Implemented structure | Removals | New components | Copy changes | Functional changes | Accessibility impact | Performance impact | Before screenshot | After screenshot | Approval status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Ten-part concise corporate narrative | Focus, hierarchy, product-first storytelling | Equal visual weight and repeated architecture language | Hero, purpose, three routes, regulation, oncology, Nutraxin, technology, partners, one final CTA | Icon badges, card clusters, decorative diagrams | Editorial bands, sourcing ledger, product spotlight | One central thought per band | Clear route selection and truthful status boundary | Fewer focus stops; semantic sections | Less decorative JS/media; stable LCP dimensions | Historical main retained in Git | 28 August full matrix | Pass at repository level |
| `/about/` | Legal identity and operating model | Essence, impute, trust | Repeated company summaries and large media boxes | Purpose, facts, operating principles, maturity and leadership paths | Architecture cards and duplicate claims | Facts list and numbered principles | Active, evidence-led company description | Local Company navigation | Stronger heading/list structure | Lower DOM and image count | Historical main retained in Git | 28 August full matrix | Pass at repository level |
| `/capabilities/` | Four connected capability routes | Customer experience first | Service taxonomy appeared before visitor decision | Overview led by the decision required | Feature-card grid and decorative icons | Capability ledger | Answers role, audience and next step | Canonical hub for local family | Entire row remains a semantic link with visible focus | No new dependency | Historical main retained in Git | 28 August full matrix | Pass at repository level |
| `/services/` | Six service decisions and operating sequence | Simplicity without hiding depth | Long presentation-deck journey | What, who, engagement scope, boundary and action | Repeated giant grids and icons | Service ledger and Notice | Short service verbs and precise outputs | Canonical enquiry route | Ordered lists and labelled boundary | Text-led; reduced media | Historical main retained in Git | 28 August browser and print matrices | Pass at repository level |
| `/regulatory-services/` | Seven-gate regulatory roadmap | Responsibility | Strong substance was visually fragmented | Current status, ordered gates, batch integrity and action | Decorative markers and architecture panels | Large roadmap and regulatory Notice | Permissions before activity | Trust and enquiry links | Sequence is semantic and readable without colour | One below-fold responsive image | Historical main retained in Git | 28 August browser and print matrices | Pass at repository level |
| `/cro/` | Concise programme and responsibility model | Focus and truth | Excessive grids obscured the role boundary | Audience, fracture points, three lanes, responsibility, governance, senior judgement, engagement and FAQ | Decorative programme diagrams and unsupported full-service impression | Responsibility model and privacy Notice | Explicit sponsor-retained and qualified-specialist language | Qualified non-confidential enquiry path | FAQ/details semantics and visible safety copy | Fewer assets and panels | Historical main retained in Git | 28 August browser and print matrices | Pass at repository level |
| `/oncology/` | Controlled evidence-first composition | Essence | Sticky visuals created empty rendered pages | Scope, principle, requirements, handling, pathway and collaboration | Scientific gallery, molecular graphics, viewport stages | Readiness ledger and boundary Notice | Product cannot move faster than evidence | Direct oncology enquiry route | No sticky collision or empty focus region | Removes high-cost media/sticky behaviour | Historical main retained in Git | 28 August final corrected matrix | Pass at repository level |
| `/products/` | Two clearly separated portfolios | Familiarity and product hierarchy | Nutraxin and strategic areas were mixed | Nutraxin catalogue reference first; strategic portfolio second | Mixed category imagery and commerce cues | Product-family local navigation | Visibility is not availability | Canonical `/products/` hierarchy | Valid heading/order and keyboard links | Packshot prioritised; generic assets reduced | Retained governed before dossier | Retained governed after dossier plus 28 August matrix | Pass at repository level |
| `/products/nutraxin/` | Nineteen pack-led catalogue records | Product first | No canonical details; generic art competed with product | Range navigation, product lineup, catalogue and enquiry boundary | Category illustration and stock lab imagery | Product cards using real packshots | Verified facts only | Nineteen detail links | Intrinsic media and descriptive alt text | Responsive AVIF/WebP/PNG derivatives | Historical main retained in Git | 28 August full matrix | Pass at repository level |
| `/products/nutraxin/[slug]/` | Governed product detail | Essence and responsibility | Product-specific route absent | Large pack, name, pack, composition, evidence and qualified action | Fake price, stock and purchase controls | Product facts, composition table and Notices | Source-transcribed composition; no efficacy claim | Product JSON-LD without Offer | Table semantics and stable action order | Static HTML and responsive product media | Not applicable on baseline | 19-route generated/test matrix | Pass at repository level |
| `/products/strategic-portfolio/` | Non-commerce opportunity areas | Purpose | Generic portfolio cards implied active product commerce | Editorial rows and stop/go evidence sequence | Stock-photo category cards and Buy language | Opportunity ledger | Strategic areas, not products for sale | Qualified opportunity CTA | Clear reading order | Predominantly text | Historical main retained in Git | 28 August full matrix | Pass at repository level |
| `/partner-with-us/` | Qualification-led partner journey | Empathy | Stock mosaics and architecture panels distracted from fit | Audience, principles, routes, journey and CTA | Unverified logos and generic partnership imagery | Partner-route ledger | Evidence and role before relationship | Topic-specific contact paths | Text hierarchy replaces visual inference | Reduced image requests | Historical main retained in Git | 28 August browser and print matrices | Pass at repository level |
| `/technology/` | Explicit maturity and control purpose | Responsibility | Faux-platform presentation could imply live systems | Purpose, identity/records/documents/workflow/audit, maturity, security and roadmap | Faux dashboard and giant status grid | Maturity register and information Notice | Live, repository-complete, external and planned stay distinct | Trust Centre and managed-roadmap links | Status is textual, not colour-only | No operational dashboard hydration | Historical main retained in Git | 28 August browser and print matrices | Pass at repository level |
| `/news-insights/` | Editorial lead and hierarchy | Focus | Six equal-weight image cards hid priority | Lead analysis, secondary stories and compact list | Mandatory image on every item | Editorial lead/list | Concise summary, author, date and reading context | Stronger discovery order | Semantic articles and headings | Fewer image requests | Historical main retained in Git | 28 August browser and print matrices | Pass at repository level |
| `/contact/` | Public-only safety route plus managed form architecture | Agency and responsibility | Static dead end or false submission risk | Topic-first managed form only on managed authority; verified routes publicly | Frontend-only success and mailto-only form pretence | Managed Contact workflow and fail-closed public page | Data purpose and safety before collection | Real CSRF/server workflow when deployed | Labels, status region, error recovery | Client JS only in managed app | Historical main retained in Git | 28 August browser and print matrices | Public boundary pass; managed workflow external |
| `/account-application/` | Qualification lifecycle and managed interest boundary | Responsibility | Public page could be mistaken for account creation | Interest, qualification, application, evidence, review, approval and identity | Static upload and automatic-account implication | Lifecycle and managed interest workflow | Submission does not equal approval | Private workflow remains managed-only | Explicit status and privacy boundaries | Static public route remains lean | Historical main retained in Git | 28 August browser and print matrices | Public boundary pass; managed workflow external |
| `/portal/` | Fail-closed safety page | Trust and responsibility | Static login would be a dangerous dead end | No credentials; managed hostname only after security acceptance | Fake login and protected links | Locked public safety composition | Explains exactly what the public host never collects | Protected modules absent in public build | No keyboard trap or deceptive field | No Portal application JS on public host | Historical main retained in Git | 28 August Corporate and Portal matrices | Public boundary pass; managed Portal external |

## Deliberate non-changes and rejected directions

- The public corporate surface remains static-first; converting editorial copy into a client-rendered SPA was rejected because it would add hydration without a user benefit.
- The official NovaPharm identity is preserved rather than redrawn in system typography.
- Regulatory and medical disclosures remain visible even where removing them would create a cleaner screenshot.
- A video hero, scroll-linked spectacle and molecular/3D scene were rejected because they would add media cost, motion and potential false operational implication without improving the visitor's decision.
- Product commerce was rejected from this release because prices, stock authority, payment, tax, delivery and returns are not approved.
