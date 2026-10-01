export function portalLink(origin: string | undefined): string {
  if (!origin) return "/portal/";
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" || url.username || url.password || url.hostname.endsWith(".invalid")) return "/portal/";
    return url.href;
  } catch {
    return "/portal/";
  }
}
