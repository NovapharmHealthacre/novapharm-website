# Secret Remediation Report

Status: active Git history clean; GitHub cached pull-request refs pending Support removal

Last reviewed: 14 July 2026

## Completed

- every previously published portal credential is treated as permanently compromised and is not used by the candidate;
- plaintext `PORTAL_PASSWORD` is rejected in production;
- one-time bootstrap input is accepted only as protected configuration and never returned;
- unresolved Key Vault references fail closed instead of becoming predictable secret text;
- application secrets are designed for Key Vault and GitHub Azure deployment uses OIDC, not a client secret;
- current-tree scan passed for 304 repository files at tested implementation commit `7d14d050eda5d5e8704e76ba1b9d398f2816ba22`;
- no real secret value is present in `.env.example`.
- the owner authorised the destructive history operation on 14 July 2026;
- an encrypted, checksummed full mirror backup was created outside the repository and restored sufficiently to pass `git bundle verify`;
- six branch refs, no tags, `main`, PR 5 head and advertised pull-request refs were recorded before rewrite;
- `git-filter-repo` and `gitleaks` are installed and repository-admin GitHub authentication is available.
- protected mechanical discovery identified exactly one non-placeholder production credential candidate without displaying it;
- exact-value pre-scan found nine reachable blobs in five production documentation/configuration paths;
- the isolated mirror rewrite changed 71 of 74 commits;
- exact-value post-scan checked 1,468 reachable objects and found zero matches;
- post-rewrite `gitleaks` full-history scan found zero findings;
- post-rewrite `git fsck --full` passed;
- rewritten `main` and PR 5 tip trees match the original tip trees exactly.
- all six branch heads were atomically force-updated with lease protection;
- remote branch SHAs match the verified rewritten reference map;
- a fresh branch-only clone passes exact-value, `gitleaks` and `git fsck` checks across all active branch history;
- GitHub secret scanning reports zero open alerts;
- PR 5 remains open, draft and mergeable on the rewritten base and head.

## Not completed

GitHub still advertises immutable historical pull-request refs for closed PRs 1 to 4. An all-advertised-ref mirror therefore still finds nine old blobs even though all active branch ancestry is clean. GitHub Support must purge the cached pull-request material before an all-ref exact scan can pass.

The final free-validation commit and CI run remain pending. GitHub pull-request refs and cached diffs cannot be force-pushed by a repository administrator, so Support removal is an external acceptance gate.

See `security/git-history-sanitisation.md`. Even a successful rewrite cannot delete downloaded, cached, forked or externally stored copies; credential retirement remains mandatory.
