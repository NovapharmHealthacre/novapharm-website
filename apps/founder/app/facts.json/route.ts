import {
  founderContact,
  founderOrigin,
  founderProfile,
  founderProfileId,
  novapharmOrganisation,
  profileReviewedOn,
  publications,
  vishal,
} from "@/lib/site-data";

export const dynamic = "force-static";

const facts = Object.freeze([
  Object.freeze({
    id: "P-002",
    label: "Current role",
    value: "Chief Executive Officer, NovaPharm Healthcare Ltd",
    status: "OWNER_ATTESTED_CURRENT",
    lastVerified: profileReviewedOn,
  }),
  Object.freeze({
    id: "P-017",
    label: "Founder relationship",
    value: "Founder of NovaPharm Healthcare Ltd",
    status: "OWNER_ATTESTED_CURRENT",
    lastVerified: profileReviewedOn,
  }),
  Object.freeze({
    id: "C-002",
    label: "Company number",
    value: novapharmOrganisation.companyNumber,
    status: "VERIFIED_CURRENT",
    lastVerified: profileReviewedOn,
  }),
  Object.freeze({
    id: "C-004",
    label: "Incorporated",
    value: novapharmOrganisation.incorporatedOn,
    status: "VERIFIED_CURRENT",
    lastVerified: profileReviewedOn,
  }),
]);

export function GET(): Response {
  return Response.json(
    {
      schemaVersion: 3,
      canonical: `${founderOrigin}/facts/`,
      lastReviewed: profileReviewedOn,
      entityIds: {
        person: vishal.id,
        personalWebsite: `${founderOrigin}/#website`,
        profilePage: founderProfileId,
        organization: novapharmOrganisation.id,
        organizationWebsite: novapharmOrganisation.websiteId,
      },
      person: {
        name: vishal.displayName,
        role: `${vishal.publicTitle}, NovaPharm Healthcare Ltd`,
        founderRelationship: "Founder of NovaPharm Healthcare Ltd",
        proposition: founderProfile.proposition,
        canonicalUrl: vishal.canonicalUrl,
        image: vishal.canonicalImageUrl,
        sameAs: vishal.sameAs,
      },
      company: {
        name: novapharmOrganisation.publicName,
        legalName: novapharmOrganisation.legalName,
        companyNumber: novapharmOrganisation.companyNumber,
        incorporated: novapharmOrganisation.incorporatedOn,
        operatingStatus: novapharmOrganisation.operatingStatus,
        officialUrl: novapharmOrganisation.website,
      },
      publications,
      facts,
      correctionContact: founderContact.email,
    },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
