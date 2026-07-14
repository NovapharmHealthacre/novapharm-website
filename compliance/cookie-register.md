# Cookie and browser-storage register

Owner: NovaPharm Healthcare Ltd Board  
Version: 1.1  
Source audit: 14 July 2026  
Method completed: source search, generated response-header inspection, generated-page inspection and automated consent-state tests  
Release gate: browser cookie, local-storage and network inspection on the private preview and production origins

| Name | Provider | Technology | Purpose | Category | Duration | Party | Consent required | Transfer implication |
|---|---|---|---|---|---|---|---|---|
| `np_csrf` | NovaPharm | Cookie | Match same-site state-changing requests and prevent CSRF | Strictly necessary | 1 hour | First party | No | None by itself |
| `np_session` | NovaPharm | Secure HttpOnly cookie | Maintain the requested authenticated, role-scoped session | Strictly necessary | 30 minutes of inactivity or 8 hours absolute, with earlier revocation | First party | No for requested portal service | None by itself |
| `np_cookie_consent` | NovaPharm | Local storage | Remember notice version, selected categories, timestamp and random preference ID | Strictly necessary preference record | 180 days | First party | No; needed to remember the user's choice | None by itself |

No analytics, tag-manager, advertising, social-pixel or marketing technology is enabled. The Content Security Policy contains no Google Analytics or Tag Manager origin. Authenticated portal pages do not load analytics.

Any proposed technology must be added to this register, tested as blocked before consent, reviewed for data minimisation and international transfers, and released only after the privacy and cookie notices are updated.

Reference: [ICO guidance on the use of storage and access technologies, finalised 29 April 2026](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/). NovaPharm does not rely on the Data (Use and Access) Act 2025 statistical-purpose exception in this release; optional analytics remains absent and fail-closed.
