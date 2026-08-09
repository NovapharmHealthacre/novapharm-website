# Dependency Licence Audit

Status: repository audit implemented; final legal review pending
Review date: 9 August 2026
Owner: Engineering and Legal

## Scope

`npm run supply-chain:validate` audits every third-party package entry in the committed `package-lock.json`. Private first-party `@novapharm/*` workspaces are excluded because they are not distributed third-party packages. A missing or previously unreviewed SPDX expression fails the check.

The approved engineering inventory currently covers permissive MIT, BSD, ISC, Apache and 0BSD expressions, MPL-2.0, CC-BY-4.0 compatibility data, and LGPL expressions introduced by Sharp/libvips binaries. The machine-readable policy is `config/dependency-license-policy.json`.

The current lockfile inventory contains 524 reviewed third-party package records after adding the MIT-licensed `parse5` structured HTML parser and its entity dependency. The parser replaces ad hoc tag stripping in governed evidence extraction; it does not alter the final legal-review boundary.

## Obligations and limits

- Preserve applicable dependency licence and attribution notices in distributed artifacts.
- Preserve the attribution required by CC-BY-4.0 browser-compatibility data.
- Review Sharp/libvips LGPL relinking and notice obligations for the final distribution model.
- Re-run the audit whenever `package-lock.json` changes.
- Treat a passing engineering audit as inventory evidence, not UK legal advice or a legal clearance opinion.

Final production distribution remains subject to UK solicitor review of licence obligations.
