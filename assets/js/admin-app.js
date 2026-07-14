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

const retryButton = document.querySelector("[data-email-retry]");
retryButton?.addEventListener("click", async () => {
  const status = document.querySelector("[data-email-retry-status]");
  retryButton.disabled = true;
  if (status) status.textContent = "Processing due email deliveries...";
  try {
    const csrfToken = await window.NovaPharmApi.csrf();
    const result = await window.NovaPharmApi.request("/api/integrations/email/retries", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken }
    });
    if (status) status.textContent = `${result.sent || 0} email deliveries completed; ${result.retrying || 0} remain queued and ${result.blocked || 0} require review.`;
    await hydrateAdmin();
  } catch (error) {
    if (status) status.textContent = window.NovaPharmApi.friendlyError(error);
  } finally {
    retryButton.disabled = false;
  }
});

hydrateAdmin();
