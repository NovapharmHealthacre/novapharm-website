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
