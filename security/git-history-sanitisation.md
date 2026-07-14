# Git History Sanitisation Runbook

Status: active branch history sanitised; GitHub cached pull-request refs pending Support removal

Repository: `NovapharmHealthacre/novapharm-website`  
Assessment updated: 14 July 2026

## 14 July 2026 execution evidence

- The owner explicitly authorised the coordinated destructive rewrite, force push and fresh-clone procedure.
- A full mirror was cloned from GitHub at 07:50 UTC before any rewrite.
- The mirror passed `git fsck --full` and was bundled, encrypted with AES-256-CBC/PBKDF2, checksummed and decrypted into an isolated temporary file.
- `git bundle verify` confirmed a complete history containing six branches, no tags and the advertised pull-request refs.
- Recorded `main`: `861a35151f926569677eee3a2921417b55370324`.
- Recorded PR 5 head: `e95913f223cf3e1b4e43d87a0d46cbc7d41a23b8`.
- Protected backup directory: `~/Library/Application Support/NovaPharm Security/git-history/20260714T075045Z`.
- Backup files and the separately stored encryption key are mode `0600`; the directory is mode `0700`.
- `git-filter-repo` 2.47.0 and `gitleaks` 8.30.1 are installed. GitHub CLI has repository/workflow scope under the authorised repository owner.
- GitHub reports no branch protection and no repository ruleset on `main`; protection restoration is therefore not required unless settings change before the push.
- Protected mechanical discovery found one non-placeholder seven-byte alphanumeric value assigned to `PORTAL_PASSWORD` in production documentation/configuration paths. The value was never printed or placed in a command argument.
- The exact-value pre-scan found nine reachable blobs across `.env.example`, `README.md`, deployment documentation and the security report.
- `git-filter-repo --sensitive-data-removal` rewrote 71 of 74 commits in the isolated mirror.
- The exact-value post-scan checked 1,468 reachable objects and found zero matches.
- The post-rewrite `gitleaks 8.30.1` full-history scan found zero findings and `git fsck --full` passed.
- The rewritten `main` and PR 5 tip tree objects are byte-identical to their pre-rewrite counterparts, proving the current website tree was preserved.
- Rewritten local `main`: `4ad7513eeda148f54d86403271b75c00e6da91e1`.
- Rewritten local PR 5 head: `7fdceab4afe3e83e36bdfdb9817a19e2aaca6a40`.
- All six branch heads were updated atomically on GitHub using explicit force-with-lease checks against the recorded pre-rewrite SHAs. No tag or unrelated ref was added, deleted or changed.
- GitHub reports remote `main` at `4ad7513eeda148f54d86403271b75c00e6da91e1`; the rewritten PR 5 branch was advanced through the verified free-validation implementation without reintroducing the retired value. PR 5 remains open, draft and mergeable.
- A fresh post-implementation active-ref mirror from GitHub at candidate `53c90b137268c113502daed700386b1185d30fd7` checked 1,564 reachable objects across six branches and no tags: exact matches zero, Gitleaks findings zero and `git fsck --full` passed.
- GitHub secret-scanning API reports zero open alerts. Dependabot alerts are disabled and CodeQL has no analysis, so those services provide no additional acceptance evidence.
- The corresponding all-advertised-ref mirror checked 1,648 reachable objects and still found nine old objects only through GitHub-managed historical `refs/pull/1` to `refs/pull/4`. Repository administrators cannot rewrite that namespace.

The protected plaintext exact-value and replacement-input files were deleted after final remote verification. The encrypted pre-rewrite incident backup and its separately protected key remain under the restricted retention procedure. The retired value was not pasted into chat, a workflow input, command argument, shell history or this repository.

## Verified scope

- Pull Request 2 is closed and squash-merged as `189da77fdaff9ac5c79d39af60e93dbb06a48e58`.
- The retired credential is absent from the merged tree and the post-launch candidate tree.
- The retired value is absent from all active branch ancestry. It remains reachable only through historical GitHub-managed pull-request refs and cached pull-request material. The value is intentionally not reproduced in this report.
- Six active branch refs and no tags were present in the mirror: `main`, `codex/azure-production-platform`, `codex/enterprise-redesign`, `codex/post-launch-production-completion`, `codex/ultra-premium-rebuild` and `fix/live-readability-premium-pass`.
- Current-tree and active-branch full-history scans pass from a fresh GitHub clone. GitHub cached pull-request-ref remediation remains pending Support action.

Because an ancestor of `main` is affected, an ordinary deletion commit cannot remove the historical object. Every affected active branch and tag must be assessed in a coordinated rewrite. History rewriting cannot invalidate copies already downloaded, cached, forked or logged, so permanent credential retirement remains mandatory regardless of the rewrite.

## Remaining remote gate

Do not declare remote history clean until all are true:

1. Require the final PR 5 workflows to pass against the latest pushed head.
2. Ask GitHub Support to purge inaccessible pull-request cached views and dereference the sensitive objects associated with the historical pull-request refs.
3. Repeat the all-advertised-ref exact scan after GitHub confirms the purge and require zero matches.
4. Require all prior local clones and deployment caches to be discarded and recreated from the rewritten remote.
5. Keep the retired credential permanently disabled everywhere.

## Secure backup and reference record

Run on a trusted encrypted workstation. Keep the mirror, logs and protected replacement input outside this repository, Render and public cloud folders.

```sh
umask 077
git clone --mirror https://github.com/NovapharmHealthacre/novapharm-website.git novapharm-website-before-sanitisation.git
cd novapharm-website-before-sanitisation.git
git show-ref > ../refs-before-sanitisation.txt
git for-each-ref --format='%(refname) %(objectname)' refs/heads refs/tags > ../branches-tags-before-sanitisation.txt
git fsck --full
```

Encrypt the mirror and reference maps, record checksums and verify restoration before changing any remote ref.

## Rewrite and verify

Prepare the exact-value replacement file through a protected editor with mode `0600`; never echo it, commit it, paste it into a ticket or include it in shell history.

```sh
git filter-repo --sensitive-data-removal --replace-text /protected/path/retired-secret-replacements.txt --force
git fsck --full
git for-each-ref --format='%(refname) %(objectname)' refs/heads refs/tags > ../branches-tags-after-sanitisation.txt
gitleaks git . --log-opts='--all'
```

Use `scripts/scan-git-history-exact.mjs` before and after filtering. It reads the retired value from a protected file, scans reachable blobs and Git metadata, and reports only object IDs, paths and counts:

```sh
node scripts/scan-git-history-exact.mjs /protected/mirror.git /protected/retired-value
node scripts/scan-git-history-exact.mjs /protected/mirror.git /protected/retired-value --expect-zero
```

Also run the approved exact-value detector using protected input across every reachable object, branch and tag. Check out the final candidate, run `npm ci --ignore-scripts`, `npm audit --omit=dev --audit-level=high` and `npm run check`, then compare the before/after reference maps.

## Coordinated update

Only after the owner gate:

1. Pause merges and deployments.
2. Temporarily permit the reviewed ref updates.
3. Push only the verified affected branches and tags.
4. Restore branch protection immediately.
5. Run GitHub secret scanning and require zero open findings for the retired credential.
6. Recreate or rebase any open candidate pull request from the sanitised `main` history.
7. Require collaborators and deployment systems to delete old clones and re-clone.

GitHub's `refs/pull/*` namespace is read-only to repository pushes. Rewriting active branches and tags does not by itself delete old pull-request diffs or cached views. After the verified branch/tag force push, close or replace contaminated open pull requests and ask GitHub Support to purge affected pull-request cached views and dereference the sensitive objects. Full-history remediation remains incomplete until that external step and GitHub secret-scanning acceptance are confirmed.

Keep the encrypted mirror only for the approved incident-retention period with tightly limited access.

## Backup restoration

On the authorised Mac, decrypt the bundle to a mode-`0600` temporary file using the separately stored key, verify it, then clone from the bundle. Do not upload or extract this backup into a public, synced or deployment directory because it intentionally contains the pre-remediation history.

```sh
umask 077
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in "$HOME/Library/Application Support/NovaPharm Security/git-history/20260714T075045Z/novapharm-before-sanitisation.bundle.enc" \
  -out /private/tmp/novapharm-before-sanitisation.bundle \
  -pass file:"$HOME/Library/Application Support/NovaPharm Security/git-history/backup-encryption.key"
git bundle verify /private/tmp/novapharm-before-sanitisation.bundle
git clone /private/tmp/novapharm-before-sanitisation.bundle /protected/restore-location
rm -f /private/tmp/novapharm-before-sanitisation.bundle
```
