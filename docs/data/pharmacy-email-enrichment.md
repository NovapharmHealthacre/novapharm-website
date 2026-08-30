# Pharmacy Email Enrichment and Outreach Governance

Status date: 2026-08-25

## Governing distinction

An email address can be evidence-backed and still be ineligible for outreach. The platform stores these as separate facts:

- contact value;
- contact type;
- source and source URL where available;
- evidence status;
- verification date where supplied;
- subscriber/business classification;
- lawful-basis and compliance review;
- suppression or objection state;
- campaign eligibility; and
- campaign approval.

The presence of an address never activates a campaign.

## Current workbook result

| State | Count |
| --- | ---: |
| Verified public non-NHS business email | 7,211 |
| Research actioned with no defensible new address | 5,725 |
| Total source records reconciled | 12,936 |
| Marketing eligible | 0 |

The source workbook SHA-256 is `c07c42c378e4aa9d8a2ce891e037fa8b1f4b2992837c94ec6436bfe06ce9d668`. Counts and controls are recorded in `docs/data/evidence/pharmacy-workbook-import.json`.

The governed workbook was also imported into the gitignored local SQLite validation database. A read-only aggregate verification on 2026-08-26 confirmed 12,936 pharmacy rows, 7,211 verified public-business contact-evidence rows, 5,725 targeted blank-email queue rows and zero marketing-eligible pharmacies. This is local database evidence only, not an Azure or production import. The aggregate record is `docs/data/evidence/pharmacy-local-database-verification.json`.

## Implemented assessment

`assessPharmacyEmail` in `packages/medicines-intelligence/src/pharmacy-identity.ts`:

1. normalises supplied email text;
2. checks a bounded address shape;
3. rejects NHS operational domains from the workbook's public-business-email classification;
4. accepts `VERIFIED REAL EMAIL` only when the supplied address is a shaped public non-NHS business address;
5. preserves an actioned blank as `no_new_evidence`;
6. routes inconsistent evidence to `review_required`; and
7. returns `marketingEligible: false` for every state.

This is evidence classification, not mailbox validation, ownership verification, legal advice, or permission to send.

## Enrichment hierarchy

Future enrichment must use the strongest legitimate evidence available:

1. NHS Directory of Healthcare Services v3 where the relevant organisation/service contact exists;
2. official ICB-held directories or properly released public records;
3. the organisation's official website;
4. official NHS, regulator, or public-body documents;
5. other authoritative public evidence; and
6. auditable human review.

Role or organisation inboxes are preferred over named personal addresses. No missing address may be guessed from a domain pattern, inferred from another branch, bought from an unapproved source, or copied through unauthorised scraping.

## Implemented DoHS v3 boundary

The repository now contains a bounded, server-only DoHS v3 enrichment path:

- `DohsV3Client` searches the NHS Directory of Healthcare Services using the current version 3 contract, an exact ODS-code search field and a server-side `apikey` header;
- `assessDohsEmailEvidence` requires both the current NHS contractor code and normalised postcode to match before accepting any contact observation;
- malformed contacts, non-email contact methods, ODS mismatches and postcode mismatches are rejected;
- public business and NHS shared mailboxes remain separate contact types;
- new observations must be later than the queue's existing evidence cutoff;
- accepted observations enter `pharmacy_contact_evidence` as `candidate`, never `verified`;
- the pharmacy master email field is not changed automatically;
- the enrichment queue moves to `in_review` only when candidate evidence exists;
- no candidate becomes marketing eligible; and
- generated execution evidence contains aggregate counts, not contact values.

The controlled command is:

```sh
npm run intelligence:pharmacies:email-enrich -- --database /authorised/path/novapharm.sqlite --environment production --limit 25
```

Add `--apply` only after reviewing the read-only result against an authorised non-production database. Sandbox observations cannot be applied.

Execution against the 5,725 queued blanks is **not currently complete**. `NHS_DOHS_API_KEY` is not configured in the current environment, so the client fails before network access. The exact remaining owner action is to complete NHS API onboarding for DoHS v3, place the issued key in an approved server-side secret store under `NHS_DOHS_API_KEY`, and run a bounded read-only assessment before any candidate-evidence write. This blocker does not erase the prior research: all 5,725 records remain actioned blanks in the governed enrichment queue.

## Compliance gate

The application does not encode a universal legal conclusion from the domain or address shape. Before marketing eligibility can become true, an authorised reviewer must establish and record at least:

- the intended communication and purpose;
- whether the subscriber is corporate or is treated as an individual subscriber;
- whether personal data is involved;
- the applicable PECR condition and UK data-protection lawful basis;
- the source and reasonable-expectation analysis;
- privacy information provided;
- sender identity and a valid opt-out route;
- current suppression, objection, and consent state where relevant;
- territorial or sector-specific restrictions; and
- the review date and reviewer.

If subscriber type is uncertain, the workflow fails closed. It does not assume that a pharmacy trading name is a corporate body.

Current Information Commissioner's Office guidance states that B2B rules can differ by communication method and subscriber type, that UK data-protection law can still apply to business contacts, and that objections and suppression must be respected. The guidance also notes that it is under review, so the production rule set requires dated legal review rather than a permanently hard-coded conclusion.

## Campaign boundary

- No automatic sending is implemented.
- No email provider is connected for this module.
- No target list is approved.
- No pharmacy is currently marketing eligible.
- A verified address is not visible to an unauthorised role.
- Selection, compliance review, human approval, send authority, response, and suppression are separate auditable states.
- Nearby prescribing can support carefully qualified local-area context only; it cannot be described as that pharmacy's own dispensing or sales.

## Data quality and correction

Shared email addresses are retained as contact evidence and never used as branch identity. Unknown checked dates remain null. Corrections must preserve the prior observation, source, reason, reviewer, and effective time. Mailbox bounce or objection evidence must not be overwritten by later source discovery.

## Production dependencies

- Approved data-protection and direct-marketing assessment.
- Defined subscriber-type and personal-data review workflow.
- Privacy notice and retention schedule.
- Global suppression authority and tested opt-out handling.
- Approved sending provider, domain authentication, rate controls, and monitoring.
- Role-restricted export and campaign approval controls.
- Staging and production audit evidence.

## Primary guidance

- [NHS Directory of Healthcare Services API catalogue](https://digital.nhs.uk/developer/api-catalogue/directory-of-healthcare-services)
- [NHS Directory of Healthcare Services API version 3](https://digital.nhs.uk/developer/api-catalogue/directory-of-healthcare-services/version-3)
- [NHS DoHS search identifiers and service codes](https://digital.nhs.uk/developer/api-catalogue/directory-of-healthcare-services/guide-to-search-identifiers-and-service-codes)
- [ICO business-to-business marketing guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/)
- [ICO electronic-mail marketing guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/how-do-we-comply-with-the-pecr-electronic-mail-marketing-rules/)
- [ICO guidance on respecting preferences](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/respect-peoples-preferences/)
