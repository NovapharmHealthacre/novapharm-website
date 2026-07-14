# NovaPharm SEO and Digital Authority Owner Actions

Repository-controlled work should be completed and validated before these external actions. Never paste a platform password, API secret or private verification credential into chat, source code, an issue or a pull request.

## 1. Google Search Console domain property

- **Platform:** Google Search Console
- **Screen:** Add property → Domain
- **Field:** Domain
- **Value:** `novapharmhealthcare.com`
- **Secret:** No. The DNS TXT value Google generates is a verification token; it may be visible publicly in DNS but should be copied exactly.
- **Action:** Add the generated TXT record at the authoritative DNS provider without changing MX, SPF, DKIM, DMARC or unrelated records.
- **Verify:** Search Console reports ownership verified.
- **Then:** Submit:
  - `https://novapharmhealthcare.com/sitemap.xml`
  - `https://novapharmhealthcare.com/sitemap-insights.xml`
  - `https://novapharmhealthcare.com/sitemap-images.xml`
- **Monitoring:** Indexing, Page experience/Core Web Vitals, security issues, manual actions, branded/non-branded queries, pages, country and device.

## 2. Bing Webmaster Tools

- **Platform:** Bing Webmaster Tools
- **Screen:** Add site or import verified Search Console property
- **Field:** Site URL
- **Value:** `https://novapharmhealthcare.com/`
- **Secret:** No password should be shared. Verification tokens are copied only through the approved DNS or file process.
- **Verify:** Site ownership appears verified and sitemap fetch succeeds.
- **Then:** Submit the three canonical sitemaps and review crawl/index reports. IndexNow is already prepared in the repository.

## 3. Google Knowledge Panel

- **Platform:** Google Search
- **Screen:** Branded Google results, then “Claim this knowledge panel” only if a panel exists
- **Value:** NovaPharm Healthcare or Vishal Chakravarty entity
- **Secret:** Google authentication remains owner-controlled.
- **Action:** Do not purchase a panel or create fake citations. If a panel appears, verify representative status through Google and suggest corrections using the canonical company/leadership pages and official Companies House/profile evidence.
- **Verify:** Google confirms the representative claim or accepts a suggested correction.
- **Important:** A panel cannot be guaranteed by schema, SEO work or payment.

## 4. Google Business Profile eligibility

Do not create a profile using the registered flat, a mailbox, an unstaffed/virtual office or a location without genuine customer-facing operation and permanent signage. Reassess only when NovaPharm has an eligible staffed location or qualifying service-area model. A Business Profile is not the same as an organisation Knowledge Panel.

## 5. LinkedIn consistency

### Company page

Confirm:

- name: `NovaPharm Healthcare`;
- website: `https://novapharmhealthcare.com/`;
- legal name where appropriate: `NOVAPHARM HEALTHCARE LTD`;
- logo: official supplied master only;
- description: compliance-first B2B pharmaceutical company preparing regulated sourcing, market-entry and distribution capabilities;
- status: does not imply current WDA(H), PLPI supply, NHS supply, owned manufacturing or owned warehouse operations.

### Vishal Chakravarty profile

Confirm:

- public name: `Vishal Chakravarty`;
- current designation: `Chief Executive Officer`;
- founder relationship described separately;
- company URL matches the canonical domain;
- biography and experience do not conflict with the canonical leadership page.

### Other leadership profiles

Use only approved roles and facts. Dr Nishita Trivedi must not be presented as a NovaPharm statutory director.

## 6. Analytics provider decision

- **Platform:** owner-selected privacy-compliant analytics provider
- **Screen:** property/site creation
- **Value:** `https://novapharmhealthcare.com/`
- **Secret:** Measurement IDs may be public; administrative credentials and API secrets must not be shared.
- **Precondition:** privacy and cookie review, data-processing terms, retention, access and consent behaviour approved.
- **Implementation:** Load non-essential analytics only after analytics consent. Use the `novapharm:marketing-event` interface and do not record form message contents, passwords, portal data, uploaded documents or patient information.
- **Verify:** No provider request before consent; approved events appear after consent; rejection and withdrawal stop optional measurement.

## 7. Search and referral baseline

After verification, export and retain a dated baseline for:

- indexed canonical pages;
- excluded pages and reasons;
- branded queries;
- non-branded queries;
- page impressions/clicks;
- country/device;
- Core Web Vitals;
- referring domains;
- ChatGPT referrals identified by `utm_source=chatgpt.com` or the relevant referrer;
- qualified form submissions by source page and CTA.

Do not invent historical values. Empty or unavailable data must remain an empty state.

## 8. Knowledge and entity corrections outside the repository

Use the generated entity register as the source of truth. Correct only accounts you control or references where the publisher accepts a legitimate factual correction. Keep a log of:

- URL;
- incorrect value;
- correct value and evidence;
- request date;
- contact route;
- outcome.

Do not create mass profiles or spam directories to increase the number of references.

## 9. Editorial approvals

Before publishing a new expert article or downloadable authority asset, approve:

1. named author and actual contribution;
2. named reviewer and actual review scope;
3. primary-source list;
4. factual/regulatory status;
5. conflicts or commercial relationships;
6. image licence and implications;
7. CTA and data collection;
8. material publish/modified dates.

## 10. Digital PR and outreach

No publication outreach is automatic. For each proposed pitch, approve:

- target publication and editorial quality;
- proposed topic;
- named spokesperson;
- claims and evidence;
- whether the placement is editorial or sponsored;
- link and disclosure expectations;
- any fee or commitment.

Reject paid-link packages, purchased awards, purchased Wikipedia/Knowledge Panel services, low-quality syndication and reciprocal-link schemes.

## 11. Live validation after merge

After the owner approves and merges the PR:

1. Confirm the GitHub Pages build completes.
2. Inspect homepage, leadership and at least two Insights pages in raw and rendered HTML.
3. Confirm the root IndexNow key file returns `200` and exact content.
4. Confirm all three sitemaps return valid XML.
5. Confirm public pages retain `index,follow` and portals remain noindex/protected.
6. Test structured data in Schema.org Validator and Google Rich Results Test where eligible.
7. Confirm `www` redirects to the apex and HTTPS remains enforced.
8. Submit only materially changed canonical URLs through the approved IndexNow process.

## One consolidated approval block for future credentials

When a verification or provider value is needed, record:

- platform and screen;
- exact field;
- expected value format;
- whether secret;
- whether it may be present in public DNS/source;
- verification method;
- next automated step.

Passwords, recovery codes, private keys and OAuth client secrets are never acceptable in chat.
