const loginForm = document.querySelector("[data-login-form]");

async function readJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  return response.json();
}

async function csrf() {
  const response = await fetch("/api/security/csrf", { credentials: "same-origin" });
  if (response.status === 404) {
    throw new Error("Secure portal backend is not active on this static host yet. Use the Executive Platform links below, or deploy the Node runtime for password login.");
  }
  if (!response.ok) throw new Error("Secure portal is temporarily unavailable.");
  const data = await readJson(response);
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
      const data = await readJson(response);
      if (response.status === 404) throw new Error("Secure portal backend is not active on this static host yet. Use the Executive Platform links below, or deploy the Node runtime for password login.");
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
