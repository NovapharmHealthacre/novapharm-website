import { employeeModules } from "@novapharm/portal-contracts";
import { HierarchyExplorer, type HierarchyGroup } from "../../../packages/design-system/src/layout-organization";

/**
 * Navigation blueprint derived from the owner's 16-workspace standalone
 * NovaPharm Distribution HTML prototype (v4, 14 Nov 2026).
 *
 * This is an evidence-first mapping, not 16 activated warehouse services.
 * The offline prototype's localStorage, mock QA release, stock allocations,
 * demo POD and synthetic KPIs must never enter the production authority path.
 */
export const WMS_PROTOTYPE_WORKSPACE_MAP = [
  { group: "Overview", title: "Control tower", module: "employee.dashboard",
    evidence: "Read-only operational dashboard", constraint: "Network-wide warehouse KPIs not verified" },
  { group: "Overview", title: "Exceptions & decisions", module: "employee.warehouse",
    evidence: "Recorded exception worklist", constraint: "Observed cases, not authorised physical incidents" },
  { group: "Overview", title: "Performance analytics", module: "employee.reports",
    evidence: "Application reporting", constraint: "OTIF and labour benchmarks require reconciled provider data" },
  { group: "Warehouse operations", title: "Product master", module: "employee.products",
    evidence: "Existing product records", constraint: "Catalogue is not physical stock or country supply rights" },
  { group: "Warehouse operations", title: "Inbound & ASN", module: "employee.purchasing",
    evidence: "Purchase and receipt evidence", constraint: "3PL-confirmed ASN and dock receipt pending" },
  { group: "Warehouse operations", title: "Batch & lot control", module: "employee.warehouse",
    evidence: "Recorded lot and expiry review", constraint: "Quality and 3PL release not independently confirmed" },
  { group: "Warehouse operations", title: "Quality & recalls", module: "employee.quality",
    evidence: "Recorded quality cases", constraint: "Controlled QMS approvals and physical recall pending" },
  { group: "Warehouse operations", title: "Inventory & slotting", module: "employee.warehouse",
    evidence: "Internal inventory ledger", constraint: "Bin/slot optimisation is simulation only" },
  { group: "Warehouse operations", title: "Orders & allocation", module: "employee.orders",
    evidence: "Internal order observations", constraint: "Allocation and reservation remain release-gated" },
  { group: "Warehouse operations", title: "Waves & execution", module: null,
    evidence: "Prototype workflow only", constraint: "Contracted 3PL warehouse execution feed required" },
  { group: "Warehouse operations", title: "Yard & delivery", module: null,
    evidence: "Prototype workflow only", constraint: "Carrier, dock and signed POD integrations required" },
  { group: "Enterprise planning", title: "AI planning studio", module: null,
    evidence: "Offline rule-based simulation", constraint: "No production AI model or validated forecast" },
  { group: "Enterprise planning", title: "Labour & automation", module: null,
    evidence: "Prototype capacity scenarios", constraint: "No accepted WES, WCS or actual workforce telemetry" },
  { group: "Enterprise planning", title: "3PL & billing", module: "employee.finance",
    evidence: "Finance and rate-card review", constraint: "3PL invoices and margin not independently reconciled" },
  { group: "Administration", title: "Integration monitor", module: "employee.administration",
    evidence: "Recorded integration events", constraint: "Provider connectivity must be independently established" },
  { group: "Administration", title: "Audit & data export", module: "employee.administration",
    evidence: "Existing application audit views", constraint: "Prototype browser logs are not validated records" },
] as const;

const groups = ["Overview", "Warehouse operations", "Enterprise planning", "Administration"] as const;
const employeeRoutes = new Map(employeeModules
  .filter((entry) => entry.visibleInNavigation)
  .map((entry) => [entry.code, entry.route]));

const hierarchyGroups: readonly HierarchyGroup[] = groups.map((group, groupIndex) => ({
  id: `wms-group-${groupIndex}`,
  label: group,
  items: WMS_PROTOTYPE_WORKSPACE_MAP.filter((entry) => entry.group === group).map((entry, index) => ({
    id: `wms-entry-${groupIndex}-${index}`,
    label: entry.title,
    description: entry.evidence,
    detail: entry.constraint,
    href: entry.module ? employeeRoutes.get(entry.module) : undefined,
    status: "Integration required",
  })),
}));

export function WmsPrototypeWorkspaceMap() {
  return <section className="distribution-wms-workspace-map"
    aria-labelledby="distribution-wms-workspace-map-title">
    <div className="distribution-wms-workspace-map-heading">
      <p className="distribution-employee-overline">NOVAPHARM DISTRIBUTION / WORKSPACE ARCHITECTURE</p>
      <h2 id="distribution-wms-workspace-map-title">Sixteen capabilities. One governed platform.</h2>
      <p>The prototype's workflow structure is mapped to our existing employee services.
        Existing source views and capabilities awaiting partner integration are labelled separately.</p>
    </div>
    <HierarchyExplorer label="WMS workspace architecture" groups={hierarchyGroups} />
    <p className="distribution-wms-workspace-map-disclaimer">
      The prototype's editable inventory, sample QA dispositions, FEFO reservations,
      dispatch actions and AI scenarios operate locally only. None are production-enabled
      by this mapping. Physical warehouse stock remains unverified until provider reconciliation.
    </p>
  </section>;
}
