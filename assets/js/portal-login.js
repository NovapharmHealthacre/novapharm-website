const loginForm = document.querySelector("[data-login-form]");

async function csrf() {
  const response = await fetch("/api/security/csrf", { credentials: "same-origin" });
  if (!response.ok) return "";
  const data = await response.json();
  return data.csrfToken || "";
}

if (loginForm) {
  const status = loginForm.querySelector("[data-login-status]");
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (status) {
      status.textContent = "Checking credentials...";
      status.className = "alert";
    }

    const payload = Object.fromEntries(new FormData(loginForm).entries());
    try {
      const csrfToken = await csrf();
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed.");
      window.location.href = data.redirectTo || "/portal/dashboard/";
    } catch (error) {
      if (status) {
        status.textContent = error.message || "Login failed.";
        status.className = "alert alert-danger";
      }
    }
  });
}
