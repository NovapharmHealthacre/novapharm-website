export const moduleFinalReleaseStates = Object.freeze([
  "FULLY OPERATIONAL",
  "OPERATIONAL READ-ONLY",
  "DEPENDENCY-BLOCKED",
  "HIDDEN FOR SAFETY",
  "NOT APPLICABLE",
] as const);

export type ModuleFinalReleaseState = (typeof moduleFinalReleaseStates)[number];

export const governedPortalModuleCodes = Object.freeze([
  "customer.dashboard",
  "customer.account",
  "customer.orders",
  "customer.invoices",
  "customer.statements",
  "customer.products",
  "customer.price-lists",
  "customer.stock-availability",
  "customer.order-tracking",
  "customer.delivery-tracking",
  "customer.returns",
  "customer.quality-complaints",
  "customer.documents",
  "customer.support",
  "customer.regulatory-documents",
  "customer.downloads",
  "customer.analytics",
  "customer.settings",
  "employee.dashboard",
  "employee.customers",
  "employee.suppliers",
  "employee.products",
  "employee.orders",
  "employee.warehouse",
  "employee.purchasing",
  "employee.finance",
  "employee.quality",
  "employee.regulatory",
  "employee.crm",
  "employee.reports",
  "employee.administration",
  "executive.command-centre",
  "executive.ceo-dashboard",
  "executive.sales-intelligence",
  "executive.customer-analytics",
  "executive.product-master",
  "executive.nhs-data",
  "executive.plpi",
  "executive.pharmacovigilance",
  "executive.sourcing",
  "executive.tenders",
  "executive.warehouse",
  "executive.service-levels",
  "executive.finance",
  "executive.capital",
  "executive.microsoft-365",
  "executive.documents",
  "executive.ai-technology",
  "executive.traceability",
  "admin.dashboard",
  "admin.local-review",
  "admin.users",
  "admin.content",
  "admin.analytics",
] as const);

export type GovernedPortalModuleCode = (typeof governedPortalModuleCodes)[number];

export const hiddenDependencyAuthorities = Object.freeze({
  "executive.nhs-data": "Approved licensed NHS data source, lawful purpose and Commercial/Regulatory owner acceptance",
  "executive.plpi": "Verified PLPI programme records and Regulatory owner acceptance",
  "executive.pharmacovigilance": "Qualified Safety Owner and approved pharmacovigilance system/process",
  "executive.tenders": "Approved tender source and Commercial Operations owner acceptance",
  "executive.capital": "Board-approved capital planning authority and Finance owner acceptance",
  "executive.microsoft-365": "Microsoft 365 Platform Owner approval, tenant consent and accepted Microsoft Graph/SharePoint connection",
  "executive.ai-technology": "AI Governance Committee approval, documented use case, model authority and production safety acceptance",
} as const satisfies Partial<Record<GovernedPortalModuleCode, string>>);

export const writeEndpointByModule = Object.freeze({
  "customer.returns": "POST /api/enterprise/customer/returns",
  "customer.quality-complaints": "POST /api/enterprise/customer/quality-complaints",
  "customer.support": "POST /api/enterprise/customer/support",
  "employee.products": "POST /api/enterprise/products/{productId}/status",
  "employee.administration": "POST /api/enterprise/workflows/{workflowId}/advance",
} as const satisfies Partial<Record<GovernedPortalModuleCode, string>>);

export const documentAuthorityByModule = Object.freeze({
  "customer.returns": "Approved quarantine/private document store where return evidence is required.",
  "customer.quality-complaints": "Approved quarantine/private document store for complaint evidence; never a public storage surface.",
  "customer.documents": "Authorised SharePoint or private Blob document store; Azure SQL retains document metadata and server-side access linkage.",
  "customer.regulatory-documents": "Approved private regulatory document store; Azure SQL retains document metadata and server-side access linkage.",
  "customer.downloads": "Authorised SharePoint or private Blob delivery only after a server-side document access decision.",
  "executive.documents": "Authorised SharePoint or private Blob document store only after Board/Admin access authorisation.",
} as const satisfies Partial<Record<GovernedPortalModuleCode, string>>);

export const securityClassificationByArea = Object.freeze({
  customer: "CUSTOMER_CONFIDENTIAL",
  employee: "INTERNAL_RESTRICTED",
  executive: "EXECUTIVE_RESTRICTED",
  admin: "PRIVILEGED_ADMINISTRATION",
} as const);

export const securityClassificationByModule = Object.freeze({
  "customer.quality-complaints": "REGULATED_QUALITY_SENSITIVE",
  "customer.regulatory-documents": "REGULATED_DOCUMENT_RESTRICTED",
  "employee.quality": "REGULATED_QUALITY_SENSITIVE",
  "employee.regulatory": "REGULATED_DOCUMENT_RESTRICTED",
  "executive.pharmacovigilance": "SAFETY_CRITICAL_RESTRICTED",
  "executive.documents": "EXECUTIVE_DOCUMENT_RESTRICTED",
  "admin.users": "PRIVILEGED_IDENTITY_ADMINISTRATION",
  "admin.analytics": "PRIVILEGED_SECURITY_OPERATIONS",
} as const satisfies Partial<Record<GovernedPortalModuleCode, string>>);

export function finalReleaseStateFor(code: GovernedPortalModuleCode): ModuleFinalReleaseState {
  return code in hiddenDependencyAuthorities ? "HIDDEN FOR SAFETY" : "DEPENDENCY-BLOCKED";
}

export function moduleReadEndpoint(code: GovernedPortalModuleCode, hidden: boolean): string {
  const endpoint = `GET /api/enterprise/modules/${code}`;
  return hidden ? `${endpoint} (server fail-closed while hidden)` : endpoint;
}
