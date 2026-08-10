export interface PublicSecurityPolicyInput {
  readonly nonce: string;
  readonly secureTransport: boolean;
  readonly indexable: boolean;
  readonly connectSources?: readonly string[];
}

export interface PublicSecurityPolicy {
  readonly requestContentSecurityPolicy: string;
  readonly responseHeaders: Readonly<Record<string, string>>;
}

function safeSource(value: string): string {
  if (value === "'self'") return value;
  const source = new URL(value);
  if (source.protocol !== "https:") throw new Error(`CSP source must use HTTPS: ${value}`);
  return source.origin;
}

export function buildPublicSecurityPolicy(input: PublicSecurityPolicyInput): PublicSecurityPolicy {
  if (!/^[A-Za-z0-9+/=]{20,}$/.test(input.nonce)) throw new Error("CSP nonce must be cryptographically strong base64");
  const connectSources = ["'self'", ...(input.connectSources ?? []).map(safeSource)];
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' mailto:",
    `script-src 'self' 'nonce-${input.nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  if (input.secureTransport) directives.push("upgrade-insecure-requests");
  const contentSecurityPolicy = directives.join("; ");
  const responseHeaders: Record<string, string> = {
    "Content-Security-Policy": contentSecurityPolicy,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
  if (input.secureTransport) responseHeaders["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  if (!input.indexable) responseHeaders["X-Robots-Tag"] = "noindex, nofollow, noarchive";
  return Object.freeze({ requestContentSecurityPolicy: contentSecurityPolicy, responseHeaders: Object.freeze(responseHeaders) });
}
