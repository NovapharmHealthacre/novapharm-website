/** Offline map URL builder for Android's external map/browser hand-off.
 * No device location, map SDK, API key, network request or patient data.
 * Coordinates are disclosed to the external maps provider only on user action.
 */
export function buildAndroidMapUrl(latitude: number, longitude: number): string {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError("Invalid reference coordinate");
  }
  // Google Maps URLs Search uses api=1 and a comma-separated lat/lon query.
  // Do not attach a free-text label, user identifier or confidential metadata.
  const coordinates = `${latitude},${longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`;
}
