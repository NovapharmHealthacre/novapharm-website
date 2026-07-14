# Digital Platform Incident Response Plan

Status: operational draft requiring owner and legal approval  
Review: after every material incident and at least annually

## Severity triggers

- **Critical:** confirmed credential/data exposure, customer isolation failure, malicious upload released, Board document exposure, destructive data loss, production takeover.
- **High:** repeated privileged-auth failures, material service outage, broken backup, uncontrolled Graph/SharePoint permission, active injection/XSS finding.
- **Medium/Low:** contained delivery failure, non-sensitive defect, failed integration with no data exposure.

## First actions

1. Preserve safety and evidence; do not publish sensitive details.
2. Revoke exposed credentials/tokens and sessions.
3. Restrict affected routes, identities, storage or SharePoint scope.
4. Capture timestamps, deployment SHA, security/audit events and Azure resource state.
5. Notify the accountable owner, security lead, privacy contact and relevant operational owner.
6. Assess UK personal-data breach notification duties and contractual/regulatory obligations with qualified advisers.
7. Restore from a verified clean release/data point only after containment.

## Evidence and privacy

Application Insights must exclude auth payloads, portal/document content, form messages and secrets. Store incident evidence in a restricted case record with lawful access and retention. Do not place personal data in public GitHub issues.

## Recovery and closure

Validate health, authentication, authorisation, customer isolation, documents, email, SharePoint and monitoring after recovery. Record root cause, impact, timeline, decisions, notifications, corrective actions and owner. Rotate credentials even after history cleanup because external copies cannot be recalled.

