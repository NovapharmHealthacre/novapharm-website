import { timingSafeEqual } from "node:crypto";

function constantTimeTextEqual(suppliedValue, expectedValue) {
  const supplied = Buffer.from(String(suppliedValue), "utf8");
  const expected = Buffer.from(String(expectedValue), "utf8");
  const length = Math.max(supplied.length, expected.length, 1);
  const suppliedPadded = Buffer.alloc(length);
  const expectedPadded = Buffer.alloc(length);
  supplied.copy(suppliedPadded);
  expected.copy(expectedPadded);
  return supplied.length === expected.length && timingSafeEqual(suppliedPadded, expectedPadded);
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
  if (decoded.length > 4096) return false;
  const separator = decoded.indexOf(":");
  if (separator < 1) return false;
  return constantTimeTextEqual(decoded.slice(0, separator), expectedUsername)
    && constantTimeTextEqual(decoded.slice(separator + 1), expectedPassword);
}
