# CRO Public Claims Report

Candidate date: 18 July 2026

Status: public candidate passes the implemented claims gate

## Approved proposition

NovaPharm may describe an evidence-led support model built around:

- clinical-development programme framing;
- UK regulatory and ethics pathway coordination;
- responsibility and dependency mapping;
- controlled document and decision architecture;
- qualification-dependent specialist-provider orchestration;
- clinical-supply responsibility planning; and
- development-to-market continuity.

This wording is supported by the reviewed business plan, current repository architecture and official MHRA, HRA and ICH guidance. It does not establish an operational full-service CRO.

## Required qualifiers

| Area | Required public boundary |
| --- | --- |
| Specialist clinical operations | Delivered only by appropriately qualified and contracted organisations or people. |
| Sponsor duties | Remain with the named sponsor notwithstanding delegation. |
| Regulatory and ethics outcomes | Determined by the relevant authorities; never guaranteed by NovaPharm. |
| Clinical supply | Planning and coordination only; no owned manufacturing, depot, release or IMP distribution claim. |
| Therapeutic areas | Strategic focus, not completed NovaPharm trial history. |
| Technology | Architecture and maturity model, not a validated live sponsor platform claim. |
| Market continuity | Conditional on verified evidence and applicable authorisation. |

## Prohibited or removed claims

- Full-service, global or end-to-end operational CRO
- Clinical-trial sponsor or sponsor representative
- Owned investigator-site network, laboratory, depot, manufacturing or logistics operation
- In-house clinical monitoring, data management, biostatistics, medical monitoring or safety database
- Patient recruitment, trial participation or patient-facing treatment access
- Completed NovaPharm trials, inspections, submissions, approvals or clinical outcomes
- Quantified sites, countries, patients, trial speed, enrolment or success rate
- Unverified clients, partners, testimonials, awards, case studies or logos

## Automated controls

`scripts/audit-public-claims.mjs` now checks the CRO route and all sitemap public routes for prohibited full-service, sponsor, owned-infrastructure and unsupported trial-history patterns. `scripts/test-cro-section.mjs` requires the scope boundary, sponsor-retained model, no-fit decision route, safety warning and evidenced content counts.

The capability-level evidence is recorded in `docs/cro-capability-evidence-register.md`. Any future expansion requires source evidence, capability-owner approval, legal review where relevant and a regenerated claims audit.
