function executiveCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "-";
  return cell;
}

function executiveRow(values) {
  const row = document.createElement("tr");
  values.forEach((value) => row.append(executiveCell(value)));
  return row;
}

function readableState(value) {
  return String(value || "not configured").replaceAll("_", " ");
}

async function hydrateExecutiveModule() {
  let data;
  try {
    data = await window.NovaPharmApi.request("/api/portal/data");
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.replace("/portal/");
      return;
    }
    const policy = document.querySelector("[data-executive-policy]");
    if (policy) policy.textContent = window.NovaPharmApi.friendlyError(error, "portal");
    return;
  }

  document.querySelectorAll("[data-executive-metric]").forEach((node) => {
    node.textContent = data.dashboard?.[node.dataset.executiveMetric] ?? "0";
  });

  const sourceRows = document.querySelector("[data-executive-source-status]");
  if (sourceRows) {
    sourceRows.replaceChildren();
    const sources = Object.entries(data.dashboard?.sourceStatus || {});
    sources.forEach(([source, state]) => sourceRows.append(executiveRow([
      source.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()),
      readableState(state)
    ])));
    if (!sources.length) sourceRows.append(executiveRow(["No source status is available.", "Unavailable"]));
  }

  const syncRows = document.querySelector("[data-executive-sync-status]");
  if (syncRows) {
    syncRows.replaceChildren();
    (data.integrations || []).forEach((event) => syncRows.append(executiveRow([
      readableState(event.destination_system),
      readableState(event.status),
      event.count,
      event.latest_event ? new Date(event.latest_event).toLocaleString("en-GB") : "No event"
    ])));
    if (!data.integrations?.length) syncRows.append(executiveRow(["No integration events", "Clear", "0", "No event"]));
  }

  const freshness = document.querySelector("[data-executive-freshness]");
  if (freshness) freshness.textContent = data.dashboard?.dataFreshness ? new Date(data.dashboard.dataFreshness).toLocaleString("en-GB") : "Unavailable";
  const policy = document.querySelector("[data-executive-policy]");
  if (policy) policy.textContent = data.dataPolicy || "Values are loaded from governed sources and are never simulated.";
}

hydrateExecutiveModule();
