import { createHash, timingSafeEqual } from "node:crypto";

function digest(value) {
  return createHash("sha256").update(String(value), "utf8").digest();
}

export function previewAccessAllowed(authorizationHeader, expectedUsername, expectedPassword) {
  const match = String(authorizationHeader || "").match(/^Basic\s+([A-Za-z0-9+/=]+)$/i);
  if (!match || !expectedUsername || !expectedPassword) return false;
  let decoded;
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 1) return false;
  const suppliedUsername = digest(decoded.slice(0, separator));
  const suppliedPassword = digest(decoded.slice(separator + 1));
  const username = digest(expectedUsername);
  const password = digest(expectedPassword);
  return timingSafeEqual(suppliedUsername, username) && timingSafeEqual(suppliedPassword, password);
}
