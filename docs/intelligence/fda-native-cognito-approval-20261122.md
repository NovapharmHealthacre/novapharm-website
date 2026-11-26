# NovaPharm FDA native Cognito identity — review package
22 November 2026 · Source-only infrastructure template (not deployed)

## Current AWS state (read-only verified)
Region `eu-north-1`; existing production Cognito pool `eu-north-1_jBL6hCUE2`:
- One existing web PKCE app client only.
- No custom resource servers for `novapharm/fda.read`.
- No groups, and therefore no board-reviewer membership.
- API Gateway private catch-all remains `AWS_IAM`; there is **no** live `GET /v1/intelligence/regulatory/us/fda-research` route.

## Exact proposed change
`infra/aws/fda-native-cognito-approval.cfn.json` is an isolated CloudFormation template.
It proposes four resources **only after six approvals** and non-placeholder, signed platform identities:
1. `AWS::Cognito::UserPoolResourceServer` — identifier `novapharm`, scope `fda.read`.
2. `AWS::Cognito::UserPoolGroup` — empty `board-reviewers` group.
3. `AWS::Cognito::UserPoolClient` — dedicated **public iOS** authorization-code client, PKCE through native code, no client secret.
4. `AWS::Cognito::UserPoolClient` — separate **public Android** authorization-code client, no client secret.

Cognito supports custom resource-server scopes for OAuth2 access tokens. `AllowedOAuthFlowsUserPoolClient` must be enabled for OAuth use. Native clients must register exact approved callback URLs and are never issued client secrets. **Do not confuse a scope grant with board membership:** the API Gateway JWT scope check and backend verified Cognito board group are both mandatory.

All six booleans default to `false`; the two signed app IDs and two redirect URIs default to `UNAPPROVED`. The CloudFormation condition requires every sign-off `true` and every placeholder replaced before it creates *anything*. No user-group attachments, new pool, API, Lambda, DynamoDB, DNS records or permission changes exist in this template.

## Independent approvals required before AWS mutations

- Owner production release sign-off, including billing and change window.
- Exact iOS bundle ID, Apple code-signing/App Store Connect identity, installed app URL scheme proof.
- Exact Android package ID, verified intent filter/App Links or safe OS callback ownership, Play signing proof.
- Security approval of OAuth scope/issuer/audience, board group onboarding, MFA, token revocation and loss-of-device handling.
- Legal/right-to-use review for each FDA source type, including third-party exceptions.
- Source-owner documentation, board-user access list and platform QA sign-off.

## Review process
1. `node --test scripts/test-fda-native-cognito-approval.mjs` confirms 0 default resources and exact secure OAuth settings.
2. `cloudformation:ValidateTemplate` confirms the JSON can be parsed by AWS; **this does not deploy anything**.
3. Verify signed native identity ownership and callback handling on real devices.
4. Obtain explicit independent owner, security and rights sign-offs.
5. Only after approval, use a change-controlled deployment and verify scope tokens and native mobile requests against a pre-approved private FDA endpoint.

**Status: no AWS resource is created. Production FDA sign-off remains `not_granted`; 100% release acceptance remains unverified.**
