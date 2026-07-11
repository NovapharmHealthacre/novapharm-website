import { randomUUID } from "node:crypto";
import { nowIso, run } from "../../data/database.mjs";

function configured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.CONTACT_NOTIFICATION_TO);
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

async function sendEmail({ to, subject, text, html, replyTo, templateCode, entityId }) {
  const notificationId = randomUUID();
  const recipient = cleanHeader(to);
  const createdAt = nowIso();
  run(`INSERT INTO notifications(id, channel, recipient, template_code, entity_type, entity_id, status, payload_json, created_at)
    VALUES(?, 'email', ?, ?, 'lead', ?, 'sending', '{}', ?)`, notificationId, recipient, templateCode, entityId, createdAt);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [recipient],
        subject: cleanHeader(subject),
        text,
        html,
        ...(replyTo ? { reply_to: cleanHeader(replyTo) } : {})
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw Object.assign(new Error("Email provider rejected the notification."), { providerStatus: response.status });
    run("UPDATE notifications SET status = 'sent', sent_at = ? WHERE id = ?", nowIso(), notificationId);
    return { status: "sent" };
  } catch (error) {
    run("UPDATE notifications SET status = 'failed', payload_json = ? WHERE id = ?", JSON.stringify({ providerStatus: error.providerStatus || null }), notificationId);
    throw error;
  }
}

export function emailIntegrationStatus() {
  return configured() ? "configured" : "credentials_required";
}

export async function sendLeadNotifications(lead) {
  if (!configured() || !lead) return { status: "credentials_required" };
  const telephone = lead.telephone || "Not provided";
  const internalText = [
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
  const internalHtml = brandedEmail(`<h1>New ${escapeHtml(lead.enquiry_type)} enquiry</h1><dl><dt>Name</dt><dd>${escapeHtml(lead.name)}</dd><dt>Role</dt><dd>${escapeHtml(lead.role_title)}</dd><dt>Company</dt><dd>${escapeHtml(lead.company)}</dd><dt>Country</dt><dd>${escapeHtml(lead.country)}</dd><dt>Email</dt><dd>${escapeHtml(lead.email)}</dd><dt>Telephone</dt><dd>${escapeHtml(telephone)}</dd></dl><h2>Message</h2><p>${escapeHtml(lead.message).replaceAll("\n", "<br>")}</p>`);
  await sendEmail({
    to: process.env.CONTACT_NOTIFICATION_TO,
    subject: `NovaPharm website: ${lead.enquiry_type} from ${lead.company}`,
    text: internalText,
    html: internalHtml,
    replyTo: lead.email,
    templateCode: "contact_internal",
    entityId: lead.id
  });
  await sendEmail({
    to: lead.email,
    subject: "NovaPharm Healthcare has received your enquiry",
    text: `Hello ${lead.name},\n\nThank you for contacting NovaPharm Healthcare. We have securely recorded your ${lead.enquiry_type.toLowerCase()} enquiry and will review it.\n\nPlease do not reply with patient-identifiable information, adverse-event reports or urgent medical information.\n\nNovaPharm Healthcare`,
    html: brandedEmail(`<p>Hello ${escapeHtml(lead.name)},</p><p>Thank you for contacting NovaPharm Healthcare. We have securely recorded your ${escapeHtml(lead.enquiry_type.toLowerCase())} enquiry and will review it.</p><p>Please do not reply with patient-identifiable information, adverse-event reports or urgent medical information.</p><p>NovaPharm Healthcare</p>`),
    templateCode: "contact_acknowledgement",
    entityId: lead.id
  });
  return { status: "sent" };
}
