# NovaPharm Intelligence — complete 77-country source coverage register

**As-of baseline:** 17 November 2026; source-only implementation coverage audit: 18 November 2026.

**Inventory coverage:** 77 individual named countries, plus the EU/EEA and Global research groups; 101 authoritative-source **candidates** in eight registry regions. All 101 entries are registered for review; **none is independently demonstrated as rights-approved, ingested, validated or customer-live** by this register. This is the complete user-supplied discovery inventory, *not* every country in the world.

The register is tied to `src/core/intelligence-country-source-baseline.mjs`: every source key must remain present for its original jurisdiction. Hybrid portal/restricted source modes require separate export or access approvals. Do not confuse catalogue presence or trial/research data with domestic authorisation, availability, prices, actual dispensing or pharmacovigilance incidence.

## Regional coverage summary

| Region | National countries | Supranational/global groups | Source candidates |
|---|---:|---:|---:|
| Global | 0 | 1 | 9 |
| Europe | 31 | 1 | 38 |
| North America | 3 | 0 | 5 |
| Latin America | 7 | 0 | 7 |
| Asia Pacific | 15 | 0 | 19 |
| Oceania | 2 | 0 | 3 |
| Middle East | 8 | 0 | 8 |
| Africa | 11 | 0 | 12 |
| **Total** | **77** | **2** | **101** |

## All countries and sources — source-key audit

**Rights:** all Not reviewed; **runtime:** all Not verified live. Modes are *advertised in the registry*, not independently validated as public APIs. `GB`, `EU-EEA`, and `GLOBAL` are represented separately; the latter two are groups, not countries.

| Region | Country / group | Code | Authority / source | Advertised mode | Exact candidate key | Rights | Customer-live |
|---|---|---|---|---|---|---|---|
| Global | Global | GLOBAL | US ClinicalTrials.gov | API | `global-global-us-clinicaltrials-gov` | Not reviewed | Not verified live |
| Global | Global | GLOBAL | Europe PMC | API | `global-global-europe-pmc` | Not reviewed | Not verified live |
| Global | Global | GLOBAL | NCBI PubMed | API | `global-global-ncbi-pubmed` | Not reviewed | Not verified live |
| Global | Global | GLOBAL | ChEMBL | API | `global-global-chembl` | Not reviewed | Not verified live |
| Global | Global | GLOBAL | PubChem | API | `global-global-pubchem` | Not reviewed | Not verified live |
| Global | Global | GLOBAL | UN Comtrade | API | `global-global-un-comtrade` | Not reviewed | Not verified live |
| Global | Global | GLOBAL | EPO OPS | API | `global-global-epo-ops` | Not reviewed | Not verified live |
| Global | Global | GLOBAL | WHO Global Health Observatory | API-review | `global-global-who-global-health-observatory` | Not reviewed | Not verified live |
| Global | Global | GLOBAL | WHO-UMC VigiAccess | Restricted/API | `global-global-who-umc-vigiaccess` | Not reviewed | Not verified live |
| Europe | Austria | AT | BASG | Portal/Download | `europe-austria-basg` | Not reviewed | Not verified live |
| Europe | Belgium | BE | FAMHP / SAM | API-review | `europe-belgium-famhp-sam` | Not reviewed | Not verified live |
| Europe | Bulgaria | BG | BDA | Discovery | `europe-bulgaria-bda` | Not reviewed | Not verified live |
| Europe | Croatia | HR | HALMED | Discovery | `europe-croatia-halmed` | Not reviewed | Not verified live |
| Europe | Czechia | CZ | SÚKL | Download | `europe-czechia-sukl` | Not reviewed | Not verified live |
| Europe | Denmark | DK | Medicinpriser API | API | `europe-denmark-medicinpriser-api` | Not reviewed | Not verified live |
| Europe | Estonia | EE | State Agency of Medicines | Discovery | `europe-estonia-state-agency-of-medicines` | Not reviewed | Not verified live |
| Europe | European Union / EEA | EU-EEA | EMA PMS Public API | Beta API | `europe-european-union-eea-ema-pms-public-api` | Not reviewed | Not verified live |
| Europe | European Union / EEA | EU-EEA | EMA ESMP | Restricted/API | `europe-european-union-eea-ema-esmp` | Not reviewed | Not verified live |
| Europe | European Union / EEA | EU-EEA | TED | API | `europe-european-union-eea-ted` | Not reviewed | Not verified live |
| Europe | Finland | FI | Fimea | Portal/Download | `europe-finland-fimea` | Not reviewed | Not verified live |
| Europe | France | FR | ANSM BDPM | Download | `europe-france-ansm-bdpm` | Not reviewed | Not verified live |
| Europe | France | FR | Open Medic | Download-review | `europe-france-open-medic` | Not reviewed | Not verified live |
| Europe | Germany | DE | BfArM AMIce / PharmNet.Bund | Portal/Restricted | `europe-germany-bfarm-amice-pharmnet-bund` | Not reviewed | Not verified live |
| Europe | Greece | GR | EOF | Discovery | `europe-greece-eof` | Not reviewed | Not verified live |
| Europe | Hungary | HU | NNGYK / OGYEI | Portal | `europe-hungary-nngyk-ogyei` | Not reviewed | Not verified live |
| Europe | Ireland | IE | HPRA authorised medicines | Download | `europe-ireland-hpra-authorised-medicines` | Not reviewed | Not verified live |
| Europe | Italy | IT | AIFA OsMed and authorised lists | Download | `europe-italy-aifa-osmed-and-authorised-lists` | Not reviewed | Not verified live |
| Europe | Latvia | LV | State Agency of Medicines | Discovery | `europe-latvia-state-agency-of-medicines` | Not reviewed | Not verified live |
| Europe | Lithuania | LT | State Medicines Control Agency | Discovery | `europe-lithuania-state-medicines-control-agency` | Not reviewed | Not verified live |
| Europe | Netherlands | NL | MEB Medicines Evaluation Board | Download | `europe-netherlands-meb-medicines-evaluation-board` | Not reviewed | Not verified live |
| Europe | Netherlands | NL | GIP Databank | Portal/Download | `europe-netherlands-gip-databank` | Not reviewed | Not verified live |
| Europe | Norway | NO | DMP medicine FHIR service | API | `europe-norway-dmp-medicine-fhir-service` | Not reviewed | Not verified live |
| Europe | Poland | PL | NFZ drug-program statistics | API | `europe-poland-nfz-drug-program-statistics` | Not reviewed | Not verified live |
| Europe | Poland | PL | URPL | Portal | `europe-poland-urpl` | Not reviewed | Not verified live |
| Europe | Portugal | PT | INFARMED / SNS Transparência | API/Download | `europe-portugal-infarmed-sns-transparencia` | Not reviewed | Not verified live |
| Europe | Romania | RO | ANMDMR | Discovery | `europe-romania-anmdmr` | Not reviewed | Not verified live |
| Europe | Russia | RU | Ministry of Health GRLS | Download/Portal | `europe-russia-ministry-of-health-grls` | Not reviewed | Not verified live |
| Europe | Serbia | RS | ALIMS | Discovery | `europe-serbia-alims` | Not reviewed | Not verified live |
| Europe | Slovakia | SK | SÚKL | Discovery | `europe-slovakia-sukl` | Not reviewed | Not verified live |
| Europe | Slovenia | SI | JAZMP | Discovery | `europe-slovenia-jazmp` | Not reviewed | Not verified live |
| Europe | Spain | ES | AEMPS CIMA | API | `europe-spain-aemps-cima` | Not reviewed | Not verified live |
| Europe | Sweden | SE | Fass and TLV | Restricted/API | `europe-sweden-fass-and-tlv` | Not reviewed | Not verified live |
| Europe | Switzerland | CH | Swissmedic | Download | `europe-switzerland-swissmedic` | Not reviewed | Not verified live |
| Europe | Türkiye | TR | TİTCK | Portal | `europe-turkiye-titck` | Not reviewed | Not verified live |
| Europe | Ukraine | UA | State Expert Center register | Portal/Download | `europe-ukraine-state-expert-center-register` | Not reviewed | Not verified live |
| Europe | United Kingdom | GB | NHSBSA English Prescribing Dataset | API/Download | `europe-united-kingdom-nhsbsa-english-prescribing-dataset` | Not reviewed | Not verified live |
| Europe | United Kingdom | GB | MHRA Products | Portal | `europe-united-kingdom-mhra-products` | Not reviewed | Not verified live |
| North America | Canada | CA | Health Canada Drug Product Database | API | `north-america-canada-health-canada-drug-product-database` | Not reviewed | Not verified live |
| North America | Canada | CA | Canada Vigilance | API | `north-america-canada-canada-vigilance` | Not reviewed | Not verified live |
| North America | Mexico | MX | COFEPRIS | Portal/Download | `north-america-mexico-cofepris` | Not reviewed | Not verified live |
| North America | United States | US | FDA openFDA | API | `north-america-united-states-fda-openfda` | Not reviewed | Not verified live |
| North America | United States | US | CMS data | API | `north-america-united-states-cms-data` | Not reviewed | Not verified live |
| Latin America | Argentina | AR | ANMAT | Portal/Download | `latin-america-argentina-anmat` | Not reviewed | Not verified live |
| Latin America | Brazil | BR | ANVISA and CMED | Download | `latin-america-brazil-anvisa-and-cmed` | Not reviewed | Not verified live |
| Latin America | Chile | CL | ISP and ChileCompra | API/Portal | `latin-america-chile-isp-and-chilecompra` | Not reviewed | Not verified live |
| Latin America | Colombia | CO | INVIMA and SISMED | API/Portal | `latin-america-colombia-invima-and-sismed` | Not reviewed | Not verified live |
| Latin America | Ecuador | EC | ARCSA | Portal | `latin-america-ecuador-arcsa` | Not reviewed | Not verified live |
| Latin America | Peru | PE | DIGEMID | Portal/Download | `latin-america-peru-digemid` | Not reviewed | Not verified live |
| Latin America | Uruguay | UY | Ministry of Public Health | Discovery | `latin-america-uruguay-ministry-of-public-health` | Not reviewed | Not verified live |
| Asia Pacific | Bangladesh | BD | DGDA / DGHS FHIR | FHIR-review | `asia-pacific-bangladesh-dgda-dghs-fhir` | Not reviewed | Not verified live |
| Asia Pacific | China | CN | NMPA | Portal | `asia-pacific-china-nmpa` | Not reviewed | Not verified live |
| Asia Pacific | India | IN | CDSCO / SUGAM | Portal | `asia-pacific-india-cdsco-sugam` | Not reviewed | Not verified live |
| Asia Pacific | India | IN | NPPA Pharma Sahi Daam | Portal | `asia-pacific-india-nppa-pharma-sahi-daam` | Not reviewed | Not verified live |
| Asia Pacific | India | IN | ABDM Drug Registry | Access-review | `asia-pacific-india-abdm-drug-registry` | Not reviewed | Not verified live |
| Asia Pacific | India | IN | CTRI | Portal | `asia-pacific-india-ctri` | Not reviewed | Not verified live |
| Asia Pacific | Indonesia | ID | BPOM Satu Data | API-review | `asia-pacific-indonesia-bpom-satu-data` | Not reviewed | Not verified live |
| Asia Pacific | Japan | JP | PMDA / MHLW | Portal/Download | `asia-pacific-japan-pmda-mhlw` | Not reviewed | Not verified live |
| Asia Pacific | Malaysia | MY | NPRA / KKMNOW | Download | `asia-pacific-malaysia-npra-kkmnow` | Not reviewed | Not verified live |
| Asia Pacific | Nepal | NP | DDA | Portal | `asia-pacific-nepal-dda` | Not reviewed | Not verified live |
| Asia Pacific | Pakistan | PK | DRAP | Portal | `asia-pacific-pakistan-drap` | Not reviewed | Not verified live |
| Asia Pacific | Philippines | PH | FDA Philippines | Portal | `asia-pacific-philippines-fda-philippines` | Not reviewed | Not verified live |
| Asia Pacific | Singapore | SG | HSA / data.gov.sg | API/Download | `asia-pacific-singapore-hsa-data-gov-sg` | Not reviewed | Not verified live |
| Asia Pacific | South Korea | KR | MFDS OpenAPI | API | `asia-pacific-south-korea-mfds-openapi` | Not reviewed | Not verified live |
| Asia Pacific | South Korea | KR | HIRA | API | `asia-pacific-south-korea-hira` | Not reviewed | Not verified live |
| Asia Pacific | Sri Lanka | LK | NMRA | Portal | `asia-pacific-sri-lanka-nmra` | Not reviewed | Not verified live |
| Asia Pacific | Taiwan | TW | TFDA and NHI | API/Download | `asia-pacific-taiwan-tfda-and-nhi` | Not reviewed | Not verified live |
| Asia Pacific | Thailand | TH | Thai FDA / data.go.th | API-review | `asia-pacific-thailand-thai-fda-data-go-th` | Not reviewed | Not verified live |
| Asia Pacific | Vietnam | VN | Drug Administration of Vietnam | Portal | `asia-pacific-vietnam-drug-administration-of-vietnam` | Not reviewed | Not verified live |
| Oceania | Australia | AU | TGA ARTG | Download | `oceania-australia-tga-artg` | Not reviewed | Not verified live |
| Oceania | Australia | AU | PBS | API | `oceania-australia-pbs` | Not reviewed | Not verified live |
| Oceania | New Zealand | NZ | Medsafe / NZULM | Download/Restricted | `oceania-new-zealand-medsafe-nzulm` | Not reviewed | Not verified live |
| Middle East | Bahrain | BH | NHRA | Discovery | `middle-east-bahrain-nhra` | Not reviewed | Not verified live |
| Middle East | Israel | IL | Ministry of Health medicines register | Portal/Download | `middle-east-israel-ministry-of-health-medicines-register` | Not reviewed | Not verified live |
| Middle East | Jordan | JO | JFDA open data | Download/API-review | `middle-east-jordan-jfda-open-data` | Not reviewed | Not verified live |
| Middle East | Kuwait | KW | Ministry of Health | Discovery | `middle-east-kuwait-ministry-of-health` | Not reviewed | Not verified live |
| Middle East | Oman | OM | Ministry of Health | Portal/Download | `middle-east-oman-ministry-of-health` | Not reviewed | Not verified live |
| Middle East | Qatar | QA | Ministry of Public Health | Portal | `middle-east-qatar-ministry-of-public-health` | Not reviewed | Not verified live |
| Middle East | Saudi Arabia | SA | SFDA | Download/Portal | `middle-east-saudi-arabia-sfda` | Not reviewed | Not verified live |
| Middle East | United Arab Emirates | AE | MOHAP / EDE | API/Access-review | `middle-east-united-arab-emirates-mohap-ede` | Not reviewed | Not verified live |
| Africa | Algeria | DZ | Ministry of Pharmaceutical Industry | Discovery | `africa-algeria-ministry-of-pharmaceutical-industry` | Not reviewed | Not verified live |
| Africa | Egypt | EG | Egyptian Drug Authority | Portal | `africa-egypt-egyptian-drug-authority` | Not reviewed | Not verified live |
| Africa | Ethiopia | ET | EFDA | Discovery | `africa-ethiopia-efda` | Not reviewed | Not verified live |
| Africa | Ghana | GH | FDA Ghana | Discovery | `africa-ghana-fda-ghana` | Not reviewed | Not verified live |
| Africa | Kenya | KE | PPB | Portal | `africa-kenya-ppb` | Not reviewed | Not verified live |
| Africa | Morocco | MA | Open Data / AMMPS | Download | `africa-morocco-open-data-ammps` | Not reviewed | Not verified live |
| Africa | Nigeria | NG | NAFDAC Greenbook | Portal | `africa-nigeria-nafdac-greenbook` | Not reviewed | Not verified live |
| Africa | Rwanda | RW | Rwanda FDA | Portal | `africa-rwanda-rwanda-fda` | Not reviewed | Not verified live |
| Africa | South Africa | ZA | SAHPRA | Portal/Download | `africa-south-africa-sahpra` | Not reviewed | Not verified live |
| Africa | South Africa | ZA | Department of Health SEP | Download | `africa-south-africa-department-of-health-sep` | Not reviewed | Not verified live |
| Africa | Tanzania | TZ | TMDA | Portal | `africa-tanzania-tmda` | Not reviewed | Not verified live |
| Africa | Uganda | UG | NDA | Discovery | `africa-uganda-nda` | Not reviewed | Not verified live |

## Release gate definition

Each country requires independent and documented publisher authority, source-specific commercial/AI use rights, an authenticated or permitted feed, a tested bounded ingest, immutable publisher snapshots, local medicine identifier reconciliation, protected tenant access with revocation, observability and rollback, and a verified signed production customer read.

**Unverified cannot be marked 100%.** UK NHSBSA prescribing observations, Canadian approvals, Spanish product authorisations, and global clinical/research sources are different data classes and must not be substituted for each other. The separate country ledger outputs an explicit next action for every source; use `node scripts/render-intelligence-country-release-ledger.mjs --markdown` to inspect it.

**Scope change process:** a new jurisdiction or alternative regulator must be reviewed and added explicitly to both the discovery registry and pinned baseline; it cannot overwrite an earlier country-source assignment undetected.
