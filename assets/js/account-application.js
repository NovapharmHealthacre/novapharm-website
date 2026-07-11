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
    bank: { confirmationProvided: values.bankConfirmation === "yes" }
  };
}

async function uploadApplicationFiles(application, input, csrfToken) {
  for (const file of [...input.files]) {
    const params = new URLSearchParams({
      uploadToken: application.uploadToken,
      fileName: file.name,
      documentClass: input.dataset.documentClass || "customer_onboarding"
    });
    await window.NovaPharmApi.request(`/api/account-applications/${application.id}/documents?${params}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream", "x-csrf-token": csrfToken },
      body: file,
      timeoutMs: 30000
    });
  }
}

const applicationForm = document.querySelector("[data-account-application]");
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
    button.addEventListener("click", () => {
      if (stepIsValid()) showStep(activeStep + 1);
    });
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
  try {
    const csrfToken = await window.NovaPharmApi.csrf();
    const result = await window.NovaPharmApi.request("/api/account-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify(applicationPayload(form))
    });
    const fileInputs = [...form.querySelectorAll("input[type=file]")];
    for (const input of fileInputs) await uploadApplicationFiles(result.application, input, csrfToken);
    form.hidden = true;
    status.textContent = `Application ${result.application.applicationNumber} was submitted. Compliance and sales review workflows have been queued.`;
    status.className = "alert alert-success";
    status.setAttribute("role", "status");
  } catch (error) {
    status.textContent = window.NovaPharmApi.friendlyError(error, "application");
    status.className = "alert alert-danger";
    submit.disabled = false;
  }
});
