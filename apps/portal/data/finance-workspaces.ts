import { portalModuleByCode } from "@novapharm/portal-contracts";

export const financeDivisions = [
  "Financial management",
  "Treasury and capital",
  "Commercial finance",
  "Financial terminal",
  "Risk intelligence",
  "Governance and automation"
] as const;
export type FinanceDivision = (typeof financeDivisions)[number];
export type FinanceWorkspace = Readonly<{
  id: number;
  division: FinanceDivision;
  title: string;
  description: string;
  relatedModule: string | null;
}>;

// Approved concept catalogue. Related routes are evidence sources, not released Finance services.
export const financeWorkspaces: readonly FinanceWorkspace[] = Object.freeze([
  {
    "id": 1,
    "division": "Financial management",
    "title": "Executive Finance",
    "description": "Company financial position and board reporting",
    "relatedModule": "executive.finance"
  },
  {
    "id": 2,
    "division": "Financial management",
    "title": "General Ledger",
    "description": "Double-entry accounting and period controls",
    "relatedModule": null
  },
  {
    "id": 3,
    "division": "Financial management",
    "title": "Accounts Receivable",
    "description": "Invoice and customer balance evidence",
    "relatedModule": null
  },
  {
    "id": 4,
    "division": "Financial management",
    "title": "Accounts Payable",
    "description": "Supplier liabilities and approval queues",
    "relatedModule": null
  },
  {
    "id": 5,
    "division": "Financial management",
    "title": "Financial Reporting",
    "description": "Financial statements and reporting controls",
    "relatedModule": null
  },
  {
    "id": 6,
    "division": "Financial management",
    "title": "Group Consolidation",
    "description": "Entity and intercompany consolidation",
    "relatedModule": null
  },
  {
    "id": 7,
    "division": "Treasury and capital",
    "title": "Treasury Management",
    "description": "Cash positions and liquidity oversight",
    "relatedModule": null
  },
  {
    "id": 8,
    "division": "Treasury and capital",
    "title": "Banking Intelligence",
    "description": "Bank transactions and balance evidence",
    "relatedModule": null
  },
  {
    "id": 9,
    "division": "Treasury and capital",
    "title": "Payment Management",
    "description": "Payment, settlement and refund reconciliation",
    "relatedModule": null
  },
  {
    "id": 10,
    "division": "Treasury and capital",
    "title": "Capital Management",
    "description": "Funding and capital allocation",
    "relatedModule": null
  },
  {
    "id": 11,
    "division": "Treasury and capital",
    "title": "Liquidity Forecasting",
    "description": "Cash scenarios and liquidity projections",
    "relatedModule": null
  },
  {
    "id": 12,
    "division": "Treasury and capital",
    "title": "Foreign Exchange Management",
    "description": "Currency exposure and reference rates",
    "relatedModule": null
  },
  {
    "id": 13,
    "division": "Commercial finance",
    "title": "Revenue Intelligence",
    "description": "Revenue and channel evidence",
    "relatedModule": "executive.sales-intelligence"
  },
  {
    "id": 14,
    "division": "Commercial finance",
    "title": "Cost Intelligence",
    "description": "Acquisition and operating cost analysis",
    "relatedModule": null
  },
  {
    "id": 15,
    "division": "Commercial finance",
    "title": "Inventory Finance",
    "description": "Inventory valuation evidence",
    "relatedModule": "executive.warehouse"
  },
  {
    "id": 16,
    "division": "Commercial finance",
    "title": "Procurement Finance",
    "description": "Supplier sourcing evidence",
    "relatedModule": "executive.sourcing"
  },
  {
    "id": 17,
    "division": "Commercial finance",
    "title": "Profitability Intelligence",
    "description": "Product and order contribution",
    "relatedModule": null
  },
  {
    "id": 18,
    "division": "Commercial finance",
    "title": "Financial Planning",
    "description": "Budgets, forecasts and variances",
    "relatedModule": null
  },
  {
    "id": 19,
    "division": "Financial terminal",
    "title": "Global Financial Markets",
    "description": "Market prices, indices and watchlists",
    "relatedModule": null
  },
  {
    "id": 20,
    "division": "Financial terminal",
    "title": "Equity Intelligence",
    "description": "Issuer research and comparative analysis",
    "relatedModule": null
  },
  {
    "id": 21,
    "division": "Financial terminal",
    "title": "Economic Intelligence",
    "description": "Country economics and official statistics",
    "relatedModule": null
  },
  {
    "id": 22,
    "division": "Financial terminal",
    "title": "Currency Intelligence",
    "description": "Reference exchange rates and trends",
    "relatedModule": null
  },
  {
    "id": 23,
    "division": "Financial terminal",
    "title": "Fixed Income Intelligence",
    "description": "Sovereign debt and interest indicators",
    "relatedModule": null
  },
  {
    "id": 24,
    "division": "Financial terminal",
    "title": "Commodity Intelligence",
    "description": "Commodity reference data",
    "relatedModule": null
  },
  {
    "id": 25,
    "division": "Financial terminal",
    "title": "Corporate Intelligence",
    "description": "Public filings and corporate financial facts",
    "relatedModule": null
  },
  {
    "id": 26,
    "division": "Financial terminal",
    "title": "Pharmaceutical Market Intelligence",
    "description": "Pharmaceutical demand and spending evidence",
    "relatedModule": "executive.nhs-data"
  },
  {
    "id": 27,
    "division": "Financial terminal",
    "title": "Financial News",
    "description": "Attributed financial news and developments",
    "relatedModule": null
  },
  {
    "id": 28,
    "division": "Financial terminal",
    "title": "Market Alerts",
    "description": "Thresholds and source-aware notifications",
    "relatedModule": null
  },
  {
    "id": 29,
    "division": "Risk intelligence",
    "title": "Risk Management",
    "description": "Financial and operational exposure",
    "relatedModule": null
  },
  {
    "id": 30,
    "division": "Risk intelligence",
    "title": "Scenario Modelling",
    "description": "Assumptions and sensitivity models",
    "relatedModule": null
  },
  {
    "id": 31,
    "division": "Risk intelligence",
    "title": "Stress Testing",
    "description": "Adverse cash and market scenarios",
    "relatedModule": null
  },
  {
    "id": 32,
    "division": "Risk intelligence",
    "title": "Counterparty Intelligence",
    "description": "Concentration and counterparty evidence",
    "relatedModule": "executive.customer-analytics"
  },
  {
    "id": 33,
    "division": "Governance and automation",
    "title": "Tax & VAT",
    "description": "Tax evidence and reporting",
    "relatedModule": null
  },
  {
    "id": 34,
    "division": "Governance and automation",
    "title": "Audit & Governance",
    "description": "Access, evidence and audit controls",
    "relatedModule": null
  },
  {
    "id": 35,
    "division": "Governance and automation",
    "title": "Financial Reconciliation",
    "description": "Ledger, payment and inventory matching",
    "relatedModule": null
  },
  {
    "id": 36,
    "division": "Governance and automation",
    "title": "AI Financial Copilot",
    "description": "Evidence-linked financial analysis",
    "relatedModule": null
  }
]);
export function financeEvidenceRoute(workspace: FinanceWorkspace): string | null {
  if (!workspace.relatedModule) return null;
  const entry = portalModuleByCode.get(workspace.relatedModule);
  return entry?.area === "executive" && entry.visibleInNavigation && entry.releaseClassification !== "removed" ? entry.route : null;
}
export function canRenderFinanceWorkspace(moduleCode: string, scopes: readonly string[], hasVerifiedSnapshot: boolean): boolean {
  return moduleCode === "executive.finance" && hasVerifiedSnapshot && (scopes.includes("board") || scopes.includes("admin"));
}
