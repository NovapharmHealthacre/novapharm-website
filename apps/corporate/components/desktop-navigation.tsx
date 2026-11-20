"use client";

import { usePathname } from "next/navigation";
import { type InterfaceLocale, interfaceLabel } from "../../../src/core/interface-locale";
import { currentCorporateNavigationAriaValue } from "../lib/navigation-current";

interface DesktopNavigationProps {
  readonly items: readonly (readonly [string, string])[];
  readonly portalOrigin: string;
  readonly locale: InterfaceLocale;
}

/**
 * Keep the corporate navigation location discoverable to assistive technology.
 * The secure portal is an external application; it is never the current
 * corporate page.
 */
export function DesktopNavigation({ items, portalOrigin, locale }: DesktopNavigationProps) {
  const pathname = usePathname();

  return <nav className="desktop-nav" aria-label={interfaceLabel(locale, "Primary navigation")}>
    {items.map(([label, href]) => {
      const isPortal = href === "/portal/";
      return <a
        key={href}
        href={isPortal ? portalOrigin : href}
        rel={isPortal ? "nofollow" : undefined}
        aria-current={!isPortal ? currentCorporateNavigationAriaValue(pathname, href) : undefined}
      >{interfaceLabel(locale, label)}</a>;
    })}
  </nav>;
}
