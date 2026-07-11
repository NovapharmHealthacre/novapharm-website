const loginForm = document.querySelector("[data-login-form]");

if (loginForm) {
  const status = loginForm.querySelector("[data-login-status]");
  const submit = loginForm.querySelector("button[type=submit]");
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
      if (status) {
        status.textContent = window.NovaPharmApi.friendlyError(error, "login");
        status.className = "alert alert-danger";
      }
      submit.disabled = false;
    }
  });
}
