import type { NextRequest } from "next/server";

const permittedPaths = new Set(["security/csrf", "contact", "account-applications"]);
const maximumRequestBytes = 128 * 1024;

function backendOrigin(): string {
  const configured = process.env.PUBLIC_API_ORIGIN;
  if (!configured) throw new Error("The secure API origin is not configured.");
  const parsed = new URL(configured);
  const loopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") throw new Error("The production API origin must use HTTPS.");
  if (process.env.NODE_ENV !== "production" && parsed.protocol !== "https:" && !(loopback && parsed.protocol === "http:")) {
    throw new Error("A development API origin must use HTTPS or HTTP loopback.");
  }
  return parsed.origin;
}

function publicOrigin(request: NextRequest): string {
  const configured = process.env.PUBLIC_ORIGIN;
  const parsed = new URL(configured || request.nextUrl.origin);
  const loopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") throw new Error("The production public origin must use HTTPS.");
  if (process.env.NODE_ENV !== "production" && parsed.protocol !== "https:" && !(loopback && parsed.protocol === "http:")) {
    throw new Error("A development public origin must use HTTPS or HTTP loopback.");
  }
  return parsed.origin;
}

function errorResponse(message: string, status: number, retryAfter?: string): Response {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  if (retryAfter) headers.set("Retry-After", retryAfter);
  return Response.json({ error: message }, { status, headers });
}

export async function forwardPlatformRequest(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path: segments } = await context.params;
  const path = segments.join("/");
  if (!permittedPaths.has(path)) return errorResponse("This service route is not available.", 404);
  if (request.method === "GET" && path !== "security/csrf") return errorResponse("This service route is not available.", 404);
  if (request.method === "POST" && path === "security/csrf") return errorResponse("This service route is not available.", 404);
  if (!['GET', 'POST'].includes(request.method)) return errorResponse("This request method is not available.", 405);

  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > maximumRequestBytes) return errorResponse("The submitted information is too large.", 413);

  let target: URL;
  let origin: string;
  try {
    target = new URL(`/api/${path}`, backendOrigin());
    origin = publicOrigin(request);
  } catch {
    return errorResponse("The secure enquiry service is temporarily unavailable. Please try again later.", 503, "30");
  }

  const headers = new Headers({ Accept: "application/json", Origin: origin });
  for (const name of ["content-type", "cookie", "x-csrf-token", "x-application-upload-token"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const body = request.method === "GET" ? undefined : await request.arrayBuffer();
  if (body && body.byteLength > maximumRequestBytes) return errorResponse("The submitted information is too large.", 413);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return errorResponse("The secure enquiry service is temporarily unavailable. No information was submitted.", 503, "30");
  }

  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) responseHeaders.set("Retry-After", retryAfter);
  const cookies = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  if (cookies.length) for (const cookie of cookies) responseHeaders.append("Set-Cookie", cookie);
  else if (upstream.headers.get("set-cookie")) responseHeaders.append("Set-Cookie", upstream.headers.get("set-cookie") as string);

  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
}
