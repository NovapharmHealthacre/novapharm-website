let applicationCsrf = "";

async function applicationRequest(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Application request failed.");
  return payload;
}

async function ensureApplicationCsrf() {
  if (applicationCsrf) return applicationCsrf;
  applicationCsrf = (await applicationRequest("/api/security/csrf")).csrfToken;
  return applicationCsrf;
}

function applicationPayload(form) {
  const values = Object.fromEntries(new FormData(form));
  return {
    email: values.email,
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
    bank: { confirmationProvided: Boolean(values.bankConfirmation) }
  };
}

async function uploadApplicationFiles(application, input) {
  const results = [];
  for (const file of [...input.files]) {
    const params = new URLSearchParams({ uploadToken: application.uploadToken, fileName: file.name, documentClass: input.dataset.documentClass || "customer_onboarding" });
    results.push(await applicationRequest(`/api/account-applications/${application.id}/documents?${params}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream", "x-csrf-token": await ensureApplicationCsrf() },
      body: file
    }));
  }
  return results;
}

document.querySelector("[data-account-application]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("[data-application-status]");
  const submit = form.querySelector("button[type=submit]");
  submit.disabled = true;
  status.textContent = "Submitting application...";
  try {
    const result = await applicationRequest("/api/account-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": await ensureApplicationCsrf() },
      body: JSON.stringify(applicationPayload(form))
    });
    const fileInputs = [...form.querySelectorAll("input[type=file]")];
    for (const input of fileInputs) await uploadApplicationFiles(result.application, input);
    form.hidden = true;
    status.textContent = `Application ${result.application.applicationNumber} was submitted. Compliance and Sales review workflows are queued.`;
    status.setAttribute("role", "status");
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("alert-error");
    submit.disabled = false;
  }
});
