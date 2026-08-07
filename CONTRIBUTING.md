# Contributing

NovaPharm changes are made through reviewed branches and pull requests. Do not commit credentials, production data, private documents, patient information or unsupported pharmaceutical claims.

Before opening a pull request:

1. Create a focused `codex/` or approved feature branch from current `main`.
2. Keep changes within the relevant application or shared ownership boundary.
3. Add or update a `.changeset/*.md` entry for materially changed workspace packages and maintain the `CHANGELOG.md` Unreleased section.
4. Run `npm ci --ignore-scripts`, `npm run check`, `npm audit --omit=dev --audit-level=high` and the applicable browser suite.
5. Update claims, evidence, architecture and operational documentation when behaviour changes.
6. Link test evidence and state every owner-controlled or external dependency honestly.
7. Request review from CODEOWNERS and do not deploy an unreviewed feature SHA.

Third-party workflow actions must use a reviewed 40-character commit SHA with the intended release line retained in a comment. New dependency licence expressions require an explicit policy and obligations review; do not weaken the validator to admit an unknown licence.

Regulated titles, licence statements, partner authorisations and product availability require evidence approval. Tests must not be weakened to make a pull request pass.
