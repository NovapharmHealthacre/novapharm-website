const passwordForm = document.querySelector("[data-password-change-form]");

if (passwordForm) {
  const status = passwordForm.querySelector("[data-password-status]");
  const submit = passwordForm.querySelector("button[type=submit]");

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!passwordForm.reportValidity() || submit?.disabled) return;
    const payload = Object.fromEntries(new FormData(passwordForm).entries());
    if (payload.newPassword !== payload.confirmation) {
      status.textContent = "The new password and confirmation do not match.";
      status.className = "alert alert-danger";
      passwordForm.elements.confirmation.focus();
      return;
    }
    submit.disabled = true;
    status.textContent = "Securing your account...";
    status.className = "alert";
    try {
      const csrfToken = await window.NovaPharmApi.csrf();
      const result = await window.NovaPharmApi.request("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify(payload)
      });
      passwordForm.reset();
      status.textContent = "Your password has been changed and other sessions have been signed out. Redirecting to your portal...";
      status.className = "alert alert-success";
      window.setTimeout(() => { window.location.href = result.redirectTo || "/portal/dashboard/"; }, 800);
    } catch (error) {
      if (error?.status === 401) {
        status.textContent = "The current temporary password is not correct.";
      } else if ([400, 503].includes(error?.status) && error?.payload?.error) {
        status.textContent = error.payload.error;
      } else {
        status.textContent = window.NovaPharmApi.friendlyError(error, "password");
      }
      status.className = "alert alert-danger";
      submit.disabled = false;
    }
  });
}
