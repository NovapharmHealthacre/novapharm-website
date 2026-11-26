# NovaPharm Healthcare — Google company identity release

Evidence reviewed: 20 November 2026. This is a release and monitoring register, not a promise of a Knowledge Panel or a Google endorsement.

## Canonical UK company entity

- Public name: NovaPharm Healthcare
- Legal name: NOVAPHARM HEALTHCARE LTD
- Companies House registration: 16716501 — https://find-and-update.company-information.service.gov.uk/company/16716501
- Official canonical site: https://novapharmhealthcare.com/
- Company-facts page: https://novapharmhealthcare.com/about/company/
- Official company LinkedIn profile: https://www.linkedin.com/company/novapharm-healthcare/
- Existing community-maintained Wikidata record: https://www.wikidata.org/wiki/Q137660644
- Persistent on-site entity ID: https://novapharmhealthcare.com/#organization

The registered office is not included in Organization structured data because it is a residential address. Company registration does not establish pharmaceutical distribution authorisations. Do not substitute other companies called NovaPharm for this UK company.

## Implemented source contracts

1. The homepage has exactly one legal Organization node with the above entity ID, official public `sameAs` links, verified Companies House identifier and a separate WebSite node.
2. `Organization.logo` is the existing approved 512×512 square mark at `/assets/brand/pwa-icon-512.png`; the full-width company wordmark remains a distinct corporate `image`. Both are first-party assets, not newly generated marks.
3. The company facts WebPage has `mainEntity` and `about` pointing to the exact same Organization ID, alongside visible links to public company references and the official registration.
4. The company page and sitemap reflect the material 20 November 2026 update; tests assert image dimensions, identity graph, relevant links, and no leaked registered residential address.

## Controlled external acceptance — still required

- Verify that the public publisher deployed this exact commit to the canonical production origin; a GitHub merge alone is not deployment proof.
- Confirm HTTP 200, public crawl permission, indexed canonical, and a fetchable 512px logo with no `noindex` or robots block.
- In Google Search Console, inspect the homepage and company facts URL and review indexing and structured data evidence. Connected GSC Wizard currently requires an active subscription; do not claim a fresh inspection without access.
- Search for the exact company name and disambiguating UK registration. Google creates knowledge panels automatically; structured data does not force their existence.
- If a panel actually exists, an authorised representative can claim it using Google's official claim option and Search Console verification. Do not claim a non-existent panel.
- Obtain genuinely independent, editorial coverage of the business, and keep factual company details consistent across controlled profiles; do not buy promotional or misleading Wikipedia content.

## Primary public guidance

- Google Organization data: https://developers.google.com/search/docs/appearance/structured-data/organization
- Knowledge Graph: https://support.google.com/knowledgepanel/answer/9787176
- Claim an existing panel: https://support.google.com/knowledgepanel/answer/7534902

No paid ads, forged reviews, fabricated awards, regulatory approvals, invented company locations or unverifiable identifiers are part of this work.
