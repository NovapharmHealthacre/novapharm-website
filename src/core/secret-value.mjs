export function isUnresolvedSecretReference(value) {
  return /^@Microsoft\.KeyVault\(/i.test(String(value || "").trim());
}

export function isResolvedSecret(value, { minimumBytes = 1 } = {}) {
  const candidate = String(value || "");
  return !isUnresolvedSecretReference(candidate) && Buffer.byteLength(candidate, "utf8") >= minimumBytes;
}
