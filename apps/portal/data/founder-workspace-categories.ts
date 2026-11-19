import { intelligenceWorkspaceCatalogue } from "./intelligence-workspaces";

/**
 * Founder-only navigation grouping. All workspaces remain read-only/gated
 * according to the authoritative catalogue; a category is not a release approval.
 */
export const founderWorkspaceCategories = [
  {
    id: "medicine",
    title: "Medicine Intelligence",
    description: "Understand the medicine, its identity, evidence and purpose.",
    image: "/assets/media/founder/medicine.jpg",
    imageAlt: "Medicine packs and laboratory vials on a research workbench",
    slugs: ["medicine-search", "medicine-overview", "identity", "evidence", "observed-market", "geography"],
  },
  {
    id: "market",
    title: "Market Intelligence",
    description: "Explore demand, access, pricing and market dynamics.",
    image: "/assets/media/founder/market.jpg",
    imageAlt: "Analytical market dashboards in a pharmaceutical operations environment",
    slugs: ["market-structure", "forecasts", "signals", "medicine-tape", "pricing-reimbursement"],
  },
  {
    id: "supply",
    title: "Supply & Regulatory",
    description: "Follow supply, approvals, tenders and portfolio readiness.",
    image: "/assets/media/founder/supply.jpg",
    imageAlt: "Warehouse and medicine supply operations",
    slugs: ["supply-intelligence", "regulatory-intelligence", "tender-intelligence", "portfolio"],
  },
  {
    id: "biotech",
    title: "Biotech & Capital",
    description: "Connect science, pipelines, capital and strategic analysis.",
    image: "/assets/media/founder/biotech.jpg",
    imageAlt: "Clinical and scientific team reviewing research material",
    slugs: ["biotech-intelligence", "capital-intelligence", "decision-workspace"],
  },
  {
    id: "decisions",
    title: "Decision & Operations",
    description: "Bring intelligence into accountable operational workflows.",
    image: "/assets/media/founder/decisions.jpg",
    imageAlt: "Experienced team reviewing investments and research evidence",
    slugs: ["watchlists", "alerts", "reports", "private-commercial"],
  },
] as const;

export const founderWorkspaceSlugs = founderWorkspaceCategories.flatMap(category => [...category.slugs]);
export const founderWorkspaceCoverageValid =
  founderWorkspaceCategories.length === 5 &&
  founderWorkspaceSlugs.length === 22 &&
  new Set(founderWorkspaceSlugs).size === 22 &&
  intelligenceWorkspaceCatalogue.length === 22 &&
  intelligenceWorkspaceCatalogue.every(workspace => founderWorkspaceSlugs.includes(workspace.slug));
