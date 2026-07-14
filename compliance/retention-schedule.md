# Records retention schedule

Status: controlled criteria baseline; exact statutory or licence periods must be attached to the relevant record class before that regulated activity starts  
Owner: NovaPharm Healthcare Ltd Board  
Version: 1.0  
Last reviewed: 11 July 2026

UK GDPR does not prescribe one universal retention period. NovaPharm uses purpose-based triggers and records the legal, regulatory, contractual or operational source before applying a fixed period. This avoids inventing periods for licences, products or activities that are not yet active.

| Record class | Start / review trigger | Retention and disposal rule | Owner |
|---|---|---|---|
| Contact enquiry | Enquiry answered, declined or converted | Review at the next quarterly disposal cycle. Delete when no relationship, follow-up, complaint, dispute, safeguarding or legal need remains. If converted, inherit the resulting relationship schedule. | Commercial owner |
| Account application | Approved, declined or withdrawn | Keep while due diligence, challenge, fraud-prevention, regulatory or onboarding need remains. Review quarterly after closure; securely delete or transfer only the approved records to the customer file. | Compliance owner |
| Customer / supplier / partner master and contracts | Relationship ends | Keep for the verified contractual, tax, company, regulatory, quality and limitation requirements recorded for that relationship, then securely dispose unless on legal hold. | Finance / Quality / Legal |
| Orders, invoices and purchase orders | Transaction closes | Apply the verified tax, accounting, contract and pharmaceutical record requirement. The finance owner records the source and expiry date. | Finance owner |
| Product, batch, quality, pharmacovigilance and regulatory records | Product or record lifecycle event | Apply the licence, GDP/GMP, product, safety and authority-specific period confirmed for the activity. No generic website period overrides regulated retention. | Quality / Regulatory owner |
| Recruitment expression | Interest declined or no relevant opportunity remains | Review quarterly and delete unless the person has asked to remain under consideration and that choice remains current. | People owner |
| Employee, training and board records | Employment or appointment ends | Apply verified employment, company, tax, pension, health and safety, litigation and governance requirements; restrict access throughout. | People / Company Secretary |
| Portal session | Login, expiry, logout or credential change | Expire after 30 minutes of inactivity or 8 hours absolute by default; revoke earlier on logout, password change, account disablement or security response. | Security owner |
| CSRF and rate-limit state | Token or rate window created | CSRF cookie: 1 hour. Rate windows: 15 minutes or 1 hour according to endpoint. Expired state may be purged automatically. | Security owner |
| Security and audit event | Event recorded | Keep while needed for incident detection, investigation, claims, access review and regulatory evidence; review access and necessity at least annually. | Security / Compliance |
| Cookie preference | Choice saved | 180 days, then request a fresh choice. A new notice version invalidates the old record. | Website owner |
| Uploaded document | Linked record created | Inherit the linked entity's schedule. Apply legal hold, classification, version and SharePoint lifecycle before deletion. | Record owner |
| Database backup | Backup created | Retention cadence and encrypted off-site location require Board/security approval before live scheduling. A backup inherits source restrictions and must be securely destroyed at expiry. | Security owner |

## Controls

- Every fixed period must cite its law, licence, contract or approved policy in the records register.
- Legal holds suspend deletion and are auditable.
- SharePoint labels and database/document deletion must use the same canonical record class.
- Disposal is logged without preserving the deleted content.
- Backups are not a permanent archive and must follow the approved backup schedule.

Reference: [ICO storage limitation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/).
