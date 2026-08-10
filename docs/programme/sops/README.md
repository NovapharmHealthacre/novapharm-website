# NovaPharm Operational SOP Programme

This directory is the canonical Section 70 procedure authority for the NovaPharm executive platform mandate.

It contains exactly **44 named procedures**. Every procedure is executable to the current safe boundary and contains the mandated sections: Owner, Purpose, Trigger, Prerequisites, Permissions, Steps, Evidence, Stop Conditions, Escalation, Rollback, Recovery and Review Cadence.

## Current truth

- Current estate state: **R1 PUBLIC RELEASE VERIFIED**.
- Repository procedure set: **implemented as executable documents**.
- Managed-staging rehearsal: **not complete**.
- Production acceptance: **not complete**.
- A procedure existing in Git is not evidence that a human has rehearsed it against a managed environment.
- SOP-27 is blocked until a qualified Safety Owner and approved pharmacovigilance process exist.
- SOP-32–35 are blocked until their live integration authorities exist.
- SOP-43–44 are not applicable until Swift/Wasm or C/C++ has independently passed the mandate's language/performance/security gate.

## Operating rule

Before any SOP is used for a production-impacting action, verify all of the following:

1. Its status is applicable to the target environment.
2. Every prerequisite and named authority exists now—not merely in architecture documentation.
3. Required owner, financial, legal/regulatory and production gates are approved.
4. The exact environment/resource/SHA is recorded.
5. The operator has only the permissions named by the procedure.
6. STOP conditions are understood before mutation.
7. Rollback/recovery is available and evidenced.
8. Applicable high-risk procedures have current rehearsal evidence before R3/R4/R5/R6 progression.

## Existing authorities preserved

These procedures refine rather than replace the strong existing runbooks:

- `docs/programme/operations-runbook.md`
- `deployment/deployment-runbook.md`
- `deployment/backup-and-restore-runbook.md`
- `docs/programme/domain-trust-runbook.md`
- `security/incident-response-plan.md`
- `security/identity-and-access-model.md`
- `docs/programme/integration-register.md`
- `docs/programme/security-governance-gates.md`
- `docs/programme/aah-retest-checklist.md`
- `docs/programme/portal-api-migration-acceptance.md`

If an older runbook conflicts with a newer explicit mandate gate, the mandate and the more conservative safety boundary win until the conflict is reconciled in Git.
