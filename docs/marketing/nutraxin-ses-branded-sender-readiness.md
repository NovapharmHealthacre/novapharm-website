# Nutraxin branded email campaign — draft readiness contract

Status: **disabled / internal verification only**. This document is not an executable mailer. Do not connect it to transactional delivery workers or enable campaign sending until all gates are satisfied.

## Proposed sender contract

- Provider: Amazon SES v2, eu-north-1
- From: NovaPharm Healthcare <trade@novapharmhealthcare.com>
- Reply-To: trade@novapharmhealthcare.com
- Retail and trade campaigns use the same branded address.
- Preserve existing order, delivery and enquiry notification paths unchanged.
- WELCOME10: first eligible retail order of GBP 40 or more, once per customer, 30 days from launch; do not publish until checkout and terms verified. Not a wholesale discount.

## Release gates

1. Confirm with AWS that permissioned marketing is within the approved SES use case; the current approved account description is transactional only.
2. Verify public SPF and DMARC records, and recipient-side authentication results. DKIM domain verification is successful. Default SES MAIL FROM currently applies; do not modify Microsoft 365 MX records.
3. Use a separate campaign configuration set and monitoring, and verify working bounce/complaint and unsubscribe handling; do not change the account-wide transactional routing.
4. Only use a recipient list with documented permission, appropriate legal basis, verified eligibility, and checked suppression status. Imported public prospect addresses are not consent evidence. Do not commit contact lists or personal information.
5. Verify official artwork URLs, postal address, privacy and unsubscribe URLs, rendering in email clients, and live checkout coupon eligibility.
6. Require controlled release review before any external marketing send. Keep campaigns disabled until review is complete.

## Internal verification, 25 November 2026

SES verified domain and enabled DKIM signing; internal test accepted and received under branded sender in Outlook; explicit internal reply reached the trade shared inbox. No external campaign sent. Public SPF and DMARC checks remain outstanding. No existing campaign dispatch integration was identified in the inspected repository paths; do not repurpose the transactional provider adapter.

