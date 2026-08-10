import { novapharmOrganisation, personBySlug } from "@novapharm/content";

export const founderOrigin = "https://vishal.novapharmhealthcare.com";
export const founderWebsiteId = `${founderOrigin}/#website`;
export const founderProfileId = `${founderOrigin}/about/#profile`;
export const profileReviewedOn = "2026-08-01";

export const vishal = personBySlug("vishal-chakravarty");

export const founderContact = Object.freeze({
  email: "vishal@novapharmhealthcare.com",
  linkedIn: "https://www.linkedin.com/in/vishal-chakravarty",
});

export const founderProfile = Object.freeze({
  proposition:
    "Building a UK-led pharmaceutical company around market access, specialist medicines and resilient supply across regulated markets.",
  shortBio:
    "Vishal Chakravarty is Chief Executive Officer of NovaPharm Healthcare Ltd. He founded the UK-registered pharmaceutical company in 2025 and is building it around product strategy, market access, manufacturing partnerships and resilient supply across regulated markets.",
  mediumBio:
    "Vishal Chakravarty is Chief Executive Officer of NovaPharm Healthcare Ltd. He founded the UK-registered pharmaceutical company in 2025. His pharmaceutical experience predates NovaPharm, including work with SyriMed between 2020 and 2025. He is building the company around specialist medicines, product and market selection, licensing pathways, manufacturing partnerships, technology transfer, sourcing, supply and commercial market entry. Vishal contributes external analysis to Yakuji Nippo and Pharmaceutical Commerce and writes independently about the decisions that shape regulated pharmaceutical businesses.",
  portrait: Object.freeze({
    path: "/images/portrait/vishal-chakravarty-1440.jpg",
    alt: "Portrait of Vishal Chakravarty",
    width: 1440,
    height: 1402,
  }),
});

export interface PublicationTranslation {
  readonly language: string;
  readonly title: string;
  readonly url: string;
  readonly verifiedOn: string;
}

export interface ExternalPublicationRecord {
  readonly id: string;
  readonly title: string;
  readonly publisher: "Yakuji Nippo" | "Pharmaceutical Commerce";
  readonly publicationType: "External analysis" | "External commentary";
  readonly publicationDate: string;
  readonly author: "Vishal Chakravarty";
  readonly language: "en";
  readonly canonicalUrl: string;
  readonly subject: string;
  readonly abstract: string;
  readonly series?: Readonly<{ readonly name: string; readonly article: number }>;
  readonly translations: readonly PublicationTranslation[];
  readonly evidenceStatus: "verified_external_publication";
  readonly evidenceUrl: string;
  readonly reviewedOn: string;
  readonly featured: boolean;
  readonly topics: readonly string[];
  readonly external: true;
}

const records: readonly ExternalPublicationRecord[] = Object.freeze([
  Object.freeze({
    id: "yakuji-uk-eu-market-access-article-1",
    title: "UK and EU Pharmaceutical Market Access Pathways After Brexit",
    publisher: "Yakuji Nippo",
    publicationType: "External analysis",
    publicationDate: "2026-02-06",
    author: "Vishal Chakravarty",
    language: "en",
    canonicalUrl: "https://www.yakuji.co.jp/entry129529.html",
    subject: "Market access after Brexit",
    abstract:
      "An analysis of the separate UK and EU pathways that pharmaceutical companies must connect through product, regulatory and commercial planning.",
    series: Object.freeze({
      name: "UK–EU Pharmaceutical Market Access and Compliance in the Post-Brexit Era",
      article: 1,
    }),
    translations: Object.freeze([
      Object.freeze({
        language: "ja",
        title: "Publisher-verified Japanese edition",
        url: "https://www.yakuji.co.jp/entry129530.html",
        verifiedOn: "2026-08-01",
      }),
    ]),
    evidenceStatus: "verified_external_publication",
    evidenceUrl: "https://www.yakuji.co.jp/entry129529.html",
    reviewedOn: "2026-08-01",
    featured: false,
    topics: Object.freeze([
      "Post-Brexit market access",
      "UK pharmaceutical regulation",
      "EU pharmaceutical regulation",
    ]),
    external: true,
  }),
  Object.freeze({
    id: "yakuji-uk-eu-market-access-article-2",
    title: "Regulatory and Compliance Considerations Post-Brexit",
    publisher: "Yakuji Nippo",
    publicationType: "External analysis",
    publicationDate: "2026-03-12",
    author: "Vishal Chakravarty",
    language: "en",
    canonicalUrl: "https://www.yakuji.co.jp/entry131265.html",
    subject: "Regulatory and compliance strategy",
    abstract:
      "A practical review of the responsibilities, sequencing and compliance questions created by the post-Brexit pharmaceutical environment.",
    series: Object.freeze({
      name: "UK–EU Pharmaceutical Market Access and Compliance in the Post-Brexit Era",
      article: 2,
    }),
    translations: Object.freeze([
      Object.freeze({
        language: "ja",
        title: "Publisher-verified Japanese edition",
        url: "https://www.yakuji.co.jp/entry131266.html",
        verifiedOn: "2026-08-01",
      }),
    ]),
    evidenceStatus: "verified_external_publication",
    evidenceUrl: "https://www.yakuji.co.jp/entry131265.html",
    reviewedOn: "2026-08-01",
    featured: false,
    topics: Object.freeze(["Post-Brexit compliance", "Regulatory strategy", "Market-entry sequencing"]),
    external: true,
  }),
  Object.freeze({
    id: "yakuji-uk-eu-market-access-article-3",
    title: "Parallel Import Frameworks and Risk Considerations",
    publisher: "Yakuji Nippo",
    publicationType: "External analysis",
    publicationDate: "2026-05-12",
    author: "Vishal Chakravarty",
    language: "en",
    canonicalUrl: "https://www.yakuji.co.jp/entry133526.html",
    subject: "Parallel import and supply risk",
    abstract:
      "An explanation of the parallel-import framework and the licensing, quality, supply and commercial risks that sit behind the opportunity.",
    series: Object.freeze({
      name: "UK–EU Pharmaceutical Market Access and Compliance in the Post-Brexit Era",
      article: 3,
    }),
    translations: Object.freeze([
      Object.freeze({
        language: "ja",
        title: "Publisher-verified Japanese edition",
        url: "https://www.yakuji.co.jp/entry133527.html",
        verifiedOn: "2026-08-01",
      }),
    ]),
    evidenceStatus: "verified_external_publication",
    evidenceUrl: "https://www.yakuji.co.jp/entry133526.html",
    reviewedOn: "2026-08-01",
    featured: false,
    topics: Object.freeze(["Parallel import", "Licensing risk", "Supply governance"]),
    external: true,
  }),
  Object.freeze({
    id: "yakuji-uk-eu-market-access-article-4",
    title:
      "UK–EU Pharmaceutical Market Access and Compliance in the Post-Brexit Era — 4. Compliance-Driven Approaches to Cross-Border Market Entry",
    publisher: "Yakuji Nippo",
    publicationType: "External analysis",
    publicationDate: "2026-07-23",
    author: "Vishal Chakravarty",
    language: "en",
    canonicalUrl: "https://www.yakuji.co.jp/entry136963.html",
    subject: "Compliance-driven cross-border market entry",
    abstract:
      "A compliance-led view of cross-border pharmaceutical entry, connecting market choice with regulatory infrastructure, GDP responsibilities and quality-system readiness across the UK and EU.",
    series: Object.freeze({
      name: "UK–EU Pharmaceutical Market Access and Compliance in the Post-Brexit Era",
      article: 4,
    }),
    translations: Object.freeze([
      Object.freeze({
        language: "ja",
        title: "Publisher-verified Japanese edition",
        url: "https://www.yakuji.co.jp/entry136964.html",
        verifiedOn: "2026-08-01",
      }),
    ]),
    evidenceStatus: "verified_external_publication",
    evidenceUrl: "https://www.yakuji.co.jp/entry136963.html",
    reviewedOn: "2026-08-01",
    featured: true,
    topics: Object.freeze([
      "Cross-border pharmaceutical market entry",
      "Post-Brexit market access",
      "Regulatory infrastructure",
      "Compliance strategy",
      "GDP and quality systems",
      "UK and EU pharmaceutical markets",
    ]),
    external: true,
  }),
  Object.freeze({
    id: "pharmaceutical-commerce-onshoring-supply-resilience",
    title: "Why Onshoring Alone Won’t Secure Pharma Supply Chains",
    publisher: "Pharmaceutical Commerce",
    publicationType: "External commentary",
    publicationDate: "2026-07-31",
    author: "Vishal Chakravarty",
    language: "en",
    canonicalUrl: "https://www.pharmaceuticalcommerce.com/view/why-onshoring-alone-wont-secure-pharma-supply-chains",
    subject: "Pharmaceutical supply resilience beyond onshoring",
    abstract:
      "A supply-resilience argument for combining geographic strategy with qualified redundancy, quality maturity, concentration controls and commercially sustainable continuity planning.",
    translations: Object.freeze([]),
    evidenceStatus: "verified_external_publication",
    evidenceUrl: "https://www.pharmaceuticalcommerce.com/view/why-onshoring-alone-wont-secure-pharma-supply-chains",
    reviewedOn: "2026-08-01",
    featured: true,
    topics: Object.freeze([
      "Pharmaceutical supply resilience",
      "Onshoring",
      "Manufacturing concentration",
      "Quality maturity",
      "Qualified redundancy",
      "Supply continuity",
      "Commercial sustainability",
      "Risk governance",
    ]),
    external: true,
  }),
]);

export const publications: readonly ExternalPublicationRecord[] = Object.freeze(
  [...records].sort(
    (left, right) => right.publicationDate.localeCompare(left.publicationDate) || left.title.localeCompare(right.title),
  ),
);

export { novapharmOrganisation };
