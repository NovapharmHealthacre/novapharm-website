# Remaining Items

## Requires External Credentials or Access

- Write access to `/Users/vishalchakravarty/Documents/Novapharm InfoTech/novapharm-website`.
- GitHub push access for `NovapharmHealthacre/novapharm-website`.
- Production hosting credentials.
- DNS access for `novapharmhealthcare.com`.
- Microsoft Graph application registration and SharePoint site details.
- Polar Speed/Marken API contract and credentials.
- Finance/accounting provider credentials.
- Microsoft Entra ID SSO configuration.

## Requires Business Approval

- Final legal/regulatory review of MHRA-aware service claims.
- Product portfolio wording before publishing any specific medicine claims.
- Privacy policy, cookie policy and analytics consent approach.
- Document retention policy approval.
- Customer portal terms of use.

## Recommended Next Actions

1. Make the GitHub website checkout writable in this Codex session or run `scripts/merge-to-website-repo.mjs` from a normal terminal.
2. Commit and push the consolidated branch.
3. Deploy the Node runtime to a production host.
4. Point `novapharmhealthcare.com` DNS to the production host.
5. Configure SharePoint, Entra ID, Polar Speed and finance credentials.
6. Run Lighthouse and post-deployment smoke tests.
