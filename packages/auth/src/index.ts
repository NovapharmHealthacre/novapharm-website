export const scopes = Object.freeze(["customer", "employee", "board", "admin"] as const);
export type AccessScope = (typeof scopes)[number];
export type Role = "customer" | "employee" | "board" | "admin";

export const roleScopes = Object.freeze({
  customer: ["customer"],
  employee: ["employee"],
  board: ["board"],
  admin: ["customer", "employee", "board", "admin"]
} as const satisfies Readonly<Record<Role, readonly AccessScope[]>>);

export interface AuthorisedIdentity {
  readonly subject: string;
  readonly role: Role;
  readonly grantedScopes: readonly AccessScope[];
  readonly customerId?: string;
  readonly credentialVersion: number;
}

export interface ResourceBoundary {
  readonly requiredScopes: readonly AccessScope[];
  readonly customerId?: string;
}

export function isAccessScope(value: string): value is AccessScope {
  return scopes.some((scope) => scope === value);
}

export function canAccess(identity: AuthorisedIdentity, boundary: ResourceBoundary): boolean {
  if (!boundary.requiredScopes.every((scope) => identity.grantedScopes.includes(scope))) return false;
  if (boundary.customerId && identity.customerId !== boundary.customerId) return false;
  return true;
}

export function assertAccess(identity: AuthorisedIdentity, boundary: ResourceBoundary): void {
  if (!canAccess(identity, boundary)) throw new Error("Access is not authorised for this resource.");
}
