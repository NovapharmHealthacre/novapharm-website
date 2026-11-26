/**
 * A public corporate navigation link is current for its exact destination and
 * for canonical child routes. Never identify the external secure portal link
 * as the current public page, nor use simple prefix matching that would make
 * /products/ active at /products-archive/.
 */
export function isCurrentCorporateNavigation(pathname: string | null, href: string): boolean {
  if (!pathname || !href.startsWith("/") || href.startsWith("//") ||
      !pathname.startsWith("/") || pathname.startsWith("//") || href === "/portal/") return false;
  const canonical = (value: string) => {
    const route = value.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") ?? "";
    return route || "/";
  };
  const current = canonical(pathname);
  const target = canonical(href);
  return current === target || (target !== "/" && current.startsWith(target + "/"));
}

/**
 * A parent section is the current location, but it is not the actual page
 * being viewed. Do not announce a child URL as the parent's current *page*.
 * See WAI-ARIA 1.2 aria-current and WAI APG breadcrumb guidance.
 */
export function currentCorporateNavigationAriaValue(
  pathname: string | null,
  href: string
): "page" | "location" | undefined {
  if (!isCurrentCorporateNavigation(pathname, href)) return undefined;
  const canonical = (value: string) => value.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") || "/";
  return canonical(pathname ?? "") === canonical(href) ? "page" : "location";
}
