# NovaPharm writing and inclusive content standard — Apple HIG web adaptation

Status: **initial implementation**, 16 November 2026. Applies to the Corporate, Portal, Intelligence, Distribution/WMS, Technology, Founder and Status experiences. This is a web-specific NovaPharm editorial standard informed by the official Apple HIG and Style Guide; it is **not** Apple certification, Apple branding, or an assertion that every page has been audited.

## Primary sources

- https://developer.apple.com/design/human-interface-guidelines/writing
- https://support.apple.com/en-in/guide/applestyleguide/welcome/web
- https://support.apple.com/en-in/guide/applestyleguide/apdcb2a65d68/web
- https://developer.apple.com/design/human-interface-guidelines/inclusion
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/color

## NovaPharm voice

**Clear, restrained, precise, respectful and accountable.** Prefer short, active sentences and familiar words. Keep one primary message and a clear next action per view. Avoid marketing superlatives, filler, jokes, exclamations, jargon without explanation, or arbitrary possessives. Use British English (`en-GB`) in the current English product, with sentence case for page headings, controls and status messages except proper nouns and legally required names. Don't imitate Apple's trademarked interface text, assets or corporate voice.

Tone follows the task: neutral for navigation and data; supportive but factual for empty states; direct and actionable for errors; especially measured for sign-in, financial, clinical, privacy, regulatory or safety-sensitive journeys.

**Voice choices:** Prefer “Sign in”, “Register business interest”, “Save preferences” and “Go to home page” over vague or overly long CTAs. Link text must describe its destination without relying on surrounding copy or “click here”. Use labels that remain meaningful when read by a screen reader in isolation. Write device-neutral actions where possible (“Select”), rather than “click” on mobile-first screens.

## Controlled terminology and claims

| Term | Meaning | Never conflate with |
| --- | --- | --- |
| Register interest | Non-confidential initial business enquiry | Formal application or automatic account creation |
| Application | Private, invited due-diligence process | Enquiry receipt |
| Approved | An explicit completed authorisation decision | Invitation, account creation or attempted sign-in |
| Portal invitation | A controlled identity onboarding step | Unrestricted access to every workspace |
| Available | Verified, permitted product/service availability | Catalogue listing, forecast or planned capability |
| Live | Independently verified deployed functionality | Merged GitHub code, draft UI or staging |
| Evidence pending | Relevant source/approval not independently verified | Verified release |

Preserve existing privacy notices, medical disclaimers, data-rights statements, WDA(H)/PLPI licensing boundaries, oncology product claims, batch/quality controls, and commercial approval requirements. Do **not** promise delivery, availability, medicine efficacy, document acceptance, account activation, data export or transaction completion before the underlying service confirms it.

## UI writing patterns

1. **Page and task headings:** State the task (“Register interest in a business account”) before describing the organisation or technology. An H1 should give orientation, not be a slogan.
2. **Forms:** Always pair a visible label with each field. Provide an optional concise example for unfamiliar formats; do not substitute placeholder for the label. Explain sensitive-data boundaries where a person enters free text. Preserve actual validation rules.
3. **Buttons and links:** Use a verb and name the outcome (“Save preferences”); do not call an enquiry “Apply” if it only registers interest. Avoid generic “Learn more” in repeated links unless the destination is otherwise explicit to assistive technology.
4. **Multistep journeys:** Identify which step the person is on, what will be required next, and when an action is complete. Use the same terms across the public site, portal help and messages.
5. **Empty and loading states:** Explain what is absent or happening and provide a real next step, if one exists. Do not invent product inventory, customer records or trial entitlements.
6. **Errors:** State the problem in neutral language, then a practical next step. Never blame people, imply a backend response is confirmed when it is not, or promise that a submission was not saved after an unknown failure. If resubmission risks duplication, advise checking status first.
7. **Success:** Say “received” or “saved” **only** after authoritative success. Specify what the result does and does not grant in regulated/account flows.
8. **Security and privacy:** Explain material collection, limits and consent in plain language. Necessary versus optional analytics must be explicit; marketing consent remains separate. No dark patterns or “Accept all” wording if not all categories can actually be enabled.
9. **Technical and clinical language:** Keep exact legal, medicine, product, role, source and units terminology where needed; explain specialist terms when the audience may be unfamiliar. Do not silently simplify regulated risk disclosures.
10. **Accessibility and color:** Screen-reader announcements should communicate status in words and use appropriate live regions; never rely on red/green or an icon alone. Check semantic text contrast under all supported appearance modes, text resizing, focus, keyboard access and right-to-left localization.
11. **Inclusive language:** Address people directly without stereotypes about gender, disability, education, culture or family structure. Do not request gender or similar attributes unless required for a lawful, clear purpose.
12. **Localization:** Keep translatable UI strings short, avoid culture-specific idioms, preserve semantic markup and `lang` declarations, and let locale-aware formatters render dates, numbers and currency. Do not concatenate translated fragments. Right-to-left languages require separate visual and linguistic acceptance.

## Priority audit route matrix

| Estate | First-pass evidence | Remaining acceptance |
| --- | --- | --- |
| Corporate | Account application React page, form labels/feedback, render error and static 404/500 updated | Review all public routes, legal disclosures, static/managed parity and rendered breakpoints |
| Portal | Sign-in, onboarding help, error copy updated | Audit every customer/employee/board/admin module, role-dependent guidance, authenticated transaction outcomes |
| Intelligence | Covered by this standard | Review 22 workspaces, medicine source labels, tooltips, errors, evidence-rights disclosures and localization |
| Distribution/WMS | Covered by this standard | Review every private WMS workflow, pick/pack/QA/FEFO status, exceptions, warnings and offline error states |
| Technology and Status | Status error wording updated | Audit all dashboards, filters, empty states, charts, technical descriptions and screen-reader announcements |
| Founder | Fallback error wording updated | Review editorial navigation, content hierarchy, links and assistive labels |

Automated source contracts in `scripts/test-apple-hig-writing.mjs` prevent regression of **reviewed critical flows**. They are not a natural-language quality oracle. Existing public copy, claims, a11y and colour checks remain mandatory. Follow with a route-by-route content review plus Chromium/WebKit, mobile, 200%/400% zoom, keyboard, VoiceOver and Arabic/Hebrew RTL acceptance before calling the whole estate complete.

## Release boundaries

This change does not modify auth/identity, form endpoint, cookies storage/consent logic, pricing, stock, regulated status, CSS assets or production infrastructure. CI may verify source consistency; it does not prove that static public pages, AWS-managed services or authenticated deployments are live.
