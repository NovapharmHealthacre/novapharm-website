async function portalRequest(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  if (response.status === 401) {
    window.location.href = "/portal/";
    return null;
  }
  return response;
}

async function hydratePortal() {
  const sessionResponse = await portalRequest("/api/portal/session");
  if (!sessionResponse || !sessionResponse.ok) return;
  const session = await sessionResponse.json();
  document.querySelectorAll("[data-user-name]").forEach((node) => {
    node.textContent = session.user?.username || "Portal user";
  });

}

document.querySelectorAll("[data-logout]").forEach((button) => {
  button.addEventListener("click", async () => {
    const csrfResponse = await fetch("/api/security/csrf", { credentials: "same-origin" });
    const { csrfToken } = await csrfResponse.json();
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "x-csrf-token": csrfToken }
    });
    window.location.href = "/portal/";
  });
});

hydratePortal();
