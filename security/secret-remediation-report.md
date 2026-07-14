# Secret Remediation Report

Status: current tree clean; full-history remediation blocked by explicit owner-approval gate  
Last reviewed: 14 July 2026

## Completed

- every previously published portal credential is treated as permanently compromised and is not used by the candidate;
- plaintext `PORTAL_PASSWORD` is rejected in production;
- one-time bootstrap input is accepted only as protected configuration and never returned;
- unresolved Key Vault references fail closed instead of becoming predictable secret text;
- application secrets are designed for Key Vault and GitHub Azure deployment uses OIDC, not a client secret;
- current-tree scan passed for 281 repository files at the candidate state before this report update;
- no real secret value is present in `.env.example`.

## Not completed

Prior verified evidence says the retired value remains in ancestry inherited by `main` and historical pull-request material. A full mirror, all-branch/tag scan, `git-filter-repo` rewrite, coordinated force push, fresh clones and GitHub secret-scanning acceptance have not been performed. The owner has not provided the separate explicit destructive-history approval required by the brief.

See `security/git-history-sanitisation.md`. Even a successful rewrite cannot delete downloaded, cached, forked or externally stored copies; credential retirement remains mandatory.
