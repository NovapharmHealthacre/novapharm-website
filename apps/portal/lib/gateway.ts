export type PortalUser = Readonly<{
  username: string;
  displayName: string;
  role: string;
  accessType: string;
  accessScopes: readonly string[];
  mustChangePassword: boolean;
}>;

type ErrorPayload = { error?: string; code?: string };

export class GatewayError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "GatewayError";
    this.status = status;
    this.code = code;
  }
}

export async function gatewayJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/gateway/${path}`, { ...init, credentials: "same-origin", cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as T & ErrorPayload;
  if (!response.ok) throw new GatewayError(payload.error || "The secure service could not complete this request.", response.status, payload.code ?? null);
  return payload;
}

export async function csrfToken(): Promise<string> {
  const payload = await gatewayJson<{ csrfToken: string }>("security/csrf");
  if (!payload.csrfToken) throw new GatewayError("The security check could not be completed.", 503);
  return payload.csrfToken;
}

export async function protectedMutation<T>(path: string, body: unknown): Promise<T> {
  const token = await csrfToken();
  return gatewayJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(body),
  });
}

export function professionalError(error: unknown): string {
  if (error instanceof GatewayError) return error.message;
  return "The secure service is temporarily unavailable. Please try again shortly.";
}
