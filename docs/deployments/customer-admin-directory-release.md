# Private customer directory release — #1179 / #1180

This is a proposed isolated deployment, not deployed infrastructure. Existing Founder session Lambda, its IAM role, customer portal, checkout, payment and Cognito policies are not modified. New Lambda and log usage may incur charges; do not provision without confirming existing account cost allowance and owner approval for any incremental cost. No new database, pool, API, NAT, VPC, subscription or public site release is required.

## Preflight

- Review exact merged source SHA and pass dedicated Python tests, Founder MFA, protected portal and browser checks. Verify the exact live gateway mapping and default-stage settings, route absence, and production user pool policy.
- Package only customer-admin-directory-api.py, customer-admin-directory-reader.py and intelligence-founder-session-api.py from that reviewed SHA in an immutable ZIP; upload to an existing private, versioned artifact bucket after validating its access and cost policy. Record SHA-256 and S3 object version. Do not use unversioned objects.
- Verify the owner subject from AdminGetUser (not email alone), MFA enrollment and separate group novapharm-customer-directory-admin. Create/assign only after explicit owner authorization, independently verifying the identity. Never expose subject, credentials or customer records in CI, shell output or logs.
- Validate template, create a reviewed change set in account 250675045172 eu-north-1. Default ReleaseEnabled=false: no gateway route, no Lambda invocation grant and the function denies reads. Do not replace existing resources; check the change set. Retention 14 days for diagnostic logs; audit events use the existing private session table. Confirm audit retention separately.
- Check Lambda package handler resolution, least-privilege IAM, including transactional ConditionCheckItem and PutItem conditions; verify no logging of request bodies, cookies or data, no CORS or response caching, no consumer/other role authorization. No new role grants to the existing Founder service.

## Activation and acceptance

Only after approved exact-SHA deployment and independent permission verification, change ReleaseEnabled=true. The route is on the existing auto-deploy gateway; review change set before execution. The API Gateway route is cookie-authenticated by the isolated Lambda, not publicly authorized; anonymous requests must get 401 and no rows. Verify alternate gateway host, expired/revoked/founder-only/consumer requests fail. Verify an actual fresh MFA owner session with group permission returns real source-separated counts and records, private no-store, and the audit record exists; never print records in test logs. Verify the new Founder interface is deployed through its separately reviewed image release, and existing session/logout/customer purchase paths still work.

## Rollback

Set ReleaseEnabled=false through the same stack (removes route/integration/invoke permission and denies reads); revoke only the separately granted customer-directory group membership if necessary. Confirm anonymous denial and existing session/checkout unchanged. Retain audit evidence. Do not delete or change existing API, tables, founder sessions, customer pools or payment configuration.
