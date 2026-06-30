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
    leads.replaceChildren();
    data.leads.forEach((lead) => {
      const row = document.createElement("tr");
      [lead.name, lead.company, lead.enquiry_type, new Date(lead.created_at).toLocaleString("en-GB")].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value || "—";
        row.append(cell);
      });
      leads.append(row);
    });
  }
}

hydrateAdmin();
