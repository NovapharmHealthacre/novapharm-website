# Workspace dependency graph: phase B

The read-only graph enumerates every project in the existing estate register, distinguishes declared npm manifests from opaque projects, reads production/development/peer/optional dependencies and propagates changes through reverse transitive dependencies. Duplicate names, malformed manifests and unresolved local dependencies cannot silently narrow coverage. Missing, unknown, shared, manifest and opaque-project changes expand to the full estate.

Run locally from the repository:

    node --test scripts/ci/test-workspace-dependency-graph.mjs
    node scripts/ci/workspace-dependency-graph.mjs packages/security/src/index.ts

The existing change-impact report now includes workspaceImpact using the same verified PR file list, with no additional API calls or runner. The required policy job also verifies the real workspace graph. This phase is not an affected-test selector. Native toolchains, serverless and infrastructure projects, generated assets, runtime imports, non-manifest dependencies and cross-estate source contracts need explicit modelling before promotion. The report marks graphComplete=false and testsSkipped=0. Required jobs and all existing validation remain unchanged.

Promotion requires verified cross-language edges, comparison against full-suite evidence over representative changes, a measured false-negative rate and independent review of release boundaries. Do not infer that declared npm dependencies prove the complete runtime graph.
