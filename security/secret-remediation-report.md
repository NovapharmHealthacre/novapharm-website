# Secret Remediation Report

Status: current candidate and active Git history clean; GitHub cached pull-request refs pending Support removal

Last reviewed: 7 August 2026

## Completed

- every previously published portal credential is treated as permanently compromised and is not used by the candidate;
- plaintext `PORTAL_PASSWORD` is rejected in production;
- one-time bootstrap input is accepted only as protected configuration and never returned;
- unresolved Key Vault references fail closed instead of becoming predictable secret text;
- application secrets are designed for Key Vault and GitHub Azure deployment uses OIDC, not a client secret;
- current-tree scan passed for 318 repository files at tested candidate commit `53c90b137268c113502daed700386b1185d30fd7`;
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
- a fresh active-ref mirror at candidate `53c90b137268c113502daed700386b1185d30fd7` checked 1,564 reachable objects and passed exact-value, `gitleaks` and `git fsck` checks across all active branch history;
- GitHub secret scanning reports zero open alerts;
- PR 5 remains open, draft and mergeable on the rewritten base and head.

## PR 16 current acceptance

- the repository secret-pattern validator passed against the current candidate;
- Gitleaks 8.30.1 scanned a candidate snapshot of 1,373 tracked and intended untracked files, including the requirements artefacts, and found no leaks;
- a fresh bare mirror fetched all 17 active remote branch heads and no tags, passed `git fsck --full`, scanned 286 commits and approximately 49.53 MB, and found no leaks;
- GitHub secret scanning reports zero open alerts;
- the candidate resolves the current high-severity `js-yaml` advisory at 3.15.1 and carries `sharp` 0.35.3; the default-branch Dependabot alert for older `sharp` remains open until an accepted merge updates `main`;
- `npm audit --omit=dev --audit-level=high` reports zero vulnerabilities;
- no exact retired value was requested, displayed or reintroduced during this acceptance run.

Gitleaks initially identified the deliberately published IndexNow ownership-verification identifier in its source and generated config. The [official IndexNow protocol](https://www.indexnow.org/documentation) requires a host-accessible verification file. `.gitleaks.toml` therefore uses Gitleaks' documented rule-specific `AND` allowlist to constrain only the `generic-api-key` rule, the two IndexNow config paths and exact 32-hex declaration forms. The active-history and current-tree scans pass with that narrow reviewed exception; other rules and paths remain active.

## Not completed

GitHub still advertises immutable historical pull-request refs for closed PRs 1 to 4. The corresponding all-advertised-ref mirror checked 1,648 reachable objects and found nine old objects even though all active branch ancestry is clean. GitHub Support must purge the cached pull-request material before an all-ref exact scan can pass.

Final exact-head CI and GitHub Support removal remain external acceptance gates. Pull-request refs and cached diffs cannot be force-pushed by a repository administrator.

See `security/git-history-sanitisation.md`. Even a successful rewrite cannot delete downloaded, cached, forked or externally stored copies; credential retirement remains mandatory.
