export const platformModes = Object.freeze({
  PUBLIC_ONLY: "PUBLIC_ONLY",
  FULL_PLATFORM: "FULL_PLATFORM",
  MAINTENANCE: "MAINTENANCE",
  INCIDENT: "INCIDENT"
});

const capabilitiesByMode = Object.freeze({
  [platformModes.PUBLIC_ONLY]: Object.freeze({
    publicContent: true,
    publicForms: false,
    accountApplication: false,
    portal: false,
    secureApi: false
  }),
  [platformModes.FULL_PLATFORM]: Object.freeze({
    publicContent: true,
    publicForms: true,
    accountApplication: true,
    portal: true,
    secureApi: true
  }),
  [platformModes.MAINTENANCE]: Object.freeze({
    publicContent: true,
    publicForms: false,
    accountApplication: false,
    portal: false,
    secureApi: false
  }),
  [platformModes.INCIDENT]: Object.freeze({
    publicContent: true,
    publicForms: false,
    accountApplication: false,
    portal: false,
    secureApi: false
  })
});

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
