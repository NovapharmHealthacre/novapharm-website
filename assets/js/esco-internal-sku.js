/* NovaPharm-owned catalogue identity, separate from any ESCO manufacturer model.
 * Never represent this synthetic order reference as a supplier model, device
 * registration number, stock allocation or payment approval. */
export function internalSkuFromCatalogueId(id) {
  if (typeof id !== "string" || !/^ESCO-CAT-[0-9]{4}$/.test(id)) {
    throw new TypeError("Invalid ESCO catalogue reference");
  }
  return "NPH-ESCO-" + id.slice(-4);
}
