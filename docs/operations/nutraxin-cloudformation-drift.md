# Nutraxin customer BFF — CloudFormation source-to-live reconciliation

**Status (15 November 2026):** The Apple Materials navigation from merged PR #718 is verified in the existing AWS Lambda behind portal.novapharmhealthcare.com. The stored CloudFormation template for that function still has its older inline Python/CSS source. This is an **infrastructure-as-code drift** issue; the current live signup page has the newer CSS.

## Production boundaries

- AWS account: 250675045172, region eu-north-1.
- Stack: novapharm-staging-nutraxin-customer-order-bff.
- Lambda: novapharm-staging-nutraxin-customer-bff.
- API mapping: portal.novapharmhealthcare.com to wgy9p7ad0d, default stage.
- Source files: apps/nutraxin-customer-api/index.py and infra/aws/nutraxin-customer-staging-stack.json.
- Merged source commit: 48645f174965bd1750f6677a56982e955ca22916.
- Scope: transitional Nutraxin customer BFF, NOT the unreleased unified Next.js portal, Distribution/WMS or Intelligence.

## Read-only release preflight

Offline checks, which need no AWS credentials:

    python3 -m unittest scripts/aws/test_nutraxin_cfn_drift_guard.py -v
    python3 scripts/aws/nutraxin_cfn_drift_guard.py

Read-only live configuration check with AWS credentials:

    python3 scripts/aws/nutraxin_cfn_drift_guard.py --live

**Expected current live result:** repository inline code matches the repository Python source, but the stored CloudFormation template differs. The read-only tool deliberately returns nonzero to stop any automatic attempt to apply an outdated stack template. It does not mutate AWS or emit customer data.

Legacy CloudFormation inline ZipFile has replaced non-ASCII source characters with question marks; the checker normalizes those characters only while comparing stored template code. This does not change the committed UTF-8 source.

## Why automated CloudFormation reconciliation was stopped

A reviewed 15 November 2026 change set modified only the inline Lambda code in the candidate template but reported three CloudFormation resource actions:

| Resource | CloudFormation action | Concern |
|---|---|---|
| AppFunction | Code modify, no replacement | Intended update |
| AppIntegration | Dynamically re-evaluate IntegrationUri | Possible route side effect |
| InvokePermission | Conditional replacement | Possible API invocation interruption |

That change set was **never executed and was deleted**. The Lambda was then updated by a separate successful deployment. Applying the old stored template now risks reverting the new styling.

## Acceptance requirements

1. Read current stack and Lambda revisions, exact source/build provenance and downstream symbolic references. Do not assume the last GitHub merge proves exact runtime package parity.
2. Prepare a new reconciliation and byte-verified rollback. If a fresh change set still lists AppIntegration, InvokePermission, identity, DynamoDB or route modifications, STOP for separate maintenance approval or rework the dependency to avoid it.
3. Preserve existing Cognito, customer records, sessions, commercial feature flags, payment paths, and public DNS. Do not enable historical Azure workflows to avoid AWS release governance.
4. After an approved update, prove stack UPDATE_COMPLETE, exact stored source parity, runtime artifact provenance, live Materials CSS, secure redirects on anonymous account/products/dashboard routes, 403 on workforce/board/admin routes and signed-in browser acceptance.
5. Only close the infrastructure drift issue after independent evidence; a healthy anonymous root alone does not certify the protected enterprise Next.js platform.

**Cost constraint:** no added billable infrastructure or subscriptions without explicit owner approval.

Track design release evidence at https://github.com/NovapharmHealthacre/novapharm-website/issues/717 and unified portal cutover at https://github.com/NovapharmHealthacre/novapharm-website/issues/601.
