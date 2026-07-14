const status = document.querySelector("[data-entra-status]");
const requestedAccess = new URLSearchParams(window.location.search).get("accessType");
const accessType = ["customer", "employee", "board", "admin"].includes(requestedAccess) ? requestedAccess : "customer";

async function completeFederatedLogin() {
  try {
    const csrfToken = await window.NovaPharmApi.csrf();
    const result = await window.NovaPharmApi.request("/api/auth/federated", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken
      },
      body: JSON.stringify({ accessType })
    });
    if (status) status.textContent = "Access verified. Opening the authorised portal...";
    window.location.replace(result.redirectTo || "/portal/dashboard/");
  } catch (error) {
    if (status) {
      status.textContent = window.NovaPharmApi.friendlyError(error, "login");
      status.className = "alert alert-danger";
    }
  }
}

completeFederatedLogin();
