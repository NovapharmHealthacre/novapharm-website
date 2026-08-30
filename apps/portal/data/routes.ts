import { type PortalArea, type PortalModule, portalModuleByCode, visiblePortalModules } from "@novapharm/portal-contracts";

export type PortalView =
  | Readonly<{ kind: "login" }>
  | Readonly<{ kind: "password-change" }>
  | Readonly<{ kind: "entra-complete" }>
  | Readonly<{ kind: "module"; module: PortalModule }>;

export type PortalAccessType = "customer" | "employee" | "board" | "admin";

const legacyAliases = new Map<string, string>([
  ["/board/", "executive.command-centre"],
  ["/portal/executive-platform/", "executive.command-centre"],
  ["/portal/ceo-dashboard/", "executive.ceo-dashboard"],
]);

export const areaLabels: Readonly<Record<PortalArea, string>> = Object.freeze({
  customer: "Customer",
  employee: "Employee",
  executive: "Board",
  admin: "Administrator",
});

export const areaScopes: Readonly<Record<PortalArea, string>> = Object.freeze({
  customer: "customer",
  employee: "employee",
  executive: "board",
  admin: "admin",
});

export const areaLandingRoutes: Readonly<Record<PortalArea, string>> = Object.freeze({
  customer: "/portal/dashboard/",
  employee: "/employee/dashboard/",
  executive: "/portal/executive-platform/",
  admin: "/admin/dashboard/",
});

export function isPortalAccessType(value: unknown): value is PortalAccessType {
  return value === "customer" || value === "employee" || value === "board" || value === "admin";
}

export function landingRouteForAccess(accessType: PortalAccessType): string {
  return areaLandingRoutes[accessType === "board" ? "executive" : accessType];
}

export function normalisePortalPath(value: string): string {
  const pathname = new URL(value, "https://portal.novapharmhealthcare.com").pathname;
  return pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
}

export function resolvePortalView(pathname: string): PortalView | null {
  const normalised = normalisePortalPath(pathname);
  if (normalised === "/" || normalised === "/portal/") return { kind: "login" };
  if (normalised === "/portal/change-password/") return { kind: "password-change" };
  if (normalised === "/auth/entra-complete/") return { kind: "entra-complete" };
  const alias = legacyAliases.get(normalised);
  if (alias) {
    const module = portalModuleByCode.get(alias);
    return module?.visibleInNavigation ? { kind: "module", module } : null;
  }
  const module = visiblePortalModules.find((entry) => entry.route === normalised);
  return module ? { kind: "module", module } : null;
}
