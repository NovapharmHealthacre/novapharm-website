async function portalRequest(path, options = {}) {
  try {
    return await window.NovaPharmApi.request(path, options);
  } catch (error) {
    if (error.status === 401) {
      window.location.href = "/portal/";
      return null;
    }
    throw error;
  }
}

async function hydratePortal() {
  const session = await portalRequest("/api/portal/session");
  if (!session) return;
  if (session.user?.mustChangePassword && window.location.pathname !== "/portal/change-password/") {
    window.location.href = "/portal/change-password/";
    return;
  }
  document.querySelectorAll("[data-user-name]").forEach((node) => {
    node.textContent = session.user?.displayName || session.user?.username || "Portal user";
  });
}

document.querySelectorAll("[data-logout]").forEach((button) => {
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await window.NovaPharmApi.request("/api/auth/logout", {
        method: "POST",
        headers: { "x-csrf-token": await window.NovaPharmApi.csrf() }
      });
    } finally {
      window.location.href = "/portal/";
    }
  });
});

hydratePortal().catch(() => {
  window.location.href = "/portal/";
});
