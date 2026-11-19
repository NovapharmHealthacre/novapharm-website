# NovaPharm Intelligence — exhaustive 101-source integration register

**Audit baseline: 18 November 2026.** This is a per-source engineering ONBOARDING matrix, not 101 live integrations and not 101 individual countries.

Access classifications are based on the provider's *advertised mode* in the earlier candidate registry, not independent proof of a callable endpoint, server permissions or reuse rights.

**Counts:** 101 candidate entries; 79 distinct national/multi-national/Global labels; 35 API-related; 26 download-related without API classification; 40 portal/discovery/other.

Every entry remains unverified for production, has no approved source reuse terms, no admitted pharmaceutical records and no enabled customer/mobile access. Existing bounded adapters and the NHSBSA bridge are source-only code.

| # | Jurisdiction or global label | Source | Mode | Engineering route | Code status |
|---:|---|---|---|---|---|
| 1 | Global | [US ClinicalTrials.gov](https://clinicaltrials.gov/data-api/api) | API | documented api candidate | Code: bounded API preview |
| 2 | Global | [Europe PMC](https://www.ebi.ac.uk/europepmc/webservices/rest/) | API | documented api candidate | Code: bounded API preview |
| 3 | Global | [NCBI PubMed](https://www.ncbi.nlm.nih.gov/books/NBK25501/) | API | documented api candidate | Code: bounded API preview |
| 4 | Global | [ChEMBL](https://www.ebi.ac.uk/chembl/api/data/) | API | documented api candidate | Code: bounded API preview |
| 5 | Global | [PubChem](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest) | API | documented api candidate | Code: bounded API preview |
| 6 | Global | [UN Comtrade](https://comtradeapi.un.org/) | API | documented api candidate | No source adapter code |
| 7 | Global | [EPO OPS](https://www.epo.org/en/searching-for-patents/data/web-services/ops) | API | documented api candidate | No source adapter code |
| 8 | Global | [WHO Global Health Observatory](https://www.who.int/data/gho/info/gho-odata-api) | API-review | documented api candidate | No source adapter code |
| 9 | Global | [WHO-UMC VigiAccess](https://who-umc.org/vigibase-data-access/vigiaccess-api/) | Restricted/API | access or interface review | No source adapter code |
| 10 | European Union / EEA | [EMA PMS Public API](https://api.pms.ema.europa.eu/public/v1/swagger) | Beta API | documented api candidate | No source adapter code |
| 11 | European Union / EEA | [EMA ESMP](https://www.ema.europa.eu/en/human-regulatory-overview/post-authorisation/medicine-shortages-availability-issues/european-shortages-monitoring-platform) | Restricted/API | access or interface review | No source adapter code |
| 12 | European Union / EEA | [TED](https://docs.ted.europa.eu/api/latest/search.html) | API | documented api candidate | No source adapter code |
| 13 | United Kingdom | [NHSBSA English Prescribing Dataset](https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code) | API/Download | documented api candidate | Code: private NHSBSA discovery bridge |
| 14 | United Kingdom | [MHRA Products](https://products.mhra.gov.uk/) | Portal | portal or licensed export review | No source adapter code |
| 15 | Ireland | [HPRA authorised medicines](https://data.gov.ie/en_GB/dataset/medicines-authorised-or-transfer-pending-products) | Download | versioned official file candidate | No source adapter code |
| 16 | France | [ANSM BDPM](https://www.data.gouv.fr/datasets/base-de-donnees-publique-des-medicaments-base-officielle) | Download | versioned official file candidate | No source adapter code |
| 17 | France | [Open Medic](https://www.assurance-maladie.ameli.fr/etudes-et-donnees/open-medic-base-complete-depenses-medicaments) | Download-review | versioned official file candidate | No source adapter code |
| 18 | Spain | [AEMPS CIMA](https://cima.aemps.es/cima/rest/medicamentos) | API | documented api candidate | Code: bounded API preview |
| 19 | Italy | [AIFA OsMed and authorised lists](https://www.aifa.gov.it/dati-e-analisi) | Download | versioned official file candidate | No source adapter code |
| 20 | Germany | [BfArM AMIce / PharmNet.Bund](https://www.pharmnet-bund.de/dynamic/de/arzneimittel-informationssystem/index.html) | Portal/Restricted | access or interface review | No source adapter code |
| 21 | Netherlands | [MEB Medicines Evaluation Board](https://www.geneesmiddeleninformatiebank.nl/) | Download | versioned official file candidate | No source adapter code |
| 22 | Netherlands | [GIP Databank](https://www.gipdatabank.nl/) | Portal/Download | versioned official file candidate | No source adapter code |
| 23 | Belgium | [FAMHP / SAM](https://www.famhp.be/en/human_use/medicines) | API-review | documented api candidate | No source adapter code |
| 24 | Denmark | [Medicinpriser API](https://api.medicinpriser.dk/) | API | documented api candidate | No source adapter code |
| 25 | Sweden | [Fass and TLV](https://api.fass.se/documentation/index.html) | Restricted/API | access or interface review | No source adapter code |
| 26 | Norway | [DMP medicine FHIR service](https://www.dmp.no/en/about-us/distribution-of-data-on-medicinal-products/FHIR-service/content-of-the-fhir-service) | API | documented api candidate | No source adapter code |
| 27 | Finland | [Fimea](https://fimea.fi/en/databases_and_registers) | Portal/Download | versioned official file candidate | No source adapter code |
| 28 | Poland | [NFZ drug-program statistics](https://api.nfz.gov.pl/app-stat-api-pl/swagger-docs) | API | documented api candidate | Code: bounded API preview |
| 29 | Poland | [URPL](https://rejestry.ezdrowie.gov.pl/rpl/search/public) | Portal | portal or licensed export review | No source adapter code |
| 30 | Czechia | [SÚKL](https://sukl.gov.cz/) | Download | versioned official file candidate | No source adapter code |
| 31 | Austria | [BASG](https://www.basg.gv.at/en/) | Portal/Download | versioned official file candidate | No source adapter code |
| 32 | Switzerland | [Swissmedic](https://www.swissmedic.ch/swissmedic/en/home/services/listen_neu.html) | Download | versioned official file candidate | No source adapter code |
| 33 | Portugal | [INFARMED / SNS Transparência](https://transparencia.sns.gov.pt/) | API/Download | documented api candidate | No source adapter code |
| 34 | Hungary | [NNGYK / OGYEI](https://ogyei.gov.hu/drug_database/) | Portal | portal or licensed export review | No source adapter code |
| 35 | Ukraine | [State Expert Center register](https://www.dec.gov.ua/en/announcement/informaczijne-povidomlennya-pro-oficzijni-dzherela-danyh-derzhavnogo-reyestru-likarskyh-zasobiv/) | Portal/Download | versioned official file candidate | No source adapter code |
| 36 | Russia | [Ministry of Health GRLS](https://minzdrav.gov.ru/opendata/7707778246-grls) | Download/Portal | versioned official file candidate | No source adapter code |
| 37 | Greece | [EOF](https://www.eof.gr/) | Discovery | publisher discovery required | No source adapter code |
| 38 | Romania | [ANMDMR](https://www.anm.ro/en/) | Discovery | publisher discovery required | No source adapter code |
| 39 | Bulgaria | [BDA](https://www.bda.bg/en/) | Discovery | publisher discovery required | No source adapter code |
| 40 | Croatia | [HALMED](https://www.halmed.hr/en/) | Discovery | publisher discovery required | No source adapter code |
| 41 | Slovenia | [JAZMP](https://www.jazmp.si/en/) | Discovery | publisher discovery required | No source adapter code |
| 42 | Slovakia | [SÚKL](https://www.sukl.sk/) | Discovery | publisher discovery required | No source adapter code |
| 43 | Estonia | [State Agency of Medicines](https://www.ravimiamet.ee/en) | Discovery | publisher discovery required | No source adapter code |
| 44 | Latvia | [State Agency of Medicines](https://www.zva.gov.lv/en) | Discovery | publisher discovery required | No source adapter code |
| 45 | Lithuania | [State Medicines Control Agency](https://vvkt.lrv.lt/en/) | Discovery | publisher discovery required | No source adapter code |
| 46 | Serbia | [ALIMS](https://www.alims.gov.rs/english/) | Discovery | publisher discovery required | No source adapter code |
| 47 | Türkiye | [TİTCK](https://www.titck.gov.tr/) | Portal | portal or licensed export review | No source adapter code |
| 48 | United States | [FDA openFDA](https://open.fda.gov/apis/drug/) | API | documented api candidate | Code: bounded API preview |
| 49 | United States | [CMS data](https://data.cms.gov/api-docs) | API | documented api candidate | No source adapter code |
| 50 | Canada | [Health Canada Drug Product Database](https://health-products.canada.ca/api/drug/) | API | documented api candidate | Code: bounded API preview |
| 51 | Canada | [Canada Vigilance](https://health-products.canada.ca/api/canada-vigilance/) | API | documented api candidate | No source adapter code |
| 52 | Mexico | [COFEPRIS](https://registros.cofepris.gob.mx/BRSDM/default.aspx) | Portal/Download | versioned official file candidate | No source adapter code |
| 53 | Brazil | [ANVISA and CMED](https://dados.anvisa.gov.br/dados/) | Download | versioned official file candidate | No source adapter code |
| 54 | Argentina | [ANMAT](https://www.argentina.gob.ar/anmat/regulados/medicamentos/registro-y-autorizacion-de-comercializacion) | Portal/Download | versioned official file candidate | No source adapter code |
| 55 | Chile | [ISP and ChileCompra](https://www.chilecompra.cl/api/) | API/Portal | documented api candidate | No source adapter code |
| 56 | Colombia | [INVIMA and SISMED](https://www.datos.gov.co/Salud-y-Protecci-n-Social/Consulta-p-blica-de-Precios-de-Medicamentos/3he6-m866) | API/Portal | documented api candidate | No source adapter code |
| 57 | Peru | [DIGEMID](https://www.digemid.minsa.gob.pe/) | Portal/Download | versioned official file candidate | No source adapter code |
| 58 | Ecuador | [ARCSA](https://www.controlsanitario.gob.ec/base-de-datos/) | Portal | portal or licensed export review | No source adapter code |
| 59 | Uruguay | [Ministry of Public Health](https://www.gub.uy/ministerio-salud-publica/) | Discovery | publisher discovery required | No source adapter code |
| 60 | India | [CDSCO / SUGAM](https://cdscoonline.gov.in/CDSCO/cdscoDrugs) | Portal | portal or licensed export review | No source adapter code |
| 61 | India | [NPPA Pharma Sahi Daam](https://nppaipdms.gov.in/NPPA/PharmaSahiDaam/searchMedicine) | Portal | portal or licensed export review | No source adapter code |
| 62 | India | [ABDM Drug Registry](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2278991) | Access-review | access or interface review | No source adapter code |
| 63 | India | [CTRI](https://www.ctri.nic.in/Clinicaltrials/pubview.php) | Portal | portal or licensed export review | No source adapter code |
| 64 | China | [NMPA](https://english.nmpa.gov.cn/database.html) | Portal | portal or licensed export review | No source adapter code |
| 65 | Japan | [PMDA / MHLW](https://www.pmda.go.jp/english/) | Portal/Download | versioned official file candidate | No source adapter code |
| 66 | South Korea | [MFDS OpenAPI](https://www.data.go.kr/data/15095677/openapi.do) | API | documented api candidate | No source adapter code |
| 67 | South Korea | [HIRA](https://www.data.go.kr/data/15047819/openapi.do) | API | documented api candidate | No source adapter code |
| 68 | Taiwan | [TFDA and NHI](https://data.nhi.gov.tw/) | API/Download | documented api candidate | No source adapter code |
| 69 | Singapore | [HSA / data.gov.sg](https://developers.data.gov.sg/datasets?agencies=Health+Sciences+Authority+%28HSA%29&resultId=d_767279312753558cbf19d48344577084) | API/Download | documented api candidate | No source adapter code |
| 70 | Malaysia | [NPRA / KKMNOW](https://data.moh.gov.my/data-catalogue/pharmaceutical_products) | Download | versioned official file candidate | No source adapter code |
| 71 | Indonesia | [BPOM Satu Data](https://satudata.pom.go.id/datasets/364-app---product-master-drug-commodity) | API-review | documented api candidate | No source adapter code |
| 72 | Thailand | [Thai FDA / data.go.th](https://data.go.th/th/dataset/web-service-drug-reg) | API-review | documented api candidate | No source adapter code |
| 73 | Vietnam | [Drug Administration of Vietnam](https://dichvucong.dav.gov.vn/) | Portal | portal or licensed export review | No source adapter code |
| 74 | Philippines | [FDA Philippines](https://verification.fda.gov.ph/Home.php) | Portal | portal or licensed export review | No source adapter code |
| 75 | Pakistan | [DRAP](https://e.dra.gov.pk/) | Portal | portal or licensed export review | No source adapter code |
| 76 | Bangladesh | [DGDA / DGHS FHIR](https://fhir.dghs.gov.bd/) | FHIR-review | access or interface review | No source adapter code |
| 77 | Nepal | [DDA](https://dams.dda.gov.np/manLogin/publicInfo1) | Portal | portal or licensed export review | No source adapter code |
| 78 | Sri Lanka | [NMRA](https://nmra.gov.lk/) | Portal | portal or licensed export review | No source adapter code |
| 79 | Australia | [TGA ARTG](https://www.tga.gov.au/resources/datasets) | Download | versioned official file candidate | No source adapter code |
| 80 | Australia | [PBS](https://data.pbs.gov.au/document/91327.html) | API | documented api candidate | No source adapter code |
| 81 | New Zealand | [Medsafe / NZULM](https://info.nzulm.org.nz/data-access) | Download/Restricted | access or interface review | No source adapter code |
| 82 | Saudi Arabia | [SFDA](https://www.sfda.gov.sa/en/open-data) | Download/Portal | versioned official file candidate | No source adapter code |
| 83 | United Arab Emirates | [MOHAP / EDE](https://mohap.gov.ae/en/open-data/open-data-api) | API/Access-review | access or interface review | No source adapter code |
| 84 | Israel | [Ministry of Health medicines register](https://israeldrugs.health.gov.il/) | Portal/Download | versioned official file candidate | No source adapter code |
| 85 | Jordan | [JFDA open data](https://opendata.gov.jo/en/dataset/api_guide/drug-prices-838-2021) | Download/API-review | documented api candidate | No source adapter code |
| 86 | Oman | [Ministry of Health](https://www.moh.gov.om/) | Portal/Download | versioned official file candidate | No source adapter code |
| 87 | Qatar | [Ministry of Public Health](https://www.moph.gov.qa/) | Portal | portal or licensed export review | No source adapter code |
| 88 | Bahrain | [NHRA](https://www.nhra.bh/) | Discovery | publisher discovery required | No source adapter code |
| 89 | Kuwait | [Ministry of Health](https://www.moh.gov.kw/) | Discovery | publisher discovery required | No source adapter code |
| 90 | South Africa | [SAHPRA](https://www.sahpra.org.za/databases-registers/) | Portal/Download | versioned official file candidate | No source adapter code |
| 91 | South Africa | [Department of Health SEP](https://www.health.gov.za/nhi-pee/) | Download | versioned official file candidate | No source adapter code |
| 92 | Nigeria | [NAFDAC Greenbook](https://greenbook.nafdac.gov.ng/) | Portal | portal or licensed export review | No source adapter code |
| 93 | Kenya | [PPB](https://ppb.go.ke/products) | Portal | portal or licensed export review | No source adapter code |
| 94 | Ghana | [FDA Ghana](https://fdaghana.gov.gh/) | Discovery | publisher discovery required | No source adapter code |
| 95 | Tanzania | [TMDA](https://www.tmda.go.tz/pages/registered-medicinal-products) | Portal | portal or licensed export review | No source adapter code |
| 96 | Rwanda | [Rwanda FDA](https://monitoring.rwandafda.gov.rw/register/hmdr/) | Portal | portal or licensed export review | No source adapter code |
| 97 | Morocco | [Open Data / AMMPS](https://www.data.gov.ma/data/fr/dataset/referentiel-des-medicaments) | Download | versioned official file candidate | No source adapter code |
| 98 | Egypt | [Egyptian Drug Authority](https://edaegypt.gov.eg/en/services/databases/) | Portal | portal or licensed export review | No source adapter code |
| 99 | Algeria | [Ministry of Pharmaceutical Industry](https://www.miph.gov.dz/) | Discovery | publisher discovery required | No source adapter code |
| 100 | Ethiopia | [EFDA](https://www.efda.gov.et/) | Discovery | publisher discovery required | No source adapter code |
| 101 | Uganda | [NDA](https://www.nda.or.ug/) | Discovery | publisher discovery required | No source adapter code |

## Release gate for every source

1. Verify the exact publisher endpoint, data type, authenticated access, country coverage and versioned schema.
2. Record rights for extraction, commercial SaaS analysis, cross-border storage, AI use, outputs, caching, export, sharing, attribution, expiry and revocation.
3. Implement and independently test the appropriate fixed-host server API adapter OR bounded official-file ingestion OR licensed vendor interface; no portal scraping is assumed.
4. Quarantine immutable source bytes, verify hashes, schema, completeness, publisher dates and native medicinal-product identifiers.
5. Reconcile identities/periods/prices/channels and accept facts only through independent QA with tenant permissions; an empty search result does not prove no market.
6. Verify actual runtime connection, signed security approval and operational logging before enabling any customer or mobile route.

## Important coverage boundaries

The 79 labels include Global and European Union/EEA; do not present them as 79 fully covered independent countries. Public regulator listings cannot establish wholesale stock, national sales, audited market share or clinical equivalence. Source documentation URL is not the authenticated data endpoint. No source is authorised or activated by this report.


## First-wave publisher terms pre-screen — 19 November 2026

This is a **source-rights due-diligence worklist, not a legal grant**. The deterministic
`buildPublisherRightsPrescreenWorklist` in
`src/core/intelligence-global-source-onboarding.mjs` covers all **101 source
candidates**. These must not be confused with the separate proposed
**101 national geography labels**: the original registry has 77 national
countries and 12 global/EU source candidates, and the country-expansion
proposal contributes 24 additional research-only countries.

**Verified source-code state:** 101/101 source candidates have worklist
entries, 10 official publisher terms pages are linked, 1 separate publisher access-application requirement and 1 API-documentation-only candidate are recorded, **0/101 source grants
are independently accepted**, 0 ingested datasets are accepted, and 0
source candidates are certified customer-live. A link to permissive
publisher terms is not evidence of field-specific rights, a valid signed
grant, a working API, a configured production pipeline or tenant approval.

| Candidate jurisdiction/source | Official terms or dataset notice | Public notice finding (not legal sign-off) | Required decision before admission |
|---|---|---|---|
| United States — FDA openFDA/Drugs@FDA | https://open.fda.gov/terms/ | Most openFDA materials described as CC0/public domain; some copyrightable third-party submissions and warned fields are excluded | Exact endpoint, response-field copyright screen, accepted uses, publisher credit and rate limits |
| Singapore — HSA registered therapeutic products | https://developers.data.gov.sg/open-data-licence , https://data.gov.sg/privacy-and-terms , https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view | Singapore Open Data Licence v1.0 permits commercial and non-commercial reuse with mandatory attribution; excludes personal data, third-party rights, patents, trademarks and design rights. API access also has separate terms and limits | Bind dataset ID and observed version, exact permitted fields and required attribution; inspect excluded content, current API restrictions and independently signed production rights decision |
| European Union / EEA — EMA PMS Public API **beta** | https://www.ema.europa.eu/en/documents/other/products-management-services-pms-public-api-terms-conditions_en.pdf ; https://api.pms.ema.europa.eu/public/v1/swagger | EMA's published terms dated **12 June 2026** restrict beta use to familiarisation, testing and analytical exploration — **not business purposes**. EMA registration is required, and its terms require **prior authorisation** to sell, sublicense, incorporate or redistribute content after full release; source data is reference-only and national authorities prevail | **Do not connect to NovaPharm commercial or customer services.** Verify official transition out of beta, obtain written EMA permission where required, complete scope/field review and signed grant before considering ingestion |
| France — ANSM/HAS BDPM official downloadable medicine tables | https://base-donnees-publique.medicaments.gouv.fr/telechargement ; https://www.data.gouv.fr/datasets/base-de-donnees-publique-des-medicaments-base-officielle | Official French download conditions permit reproduction, redistribution and exploitation of the files, require accurate meaning, attribution, update dates and **no suggestion of state endorsement**; linked notices and product documents may need different rights | Scope and checksum each official table/resource release, preserve French national CIS/CIP identities, publication dates, updates and permitted derivative/AI/redistribution use before independent approval |
| Ireland — HPRA Human Medicines Authorised Products | https://data.gov.ie/dataset/medicines-authorised-or-transfer-pending-products ; https://data.gov.ie/dataset/medicines-authorised-or-transfer-pending-products/resource/6987c2af-0c40-48da-8207-76b5da141266 | The official data.gov.ie listing expressly identifies the XML dataset as **Creative Commons Attribution 4.0**; reusable commercially with attribution, but third-party works and personal data are excluded | Verify current XML resource version and controlled download, source attribution, Irish-native authorisation IDs and rights of any linked SPC or patient leaflet before independent admission |
| Australia — TGA Australian Register of Therapeutic Goods | https://www.tga.gov.au/about-us/using-our-website/copyright ; https://www.tga.gov.au/resources/datasets | The TGA copyright notice (updated 10 September 2025) restricts website reproduction to personal/internal use and prohibits commercial use, retransmission and redistribution without **prior written approval**, except where a distinct licence states otherwise | **Do not commercially republish ARTG website content** without written TGA permission or a verified ARTG-specific licence. Screen third-party rights and retain attribution, disclaimers and non-endorsement conditions |
| Australia — PBS public Schedule API | https://data.pbs.gov.au/document/91327.html | PBS public Schedule API documentation describes monthly JSON/CSV downloads, but **does not by itself grant a commercial or AI redistribution licence**. Public API shared limit is one request per 20 seconds; embargo API requires separate vendor access | Verify per-table data licensing and terminology rights, use published schedule version keys, batch by published monthly edition, respect rate limits and separately review embargo access before any integration |
| Spain — AEMPS CIMA REST | https://sede.aemps.gob.es/datos-abiertos/ | Official open-data listing permits use and reuse, subject to conditions such as attribution; lists CIMA REST | Pin CIMA endpoint/data subset and relevant AEMPS legal notice; confirm commercial AI/derivative, cache and redistribution terms |
| Canada — Health Canada DPD | https://open.canada.ca/data/en/dataset/bf55e42a-63cb-4556-bfd8-44f26e5a36fe | Official DPD dataset is listed under the Open Government Licence — Canada; this does not prove every API response/third-party field is in scope | Match API response to licensed dataset version and exact fields; attribution, limitations and independent source approval |
| United Kingdom — NHSBSA EPD with SNOMED | https://opendata.nhsbsa.net/pages/terms-and-conditions and https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code | Dataset-level licence applies (generally OGL), mandatory NHSBSA attribution and fair-use API access; BNF/SNOMED/dm+d may involve separate rights | Verify exact resource and version, third-party terminology reuse, checksum, immutable ingestion evidence and independent acceptance |
| Global trial registry — ClinicalTrials.gov | https://clinicaltrials.gov/terms-conditions | Public study-record interface; some third-party record content may carry copyright and additional terms | Record-level permitted fields, attribution, version and commercial/AI reuse decision, then signed rights receipt |

For the other 89 source candidates, the worklist explicitly states
`PUBLIC_TERMS_NOT_YET_SCREENED`; none may inherit terms from a different
publisher or country. The ten publisher terms notices, Norway's separate access-application record and PBS's separate public API documentation do **not** constitute
any activated country integrations.

### Norway DMP FHIR — publisher access application required

The Norwegian Medical Products Agency's [official access instructions](https://www.dmp.no/en/about-us/distribution-of-data-on-medicinal-products/FHIR-service/how-to-access-the-fhir-service)
(published **22 June 2026**) require organisations to contact DMP and
state the organisation/registration number, contact, purpose, requested data,
test versus production environment, and destination of use. This is **not a
public reuse licence**. The separate `publisherAccessRequirementsUrl` field
is populated, `sourceAccessApprovalRequired: true`, and the worklist shows
`PUBLISHER_ACCESS_APPLICATION_REQUIRED`, **not** `PUBLIC_NOTICE_LOCATED`.
No application was sent, no DMP credentials were issued, no Norway API call
or database ingestion was made, and no commercial use is authorised.

Norway's service lists product codes sourced from Farmalogg, which
requires separate rights review before commercial re-publication. <https://www.dmp.no/en/about-us/distribution-of-data-on-medicinal-products/FHIR-service/content-of-the-fhir-service>

### Australia — separate TGA copyright and PBS public API conditions

The TGA [copyright notice](https://www.tga.gov.au/about-us/using-our-website/copyright)
allows unaltered content for internal/personal use unless otherwise specified;
**commercial reuse, retransmission and redistribution require prior written
approval**, unless a separate dataset-specific notice grants the required
rights. The TGA's searchable ARTG interface is **not** proof of such a grant.
The worklist uses `writtenCommercialPermissionRequired:true` for the TGA
website notice. Its exception must be checked **per exact ARTG resource**.

The PBS [official API guide](https://data.pbs.gov.au/document/91327.html)
(updated 12 November 2026) describes the publicly available monthly PBS
Schedule and local JSON/CSV downloads, **not a general commercial
redistribution licence**. The shared public endpoint limit is **one request
per 20 seconds**; the separate embargo API requires a software-vendor
application. The worklist therefore stores only `officialApiDocumentationUrl`,
sets `publisherTermsUrl:null` and
`OFFICIAL_API_DOCUMENTATION_RIGHTS_REVIEW_REQUIRED`; no rights approval or
customer source is inferred. Do not treat TGA and PBS as one legal publisher.

### Per-source activation acceptance, never inferred from an open notice

1. Identify the exact publisher, dataset/resource version, original URL,
   allowed fields and applicable terms; preserve dated source evidence and
   independently computed terms/resource digests.
2. Obtain a separately reviewed and signed source- and use-specific
   rights decision covering internal analysis, commercial use, AI/model
   processing, derivative reports, caching, export and redistribution,
   including excluded third-party works.
3. Configure the protected fixed-host connector and verify live upstream
   schema, rate limits, paging, provenance, network failure, retries and
   source revocation; no API key, protected payload or patient data in apps.
4. Persist immutable raw snapshots and quarantines; reconcile all row counts,
   identity conflicts and clinical terminology/pack identity before admission.
5. Independently verify rights and tenant entitlement at commit and read time;
   pass audit, security, two-tenant negative cases, rollback and production
   sign-off before releasing any customer dataset.
6. Separately approve and sign iOS/Android builds. A metadata catalogue or
   API preview is not a live native medicine-data integration.

This prescreen never modifies the source registry's `not-reviewed` /
`candidate-only` fields or the owner production constraints.

### EMA PMS beta — explicit commercial-use blocker

The EMA `PMS Public API – Terms and Conditions`, published 12 June 2026,
state that beta API usage is for familiarisation, testing and analytical
exploration **and must not be used for business purposes**. Later production
use to sell, sublicense, incorporate or redistribute content requires
**EMA prior authorisation**. The API's medicine data is not formally
validated by individual national authorities and the national record prevails
if entries differ. The terms also require registration and acceptance of
the EMA API general terms.

Until independent evidence of a permitted use and transition from beta,
**commercial customer ingestion is blocked**, regardless of whether
the public Swagger schema or an HTTP call is reachable. This is the
European Union / EEA aggregate publisher, **not another distinct country**.

Official published terms (12 June 2026):
https://www.ema.europa.eu/en/documents/other/products-management-services-pms-public-api-terms-conditions_en.pdf

Official beta announcement:
https://plm-portal.ema.europa.eu/Guidance/article/KA-02917/en-us

### Historical official upstream connectivity evidence (source-only CI)

The following GitHub Actions workflows completed actual bounded one-record
HTTP reads on 18 November 2026. Their source-only artifacts expire after
seven days. This is not current 24/7 API availability, an accepted licence,
production ingestion, commercial access or customer/mobile publication.

| National or global source | Exact source-only upstream CI | Historical probe result |
|---|---|---|
| US FDA Drugs@FDA (US) | [PR #844](https://github.com/NovapharmHealthacre/novapharm-website/pull/844), [run 44312719802](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44312719802) | One-record schema-bound HTTP read passed; cannot publish |
| Singapore HSA (SG) | [PR #844](https://github.com/NovapharmHealthacre/novapharm-website/pull/844), [run 44312719802](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44312719802) | One-record schema-bound HTTP read passed; cannot publish |
| Spain AEMPS CIMA (ES) | [PR #846](https://github.com/NovapharmHealthacre/novapharm-website/pull/846), [run 44285589910](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44285589910) | Native registration-bound HTTP read passed; cannot publish |
| Canada DPD (CA) | [PR #847](https://github.com/NovapharmHealthacre/novapharm-website/pull/847), [run 44286286570](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44286286570) | Native DIN-bound HTTP read passed; cannot publish |

The CI evidence above belongs to **open, unmerged pull requests** at this
checkpoint. No claim is made that these source-only probes have been deployed.
Even where an official publisher offers open commercial reuse, additional
field/third-party terms, protected data-admission controls and independent
owner production approval remain unmet.
