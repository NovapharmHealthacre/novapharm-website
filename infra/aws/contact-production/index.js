"use strict";
const { randomUUID, createHash } = require("node:crypto");
const { DynamoDBClient, PutItemCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const region = process.env.AWS_REGION || "eu-north-1";
const ddb = new DynamoDBClient({ region });
const sns = new SNSClient({ region });
const allowedOrigins = new Set(["https://novapharmhealthcare.com", "https://www.novapharmhealthcare.com"]);
const topics = new Set([
  "Product opportunity", "Distribution partnership", "Pharmacy or wholesaler account",
  "CMO/CDMO partnership", "Regulatory services", "Clinical development & CRO support",
  "Oncology & specialist medicines", "Supplier enquiry", "Media", "Careers", "General enquiry"
]);
const allowedKeys = new Set([
  "name", "email", "company", "role", "country", "telephone", "enquiryType", "message",
  "website", "safetyConfirmation", "privacyAcknowledgement"
]);
const noCache = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };
function response(code, value, origin) {
  return {
    statusCode: code,
    headers: { ...noCache, ...(allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}) },
    body: JSON.stringify(value)
  };
}
function text(value, max, min = 1) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max
    && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value);
}
function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  if (Object.keys(body).some(key => !allowedKeys.has(key))) return false;
  if (body.website) return false;
  if (!text(body.name, 120) || !text(body.email, 160) || !text(body.company, 160)) return false;
  if (!text(body.role, 120) || !text(body.country, 80) || !text(body.message, 2000, 20)) return false;
  if (body.telephone && !text(body.telephone, 40)) return false;
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/i.test(body.email.trim())) return false;
  if (!topics.has(body.enquiryType)) return false;
  if (body.safetyConfirmation !== "yes" || body.privacyAcknowledgement !== "yes") return false;
  return true;
}
exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || "";
  const path = event.rawPath || event.path || "";
  const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const origin = headers.origin || "";
  if (method === "GET" && path === "/health") {
    return response(200, { service: "novapharm-contact-intake", ready: true, environment: "production" }, origin);
  }
  if (method !== "POST" || path !== "/contact") return response(404, { error: "Not found" }, origin);
  if (!allowedOrigins.has(origin)) return response(403, { error: "Origin not permitted" });
  if (headers["x-novapharm-intake"] !== "v1") return response(403, { error: "Form request required" }, origin);
  if (!/^application\/json(?:;|$)/i.test(headers["content-type"] || "")) return response(415, { error: "JSON content required" }, origin);

  let raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : String(event.body || "");
  if (Buffer.byteLength(raw, "utf8") > 6500) return response(413, { error: "Message too large" }, origin);
  let body;
  try { body = JSON.parse(raw); } catch { return response(400, { error: "Invalid request" }, origin); }
  if (!validate(body)) return response(422, { error: "Please check the business enquiry fields and required confirmations" }, origin);

  const sourceIp = event.requestContext?.http?.sourceIp;
  if (!sourceIp || !process.env.INTAKE_RATE_SALT || !process.env.TABLE_NAME || !process.env.NOTIFICATION_TOPIC_ARN) {
    return response(503, { error: "Secure enquiry service temporarily unavailable" }, origin);
  }
  const now = Date.now();
  const windowId = Math.floor(now / 600000);
  const rateId = "RATE#" + createHash("sha256").update(process.env.INTAKE_RATE_SALT + ":" + sourceIp + ":" + windowId).digest("hex");
  try {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id: { S: rateId } },
      UpdateExpression: "SET #n = if_not_exists(#n, :zero) + :one, expiresAt = :ttl",
      ConditionExpression: "attribute_not_exists(#n) OR #n < :limit",
      ExpressionAttributeNames: { "#n": "requestCount" },
      ExpressionAttributeValues: {
        ":zero": { N: "0" }, ":one": { N: "1" }, ":limit": { N: "4" },
        ":ttl": { N: String(Math.floor(now / 1000) + 1200) }
      }
    }));
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return response(429, { error: "Too many requests. Please try again later." }, origin);
    }
    return response(503, { error: "Secure enquiry service temporarily unavailable" }, origin);
  }

  const id = randomUUID();
  const createdAt = new Date(now).toISOString();
  const clean = value => value.trim();
  try {
    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        id: { S: id },
        classification: { S: "B2B_BUSINESS_ENQUIRY" },
        name: { S: clean(body.name) },
        email: { S: clean(body.email).toLowerCase() },
        company: { S: clean(body.company) },
        role: { S: clean(body.role) },
        country: { S: clean(body.country) },
        telephone: { S: clean(body.telephone || "") },
        enquiryType: { S: body.enquiryType },
        message: { S: clean(body.message) },
        createdAt: { S: createdAt },
        expiresAt: { N: String(Math.floor(now / 1000) + 30 * 86400) },
        privacyAcknowledgedAt: { S: createdAt },
        safetyConfirmedAt: { S: createdAt },
        notificationStatus: { S: "PENDING" }
      },
      ConditionExpression: "attribute_not_exists(id)"
    }));
  } catch {
    return response(503, { error: "Enquiry could not be recorded. Please try again." }, origin);
  }

  let notificationAccepted = false;
  try {
    const publish = await sns.send(new PublishCommand({
      TopicArn: process.env.NOTIFICATION_TOPIC_ARN,
      Subject: "NovaPharm new B2B enquiry",
      Message: "NovaPharm received a B2B enquiry.\nReference: " + id + "\nTopic: " +
        body.enquiryType + "\nRecorded UTC: " + createdAt +
        "\nReview the private AWS contact inbox. This notification contains no sender details."
    }));
    notificationAccepted = Boolean(publish.MessageId);
    if (notificationAccepted) {
      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: { S: id } },
        UpdateExpression: "SET notificationStatus = :sent, notificationAcceptedAt = :time",
        ExpressionAttributeValues: { ":sent": { S: "SNS_ACCEPTED" }, ":time": { S: new Date().toISOString() } }
      }));
    }
  } catch {
    // A stored enquiry is never represented as lost just because notification failed.
    // The durable PENDING state is available for operator reconciliation.
  }
  return response(201, {
    ok: true,
    receiptId: id,
    persisted: true,
    notificationAccepted,
    message: "Your business enquiry has been recorded."
  }, origin);
};