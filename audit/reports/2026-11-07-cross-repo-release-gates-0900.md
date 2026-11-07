# Cross-repository release-gate evidence | 2026-11-07 09:00 IST

Read-only inventory and exact-head CI observations. This is **not** approval to merge, deploy, close issues, enable production contact intake or move data.

## Inventory (GitHub search snapshots)
- `novapharm-website`: 16 PRs surfaced by `is:open` search (95,92,91,89,88,87,85,80,79,78,77,76,75,74,61,60); 5 open issues (#90,#86,#84,#55,#54). **Search inconsistency:** targeted query finds PR #97, omitted by open-index query; therefore 16 is not a complete authoritative count. Check #97/#96/#82 explicitly before any release decision.
- `vishal-portfolio`: 1 open PR (#42), 1 issue (#43).
- `novapharm-innovation-technology`: 1 open PR (#3), 0 open issues. #3 is temporary data candidate; do not merge without final source-data artifact.
- `ak-online-services`: 0 open PRs, 0 open issues in this search.

## Corporate exact-head integration #97
- SHA `31b76e7188ae4c681235874e1411450efb2db16a`.
- All seven returned PR-head runs **completed successfully**: [readiness 42332264752](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42332264752), [supply chain 42332264766](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42332264766), [CodeQL 42332264733](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42332264733), [visual 42332264771](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42332264771), [SEO 42332264807](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42332264807), [public browsers 42332264769](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42332264769), [unified Chromium/WebKit 42332264795](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42332264795).
- This confirms **PR-head CI only**, not production artifact/source parity or managed AWS/Entra/SES/Atlas live acceptance. Main push auto-triggers GitHub Pages publish. No merge until owner-reviewed release effect, exact-SHA artifact parity, rollback and protection verified.
- #95 Apple CSS is a distinct draft, not included in this observation. #85 AWS foundation, #91 managed staging and #92 design forensic audit remain independent review gates. Issues #55/#84/#86/#90/#54 stay open.

## Portfolio #42 exact-head observed failure
- Inspected `f3c870d50a194519b905f6d9d1347c645ae42c49`: [browser QA 42333413931](https://github.com/NovapharmHealthacre/vishal-portfolio/actions/runs/42333413931) PASS; [quality 42333413956](https://github.com/NovapharmHealthacre/vishal-portfolio/actions/runs/42333413956) FAIL; [Lighthouse 42333413991](https://github.com/NovapharmHealthacre/vishal-portfolio/actions/runs/42333413991) CANCELLED.
- Exact failing quality step: `npm run test:editorial-freshness` identified three 115-day-old articles against 90-day policy: **Regulatory Approval Is Not Market Access**, **UK Parallel Import Licensing: What the Route Actually Requires**, **Building a Pharmaceutical Company in a Regulated Market**. Tracked by #43. No factual review performed in this audit; **do not edit reviewed dates or weaken the gate**. Prior descriptive-link fix may have resolved Lighthouse link text, but cancelled run provides no final score.
- Next: review each regulated article against current primary regulatory sources, update only substantiated facts/citations and editorial review metadata after substantive review; rerun exact-head quality and Lighthouse.

## Production boundaries
Preserve public website and Azure rollback. No public Atlas allowlist, unverified Cognito/Entra sign-in, SES contact acceptance, paid AWS provisioning, DNS cutover or regulated data transfer. AWS eu-north-1 runtime and email/DB/auth end-to-end evidence must be independently observed before acceptance.
