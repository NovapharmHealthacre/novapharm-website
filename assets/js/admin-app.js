async function adminRequest(path) {
  const response = await fetch(path, { credentials: "same-origin" });
  if (response.status === 401) {
    window.location.href = "/portal/";
    return null;
  }
  return response;
}

async function hydrateAdmin() {
  const response = await adminRequest("/api/admin/summary");
  if (!response || !response.ok) return;
  const data = await response.json();

  document.querySelectorAll("[data-admin-metric]").forEach((node) => {
    const key = node.getAttribute("data-admin-metric");
    node.textContent = data.metrics[key] ?? "0";
  });

  const leads = document.querySelector("[data-leads]");
  if (leads) {
    leads.innerHTML = data.leads.map((lead) => `
      <tr>
        <td>${lead.name}</td>
        <td>${lead.company}</td>
        <td>${lead.enquiryType}</td>
        <td>${lead.createdAt}</td>
      </tr>
    `).join("");
  }
}

hydrateAdmin();
