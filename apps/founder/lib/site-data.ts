import { novapharmOrganisation, personBySlug } from "@novapharm/content";

export const founderOrigin = "https://vishal.novapharmhealthcare.com";
export const founderWebsiteId = `${founderOrigin}/#website`;
export const founderProfileId = `${founderOrigin}/about/#profile`;
export const profileReviewedOn = "2026-07-30";

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
    "Vishal Chakravarty is Chief Executive Officer of NovaPharm Healthcare Ltd. He founded the UK-registered pharmaceutical company in 2025. His pharmaceutical experience predates NovaPharm, including work with SyriMed between 2020 and 2025. He is building the company around specialist medicines, product and market selection, licensing pathways, manufacturing partnerships, technology transfer, sourcing, supply and commercial market entry. Vishal also contributes analysis to Yakuji Nippo on UK–EU pharmaceutical market access and writes independently about the decisions that shape regulated pharmaceutical businesses.",
  portrait: Object.freeze({
    path: "/images/portrait/vishal-chakravarty-1440.jpg",
    alt: "Portrait of Vishal Chakravarty",
    width: 1440,
    height: 1402,
  }),
});

export interface PublicationRecord {
  readonly title: string;
  readonly subject: string;
  readonly date: string;
  readonly abstract: string;
  readonly english: string;
  readonly japanese: string;
}

export const publications: readonly PublicationRecord[] = Object.freeze([
  Object.freeze({
    date: "2026-02-06",
    title: "UK and EU Pharmaceutical Market Access Pathways After Brexit",
    subject: "Market access after Brexit",
    abstract:
      "An analysis of the separate UK and EU pathways that pharmaceutical companies must connect through product, regulatory and commercial planning.",
    english: "https://www.yakuji.co.jp/entry129529.html",
    japanese: "https://www.yakuji.co.jp/entry129530.html",
  }),
  Object.freeze({
    date: "2026-03-12",
    title: "Regulatory and Compliance Considerations Post-Brexit",
    subject: "Regulatory and compliance strategy",
    abstract:
      "A practical review of the responsibilities, sequencing and compliance questions created by the post-Brexit pharmaceutical environment.",
    english: "https://www.yakuji.co.jp/entry131265.html",
    japanese: "https://www.yakuji.co.jp/entry131266.html",
  }),
  Object.freeze({
    date: "2026-05-12",
    title: "Parallel Import Frameworks and Risk Considerations",
    subject: "Parallel import and supply risk",
    abstract:
      "An explanation of the parallel-import framework and the licensing, quality, supply and commercial risks that sit behind the opportunity.",
    english: "https://www.yakuji.co.jp/entry133526.html",
    japanese: "https://www.yakuji.co.jp/entry133527.html",
  }),
]);

export { novapharmOrganisation };
