/* Public, non-binding Nutraxin order-request builder.
 * No prices, stock assertion, payment, reservation or browser storage.
 * Only product SKU and requested quantity move in the URL; business
 * identity is collected solely in the secure AWS-backed contact form.
 */
export const NUTRAXIN_SKUS = Object.freeze(["NUT-UK-VD3-T120","NUT-UK-VD3-S30","NUT-UK-VD3K2-T120","NUT-UK-VD3K2-S30","NUT-UK-VC1000-T30","NUT-UK-VC500-C30","NUT-UK-VMAX-T60","NUT-UK-VMAX-E15","NUT-UK-MGCX-T60","NUT-UK-MGDL-T60","NUT-UK-MVE-T60","NUT-UK-MVW-T60","NUT-UK-MVM-T60","NUT-UK-CG-T30","NUT-UK-CG-S30","NUT-UK-CCX-T90","NUT-UK-ART-T90","NUT-UK-LCAR-T60","NUT-UK-B12-SL60"]);
const allowed = new Set(NUTRAXIN_SKUS);
const MAX_LINES = 19;
const MAX_UNITS_PER_LINE = 999;

export function encodeBasketLines(lines) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > MAX_LINES) {
    throw new RangeError("Select at least one Nutraxin product (maximum 19).");
  }
  const seen = new Set();
  return lines.map((line) => {
    const sku = String(line?.sku ?? "");
    const qty = Number(line?.quantity);
    if (!allowed.has(sku) || seen.has(sku) || !Number.isSafeInteger(qty) || qty < 1 || qty > MAX_UNITS_PER_LINE) {
      throw new TypeError("Check every selected product and quantity (1 to 999).");
    }
    seen.add(sku);
    return `${sku}:${qty}`;
  }).join(",");
}

export function buildQuoteRequestURL(lines) {
  const basket = encodeBasketLines(lines);
  const params = new URLSearchParams({
    enquiry: "Pharmacy or wholesaler account",
    basket
  });
  return `/contact/?${params.toString()}`;
}

const form = typeof document !== "undefined" ? document.querySelector("[data-nutraxin-order-request]") : null;
if (typeof HTMLFormElement !== "undefined" && form instanceof HTMLFormElement) {
  const rows = [...form.querySelectorAll("[data-nutraxin-line]")];
  const feedback = form.querySelector("[data-nutraxin-order-feedback]");
  const fields = rows.map((row) => ({
    sku: row.getAttribute("data-nutraxin-line"),
    input: row.querySelector("input[type=number]")
  }));
  const selected = () => fields.filter((row) => Number(row.input?.value) > 0).map(row => ({
    sku: row.sku, quantity: Number(row.input.value)
  }));
  const refresh = () => {
    const selections = selected();
    if (feedback) {
      feedback.textContent = selections.length === 0
        ? "Select a product and enter a quantity to prepare your enquiry."
        : `${selections.length} product${selections.length === 1 ? "" : "s"} selected. No order has been placed.`;
    }
  };
  for (const row of fields) row.input?.addEventListener("input", refresh);
  const requestedSku = new URLSearchParams(location.search).get("sku");
  if (requestedSku && allowed.has(requestedSku)) {
    const target = fields.find(row => row.sku === requestedSku);
    if (target?.input) target.input.value = "1";
  }
  refresh();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const destination = buildQuoteRequestURL(selected());
      window.location.assign(destination);
    } catch (error) {
      if (feedback) feedback.textContent = error instanceof Error ? error.message : "Check the requested quantities.";
    }
  });
}
