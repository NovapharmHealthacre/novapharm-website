import { novapharmOrganisation, type PersonEntity } from "../../content/src/index.ts";

export interface JsonLdNode {
  readonly [key: string]: unknown;
}

export function organisationNode(): JsonLdNode {
  return Object.freeze({
    "@type": "Organization",
    "@id": novapharmOrganisation.id,
    name: novapharmOrganisation.publicName,
    legalName: novapharmOrganisation.legalName,
    url: novapharmOrganisation.website,
    logo: Object.freeze({
      "@type": "ImageObject",
      "@id": `${novapharmOrganisation.website}/#logo`,
      url: `${novapharmOrganisation.website}/assets/brand/novapharm-healthcare-logo.png`,
      contentUrl: `${novapharmOrganisation.website}/assets/brand/novapharm-healthcare-logo.png`,
      width: 3356,
      height: 420,
      caption: "NovaPharm Healthcare"
    }),
    identifier: Object.freeze({ "@type": "PropertyValue", propertyID: "Companies House", value: novapharmOrganisation.companyNumber }),
    foundingDate: novapharmOrganisation.incorporatedOn
  });
}

export function websiteNode(): JsonLdNode {
  return Object.freeze({
    "@type": "WebSite",
    "@id": novapharmOrganisation.websiteId,
    url: novapharmOrganisation.website,
    name: novapharmOrganisation.publicName,
    publisher: Object.freeze({ "@id": novapharmOrganisation.id }),
    inLanguage: "en-GB"
  });
}

export function personNode(person: PersonEntity): JsonLdNode {
  if (person.titleDecision !== "approved") throw new Error(`Person title is not approved for publication: ${person.slug}`);
  return Object.freeze({
    "@type": "Person",
    "@id": person.id,
    name: person.displayName,
    url: `${novapharmOrganisation.website}/leadership/${person.slug}/`,
    jobTitle: person.publicTitle,
    worksFor: Object.freeze({ "@id": novapharmOrganisation.id }),
    ...(person.imagePath ? { image: new URL(person.imagePath, `${novapharmOrganisation.website}/`).toString() } : {}),
    ...(person.sameAs.length ? { sameAs: [...person.sameAs] } : {})
  });
}

export function canonicalEntityGraph(people: readonly PersonEntity[]): JsonLdNode {
  return Object.freeze({
    "@context": "https://schema.org",
    "@graph": Object.freeze([organisationNode(), websiteNode(), ...people.map(personNode)])
  });
}
