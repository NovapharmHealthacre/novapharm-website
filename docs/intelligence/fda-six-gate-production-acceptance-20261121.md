# NovaPharm FDA — six-gate production acceptance register
Date of repository and AWS inspection: 21 November 2026. This document is an inspection and implementation artifact, not a regulatory, legal or production sign-off.

## 1. Web source-code checks and merge
**PASS for earlier PRs #1023 and #1024.** Both merged to `main`, with 34/34 and 27/27 exact-head checks respectively. This follow-up candidate separately requires new CI acceptance and must not change the public site publishing branch.

## 2. Actual authenticated FDA API release
**NOT ACCEPTED.** In AWS eu-north-1 the existing `novapharm-intelligence-private-terminal-gateway` uses an `AWS_IAM` catch-all route. It has no explicit `GET /v1/intelligence/regulatory/us/fda-research` JWT route. Existing private terminal Lambda is a container image last modified 15 November 2026. Public FDA/ClinicalTrials research Lambda remains a separate service, unchanged. Merely merging `server.mjs` does not deploy its latest FDA code into this Lambda.
This PR includes a read-only private API handler candidate with strict authorizer-claim checks, disabled-by-default activation, and a required **distributed per-identity limiter**. No limiter/table exists in the approved release config. A memory-only limiter is insufficient across Lambda concurrency. Do not point a new route to an old image, allow arbitrary ID tokens, or weaken the existing IAM wildcard.

## 3. Native iOS
**SOURCE CANDIDATE; NOT ACCEPTED.** SwiftUI research source preview is merged. This PR adds HTTPS transport and iOS AuthenticationServices S256 authorization-code flow with device-only Keychain access-token custody. Actual private API sign-in remains blocked by:
- existing iOS preview bundle ID `com.example.NovaPharmNativePreview`;
- no registered approved native client or callback scheme for NovaPharm Intelligence in the Cognito production user pool;
- no approved signing identity/TestFlight device evidence;
- `NovaNativeReleasePolicy` production, auth and network flags remain **false**.
Cognito MFA is ON; successful real MFA setup, recovery and token revocation still require iPhone and iPad device acceptance.

## 4. Android / Expo
**SOURCE CANDIDATE; NOT ACCEPTED.** Expo SDK 58 native preview has five FDA sources and the new fixed-host authenticated gateway transport. No Android signed package identity or dedicated Cognito native public-client callback exists. The approved `expo-auth-session`, `expo-secure-store`, `expo-web-browser` and `expo-crypto` packages are **not installed in the current lockfile**. Do not fake PKCE by opening a browser or ship credentials in app files. Actual sign-in, Android Keystore protected storage, logout, Play signing and device acceptance are outstanding.

## 5. Data governance
**QUARANTINE ONLY, NOT ACCEPTED.** Read-only Atlas verified `novapharm_staging` with 153 source rows and 4 quarantine manifests. `nova_source_rights_grants_staging` has 0 documents; `nova_medicine_evidence_staging` has 0 documents. Source-specific manifest here covers labels, Drugs@FDA, NDC, FAERS aggregate report counts and recalls. Identity keys are US source observations only; they do not infer global canonical medicines. Source terms and third-party exceptions require independent legal/regulatory sign-off; data cannot be admitted automatically.

## 6. Independent end-to-end live acceptance
**NOT ACCEPTED.** No production route/token-based test, no signed native iOS/Android app, no revoked-user/role isolation evidence or actual customer-independent release report. Unit, synthetic browser and live *publisher-only* checks do not count as production user acceptance.

## Pre-authorised cost and infrastructure limitations
Owner configuration: `productionSignoff: not_granted`, no new paid infrastructure, no new billing, no unapproved medicine publication, and no DNS/API cutover. This PR does not create new AWS resources, new Cognito clients, Atlas documents, SharePoint files, or a commercial publisher.

## Required verifiable sequence
1. Native identifiers and application-signing owners approve app IDs and redirect ownership.
2. Secure dedicated native public OAuth app clients with PKCE, MFA, exact callback URLs; enable scopes only for reviewed clients.
3. Deploy the exact reviewed private FDA container image to an approved alias with an atomic distributed quota mechanism and no user-identifying log payloads.
4. Add a JWT-authorized **explicit GET** route, enforce the exact board scope and backend Cognito group; leave the general IAM route untouched.
5. With real authorized/unauthorized users, test five datasets, stale data, 401/403/429/503, slow/oversized responses, TLS, logging, latency, quota and revocation.
6. Accept source-specific rights, data quality, provenance and refresh before any Atlas admission.
7. Run signed iPhone/iPad and Android device matrix and independent role/accessibility review; only then grant the distinct owner production signoff.

**Do not report 100% until the six gates are independently signed and verified in the actual deployment.**
