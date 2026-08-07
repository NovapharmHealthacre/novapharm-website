# Operating Status and Logistics Evidence

Status: repository wording reconciled; certificate evidence pending
Review date: 1 August 2026
Owners: Chief Executive Officer, Quality and Regulatory, Legal

## Governed position

| Dimension | Publishable state | Evidence status |
|---|---|---|
| Corporate existence | NOVAPHARM HEALTHCARE LTD is an active UK company, company number `16716501` | Public registry fact already governed in the content package |
| Corporate and commercial development | Active | Owner-attested and suitable for corporate positioning |
| Regulated wholesale supply | Not commenced | Subject to the required NovaPharm authorisation and release controls |
| Logistics and warehousing infrastructure | Contracted third-party arrangements with Polar Speed are owner-attested and are being incorporated into the operating model | Contract/quality evidence remains controlled and is not published |
| Polar Speed role | Intended third-party logistics and warehousing provider under applicable service, quality, storage, transport, documentation and performance controls | Owner-attested relationship; technical onboarding and scope acceptance pending |
| Quality agreement | Controls are referenced as applicable; execution and approved scope must be verified before any stronger wording | Controlled evidence pending |
| Polar Speed WDA(H)/GDP/site certificate | Not attributable to NovaPharm | Exact official evidence and approved wording pending |

## Publication boundary

The public estate may state that NovaPharm is corporately active and developing commercial and partner relationships. It may state that owner-attested contracted third-party logistics and warehousing arrangements with Polar Speed are being incorporated into the operating model. It must state that regulated wholesale supply has not commenced and remains subject to NovaPharm's required authorisation, quality-system release and technical onboarding.

It must not state or imply that:

- Polar Speed's WDA(H), GDP status, site authorisation or certificate belongs to NovaPharm;
- a contract authorises NovaPharm to conduct regulated wholesale supply;
- a third-party certificate proves the scope, effective date or restrictions of NovaPharm activity;
- NovaPharm owns the represented warehouse or logistics network.

## Certificate evidence gate

No certificate-specific claim can move to publishable status until an official certificate or regulator register entry confirms all of:

1. exact legal holder;
2. certificate or authorisation number;
3. authorised site;
4. authorised scope;
5. effective and expiry dates where applicable;
6. restrictions or conditions;
7. current register status;
8. Quality/Regulatory-approved wording.

## Repository controls

- Canonical status: `packages/content/src/index.ts`.
- Publishable claims and certificate hold: `packages/claims/src/index.ts`.
- Corporate public copy: `apps/corporate/data/site.ts` and `apps/corporate/components/page-renderer.tsx`.
- Legacy compatibility copy: `src/content/site-content.mjs`.
- Tests: `packages/content/test/content.test.ts`, `packages/claims/test/claims.test.ts` and `apps/corporate/scripts/validate-content.ts`.

## Owner evidence action

Provide the signed/controlled logistics agreement and quality agreement to the approved internal evidence repository, not to Git or public chat. Quality and Legal must record holder, scope, effective date, restrictions, document owner and approval decision. The public wording is not to be strengthened automatically when a file is uploaded.
