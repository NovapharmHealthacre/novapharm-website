# Business-account onboarding production evidence

Review date: 22 August 2026
Production status: public interest page only; managed onboarding not activated

## Governed lifecycle

1. Non-confidential account interest.
2. Initial organisation and eligibility review.
3. Controlled application invitation.
4. Managed applicant session and save/resume token.
5. Business identity and company information.
6. Regulatory status, responsible contact, permissions and quality evidence where applicable.
7. Commercial information.
8. Private document upload through quarantine and scan controls.
9. Applicant review and declaration.
10. Submission to an authorised review queue.
11. Review decision, notifications and separately controlled identity provisioning.

Submission never equals approval, account creation or Portal access.

## Repository evidence

| Control | Repository implementation | Production status |
| --- | --- | --- |
| Public boundary | Static page explains the lifecycle, contains no upload, credentials or simulated application, and offers a verified corporate-email route for a non-confidential expression of interest | Ready for public-only release |
| Managed interest | Minimal non-confidential managed workflow with CSRF, rate limiting, honeypot, privacy and safety confirmation | Repository tested; not live |
| Idempotency | Submission key prevents duplicate application creation | Backend activation test passes |
| Save/resume | Time-limited resume authorisation contract | Repository implemented; production identity not accepted |
| Private files | Upload authorisation, filename/MIME/size controls, private storage target and linked document metadata | Repository implemented; production Blob absent |
| Quarantine | Upload completion waits for controlled scan state | Repository implemented; synthetic scanner only |
| Malware | Fail-closed scan-state contract | Defender or approved production scanner not activated |
| Audit | Application, upload and state-transition events | Repository tested; production telemetry absent |
| Review queue | Administrator read/action contract with controlled status transitions | Repository tested; production reviewers not provisioned |
| Notifications | Provider boundary and templates | Production provider/mailbox not configured |
| Retention/privacy | Data purpose and lifecycle described; retention requires approved production policy | Legal/owner approval pending |

## Production acceptance gate

The managed application requires accepted Azure staging, Entra or approved applicant identity, private Blob storage, production malware scanning, Azure SQL migrations, Key Vault references, authorised reviewer roles, notifications, backup/restore, a penetration test, and a controlled end-to-end submission/review exercise. Until then, the public route remains informational and fails closed.
