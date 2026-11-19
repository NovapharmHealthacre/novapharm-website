/*
 * Release-time validation of locally served Apple marketing media.
 * Only regular files inside NovaPharm's real assets directory may be approved.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";

export function resolvePreviewMedia(root, value) {
  if (typeof value !== "string" || !value.startsWith("/assets/")) return null;
  const assetRoot = resolve(root, "assets");
  const candidate = resolve(root, value.slice(1));
  if (!candidate.startsWith(assetRoot + sep) || !existsSync(candidate)) return null;
  try {
    const realRepoRoot = realpathSync(root);
    const realAssetRoot = realpathSync(assetRoot);
    const actual = realpathSync(candidate);
    if (!realAssetRoot.startsWith(realRepoRoot + sep)) return null;
    return actual.startsWith(realAssetRoot + sep) && statSync(actual).isFile() ? actual : null;
  } catch {
    return null;
  }
}

export function sha256OfFile(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}
