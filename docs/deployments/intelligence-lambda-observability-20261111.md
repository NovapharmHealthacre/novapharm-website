# NovaPharm Intelligence: AWS monitoring baseline (11 November 2026)

The four Standard CloudWatch alarms in `infra/aws/intelligence-lambda-observability.json` watch deployed, explicitly named AWS Stockholm Lambdas. These alarms are **not** a certificate of customer NOVA inference or enterprise acceptance.

- Customer authorizer: errors and throttles
- Private Medicines Terminal candidate: errors
- Official public medicine research Lambda: errors

Each alarm evaluates a five-minute `AWS/Lambda` period and treats missing data as non-breaching. The alarm still enters states in CloudWatch. **No SNS, email, webhook or other notification is configured or sent.** Alarms can incur AWS monitoring charges and must be reconciled with the project's cost controls.

The authoritative stack is `novapharm-intelligence-lambda-observability` in `eu-north-1`. Apply only this versioned template and verify the four metrics and action-free settings after CloudFormation completion.

## Release restrictions

This does not turn on NOVA's OpenAI adapter, customer entitlement gates, production MongoDB evidence ingestion or Stripe products. A real NOVA deployment still needs independently approved external-AI source rights, production ZDR/data-residency and model credentials, tenant-scope revocation, accepted evidence, a customer-answer smoke test, and privacy-safe model-specific metrics and audits. The authorizer is configured default-deny until those gates are accepted.
