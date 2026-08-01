import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const permittedPaths = [
  /^security\/csrf$/,
  /^auth\/(?:login|federated|change-password|logout)$/,
  /^portal\/(?:session|data)$/,
  /^dashboard$/,
  /^catalog\/products$/,
  /^enterprise\/modules\/[a-z0-9.-]+$/,
  /^enterprise\/search$/,
  /^enterprise\/customer\/(?:support|returns|quality-complaints)$/,
  /^enterprise\/workflows\/[a-z0-9._-]+\/advance$/,
  /^enterprise\/products\/[a-z0-9._-]+\/status$/,
  /^admin\/(?:summary|leads\/[a-z0-9._-]+|applications\/[a-z0-9._-]+(?:\/(?:status|activate))?|notifications\/[a-z0-9._-]+\/(?:replay|preview)|users\/[a-z0-9._%~-]+\/sessions\/revoke)$/,
  /^integrations\/status$/,
];

function apiOrigin(): string {
  const configured = process.env["INTERNAL_API_ORIGIN"] ?? process.env["PUBLIC_API_ORIGIN"];
  if (!configured) throw new Error("The secure API origin is not configured.");
  const parsed = new URL(configured);
  const validationMode = process.env["PORTAL_VALIDATION_MODE"] === "true";
  const loopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  if (validationMode && (!loopback || parsed.protocol !== "http:")) throw new Error("Portal validation may use HTTP only on a loopback API origin.");
  if (process.env["NODE_ENV"] === "production" && parsed.protocol !== "https:" && !validationMode) throw new Error("The production API origin must use HTTPS.");
  return parsed.origin;
}

function portalOrigin(request: NextRequest): string {
  const configured = process.env["PORTAL_ORIGIN"];
  return configured ? new URL(configured).origin : request.nextUrl.origin;
}

function isPermitted(path: string): boolean {
  return /^[A-Za-z0-9._~%/-]+$/.test(path) && !path.includes("..") && permittedPaths.some((pattern) => pattern.test(path));
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path: segments } = await context.params;
  const path = segments.join("/");
  if (!isPermitted(path)) return Response.json({ error: "Portal gateway route is not available." }, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } });

  const target = new URL(`/api/${path}`, apiOrigin());
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie", "x-csrf-token", "x-application-upload-token"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("origin", portalOrigin(request));

  if (process.env["WEBSITE_INSTANCE_ID"]) {
    for (const name of ["x-ms-client-principal", "x-ms-client-principal-id", "x-ms-client-principal-name", "x-ms-client-principal-idp"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
  }

  let upstream: Response;
  try {
    const requestInit: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
      cache: "no-store",
    };
    if (!["GET", "HEAD"].includes(request.method)) requestInit.body = await request.arrayBuffer();
    upstream = await fetch(target, requestInit);
  } catch {
    return Response.json({ error: "The secure service is temporarily unavailable. Please try again shortly." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
  }

  const responseHeaders = new Headers({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" });
  for (const name of ["content-type", "retry-after"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  const cookieHeaders = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  if (cookieHeaders.length) for (const value of cookieHeaders) responseHeaders.append("Set-Cookie", value);
  else if (upstream.headers.get("set-cookie")) responseHeaders.append("Set-Cookie", upstream.headers.get("set-cookie") as string);

  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
