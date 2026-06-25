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

  const dataResponse = await portalRequest("/api/portal/data");
  if (!dataResponse || !dataResponse.ok) return;
  const data = await dataResponse.json();

  const announcements = document.querySelector("[data-announcements]");
  if (announcements) {
    announcements.innerHTML = data.announcements.map((item) => `
      <article class="card">
        <span class="status-pill">${item.category}</span>
        <h3>${item.title}</h3>
        <p>${item.summary}</p>
      </article>
    `).join("");
  }

  const tasks = document.querySelector("[data-tasks]");
  if (tasks) {
    tasks.innerHTML = data.tasks.map((task) => `
      <tr>
        <td>${task.title}</td>
        <td>${task.owner}</td>
        <td>${task.due}</td>
        <td><span class="status-pill">${task.status}</span></td>
      </tr>
    `).join("");
  }
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
    window.location.href = "/";
  });
});

hydratePortal();
