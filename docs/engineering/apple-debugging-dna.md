# NovaPharm debugging DNA — engineering contract

**Scope:** Corporate/public website, Founder, Technology, Status, Portal, Intelligence, Distribution/WMS, shared platform components, and automated release pipelines. This is a web/platform interpretation of the owner's five Apple debugging references, **not** a claim of Apple-native runtime equivalence.

## Source references reviewed (16 November 2026)

1. Xcode debugging: https://developer.apple.com/documentation/xcode/debugging — reproduce, inspect appearance and state, use breakpoints/variables, diagnose crashes, memory and resource use, retain useful reports.
2. Core AI Debugger: https://developer.apple.com/core-ai-debugger/ — inspect model structure and intermediate outputs, compare inference with a reference and investigate divergence. This requires Apple-compatible model workflows; it **does not** validate website ML services by itself.
3. Effective Apple bug reporting: https://developer.apple.com/news/?id=2o2p68bq — attach a clear reproduction path, relevant debug logs and environment information. Raw device sysdiagnoses must never be uploaded into public CI artifacts.
4. Interactive command-line debugging: https://developer.apple.com/documentation/xcode/debugging-with-interactive-command-line-tools — Apple's gpudebug inspects **Metal GPU traces**, not ordinary browser rendering; apply the underlying isolate-and-compare technique to WebKit/Chromium with web developer tools and screenshot/network evidence.
5. Kernel debugging: https://developer.apple.com/documentation/kernel/debugging — low-level kernel tooling does not apply directly to a Next.js or static HTML deployment. Use OS/system traces only for a validated native/kernel defect.

The uploaded Core AI Debugger disk image is an Apple/macOS installer; never attach it to the website, serve it publicly, or execute it on a production host.

## Whole-estate workflow

**Every pull request and every main-branch change** launches the read-only inventory in .github/workflows/apple-debugging-dna.yml; the existing .github/workflows/ci.yml production-readiness job independently enforces the same strict scanner and its regression tests:

- Enumerate every Git-tracked path (including binary assets, documentation, test files and workflows). A file is counted as *text inspected* or *metadata only*; there is no misleading claim that binary content was decoded.
- Classify each route, source module, stylesheet and workflow by estate. Check JSON parsability, inadvertent unconditional JavaScript/TypeScript debugger statements, public source-map publication and integrity of the authoritative 54-code Portal module catalogue.
- Record duplicate literal IDs and missing doctypes on static HTML as *warnings* needing a rendered-browser check (not as definitive findings on generated DOM).
- Fail the new CI gate on errors; upload a 14-day JSON inventory with only file paths, sizes, classifications and rule identifiers. **Do not** include file bodies, request payloads, customer records, secrets, cookies, query parameters or raw device logs.
- Keep the existing production-readiness, security, CodeQL, Chromium/WebKit, layout, accessibility, RTL, privacy and protected-service test suites enabled. This extra gate supplements rather than replaces them.

Run locally from the repository root:

    python3 -m unittest discover -s scripts -p test_audit_debugging_dna.py
    python3 scripts/audit_debugging_dna.py --strict

## Incident debugging standard

1. **Reproduce.** Record route, user role (synthetic identifier), build commit, browser/OS version, viewport, exact steps, expected and actual outcome, and time window in UTC. Never collect real credentials.
2. **Isolate.** Find the first incorrect navigation, JavaScript error, API boundary, CSS layout transition, or model decision. Use breakpoints and inspect state locally; for visual issues compare Chromium **and WebKit** at mobile and desktop sizes.
3. **Trace safely.** Use a redacted correlation ID across browser, API and platform logs; capture sanitized status codes and timing, not auth tokens, prescription details, billing data or full response bodies. Store sensitive diagnostics only in approved private systems under least privilege and retention controls.
4. **Test the fix.** Add a deterministic regression in the closest suite. Test keyboard, focus, screen reader, reduced motion, RTL, mobile layout, slow network, auth-denied states and API failures as applicable. For ML, compare known-input outputs to a documented baseline and inspect source/data rights, lineage and uncertainty.
5. **Release in stages.** Require exact-SHA CI passes, approvals, non-regression of existing release contracts, and deployed-origin verification. A green GitHub run never alone proves AWS, Portal, Intelligence, payment processing or WMS is operational.
6. **Close with evidence.** Link issue, failing reproduction, proposed fix, passing regression, merged SHA, deployment SHA, browser captures and outstanding risks. Separate "source merged", "publicly deployed" and "protected service verified".

## What the inventory cannot certify

- Browser execution, real accessibility, live availability, server logs, visual fidelity, model inference, production security, payment settlement, WMS physical operations, or Apple-native GPU/kernel behavior.
- It cannot assert that every route or every binary is defect-free. For those, use the established runtime suites and approved private environment verification.

**Release safeguard:** No service activation, customer-data access, AWS changes or protected-platform production configuration changes are authorized by this document or the debugging inventory.
