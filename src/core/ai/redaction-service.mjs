const secretPatterns = Object.freeze([
  /\b(?:password|passwd|secret|api[_-]?key|client[_-]?secret|session[_-]?secret|token)\s*[:=]\s*[^\s,;]+/gi,
  /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
  /\b(?:AccountKey|SharedAccessSignature|Database Password)=[^;\s]+/gi,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g
]);

export function redactSecrets(value) {
  let text = String(value ?? "");
  for (const pattern of secretPatterns) text = text.replace(pattern, "[REDACTED SECRET]");
  return text;
}

export function normaliseAuthorisedRecord(record, index = 0) {
  const sourceType = String(record?.sourceType || "").trim();
  return {
    id: String(record?.id || `record-${index + 1}`).slice(0, 160),
    title: String(record?.title || `Authorised record ${index + 1}`).slice(0, 240),
    url: /^https?:\/\//i.test(String(record?.url || "")) ? String(record.url).slice(0, 2048) : null,
    sourceType: sourceType.slice(0, 120),
    text: redactSecrets(String(record?.text || "")).slice(0, 50000),
    documentType: String(record?.documentType || "").slice(0, 120),
    version: String(record?.version || "").slice(0, 80),
    expiresAt: String(record?.expiresAt || "").slice(0, 40)
  };
}

export function safeProviderText(value) {
  return redactSecrets(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").slice(0, 20000);
}
