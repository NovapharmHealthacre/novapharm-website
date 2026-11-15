# Cookie and browser-storage register

Owner: NovaPharm Healthcare Ltd Board  
Version: 1.3  
Source audit: 15 November 2026 (source reconciliation; browser/network acceptance still required)  
Method: historical source, generated-page and response-header evidence; fresh source/CI and live-browser verification required for this candidate  
Release gate: browser cookie, local-storage and network inspection on the private preview and production origins

| Name | Provider | Technology | Purpose | Category | Duration | Party | Consent required | Transfer implication |
|---|---|---|---|---|---|---|---|---|
| `np_csrf` | NovaPharm | Cookie | Match same-site state-changing requests and prevent CSRF | Strictly necessary | 1 hour | First party | No | None by itself |
| `np_session` | NovaPharm | Secure HttpOnly cookie | Maintain the requested authenticated, role-scoped session | Strictly necessary | 30 minutes of inactivity or 8 hours absolute, with earlier revocation | First party | No for requested portal service | None by itself |
| `np_cookie_consent` | NovaPharm | Local storage | Remember notice version, selected categories, timestamp and random preference ID | Strictly necessary preference record | 180 days | First party | No; needed to remember the user's choice | None by itself |
| `_ga`, `_ga_*` | Google Analytics 4 | First-party cookie | Optional public visits and coarse interactions | Analytics | Configured up to 90 days, subject to browser limits | Google | Yes, before provider load | Review Google processing and international transfers |
| `novapharm-public-ai` | NovaPharm | IndexedDB | Opt-in local semantic retrieval cache; no query or answer saved | Optional feature | Until user clears cache or browser removes it | First party | Yes, feature-specific choice | No transfer by the cache itself |

Optional Google Analytics 4 is present in the static public-site implementation, but its provider script is gated behind an affirmative, version-valid Analytics choice and valid owner-provided measurement ID. It is prohibited on legal, account, contact, admin, checkout-completion and protected portal routes by the runtime route allowlist. No advertising pixel or marketing tag is approved. The newer corporate app uses the same consent record and does not directly load a GA4 provider.
    


The consent record key is `np_cookie_consent`; the current website consent schema is `2026-11-15-v1.3`. Validity is limited to 180 days, and missing, malformed, expired and superseded records fail closed. The public browser UI does not pre-authorise a future marketing provider.

Any proposed technology must be added to this register, tested as blocked before consent, reviewed for data minimisation and international transfers, and released only after the privacy and cookie notices are updated.

Reference: [ICO guidance on the use of storage and access technologies, finalised 29 April 2026](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/). NovaPharm does not rely on the Data (Use and Access) Act 2025 statistical-purpose exception in this release; analytics remains optional and fail-closed until both owner activation and affirmative consent. Marketing remains disabled.
