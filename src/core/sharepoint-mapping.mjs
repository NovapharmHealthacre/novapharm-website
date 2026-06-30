export const sharePointLibraryRoots = Object.freeze({
  customer: "Customers",
  supplier: "Suppliers",
  product: "Products",
  order: "Orders",
  invoice: "Invoices",
  purchase_order: "Purchase Orders",
  quality_record: "Quality Documents",
  regulatory_record: "Regulatory Documents",
  warehouse_transaction: "Warehouse Documents",
  employee: "HR Documents",
  training_record: "Training Records",
  account_application: "Customer Applications",
  document: "Company Documents"
});

export function cleanSharePointSegment(value) {
  return String(value || "record")
    .replace(/[~#%&*{}\\:<>?/+|\"]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "record";
}

export function sharePointFolderPath(payload) {
  const root = sharePointLibraryRoots[payload.entityType] || "Company Documents";
  return `${root}/${cleanSharePointSegment(payload.businessNumber || payload.entityId)} - ${cleanSharePointSegment(payload.displayName || payload.entityType)}`;
}

export function sharePointFolderPlan() {
  return Object.entries(sharePointLibraryRoots).map(([entityType, library]) => ({ entityType, library }));
}
