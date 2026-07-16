function adminCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
  return cell;
}

function adminButton(label, action, id, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-outline admin-table-action";
  button.textContent = label;
  button.dataset.adminAction = action;
  button.dataset.recordId = id;
  button.disabled = disabled;
  return button;
}

function detailList(entries) {
  const list = document.createElement("dl");
  list.className = "admin-detail-list";
  for (const [label, value] of entries) {
    const term = document.createElement("dt");
    term.textContent = label;
    const detail = document.createElement("dd");
    detail.textContent = value === null || value === undefined || value === "" ? "Not provided" : String(value);
    list.append(term, detail);
  }
  return list;
}

async function csrfPost(path, body) {
  const csrfToken = await window.NovaPharmApi.csrf();
  return window.NovaPharmApi.request(path, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

function openDetail(title, content, { applicationId = "" } = {}) {
  const panel = document.querySelector("[data-admin-detail]");
  if (!panel) return;
  panel.hidden = false;
  panel.querySelector("[data-admin-detail-title]").textContent = title;
  panel.querySelector("[data-admin-detail-body]").replaceChildren(content);
  const form = panel.querySelector("[data-application-status-form]");
  if (form) {
    form.hidden = !applicationId;
    form.elements.applicationId.value = applicationId;
  }
  panel.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

async function reviewLead(id) {
  const { lead } = await window.NovaPharmApi.request(`/api/admin/leads/${encodeURIComponent(id)}`);
  const fragment = document.createDocumentFragment();
  fragment.append(detailList([
    ["Reference", lead.lead_number], ["Name", lead.name], ["Company", lead.company], ["Role", lead.role_title],
    ["Business email", lead.email], ["Telephone", lead.telephone], ["Country", lead.country],
    ["Enquiry type", lead.enquiry_type], ["Source page", lead.source_page], ["CTA", lead.source_cta],
    ["Campaign", lead.utm_campaign], ["Consent recorded", new Date(lead.consent_at).toLocaleString("en-GB")],
    ["Delivery", lead.delivery_state]
  ]));
  const heading = document.createElement("h3");
  heading.textContent = "Submitted message";
  const message = document.createElement("p");
  message.className = "admin-submitted-message";
  message.textContent = lead.message;
  fragment.append(heading, message);
  openDetail(`Enquiry ${lead.lead_number}`, fragment);
}

function applicationSection(title, node) {
  const section = document.createElement("section");
  section.className = "admin-detail-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading, node);
  return section;
}

async function reviewApplication(id) {
  const { application } = await window.NovaPharmApi.request(`/api/admin/applications/${encodeURIComponent(id)}`);
  const fragment = document.createDocumentFragment();
  fragment.append(applicationSection("Application", detailList([
    ["Reference", application.applicationNumber], ["Status", application.status],
    ["Applicant email", application.submittedByEmail], ["Submitted", new Date(application.createdAt).toLocaleString("en-GB")],
    ["Expected documents", application.expectedDocumentCount], ["Uploaded documents", application.documents.length],
    ["Privacy notice", application.privacyNoticeVersion]
  ])));
  fragment.append(applicationSection("Company", detailList([
    ["Legal name", application.company.legalName], ["Trading name", application.company.tradingName],
    ["Company number", application.company.companyNumber], ["VAT number", application.company.vatNumber],
    ["Customer type", application.company.customerType]
  ])));
  const people = document.createElement("ul");
  for (const person of application.responsiblePeople) {
    const item = document.createElement("li");
    item.textContent = `${person.name} — ${person.role} — ${person.email}`;
    people.append(item);
  }
  fragment.append(applicationSection("Responsible people", people));
  fragment.append(applicationSection("Compliance", detailList([
    ["WDA(H), if applicable", application.compliance.wdaNumber], ["GDP status", application.compliance.gdpStatus],
    ["Insurance", application.compliance.insuranceStatus], ["Credit references", application.compliance.creditReferences],
    ["Trade references", application.compliance.tradeReferences],
    ["Bank evidence available", application.bank.confirmationProvided ? "Confirmed" : "Not confirmed"]
  ])));
  const documents = document.createElement("ul");
  for (const documentRecord of application.documents) {
    const item = document.createElement("li");
    item.textContent = `${documentRecord.file_name} — ${documentRecord.document_class} — ${documentRecord.lifecycle_status} / ${documentRecord.security_status}`;
    documents.append(item);
  }
  if (!application.documents.length) {
    const item = document.createElement("li");
    item.textContent = "No supporting documents uploaded.";
    documents.append(item);
  }
  fragment.append(applicationSection("Documents", documents));
  const history = document.createElement("ol");
  for (const event of application.statusHistory) {
    const item = document.createElement("li");
    item.textContent = `${new Date(event.occurred_at).toLocaleString("en-GB")}: ${event.from_status || "created"} to ${event.to_status} by ${event.actor}${event.reason ? ` — ${event.reason}` : ""}`;
    history.append(item);
  }
  fragment.append(applicationSection("Immutable status history", history));
  openDetail(`Application ${application.applicationNumber}`, fragment, { applicationId: application.id });
}

function renderLeadRows(leads) {
  const body = document.querySelector("[data-leads]");
  if (!body) return;
  body.replaceChildren();
  for (const lead of leads) {
    const row = document.createElement("tr");
    row.append(adminCell(lead.lead_number), adminCell(lead.company), adminCell(lead.enquiry_type), adminCell(lead.delivery_state), adminCell(new Date(lead.created_at).toLocaleString("en-GB")));
    const action = document.createElement("td");
    action.append(adminButton("Review", "lead", lead.id));
    row.append(action);
    body.append(row);
  }
}

function renderApplicationRows(applications) {
  const body = document.querySelector("[data-applications]");
  if (!body) return;
  body.replaceChildren();
  for (const application of applications) {
    const row = document.createElement("tr");
    row.append(adminCell(application.application_number), adminCell(application.status), adminCell(`${application.uploaded_document_count}/${application.expected_document_count}`), adminCell(new Date(application.created_at).toLocaleString("en-GB")));
    const action = document.createElement("td");
    action.append(adminButton("Review", "application", application.id));
    row.append(action);
    body.append(row);
  }
}

function renderEmailRows(deliveries) {
  const body = document.querySelector("[data-email-deliveries]");
  if (!body) return;
  body.replaceChildren();
  for (const delivery of deliveries || []) {
    const row = document.createElement("tr");
    row.append(adminCell(delivery.template_code), adminCell(delivery.entity_type), adminCell(delivery.status), adminCell(delivery.attempt_count), adminCell(new Date(delivery.created_at).toLocaleString("en-GB")));
    const action = document.createElement("td");
    action.append(adminButton("Preview", "preview-email", delivery.id));
    action.append(adminButton("Replay", "replay-email", delivery.id, delivery.status === "sent"));
    row.append(action);
    body.append(row);
  }
}

function safeEmailFragment(html) {
  const parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
  parsed.querySelectorAll("script,style,iframe,object,embed,link,meta,form,input,button").forEach((node) => node.remove());
  parsed.querySelectorAll("*").forEach((node) => {
    for (const attribute of [...node.attributes]) {
      if (attribute.name.toLowerCase().startsWith("on") || !["alt", "width", "height", "src"].includes(attribute.name.toLowerCase())) {
        node.removeAttribute(attribute.name);
      }
    }
    if (node.tagName === "IMG") {
      const source = node.getAttribute("src") || "";
      if (source.includes("/assets/brand/novapharm-healthcare-logo.png")) node.setAttribute("src", "/assets/brand/novapharm-healthcare-logo.png");
      else node.remove();
    }
  });
  const fragment = document.createDocumentFragment();
  while (parsed.body.firstChild) fragment.append(parsed.body.firstChild);
  return fragment;
}

async function previewEmail(id) {
  const { preview } = await window.NovaPharmApi.request(`/api/admin/notifications/${encodeURIComponent(id)}/preview`);
  const dialog = document.querySelector("[data-email-preview]");
  if (!dialog) return;
  dialog.querySelector("[data-email-preview-title]").textContent = preview.message.subject || "Email preview";
  dialog.querySelector("[data-email-preview-meta]").replaceChildren(detailList([
    ["To", preview.message.to], ["Reply to", preview.message.replyTo], ["Template", preview.templateCode],
    ["State", preview.status], ["Local capture", preview.localCapture ? "Yes — no external delivery" : "No"]
  ]));
  dialog.querySelector("[data-email-preview-html]").replaceChildren(safeEmailFragment(preview.message.html));
  dialog.querySelector("[data-email-preview-text]").textContent = preview.message.text;
  dialog.showModal();
}

async function hydrateAdmin() {
  let data;
  try {
    data = await window.NovaPharmApi.request("/api/admin/summary");
  } catch (error) {
    if (error.status === 401 || error.status === 403) window.location.href = "/portal/";
    return;
  }
  document.querySelectorAll("[data-admin-metric]").forEach((node) => {
    node.textContent = data.metrics[node.getAttribute("data-admin-metric")] ?? "0";
  });
  renderLeadRows(data.leads);
  renderApplicationRows(data.applications);
  renderEmailRows(data.emailQueue?.deliveries);
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-admin-action]");
  if (!button || button.disabled) return;
  button.disabled = true;
  try {
    if (button.dataset.adminAction === "lead") await reviewLead(button.dataset.recordId);
    if (button.dataset.adminAction === "application") await reviewApplication(button.dataset.recordId);
    if (button.dataset.adminAction === "preview-email") await previewEmail(button.dataset.recordId);
    if (button.dataset.adminAction === "replay-email") {
      await csrfPost(`/api/admin/notifications/${encodeURIComponent(button.dataset.recordId)}/replay`);
      await hydrateAdmin();
    }
  } catch (error) {
    const status = document.querySelector("[data-admin-action-status], [data-email-retry-status]");
    if (status) status.textContent = window.NovaPharmApi.friendlyError(error);
  } finally {
    button.disabled = false;
  }
});

document.querySelector("[data-admin-detail-close]")?.addEventListener("click", () => {
  document.querySelector("[data-admin-detail]").hidden = true;
});

document.querySelector("[data-email-preview-close]")?.addEventListener("click", () => {
  document.querySelector("[data-email-preview]")?.close();
});

document.querySelector("[data-application-status-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector("[data-admin-action-status]");
  const values = Object.fromEntries(new FormData(form));
  try {
    await csrfPost(`/api/admin/applications/${encodeURIComponent(values.applicationId)}/status`, { status: values.status, reason: values.reason });
    if (status) status.textContent = "Application status updated and recorded in immutable history.";
    await hydrateAdmin();
    await reviewApplication(values.applicationId);
  } catch (error) {
    if (status) status.textContent = window.NovaPharmApi.friendlyError(error);
  }
});

document.querySelector("[data-activate-customer]")?.addEventListener("click", async (event) => {
  const form = event.currentTarget.closest("form");
  const applicationId = form.elements.applicationId.value;
  const status = form.querySelector("[data-admin-action-status]");
  event.currentTarget.disabled = true;
  try {
    const result = await csrfPost(`/api/admin/applications/${encodeURIComponent(applicationId)}/activate`);
    if (status) status.textContent = `Customer ${result.customer.customer_number} activated. External identity invitation is queued; no password was emailed.`;
    await hydrateAdmin();
    await reviewApplication(applicationId);
  } catch (error) {
    if (status) status.textContent = window.NovaPharmApi.friendlyError(error);
  } finally {
    event.currentTarget.disabled = false;
  }
});

document.querySelector("[data-email-retry]")?.addEventListener("click", async (event) => {
  const status = document.querySelector("[data-email-retry-status]");
  event.currentTarget.disabled = true;
  if (status) status.textContent = "Processing due email deliveries...";
  try {
    const result = await csrfPost("/api/integrations/email/retries");
    if (status) status.textContent = `${result.sent || 0} email deliveries completed; ${result.retrying || 0} remain queued and ${result.blocked || 0} require review.`;
    await hydrateAdmin();
  } catch (error) {
    if (status) status.textContent = window.NovaPharmApi.friendlyError(error);
  } finally {
    event.currentTarget.disabled = false;
  }
});

document.querySelector("[data-session-revoke-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector("[data-session-revoke-status]");
  const username = new FormData(form).get("username");
  try {
    const result = await csrfPost(`/api/admin/users/${encodeURIComponent(username)}/sessions/revoke`);
    if (status) status.textContent = `${result.result.revokedSessions} active session${result.result.revokedSessions === 1 ? "" : "s"} revoked for the specified user.`;
    form.reset();
    await hydrateAdmin();
  } catch (error) {
    if (status) status.textContent = window.NovaPharmApi.friendlyError(error);
  }
});

hydrateAdmin();
