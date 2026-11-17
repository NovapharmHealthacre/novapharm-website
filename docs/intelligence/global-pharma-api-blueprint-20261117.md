# NovaPharm Intelligence — global pharmaceutical data-source research and mobile API integration blueprint
**Evidence cutoff:** 17 November 2026. **Repository status:** research candidates, not access grants, ingestion receipts, production deployment or mobile release.

## Executive decision

Use a **server-side global source-adapter architecture** to power NovaPharm Intelligence's 22 existing workspaces and both iOS/Android apps. Do not call source APIs from the mobile app. Establish a primary medicine-identity and evidence model, ingest jurisdiction-specific regulatory and observational sources into rights-governed staging, and publish only admitted fields to an authorised tenant after independent source-rights, identity, runtime, security, accuracy and freshness acceptance.

**Inventory:** 101 source candidates; Global: 9 source candidates, 1 jurisdictions; Europe: 38 source candidates, 32 jurisdictions; North America: 5 source candidates, 3 jurisdictions; Latin America: 7 source candidates, 7 jurisdictions; Asia Pacific: 19 source candidates, 15 jurisdictions; Oceania: 3 source candidates, 2 jurisdictions; Middle East: 8 source candidates, 8 jurisdictions; Africa: 12 source candidates, 11 jurisdictions. This register is a prioritized discovery index, NOT a census of all sovereign states or a claim that each URL has been technically, legally and commercially integrated.

## Source classes

- **API:** documented machine API exists; availability, registration and commercial rights still require review.
- **API-review / FHIR-review:** technical API is suggested or published but version, access and current payload need validation.
- **Beta API:** published interface is explicitly in beta.
- **Download:** official machine-readable file/feed, which may be better for bulk ingestion than individual HTTP calls.
- **Portal:** official human-facing search UI; avoid automated extraction until permission and terms are explicitly reviewed.
- **Restricted/API:** exists for eligible organisations/roles or under agreement; not a public data licence.
- **Discovery:** agency confirmed as a candidate; actual data feed and rights are unverified.

**Universal rights status of every candidate:** `not-reviewed`. **Universal integration status:** `candidate-only`. Do not describe any national data as live in NovaPharm based on this research.

## Data domains and canonical grain

| Domain | Canonical grain | Misinterpretation to prohibit |
| --- | --- | --- |
| Substance and product | Substance, authorised medicinal product, presentation, pack, version, country | Same ingredient does not imply generic/biosimilar equivalence |
| Regulatory | Authorisation/product, status, jurisdiction, effective date | Approval does not prove that medicine is marketed or stocked |
| Prescribing/dispensing | Source product, country, region, channel, payer, service period, unit | NHS England dispensing != all UK sales; Medicare != all US use |
| Official price | Country, presentation/pack, payer, price type, currency, effective date | Ceiling/list/reimbursement prices are not net wholesale prices |
| Safety | Signal/report, jurisdiction, report date, drug role and reporter | Spontaneous reports cannot determine event incidence or causality |
| Shortage | Product, country, location scope, status, notice/effective date | Notice is not unit-level inventory |
| Tenders | Buyer, jurisdiction, lot, product specification, term, award date | Award != delivered volume or realised transaction |
| Clinical trial | Trial ID, sponsor, intervention, phase, status, site/region, dates | Registration != proof of benefit or commercial approval |
| Manufacturing | Legal entity, facility, licence, GMP/GDP scope, inspected period | Facility approval != manufacturer of every pack |
| Market sales | Licensed sales audit universe, products, geography, time, channels | Segment or channel exclusions invalidate market-share comparisons |

## Country and regional source matrix

Every link is a candidate upstream reference. **An official website or dataset page is not necessarily an open API endpoint.** Mode and warning are substantive release restrictions.

### Global

| Country / area | Regulator, data publisher or feed | Data wanted | Access mode | Important qualification |
| --- | --- | --- | --- | --- |
| Global | [US ClinicalTrials.gov](https://clinicaltrials.gov/data-api/api) | Trial registrations, sites, sponsors, status, results | API | Global coverage is incomplete and not equivalent to country approval |
| Global | [Europe PMC](https://www.ebi.ac.uk/europepmc/webservices/rest/) | Scientific articles, references, citations | API | Full-text reuse rights vary |
| Global | [NCBI PubMed](https://www.ncbi.nlm.nih.gov/books/NBK25501/) | Biomedicine literature and metadata | API | Publisher reuse rights differ from indexing rights |
| Global | [ChEMBL](https://www.ebi.ac.uk/chembl/api/data/) | Compounds, targets, bioactivity | API | Not clinical efficacy or approval |
| Global | [PubChem](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest) | Chemical identities and substance properties | API | Chemical equivalence is not product equivalence |
| Global | [UN Comtrade](https://comtradeapi.un.org/) | Pharmaceutical commodity cross-border trade | API | HS-level trade is not molecule/pack sales |
| Global | [EPO OPS](https://www.epo.org/en/searching-for-patents/data/web-services/ops) | Patent filings and families | API | Legal validity and exclusivity need country-specific review |
| Global | [WHO Global Health Observatory](https://www.who.int/data/gho/info/gho-odata-api) | Demography, health indicators, contextual demand | API-review | Legacy OData announced end-2025; verify current replacement before integration |
| Global | [WHO-UMC VigiAccess](https://who-umc.org/vigibase-data-access/vigiaccess-api/) | Aggregated global adverse-event summaries | Restricted/API | Contract and purposes must be assessed; reporting counts are not incidence |

### Europe

| Country / area | Regulator, data publisher or feed | Data wanted | Access mode | Important qualification |
| --- | --- | --- | --- | --- |
| European Union / EEA | [EMA PMS Public API](https://api.pms.ema.europa.eu/public/v1/swagger) | Public human medicine regulatory product master data | Beta API | FHIR R5 beta; register and check coverage, use terms and country marketing status |
| European Union / EEA | [EMA ESMP](https://www.ema.europa.eu/en/human-regulatory-overview/post-authorisation/medicine-shortages-availability-issues/european-shortages-monitoring-platform) | Medicine shortage reporting | Restricted/API | MAH/NCA submission API, not general public read feed |
| European Union / EEA | [TED](https://docs.ted.europa.eu/api/latest/search.html) | EU procurement notices and awards | API | Requires healthcare and product matching; not wholesale net prices |
| United Kingdom | [NHSBSA English Prescribing Dataset](https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code) | England community dispensing, SNOMED/BNF, period, geography | API/Download | England not UK-wide; retrospective, not current stock |
| United Kingdom | [MHRA Products](https://products.mhra.gov.uk/) | Medicine approvals, SmPC and patient leaflets | Portal | No official public bulk API verified |
| Ireland | [HPRA authorised medicines](https://data.gov.ie/en_GB/dataset/medicines-authorised-or-transfer-pending-products) | Authorised medicines and transfer-pending products | Download | Daily XML listed; check update and reuse terms |
| France | [ANSM BDPM](https://www.data.gouv.fr/datasets/base-de-donnees-publique-des-medicaments-base-officielle) | Marketed medicine records, product characteristics | Download | National extract; no inference of prescription volumes |
| France | [Open Medic](https://www.data.gouv.fr/reuses/open-medic-2014-2025) | Reimbursement and medicine spend | Download-review | Verify current official data publisher, coding and latest year |
| Spain | [AEMPS CIMA](https://cima.aemps.es/cima/rest/medicamentos) | Medicines, authorisations, SmPC, packs | API | Review AEMPS terms and versioned schema |
| Italy | [AIFA OsMed and authorised lists](https://www.aifa.gov.it/dati-e-analisi) | Consumption, expenditure, medicines lists | Download | Reports and tables have distinct grains and update cycles |
| Germany | [BfArM AMIce / PharmNet.Bund](https://www.pharmnet-bund.de/dynamic/de/arzneimittel-informationssystem/index.html) | Registered medicinal products and authorisation details | Portal/Restricted | Full datasets and services may require registration/payment |
| Netherlands | [MEB Medicines Evaluation Board](https://www.geneesmiddeleninformatiebank.nl/) | Medicines, package leaflets, authorisations | Download | Weekly data availability reported; verify exact current feed |
| Netherlands | [GIP Databank](https://www.gipdatabank.nl/) | Outpatient drug utilization and expenditure | Portal/Download | Limited national reimbursement perspective |
| Belgium | [FAMHP / SAM](https://www.famhp.be/en/human_use/medicines) | Authorisations, medicine references and prices | API-review | SAM web service has onboarding/usage terms; assess endpoints |
| Denmark | [Medicinpriser API](https://api.medicinpriser.dk/) | Active medicine packs and official prices | API | Package-level API; price effective periods and price type must be kept |
| Sweden | [Fass and TLV](https://api.fass.se/documentation/index.html) | Medicine information plus separate reimbursement/price authority | Restricted/API | Fass industry-operated and not automatically free commercial use |
| Norway | [DMP medicine FHIR service](https://www.dmp.no/en/about-us/distribution-of-data-on-medicinal-products/FHIR-service/content-of-the-fhir-service) | Medicinal products and regulatory data | API | Assess coverage, licensing and Norwegian codes |
| Finland | [Fimea](https://fimea.fi/en/databases_and_registers) | Medicines register and consumption statistics | Portal/Download | API not verified |
| Poland | [NFZ drug-program statistics](https://api.nfz.gov.pl/app-stat-api-pl/swagger-docs) | Drug-program reimbursement spend by substance and programme | API | Not complete retail market or all prescriptions |
| Poland | [URPL](https://rejestry.ezdrowie.gov.pl/rpl/search/public) | Registered medicinal products | Portal | Official public API not independently validated |
| Czechia | [SÚKL](https://sukl.gov.cz/) | Medicine registrations, distributions and shortages | Download | Follow dataset licence and avoid implying stock from distribution |
| Austria | [BASG](https://www.basg.gv.at/en/) | Medicine register and supply disruptions | Portal/Download | No publicly documented general API confirmed |
| Switzerland | [Swissmedic](https://www.swissmedic.ch/swissmedic/en/home/services/listen_neu.html) | Authorised medicinal product lists | Download | Separate BAG reimbursement catalogue required for pricing |
| Portugal | [INFARMED / SNS Transparência](https://transparencia.sns.gov.pt/) | Medicine expenditure and dispensing data | API/Download | SNS transparency subset; verify API access and licensing |
| Hungary | [NNGYK / OGYEI](https://ogyei.gov.hu/drug_database/) | Authorised medicines and SPCs | Portal | No verified public API |
| Ukraine | [State Expert Center register](https://www.dec.gov.ua/en/announcement/informaczijne-povidomlennya-pro-oficzijni-dzherela-danyh-derzhavnogo-reyestru-likarskyh-zasobiv/) | Medicines registrations and official registry links | Portal/Download | Regular data lists may describe special recognition pathways, not total market |
| Russia | [Ministry of Health GRLS](https://minzdrav.gov.ru/opendata/7707778246-grls) | Registered medicinal products | Download/Portal | No unconditional public general API verified; review update and jurisdiction rules |
| Greece | [EOF](https://www.eof.gr/) | National medicine licensing and safety | Discovery | Specific programmatic source not yet verified |
| Romania | [ANMDMR](https://www.anm.ro/en/) | National approvals and medicines information | Discovery | No national feed validated in this review |
| Bulgaria | [BDA](https://www.bda.bg/en/) | National authorisations and safety | Discovery | No national feed validated in this review |
| Croatia | [HALMED](https://www.halmed.hr/en/) | Approved medicines and shortages | Discovery | No national feed validated in this review |
| Slovenia | [JAZMP](https://www.jazmp.si/en/) | Medicine authorisations and regulatory decisions | Discovery | No national feed validated in this review |
| Slovakia | [SÚKL](https://www.sukl.sk/) | Registered medicines and safety notices | Discovery | No national feed validated in this review |
| Estonia | [State Agency of Medicines](https://www.ravimiamet.ee/en) | Medicines register and statistics | Discovery | No national feed validated in this review |
| Latvia | [State Agency of Medicines](https://www.zva.gov.lv/en) | Medicines register and prices | Discovery | No national feed validated in this review |
| Lithuania | [State Medicines Control Agency](https://vvkt.lrv.lt/en/) | Medicines register, regulation | Discovery | No national feed validated in this review |
| Serbia | [ALIMS](https://www.alims.gov.rs/english/) | National medicine licences and safety | Discovery | No public API verified |
| Türkiye | [TİTCK](https://www.titck.gov.tr/) | Registered drugs, reference prices, regulatory notices | Portal | No verified public medicines REST API |

### North America

| Country / area | Regulator, data publisher or feed | Data wanted | Access mode | Important qualification |
| --- | --- | --- | --- | --- |
| United States | [FDA openFDA](https://open.fda.gov/apis/drug/) | Authorised products, drug labels, NDCs, adverse events, recalls | API | FDA authorisation, NDC listing and current marketing are distinct concepts |
| United States | [CMS data](https://data.cms.gov/api-docs) | Medicare drug spending and prescriber activity | API | Medicare population subset; not complete US market |
| Canada | [Health Canada Drug Product Database](https://health-products.canada.ca/api/drug/) | DINs, approved drug products, status, ingredients | API | Country-specific bilingual product records |
| Canada | [Canada Vigilance](https://health-products.canada.ca/api/canada-vigilance/) | Spontaneous adverse reaction reports | API | Reporting counts not event rates |
| Mexico | [COFEPRIS](https://registros.cofepris.gob.mx/BRSDM/default.aspx) | National medicine registration records | Portal/Download | Public general API not confirmed |

### Latin America

| Country / area | Regulator, data publisher or feed | Data wanted | Access mode | Important qualification |
| --- | --- | --- | --- | --- |
| Brazil | [ANVISA and CMED](https://dados.anvisa.gov.br/dados/) | Marketing authorisations and regulated medicine prices | Download | Separate datasets; keep CMED ceiling price classifications |
| Argentina | [ANMAT](https://www.argentina.gob.ar/anmat/regulados/medicamentos/registro-y-autorizacion-de-comercializacion) | Medicines register and status | Portal/Download | Some national open CSV downloads are historical |
| Chile | [ISP and ChileCompra](https://www.chilecompra.cl/api/) | Tender notices, purchase orders and awards; separate medicine register | API/Portal | Procurement API may require an access key |
| Colombia | [INVIMA and SISMED](https://www.datos.gov.co/Salud-y-Protecci-n-Social/Consulta-p-blica-de-Precios-de-Medicamentos/3he6-m866) | CUM medicine records, reported medicine prices | API/Portal | Socrata price API; authorised product registry is separate |
| Peru | [DIGEMID](https://www.digemid.minsa.gob.pe/) | Registered medicines, price observatory, regulatory alerts | Portal/Download | No verified public programmable medicine API |
| Ecuador | [ARCSA](https://www.controlsanitario.gob.ec/base-de-datos/) | Registered health products and permits | Portal | Machine API not verified |
| Uruguay | [Ministry of Public Health](https://www.gub.uy/ministerio-salud-publica/) | Registered medicines and supply notices | Discovery | No official public medicine API verified |

### Asia Pacific

| Country / area | Regulator, data publisher or feed | Data wanted | Access mode | Important qualification |
| --- | --- | --- | --- | --- |
| India | [CDSCO / SUGAM](https://cdscoonline.gov.in/CDSCO/cdscoDrugs) | Approved medicines, licences, approval pathways | Portal | Public open medicine records API not confirmed |
| India | [NPPA Pharma Sahi Daam](https://nppaipdms.gov.in/NPPA/PharmaSahiDaam/searchMedicine) | Ceiling and retail price references | Portal | No public API contract verified; ceiling price is not realized sales |
| India | [ABDM Drug Registry](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2278991) | National standardized drug registry initiative | Access-review | Launched in June 2026; public API and commercial reuse access not verified |
| India | [CTRI](https://www.ctri.nic.in/Clinicaltrials/pubview.php) | Indian clinical trial registrations | Portal | No open official programmatic feed verified |
| China | [NMPA](https://english.nmpa.gov.cn/database.html) | National drug licences and regulatory records | Portal | No official public bulk drug API independently verified |
| Japan | [PMDA / MHLW](https://www.pmda.go.jp/english/) | Medicine approvals, labels, safety; NDB aggregate utilization | Portal/Download | Separate MHLW NDB sources, national data rights review required |
| South Korea | [MFDS OpenAPI](https://www.data.go.kr/data/15095677/openapi.do) | Drug permits, product registrations | API | Access key/registration and endpoint-specific licence review |
| South Korea | [HIRA](https://www.data.go.kr/data/15047819/openapi.do) | Reimbursement and prescribing utilization | API | Claims universe and timeframe must be specified |
| Taiwan | [TFDA and NHI](https://data.nhi.gov.tw/) | Drug licences, reimbursed medicines and price schedules | API/Download | Validate OpenAPI route and current endpoint version |
| Singapore | [HSA / data.gov.sg](https://developers.data.gov.sg/datasets?agencies=Health+Sciences+Authority+%28HSA%29&resultId=d_767279312753558cbf19d48344577084) | Registered therapeutic products, suppliers and licensed pharmacies | API/Download | Official dataset APIs; dataset version and licence by item |
| Malaysia | [NPRA / KKMNOW](https://data.moh.gov.my/data-catalogue/pharmaceutical_products) | Approved medicines and manufacturers, importers, wholesalers | Download | Official Parquet downloads; specifically NOT accessible through OpenAPI |
| Indonesia | [BPOM Satu Data](https://satudata.pom.go.id/datasets/364-app---product-master-drug-commodity) | Registered products, drug commodity data | API-review | Check actual catalogue service authentication and license |
| Thailand | [Thai FDA / data.go.th](https://data.go.th/th/dataset/web-service-drug-reg) | Registered drugs and medicine reference data | API-review | A listed web service exists; validate freshness and current documentation |
| Vietnam | [Drug Administration of Vietnam](https://dichvucong.dav.gov.vn/) | Medicine registrations, prices and GxP details | Portal | Public machine API unverified |
| Philippines | [FDA Philippines](https://verification.fda.gov.ph/Home.php) | Registered health products and licences | Portal | No official open medicines REST verified |
| Pakistan | [DRAP](https://e.dra.gov.pk/) | Registered medicines, manufacturers and price notices | Portal | Public API unverified |
| Bangladesh | [DGDA / DGHS FHIR](https://fhir.dghs.gov.bd/) | Registered drug terminology and medicine entries | FHIR-review | Some terminology ValueSet expansions are unsupported; confirm licensing and endpoints |
| Nepal | [DDA](https://dams.dda.gov.np/manLogin/publicInfo1) | Registered medicines | Portal | No public API verified |
| Sri Lanka | [NMRA](https://nmra.gov.lk/) | Medicine registrations and recalls | Portal | Some published registered-medicine lists are stale; freshness warning mandatory |

### Oceania

| Country / area | Regulator, data publisher or feed | Data wanted | Access mode | Important qualification |
| --- | --- | --- | --- | --- |
| Australia | [TGA ARTG](https://www.tga.gov.au/resources/datasets) | Authorised medicines, safety, shortages, recalls | Download | Different TGA dataset release frequencies |
| Australia | [PBS](https://data.pbs.gov.au/document/91327.html) | Subsidy items, dispensing statistics, reimbursement | API | API rate and monthly scope constraints; not all Australian pharmaceutical use |
| New Zealand | [Medsafe / NZULM](https://info.nzulm.org.nz/data-access) | Medicine approvals, terminology and subsidy data | Download/Restricted | Licensing differs between medicines and subsidised lists |

### Middle East

| Country / area | Regulator, data publisher or feed | Data wanted | Access mode | Important qualification |
| --- | --- | --- | --- | --- |
| Saudi Arabia | [SFDA](https://www.sfda.gov.sa/en/open-data) | Medicines register, recalls, open data and pricing | Download/Portal | Serialization and track-and-trace interfaces are not public stock feeds |
| United Arab Emirates | [MOHAP / EDE](https://mohap.gov.ae/en/open-data/open-data-api) | Registered medicinal products and licences | API/Access-review | API marketplace access process must be completed; EDE is relevant authority |
| Israel | [Ministry of Health medicines register](https://israeldrugs.health.gov.il/) | Registered medicines, product information, prices | Portal/Download | No official open REST independently verified |
| Jordan | [JFDA open data](https://opendata.gov.jo/en/dataset/api_guide/drug-prices-838-2021) | Published drug price lists | Download/API-review | Catalog metadata/API does not prove fresh record-level price feed |
| Oman | [Ministry of Health](https://www.moh.gov.om/) | Medicine prices, registration and safety | Portal/Download | No general medicine API confirmed |
| Qatar | [Ministry of Public Health](https://www.moph.gov.qa/) | Medicine registrations, pharmacies and price services | Portal | Official public API not verified |
| Bahrain | [NHRA](https://www.nhra.bh/) | Medicine registrations, licensed institutions | Discovery | Specific dataset/endpoint not validated |
| Kuwait | [Ministry of Health](https://www.moh.gov.kw/) | Medicines approvals and procurement | Discovery | Specific dataset/endpoint not validated |

### Africa

| Country / area | Regulator, data publisher or feed | Data wanted | Access mode | Important qualification |
| --- | --- | --- | --- | --- |
| South Africa | [SAHPRA](https://www.sahpra.org.za/databases-registers/) | Registered medicines and product licences | Portal/Download | National registrations independent of private price data |
| South Africa | [Department of Health SEP](https://www.health.gov.za/nhi-pee/) | Single Exit Price medicine database | Download | Not transaction prices; prices effective by date and version |
| Nigeria | [NAFDAC Greenbook](https://greenbook.nafdac.gov.ng/) | Registered medicines and product licence details | Portal | No unrestricted public data API validated |
| Kenya | [PPB](https://ppb.go.ke/products) | Registered medicines and licences | Portal | No official public machine API verified |
| Ghana | [FDA Ghana](https://fdaghana.gov.gh/) | Registered products and authorization | Discovery | Validate official register URL and access terms |
| Tanzania | [TMDA](https://www.tmda.go.tz/pages/registered-medicinal-products) | Registered medicines and licensing notices | Portal | No official public API verified |
| Rwanda | [Rwanda FDA](https://monitoring.rwandafda.gov.rw/register/hmdr/) | Medicines product register | Portal | Programmatic access not independently verified |
| Morocco | [Open Data / AMMPS](https://www.data.gov.ma/data/fr/dataset/referentiel-des-medicaments) | Medicine reference list, retail and hospital prices | Download | Commercial re-use and currency/effective dates require review |
| Egypt | [Egyptian Drug Authority](https://edaegypt.gov.eg/en/services/databases/) | Registered drugs, pricing and safety reference data | Portal | No official general API confirmed |
| Algeria | [Ministry of Pharmaceutical Industry](https://www.miph.gov.dz/) | Medicine registrations and manufacture | Discovery | Specific current dataset not validated |
| Ethiopia | [EFDA](https://www.efda.gov.et/) | Medicines registry, safety and licence notices | Discovery | Specific current dataset not validated |
| Uganda | [NDA](https://www.nda.or.ug/) | Registered medicines and pharmacovigilance | Discovery | Specific current dataset not validated |

## Sources that may require a commercial agreement

- **IQVIA MIDAS:** estimated pharmaceutical sales and performance across countries and channels; contracted territorial/channel definitions, export and derived-product rights needed. Source: https://www.iqvia.com/solutions/commercialization/data-and-information-management/midas
- **Citeline Trialtrove / Pharmaprojects:** curated trials, pipeline, competition and historical lifecycle; obtain explicit API and AI/redistribution rights. Source: https://citeline.com/solutions/informatics-solutions/
- **GlobalData Pharma Intelligence:** pharmaceutical company, pipeline, market, regulatory and price intelligence. Source: https://www.globaldata.com/industries/pharmaceutical/
- **DrugBank Enterprise:** structured medication facts, drug interactions and knowledge graphs; commercial/API licensing required. Source: https://docs.drugbank.com/openapi
- **VigiBase Extract / WHO-UMC:** licensed pharmacovigilance case-level or detailed data, separate from aggregated VigiAccess. Source: https://who-umc.org/vigibase-data-access/vigibase-extract/
- **SNOMED CT, local national extensions and ATC/DDD:** terminology identifiers are not necessarily freely sublicensable in a commercial worldwide SaaS. Review country-specific SNOMED licenses and WHO Collaborating Centre ATC/DDD terms. Sources: https://www.snomed.org/licensing ; https://atcddd.fhi.no/atc_ddd_index_and_guidelines/atc_ddd_index/

**Do not purchase licenses or turn on billing as part of the research phase.** Obtain quote, field list, covered countries, historical depth, refresh, permitted derivative insights, offline cache, device delivery, AI use, export and revocation before commercial inclusion.

## Implementation architecture

```
Source registry (jurisdiction + owners + rights)
    -> approved adapter (API / bulk download / permissioned source)
    -> immutable raw snapshot (hash, retrieval, origin, schema)
    -> staging validation and quarantined rejects
    -> canonical substance / product / presentation / pack / terminology graph
    -> country + channel + time-aligned fact tables
    -> source-rights + tenant membership + revocation authorisation
    -> protected NovaPharm Intelligence API / API Gateway
    -> Intelligence Web / iOS / Android consumers
```

Store separately: `source_id`, `dataset_version`, `origin_url`, `sha256`, `fetched_at`, `observation_period`, `published_at`, `valid_from`, `valid_to`, `country_iso2`, `regulator`, `market_channel`, `product_local_id`, `substance_local_id`, `pack_units`, `currency`, `unit_of_measure`, `license_id`, `license_effective_end`, `publisher_rights_state`, `allowed_uses`, `tenant_id`, `release_status`, `revoked_at`. Do not conflate collection time, publication time and observation time.

Use ISO IDMP-informed entities and FHIR where data is available; store original national codes and only publish crosswalks when validated. UK BNF/dm+d/SNOMED, US NDC/RxNorm, Canada DIN, Spain CIMA, Singapore HSA registration identifiers, and national pack identifiers must retain their provenance and effective dates. Keep ambiguous crosswalks explicitly unresolved rather than auto-matching similar drug names.

## Connect to the existing 22 NovaPharm Intelligence workspaces

- **First governed pilot:** Search, Medicine Overview, Identity, Evidence, Observed Market, Geography. Use one correctly mapped medicine and one country/time period with provenance; availability is field-level and must not imply source-rights or live release.
- **Market phase:** Market Structure, Forecasts, Signals, Medicine Tape, Pricing & Reimbursement. Require bounded, accepted non-sample series, compatible denominators, testable forecasting backtests and uncertainty.
- **Commercial and compliance phase:** Supply Intelligence, Regulatory Intelligence, Tender Intelligence, Portfolio, Biotech Intelligence, Capital Intelligence. Deny any operational or legal conclusion without accepted source, jurisdiction and date.
- **Enterprise phase:** Decision Workspace, Watchlists, Alerts, Reports, Private Commercial. Require two-tenant identity acceptance, consent, subscriptions and audit permissions; all automatic high-impact actions remain disabled by default.

## Build sequence

**P0 — rights-governed identity and six-screen pilot.** First finish and independently attest UK founder/second-tenant MFA, permissions, Atlas ownership and rights. Match one Apixaban product in a source-separated Search/Overview/Identity/Evidence/Observed Market/Geography flow. A public listing is not an automatic authorised ingest.

**P1 — highest-fidelity public endpoints.** Develop testable read adapters for FDA openFDA, ClinicalTrials.gov, Europe PMC and other global non-commercial research metadata, Canada DPD, Spain CIMA, Denmark Medicinpriser, Poland NFZ, Singapore data.gov.sg, Korea MFDS/HIRA and Australia PBS. Use minimal data with clear eligibility and country scope. EMA PMS is beta: sandbox/registration first.

**P2 — government file feeds.** Add UK NHSBSA EPD, Ireland HPRA XML, France medicine base, Brazil ANVISA/CMED, Malaysia NPRA Parquet, Australia TGA, South Africa medicine pricing, Switzerland Swissmedic and European member state sources. Use bounded download, hashed manifests, replay and backfill controls.

**P3 — permissioned/portal authorities, regional procurement and licensed market data.** India, China, Japan, Saudi, further MENA/African/Latin American medicine registers and licensing. Global drug sales and market shares only after appropriate IQVIA/Citeline/GlobalData or comparable supplier agreements.

No public rollout, live API key, bulk ingestion, AWS spend, model training or App Store submission is authorized solely by these phases.

## Mandatory release acceptance for each source

1. Regulator/publisher identity and primary URL rechecked; endpoint and terms reviewed as of a recorded date.
2. Commercial use, indexing, redistribution, AI input/output, caching, export, territories, licence expiry and revocation independently signed.
3. Authentication/rate limits, bounded sample call, schema, pagination, historical backfill, update cadence, retention and outages validated.
4. Substance/product/pack mappings compared against official reference records with explicit ambiguities and no fabricated links.
5. Temporal comparability checks for observation, publication, currency, payer/channel and geographic scope, with non-sample evidence and rejection tests.
6. Two-tenant negative and positive role tests; no unauthorised source, customer data, clinical data or platform API keys in mobile bundles.
7. Unlicensed, stale, missing or withdrawn data rendered as **unavailable / not approved / outdated**, not zero, not a forecast and not a live price.
8. Signed exact-head CI, source-specific contract tests, security/accessibility tests, immutable production release SHA, rollback and independent owner acceptance.

## Current truthful status

This document and its adjacent JSON are research deliverables. They do not constitute API connection, a third-party agreement, admitted production data, validated global coverage, an installed iOS or Android binary or an App Store/Play Store release. Source candidates can be converted into a staged, fail-closed engineering backlog without enabling public or paid access.
