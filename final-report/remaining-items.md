# Remaining Items

## Required To Go Live

- Approve and merge `codex/ultra-premium-rebuild` after GitHub CI passes.
- Connect the repository to the Render Blueprint or an equivalent Node 24 host with persistent private storage.
- Enter production administrator hash/salt, session secret and allowed origin.
- Add and verify `novapharmhealthcare.com` and `www.novapharmhealthcare.com`; use the exact host-provided DNS records.
- Configure Resend sender-domain DNS and the controlled contact recipient mailbox.
- Configure an Entra application with approved Microsoft Graph permissions for runtime SharePoint sync.
- Run the production smoke test, mobile/desktop visual regression and Lighthouse.

## Security And Governance Approval

- Break SharePoint permission inheritance for the Executive Platform and grant only approved board/administrator groups.
- Approve the privacy notice, cookie/analytics approach, portal terms, records retention and incident-response procedure.
- Add malware scanning and complete an independent penetration test before inviting real users.
- Configure encrypted off-host database backups and complete a restore exercise.

## Provider Dependencies

- Polar Speed/Marken API specification, credentials, service scope and data-processing terms.
- Finance/accounting provider and API contract.
- Microsoft Entra SSO configuration for customers, employees and board members.
- Product-specific regulatory evidence before publishing named medicine availability, licence or clinical claims.
- A stable Nutraxin catalogue source if the earlier nutraceutical product request is still in scope; the Outlook temporary attachment was unavailable during this implementation.

## Scaling Threshold

The launch deployment is intentionally single-instance because SQLite and an attached disk cannot provide multi-instance high availability. Migrate the canonical database to managed PostgreSQL before horizontal scaling, zero-downtime multi-instance deployment or high-volume transaction use.
