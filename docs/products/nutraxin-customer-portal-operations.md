# NovaPharm Nutraxin customer portal: controlled operations

**Stage:** AWS eu-north-1 STAGING. **Not** a production payment checkout, VAT invoice service, or binding order-acceptance system.

## Customer journey

1. Open the staging endpoint: `https://wgy9p7ad0d.execute-api.eu-north-1.amazonaws.com/` (custom domain requires the final DNS traffic CNAME).
2. Choose **Sign in or create account**. AWS Cognito manages identity and email verification. Users must confirm their email, and no private prices are shown merely because they sign up.
3. The signed-in, unapproved user sees **Business verification required** with a link to NovaPharm's working AWS-backed business-account enquiry form.
4. An authorised NovaPharm operator separately verifies business details. In the AWS Cognito console, user pool `eu-north-1_r2wjyxgqy`, confirm **Enabled=true**, **UserStatus=CONFIRMED** and **email_verified=true**, then add the user to group `nutraxin-approved-business-customer`. **Never add users solely because they supply an email address.**
5. The approved business account can view 19 provisional GBP B2B **net** price tiers (24+ and 48+ units). The authenticated API reads private SSM; pricing is never committed as a public website asset.
6. The customer selects products and quantities, submits a **non-binding quotation request**, and receives a `NUT-<request-uuid>` receipt. The backend validates SKU allowlist, integer quantities, pricing, requests and idempotency; quantities below 24 are explicitly **unpriced**.
7. A DynamoDB receipt records pending review with no payment, VAT invoice or stock reservation. The internal confirmed SNS staff email subscription receives **only receipt ID, pseudonymous customer subject and SKU count**; never confidential price or company email in the notification.

## Staff: find and process a quote request

- AWS DynamoDB, Region **Europe (Stockholm) eu-north-1**; table `novapharm-staging-nutraxin-customer-requests`.
- From the SNS notification, use `customer_sub` to look up partition key `pk = USER#<customer_sub>`, sort key `sk = RQ#<uuid>` where UUID is from the receipt `NUT-<uuid>`.
- Confirm the associated customer identity in the Cognito user pool using the subject ID; inspect its group and verified email. Do not publicly disclose the customer subject.
- Confirm supplier stock **today**, Nutraxin food-supplement compliance, labelled product identity, order terms, delivery, approved tax treatment and credit/payment method **outside the staging portal**. This system does not approve, allocate, ship, pay or invoice.
- Remove a user from `nutraxin-approved-business-customer` or disable the Cognito account to revoke private price and order-request API access; the backend rechecks current group, enabled status, confirmation status and email verification on each protected API request.

## Customer domain: DNS is a separate action

Regional AWS API custom domain `portal.novapharmhealthcare.com` is **AVAILABLE** and mapped to the customer BFF, using the AWS ACM certificate already **ISSUED**. In the authoritative `novapharmhealthcare.com` DNS console, only if no conflicting portal record exists:

| Type | Host | Target | TTL |
| --- | --- | --- | --- |
| CNAME | `portal` | `d-4o0cd6ltz6.execute-api.eu-north-1.amazonaws.com` | 3600 seconds |

This is **NOT** one of the two existing long `_hash.portal` / `_hash.api` ACM DNS validation records. Do not overwrite those, the company website, MX or other email records. Verify DNS resolution and a real external browser HTTPS login before releasing the custom hostname to customers.

## Operational and compliance boundaries

- **Provisional pricing:** owner-authorised temporary B2B 24+/48+ net price list held in AWS Systems Manager **SecureString** at `/novapharm/staging/nutraxin/owner-approved-provisional-b2b-prices-2026-11-08`. Its source prices originated as procurement costs; this may represent zero-margin sales and must be commercially reconsidered before any binding sales. Never publish the private source workbook.
- **VAT:** UK supplements may attract 20% standard-rate VAT, but NovaPharm's own VAT registration/effective date, SKU classification and invoicing rights were **not verified**. This portal neither charges VAT nor issues tax invoices.
- **Stock:** the July 2026 supplier availability sheet and October sample order are historical, **not current available-to-promise**; no stock is reserved.
- **Food-business rules:** required registrations, labelling, distance-selling information, consumer rights, fulfilment and company trade terms must be documented prior to binding B2C/B2B sales. A UK medicines WDA(H) is not a blanket substitute for food-business obligations.
- **Customer privacy:** Amazon Cognito identity and AWS DynamoDB staging records are personal data. Check privacy notice, controller responsibilities, geographic storage, access limits, retention, backups and deletion workflow before onboarding real customers. DynamoDB TTL expiration is not guaranteed immediate deletion.
- **Security:** portal uses PKCE Cognito sign-in, state and one-time exchange, Secure HttpOnly same-site session cookies, independent group approval, CSP, strict POST origin checks and no browser JWT/local storage. Do not mark account instantly approved or expose price API to anonymous users. Optional TOTP exists in staging, stronger MFA policy requires a separate production approval.
- **Financial:** no card capture, checkout authorization, payment processor, ledger posting, VAT invoice, stock reservation or automatic fulfilment. Submission is expressly **not an order acceptance**.

## Release acceptance gates

- [ ] Exact-code GitHub checks green on PR #143.
- [ ] AWS CloudFormation stack `novapharm-staging-nutraxin-customer-order-bff` **UPDATE_COMPLETE** and Lambda current.
- [ ] AWS health returns 200; unauthenticated catalogue/request APIs return 401.
- [ ] Real external Cognito sign-up, email verification, login and callback confirmed. Do not manufacture a verified account by bypassing Cognito verification.
- [ ] Real qualified test account manually reviewed and group-approved; protected price retrieval verified.
- [ ] One test quote receipt stored once; duplicate retry doesn't double-notify; modified basket with same id returns conflict.
- [ ] Internal SNS alert received in the authorised staff mailbox, containing no confidential prices or email.
- [ ] Custom DNS portal CNAME resolves to regional API target, valid HTTPS, no redirect loops, secure cookies and page display verified across desktop/mobile.
- [ ] Human-reviewed business terms, UK tax registration and inventory/compliance signoffs before future **binding** checkout.

Source PR: #143. Commercial go-live gate: #135. Account/identity governance: #139 and #55.
