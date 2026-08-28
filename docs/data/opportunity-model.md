# Commercial Opportunity Model

Status date: 2026-08-24

## Purpose

The opportunity model is a transparent decision-support framework for comparing governed medicine-to-pharmacy or pharmacy-to-medicine signals. It is not a clinical recommendation, proof of branch-level dispensing, automated sales instruction, legal marketing approval, or promise of revenue.

The repository contains the scoring kernel and tests. No live opportunity scores are currently generated because accepted demand history, NovaPharm product availability, and contact/campaign eligibility evidence are incomplete.

## Implemented scoring contrac

`packages/medicines-intelligence/src/opportunity.ts` requires:

- a versioned model identifier;
- named component inputs with values from 0 to 1 or explicit null;
- named, positive weights from greater than 0 to 1;
- a declared positive or negative direction for each weight;
- one weight per governed component;
- required-component availability checks; and
- explicit commercial-authorisation, availability, and marketing-eligibility gates.

For a positive component, the adjusted value is its normalised value. For a negative component, the adjusted value is `1 - value`. Available contributions are weight multiplied by adjusted value. The weighted mean is multiplied by 100 and rounded to two decimal places.

A numerical score is returned only when every eligibility gate passes and at least one weighted value exists. Otherwise the score is null and the response contains explicit blockers.

## Mandatory eligibility gates

The current kernel fails closed if any of these are false:

1. The NovaPharm product is commercially authorised for the intended action.
2. Approved product availability is established.
3. The selected pharmacy/contact is marketing eligible.
4. Every configuration-designated required component has a governed value.

Passing a score threshold cannot override a failed gate. Contact verification and marketing eligibility remain separate facts.

## Candidate component families

Future approved configurations may use only inspectable, source-backed components such as:

| Family | Example governed measure | Required qualification |
| --- | --- | --- |
| Local demand | Accepted prescribing or dispensing percentile | Source measure and geography stated |
| Local growth | Period-on-period or year-on-year change | Comparable periods and revision state |
| Forecast | Governed forecast growth | Accepted model run and uncertainty |
| Intensity | Items or quantity per 1,000 registered patients | Denominator period and practice scope |
| Product fit | Approved presentation-to-product relationship | No name-based inferred mapping |
| Commercial | Availability, inventory, lead time, margin | Authoritative NovaPharm systems only |
| Relationship | Customer status, historical sales, penetration | Stable account mapping and temporal cut-off |
| Territory | Distance or coverage | Postcode-centroid caveat and no dispensing claim |
| Contact | Verified contact availability | No implication of campaign eligibility |
| Engagement | Historic campaign response | Only outcomes available at the model cut-off |

The list is a design vocabulary, not an active model configuration. No arbitrary permanent weights are approved by this document.

## Supported analytical directions

### Medicine to pharmacies

Resolve a medicine, identify high-volume or high-growth geographies, find nearby governed pharmacy records, separate customers from prospects, apply approved contact/commercial filters, and rank only eligible opportunities.

### Pharmacy to medicines

Resolve a pharmacy, show its local prescribing environment, compare governed medicine or presentation signals, establish whether NovaPharm has an approved matching product, and support an account discussion.

Neither direction establishes that patients registered at a nearby practice use the selected pharmacy.

## Explainability

Every result must expose:

- model version;
- score or null state;
- eligibility state and blockers;
- component label, source, period, raw normalised value, direction, weight, and contribution;
- geography and distance method where relevant;
- product and availability evidence;
- contact/compliance state;
- generated time and source cut-off; and
- caveats appropriate to the source measure.

An AI layer may explain this structured result. It may not generate hidden components, change the score, invent a reason, or suppress a blocker.

## Model governance

Before production use:

1. Approve a versioned configuration and component dictionary.
2. Document normalisation windows and treatment of missing values.
3. Test sensitivity to every weight and direction.
4. Backtest against actual, temporally available NovaPharm outcomes.
5. Review selection bias, territory effects, ownership concentration, and small-volume instability.
6. Establish score stability and refresh rules.
7. Define human decision authority and prohibited uses.
8. Validate customer and organisation isolation.
9. Establish audit, export, suppression, correction, and rollback controls.
10. Reapprove any material model, source, product, or legal-rule change.

## Campaign boundary

The opportunity engine does not send communication. A future campaign object requires its own target rationale, contact source, compliance state, draft, human approval, sending authority, suppression checks, and outcome evidence.

Nearby public prescribing may support qualified wording about local-area demand. It cannot support a claim that a medicine sells strongly at a named pharmacy unless genuine pharmacy-level evidence exists.

## Current completion state

| Layer | Status |
| --- | --- |
| Typed scoring kernel | Repository complete |
| Unit tests | Passing |
| National medicine history | Backfill pending |
| Approved product/availability facts | Owner or managed-system evidence pending |
| Marketing-eligible contacts | None |
| Versioned production weights | Not approved |
| Outcome backtest | Cannot run without authoritative outcomes |
| Portal output | Truthful unavailable state |
| Production activation | Not deployed or operational |
