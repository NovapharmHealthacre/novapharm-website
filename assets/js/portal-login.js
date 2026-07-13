const loginForm = document.querySelector("[data-login-form]");

if (loginForm) {
  const status = loginForm.querySelector("[data-login-status]");
  const submit = loginForm.querySelector("button[type=submit]");

  const showRuntimeUnavailable = () => {
    if (!status) return;
    const strong = document.createElement("strong");
    strong.textContent = "Secure portal activation is in progress.";
    const text = document.createElement("span");
    text.textContent = " The public website is available, but authenticated portal access requires NovaPharm's secure Node service. Existing authorised users can request access support by email.";
    const link = document.createElement("a");
    link.className = "btn btn-primary";
    link.href = "mailto:vishal@novapharmhealthcare.com?subject=NovaPharm%20secure%20portal%20access%20support";
    link.textContent = "Request portal access support";
    status.replaceChildren(strong, text, document.createElement("br"), link);
    status.className = "alert static-service-notice";
  };

  window.NovaPharmApi.request("/api/health", { timeoutMs: 5000 }).catch(showRuntimeUnavailable);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity() || submit.disabled) return;
    submit.disabled = true;
    if (status) {
      status.textContent = "Checking credentials...";
      status.className = "alert";
    }

    const payload = Object.fromEntries(new FormData(loginForm).entries());
    try {
      const csrfToken = await window.NovaPharmApi.csrf();
      const data = await window.NovaPharmApi.request("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify(payload)
      });
      window.location.href = data.redirectTo || "/portal/dashboard/";
    } catch (error) {
      if (error?.status === 0 || error?.status === 404 || error?.status === 503 || error?.code === "csrf_unavailable" || error?.code === "network_unavailable") {
        showRuntimeUnavailable();
      } else if (status) {
        status.textContent = window.NovaPharmApi.friendlyError(error, "login");
        status.className = "alert alert-danger";
      }
      submit.disabled = false;
    }
  });
}
