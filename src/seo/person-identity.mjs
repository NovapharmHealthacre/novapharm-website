// One identity contract across the personal website, NovaPharm corporate pages and articles.
// This is an entity identifier, not a cross-domain canonical tag or an asserted Google panel.
export const VISHAL_PERSON_ID = "https://vishal.novapharmhealthcare.com/#person";
export const VISHAL_PROFILE_URL = "https://vishal.novapharmhealthcare.com/about/";
export const VISHAL_PROFILE_ID = "https://vishal.novapharmhealthcare.com/about/#profile";
export const CORPORATE_ORIGIN = "https://novapharmhealthcare.com";

export function personIdForSlug(slug) {
  if (slug === "vishal-chakravarty") return VISHAL_PERSON_ID;
  return `${CORPORATE_ORIGIN}/leadership/${slug}/#person`;
}

export function personUrlForSlug(slug) {
  return slug === "vishal-chakravarty"
    ? VISHAL_PROFILE_URL
    : `${CORPORATE_ORIGIN}/leadership/${slug}/`;
}
