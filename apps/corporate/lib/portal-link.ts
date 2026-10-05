export const verifiedPortalUrl = "https://portal.novapharmhealthcare.com/portal/";

export function portalLink(origin: string | undefined): string {
  if (!origin) return verifiedPortalUrl;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" || url.username || url.password || url.hostname.endsWith(".invalid")) return "/portal/";
    if (url.origin === "https://portal.novapharmhealthcare.com" && url.pathname === "/" && !url.search && !url.hash) return verifiedPortalUrl;
    return url.href;
  } catch {
    return "/portal/";
  }
}
