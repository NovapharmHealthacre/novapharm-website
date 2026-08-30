# Contact production evidence

Review date: 22 August 2026
Production status: not activated on the public-only release

## Public release

The static public host does not render a form or simulate submission. It provides the verified `vishal@novapharmhealthcare.com` corporate-email route for non-confidential qualified B2B enquiries and explains that the visitor's email application, rather than the website, handles delivery. It also states that confidential dossiers, patient data, adverse-event reports and urgent medical information must not be submitted through a general corporate channel. This is the deliberate fail-closed release state until the managed workflow has production evidence.

## Managed repository implementation

| Control | Implementation | Repository evidence | Production evidence |
| --- | --- | --- | --- |
| Topic-first enquiry | Eleven governed business topics with concise form fields | `apps/corporate/components/contact-workflow.tsx` | Not deployed/tested against production |
| Data minimisation | Name, business email, company, role, country, optional telephone, topic and non-confidential message | Managed corporate component and server schema | Not production-evidenced |
| Safety boundary | Patient, adverse-event and urgent-medical warnings plus required confirmation | Managed component; MHRA Yellow Card route | Not production-evidenced |
| Server submission | Same-origin corporate gateway to protected API contact endpoint | `apps/corporate/app/api/platform/[...path]/route.ts`, API route handlers | Not production-evidenced |
| CSRF | Token cookie plus matching request header | `ContactWorkflow`; server CSRF validation | Repository tests pass; production not exercised |
| Abuse controls | Honeypot and server rate limit | Component and backend tests | Production threshold/alert not exercised |
| Validation | Browser constraint validation plus authoritative server validation and normalisation | Corporate and API tests | Production not exercised |
| Persistence | Controlled enquiry record with source/attribution and minimal audit event | Backend activation and integration tests | Production SQL not connected |
| Success truth | Success appears only after an accepted server response | `ContactWorkflow` state model | No real production enquiry received |
| Failure truth | Explicit no-submission message, retry path and verified email fallback | Managed component | Production provider failure not exercised |
| Delivery | Provider abstraction and approved mailbox configuration boundary | API/email service configuration | Authorised mailbox/provider credentials and DNS proof absent |

## Acceptance statemen

Repository implementation and tests do not make Contact live. Contact becomes live only after the exact release is deployed, production SQL and email delivery are configured, a controlled real enquiry reaches the authorised mailbox, the stored record reconciles to that delivery, duplicate/retry and failure behaviour are tested, PII-safe logging is verified, and the result is recorded against the deployed SHA.
