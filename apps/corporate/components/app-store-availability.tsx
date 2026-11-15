import { AppleAppStoreBadges, isValidAppStoreListing, type AppleStoreListing } from "@novapharm/design-system";

/**
 * The site never advertises native Apple availability merely because NovaPharm
 * operates web portals. Publication requires a verified store listing and
 * official badge artwork already deployed at the shared, immutable paths.
 */
export function AppStoreAvailability() {
  if (process.env.NOVAPHARM_APP_STORE_PUBLISHED !== "true") return null;
  // Separate attestation: neither ZIP provenance nor production asset availability is implicit.
  if (process.env.NOVAPHARM_APP_STORE_ASSETS_VERIFIED !== "true") return null;

  const appName = process.env.NOVAPHARM_APP_STORE_DISPLAY_NAME?.trim();
  if (!appName) return null;

  const listings: AppleStoreListing[] = [];
  const iosUrl = process.env.NOVAPHARM_IOS_APP_STORE_URL;
  const macUrl = process.env.NOVAPHARM_MAC_APP_STORE_URL;
  if (iosUrl) listings.push({ platform: "ios", appName, url: iosUrl });
  if (macUrl) listings.push({ platform: "mac", appName, url: macUrl });

  const verifiedUrls = listings.filter(isValidAppStoreListing);
  if (verifiedUrls.length === 0) return null;

  return (
    <div className="np-app-store-availability">
      <AppleAppStoreBadges listings={verifiedUrls} approvedForPublication />
      <small className="np-app-store-availability__legal">
        Apple and the Apple logo are trademarks of Apple Inc., registered in the U.S. and other countries. App Store is a service mark of Apple Inc.
      </small>
    </div>
  );
}
