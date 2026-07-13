# Git History Sanitisation Runbook

Status: required owner-authorised security operation; not executed  
Repository: `NovapharmHealthacre/novapharm-website`  
Assessment updated: 13 July 2026

## Verified scope

- Pull Request 2 is closed and squash-merged as `189da77fdaff9ac5c79d39af60e93dbb06a48e58`.
- The retired credential is absent from the merged tree and the post-launch candidate tree.
- The retired value remains in ancestry inherited from the pre-merge `main` snapshot and in historical pull-request material. The value is intentionally not reproduced in this report.
- Active branches observed through the connected GitHub app are `main`, `codex/enterprise-redesign`, `codex/ultra-premium-rebuild` and `codex/post-launch-production-completion`.
- A current-tree repository scan passes, but that is not a full-history or all-ref pass.

Because an ancestor of `main` is affected, an ordinary deletion commit cannot remove the historical object. Every affected active branch and tag must be assessed in a coordinated rewrite. History rewriting cannot invalidate copies already downloaded, cached, forked or logged, so permanent credential retirement remains mandatory regardless of the rewrite.

## Authorisation gate

Do not change remote history until all are true:

1. The owner explicitly authorises the force-push and re-clone outage.
2. A repository-administrator credential is available in a protected Git environment.
3. Branch-protection changes and the exact affected refs are reviewed.
4. Collaborators, CI and deployment owners are notified.
5. The retired credential is confirmed rotated everywhere.

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

Keep the encrypted mirror only for the approved incident-retention period with tightly limited access.
