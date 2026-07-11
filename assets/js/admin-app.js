async function hydrateAdmin() {
  let data;
  try {
    data = await window.NovaPharmApi.request("/api/admin/summary");
  } catch (error) {
    if (error.status === 401 || error.status === 403) window.location.href = "/portal/";
    return;
  }

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
