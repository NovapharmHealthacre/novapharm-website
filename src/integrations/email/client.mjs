import { createHash } from "node:crypto";
import { all, insertIgnore, nowIso, one, run } from "../../data/database.mjs";
import { isResolvedSecret } from "../../core/secret-value.mjs";

const maximumAttempts = 8;
const staleDeliveryMs = 5 * 60 * 1000;

function configured() {
  return Boolean(isResolvedSecret(process.env.RESEND_API_KEY) && process.env.EMAIL_FROM && process.env.CONTACT_NOTIFICATION_TO);
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

function retryable(error) {
  const status = Number(error?.providerStatus || 0);
  return !status || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function providerErrorCode(error) {
  const status = Number(error?.providerStatus || 0);
  if (status) return `RESEND_HTTP_${status}`;
  if (error?.name === "TimeoutError") return "RESEND_TIMEOUT";
  return "RESEND_UNAVAILABLE";
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
    const providerPayload = await response.json().catch(() => ({}));
    await run(`UPDATE notifications SET status = 'sent', attempt_count = ?, sent_at = ?, next_attempt_at = NULL,
      last_error_code = NULL, provider_message_id = ? WHERE id = ?`, attemptCount, nowIso(), cleanHeader(providerPayload.id || "").slice(0, 128) || null, notification.id);
    return { status: "sent" };
  } catch (error) {
    const shouldRetry = retryable(error) && attemptCount < maximumAttempts;
    await run(`UPDATE notifications SET status = ?, attempt_count = ?, next_attempt_at = ?, last_error_code = ?,
      payload_json = ? WHERE id = ?`, shouldRetry ? "retrying" : "blocked", attemptCount,
    shouldRetry ? retryAt(attemptCount) : null, providerErrorCode(error),
    JSON.stringify({ providerStatus: Number(error.providerStatus || 0) || null }), notification.id);
    throw error;
  }
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
    payload_json: "{}",
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
      subject: `NovaPharm website: ${lead.enquiry_type} from ${lead.company}`,
      text,
      html: brandedEmail(`<h1>New ${escapeHtml(lead.enquiry_type)} enquiry</h1><dl><dt>Name</dt><dd>${escapeHtml(lead.name)}</dd><dt>Role</dt><dd>${escapeHtml(lead.role_title)}</dd><dt>Company</dt><dd>${escapeHtml(lead.company)}</dd><dt>Country</dt><dd>${escapeHtml(lead.country)}</dd><dt>Email</dt><dd>${escapeHtml(lead.email)}</dd><dt>Telephone</dt><dd>${escapeHtml(telephone)}</dd></dl><h2>Message</h2><p>${escapeHtml(lead.message).replaceAll("\n", "<br>")}</p>`),
      replyTo: lead.email
    };
  }
  if (templateCode === "contact_acknowledgement") {
    return {
      to: lead.email,
      subject: "NovaPharm Healthcare has received your enquiry",
      text: `Hello ${lead.name},\n\nThank you for contacting NovaPharm Healthcare. We have securely recorded your ${lead.enquiry_type.toLowerCase()} enquiry and will review it.\n\nPlease do not reply with patient-identifiable information, adverse-event reports or urgent medical information.\n\nNovaPharm Healthcare`,
      html: brandedEmail(`<p>Hello ${escapeHtml(lead.name)},</p><p>Thank you for contacting NovaPharm Healthcare. We have securely recorded your ${escapeHtml(lead.enquiry_type.toLowerCase())} enquiry and will review it.</p><p>Please do not reply with patient-identifiable information, adverse-event reports or urgent medical information.</p><p>NovaPharm Healthcare</p>`)
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
    const lead = await one(`SELECT l.id, l.name, l.email, l.company, l.enquiry_type, l.message,
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

export function emailIntegrationStatus() {
  return configured() ? "configured" : "credentials_required";
}

export async function emailQueueStatus() {
  return {
    integration: emailIntegrationStatus(),
    states: await all(`SELECT status, COUNT(*) AS count, MAX(created_at) AS latest_notification
      FROM notifications WHERE channel = 'email' GROUP BY status ORDER BY status`)
  };
}

export async function sendLeadNotifications(lead) {
  if (!configured() || !lead) return { status: "credentials_required" };
  const deliveries = await Promise.allSettled(["contact_internal", "contact_acknowledgement"].map((templateCode) => {
    const message = leadMessage(lead, templateCode);
    return queueEmail({ ...message, templateCode, entityType: "lead", entityId: lead.id });
  }));
  const failure = deliveries.find((delivery) => delivery.status === "rejected");
  if (failure) throw failure.reason;
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
      result.processed += 1;
    }
    return result;
  } finally {
    retryWorkerActive = false;
  }
}
