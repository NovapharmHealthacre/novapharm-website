# Remaining Items

## Requires External Credentials or Access

- Write access to `/Users/vishalchakravarty/Documents/Novapharm InfoTech/novapharm-website`.
- GitHub push access for `NovapharmHealthacre/novapharm-website`.
- Production hosting credentials.
- DNS access for `novapharmhealthcare.com`.
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
2. Make the GitHub website checkout writable in this Codex session or run `scripts/merge-to-website-repo.mjs` from a normal terminal.
3. Commit and push the consolidated release.
4. Deploy the Node runtime to a production host with private storage mounted at `SECURE_CONTENT_ROOT`.
5. Point `novapharmhealthcare.com` DNS to the Node production host.
6. Configure the production Entra application, SharePoint metadata columns/retention labels, Polar Speed and finance credentials.
7. Run Lighthouse, Rich Results Test, Search Console URL inspection and post-deployment smoke tests.
