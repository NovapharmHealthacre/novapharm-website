# NovaPharm global distribution — five-stage operating evidence contract

**Programme owner:** NovaPharm Healthcare
**Initial scope:** UK-first, then independently qualified country/partner federation
**Status of this artifact:** Code contract and CI tests only. **Not** a licence, operating authorization, proof of customer volume, accepted stock, contract, funding or active international lane.
**Master go/no-go:** [#356](https://github.com/NovapharmHealthacre/novapharm-website/issues/356); [enterprise cutover #601](https://github.com/NovapharmHealthacre/novapharm-website/issues/601)

## Why this is needed
A finished digital marketplace does not establish licensed medicine supply rights, inventory, on-time delivery, financing or international partnerships. NovaPharm's established 15-gate UK release candidate and existing enterprise default-deny order service stay authoritative. New pure review functions in \`src/core/distribution-network-controls.mjs\` let later engineering work consume approved evidence without turning source or UX completeness into trade permissions.

## Stage 1 — Verified B2B catalogue and enquiry service
Already deployed: authenticated customer catalogue; 19 Nutraxin and 373 ESCO references; non-binding quote requests; secure support receipt; customer repeat-request preparation and truthful request tracking. The Apple-inspired customer shell is live in the existing transitional BFF. Production enterprise portal and verified cross-tenant customer-to-employee shared ledger are not accepted.

**To close:** Independently verify two real, separate, qualified business accounts across sign-in/MFA where required, submission, request history, support receipt, access denial, replay, recovery, representative user/mobile tests and account qualification. Record immutable source and signed test evidence. Do not call 18 Customer UI routes 18 operational financial and fulfilment modules.

**New increment:** Server-queried account activity shows bounded *recent* purchase-request and support-case records from the authenticated account, not fabricated all-time order counts (PR #653).

## Stage 2 — UK transactional wholesale
**Do not trade regulated medicines until legally authorised.** Have Regulatory/Quality decide the legal activity route, independently check the applicable MHRA approvals, RP roles, QMS and site scope, qualified buyer/supplier, country-specific product/MA/PLPI rights, batch/expiry/FEFO/ATP, authorised price/VAT/credit, WMS/pick/pack/carrier, returns and recall. Use \`assessDistributionReleaseCandidate\` for a **review-only** D01–D15 packet, not a sales switch; \`assertEnterpriseOrderSubmissionAllowed\` still denies production order/warehouse writes.

**To close:** D01–D15 signed, independently authenticated to actual company/site/product/lane; negative tests and real witness acceptance; finance/reimbursement and customer commitment; living exception/recall SOPs and responsible authority.

## Stage 3 — High-density UK replenishment
Accept only attributable, measured repeat purchasing and verified profit. \`measureVerifiedDistributionService\` calculates bounded OTIF, perfect-order rate and gross contribution (in minor currency units) **only from a source independently reviewed as complete**: order-level due dates, delivery proof, line completeness, quality, invoices and reconciled costs. Missing coverage, carrier evidence, cross-country records or duplicate order IDs produces \`null\` metrics rather than invented percentages.

**To close:** qualified customers/contracts and real local depot/service density, actual eligible orders, independently reviewed 3PL/carrier trace, prices, returns, fill rate, contribution per drop, receivables/payables and on-call exception resolution. Establish period/population before publishing KPI targets.

## Stage 4 — Cross-country federation
\`reviewFederatedTerritoryCandidate\` checks **eight independent local evidence controls** for the exact country, product, legal entity, warehouse site and partner. **UK rights do not extend to DE, US, AE or any other destination.** Even a complete synthetic packet only becomes \`evidence_packet_complete_for_independent_review\`. It cannot import, distribute, charge a customer or activate a country.

**To close per jurisdiction:** signed qualified partner agreement, import/export legal role and licences where applicable, product-country authorisation, local tax/currency, data transfers, approved site/transport lanes and quality/recall/returns, service and insurance with evidence-backed obligations.

## Stage 5 — Scale and intelligence
\`reviewReplenishmentSuggestion\` accepts only an internal-demand-planning signal with source-rights approval, correct territory/product scope and an MFA-verified human reviewer. It never places an order, contacts a supplier, reserves stock or automatically substitutes a medicine.

**To close:** rights-cleared historical demand, independent predictive backtesting, distribution coverage, manufacturer capacity/allocations, funding/working-capital approval, specialty/cold chain where needed, human purchasing approval and quality audits with recorded outcomes.

## Release invariant
All stage flags produced by this module are **evidence-review labels**, not transaction switches. The functions always return:
- No medicine or product sale authorisation.
- No payment collection or supplier communication.
- No stock reservations or dispatch authority.
- No cross-border inference from a domestic permission.
- No synthetic fill rates, order revenue or margin.

The real execution systems must separately authenticate source evidence and persist audited release decisions. As of this contract, there is no independent operational evidence that all five stages or the 54-module enterprise portal are accepted.

## Validation
Run \`npm run test:global-distribution-foundation\`; it invokes the existing D01–D15 and order-denial suites plus the federation/metrics/replenishment control tests. The same exact-head CI and real production-acceptance gates apply before any future live write path.

No new cloud resources, SaaS fees, emails, licence claims or payment switches are required for this code-only control-plane increment.
