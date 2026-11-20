"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type InterfaceLocale, interfaceLabel } from "../../../src/core/interface-locale";
import { currentCorporateNavigationAriaValue } from "../lib/navigation-current";

interface MobileNavigationProps {
  readonly items: readonly (readonly [string, string])[];
  readonly portalOrigin: string;
  readonly locale: InterfaceLocale;
}

export function MobileNavigation({ items, portalOrigin, locale }: MobileNavigationProps) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const pathnameRef = useRef(pathname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathnameRef.current !== pathname && detailsRef.current) {
      detailsRef.current.open = false;
      setOpen(false);
    }
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !detailsRef.current?.open) return;
      detailsRef.current.open = false;
      setOpen(false);
      detailsRef.current.querySelector<HTMLElement>("summary")?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  // A temporary navigation menu closes on outside interaction without
  // intercepting browser edit commands or ordinary link navigation.
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!detailsRef.current?.open || detailsRef.current.contains(event.target as Node)) return;
      detailsRef.current.open = false;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  function close() {
    if (!detailsRef.current) return;
    detailsRef.current.open = false;
    setOpen(false);
  }

  return (
    <details className="mobile-menu" ref={detailsRef} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary aria-label={interfaceLabel(locale, open ? "Close navigation" : "Open navigation")}>
        {interfaceLabel(locale, open ? "Close" : "Menu")}
      </summary>
      <nav aria-label={interfaceLabel(locale, "Mobile navigation")}>
        {items.map(([label, href]) => {
          const isPortal = href === "/portal/";
          return <a
            key={href}
            href={isPortal ? portalOrigin : href}
            rel={isPortal ? "nofollow" : undefined}
            aria-current={!isPortal ? currentCorporateNavigationAriaValue(pathname, href) : undefined}
            onClick={close}
          >{interfaceLabel(locale, label)}</a>;
        })}
      </nav>
    </details>
  );
}
