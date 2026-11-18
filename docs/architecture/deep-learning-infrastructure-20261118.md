# NovaPharm Intelligence — deep-learning infrastructure adoption

Source: OpenAI, [Infrastructure for deep learning](https://openai.com/index/infrastructure-for-deep-learning/), published **29 August 2016**. This is an architectural reference, **not** a current OpenAI API or permission to reuse its old cloud configuration.

## Engineering interpretation
| 2016 article concept | 2026 NovaPharm engineering rule |
|---|---|
| Fast small experiments | Reproducible, isolated nonclinical research; fixed dataset/model hashes |
| Many-day distributed runs | Separately authorised queue-backed training and batch inference |
| Python/TensorFlow/Theano | Evaluate supported contemporary runtimes per model with pinned dependencies and an SBOM; do not adopt Python 2.7 or Theano |
| CPU vs GPU | Require explicit CPU/GPU quotas, memory, duration and chargeback forecasts |
| Terraform/Chef/Packer | Infrastructure as code consistent with the existing AWS/Azure estate, immutable images, policy scans and rollback |
| Kubernetes/EC2 autoscaling | **Candidate only**: use managed orchestration after a verified business requirement, IAM review, funding approval and admission quotas; do not deploy a 2016 custom autoscaler |
| Shared storage | Versioned, encrypted, rights-cleared datasets, least privilege, immutable audit trails and retention rules |
| Monitoring | Experiment lineage, reproducibility, evaluation, failures, structured metrics and redacted logs |
| Cross-region capacity | Data residency, contractual transfers, disaster recovery and region-specific authorisation precede any overflow |

## Implemented source foundation
- Shared JavaScript review-only planner: \`src/ai/compute-admission.mjs\`, with explicit deny cases and Node tests. It does not run code, access AWS, calculate authoritative cloud costs or validate user identity. No submitted boolean is accepted as a licence, security sign-off or identity claim.
- Protected Nova ML web pages: an infrastructure-readiness explanation is visible through the existing verified portal authorization boundary. No public training route is introduced.
- Swift Package companion: local proposal checks only; no iOS app entitlements, cloud requests, model training or user-data transfer.
- Kotlin Android companion: local proposal checks only; no packaged APK, Android UI, identity session or API networking.

## Execution control model — future, not enabled
1. Server authenticates the workforce user, tenant, role and separate scoped permission using the production identity provider.
2. Data steward validates legal source rights, licence, permitted geography, classification, retention and provenance. Reject patient or commercially restricted data by default.
3. Independent ML/Quality/Privacy/Security owners approve the model purpose, statistical study design, holdouts, bias checks and safety risk.
4. Trusted backend computes cloud cost ceilings **server-side**, verifies current actual spend and quota, selects a region approved for residency and security, and creates an audit event.
5. Only then may a separately reviewed scheduler dispatch a short-lived least-privileged container with limits, private storage/networking, no embedded cloud credentials, and explicit cancellation/termination.
6. Immutable model artefacts record version, rights, dataset checksum, evaluation, reproducibility seed, incident path and rollback. Human sign-off controls any model promotion and output use.

**No job execution exists in this change.** The planner's \`review-only\` response is not a permit, cannot be submitted to a scheduler as an authorization token, and must not be used to permit production. The local estimated-cost input is advisory and untrusted. A real system must enforce budgets in trusted infrastructure independently of the client.

## Release gates
- Node contract tests; Apple Swift Package compile and denial tests on macOS/Xcode; Kotlin compile and denial tests on CI.
- Protected browser route authorization, responsiveness, WCAG, no personal-data capture, test coverage, CSP/security regression.
- Trusted backend, operator accounts, secrets, IAM, threat model, S3 encryption and versioning, region/cost policy and incident handling **not yet provided or verified**.
- Device signing, Android app integration, Apple device tests and store releases are **not done**.
- No new billable AWS/Azure resources may be provisioned from this source-only change.

## App transport direction
Future apps must consume an authenticated, versioned backend API for model registry, job requests, state, cancellation and evaluation reports. Shared request IDs, paginated redacted summaries, rate limiting and consent/governance checks are required. The server is authoritative; mobile and web validation only improve UX and never replace server authorization. Existing public medicines research and regulatory decisions remain separate from this experimental ML plane.
