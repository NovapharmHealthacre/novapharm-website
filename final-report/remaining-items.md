# Remaining Items

## Requires External Credentials or Access

- Node-capable production hosting credentials for the authenticated portal and APIs.
- DNS/proxy access to route `novapharmhealthcare.com` to the Node runtime when the secure portal host is ready.
- Microsoft Graph production application registration, consented permissions, client secret/certificate and webhook endpoint. The tenant and `/sites/NovapharmTier1` site are already validated.
- Polar Speed/Marken API contract and credentials.
- Finance/accounting provider credentials.
- Microsoft Entra ID SSO configuration.
- Reattached Nutraxin catalogue PDF or a stable local copy.

## Requires Business Approval

- Final legal/regulatory review of MHRA-aware service claims.
- Product portfolio wording before publishing any specific medicine claims.
- Privacy policy, cookie policy and analytics consent approach.
- Document retention policy approval.
- Customer portal terms of use.

## Recommended Next Actions

1. Reattach the Nutraxin catalogue for verified product extraction and image publishing.
2. Deploy the Node runtime to a production host with private storage mounted at `SECURE_CONTENT_ROOT`.
3. Point the secure portal routes on `novapharmhealthcare.com` to the Node production host.
4. Configure the production Entra application, SharePoint metadata columns/retention labels, Polar Speed and finance credentials.
5. Run Lighthouse, Rich Results Test, Search Console URL inspection and post-deployment smoke tests after Pages/CDN propagation.
