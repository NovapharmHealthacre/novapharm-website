import React from "react";

/**
 * Reusable Apple App Store marketing badges (not generic native-app buttons).
 * Source: https://developer.apple.com/app-store/marketing/guidelines/
 * Keep the original official black badge artwork byte-for-byte unchanged.
 */
export type AppleStorePlatform = "ios" | "mac";
export type AppleStoreListing = Readonly<{
  platform: AppleStorePlatform;
  appName: string;
  url: string;
}>;

export const APP_STORE_BLACK_BADGE_ASSETS: Readonly<Record<AppleStorePlatform, string>> = Object.freeze({
  ios: "/assets/marketing/apple/app-store-black.svg",
  mac: "/assets/marketing/apple/mac-app-store-black.svg",
});

export function isValidAppStoreListing(listing: AppleStoreListing): boolean {
  if (listing.platform !== "ios" && listing.platform !== "mac") return false;
  if (!listing.appName.trim()) return false;
  try {
    const url = new URL(listing.url);
    return url.protocol === "https:"
      && url.hostname === "apps.apple.com"
      && !url.username
      && !url.password
      && !url.port
      && !url.hash
      && /^\/(?:[a-z]{2}\/)?app\/(?:[^/?#]+\/)?id[0-9]+\/?$/iu.test(url.pathname);
  } catch {
    return false;
  }
}

export function AppleAppStoreBadges({
  listings,
  approvedForPublication = false,
}: Readonly<{
  listings: readonly AppleStoreListing[];
  /** Set true only after the actual listings and unchanged Apple art are verified. */
  approvedForPublication?: boolean;
}>) {
  if (!approvedForPublication) return null;

  const unique = new Map<AppleStorePlatform, AppleStoreListing>();
  for (const listing of listings) {
    if (isValidAppStoreListing(listing) && !unique.has(listing.platform)) {
      unique.set(listing.platform, listing);
    }
  }

  const ordered = (["ios", "mac"] as const)
    .map(platform => unique.get(platform))
    .filter((listing): listing is AppleStoreListing => Boolean(listing));
  if (ordered.length === 0) return null;

  return (
    <nav className="np-app-store-badges" aria-label="App downloads">
      {ordered.map(listing => (
        <a
          className="np-app-store-badges__link"
          key={listing.platform}
          href={listing.url}
          aria-label={"Download " + listing.appName + (listing.platform === "ios" ? " on the App Store" : " on the Mac App Store")}
        >
          <img
            className="np-app-store-badges__artwork"
            src={APP_STORE_BLACK_BADGE_ASSETS[listing.platform]}
            alt=""
            aria-hidden="true"
          />
        </a>
      ))}
    </nav>
  );
}
