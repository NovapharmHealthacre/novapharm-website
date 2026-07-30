import capabilitiesManifest from "../../../config/platform-modes.json" with { type: "json" };

export type PlatformMode = keyof typeof capabilitiesManifest;
export type PlatformCapabilities = Readonly<(typeof capabilitiesManifest)[PlatformMode]>;

export const platformModes = Object.freeze(Object.fromEntries(
  Object.keys(capabilitiesManifest).map((mode) => [mode, mode])
)) as Readonly<Record<PlatformMode, PlatformMode>>;

export function isPlatformMode(value: string): value is PlatformMode {
  return Object.hasOwn(capabilitiesManifest, value);
}

export function resolvePlatformMode(value: string | undefined): PlatformMode {
  const mode = String(value || platformModes.PUBLIC_ONLY).trim().toUpperCase();
  if (!isPlatformMode(mode)) throw new Error(`Unsupported PLATFORM_MODE: ${mode || "<empty>"}`);
  return mode;
}

export function capabilitiesFor(mode: PlatformMode): PlatformCapabilities {
  return Object.freeze({ ...capabilitiesManifest[mode] });
}
