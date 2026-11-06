"use strict";
const { randomUUID, timingSafeEqual } = require("node:crypto");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const ddb = new DynamoDBClient({ region: "eu-north-1" });
const topics = new Set(["Product opportunity", "Distribution partnership", "Pharmacy or wholesaler account", "CMO/CDMO partnership", "Regulatory services", "Oncology & specialist medicines", "General enquiry"]);
function reply(statusCode, value) {
  return { statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" }, body: JSON.stringify(value) };
}
function equalsKey(value) {
  const a = Buffer.from(String(process.env.STAGING_TEST_KEY || ""), "utf8");
  const b = Buffer.from(String(value || ""), "utf8");
  return a.length === 64 && b.length === a.length && timingSafeEqual(a, b);
}
function goodText(value, limit) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit && !/[<>]/.test(value);
}
exports.handler = async function handler(event) {
  const method = event.requestContext?.http?.method || event.httpMethod || "";
  const path = event.rawPath || event.path || "";
  const headers = event.headers || {};
  if (method === "GET" && path === "/health") {
    return reply(200, { service: "novapharm-contact-staging", live: false, acceptingPublicSubmissions: false, emailSendingEnabled: false });
  }
  if (method !== "POST" || path !== "/contact") return reply(404, { error: "Not available" });
  if (headers.origin && headers.origin !== "https://novapharmhealthcare.com") return reply(403, { error: "Origin denied" });
  if (!equalsKey(headers["x-novapharm-staging-key"] || headers["X-Novapharm-Staging-Key"])) {
    return reply(403, { error: "Staging only. Public submissions are disabled." });
  }
  if (!/^application\/json(?:;|$)/i.test(String(headers["content-type"] || headers["Content-Type"] || ""))) {
    return reply(415, { error: "JSON only" });
  }
  const body = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : String(event.body || "");
  if (Buffer.byteLength(body) > 4000) return reply(413, { error: "Request too large" });
  let data;
  try { data = JSON.parse(body); } catch { return reply(400, { error: "Invalid JSON" }); }
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length > 10) {
    return reply(422, { error: "Invalid fields" });
  }
  if (data.website || data.honeypot || !goodText(data.name, 100) || !/^SYNTHETIC[- ]/i.test(data.name)) {
    return reply(422, { error: "Synthetic test only" });
  }
  if (!goodText(data.email, 100) || !/^[a-z0-9._%+-]+@example\.(com|org|net)$/i.test(data.email)) {
    return reply(422, { error: "Only example-domain email addresses are accepted" });
  }
  if (data.company !== "NovaPharm QA" || !topics.has(data.enquiryType) || !goodText(data.message, 1000) ||
      !data.message.includes("SYNTHETIC DATA") || data.acceptedSafetyNotice !== true) {
    return reply(422, { error: "Invalid synthetic test content" });
  }
  const id = randomUUID();
  const now = new Date();
  try {
    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        id: { S: id }, name: { S: data.name.trim() }, email: { S: data.email.trim().toLowerCase() },
        company: { S: data.company }, enquiryType: { S: data.enquiryType }, message: { S: data.message.trim() },
        createdAt: { S: now.toISOString() }, expiresAt: { N: String(Math.floor(now.getTime() / 1000) + 86400) },
        classification: { S: "SYNTHETIC_STAGING_ONLY" }
      },
      ConditionExpression: "attribute_not_exists(id)"
    }));
  } catch {
    return reply(503, { error: "Staging persistence unavailable; no receipt issued" });
  }
  return reply(201, { ok: true, lead: { id }, persisted: true, staging: true, notification: "not_enabled", live: false });
};
