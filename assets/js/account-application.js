function applicationSubmissionKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(24);
  globalThis.crypto?.getRandomValues?.(bytes);
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("") || `${Date.now()}-${Math.random()}`;
}

function applicationFiles(form) {
  return [...form.querySelectorAll("input[type=file]")].flatMap((input) => [...input.files].map((file) => ({
    file,
    documentClass: input.dataset.documentClass || "customer_onboarding"
  })));
}

function applicationPayload(form, files, submissionKey) {
  const values = Object.fromEntries(new FormData(form));
  return {
    email: values.email,
    submissionKey,
    expectedDocumentCount: files.length,
    sourcePage: values.sourcePage,
    sourceCta: values.sourceCta,
    attributionPayload: values.attributionPayload,
    company: {
      legalName: values.legalName,
      tradingName: values.tradingName,
      companyNumber: values.companyNumber,
      vatNumber: values.vatNumber,
      customerType: values.customerType
    },
    responsiblePeople: [{ name: values.responsiblePerson, role: values.responsibleRole, email: values.responsibleEmail }],
    addresses: [
      { type: "registered", address: values.registeredAddress, postcode: values.registeredPostcode, country: "GB" },
      { type: "delivery", address: values.deliveryAddress || values.registeredAddress, postcode: values.deliveryPostcode || values.registeredPostcode, country: "GB" }
    ],
    compliance: {
      wdaNumber: values.wdaNumber,
      gdpStatus: values.gdpStatus,
      insuranceStatus: values.insuranceStatus,
      creditReferences: values.creditReferences,
      tradeReferences: values.tradeReferences
    },
    bank: { confirmationProvided: values.bankConfirmation === "yes" },
    applicantDeclaration: values.applicantDeclaration,
    privacyAcknowledgement: values.privacyAcknowledgement
  };
}

async function refreshUploadAuthorisation(application, csrfToken) {
  const result = await window.NovaPharmApi.request(`/api/account-applications/${application.id}/upload-authorisation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify({ resumeToken: application.resumeToken })
  });
  Object.assign(application, result.authorisations);
}

async function uploadApplicationFile(application, entry, csrfToken, allowRefresh = true) {
  const params = new URLSearchParams({ fileName: entry.file.name, documentClass: entry.documentClass });
  try {
    return await window.NovaPharmApi.request(`/api/account-applications/${application.id}/documents?${params}`, {
      method: "POST",
      headers: {
        "Content-Type": entry.file.type || "application/octet-stream",
        "x-application-upload-token": application.uploadToken,
        "x-csrf-token": csrfToken
      },
      body: entry.file,
      timeoutMs: 30000
    });
  } catch (error) {
    if (allowRefresh && error.status === 403 && application.resumeToken) {
      await refreshUploadAuthorisation(application, csrfToken);
      return uploadApplicationFile(application, entry, csrfToken, false);
    }
    throw error;
  }
}

async function completeApplicationUploads(application, csrfToken) {
  try {
    return await window.NovaPharmApi.request(`/api/account-applications/${application.id}/documents/complete`, {
      method: "POST",
      headers: { "x-application-upload-token": application.uploadToken, "x-csrf-token": csrfToken }
    });
  } catch (error) {
    if (error.status === 403 && application.resumeToken) {
      await refreshUploadAuthorisation(application, csrfToken);
      return window.NovaPharmApi.request(`/api/account-applications/${application.id}/documents/complete`, {
        method: "POST",
        headers: { "x-application-upload-token": application.uploadToken, "x-csrf-token": csrfToken }
      });
    }
    throw error;
  }
}

async function uploadEntries(application, entries, csrfToken) {
  const successful = [];
  const failed = [];
  for (const entry of entries) {
    try {
      const result = await uploadApplicationFile(application, entry, csrfToken);
      successful.push({ ...entry, result });
    } catch (error) {
      failed.push({ ...entry, error });
    }
  }
  return { successful, failed };
}

function applicationServiceUnavailable(error) {
  return error?.status === 0 || error?.status === 404 || error?.status === 503 || error?.code === "csrf_unavailable" || error?.code === "network_unavailable";
}

function showAccountEmailFallback(status, payload) {
  const person = payload.responsiblePeople?.[0] || {};
  const registered = payload.addresses?.find((address) => address.type === "registered") || {};
  const delivery = payload.addresses?.find((address) => address.type === "delivery") || {};
  const subject = `NovaPharm business account request: ${payload.company?.legalName || "New applicant"}`;
  const body = [
    "NovaPharm business account request",
    "",
    `Legal company name: ${payload.company?.legalName || ""}`,
    `Trading name: ${payload.company?.tradingName || ""}`,
    `Company number: ${payload.company?.companyNumber || ""}`,
    `VAT number: ${payload.company?.vatNumber || ""}`,
    `Customer type: ${payload.company?.customerType || ""}`,
    `Applicant email: ${payload.email || ""}`,
    `Responsible person: ${person.name || ""}`,
    `Responsible person role: ${person.role || ""}`,
    `Responsible person email: ${person.email || ""}`,
    `Registered address: ${registered.address || ""}, ${registered.postcode || ""}`,
    `Delivery address: ${delivery.address || ""}, ${delivery.postcode || ""}`,
    `WDA(H) number, if applicable: ${payload.compliance?.wdaNumber || ""}`,
    `GDP status: ${payload.compliance?.gdpStatus || ""}`,
    `Insurance status: ${payload.compliance?.insuranceStatus || ""}`,
    "",
    "Supporting documents are not attached to this email draft. NovaPharm will provide a controlled route for any documents required during review."
  ].join("\n");
  const link = document.createElement("a");
  link.className = "btn btn-primary";
  link.href = `mailto:vishal@novapharmhealthcare.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  link.textContent = "Send account request by email";
  const strong = document.createElement("strong");
  strong.textContent = "The secure application service is unavailable.";
  const text = document.createElement("span");
  text.textContent = " No application record was created. Send the business details by email and NovaPharm will provide a controlled document route separately.";
  status.replaceChildren(strong, text, document.createElement("br"), link);
  status.className = "alert static-service-notice";
  status.setAttribute("role", "status");
  link.focus();
}

function showApplicationSuccess(form, status, application) {
  form.hidden = true;
  status.textContent = `Application ${application.applicationNumber} was securely recorded. Compliance and sales review notifications have been queued.`;
  status.className = "alert alert-success";
  status.setAttribute("role", "status");
  status.setAttribute("tabindex", "-1");
  status.focus();
}

function showPartialUpload({ form, status, application, successful, failed, csrfToken }) {
  form.hidden = true;
  const heading = document.createElement("strong");
  heading.textContent = `Application ${application.applicationNumber} is safely recorded.`;
  const explanation = document.createElement("p");
  explanation.textContent = `${successful.length} file${successful.length === 1 ? "" : "s"} uploaded; ${failed.length} require retry. The application has not been duplicated or lost.`;
  const list = document.createElement("ul");
  for (const entry of successful) {
    const item = document.createElement("li");
    item.textContent = `${entry.file.name}: uploaded`;
    list.append(item);
  }
  for (const entry of failed) {
    const item = document.createElement("li");
    item.textContent = `${entry.file.name}: ${window.NovaPharmApi.friendlyError(entry.error, "application")}`;
    list.append(item);
  }
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "btn btn-primary";
  retry.textContent = "Retry failed files";
  retry.addEventListener("click", async () => {
    retry.disabled = true;
    explanation.textContent = "Retrying only the files that did not upload...";
    const result = await uploadEntries(application, failed, csrfToken);
    successful.push(...result.successful);
    if (result.failed.length) {
      showPartialUpload({ form, status, application, successful, failed: result.failed, csrfToken });
      return;
    }
    try {
      await completeApplicationUploads(application, csrfToken);
      showApplicationSuccess(form, status, application);
    } catch (error) {
      explanation.textContent = window.NovaPharmApi.friendlyError(error, "application");
      retry.disabled = false;
    }
  });
  status.replaceChildren(heading, explanation, list, retry);
  status.className = "alert application-upload-recovery";
  status.setAttribute("role", "status");
  retry.focus();
}

const applicationForm = document.querySelector("[data-account-application]");
const submissionKey = applicationSubmissionKey();

if (applicationForm) {
  const steps = [...applicationForm.querySelectorAll("[data-application-step]")];
  const progressItems = [...document.querySelectorAll("[data-application-progress] li")];
  let activeStep = 0;
  const showStep = (index) => {
    activeStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== activeStep; });
    progressItems.forEach((item, itemIndex) => {
      item.toggleAttribute("aria-current", itemIndex === activeStep);
      item.classList.toggle("complete", itemIndex < activeStep);
    });
    steps[activeStep].querySelector("input, select, textarea")?.focus();
  };
  const stepIsValid = () => {
    const controls = [...steps[activeStep].querySelectorAll("input, select, textarea")];
    const invalid = controls.find((control) => control.willValidate && !control.checkValidity());
    if (!invalid) return true;
    invalid.reportValidity();
    invalid.focus();
    return false;
  };
  applicationForm.querySelectorAll("[data-step-next]").forEach((button) => {
    button.addEventListener("click", () => { if (stepIsValid()) showStep(activeStep + 1); });
  });
  applicationForm.querySelectorAll("[data-step-back]").forEach((button) => {
    button.addEventListener("click", () => showStep(activeStep - 1));
  });
}

applicationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const status = document.querySelector("[data-application-status]");
  const submit = form.querySelector("button[type=submit]");
  if (submit.disabled) return;
  submit.disabled = true;
  status.textContent = "Submitting application and preparing the controlled document record...";
  status.className = "alert";
  const files = applicationFiles(form);
  const payload = applicationPayload(form, files, submissionKey);
  let application = null;
  let csrfToken = "";
  try {
    csrfToken = await window.NovaPharmApi.csrf();
    const result = await window.NovaPharmApi.request("/api/account-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify(payload)
    });
    application = result.application;
    const uploads = await uploadEntries(application, files, csrfToken);
    if (uploads.failed.length) {
      showPartialUpload({ form, status, application, successful: uploads.successful, failed: uploads.failed, csrfToken });
      return;
    }
    await completeApplicationUploads(application, csrfToken);
    showApplicationSuccess(form, status, application);
  } catch (error) {
    if (!application && applicationServiceUnavailable(error)) showAccountEmailFallback(status, payload);
    else if (application) {
      showPartialUpload({ form, status, application, successful: [], failed: files.map((entry) => ({ ...entry, error })), csrfToken });
    } else {
      status.textContent = window.NovaPharmApi.friendlyError(error, "application");
      status.className = "alert alert-danger";
    }
    submit.disabled = false;
  }
});
