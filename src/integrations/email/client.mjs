import { createHash } from "node:crypto";
import { all, audit, insertIgnore, nowIso, one, run } from "../../data/database.mjs";
import { isResolvedSecret } from "../../core/secret-value.mjs";
import { GraphClient, hasGraphCredentials } from "../sharepoint/graph-client.mjs";

const maximumAttempts = 8;
const staleDeliveryMs = 5 * 60 * 1000;

function selectedProvider() {
  const requested = String(process.env.EMAIL_PROVIDER || "auto").trim().toLowerCase();
  if (requested === "local-capture") {
    const explicitlyLocal = process.env.LOCAL_PORTAL_MODE === "true" || process.env.BROWSER_VALIDATION_MODE === "true";
    if (!explicitlyLocal || process.env.NODE_ENV === "production") {
      throw new Error("The local email-capture provider is restricted to an explicit non-production validation environment.");
    }
    return requested;
  }
  if (["resend", "microsoft-graph"].includes(requested)) return requested;
  if (isResolvedSecret(process.env.RESEND_API_KEY)) return "resend";
  if (process.env.MICROSOFT_EMAIL_SENDER && hasGraphCredentials()) return "microsoft-graph";
  return "none";
}

function configured() {
  return Boolean(selectedProvider() !== "none" && process.env.EMAIL_FROM && process.env.CONTACT_NOTIFICATION_TO);
}

function cleanHeader(value) {
  return String(value || "").replace(/[\r\n]/g, " ").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function brandedEmail(content) {
  return `<div style="margin:0;padding:24px;background:#f6f7f8;color:#263544;font-family:Arial,sans-serif"><div style="max-width:680px;margin:0 auto;padding:28px;background:#ffffff"><img src="https://novapharmhealthcare.com/assets/brand/novapharm-healthcare-logo.png" alt="NovaPharm Healthcare" width="320" height="40" style="display:block;width:320px;max-width:100%;height:auto;margin:0 0 28px">${content}</div></div>`;
}

function wrapBase64(value) {
  return Buffer.from(String(value || ""), "utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n") || "";
}

function graphMimeMessage(notification, message, sender) {
  const boundary = `novapharm-${notification.id.slice(0, 24)}`;
  const subject = Buffer.from(cleanHeader(message.subject), "utf8").toString("base64");
  return Buffer.from([
    `From: NovaPharm Healthcare <${sender}>`,
    `To: ${cleanHeader(message.to)}`,
    ...(message.replyTo ? [`Reply-To: ${cleanHeader(message.replyTo)}`] : []),
    `Subject: =?UTF-8?B?${subject}?=`,
    "MIME-Version: 1.0",
    `X-NovaPharm-Notification-Id: ${notification.id}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(message.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(message.html),
    `--${boundary}--`,
    ""
  ].join("\r\n"), "utf8").toString("base64");
}

function retryable(error) {
  const status = Number(error?.providerStatus || 0);
  return !status || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function providerErrorCode(error) {
  const status = Number(error?.providerStatus || 0);
  const provider = selectedProvider();
  const prefix = provider === "microsoft-graph" ? "GRAPH" : provider === "local-capture" ? "LOCAL_CAPTURE" : "RESEND";
  if (status) return `${prefix}_HTTP_${status}`;
  if (error?.name === "TimeoutError") return `${prefix}_TIMEOUT`;
  return `${prefix}_UNAVAILABLE`;
}

function retryAt(attemptCount) {
  const delayMinutes = Math.min(60, 2 ** Math.max(0, attemptCount - 1));
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

async function deliverNotification(notification, message) {
  const now = nowIso();
  const staleBefore = new Date(Date.now() - staleDeliveryMs).toISOString();
  const claim = await run(`UPDATE notifications SET status = 'sending', last_attempt_at = ?
    WHERE id = ? AND (status IN ('pending', 'retrying') OR (status = 'sending' AND last_attempt_at <= ?))`, now, notification.id, staleBefore);
  if (!claim.changes) return { status: "skipped" };
  const attemptCount = Number(notification.attempt_count || 0) + 1;
  try {
    const provider = selectedProvider();
    const providerPayload = provider === "microsoft-graph"
      ? await deliverWithMicrosoftGraph(notification, message)
      : provider === "local-capture"
        ? await deliverWithLocalCapture(notification)
        : await deliverWithResend(notification, message);
    await run(`UPDATE notifications SET status = 'sent', attempt_count = ?, sent_at = ?, next_attempt_at = NULL,
      last_error_code = NULL, provider_message_id = ? WHERE id = ?`, attemptCount, nowIso(), cleanHeader(providerPayload.id || "").slice(0, 128) || null, notification.id);
    return { status: "sent" };
  } catch (error) {
    const shouldRetry = retryable(error) && attemptCount < maximumAttempts;
    await run(`UPDATE notifications SET status = ?, attempt_count = ?, next_attempt_at = ?, last_error_code = ?,
      payload_json = ? WHERE id = ?`, shouldRetry ? "retrying" : "blocked", attemptCount,
    shouldRetry ? retryAt(attemptCount) : null, providerErrorCode(error),
    JSON.stringify(selectedProvider() === "local-capture"
      ? { message, providerStatus: Number(error.providerStatus || 0) || null, localCapture: { synthetic: true } }
      : { providerStatus: Number(error.providerStatus || 0) || null }), notification.id);
    throw error;
  }
}

async function deliverWithLocalCapture(notification) {
  return { id: `local-capture/${notification.id}` };
}

async function deliverWithResend(notification, message) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `novapharm/${notification.id}`
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [cleanHeader(message.to)],
      subject: cleanHeader(message.subject),
      text: message.text,
      html: message.html,
      ...(message.replyTo ? { reply_to: cleanHeader(message.replyTo) } : {})
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw Object.assign(new Error("Email provider rejected the notification."), { providerStatus: response.status });
  return response.json().catch(() => ({}));
}

let graphClient;

async function deliverWithMicrosoftGraph(notification, message) {
  graphClient ||= new GraphClient();
  const sender = cleanHeader(process.env.MICROSOFT_EMAIL_SENDER);
  if (!sender) throw Object.assign(new Error("Microsoft Graph email sender is not configured."), { providerStatus: 400 });
  await graphClient.request(`/users/${encodeURIComponent(sender)}/sendMail`, {
    method: "POST",
    responseType: "none",
    headers: { "Content-Type": "text/plain" },
    body: graphMimeMessage(notification, message, sender)
  });
  return {};
}

async function queueEmail({ to, subject, text, html, replyTo, templateCode, entityType, entityId }) {
  const notificationId = createHash("sha256").update(`${entityType}:${entityId}:${templateCode}`).digest("hex");
  const recipient = cleanHeader(to);
  const createdAt = nowIso();
  const inserted = await insertIgnore("notifications", {
    id: notificationId,
    channel: "email",
    recipient,
    template_code: templateCode,
    entity_type: entityType,
    entity_id: entityId,
    status: "pending",
    payload_json: selectedProvider() === "local-capture"
      ? JSON.stringify({ message: { to: recipient, subject, text, html, replyTo: replyTo || null }, localCapture: { synthetic: true } })
      : "{}",
    attempt_count: 0,
    next_attempt_at: createdAt,
    created_at: createdAt
  }, ["id"]);
  const notification = inserted.changes
    ? { id: notificationId, status: "pending", attempt_count: 0 }
    : await one("SELECT id, status, attempt_count FROM notifications WHERE id = ?", notificationId);
  if (notification?.status === "sent") return { status: "sent" };
  if (notification?.status === "blocked") throw Object.assign(new Error("Email notification requires administrator review."), { providerStatus: "blocked" });
  return deliverNotification(notification, { to: recipient, subject, text, html, replyTo });
}

function leadMessage(lead, templateCode) {
  if (!lead) return null;
  const telephone = lead.telephone || "Not provided";
  if (templateCode === "contact_internal") {
    const text = [
      `New ${lead.enquiry_type} enquiry`,
      `Reference: ${lead.lead_number}`,
      `Name: ${lead.name}`,
      `Role: ${lead.role_title}`,
      `Company: ${lead.company}`,
      `Country: ${lead.country}`,
      `Email: ${lead.email}`,
      `Telephone: ${telephone}`,
      "",
      lead.message
    ].join("\n");
    return {
      to: process.env.CONTACT_NOTIFICATION_TO,
      subject: `NovaPharm enquiry ${lead.lead_number}: ${lead.enquiry_type}`,
      text,
      html: brandedEmail(`<h1>New ${escapeHtml(lead.enquiry_type)} enquiry</h1><dl><dt>Reference</dt><dd>${escapeHtml(lead.lead_number)}</dd><dt>Name</dt><dd>${escapeHtml(lead.name)}</dd><dt>Role</dt><dd>${escapeHtml(lead.role_title)}</dd><dt>Company</dt><dd>${escapeHtml(lead.company)}</dd><dt>Country</dt><dd>${escapeHtml(lead.country)}</dd><dt>Email</dt><dd>${escapeHtml(lead.email)}</dd><dt>Telephone</dt><dd>${escapeHtml(telephone)}</dd></dl><h2>Message</h2><p>${escapeHtml(lead.message).replaceAll("\n", "<br>")}</p>`),
      replyTo: lead.email
    };
  }
  if (templateCode === "contact_acknowledgement") {
    return {
      to: lead.email,
      subject: `NovaPharm Healthcare enquiry ${lead.lead_number}`,
      text: `Hello ${lead.name},\n\nThank you for contacting NovaPharm Healthcare. We have securely recorded your ${lead.enquiry_type.toLowerCase()} enquiry.\n\nReference: ${lead.lead_number}\n\nOur team will review the information supplied. Please do not reply with patient-identifiable information, adverse-event reports or urgent medical information.\n\nNovaPharm Healthcare`,
      html: brandedEmail(`<p>Hello ${escapeHtml(lead.name)},</p><p>Thank you for contacting NovaPharm Healthcare. We have securely recorded your ${escapeHtml(lead.enquiry_type.toLowerCase())} enquiry.</p><p><strong>Reference:</strong> ${escapeHtml(lead.lead_number)}</p><p>Our team will review the information supplied. Please do not reply with patient-identifiable information, adverse-event reports or urgent medical information.</p><p>NovaPharm Healthcare</p>`)
    };
  }
  return null;
}

function applicationMessage(application, templateCode) {
  if (templateCode === "account_application_internal") {
    return {
      to: process.env.CONTACT_NOTIFICATION_TO,
      subject: `NovaPharm account application: ${application.application_number}`,
      text: `A business account application has been submitted.\n\nApplication: ${application.application_number}\nCompany: ${application.company_name}\nCustomer type: ${application.customer_type}\nApplicant email: ${application.submitted_by_email}\n\nReview the application in the controlled administrator workflow.`,
      html: brandedEmail(`<h1>Business account application</h1><dl><dt>Application</dt><dd>${escapeHtml(application.application_number)}</dd><dt>Company</dt><dd>${escapeHtml(application.company_name)}</dd><dt>Customer type</dt><dd>${escapeHtml(application.customer_type)}</dd><dt>Applicant email</dt><dd>${escapeHtml(application.submitted_by_email)}</dd></dl><p>Review the application in the controlled administrator workflow.</p>`),
      replyTo: application.submitted_by_email
    };
  }
  if (templateCode === "account_application_acknowledgement") {
    return {
      to: application.submitted_by_email,
      subject: `NovaPharm account application ${application.application_number}`,
      text: `NovaPharm Healthcare has received the business account application for ${application.company_name}.\n\nReference: ${application.application_number}\n\nSubmission does not create or activate an account. NovaPharm will complete its controlled review before any portal invitation or commercial activity.\n\nNovaPharm Healthcare`,
      html: brandedEmail(`<p>NovaPharm Healthcare has received the business account application for ${escapeHtml(application.company_name)}.</p><p><strong>Reference:</strong> ${escapeHtml(application.application_number)}</p><p>Submission does not create or activate an account. NovaPharm will complete its controlled review before any portal invitation or commercial activity.</p><p>NovaPharm Healthcare</p>`)
    };
  }
  return null;
}

async function retryMessage(notification) {
  if (notification.entity_type === "lead") {
    const lead = await one(`SELECT l.id, l.lead_number, l.name, l.email, l.company, l.enquiry_type, l.message,
      d.role_title, d.country, d.telephone FROM leads l JOIN lead_details d ON d.lead_id = l.id WHERE l.id = ?`, notification.entity_id);
    return leadMessage(lead, notification.template_code);
  }
  if (notification.entity_type === "account_application") {
    const row = await one("SELECT id, application_number, company_json, submitted_by_email FROM account_applications WHERE id = ?", notification.entity_id);
    if (!row) return null;
    const company = JSON.parse(row.company_json);
    return applicationMessage({ ...row, company_name: company.legalName, customer_type: company.customerType }, notification.template_code);
  }
  return null;
}

async function refreshLeadDeliveryState(leadId) {
  if (!leadId) return;
  const states = await all(`SELECT status, COUNT(*) AS count FROM notifications
    WHERE entity_type = 'lead' AND entity_id = ? AND channel = 'email' GROUP BY status`, leadId);
  const stateNames = new Set(states.map((entry) => entry.status));
  const deliveryState = stateNames.has("blocked")
    ? "blocked"
    : stateNames.size === 1 && stateNames.has("sent")
      ? "sent"
      : stateNames.has("retrying") || stateNames.has("pending") || stateNames.has("sending")
        ? "retrying"
        : "queued";
  await run("UPDATE leads SET delivery_state = ?, updated_at = ? WHERE id = ?", deliveryState, nowIso(), leadId);
}

export function emailIntegrationStatus() {
  return configured() ? `configured:${selectedProvider()}` : "credentials_required";
}

export async function emailQueueStatus() {
  return {
    integration: emailIntegrationStatus(),
    states: await all(`SELECT status, COUNT(*) AS count, MAX(created_at) AS latest_notification
      FROM notifications WHERE channel = 'email' GROUP BY status ORDER BY status`),
    deliveries: await all(`SELECT id, template_code, entity_type, entity_id, status, attempt_count,
      last_error_code, created_at, sent_at FROM notifications WHERE channel = 'email'
      ORDER BY created_at DESC LIMIT 50`)
  };
}

export async function emailNotificationPreview(notificationId) {
  const notification = await one(`SELECT id, recipient, template_code, entity_type, entity_id, status,
    payload_json, attempt_count, last_error_code, created_at, sent_at
    FROM notifications WHERE id = ? AND channel = 'email'`, notificationId);
  if (!notification) throw Object.assign(new Error("Email notification not found."), { statusCode: 404 });
  let payload = {};
  try { payload = JSON.parse(notification.payload_json || "{}"); } catch { payload = {}; }
  const message = payload.message || await retryMessage(notification);
  if (!message) throw Object.assign(new Error("Email notification preview is unavailable."), { statusCode: 409 });
  return {
    id: notification.id,
    templateCode: notification.template_code,
    entityType: notification.entity_type,
    entityId: notification.entity_id,
    status: notification.status,
    attemptCount: Number(notification.attempt_count || 0),
    lastErrorCode: notification.last_error_code,
    createdAt: notification.created_at,
    sentAt: notification.sent_at,
    localCapture: selectedProvider() === "local-capture",
    message: {
      to: cleanHeader(message.to || notification.recipient),
      subject: cleanHeader(message.subject),
      text: String(message.text || ""),
      html: String(message.html || ""),
      replyTo: cleanHeader(message.replyTo || "") || null
    }
  };
}

export async function sendLeadNotifications(lead) {
  if (!configured() || !lead) {
    if (lead?.id) await run("UPDATE leads SET delivery_state = 'credentials_required', updated_at = ? WHERE id = ?", nowIso(), lead.id);
    return { status: "credentials_required" };
  }
  const deliveries = await Promise.allSettled(["contact_internal", "contact_acknowledgement"].map((templateCode) => {
    const message = leadMessage(lead, templateCode);
    return queueEmail({ ...message, templateCode, entityType: "lead", entityId: lead.id });
  }));
  const failure = deliveries.find((delivery) => delivery.status === "rejected");
  if (failure) {
    const blocked = await one(`SELECT COUNT(*) AS count FROM notifications
      WHERE entity_type = 'lead' AND entity_id = ? AND status = 'blocked'`, lead.id);
    await run("UPDATE leads SET delivery_state = ?, updated_at = ? WHERE id = ?", Number(blocked?.count || 0) ? "blocked" : "retrying", nowIso(), lead.id);
    throw failure.reason;
  }
  await run("UPDATE leads SET delivery_state = 'sent', updated_at = ? WHERE id = ?", nowIso(), lead.id);
  return { status: "sent", deliveries: deliveries.length };
}

export async function sendApplicationNotifications(application) {
  if (!configured() || !application) return { status: "credentials_required" };
  const deliveries = await Promise.allSettled(["account_application_internal", "account_application_acknowledgement"].map((templateCode) => {
    const message = applicationMessage(application, templateCode);
    return queueEmail({ ...message, templateCode, entityType: "account_application", entityId: application.id });
  }));
  const failure = deliveries.find((delivery) => delivery.status === "rejected");
  if (failure) throw failure.reason;
  return { status: "sent", deliveries: deliveries.length };
}

let retryWorkerActive = false;

export async function processEmailRetries({ limit = 20 } = {}) {
  if (!configured()) return { status: "credentials_required", processed: 0, sent: 0, retrying: 0, blocked: 0 };
  if (retryWorkerActive) return { status: "busy", processed: 0, sent: 0, retrying: 0, blocked: 0 };
  retryWorkerActive = true;
  try {
    const now = nowIso();
    const staleBefore = new Date(Date.now() - staleDeliveryMs).toISOString();
    const notifications = await all(`SELECT id, template_code, entity_type, entity_id, status, attempt_count
      FROM notifications WHERE channel = 'email' AND attempt_count < ? AND
      ((status IN ('pending', 'retrying') AND (next_attempt_at IS NULL OR next_attempt_at <= ?)) OR
       (status = 'sending' AND last_attempt_at <= ?))
      ORDER BY created_at ASC LIMIT ?`, maximumAttempts, now, staleBefore, Math.max(1, Math.min(Number(limit) || 20, 100)));
    const result = { status: "processed", processed: 0, sent: 0, retrying: 0, blocked: 0 };
    for (const notification of notifications) {
      const message = await retryMessage(notification);
      if (!message) {
        await run("UPDATE notifications SET status = 'blocked', next_attempt_at = NULL, last_error_code = 'EMAIL_CONTEXT_UNAVAILABLE' WHERE id = ?", notification.id);
        result.blocked += 1;
        result.processed += 1;
        continue;
      }
      try {
        const delivery = await deliverNotification(notification, message);
        if (delivery.status === "sent") result.sent += 1;
      } catch {
        const current = await one("SELECT status FROM notifications WHERE id = ?", notification.id);
        if (current?.status === "retrying") result.retrying += 1;
        else result.blocked += 1;
      }
      if (notification.entity_type === "lead") await refreshLeadDeliveryState(notification.entity_id);
      result.processed += 1;
    }
    return result;
  } finally {
    retryWorkerActive = false;
  }
}

export async function replayEmailNotification(notificationId, actor) {
  const notification = await one(`SELECT id, template_code, entity_type, entity_id, status, attempt_count
    FROM notifications WHERE id = ? AND channel = 'email'`, notificationId);
  if (!notification) throw Object.assign(new Error("Email notification not found."), { statusCode: 404 });
  if (notification.status === "sent") return { status: "sent", replayed: false };
  if (!configured()) throw Object.assign(new Error("Transactional email is not configured."), { statusCode: 503 });
  const message = await retryMessage(notification);
  if (!message) throw Object.assign(new Error("Email notification context is unavailable."), { statusCode: 409 });
  await run(`UPDATE notifications SET status = 'pending', attempt_count = 0, next_attempt_at = ?,
    last_error_code = NULL WHERE id = ?`, nowIso(), notification.id);
  await audit({ actor, action: "notification.replay_requested", entityType: "notification", entityId: notification.id, details: { templateCode: notification.template_code } });
  const result = await deliverNotification({ ...notification, status: "pending", attempt_count: 0 }, message);
  if (notification.entity_type === "lead") await refreshLeadDeliveryState(notification.entity_id);
  return { ...result, replayed: true };
}
