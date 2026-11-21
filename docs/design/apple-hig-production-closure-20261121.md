# Apple HIG production acceptance: closure checkpoint

**Source baseline:** `fad896b133f36ff5bbec517297603fbab4b21954`.

**Public publishing branch observed 21 November 2026:** `f15807c37a31ba70eece1405ed4889cf9d73581d`.

The [canonical register](./apple-hig-172-topic-acceptance-register.json) is the current
record. The [20 November reviewer packet](./apple-hig-na-disposition-review-packet-20261120.md)
is a dated snapshot of proposed exclusions, not a current tally or an approval.
Use the CI gap-ledger artifact, `172-topic-gap-ledger.json`, for current counts and blockers;
use the 516-slot plan artifact for platform-specific evidence requirements.

| Platform | Applicable | Proposed excluded | Critical applicable | Registered production acceptance |
| --- | ---: | ---: | ---: | ---: |
| Web | 113 | 59 | 40 | 0 |
| iOS | 133 | 39 | 42 | 0 |
| Android | 99 | 73 | 39 | 0 |
| Total | 345 | 171 | 121 | 0 |

All 172 topics have recorded primary-source reviews and all 516 applicability
decisions are documented. None of the 144 topics with applicable platforms has
recorded full production acceptance. The remaining 28 topics are all-platform
exclusion candidates; none has a recorded independent disposition approval.
The 171 proposed exclusions include 84 across those 28 topics, and 87 across
topics with at least one applicable platform. Eight historical partial live
observations remain partial; no topic status has been promoted by this work.

## First release evidence to obtain

1. **Public web provenance.** Use the existing authorised release process to publish
   an exact, reviewable artifact. In the 21 November read-only HTML sample, all
   six routes returned HTTP 200, but Home, Accessibility, Contact and Products lacked
   the release SHA stamp. Capabilities and Oncology advertised
   `f0dcd3caaa18073f4a2632aa5c2e075cdfdd40b0` in HTML; that stamp alone does not
   prove the deployed artifact or acceptance. Check the intended artifact and
   read back provenance on live routes; repeat the Chromium/WebKit browser
   suite and record keyboard, reflow and manual assistive-technology results.
2. **Scope review in parallel.** An authorised reviewer distinct from the PR author
   reviews the 28 proposed exclusions, citing topic rows and the exact reviewed
   source commit. Record genuine approvals in the canonical register separately;
   do not rewrite the historical packet to show a later decision. For mixed-scope
   topics, review the platform exclusions with the evidence for applicable platforms.
3. **Protected web and native.** Use only accepted protected environments and
   signed, source-identifiable native builds. Validate iOS and Android separately
   on supported devices, including VoiceOver or TalkBack, text scaling, touch,
   keyboard and authorised workflows. Secure Portal and Intelligence evidence
   must include the relevant authentication, roles and tenant boundaries.
   Public HTML and simulator/compile results do not substitute for these checks.
4. **Closure.** Record exact source and runtime revisions, observations, limitations,
   independent approval and release receipts for the applicable topics. Record
   accepted exclusions separately. Reconcile all 172 topic dispositions and
   obtain documented owner sign-off before claiming programme completion.

## Guard regression

An in-memory structural fixture for an approved all-platform disposition used
to fail three source checks, including the packet consistency and gap-ledger
checks. The historical packet now verifies scope and rationale, without blocking
a later independent approval. The generated ledger counts approved exclusions
separately from production-verified topics. The live review readback remains
unchanged: exact GitHub review event, approval state, independent reviewer, and
matching PR head. No synthetic receipt is part of the canonical register.
