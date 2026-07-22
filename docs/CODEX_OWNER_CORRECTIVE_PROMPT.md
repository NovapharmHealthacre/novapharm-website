# Codex Prompt — NovaPharm Owner Corrective Release

Continue from the existing NovaPharm Healthcare repository, prior audit, business-plan analysis, merged CRO work, merged Oncology work, enterprise portal architecture and current production state. Do not restart the project, replace the established brand, or produce another high-level audit without implementing the corrections.

## Owner authority and content direction

Treat the owner-supplied March 2026 business plan as an approved and valid source for NovaPharm's strategy, leadership responsibilities, services, commercial direction, technology programme and operating model. Do not weaken owner-approved statements merely because they originated in the business plan. Keep factual wording internally consistent across the website, structured data, source content, generated pages and portal documentation. Do not invent information that is absent from the repository or owner instructions.

The owner has legal, regulatory and insurance advisers. Do not fill the website with defensive commentary, repeated caveats, governance theatre or language that makes the company appear uncertain about its own approved strategy. Retain only concise notices that are genuinely required for page comprehension, form safety or regulated-use boundaries.

## Mandatory public-site corrections

1. Remove the public **Responsible AI**, **AI Governance**, **Search & Ask NovaPharm**, semantic retrieval and public AI-search experience completely.
2. Remove every public trigger, hero control, navigation entry, keyboard shortcut, dialog, route, JavaScript file, stylesheet, model/index asset, sitemap entry, structured-data reference, privacy section and CTA related to that public AI/search experience.
3. Do not leave a dead `/search/` page, `/technology/ai-governance/` page, hidden modal, browser worker, downloadable model, public knowledge index or public AI copy behind.
4. Keep ordinary website navigation clear and conventional. Do not replace the deleted experience with another experimental search or chatbot.
5. Preserve the secure enterprise application architecture only where it supports real customer, employee, board or administrative workflows. Internal experimental AI is not part of this public corrective release.

## CRO correction

In **Clinical Research & CRO Support → Senior judgement**, show all three approved senior leaders:

- Vishal Chakravarty — Chief Executive Officer
- Dr Girish Shantilal Achliya — Director & Chief Scientific Officer
- Prabhakar Vitthal Lahare — Managing Director & Chief Operating Officer

Prabhakar's card must use the approved repository portrait and link to `/leadership/prabhakar-lahare/`. His summary should connect operating strategy, manufacturing partnerships, quality governance, supply continuity and controlled programme execution. Ensure the three cards have equal visual weight on desktop and a strong responsive layout on tablet and mobile.

## Oncology visual correction

Strengthen the Oncology page with relevant pharmaceutical imagery at meaningful editorial points rather than decorative stock placement. Use approved repository assets or newly sourced commercially permitted assets with a recorded source, licence, creator, original URL, hash, derivative list and permitted routes.

Required visual contexts:

- product and evidence assessment;
- batch, quality and condition evidence;
- clinical-development or programme-evidence continuity;
- formulation and controlled handling where relevant.

Every image must have accurate alt text, responsive AVIF/WebP/JPEG output, explicit dimensions, suitable loading priority and consistent art direction. Do not repeat the same image excessively.

## Forms and production workflows

Make the following workflows genuinely operational rather than visually complete but backend-inactive:

- Submit enquiry;
- Oncology opportunity enquiry;
- product and partnership enquiry forms;
- Open an account application;
- controlled document upload and retry;
- Secure portal login;
- Microsoft Entra ID login;
- customer, employee, board and administrator access routing.

The current repository contains a Node backend, CSRF protection, persistent sessions, role enforcement, account application APIs, document upload services, email notifications, Microsoft identity support, database providers and deployment configuration. Use that existing implementation rather than rebuilding a separate mock system.

### Production activation requirements

1. Deploy the Node application to a production runtime capable of serving both the public website and `/api/*` endpoints from the configured origin.
2. Configure the apex domain and HTTPS certificate on that runtime.
3. Set `PUBLIC_ORIGIN`, `PUBLIC_API_ORIGIN` and `SITE_URL` to the same final HTTPS origin unless a separately approved API subdomain and CORS design is implemented.
4. Configure a production database and persistent storage.
5. Configure a resolved session secret and a persistent portal administrator.
6. Configure transactional email and notification recipients.
7. Configure Microsoft Entra tenant, application registration, credentials, redirect handling and approved role mapping.
8. Configure SharePoint only after its tenant/site/drive values and permissions are present.
9. Never put credentials, client secrets, connection strings or bootstrap passwords into public HTML, browser JavaScript, committed documentation or GitHub Pages artifacts.
10. Do not claim a workflow is live merely because its page renders. Verify the actual API request, record creation, email/event outcome, file upload, session, role redirect and logout on the live domain.

If the execution environment does not have access to the hosting account, DNS provider, Entra tenant or secrets, complete all repository work and produce one exact activation checklist naming the missing external value or action. Do not replace missing infrastructure with a fake success state.

## DNS and domain

Audit the apex and `www` records, custom-domain ownership, certificate state, redirect behaviour and whether the domain currently points to GitHub Pages or the production Node runtime. Preserve `novapharmhealthcare.com` as the canonical origin. Configure DNS to the selected production host using the host's real verification and endpoint values; never invent A, AAAA, CNAME, TXT or verification records.

Verify:

- apex HTTPS;
- `www` redirect or canonical behaviour;
- no redirect loop;
- certificate hostname and chain;
- `/api/health` returns JSON from the application runtime;
- static assets use the intended origin;
- forms call the intended API origin;
- Microsoft login begins and returns to the intended domain;
- DNS does not split the public site and same-origin API unintentionally.

## Full sanity and synchronisation pass

Run a repository-wide audit after implementation:

- source content and generated HTML synchronisation;
- no stale AI/search route, asset, test, sitemap, schema or metadata reference;
- all internal links and canonical URLs;
- every header, footer and mobile-navigation route;
- all page modules, images and derivatives;
- CRO leadership count and responsive rendering;
- Oncology gallery rendering and provenance;
- forms, validation, error summaries, CSRF and success states;
- account application, uploads, idempotency and partial-upload recovery;
- portal bootstrap login, Entra login, role redirects, session expiry and logout;
- database migration, backup and restore;
- email notification and retry;
- SharePoint and external-integration status;
- cookies, privacy controls and no-JavaScript behaviour;
- accessibility in Chromium and WebKit;
- responsive layouts at mobile, tablet, laptop and wide desktop;
- Lighthouse and performance budgets;
- security headers, CSP, secret scan, dependency audit and private-path blocking;
- CNAME, DNS, certificate, production health and live-domain verification.

Run the complete repository test suite on the final branch head. Add focused regression tests that fail when:

- public AI/search returns;
- Prabhakar is missing from CRO Senior judgement;
- Oncology imagery is missing;
- a form silently falls back without explaining whether a record was created;
- the portal page is published against a static origin with no reachable API;
- Microsoft login is shown without configured identity support;
- generated pages and source files diverge;
- production DNS serves the wrong release.

## Delivery method

- Work on a fresh branch from current `main`.
- Keep commits focused and reviewable.
- Open a pull request with the exact changed routes, infrastructure status and test evidence.
- Do not merge until the owner explicitly approves the final PR.
- After approval, merge in the required order, deploy, wait for production completion and verify the live domain directly.
- Report **merged**, **deployed**, **API active**, **Microsoft login active**, **forms verified** and **DNS verified** as separate statuses. Never combine them into one unsupported statement.
