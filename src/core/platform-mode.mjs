import capabilitiesByMode from "../../config/platform-modes.json" with { type: "json" };

export const platformModes = Object.freeze(Object.fromEntries(
  Object.keys(capabilitiesByMode).map((mode) => [mode, mode])
));

export function resolvePlatformMode(value = process.env.PLATFORM_MODE || platformModes.PUBLIC_ONLY) {
  const mode = String(value).trim().toUpperCase();
  if (!Object.hasOwn(capabilitiesByMode, mode)) {
    throw new Error(`Unsupported PLATFORM_MODE: ${mode || "<empty>"}`);
  }
  return mode;
}

export function getPlatformCapabilities(mode = resolvePlatformMode()) {
  return capabilitiesByMode[resolvePlatformMode(mode)];
}

export function isFullPlatform(mode = resolvePlatformMode()) {
  return resolvePlatformMode(mode) === platformModes.FULL_PLATFORM;
}
